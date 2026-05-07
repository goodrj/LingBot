# Design Decisions

This document explains why LingBot is built the way it is.

## Local-First

LingBot runs on the user's computer instead of a server.

Why:

- The browser login stays local.
- The accepted-project history stays local.
- Setup is simpler for one user or a small team.

Tradeoff:

- The terminal must stay open while LingBot is running.

## Visible Browser

LingBot uses a real visible browser instead of a hidden browser.

Why:

- The user can see what is happening.
- Login setup is easier.
- Problems are easier to understand.

Tradeoff:

- A Chrome window is open while the bot runs.

## Dedicated Automation Profile

LingBot uses a separate Chrome profile under `data/automation-profile/`.

Why:

- It avoids interfering with the user's everyday Chrome profile.
- It keeps the bot login persistent.
- It avoids Chrome restrictions around controlling normal profiles.

Tradeoff:

- The user must log in once inside the automation profile.

## SQLite

LingBot stores state in SQLite.

Why:

- It is a single local file.
- It needs no database server.
- It is reliable enough for command queue, status, and history.

Tradeoff:

- It is local to one computer by default.

## Dashboard And Bot Communicate Through The Database

The dashboard does not directly call browser automation code.

Instead:

1. The dashboard writes a command to SQLite.
2. The bot reads the command.
3. The bot updates SQLite.
4. The dashboard reads the new status.

Why:

- The UI stays simple.
- The bot can run independently.
- Status and history are visible even after refreshes.

Tradeoff:

- Commands are processed by polling, not instant direct function calls.

## No Auto-Retry After Login Failure

If LingBot is redirected to login, it stops.

Why:

- Repeated login retries are noisy.
- It protects against accidental rapid reloads.
- The user should manually confirm the login state.
