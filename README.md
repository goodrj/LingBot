# LingBot

LingBot is a local dashboard-controlled browser bot for the Linguana CMS task page. It opens a real visible Chrome window, keeps a persistent local login profile, accepts available tasks from the task table, and records accepted task history in SQLite.

> Scope: this app is intended for local personal use on a machine where the user is authorized to access `https://cms.linguana.com/apps/gf`.

## Features

- Visible Chrome automation using Playwright.
- Persistent local automation profile so login survives restarts.
- Dashboard at `http://localhost:3131`.
- Start, Stop, Restart controls.
- Adjustable check interval, defaulting to 5 seconds.
- Configurable recheck delay after successful task acceptance.
- Optional randomized timing for idle checks and after-accept reloads.
- Current and latest completed project cluster counts.
- Accepted task counts for today, this week, and this month.
- Searchable and filterable accepted task history.
- Local SQLite storage for bot status, commands, and accepted tasks.
- Stops immediately on page load failure or login/auth redirect.
- No auto-retry after error.

## Tech Stack

- Node.js for the app runtime.
- Express for the local dashboard/API server.
- Playwright for real-browser automation.
- SQLite via `better-sqlite3` for local persistent data.
- Plain HTML/CSS/JavaScript for the dashboard.

This stack keeps deployment simple: clone, install, log in once, run locally.

## Check Behavior

The dashboard has two timing controls:

- **Check interval**: used when no task is accepted. Minimum: `5` seconds.
- **After accept**: used when one or more tasks were accepted. Minimum: `0.1` seconds.

Each timing control can be randomized:

- **Check interval randomization**: base value plus/minus 3 seconds, clamped to at least 5 seconds.
- **After accept randomization**: base value plus/minus 0.2 seconds, clamped to at least 0.1 seconds.

For example, set **After accept** to `0.2` seconds if you want the bot to check again very quickly after a successful accept.

## Cluster Counts

A cluster is a burst of successful accepts across consecutive checks.

- **Current cluster** shows the in-progress burst count while LingBot is still finding accepted projects.
- **Latest cluster** updates only after a completed burst has more than one accepted project.

If LingBot accepts one project and the next check finds no more, **Latest cluster** does not update.

## Requirements

- Windows PowerShell.
- Node.js 20 or newer.
- Google Chrome.
- Git, if installing from GitHub.

## Quick Start

Clone and install:

```powershell
git clone https://github.com/goodrj/LingBot.git
cd "LingBot"
npm install
npm run install:browsers
```

Create the local automation login profile:

```powershell
cd "LingBot"
npm run setup:login
```

In the Chrome window that opens:

1. Sign into the Google account that has Linguana access.
2. Open:

```text
https://cms.linguana.com/apps/gf
```

3. Confirm the task page loads.
4. Close that Chrome window.

Start the app:

```powershell
cd "LingBot"
npm run start:automation
```

Keep that terminal open, then open:

```text
http://localhost:3131
```

Click **Start** in the dashboard.

## Daily Use

After first-time login setup, normal use is:

```powershell
cd "LingBot"
npm run start:automation
```

Then open:

```text
http://localhost:3131
```

Use **Start**, **Stop**, or **Restart** from the dashboard.

## How It Works

LingBot runs one local Node process with two responsibilities:

- Dashboard/API server: serves the browser UI and exposes database-backed API endpoints.
- Bot controller: polls the local database for dashboard commands and controls Chrome.

The dashboard does not directly control the browser. It writes command records to SQLite and reads bot status/history from SQLite-backed endpoints. The bot independently polls those command records and updates status/history in the same database.

See [Architecture](docs/ARCHITECTURE.md) for more detail.

## Local Data

LingBot stores all runtime data locally in:

```text
data/
```

Important files:

- `data/linguana-bot.sqlite`: accepted task history, status, and command queue.
- `data/automation-profile/`: persistent Chrome profile used by the automation flow.

The `data/` folder is intentionally ignored by Git and should not be uploaded.

## Available Commands

```powershell
npm run setup:login
```

Opens normal Chrome with LingBot's dedicated automation profile so you can sign in once.

```powershell
npm run start:automation
```

Starts the dashboard and uses the dedicated automation profile.

```powershell
npm run install:browsers
```

Installs the Playwright-managed browser dependencies.

```powershell
npm start
```

Starts the dashboard with default environment settings.

Legacy/advanced commands:

```powershell
npm run start:existing-chrome
npm run restart:existing-chrome
```

These attempt to control an existing Chrome profile through Chrome remote debugging. Current Chrome versions may block this for normal user profiles, so `start:automation` is the recommended path.

## Configuration

Environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3131` | Dashboard port. |
| `LINGUANA_USER_DATA_DIR` | `data/browser-profile` | Browser profile path for the default runner. |
| `LINGUANA_BROWSER_CHANNEL` | unset | Playwright browser channel, for example `chrome`. |
| `LINGUANA_CDP_URL` | unset | Advanced Chrome DevTools Protocol URL. |
| `LINGUANA_CHROME_EMAIL` | unset | Legacy existing-Chrome profile lookup email. |
| `LINGUANA_CHROME_PROFILE` | unset | Legacy existing-Chrome profile folder override. |

## Troubleshooting

Common problems and fixes are documented in [Troubleshooting](docs/TROUBLESHOOTING.md).

## Security And Privacy

- Credentials are not stored by LingBot code.
- Chrome session data remains in the local `data/` folder.
- Task history remains in the local SQLite database.
- Do not commit or share the `data/` folder.
- Only run this for accounts and websites you are authorized to use.

See [Security Notes](SECURITY.md).

## Project Structure

```text
LingBot/
  public/                 Dashboard frontend
  scripts/                PowerShell and setup helpers
  src/
    bot.js                Browser automation controller
    db.js                 SQLite schema and queries
    server.js             Express dashboard/API server
  docs/                   Architecture, operations, troubleshooting
```

## License

ISC
