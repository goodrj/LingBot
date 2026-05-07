# Operations

## First-Time Setup

```powershell
cd "C:\path\to\LingBot"
npm install
npm run install:browsers
npm run setup:login
```

After login setup, start the dashboard:

```powershell
cd "C:\path\to\LingBot"
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

The check interval controls idle polling. The after-accept delay controls how quickly LingBot reloads after one or more tasks are accepted. When no tasks are accepted, it waits for the configured check interval.

Protective minimums:

- Check interval: `5` seconds.
- After accept: `0.1` seconds.

Randomization is on by default and can be toggled per timing control. Check interval randomization uses plus/minus 3 seconds. After-accept randomization uses plus/minus 0.2 seconds. Randomized values are clamped to the same protective minimums.

Current cluster shows the active burst count. Latest cluster updates after a burst of more than one successful acceptance ends.

The Today, This week, and This month cards can be reset from the dashboard. Resetting those cards does not delete task history.

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
cd "C:\path\to\LingBot"
git pull
npm install
```

Then run:

```powershell
cd "C:\path\to\LingBot"
npm run start:automation
```
