const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "linguana-bot.sqlite"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS bot_status (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    state TEXT NOT NULL,
    message TEXT,
    interval_ms INTEGER NOT NULL,
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
    created_at TEXT NOT NULL,
    processed_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_accepted_at ON accepted_tasks(accepted_at);
  CREATE INDEX IF NOT EXISTS idx_tasks_search ON accepted_tasks(title, task_type, channel, languages);
  CREATE INDEX IF NOT EXISTS idx_commands_pending ON commands(processed_at, id);
`);

const nowIso = () => new Date().toISOString();

db.prepare(`
  INSERT INTO bot_status (id, state, message, interval_ms, updated_at)
  VALUES (1, 'stopped', NULL, 5000, ?)
  ON CONFLICT(id) DO NOTHING
`).run(nowIso());

const statements = {
  status: db.prepare("SELECT state, message, interval_ms AS intervalMs, updated_at AS updatedAt FROM bot_status WHERE id = 1"),
  updateStatus: db.prepare(`
    UPDATE bot_status
    SET state = @state, message = @message, interval_ms = @intervalMs, updated_at = @updatedAt
    WHERE id = 1
  `),
  insertCommand: db.prepare(`
    INSERT INTO commands (command, interval_ms, created_at)
    VALUES (@command, @intervalMs, @createdAt)
  `),
  pendingCommands: db.prepare(`
    SELECT id, command, interval_ms AS intervalMs, created_at AS createdAt
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

function setStatus(state, message = null, intervalMs = getStatus().intervalMs) {
  statements.updateStatus.run({
    state,
    message,
    intervalMs,
    updatedAt: nowIso(),
  });
}

function enqueueCommand(command, intervalMs = null) {
  statements.insertCommand.run({ command, intervalMs, createdAt: nowIso() });
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
  return db.prepare(`
    SELECT
      SUM(CASE WHEN date(accepted_at, 'localtime') = date('now', 'localtime') THEN 1 ELSE 0 END) AS today,
      SUM(CASE WHEN date(accepted_at, 'localtime') >= date('now', 'weekday 0', '-6 days', 'localtime') THEN 1 ELSE 0 END) AS week,
      SUM(CASE WHEN strftime('%Y-%m', accepted_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime') THEN 1 ELSE 0 END) AS month
    FROM accepted_tasks
  `).get();
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
  enqueueCommand,
  getPendingCommands,
  markCommandProcessed,
  saveAcceptedTask,
  getCounts,
  listTasks,
};
