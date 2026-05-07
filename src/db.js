const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "linguana-bot.sqlite"));
db.pragma("journal_mode = WAL");

const DEFAULT_INTERVAL_MS = 10000;
const DEFAULT_SUCCESS_RECHECK_MS = 300;
const DEFAULT_INTERVAL_RANDOMIZED = 1;
const DEFAULT_SUCCESS_RECHECK_RANDOMIZED = 1;
const DEFAULT_CURRENT_CLUSTER_COUNT = 0;
const DEFAULT_LATEST_CLUSTER_COUNT = 0;

db.exec(`
  CREATE TABLE IF NOT EXISTS bot_status (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    state TEXT NOT NULL,
    message TEXT,
    interval_ms INTEGER NOT NULL,
    success_recheck_ms INTEGER NOT NULL DEFAULT 300,
    interval_randomized INTEGER NOT NULL DEFAULT 1,
    success_recheck_randomized INTEGER NOT NULL DEFAULT 1,
    current_cluster_count INTEGER NOT NULL DEFAULT 0,
    latest_cluster_count INTEGER NOT NULL DEFAULT 0,
    today_reset_at TEXT,
    week_reset_at TEXT,
    month_reset_at TEXT,
    settings_defaults_version INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS accepted_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_key TEXT,
    task_type TEXT,
    title TEXT,
    channel TEXT,
    languages TEXT,
    due_date TEXT,
    duration TEXT,
    accepted_at TEXT NOT NULL,
    raw_row TEXT
  );

  CREATE TABLE IF NOT EXISTS commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command TEXT NOT NULL,
    interval_ms INTEGER,
    success_recheck_ms INTEGER,
    interval_randomized INTEGER,
    success_recheck_randomized INTEGER,
    created_at TEXT NOT NULL,
    processed_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_accepted_at ON accepted_tasks(accepted_at);
  CREATE INDEX IF NOT EXISTS idx_tasks_search ON accepted_tasks(title, task_type, channel, languages);
  CREATE INDEX IF NOT EXISTS idx_commands_pending ON commands(processed_at, id);
`);

