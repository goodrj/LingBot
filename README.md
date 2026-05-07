# LingBot

LingBot is a local browser bot with a dashboard. It helps an authorized user watch the Linguana CMS task page, accept available projects, and keep a local history of what was accepted.

It runs on your own computer. It opens a real Chrome window. It stores its data locally. It does not ask for your password.

> Use LingBot only on accounts and websites where you have permission to automate task acceptance.

## At A Glance

| Item | Details |
| --- | --- |
| Runs on | Windows with PowerShell |
| Browser | Google Chrome |
| Dashboard | `http://localhost:3131` |
| Database | Local SQLite file |
| Login style | Dedicated local Chrome profile |
| Main command | `npm run start:automation` |

## Documentation Map

| I want to... | Read this |
| --- | --- |
| Run LingBot for the first time | [Quick Start](docs/QUICKSTART.md) |
| Understand every dashboard control | [User Guide](docs/USER_GUIDE.md) |
| Fix a problem | [Troubleshooting](docs/TROUBLESHOOTING.md) |
| Learn unfamiliar terms | [Glossary](docs/GLOSSARY.md) |
| See common questions | [FAQ](docs/FAQ.md) |
| Understand the code | [Architecture](docs/ARCHITECTURE.md) |
| Operate and update the app | [Operations](docs/OPERATIONS.md) |
| Report a bug or ask for help | [Support](SUPPORT.md) |
| Contribute changes | [Contributing](CONTRIBUTING.md) |

## What LingBot Does

- Opens a visible Chrome browser.
- Reuses a local login profile so you do not sign in every run.
- Visits `https://cms.linguana.com/apps/gf`.
- Looks for `Accept` buttons in the project table.
- Reads project details before clicking accept.
- Saves accepted projects to a local SQLite database.
- Shows a dashboard at `http://localhost:3131`.
- Stops if the page fails or redirects to login.

## Why This Repo Exists

This repo is meant to be understandable by a beginner and maintainable by a developer.

If you are new:

- Start with [Quick Start](docs/QUICKSTART.md).
- Read [Glossary](docs/GLOSSARY.md) if a word feels unfamiliar.
- Use [Troubleshooting](docs/TROUBLESHOOTING.md) when something breaks.

If you are improving the app:

- Read [Architecture](docs/ARCHITECTURE.md).
- Read [Operations](docs/OPERATIONS.md).
- Read [Contributing](CONTRIBUTING.md).

## Features

- Dashboard controls: Start, Stop, Restart.
- Check interval, defaulting to 10 seconds.
- After-accept delay, defaulting to 1 second.
- Optional randomized timing:
  - Check interval: plus/minus 3 seconds.
  - After accept: plus/minus 0.2 seconds.
- Protective minimums:
  - Check interval cannot go below 5 seconds.
  - After accept cannot go below 0.1 seconds.
- Current cluster count.
- Latest completed cluster count.
- Accepted counts for today, this week, and this month.
- Searchable accepted-project history.
- Local database storage.

## Quick Start

Install:

```powershell
git clone https://github.com/goodrj/LingBot.git
cd "LingBot"
npm install
npm run install:browsers
```

Set up login:

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

3. Confirm the page loads.
4. Close that Chrome window.

Run LingBot:

```powershell
cd "LingBot"
npm run start:automation
```

Keep that terminal open, then open:

```text
http://localhost:3131
```

Click **Start**.

## Dashboard Timing

LingBot has two timing settings.

| Setting | What It Means | Minimum |
| --- | --- | --- |
| Check interval | How long to wait after finding no projects | 5 seconds |
| After accept | How long to wait after accepting at least one project | 0.1 seconds |

Randomization can be turned on for each setting.

Example:

- Check interval is `10`.
- Randomization is on.
- LingBot waits somewhere between `7` and `13` seconds.

## Cluster Counts

A cluster is a burst of projects accepted close together.

Example:

1. LingBot accepts 1 project.
2. It reloads and accepts another.
3. It reloads and accepts 3 more.
4. It reloads and finds none.

That completed cluster is `5`.

Dashboard cards:

- **Current cluster**: the burst currently happening.
- **Latest cluster**: the most recent completed burst with more than 1 project.

If only 1 project is accepted, **Latest cluster** does not change.

## Local Data

LingBot stores local runtime data in:

```text
data/
```

Important local files:

- `data/linguana-bot.sqlite`: accepted-project history and bot state.
- `data/automation-profile/`: Chrome login/session profile.

The `data/` folder is ignored by Git. Do not upload it.

## Commands

From the project folder:

```powershell
npm run setup:login
```

Creates or opens the local login profile.

```powershell
npm run start:automation
```

Starts the dashboard and bot controller.

```powershell
npm run check
```

Runs syntax checks.

```powershell
npm run install:browsers
```

Installs Playwright browser dependencies.

```powershell
npm start
```

Starts the dashboard with default environment settings. Most users should prefer `npm run start:automation`.

## Project Map

```text
LingBot/
  public/                 Dashboard files
  scripts/                PowerShell setup/start helpers
  src/
    bot.js                Browser automation logic
    db.js                 SQLite database logic
    server.js             Dashboard/API server
  docs/                   Beginner and developer docs
```

## More Docs

- [Docs Index](docs/README.md)
- [Quick Start](docs/QUICKSTART.md)
- [User Guide](docs/USER_GUIDE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Glossary](docs/GLOSSARY.md)
- [FAQ](docs/FAQ.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Operations](docs/OPERATIONS.md)
- [Design Decisions](docs/DESIGN_DECISIONS.md)
- [Release Checklist](docs/RELEASE_CHECKLIST.md)
- [Security Notes](SECURITY.md)
- [Support](SUPPORT.md)
- [Contributing](CONTRIBUTING.md)

## License

[ISC](LICENSE)
