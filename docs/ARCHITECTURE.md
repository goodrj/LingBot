# Architecture

LingBot is intentionally small and local-first. The application is a single Node.js service that serves the dashboard, stores state in SQLite, and runs the bot controller in the same process.

## Components

### Dashboard

Files:

- `public/index.html`
- `public/styles.css`
- `public/app.js`

The dashboard is a plain browser UI served from Express. It displays bot status, task counts, cluster counts, timing controls, and accepted task history.

The dashboard does not call the bot object directly. User actions are sent to the API, then stored as command rows in SQLite.

### API Server

File:

- `src/server.js`

Responsibilities:

- Serve static dashboard files.
- Expose bot status from SQLite.
- Expose accepted task counts and history from SQLite.
- Write dashboard commands to the SQLite command queue.

Key endpoints:

- `GET /api/status`
- `GET /api/counts`
- `GET /api/tasks`
- `POST /api/commands`

### Database Layer

File:

- `src/db.js`

SQLite stores three kinds of records:

- Bot status.
- Dashboard command queue.
- Accepted task history.

Tables:

- `bot_status`
- `commands`
- `accepted_tasks`

### Bot Controller

File:

- `src/bot.js`

Responsibilities:

- Poll pending command rows from SQLite.
- Open a visible persistent Chrome browser through Playwright.
- Navigate to `https://cms.linguana.com/apps/gf`.
- Stop on load failure or login/auth redirect.
- Find visible `Accept` buttons in task table rows.
- Extract task row data before clicking.
- Save accepted task records to SQLite.
- Schedule another check using the configured success recheck delay when a check accepts one or more tasks.

## Control Flow

1. User clicks a dashboard button.
2. Dashboard sends `POST /api/commands`.
3. API writes a command row to SQLite.
4. Bot controller polls pending commands.
5. Bot executes the command.
6. Bot updates `bot_status` and writes accepted tasks.
7. Dashboard refreshes from SQLite-backed API endpoints.

This keeps the UI and automation loosely coupled while remaining simple enough to run locally.

## Check Scheduling

The dashboard interval is an idle polling interval, not a delay after every successful acceptance.

- If a check accepts at least one task, LingBot schedules the next check using the configured success recheck delay.
- If a check accepts no tasks, LingBot waits for the configured interval before checking again.
- If randomization is enabled, LingBot applies a bounded random offset and clamps the result to the configured minimum.

This allows LingBot to drain newly available tasks quickly while still avoiding constant reloads when no work is available.

## Cluster Tracking

A cluster begins when a check accepts one or more tasks. Each consecutive successful check adds to the current cluster count. The cluster ends when a check accepts no tasks.

When a cluster ends:

- If it contains more than one accepted task, it becomes the latest completed cluster.
- If it contains exactly one accepted task, the latest completed cluster remains unchanged.

## Browser Profile Strategy

Chrome 136+ restricts remote debugging against a normal user-data directory. For reliability, LingBot uses a dedicated automation Chrome profile under:

```text
data/automation-profile/
```

The first-time setup command opens normal Chrome with that profile so the user can sign in without Playwright. Later, `start:automation` lets Playwright reuse that already-authenticated profile.
