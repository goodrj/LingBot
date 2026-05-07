# Glossary

Short explanations for words used in this repo.

## Bot

A program that does repeated work for you.

In LingBot, the bot checks a web page and clicks `Accept` buttons.

## Dashboard

The local web page you use to control LingBot.

You open it at:

```text
http://localhost:3131
```

## Localhost

`localhost` means your own computer.

When you open `http://localhost:3131`, you are not opening a public website. You are opening the LingBot app running on your PC.

## SQLite

A small database stored as a file.

LingBot uses SQLite to remember:

- bot status
- settings
- accepted project history

## Browser Profile

A folder where Chrome stores login sessions, cookies, and browser data.

LingBot uses its own automation profile so it does not need to use your everyday Chrome profile.

## Check Interval

The wait time after LingBot finds no project to accept.

## After Accept

The wait time after LingBot accepts at least one project.

## Randomization

A small random change to a wait time.

Example:

```text
10 seconds plus/minus 3 seconds
```

means the wait can be anywhere from 7 to 13 seconds.

## Cluster

A burst of projects accepted close together.

If LingBot accepts projects across repeated reloads until no more are found, that whole burst is one cluster.

## Persistent

Something that stays saved after the app closes.

LingBot's login profile and database are persistent.
