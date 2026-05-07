const path = require("path");
const { chromium } = require("playwright");
const {
  dataDir,
  getStatus,
  setStatus,
  getPendingCommands,
  markCommandProcessed,
  saveAcceptedTask,
  setClusterCounts,
  nowIso,
} = require("./db");

const TARGET_URL = "https://cms.linguana.com/apps/gf";
const userDataDir = process.env.LINGUANA_USER_DATA_DIR || path.join(dataDir, "browser-profile");
const browserChannel = process.env.LINGUANA_BROWSER_CHANNEL || undefined;
const cdpUrl = process.env.LINGUANA_CDP_URL || "";
const browserLaunchArgs = [
  "--disable-blink-features=AutomationControlled",
  "--disable-gpu",
  "--start-maximized",
];
const ACCEPT_BUTTON_SELECTOR = "table tr button:has-text('Accept'), table tr a:has-text('Accept')";
const MIN_INTERVAL_MS = 5000;
const MIN_SUCCESS_RECHECK_MS = 100;
const INTERVAL_RANDOM_RANGE_MS = 3000;
const SUCCESS_RECHECK_RANDOM_RANGE_MS = 200;

class BotController {
  constructor() {
    this.context = null;
    this.browser = null;
    this.page = null;
    this.ownsBrowser = true;
    this.running = false;
    this.timer = null;
    this.commandTimer = null;
    this.intervalMs = getStatus().intervalMs || 5000;
    this.successRecheckMs = getStatus().successRecheckMs || 1000;
    this.intervalRandomized = Boolean(getStatus().intervalRandomized);
    this.successRecheckRandomized = Boolean(getStatus().successRecheckRandomized);
    this.currentClusterCount = getStatus().currentClusterCount || 0;
    this.latestClusterCount = getStatus().latestClusterCount || 0;
    this.commandTimer = setInterval(() => this.processCommands(), 750);
    this.commandTimer.unref?.();
  }

  async processCommands() {
    const commands = getPendingCommands();
    for (const item of commands) {
      try {
        if (item.command === "start") {
          this.setTiming(item);
          await this.start(item.intervalMs);
        } else if (item.command === "stop") {
          await this.stop("Stopped by dashboard");
        } else if (item.command === "restart") {
          this.setTiming(item);
          await this.restart(item.intervalMs);
        } else if (item.command === "setTiming") {
          this.setTiming(item);
        }
      } finally {
        markCommandProcessed(item.id);
      }
    }
  }

  setTiming({ intervalMs, successRecheckMs, intervalRandomized, successRecheckRandomized }) {
    if (Number.isFinite(intervalMs) && intervalMs >= MIN_INTERVAL_MS) {
      this.intervalMs = Math.round(intervalMs);
    }
    if (Number.isFinite(successRecheckMs) && successRecheckMs >= MIN_SUCCESS_RECHECK_MS) {
      this.successRecheckMs = Math.round(successRecheckMs);
    }
    if (intervalRandomized != null) {
      this.intervalRandomized = Boolean(intervalRandomized);
    }
    if (successRecheckRandomized != null) {
      this.successRecheckRandomized = Boolean(successRecheckRandomized);
    }

    const status = getStatus();
    this.currentClusterCount = status.currentClusterCount || this.currentClusterCount;
    this.latestClusterCount = status.latestClusterCount || this.latestClusterCount;
    this.writeStatus(status.state, status.message);
    if (this.running) {
      this.scheduleNext();
    }
  }

  async start(intervalMs) {
    if (Number.isFinite(intervalMs) && intervalMs >= MIN_INTERVAL_MS) {
      this.intervalMs = Math.round(intervalMs);
    }

    if (this.running) {
      this.writeStatus("running");
      return;
    }

    this.writeStatus("running");
    this.running = true;

    try {
      await this.ensureBrowser();
      await this.runCheckAndSchedule();
    } catch (error) {
      await this.fail(error);
    }
  }

  async stop(message = null) {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.closeBrowser();
    this.finishClusterIfNeeded();
    this.writeStatus("stopped", message);
  }

  async restart(intervalMs) {
    await this.stop("Restarting");
    await this.start(intervalMs);
  }

  scheduleNext() {
    this.scheduleNextAfter(this.intervalMs);
  }

  scheduleNextAfter(delayMs) {
    if (!this.running) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(async () => {
      await this.runCheckAndSchedule();
    }, delayMs);
  }

