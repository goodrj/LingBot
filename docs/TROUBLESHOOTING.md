# Troubleshooting

## `localhost refused to connect`

The dashboard server is not running.

Run:

```powershell
cd "LingBot"
npm run start:automation
```

Keep the terminal open while using:

```text
http://localhost:3131
```

## Google Says `Couldn't sign you in`

Use the setup command, not the bot command:

```powershell
cd "LingBot"
npm run setup:login
```

This opens normal Chrome with the dedicated automation profile. Sign in there, confirm the Linguana task page loads, then close that Chrome window.

After that, start the dashboard:

```powershell
cd "LingBot"
npm run start:automation
```

## `connect ECONNREFUSED 127.0.0.1:9222`

This happens when using the legacy existing-Chrome remote-debugging mode and Chrome is not listening on port `9222`.

Recommended fix:

```powershell
cd "LingBot"
npm run start:automation
```

The `start:automation` command does not require Chrome remote debugging.

## Redirected To Login

The automation profile is not signed in or the session expired.

Run:

```powershell
cd "LingBot"
npm run setup:login
```

Sign in again, confirm the Linguana page loads, close Chrome, then restart:

```powershell
cd "LingBot"
npm run start:automation
```

## Port `3131` Is Already In Use

Another copy of the dashboard is already running.

Find and stop it:

```powershell
Get-NetTCPConnection -LocalPort 3131 -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

Then start again:

```powershell
cd "LingBot"
npm run start:automation
```

## Reset Local Data

This deletes local login/session data and accepted task history.

```powershell
cd "LingBot"
Remove-Item -Recurse -Force ".\data"
npm run setup:login
```
