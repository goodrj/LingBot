# Security Notes

LingBot is a local automation tool. It should only be used on accounts and websites where the user has permission to automate task acceptance.

## Sensitive Local Data

The `data/` folder can contain:

- Browser cookies.
- Login session data.
- Local accepted task history.
- SQLite database files.

Do not commit or upload `data/`.

## Credentials

LingBot does not ask for, store, or transmit passwords. Login is performed directly in Chrome during setup.

## Network Scope

The bot targets:

```text
https://cms.linguana.com/apps/gf
```

The dashboard is served locally at:

```text
http://localhost:3131
```

## Recommended Use

- Run the app only on trusted machines.
- Keep the terminal open only while actively using the dashboard.
- Stop the bot before closing the browser or terminal.
- Do not share local database or browser profile folders.
- Review the target site's rules before automating.

## What Not To Upload

Never upload:

```text
data/
.env
*.sqlite
```

These can contain local browser/session data or local history.

## Reporting Security Issues

Do not post passwords, cookies, browser profile folders, or private task data in public issues.

Instead, share a minimal description of the problem and remove private details from logs or screenshots.
