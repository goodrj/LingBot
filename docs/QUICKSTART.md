# Quick Start

This guide is for someone who just wants to run LingBot.

## Step 1: Install The App

Open PowerShell and run:

```powershell
cd "C:\path\to\where\you\want\the\app"
git clone https://github.com/goodrj/LingBot.git
cd ".\LingBot"
npm install
npm run install:browsers
```

Replace `C:\path\to\where\you\want\the\app` with the folder where you want to download LingBot. If your terminal is already inside the `LingBot` folder, skip the `cd ".\LingBot"` line.

## Step 2: Log In Once

Run:

```powershell
cd "C:\path\to\LingBot"
npm run setup:login
```

A normal Chrome window opens.

In that Chrome window:

1. Sign into the Google account that has Linguana access.
2. Go to:

```text
https://cms.linguana.com/apps/gf
```

3. Make sure the project page loads.
4. Close that Chrome window.

You only need to repeat this when the login expires.

## Step 3: Start LingBot

Run:

```powershell
cd "C:\path\to\LingBot"
npm run start:automation
```

Do not close this terminal while using LingBot.

## Step 4: Open The Dashboard

Open Chrome and go to:

```text
http://localhost:3131
```

Click **Start**.

## Step 5: Stop When Finished

Click **Stop** in the dashboard.

Then close the terminal.
