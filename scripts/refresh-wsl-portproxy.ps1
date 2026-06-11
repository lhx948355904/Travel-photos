param(
  [string]$Distro = "Ubuntu",
  [int[]]$PublicPorts = @(80)
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

wsl.exe -d $Distro -- true
if ($LASTEXITCODE -ne 0) {
  throw "Could not start WSL distro: $Distro"
}

$wslIp = (wsl.exe -d $Distro -- bash -lc "hostname -I | awk '{print `$1}'").Trim()
if (-not $wslIp) {
  throw "Could not resolve WSL IP address"
}

Write-Host "[portproxy] WSL IP: $wslIp"

foreach ($port in $PublicPorts) {
  Write-Host "[portproxy] forwarding Windows 0.0.0.0:$port -> WSL ${wslIp}:$port"

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

netsh interface portproxy show v4tov4
