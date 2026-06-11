param(
  [string]$Distro = "Ubuntu",
  [string]$ProjectPath = "/opt/travel-photo-map",
  [int[]]$PublicPorts = @(80),
  [switch]$SkipPortProxy
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-Wsl {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command
  )

  wsl.exe -d $Distro -- bash -lc $Command
  if ($LASTEXITCODE -ne 0) {
    throw "WSL command failed: $Command"
  }
}

Write-Host "[deploy] deploying in WSL distro: $Distro"
Write-Host "[deploy] ensuring Docker service is running"
wsl.exe -d $Distro -u root -- bash -lc "service docker start >/dev/null 2>&1 || true"
if ($LASTEXITCODE -ne 0) {
  throw "Failed to start Docker service in WSL"
}

Invoke-Wsl "docker info >/dev/null 2>&1 || { echo 'Docker is not running, or the current WSL user is not in the docker group.'; echo 'Run: sudo service docker start && sudo usermod -aG docker `$USER, then reopen WSL.'; exit 1; }"
Invoke-Wsl "cd '$ProjectPath' && bash scripts/deploy-server.sh"

if ($SkipPortProxy) {
  Write-Host "[deploy] skipped Windows portproxy update"
  exit 0
}

$wslIp = (wsl.exe -d $Distro -- bash -lc "hostname -I | awk '{print `$1}'").Trim()
if (-not $wslIp) {
  throw "Could not resolve WSL IP address"
}

Write-Host "[deploy] WSL IP: $wslIp"

foreach ($port in $PublicPorts) {
  Write-Host "[deploy] forwarding Windows 0.0.0.0:$port -> WSL ${wslIp}:$port"

  netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=$port 2>$null | Out-Null
  netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$port connectaddress=$wslIp connectport=$port | Out-Null

  $ruleName = "TravelPhotoMap-$port"
  $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
  if ($existingRule) {
    Set-NetFirewallRule -DisplayName $ruleName -Enabled True -Action Allow | Out-Null
  } else {
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow | Out-Null
  }
}

Write-Host "[deploy] portproxy rules"
netsh interface portproxy show v4tov4
