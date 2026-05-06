# LingBot

Local Node app that opens a visible persistent browser, checks `https://cms.linguana.com/apps/gf`, accepts every visible `Accept` button in the task table, and records accepted task rows in SQLite.

## Tech Choice

Best fit for this job:

- Playwright: reliable real-browser automation with a persistent profile, visible window, and strong selectors.
- SQLite: simple local database for accepted task history, bot status, and dashboard commands.
- Express: small localhost dashboard/API without extra app framework weight.

The dashboard and bot are mediated through SQLite. The UI writes command rows, reads status/counts/history from API endpoints backed by the database, and the bot worker polls pending commands from the database.

## Run

```powershell
npm install
npm run install:browsers
npm start
```

Open:

```text
http://localhost:3131
```

The dashboard is currently running there if you are using this workspace.

## Login Session

Chrome 136+ blocks remote debugging against your normal Chrome user-data directory. Because of that, the reliable setup is a dedicated automation profile that persists between runs.

First-time login setup:

```powershell
cd "C:\Users\Revi James\Documents\Codex\2026-05-06\hi-i-want-you-to-make"
npm run setup:login
```

Log into `bluelicht04@gmail.com` in the normal Chrome window that opens. Make sure `https://cms.linguana.com/apps/gf` loads, then close that Chrome window. This login setup deliberately does not use Playwright because Google can block automated browsers at sign-in.

Normal run:

```powershell
cd "C:\Users\Revi James\Documents\Codex\2026-05-06\hi-i-want-you-to-make"
npm run start:automation
```

Then open `http://localhost:3131` and click Start.

### Use Your Existing Chrome Login

Chrome has to be started with remote debugging before Playwright can control it. Chrome 136+ does not allow this against the normal Chrome data folder, so this mode may not work on current Chrome versions.

1. Close every Chrome window.
2. Run:

```powershell
npm run start:existing-chrome
```

That relaunches Chrome with your normal Windows Chrome profile, opens the Linguana page, and starts the dashboard. Then open:

```text
http://localhost:3131
```

If Chrome is already open and you want the app to do a clean restart for you:

```powershell
npm run restart:existing-chrome
```

By default this launcher looks for the Chrome account:

```powershell
bluelicht04@gmail.com
```

On this machine that is the `Lady` profile, stored as `Profile 2`.

To use a different Chrome profile later:

```powershell
$env:LINGUANA_CHROME_EMAIL="someone@example.com"
npm run start:existing-chrome
```

Or pin a Chrome profile folder directly:

```powershell
$env:LINGUANA_CHROME_PROFILE="Profile 2"
npm run start:existing-chrome
```

For advanced use, you can launch Chrome yourself with `--remote-debugging-port=9222`, then start the app with:

```powershell
$env:LINGUANA_CDP_URL="http://127.0.0.1:9222"
npm start
```

## Behavior

- Default check interval is 5 seconds.
- Start, Stop, Restart, and interval changes are stored as database commands.
- If the target page fails to load or redirects to login/auth, the bot stops and records an error.
- There is no auto-retry after an error.
- Accepted tasks are stored in `data/linguana-bot.sqlite`.