  async runCheckAndSchedule() {
    try {
      const acceptedCount = await this.checkOnce();
      const status = getStatus();
      this.intervalMs = status.intervalMs || this.intervalMs;
      this.successRecheckMs = status.successRecheckMs || this.successRecheckMs;
      this.intervalRandomized = Boolean(status.intervalRandomized);
      this.successRecheckRandomized = Boolean(status.successRecheckRandomized);
      const delayMs = this.getNextDelayMs(acceptedCount);
      this.scheduleNextAfter(delayMs);
    } catch (error) {
      await this.fail(error);
    }
  }

  async ensureBrowser() {
    if (this.context && this.page && !this.page.isClosed()) return;

    if (cdpUrl) {
      try {
        this.browser = await chromium.connectOverCDP(cdpUrl);
      } catch (error) {
        throw new Error(`Cannot connect to Chrome at ${cdpUrl}. Close Chrome completely, start the app with "npm run start:existing-chrome", keep that Chrome window open, then press Start again. Original error: ${error.message}`);
      }
      this.context = this.browser.contexts()[0];
      if (!this.context) {
        throw new Error(`Connected to ${cdpUrl}, but no Chrome browser context was available.`);
      }
      this.ownsBrowser = false;
    } else {
      this.context = await this.launchPersistentBrowserContext();
      this.ownsBrowser = true;
    }

    this.page = await this.createBotPage();
    this.page.setDefaultTimeout(15000);
    this.page.setDefaultNavigationTimeout(30000);
  }

  async createBotPage() {
    const page = await this.context.newPage();
    await page.bringToFront().catch(() => {});
    await this.closeExtraBlankPages(page);
    return page;
  }

  async closeExtraBlankPages(activePage) {
    const pages = this.context.pages();
    await Promise.all(pages.map(async (page) => {
      if (page === activePage || page.isClosed()) return;
      if (page.url() === "about:blank") {
        await page.close().catch(() => {});
      }
    }));
  }

  async launchPersistentBrowserContext() {
    const primaryOptions = {
      headless: false,
      channel: browserChannel,
      viewport: null,
      ignoreDefaultArgs: ["--disable-sync"],
      args: browserLaunchArgs,
    };

    try {
      return await chromium.launchPersistentContext(userDataDir, primaryOptions);
    } catch (error) {
      if (!isEarlyChromeWindowFailure(error) || !browserChannel) {
        throw new Error(getLaunchErrorMessage(error));
      }

      return chromium.launchPersistentContext(userDataDir, {
        ...primaryOptions,
        channel: undefined,
      }).catch((retryError) => {
        throw new Error(`${getLaunchErrorMessage(error)} Retry with bundled Chromium also failed: ${retryError.message}`);
      });
    }
  }

  async closeBrowser() {
    const context = this.context;
    const browser = this.browser;
    const ownsBrowser = this.ownsBrowser;
    this.context = null;
    this.browser = null;
    this.page = null;
    this.ownsBrowser = true;
    if (context && ownsBrowser) {
      await context.close().catch(() => {});
    }
    if (browser && !ownsBrowser) {
      await browser.disconnect().catch(() => {});
    }
  }

  async fail(error) {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.closeBrowser();
    this.finishClusterIfNeeded();
    this.writeStatus("error", error.message || String(error));
  }

