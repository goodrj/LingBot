# User Guide

This guide explains the dashboard in plain language.

## Status

The status badge tells you what LingBot is doing.

- `running`: the bot is active.
- `stopped`: the bot is not active.
- `error`: the bot stopped because something went wrong.

## Buttons

### Start

Starts checking the Linguana page.

### Stop

Stops the bot and closes the automation browser.

### Restart

Stops and starts again.

Use this if you changed settings and want a clean run.

## Timing Settings

### Check interval

This is how long LingBot waits when it finds no projects.

Default:

```text
10 seconds
```

Minimum:

```text
5 seconds
```

### After accept

This is how long LingBot waits after it successfully accepts at least one project.

Default:

```text
1 second
```

Minimum:

```text
0.1 seconds
```

### Randomize

Randomize makes the delay slightly different each time.

Check interval randomization:

```text
base time plus/minus 3 seconds
```

After accept randomization:

```text
base time plus/minus 0.2 seconds
```

Randomization never goes below the safety minimum.

## Counts

### Current cluster

The burst currently happening.

If projects keep getting accepted after reloads, this number grows.

### Latest cluster

The most recent completed burst with more than one project.

If only one project was accepted, this card does not update.

### Today, This Week, This Month

These show accepted project counts from the local database.

## History Table

The history table shows accepted projects.

You can search by:

- title
- type
- channel
- language
- due date
- duration

You can also filter by date.
