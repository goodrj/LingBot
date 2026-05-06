# Contributing

## Development Setup

```powershell
git clone https://github.com/goodrj/LingBot.git
cd "LingBot"
npm install
npm run install:browsers
```

## Run Locally

```powershell
cd "LingBot"
npm run setup:login
npm run start:automation
```

## Code Style

- Keep the app local-first and dependency-light.
- Prefer explicit database-backed state over hidden in-memory coupling.
- Keep browser automation selectors conservative and readable.
- Do not commit local data, logs, browser profiles, or SQLite runtime files.

## Validation

Before committing:

```powershell
cd "LingBot"
node --check src/bot.js
node --check src/db.js
node --check src/server.js
node --check public/app.js
node --check scripts/setup-login-browser.js
```
