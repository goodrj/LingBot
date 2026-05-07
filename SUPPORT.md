# Support

Use this guide when you need help with LingBot.

## Before Asking For Help

Run:

```powershell
cd "LingBot"
npm run check
```

Also check:

- [Quick Start](docs/QUICKSTART.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [FAQ](docs/FAQ.md)

## Helpful Details To Include

When reporting a problem, include:

- What command you ran.
- What you expected to happen.
- What actually happened.
- The dashboard status message.
- Any terminal error text.
- Whether Chrome opened.
- Whether `http://localhost:3131` loaded.

## Useful Commands

Check current Git branch:

```powershell
git branch --show-current
```

Check changed files:

```powershell
git status --short
```

Run validation:

```powershell
npm run check
```

Start LingBot:

```powershell
npm run start:automation
```

Reset local login and history:

```powershell
Remove-Item -Recurse -Force ".\data"
npm run setup:login
```

## Security Reminder

Do not share:

- `data/`
- screenshots showing private tasks
- browser profile files
- cookies
- passwords
