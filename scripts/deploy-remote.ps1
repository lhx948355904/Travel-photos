param(
  [string]$HostName = "49.234.53.105",
  [string]$User = "root",
  [string]$ProjectPath = "/opt/travel-photo-map",
  [string]$Distro = "Ubuntu",
  [switch]$WindowsServer
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($WindowsServer) {
  ssh "$User@$HostName" "powershell -NoProfile -ExecutionPolicy Bypass -File C:\deploy\deploy-server-windows.ps1 -Distro $Distro -ProjectPath '$ProjectPath'"
} else {
  ssh "$User@$HostName" "cd $ProjectPath && bash scripts/deploy-server.sh"
}
