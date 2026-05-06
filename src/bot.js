const path = require("path");
const { chromium } = require("playwright");
const {
  dataDir,
  getStatus,
  setStatus,
  getPendingCommands,
  markCommandProcessed,
  saveAcceptedTask,
  nowIso,
} = require("./db");

const TARGET_URL = "https://cms.linguana.com/apps/gf";
const userDataDir = process.env.LINGUANA_USER_DATA_DIR || path.join(dataDir, "browser-profile");
const browserChannel = process.env.LINGUANA_BROWSER_CHANNEL || undefined;
const cdpUrl = process.env.LINGUANA_CDP_URL || "";

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
    this.commandTimer = setInterval(() => this.processCommands(), 750);
    this.commandTimer.unref?.();
  }

  async processCommands() {
    const commands = getPendingCommands();
    for (const item of commands) {
      try {
        if (item.command === "start") {
          await this.start(item.intervalMs);
        } else if (item.command === "stop") {
          await this.stop("Stopped by dashboard");
        } else if (item.command === "restart") {
          await this.restart(item.intervalMs);
        } else if (item.command === "setInterval") {
          this.setIntervalMs(item.intervalMs);
        }
      } finally {
        markCommandProcessed(item.id);
      }
    }
  }

  setIntervalMs(intervalMs) {
    if (!Number.isFinite(intervalMs) || intervalMs < 1000) return;
    this.intervalMs = Math.round(intervalMs);
    const status = getStatus();
    setStatus(status.state, status.message, this.intervalMs);
    if (this.running) {
      this.scheduleNext();
    }
  }

  async start(intervalMs) {
    if (Number.isFinite(intervalMs) && intervalMs >= 1000) {
      this.intervalMs = Math.round(intervalMs);
    }

    if (this.running) {
      setStatus("running", null, this.intervalMs);
      return;
    }

    setStatus("running", null, this.intervalMs);
    this.running = true;

    try {
      await this.ensureBrowser();
      await this.checkOnce();
      this.scheduleNext();
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
    setStatus("stopped", message, this.intervalMs);
  }

  async restart(intervalMs) {
    await this.stop("Restarting");
    await this.start(intervalMs);
  }

  scheduleNext() {
    if (!this.running) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(async () => {
      try {
        await this.checkOnce();
        this.scheduleNext();
      } catch (error) {
        await this.fail(error);
      }
    }, this.intervalMs);
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
      this.context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        channel: browserChannel,
        viewport: { width: 1440, height: 900 },
        args: ["--disable-blink-features=AutomationControlled"],
      });
      this.ownsBrowser = true;
    }

    this.page = this.context.pages()[0] || await this.context.newPage();
    this.page.setDefaultTimeout(15000);
    this.page.setDefaultNavigationTimeout(30000);
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
    setStatus("error", error.message || String(error), this.intervalMs);
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

    await this.acceptVisibleTasks();
    setStatus("running", null, this.intervalMs);
  }

  async acceptVisibleTasks() {
    const acceptButtons = await this.page.locator("table tr button:has-text('Accept'), table tr a:has-text('Accept')").all();
    for (const button of acceptButtons) {
      if (!(await button.isVisible().catch(() => false))) continue;

      const task = await button.evaluate((el) => {
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
      });

      if (!task) continue;
      await button.click({ timeout: 10000 });
      saveAcceptedTask({ ...task, acceptedAt: nowIso() });
      await this.page.waitForTimeout(300);
    }
  }
}

function isLoginUrl(url) {
  const lowered = url.toLowerCase();
  return lowered.includes("/login") || lowered.includes("signin") || lowered.includes("auth");
}

module.exports = { BotController, TARGET_URL, userDataDir, cdpUrl };
