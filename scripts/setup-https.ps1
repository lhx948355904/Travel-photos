param(
  [string]$HostName = "49.234.53.105",
  [string]$User = "root",
  [string]$ProjectPath = "/opt/travel-photo-map",
  [string]$Domain = "lhxjourney.cn",
  [string]$CertificateDirectory,
  [string]$IdentityFile
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Fail {
  param([string]$Message)
  throw "[https] $Message"
}

function Invoke-ExternalCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$CommandArgs
  )

  & $Command @CommandArgs
  if ($LASTEXITCODE -ne 0) {
    Fail "$Command failed with exit code $LASTEXITCODE"
  }
}

if ($Domain -notmatch '^[a-zA-Z0-9.-]+$') {
  Fail "Domain contains unsupported characters: $Domain"
}

if ($ProjectPath -notmatch '^/[a-zA-Z0-9._/-]+$') {
  Fail "ProjectPath must be an absolute Linux path without spaces"
}

if ($HostName -notmatch '^[a-zA-Z0-9.:-]+$') {
  Fail "HostName contains unsupported characters: $HostName"
}

if ($User -notmatch '^[a-zA-Z0-9._-]+$') {
  Fail "User contains unsupported characters: $User"
}

if ([string]::IsNullOrWhiteSpace($CertificateDirectory)) {
  $desktop = [Environment]::GetFolderPath([Environment+SpecialFolder]::Desktop)
  $CertificateDirectory = Join-Path $desktop "lhxjourney.cn_nginx"
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$serverHelper = Join-Path $PSScriptRoot "setup-https-server.sh"
$requiredRepositoryFiles = @(
  ".gitignore",
  "docker-compose.yml",
  "frontend/Dockerfile",
  "nginx/default.conf",
  "scripts/setup-https.ps1",
  "scripts/setup-https-server.sh"
)

foreach ($file in $requiredRepositoryFiles) {
  $absolutePath = Join-Path $repoRoot $file
  if (-not (Test-Path -LiteralPath $absolutePath -PathType Leaf)) {
    Fail "Required project file was not found: $absolutePath"
  }
}

Push-Location $repoRoot
try {
  $uncommittedFiles = @(git status --porcelain -- @requiredRepositoryFiles)
  if ($LASTEXITCODE -ne 0) {
    Fail "Could not inspect the local Git working tree"
  }

  if ($uncommittedFiles.Count -gt 0) {
    $fileList = $uncommittedFiles -join "; "
    Fail "HTTPS files have not been committed. Commit and push them before deployment. Pending: $fileList"
  }

  $upstream = git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>$null
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($upstream)) {
    Fail "The current Git branch has no upstream branch. Push it with: git push -u origin HEAD"
  }

  $unpushedCommitCount = git rev-list --count "$upstream..HEAD"
  if ($LASTEXITCODE -ne 0) {
    Fail "Could not compare the local branch with $upstream"
  }

  if ([int]$unpushedCommitCount -gt 0) {
    Fail "The current branch has $unpushedCommitCount unpushed commit(s). Run git push before deployment."
  }
}
finally {
  Pop-Location
}

$certificate = Join-Path $CertificateDirectory "${Domain}_bundle.crt"
$privateKey = Join-Path $CertificateDirectory "${Domain}.key"

foreach ($file in @($certificate, $privateKey)) {
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
    Fail "Required file was not found: $file"
  }

  if ((Get-Item -LiteralPath $file).Length -eq 0) {
    Fail "Required file is empty: $file"
  }
}

$certificateText = Get-Content -LiteralPath $certificate -Raw
$privateKeyText = Get-Content -LiteralPath $privateKey -Raw

if ($certificateText -notmatch '-----BEGIN CERTIFICATE-----') {
  Fail "The certificate file is not a PEM certificate: $certificate"
}

if ($privateKeyText -match '-----BEGIN ENCRYPTED PRIVATE KEY-----') {
  Fail "Nginx cannot start unattended with an encrypted private key: $privateKey"
}

if ($privateKeyText -notmatch '-----BEGIN (RSA |EC )?PRIVATE KEY-----') {
  Fail "The private-key file is not a supported unencrypted PEM private key: $privateKey"
}

$target = "${User}@${HostName}"
$remoteCertificateDirectory = "${ProjectPath}/nginx/certs"
$remoteCertificate = "${remoteCertificateDirectory}/${Domain}_bundle.crt"
$remotePrivateKey = "${remoteCertificateDirectory}/${Domain}.key"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$remoteStagingDirectory = "/tmp/setup-https-${Domain}-${timestamp}"

$sshOptions = @()
$scpOptions = @()
if (-not [string]::IsNullOrWhiteSpace($IdentityFile)) {
  if (-not (Test-Path -LiteralPath $IdentityFile -PathType Leaf)) {
    Fail "SSH identity file was not found: $IdentityFile"
  }

  $sshOptions += @("-i", $IdentityFile)
  $scpOptions += @("-i", $IdentityFile)
}

$prepareCommand = @"
set -eu
cd '$ProjectPath'
git pull --ff-only
grep -q '"443:443"' docker-compose.yml || {
  echo '[https] ERROR: remote docker-compose.yml does not expose port 443' >&2
  exit 1
}
grep -q 'listen 443 ssl' nginx/default.conf || {
  echo '[https] ERROR: remote nginx/default.conf does not contain HTTPS configuration' >&2
  exit 1
}
rm -rf '$remoteStagingDirectory'
install -d -m 700 '$remoteStagingDirectory'
"@

Write-Host "[https] connection 1/3: updating the remote project and creating a protected staging directory"
Invoke-ExternalCommand -Command "ssh" -CommandArgs (
  $sshOptions + @($target, $prepareCommand)
)

Write-Host "[https] connection 2/3: uploading the certificate, private key, and server helper"
Invoke-ExternalCommand -Command "scp" -CommandArgs (
  $scpOptions + @(
    $certificate,
    $privateKey,
    $serverHelper,
    "${target}:${remoteStagingDirectory}/"
  )
)

$installAndDeployCommand = @"
set -eu
cleanup() {
  rm -rf '$remoteStagingDirectory'
}
trap cleanup EXIT
install -d -m 700 '$remoteCertificateDirectory'
if [ -f '$remoteCertificate' ]; then
  cp -p '$remoteCertificate' '${remoteCertificate}.backup-${timestamp}'
fi
if [ -f '$remotePrivateKey' ]; then
  cp -p '$remotePrivateKey' '${remotePrivateKey}.backup-${timestamp}'
fi
install -m 644 '$remoteStagingDirectory/${Domain}_bundle.crt' '$remoteCertificate'
install -m 600 '$remoteStagingDirectory/${Domain}.key' '$remotePrivateKey'
bash '$remoteStagingDirectory/setup-https-server.sh' '$Domain' '$ProjectPath'
"@

Write-Host "[https] connection 3/3: installing files, validating the certificate, and starting HTTPS"
Invoke-ExternalCommand -Command "ssh" -CommandArgs (
  $sshOptions + @($target, $installAndDeployCommand)
)

Write-Host "[https] verifying the public HTTPS endpoint"
$curlArgs = @(
  "--fail",
  "--silent",
  "--show-error",
  "--head",
  "--connect-timeout",
  "10",
  "https://${Domain}/"
)
& curl.exe @curlArgs
if ($LASTEXITCODE -ne 0) {
  Fail "The server-side setup completed, but the public HTTPS check failed. Confirm that the Tencent Cloud security group allows inbound TCP port 443."
}

Write-Host "[https] completed: https://${Domain}"
