# FAQ

## Does LingBot store my password?

No. You sign in directly inside Chrome. LingBot does not ask for your password.

## Can I close the terminal?

Not while using LingBot. The terminal is running the app.

If you close it, the dashboard stops.

## Why does LingBot use a separate Chrome profile?

Modern Chrome blocks some automation methods on your normal Chrome profile. A separate profile is more reliable and safer.

## Can I use my normal Chrome while LingBot runs?

Yes. LingBot uses its own automation profile.

If the bot tab steals focus, it should only happen when the bot tab is first created.

## Why does the app stop on login redirect?

That is intentional. If LingBot is no longer logged in, it stops instead of repeatedly retrying.

Run:

```powershell
cd "LingBot"
npm run setup:login
```

Then run:

```powershell
cd "LingBot"
npm run start:automation
```

## What does Current cluster mean?

It is the number of projects accepted in the burst currently happening.

## What does Latest cluster mean?

It is the most recent completed burst that accepted more than one project.

## Where is my history stored?

Here:

```text
data/linguana-bot.sqlite
```

Do not upload the `data` folder to GitHub.

## How do I reset everything?

This deletes login data and local history:

```powershell
cd "LingBot"
Remove-Item -Recurse -Force ".\data"
npm run setup:login
```