  async checkOnce() {
    await this.ensureBrowser();
    const response = await this.page.goto(TARGET_URL, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    const finalUrl = this.page.url();
    if (!response || !response.ok()) {
      throw new Error(`Page failed to load: ${response ? response.status() : "no response"}`);
    }

    if (isLoginUrl(finalUrl)) {
      throw new Error(`Redirected to login at ${finalUrl}. Bot stopped.`);
    }

    await this.page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    if (isLoginUrl(this.page.url())) {
      throw new Error(`Redirected to login at ${this.page.url()}. Bot stopped.`);
    }

    const acceptedCount = await this.acceptVisibleTasks();
    this.updateCluster(acceptedCount);
    this.writeStatus("running");
    return acceptedCount;
  }

  getNextDelayMs(acceptedCount) {
    if (acceptedCount > 0) {
      return getRandomizedDelayMs(
        this.successRecheckMs,
        this.successRecheckRandomized,
        SUCCESS_RECHECK_RANDOM_RANGE_MS,
        MIN_SUCCESS_RECHECK_MS
      );
    }

    return getRandomizedDelayMs(
      this.intervalMs,
      this.intervalRandomized,
      INTERVAL_RANDOM_RANGE_MS,
      MIN_INTERVAL_MS
    );
  }

  updateCluster(acceptedCount) {
    if (acceptedCount > 0) {
      this.currentClusterCount += acceptedCount;
      setClusterCounts(this.currentClusterCount, this.latestClusterCount);
      return;
    }

    this.finishClusterIfNeeded();
  }

  finishClusterIfNeeded() {
    if (this.currentClusterCount > 1) {
      this.latestClusterCount = this.currentClusterCount;
    }
    if (this.currentClusterCount > 0) {
      this.currentClusterCount = 0;
      setClusterCounts(this.currentClusterCount, this.latestClusterCount);
    }
  }

  writeStatus(state, message = null) {
    setStatus(
      state,
      message,
      this.intervalMs,
      this.successRecheckMs,
      this.intervalRandomized ? 1 : 0,
      this.successRecheckRandomized ? 1 : 0,
      this.currentClusterCount,
      this.latestClusterCount
    );
  }

  async acceptVisibleTasks() {
    let acceptedCount = 0;

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const acceptButtons = this.page.locator(ACCEPT_BUTTON_SELECTOR);
      const buttonCount = await acceptButtons.count().catch(() => 0);
      if (buttonCount === 0) break;

      const button = acceptButtons.first();
      if (!(await button.isVisible().catch(() => false))) break;

      const task = await this.readTaskForButton(button);

      if (!task) continue;

      try {
        await button.click({ timeout: 3000 });
        saveAcceptedTask({ ...task, acceptedAt: nowIso() });
        acceptedCount += 1;
        await this.page.waitForTimeout(300);
      } catch (error) {
        if (isTransientAcceptRace(error)) {
          break;
        }
        throw error;
      }
    }

    return acceptedCount;
  }

  async readTaskForButton(button) {
    return button.evaluate((el) => {
      const row = el.closest("tr");
      if (!row) return null;

      const normalize = (value) => (value || "").replace(/\s+/g, " ").trim();
      const cells = Array.from(row.querySelectorAll("th, td")).map((cell) => normalize(cell.innerText));
      const headers = Array.from(row.closest("table")?.querySelectorAll("thead th") || []).map((cell) => normalize(cell.innerText).toLowerCase());
      const byHeader = (names, fallbackIndex) => {
        const index = headers.findIndex((header) => names.some((name) => header.includes(name)));
        return cells[index >= 0 ? index : fallbackIndex] || "";
      };

      return {
        taskType: byHeader(["type", "task"], 0),
        title: byHeader(["title", "name"], 1),
        channel: byHeader(["channel"], 2),
        languages: byHeader(["language", "locale"], 3),
        dueDate: byHeader(["due", "deadline"], 4),
        duration: byHeader(["duration", "length"], 5),
        rawRow: cells.join(" | "),
        taskKey: cells.join("|").toLowerCase(),
      };
    }).catch((error) => {
      if (isTransientAcceptRace(error)) return null;
      throw error;
    });
  }
}

function isLoginUrl(url) {
  const lowered = url.toLowerCase();
  return lowered.includes("/login") || lowered.includes("signin") || lowered.includes("auth");
}

function isEarlyChromeWindowFailure(error) {
  const message = error.message || String(error);
  return message.includes("Browser.getWindowForTarget") || message.includes("Browser window not found");
}

function getLaunchErrorMessage(error) {
  const message = error.message || String(error);
  if (isEarlyChromeWindowFailure(error)) {
    return `Chrome opened and closed before LingBot could attach to its window. Close any Chrome window that was opened by "npm run setup:login", then restart LingBot. If it continues, reset the automation profile with "Remove-Item -Recurse -Force .\\data\\automation-profile" and run "npm run setup:login" again. Original error: ${message}`;
  }
  return message;
}

function isTransientAcceptRace(error) {
  const message = error.message || String(error);
  return message.includes("detached from the DOM") ||
    message.includes("Element is not attached") ||
    message.includes("Target closed");
}

function getRandomizedDelayMs(baseMs, enabled, rangeMs, minimumMs) {
  if (!enabled) {
    return Math.max(minimumMs, Math.round(baseMs));
  }

  const offset = Math.random() * rangeMs * 2 - rangeMs;
  return Math.max(minimumMs, Math.round(baseMs + offset));
}

module.exports = { BotController, TARGET_URL, userDataDir, cdpUrl };
