# Release Checklist

Use this before merging or publishing important changes.

## Code Checks

Run:

```powershell
cd "LingBot"
npm run check
```

Expected result:

```text
No syntax errors
```

## Manual Smoke Test

1. Start LingBot:

```powershell
cd "LingBot"
npm run start:automation
```

2. Open:

```text
http://localhost:3131
```

3. Confirm the dashboard loads.
4. Change timing settings.
5. Confirm settings stay after refresh.
6. Click **Start**.
7. Confirm the bot opens/navigates to the Linguana page.
8. Click **Stop**.

## Documentation Check

Confirm these docs still match the app:

- `README.md`
- `docs/QUICKSTART.md`
- `docs/USER_GUIDE.md`
- `docs/TROUBLESHOOTING.md`
- `docs/OPERATIONS.md`
- `CHANGELOG.md`

## Local Data Check

Confirm none of these are staged:

```text
data/
*.log
.env
*.sqlite
node_modules/
```

Run:

```powershell
git status --short
```

## GitHub Push

Commit:

```powershell
git add .
git commit -m "Describe the change"
```

Push:

```powershell
git push
```
