const { chromium } = require("playwright");

const targetUrl = "https://cms.linguana.com/apps/gf";
const userDataDir = process.env.LINGUANA_USER_DATA_DIR;
const channel = process.env.LINGUANA_BROWSER_CHANNEL || "chrome";

if (!userDataDir) {
  console.error("LINGUANA_USER_DATA_DIR is required.");
  process.exit(1);
}

(async () => {
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel,
    headless: false,
    viewport: { width: 1440, height: 900 },
  });

  const page = context.pages()[0] || await context.newPage();
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" }).catch(() => {});

  console.log("");
  console.log("Login setup browser is open.");
  console.log("Use that Chrome window to log in, then close the Chrome window when finished.");

  await new Promise((resolve) => {
    context.on("close", resolve);
  });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
