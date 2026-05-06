const express = require("express");
const path = require("path");
const {
  getStatus,
  setTiming,
  enqueueCommand,
  getCounts,
  listTasks,
} = require("./db");
const { BotController } = require("./bot");

const app = express();
const bot = new BotController();
const port = Number(process.env.PORT) || 3131;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/status", (_req, res) => {
  res.json(getStatus());
});

app.get("/api/counts", (_req, res) => {
  const counts = getCounts();
  res.json({
    today: counts.today || 0,
    week: counts.week || 0,
    month: counts.month || 0,
  });
});

app.get("/api/tasks", (req, res) => {
  res.json(listTasks({
    search: String(req.query.search || ""),
    from: String(req.query.from || ""),
    to: String(req.query.to || ""),
    limit: Number(req.query.limit || 500),
  }));
});

app.post("/api/commands", (req, res) => {
  const command = String(req.body.command || "");
  const allowed = new Set(["start", "stop", "restart", "setInterval", "setSuccessRecheck"]);
  if (!allowed.has(command)) {
    return res.status(400).json({ error: "Unknown command." });
  }

  const intervalMs = req.body.intervalMs == null ? null : Number(req.body.intervalMs);
  if (intervalMs != null && (!Number.isFinite(intervalMs) || intervalMs < 1000)) {
    return res.status(400).json({ error: "Interval must be at least 1000 ms." });
  }

  const successRecheckMs = req.body.successRecheckMs == null ? null : Number(req.body.successRecheckMs);
  if (successRecheckMs != null && (!Number.isFinite(successRecheckMs) || successRecheckMs < 100)) {
    return res.status(400).json({ error: "Success recheck delay must be at least 100 ms." });
  }

  const status = getStatus();
  if (command === "setInterval") {
    setTiming(intervalMs, status.successRecheckMs);
  } else if (command === "setSuccessRecheck") {
    setTiming(status.intervalMs, successRecheckMs);
  }

  enqueueCommand(command, intervalMs, successRecheckMs);
  res.status(202).json({ ok: true });
});

app.listen(port, () => {
  console.log(`Dashboard: http://localhost:${port}`);
});
