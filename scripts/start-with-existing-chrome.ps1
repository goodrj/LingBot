$ErrorActionPreference = "Stop"

$chromeCandidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$chrome = $chromeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) {
  throw "Chrome was not found in the usual Windows install locations."
}

$defaultUserData = Join-Path $env:LOCALAPPDATA "Google\Chrome\User Data"
if (-not (Test-Path $defaultUserData)) {
  throw "Chrome user-data folder was not found at: $defaultUserData"
}

$targetEmail = if ($env:LINGUANA_CHROME_EMAIL) { $env:LINGUANA_CHROME_EMAIL } else { "bluelicht04@gmail.com" }
$targetProfileName = if ($env:LINGUANA_CHROME_PROFILE) { $env:LINGUANA_CHROME_PROFILE } else { "" }
$localStatePath = Join-Path $defaultUserData "Local State"

if (-not $targetProfileName -and (Test-Path $localStatePath)) {
  $localState = Get-Content $localStatePath -Raw | ConvertFrom-Json
  $profileCache = $localState.profile.info_cache
  $matchingProfile = $profileCache.PSObject.Properties |
    Where-Object { $_.Value.user_name -eq $targetEmail -or $_.Value.name -eq "Lady" } |
    Select-Object -First 1

  if ($matchingProfile) {
    $targetProfileName = $matchingProfile.Name
  }
}

if (-not $targetProfileName) {
  $targetProfileName = "Profile 2"
}

$chromeProcesses = Get-Process chrome -ErrorAction SilentlyContinue
if ($chromeProcesses) {
  Write-Host ""
  Write-Host "Chrome is already running. To use your existing Chrome login, close every Chrome window first."
  Write-Host "Then run this command again:"
  Write-Host ""
  Write-Host "  npm run start:existing-chrome"
  Write-Host ""
  exit 1
}

$port = if ($env:LINGUANA_CDP_PORT) { [int]$env:LINGUANA_CDP_PORT } else { 9222 }
$env:LINGUANA_CDP_URL = "http://127.0.0.1:$port"

$chromeArgs = @(
  "--remote-debugging-port=$port",
  "--user-data-dir=`"$defaultUserData`"",
  "--profile-directory=`"$targetProfileName`"",
  "https://cms.linguana.com/apps/gf"
) -join " "

Start-Process -FilePath $chrome -ArgumentList $chromeArgs

Write-Host "Using Chrome profile: $targetProfileName ($targetEmail)"
Write-Host "Started Chrome with remote debugging at $env:LINGUANA_CDP_URL"

$debugReady = $false
for ($i = 0; $i -lt 20; $i++) {
  try {
    $version = Invoke-RestMethod "$env:LINGUANA_CDP_URL/json/version" -TimeoutSec 1
    if ($version.webSocketDebuggerUrl) {
      $debugReady = $true
      break
    }
  } catch {
    Start-Sleep -Milliseconds 500
  }
}

if (-not $debugReady) {
  Write-Host ""
  Write-Host "Chrome opened, but its remote debugging port did not become available."
  Write-Host "Close every Chrome window and make sure no chrome.exe remains in Task Manager, then run:"
  Write-Host ""
  Write-Host "  npm run start:existing-chrome"
  Write-Host ""
  exit 1
}

Write-Host "Starting dashboard at http://localhost:3131"
node src/server.js