ensureColumn("bot_status", "success_recheck_ms", "INTEGER NOT NULL DEFAULT 300");
ensureColumn("bot_status", "interval_randomized", "INTEGER NOT NULL DEFAULT 1");
ensureColumn("bot_status", "success_recheck_randomized", "INTEGER NOT NULL DEFAULT 1");
ensureColumn("bot_status", "current_cluster_count", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("bot_status", "latest_cluster_count", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("bot_status", "today_reset_at", "TEXT");
ensureColumn("bot_status", "week_reset_at", "TEXT");
ensureColumn("bot_status", "month_reset_at", "TEXT");
ensureColumn("bot_status", "settings_defaults_version", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("commands", "success_recheck_ms", "INTEGER");
ensureColumn("commands", "interval_randomized", "INTEGER");
ensureColumn("commands", "success_recheck_randomized", "INTEGER");

const nowIso = () => new Date().toISOString();

db.prepare(`
  INSERT INTO bot_status (
    id,
    state,
    message,
    interval_ms,
    success_recheck_ms,
    interval_randomized,
    success_recheck_randomized,
    current_cluster_count,
    latest_cluster_count,
    today_reset_at,
    week_reset_at,
    month_reset_at,
    settings_defaults_version,
    updated_at
  )
  VALUES (1, 'stopped', NULL, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, 1, ?)
  ON CONFLICT(id) DO NOTHING
`).run(
  DEFAULT_INTERVAL_MS,
  DEFAULT_SUCCESS_RECHECK_MS,
  DEFAULT_INTERVAL_RANDOMIZED,
  DEFAULT_SUCCESS_RECHECK_RANDOMIZED,
  DEFAULT_CURRENT_CLUSTER_COUNT,
  DEFAULT_LATEST_CLUSTER_COUNT,
  nowIso()
);

applySettingsDefaults();

const statements = {
  status: db.prepare(`
    SELECT
      state,
      message,
      interval_ms AS intervalMs,
      success_recheck_ms AS successRecheckMs,
      interval_randomized AS intervalRandomized,
      success_recheck_randomized AS successRecheckRandomized,
      current_cluster_count AS currentClusterCount,
      latest_cluster_count AS latestClusterCount,
      today_reset_at AS todayResetAt,
      week_reset_at AS weekResetAt,
      month_reset_at AS monthResetAt,
      settings_defaults_version AS settingsDefaultsVersion,
      updated_at AS updatedAt
    FROM bot_status
    WHERE id = 1
  `),
  updateStatus: db.prepare(`
    UPDATE bot_status
    SET
      state = @state,
      message = @message,
      interval_ms = @intervalMs,
      success_recheck_ms = @successRecheckMs,
      interval_randomized = @intervalRandomized,
      success_recheck_randomized = @successRecheckRandomized,
      current_cluster_count = @currentClusterCount,
      latest_cluster_count = @latestClusterCount,
      today_reset_at = @todayResetAt,
      week_reset_at = @weekResetAt,
      month_reset_at = @monthResetAt,
      settings_defaults_version = @settingsDefaultsVersion,
      updated_at = @updatedAt
    WHERE id = 1
  `),
  insertCommand: db.prepare(`
    INSERT INTO commands (
      command,
      interval_ms,
      success_recheck_ms,
      interval_randomized,
      success_recheck_randomized,
      created_at
    )
    VALUES (
      @command,
      @intervalMs,
      @successRecheckMs,
      @intervalRandomized,
      @successRecheckRandomized,
      @createdAt
    )
  `),
  pendingCommands: db.prepare(`
    SELECT
      id,
      command,
      interval_ms AS intervalMs,
      success_recheck_ms AS successRecheckMs,
      interval_randomized AS intervalRandomized,
      success_recheck_randomized AS successRecheckRandomized,
      created_at AS createdAt
    FROM commands
    WHERE processed_at IS NULL
    ORDER BY id ASC
  `),
  markCommandProcessed: db.prepare("UPDATE commands SET processed_at = ? WHERE id = ?"),
  insertTask: db.prepare(`
    INSERT INTO accepted_tasks (
      task_key, task_type, title, channel, languages, due_date, duration, accepted_at, raw_row
    ) VALUES (
      @taskKey, @taskType, @title, @channel, @languages, @dueDate, @duration, @acceptedAt, @rawRow
    )
  `),
};

function getStatus() {
  return statements.status.get();
}

function setStatus(
  state,
  message = null,
  intervalMs = getStatus().intervalMs,
  successRecheckMs = getStatus().successRecheckMs,
  intervalRandomized = getStatus().intervalRandomized,
  successRecheckRandomized = getStatus().successRecheckRandomized,
  currentClusterCount = getStatus().currentClusterCount,
  latestClusterCount = getStatus().latestClusterCount,
  todayResetAt = getStatus().todayResetAt,
  weekResetAt = getStatus().weekResetAt,
  monthResetAt = getStatus().monthResetAt,
  settingsDefaultsVersion = getStatus().settingsDefaultsVersion || 1
) {
  statements.updateStatus.run({
    state,
    message,
    intervalMs,
    successRecheckMs,
    intervalRandomized: intervalRandomized ? 1 : 0,
    successRecheckRandomized: successRecheckRandomized ? 1 : 0,
    currentClusterCount,
    latestClusterCount,
    todayResetAt,
    weekResetAt,
    monthResetAt,
    settingsDefaultsVersion,
    updatedAt: nowIso(),
  });
}

function setTiming(
  intervalMs = getStatus().intervalMs,
  successRecheckMs = getStatus().successRecheckMs,
  intervalRandomized = getStatus().intervalRandomized,
  successRecheckRandomized = getStatus().successRecheckRandomized
) {
  const status = getStatus();
  setStatus(
    status.state,
    status.message,
    intervalMs,
    successRecheckMs,
    intervalRandomized,
    successRecheckRandomized,
    status.currentClusterCount,
    status.latestClusterCount,
    status.todayResetAt,
    status.weekResetAt,
    status.monthResetAt,
    status.settingsDefaultsVersion
  );
}

function setClusterCounts(currentClusterCount = getStatus().currentClusterCount, latestClusterCount = getStatus().latestClusterCount) {
  const status = getStatus();
  setStatus(
    status.state,
    status.message,
    status.intervalMs,
    status.successRecheckMs,
    status.intervalRandomized,
    status.successRecheckRandomized,
    currentClusterCount,
    latestClusterCount,
    status.todayResetAt,
    status.weekResetAt,
    status.monthResetAt,
    status.settingsDefaultsVersion
  );
}

function resetCount(period) {
  const status = getStatus();
  const resetAt = nowIso();
  const next = {
    todayResetAt: status.todayResetAt,
    weekResetAt: status.weekResetAt,
    monthResetAt: status.monthResetAt,
  };

  if (period === "today") {
    next.todayResetAt = resetAt;
  } else if (period === "week") {
    next.weekResetAt = resetAt;
  } else if (period === "month") {
    next.monthResetAt = resetAt;
  } else {
    throw new Error("Unknown count reset period.");
  }

  setStatus(
    status.state,
    status.message,
    status.intervalMs,
    status.successRecheckMs,
    status.intervalRandomized,
    status.successRecheckRandomized,
    status.currentClusterCount,
    status.latestClusterCount,
    next.todayResetAt,
    next.weekResetAt,
    next.monthResetAt,
    status.settingsDefaultsVersion
  );
}

function enqueueCommand(
  command,
  intervalMs = null,
  successRecheckMs = null,
  intervalRandomized = null,
  successRecheckRandomized = null
) {
  statements.insertCommand.run({
    command,
    intervalMs,
    successRecheckMs,
    intervalRandomized,
    successRecheckRandomized,
    createdAt: nowIso(),
  });
}

function getPendingCommands() {
  return statements.pendingCommands.all();
}

function markCommandProcessed(id) {
  statements.markCommandProcessed.run(nowIso(), id);
}

function saveAcceptedTask(task) {
  const rawRow = task.rawRow || [
    task.taskType,
    task.title,
    task.channel,
    task.languages,
    task.dueDate,
    task.duration,
  ].filter(Boolean).join(" | ");

  statements.insertTask.run({
    taskKey: task.taskKey || null,
    taskType: task.taskType || null,
    title: task.title || null,
    channel: task.channel || null,
    languages: task.languages || null,
    dueDate: task.dueDate || null,
    duration: task.duration || null,
    acceptedAt: task.acceptedAt || nowIso(),
    rawRow,
  });
}

function getCounts() {
  const status = getStatus();
  return db.prepare(`
    SELECT
      SUM(CASE
        WHEN date(accepted_at, 'localtime') = date('now', 'localtime')
          AND (@todayResetAt IS NULL OR accepted_at >= @todayResetAt)
        THEN 1 ELSE 0
      END) AS today,
      SUM(CASE
        WHEN date(accepted_at, 'localtime') >= date('now', 'weekday 0', '-6 days', 'localtime')
          AND (@weekResetAt IS NULL OR accepted_at >= @weekResetAt)
        THEN 1 ELSE 0
      END) AS week,
      SUM(CASE
        WHEN strftime('%Y-%m', accepted_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime')
          AND (@monthResetAt IS NULL OR accepted_at >= @monthResetAt)
        THEN 1 ELSE 0
      END) AS month
    FROM accepted_tasks
  `).get({
    todayResetAt: isResetInCurrentDay(status.todayResetAt) ? status.todayResetAt : null,
    weekResetAt: isResetInCurrentWeek(status.weekResetAt) ? status.weekResetAt : null,
    monthResetAt: isResetInCurrentMonth(status.monthResetAt) ? status.monthResetAt : null,
  });
}

function listTasks({ search = "", from = "", to = "", limit = 500 } = {}) {
  const clauses = [];
  const params = {};

  if (search.trim()) {
    params.search = `%${search.trim()}%`;
    clauses.push(`(
      COALESCE(task_type, '') LIKE @search OR
      COALESCE(title, '') LIKE @search OR
      COALESCE(channel, '') LIKE @search OR
      COALESCE(languages, '') LIKE @search OR
      COALESCE(due_date, '') LIKE @search OR
      COALESCE(duration, '') LIKE @search
    )`);
  }

  if (from) {
    params.from = `${from}T00:00:00.000Z`;
    clauses.push("accepted_at >= @from");
  }

  if (to) {
    params.to = `${to}T23:59:59.999Z`;
    clauses.push("accepted_at <= @to");
  }

  params.limit = Math.max(1, Math.min(Number(limit) || 500, 2000));
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  return db.prepare(`
    SELECT
      id,
      task_type AS taskType,
      title,
      channel,
      languages,
      due_date AS dueDate,
      duration,
      accepted_at AS acceptedAt,
      raw_row AS rawRow
    FROM accepted_tasks
    ${where}
    ORDER BY accepted_at DESC
    LIMIT @limit
  `).all(params);
}

module.exports = {
  db,
  dataDir,
  nowIso,
  getStatus,
  setStatus,
  setTiming,
  setClusterCounts,
  resetCount,
  enqueueCommand,
  getPendingCommands,
  markCommandProcessed,
  saveAcceptedTask,
  getCounts,
  listTasks,
};

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function applySettingsDefaults() {
  const row = db.prepare("SELECT settings_defaults_version AS version FROM bot_status WHERE id = 1").get();
  if (!row || row.version >= 1) return;

  db.prepare(`
    UPDATE bot_status
    SET
      success_recheck_ms = ?,
      interval_randomized = 1,
      success_recheck_randomized = 1,
      settings_defaults_version = 1,
      updated_at = ?
    WHERE id = 1
  `).run(DEFAULT_SUCCESS_RECHECK_MS, nowIso());
}

function isResetInCurrentDay(value) {
  if (!value) return false;
  return db.prepare("SELECT date(@value, 'localtime') = date('now', 'localtime') AS active").get({ value }).active === 1;
}

function isResetInCurrentWeek(value) {
  if (!value) return false;
  return db.prepare(`
    SELECT date(@value, 'localtime') >= date('now', 'weekday 0', '-6 days', 'localtime') AS active
  `).get({ value }).active === 1;
}

function isResetInCurrentMonth(value) {
  if (!value) return false;
  return db.prepare(`
    SELECT strftime('%Y-%m', @value, 'localtime') = strftime('%Y-%m', 'now', 'localtime') AS active
  `).get({ value }).active === 1;
}
