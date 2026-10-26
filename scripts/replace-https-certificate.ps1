param(
  [string]$HostName = '49.234.53.105',
  [string]$User = 'root',
  [string]$ProjectPath = '/opt/travel-photo-map',
  [string]$Domain = 'lhxjourney.cn',
  [string]$CertificateDirectory = (Join-Path ([Environment]::GetFolderPath('Desktop')) 'lhxjourney.cn_nginx'),
  [switch]$ValidateOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

foreach ($value in @($HostName, $User, $ProjectPath, $Domain)) {
  if ($value -notmatch '^[a-zA-Z0-9._/-]+$') { throw 'Unsafe SSH target or path' }
}
if (-not $ProjectPath.StartsWith('/')) { throw 'ProjectPath must be absolute' }

$certificate = Join-Path $CertificateDirectory "${Domain}_bundle.crt"
$privateKey = Join-Path $CertificateDirectory "${Domain}.key"
foreach ($path in @($certificate, $privateKey)) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Missing certificate file: $path" }
}

$cert = [Security.Cryptography.X509Certificates.X509Certificate2]::CreateFromPemFile($certificate, $privateKey)
try {
  if (-not $cert.HasPrivateKey -or $cert.NotAfter.ToUniversalTime() -le [DateTime]::UtcNow.AddDays(1)) {
    throw 'Certificate/key mismatch or certificate expires within 24 hours'
  }
  $san = $cert.Extensions | Where-Object { $_.Oid.Value -eq '2.5.29.17' }
  if (-not $san -or $san.Format($false) -notmatch "(?i)(^|, )DNS Name=$([regex]::Escape($Domain))(,|$)") {
    throw "Certificate does not cover $Domain"
  }
  Write-Host "[https] validated $Domain; expires $($cert.NotAfter.ToUniversalTime().ToString('u'))"
} finally {
  $cert.Dispose()
}
if ($ValidateOnly) { return }

$target = "${User}@${HostName}"
$stage = "/root/.cert-replacement-$((Get-Date).ToUniversalTime().ToString('yyyyMMddHHmmss'))-$(Get-Random -Minimum 1000 -Maximum 9999)"
$sshOptions = @('-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=15')

Write-Host '[https] 1/3 preparing protected remote staging directory'
& ssh @sshOptions $target "umask 077 && mkdir -m 700 '$stage'"
if ($LASTEXITCODE -ne 0) { throw 'SSH login or remote staging failed' }

Write-Host '[https] 2/3 uploading new certificate and private key'
& scp @sshOptions $certificate $privateKey "${target}:${stage}/"
if ($LASTEXITCODE -ne 0) {
  & ssh @sshOptions $target "rm -rf '$stage'"
  throw 'Certificate upload failed'
}

$remoteScript = @'
set -eu
stage='__STAGE__'
project='__PROJECT__'
domain='__DOMAIN__'
cert="$project/nginx/certs/${domain}_bundle.crt"
key="$project/nginx/certs/${domain}.key"
new_cert="$stage/${domain}_bundle.crt"
new_key="$stage/${domain}.key"
installed=0
backup_dir=''
finish() {
  result=$?
  if [ "$installed" -eq 1 ]; then
    echo '[https] validation failed; restoring previous certificate' >&2
    cp -p "$backup_dir/${domain}_bundle.crt" "$cert"
    cp -p "$backup_dir/${domain}.key" "$key"
    docker compose restart frontend || true
  fi
  rm -rf "$stage"
  exit "$result"
}
trap finish EXIT
cd "$project"
test -s "$new_cert" && test -s "$new_key"
openssl x509 -in "$new_cert" -noout -checkend 86400 >/dev/null
openssl x509 -in "$new_cert" -noout -checkhost "$domain" >/dev/null
cert_key="$(openssl x509 -in "$new_cert" -pubkey -noout | openssl pkey -pubin -outform DER | sha256sum | cut -d ' ' -f 1)"
private_key="$(openssl pkey -in "$new_key" -pubout -outform DER | sha256sum | cut -d ' ' -f 1)"
test -n "$cert_key" && test "$cert_key" = "$private_key"
backup_dir="$project/nginx/certs/backup-$(date -u +%Y%m%dT%H%M%SZ)"
install -d -m 700 "$backup_dir"
cp -p "$cert" "$backup_dir/${domain}_bundle.crt"
cp -p "$key" "$backup_dir/${domain}.key"
installed=1
install -m 644 "$new_cert" "$cert"
install -m 600 "$new_key" "$key"
docker compose exec -T frontend nginx -t
docker compose restart frontend
verified=0
attempt=1
while [ "$attempt" -le 15 ]; do
  if curl --noproxy '*' --fail --silent --head --resolve "${domain}:443:127.0.0.1" "https://${domain}/" >/dev/null 2>&1; then
    verified=1
    break
  fi
  sleep 1
  attempt=$((attempt + 1))
done
if [ "$verified" -ne 1 ]; then
  echo '[https] new certificate was not served after restarting frontend' >&2
  exit 1
fi
installed=0
echo "[https] server certificate replaced; backup at $backup_dir"
'@
$remoteScript = $remoteScript.Replace('__STAGE__', $stage).Replace('__PROJECT__', $ProjectPath).Replace('__DOMAIN__', $Domain)

Write-Host '[https] 3/3 backing up, installing, testing, and reloading Nginx'
& ssh @sshOptions $target $remoteScript
if ($LASTEXITCODE -ne 0) { throw 'Remote certificate installation failed; inspect the remote output' }

Write-Host '[https] verifying the public HTTPS endpoint'
& curl.exe --fail --silent --show-error --head --max-time 20 "https://${Domain}/"
if ($LASTEXITCODE -ne 0) { throw 'Public HTTPS verification failed' }
Write-Host '[https] deployment complete'
