# Operations

## First-Time Setup

```powershell
cd "LingBot"
npm install
npm run install:browsers
npm run setup:login
```

After login setup, start the dashboard:

```powershell
cd "LingBot"
npm run start:automation
```

Open:

```text
http://localhost:3131
```

## Dashboard Workflow

1. Set the interval, if needed.
2. Click **Start**.
3. Watch status for errors.
4. Use **Stop** before closing the app.
5. Keep the terminal open while the bot is running.

## Data Retention

Task history is stored locally in:

```text
data/linguana-bot.sqlite
```

There is no automatic retention cleanup. To clear history, stop the app and delete `data/linguana-bot.sqlite`.

## Backup

To back up local history and login state, copy:

```text
data/
```

Do not upload that folder to GitHub because it contains local browser session data.

## Updating From GitHub

```powershell
cd "LingBot"
git pull
npm install
```

Then run:

```powershell
cd "LingBot"
npm run start:automation
```
