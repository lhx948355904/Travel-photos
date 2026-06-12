param(
  [switch]$SkipInstall,
  [switch]$NoBrowser,
  [switch]$NoDownload,
  [switch]$Docker,
  [switch]$Local
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"
$toolsDir = Join-Path $repoRoot ".tools"
$mavenVersion = "3.9.9"
$portableMavenDir = Join-Path $toolsDir "apache-maven-$mavenVersion"
$portableMavenCmd = Join-Path $portableMavenDir "bin\mvn.cmd"

function Test-Command {
  param([Parameter(Mandatory = $true)][string]$Name)
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Assert-Command {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$InstallHint
  )

  if (-not (Test-Command $Name)) {
    throw "Missing command '$Name'. $InstallHint"
  }
}

function Get-DockerComposeCommand {
  if (-not (Test-Command "docker")) {
    return $null
  }

  docker compose version *> $null
  if ($LASTEXITCODE -eq 0) {
    return "docker compose"
  }

  if (Test-Command "docker-compose") {
    return "docker-compose"
  }

  return $null
}

function Get-MavenCommand {
  $globalMaven = Get-Command "mvn" -ErrorAction SilentlyContinue
  if ($globalMaven) {
    return "mvn"
  }

  if (Test-Path $portableMavenCmd) {
    return $portableMavenCmd
  }

  return $null
}

function Install-PortableMaven {
  if ($NoDownload) {
    return $null
  }

  if (Test-Path $portableMavenCmd) {
    return $portableMavenCmd
  }

  $mavenZip = Join-Path $toolsDir "apache-maven-$mavenVersion-bin.zip"
  $mavenUrl = "https://archive.apache.org/dist/maven/maven-3/$mavenVersion/binaries/apache-maven-$mavenVersion-bin.zip"

  New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null

  if (-not (Test-Path $mavenZip)) {
    Write-Host "Maven is not installed. Downloading portable Maven $mavenVersion..."
    Invoke-WebRequest -Uri $mavenUrl -OutFile $mavenZip
  }

  Write-Host "Extracting portable Maven..."
  Expand-Archive -Path $mavenZip -DestinationPath $toolsDir -Force

  if (-not (Test-Path $portableMavenCmd)) {
    throw "Portable Maven was downloaded, but mvn.cmd was not found at $portableMavenCmd"
  }

  return $portableMavenCmd
}

function Test-PortInUse {
  param([Parameter(Mandatory = $true)][int]$Port)

  $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1

  return $null -ne $connection
}

function Start-DevWindow {
  param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][string]$WorkingDirectory,
    [Parameter(Mandatory = $true)][string]$Command
  )

  $escapedTitle = $Title.Replace("'", "''")
  $escapedDirectory = $WorkingDirectory.Replace("'", "''")
  $windowCommand = @"
`$Host.UI.RawUI.WindowTitle = '$escapedTitle'
Set-Location -LiteralPath '$escapedDirectory'
$Command
"@
  $encodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($windowCommand))

  Start-Process powershell.exe -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-EncodedCommand", $encodedCommand
  ) | Out-Null
}

Write-Host "== Travel Photo Map dev launcher =="
Write-Host "Project: $repoRoot"
Write-Host ""

if ($Docker -and $Local) {
  throw "Use either -Docker or -Local, not both."
}

if (-not (Test-Path (Join-Path $backendDir "pom.xml"))) {
  throw "Cannot find backend/pom.xml"
}

if (-not (Test-Path (Join-Path $frontendDir "package.json"))) {
  throw "Cannot find frontend/package.json"
}

$mavenCommand = Get-MavenCommand
$useDocker = $Docker
if (-not $Docker -and -not $Local -and -not $mavenCommand) {
  $mavenCommand = Install-PortableMaven
}

if (-not $Docker -and -not $Local -and -not $mavenCommand) {
  $composeCommand = Get-DockerComposeCommand
  if ($composeCommand) {
    Write-Host "Maven is not available. Switching to Docker Compose mode..."
    $useDocker = $true
  }
}

if ($useDocker) {
  $composeCommand = Get-DockerComposeCommand
  if (-not $composeCommand) {
    throw "Docker Compose is not available. Install Docker Desktop, or install Maven and run local mode."
  }

  docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "Docker is installed but not running. Start Docker Desktop, then run this script again."
  }

  Write-Host "Starting all services with Docker Compose..."
  Write-Host "Frontend: http://localhost"
  Write-Host "Backend:  http://localhost:8080"
  Start-DevWindow "Travel Photo Map - Docker" $repoRoot "$composeCommand up --build"

  if (-not $NoBrowser) {
    Start-Sleep -Seconds 2
    Start-Process "http://localhost" | Out-Null
  }

  Write-Host ""
  Write-Host "Done. Services are running in the Docker PowerShell window."
  Write-Host "Press Ctrl+C inside that window to stop them."
  return
}

Assert-Command "java" "Install JDK 17 or newer, then reopen this terminal."
$mavenCommand = Get-MavenCommand
if (-not $mavenCommand) {
  $mavenCommand = Install-PortableMaven
}
if (-not $mavenCommand) {
  throw "Maven is not available. Install Maven, remove -NoDownload, or run '.\start-dev.ps1 -Docker' after installing Docker Desktop."
}
Assert-Command "node" "Install Node.js 20 or newer, then reopen this terminal."
Assert-Command "npm" "Install Node.js 20 or newer, then reopen this terminal."

if (Test-PortInUse 8080) {
  throw "Port 8080 is already in use. Stop the existing backend first."
}

if (Test-PortInUse 3000) {
  throw "Port 3000 is already in use. Stop the existing frontend first."
}

$nodeModules = Join-Path $frontendDir "node_modules"
if (-not $SkipInstall -and -not (Test-Path $nodeModules)) {
  Write-Host "Installing frontend dependencies..."
  Push-Location $frontendDir
  try {
    npm install
    if ($LASTEXITCODE -ne 0) {
      throw "npm install failed"
    }
  } finally {
    Pop-Location
  }
  Write-Host ""
}

Write-Host "Starting backend:  http://localhost:8080"
Start-DevWindow "Travel Photo Map - Backend" $backendDir "& '$mavenCommand' spring-boot:run"

Write-Host "Starting frontend: http://localhost:3000"
Start-DevWindow "Travel Photo Map - Frontend" $frontendDir "npm run dev"

if (-not $NoBrowser) {
  Start-Sleep -Seconds 2
  Start-Process "http://localhost:3000" | Out-Null
}

Write-Host ""
Write-Host "Done. Backend and frontend are running in separate PowerShell windows."
Write-Host "Close those windows, or press Ctrl+C inside them, to stop the services."
