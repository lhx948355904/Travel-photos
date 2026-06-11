param(
  [Parameter(Position = 0)]
  [string]$Message,
  [string]$HostName = "49.234.53.105",
  [string]$User = "root",
  [string]$ProjectPath = "/opt/travel-photo-map",
  [string]$Distro = "Ubuntu",
  [switch]$WindowsServer
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

& "$PSScriptRoot\push.ps1" $Message
if ($WindowsServer) {
  & "$PSScriptRoot\deploy-remote.ps1" -HostName $HostName -User $User -ProjectPath $ProjectPath -Distro $Distro -WindowsServer
} else {
  & "$PSScriptRoot\deploy-remote.ps1" -HostName $HostName -User $User -ProjectPath $ProjectPath
}
