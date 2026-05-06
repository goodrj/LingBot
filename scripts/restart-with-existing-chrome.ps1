$ErrorActionPreference = "Stop"

Write-Host "Closing Chrome so it can be relaunched with remote debugging..."
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

& "$PSScriptRoot\start-with-existing-chrome.ps1"
