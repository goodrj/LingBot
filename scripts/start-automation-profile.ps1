$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$profileDir = Join-Path $root "data\lady-automation-profile"
New-Item -ItemType Directory -Force -Path $profileDir | Out-Null

$env:LINGUANA_USER_DATA_DIR = $profileDir
$env:LINGUANA_BROWSER_CHANNEL = "chrome"
Remove-Item Env:\LINGUANA_CDP_URL -ErrorAction SilentlyContinue

Write-Host "Using dedicated Lady automation profile:"
Write-Host "  $profileDir"
Write-Host "Starting dashboard at http://localhost:3131"

node src/server.js
