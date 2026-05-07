# Troubleshooting

## `localhost refused to connect`

The dashboard server is not running.

Run:

```powershell
cd "C:\path\to\LingBot"
npm run start:automation
```

Keep the terminal open while using:

```text
http://localhost:3131
```

## Google Says `Couldn't sign you in`

Use the setup command, not the bot command:

```powershell
cd "C:\path\to\LingBot"
npm run setup:login
```

This opens normal Chrome with the dedicated automation profile. Sign in there, confirm the Linguana task page loads, then close that Chrome window.

After that, start the dashboard:

```powershell
cd "C:\path\to\LingBot"
npm run start:automation
```

## `connect ECONNREFUSED 127.0.0.1:9222`

This happens when using the legacy existing-Chrome remote-debugging mode and Chrome is not listening on port `9222`.

Recommended fix:

```powershell
cd "C:\path\to\LingBot"
npm run start:automation
```

The `start:automation` command does not require Chrome remote debugging.

## Redirected To Login

The automation profile is not signed in or the session expired.

Run:

```powershell
cd "C:\path\to\LingBot"
npm run setup:login
```

Sign in again, confirm the Linguana page loads, close Chrome, then restart:

```powershell
cd "C:\path\to\LingBot"
npm run start:automation
```

## `Browser.getWindowForTarget`: Browser Window Not Found

Chrome opened and then closed before LingBot could attach to it. This is usually caused by a locked automation profile, a stale Chrome setup window, or a Chrome startup issue.

First, close any Chrome window opened by LingBot setup, then run:

```powershell
cd "C:\path\to\LingBot"
npm run start:automation
```

If it still happens, reset only the automation browser profile and log in again:

```powershell
cd "C:\path\to\LingBot"
Remove-Item -Recurse -Force ".\data\automation-profile"
npm run setup:login
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
cd "C:\path\to\LingBot"
npm run start:automation
```

## Reset Local Data

This deletes local login/session data and accepted task history.

```powershell
cd "C:\path\to\LingBot"
Remove-Item -Recurse -Force ".\data"
npm run setup:login
```
