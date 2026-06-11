param(
  [Parameter(Position = 0)]
  [string]$Message
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Invoke-Git {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$GitArgs
  )

  git @GitArgs
  if ($LASTEXITCODE -ne 0) {
    throw "git $($GitArgs -join ' ') failed"
  }
}

if ([string]::IsNullOrWhiteSpace($Message)) {
  $Message = "update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
}

Invoke-Git add -A
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
  Write-Host "No changes to commit."
  return
}

Invoke-Git commit -m $Message
Invoke-Git push
