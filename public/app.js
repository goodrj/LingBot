const statusBadge = document.querySelector("#statusBadge");
const statusMessage = document.querySelector("#statusMessage");
const intervalInput = document.querySelector("#intervalInput");
const successRecheckInput = document.querySelector("#successRecheckInput");
const todayCount = document.querySelector("#todayCount");
const weekCount = document.querySelector("#weekCount");
const monthCount = document.querySelector("#monthCount");
const tasksBody = document.querySelector("#tasksBody");
const searchInput = document.querySelector("#searchInput");
const fromInput = document.querySelector("#fromInput");
const toInput = document.querySelector("#toInput");

const commandButtons = {
  start: document.querySelector("#startBtn"),
  stop: document.querySelector("#stopBtn"),
  restart: document.querySelector("#restartBtn"),
};

async function api(path, options) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || response.statusText);
  }
  return response.json();
}

async function sendCommand(command) {
  const intervalMs = Math.max(1, Number(intervalInput.value) || 5) * 1000;
  const successRecheckMs = Math.max(0.1, Number(successRecheckInput.value) || 1) * 1000;
  await api("/api/commands", {
    method: "POST",
    body: JSON.stringify({ command, intervalMs, successRecheckMs }),
  });
  await refresh();
}

function renderStatus(status) {
  statusBadge.className = `badge ${status.state}`;
  statusBadge.textContent = status.state;
  intervalInput.value = Math.max(1, Math.round(status.intervalMs / 1000));
  successRecheckInput.value = formatSeconds(status.successRecheckMs || 1000);

  const updated = new Date(status.updatedAt).toLocaleString();
  statusMessage.textContent = status.message
    ? `${status.message} Last update: ${updated}`
    : `Last update: ${updated}`;
}

function renderCounts(counts) {
  todayCount.textContent = counts.today;
  weekCount.textContent = counts.week;
  monthCount.textContent = counts.month;
}

function renderTasks(tasks) {
  if (!tasks.length) {
    tasksBody.innerHTML = `<tr><td colspan="7" class="empty">No accepted tasks found.</td></tr>`;
    return;
  }

  tasksBody.innerHTML = tasks.map((task) => `
    <tr>
      <td>${escapeHtml(new Date(task.acceptedAt).toLocaleString())}</td>
      <td>${escapeHtml(task.taskType || "")}</td>
      <td>${escapeHtml(task.title || "")}</td>
      <td>${escapeHtml(task.channel || "")}</td>
      <td>${escapeHtml(task.languages || "")}</td>
      <td>${escapeHtml(task.dueDate || "")}</td>
      <td>${escapeHtml(task.duration || "")}</td>
    </tr>
  `).join("");
}

async function refresh() {
  const params = new URLSearchParams({
    search: searchInput.value,
    from: fromInput.value,
    to: toInput.value,
  });

  const [status, counts, tasks] = await Promise.all([
    api("/api/status"),
    api("/api/counts"),
    api(`/api/tasks?${params}`),
  ]);

  renderStatus(status);
  renderCounts(counts);
  renderTasks(tasks);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

commandButtons.start.addEventListener("click", () => sendCommand("start"));
commandButtons.stop.addEventListener("click", () => sendCommand("stop"));
commandButtons.restart.addEventListener("click", () => sendCommand("restart"));
document.querySelector("#clearFiltersBtn").addEventListener("click", () => {
  searchInput.value = "";
  fromInput.value = "";
  toInput.value = "";
  refresh();
});

for (const input of [searchInput, fromInput, toInput]) {
  input.addEventListener("input", debounce(refresh, 250));
}

intervalInput.addEventListener("change", () => sendCommand("setInterval"));
successRecheckInput.addEventListener("change", () => sendCommand("setSuccessRecheck"));

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function formatSeconds(milliseconds) {
  const seconds = milliseconds / 1000;
  return Number.isInteger(seconds) ? String(seconds) : seconds.toFixed(1);
}

refresh().catch((error) => {
  statusMessage.textContent = error.message;
});
setInterval(() => refresh().catch(() => {}), 2000);
