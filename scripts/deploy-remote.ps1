param(
  [string]$HostName = "49.234.53.105",
  [string]$User = "root",
  [string]$ProjectPath = "/opt/travel-photo-map",
  [string]$Distro = "Ubuntu",
  [ValidateSet("Bundle", "Git")]
  [string]$CodeSource = "Bundle",
  [switch]$WindowsServer
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-Git {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$GitArgs
  )

  $output = git @GitArgs
  if ($LASTEXITCODE -ne 0) {
    throw "git $($GitArgs -join ' ') failed"
  }

  return $output
}

function ConvertTo-BashSingleQuoted {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Value
  )

  return "'" + $Value.Replace("'", "'`"'`"'") + "'"
}

function Invoke-Ssh {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RemoteCommand,
    [string]$StandardInput
  )

  $sshArguments = @(
    "-o", "ServerAliveInterval=15",
    "-o", "ServerAliveCountMax=4",
    "$User@$HostName",
    $RemoteCommand
  )

  if ($PSBoundParameters.ContainsKey("StandardInput")) {
    $OutputEncoding = New-Object System.Text.UTF8Encoding($false)
    $StandardInput | & ssh @sshArguments
  } else {
    & ssh @sshArguments
  }

  if ($LASTEXITCODE -ne 0) {
    throw "Remote deployment failed (ssh exit code: $LASTEXITCODE)"
  }
}

if ($WindowsServer) {
  Invoke-Ssh -RemoteCommand "powershell -NoProfile -ExecutionPolicy Bypass -File C:\deploy\deploy-server-windows.ps1 -Distro $Distro -ProjectPath '$ProjectPath'"
  exit 0
}

$quotedProjectPath = ConvertTo-BashSingleQuoted $ProjectPath
if ($CodeSource -eq "Git") {
  Write-Host "[deploy] updating code from the server's Git remote"
  Invoke-Ssh -RemoteCommand "cd $quotedProjectPath && bash scripts/deploy-server.sh"
  exit 0
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot
$bundlePath = Join-Path ([System.IO.Path]::GetTempPath()) "travel-photo-map-$([Guid]::NewGuid().ToString('N')).bundle"

try {
  $workingTreeStatus = @(Invoke-Git status --porcelain --untracked-files=all)
  if ($workingTreeStatus.Count -gt 0) {
    throw "Local working tree is not clean. Commit the changes before deployment."
  }

  $branch = (Invoke-Git branch --show-current | Select-Object -First 1).Trim()
  if ([string]::IsNullOrWhiteSpace($branch)) {
    throw "Cannot deploy from a detached HEAD. Switch to a branch first."
  }

  & git check-ref-format --branch $branch *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "Invalid Git branch name: $branch"
  }

  $branchRef = "refs/heads/$branch"
  Write-Host "[deploy] creating a self-contained Git bundle for $branchRef"
  Invoke-Git bundle create $bundlePath $branchRef | Out-Null
  Invoke-Git bundle verify $bundlePath | Out-Null

  $bundleSizeMb = [Math]::Round((Get-Item $bundlePath).Length / 1MB, 1)
  Write-Host "[deploy] uploading bundle to $User@$HostName ($bundleSizeMb MB)"
  $bundleBase64 = [Convert]::ToBase64String(
    [System.IO.File]::ReadAllBytes($bundlePath),
    [System.Base64FormattingOptions]::InsertLineBreaks
  ).Replace("`r`n", "`n")
  if ($bundleBase64.Contains("`r")) {
    throw "Base64 payload contains Windows CR characters and cannot be sent safely."
  }

  $bundleSha256 = (Get-FileHash -LiteralPath $bundlePath -Algorithm SHA256).Hash.ToLowerInvariant()
  $quotedBranchRef = ConvertTo-BashSingleQuoted $branchRef
  $quotedBranch = ConvertTo-BashSingleQuoted $branch
  $quotedBundleSha256 = ConvertTo-BashSingleQuoted $bundleSha256
  $remoteScript = @"
set -euo pipefail
project_path=$quotedProjectPath
branch_ref=$quotedBranchRef
expected_branch=$quotedBranch
expected_bundle_sha256=$quotedBundleSha256
bundle_path=`$(mktemp /tmp/travel-photo-map.XXXXXX.bundle)
trap 'rm -f "`$bundle_path"' EXIT
tr -d '\r' <<'TRAVEL_PHOTO_MAP_BUNDLE' | base64 --decode > "`$bundle_path"
$bundleBase64
TRAVEL_PHOTO_MAP_BUNDLE
actual_bundle_sha256=`$(sha256sum "`$bundle_path" | awk '{print `$1}')
if [ "`$actual_bundle_sha256" != "`$expected_bundle_sha256" ]; then
  echo '[deploy] uploaded bundle checksum mismatch; aborting deployment' >&2
  exit 1
fi
cd "`$project_path"
if [ -n "`$(git status --porcelain --untracked-files=all)" ]; then
  echo '[deploy] server working tree has local changes; commit or stash them first' >&2
  git status --short >&2
  exit 1
fi
current_branch=`$(git branch --show-current)
if [ "`$current_branch" != "`$expected_branch" ]; then
  echo "[deploy] server is on branch '`$current_branch'; expected '`$expected_branch'" >&2
  exit 1
fi
echo '[deploy] receiving code bundle from local machine'
git bundle verify "`$bundle_path" >/dev/null
git fetch --quiet "`$bundle_path" "`$branch_ref"
git reset --hard FETCH_HEAD
DEPLOY_SKIP_GIT_UPDATE=1 bash scripts/deploy-server.sh
# End of deployment payload. Keep this final comment so PowerShell's trailing CRLF is harmless.
"@

  Invoke-Ssh -RemoteCommand "bash -s" -StandardInput $remoteScript
} finally {
  if (Test-Path -LiteralPath $bundlePath) {
    Remove-Item -LiteralPath $bundlePath -Force
  }
  Pop-Location
}
