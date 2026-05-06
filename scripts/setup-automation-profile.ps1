$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$profileDir = Join-Path $root "data\automation-profile"
New-Item -ItemType Directory -Force -Path $profileDir | Out-Null

$chromeCandidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$chrome = $chromeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) {
  throw "Chrome was not found in the usual Windows install locations."
}

$chromeArgs = @(
  "--user-data-dir=`"$profileDir`"",
  "--no-first-run",
  "--no-default-browser-check",
  "https://cms.linguana.com/apps/gf"
) -join " "

Write-Host "Opening a normal Chrome window with the dedicated automation profile."
Write-Host "Log into the Google account with Linguana access and make sure https://cms.linguana.com/apps/gf loads."
Write-Host "When done, close the Chrome window. This terminal will then exit."

$process = Start-Process -FilePath $chrome -ArgumentList $chromeArgs -PassThru
$process.WaitForExit()
