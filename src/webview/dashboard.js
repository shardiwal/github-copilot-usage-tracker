/**
 * Dashboard JavaScript - Client-side logic
 */

let vscode;
let currentPage = 1;
const itemsPerPage = 20;
let allRecords = [];
let filteredRecords = [];

// Initialize VS Code API
try {
  vscode = acquireVsCodeApi();
} catch (_e) {
  // Running in browser, not in VS Code webview
  console.log("Not running in VS Code webview");
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  // Notify the extension that the webview is ready to receive messages.
  // This replaces the old "send immediately" approach which caused data loss
  // when messages arrived before the DOM was fully initialised.
  vscode?.postMessage({ command: "webviewReady" });
  setupEventListeners();
  updateLastUpdated();
});

function setupEventListeners() {
  document.getElementById("refreshBtn")?.addEventListener("click", refreshData);
  document.getElementById("filterSelect")?.addEventListener("change", refreshData);
  document.getElementById("searchInput")?.addEventListener("input", () => {
    currentPage = 1;
    applyFiltersAndPaginate();
  });
  document.getElementById("languageFilter")?.addEventListener("change", () => {
    currentPage = 1;
    applyFiltersAndPaginate();
  });

  document.getElementById("prevBtn")?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      updateHistoryTable();
    }
  });

  document.getElementById("nextBtn")?.addEventListener("click", () => {
    const maxPages = Math.ceil(filteredRecords.length / itemsPerPage);
    if (currentPage < maxPages) {
      currentPage++;
      updateHistoryTable();
    }
  });

  document.getElementById("exportCsvBtn")?.addEventListener("click", () => {
    vscode?.postMessage({ command: "exportCsv" });
  });

  document.getElementById("exportJsonBtn")?.addEventListener("click", () => {
    vscode?.postMessage({ command: "exportJson" });
  });

  document.getElementById("backupDbBtn")?.addEventListener("click", () => {
    vscode?.postMessage({ command: "backupDb" });
  });

  document.getElementById("clearHistoryBtn")?.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all history?")) {
      vscode?.postMessage({ command: "clearHistory" });
    }
  });
}

function refreshData() {
  const filterSelect = document.getElementById("filterSelect");
  const filter = filterSelect ? filterSelect.value : "today";
  vscode?.postMessage({ command: "getData", filter });
}

function updateLastUpdated() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const el = document.getElementById("lastUpdated");
  if (el) el.textContent = timeStr;
}

// Message handler from extension
window.addEventListener("message", (event) => {
  const message = event.data;

  switch (message.command) {
    case "updateDashboard":
      updateDashboard(message.data);
      break;
    case "dataRefreshed":
      allRecords = message.records || [];
      currentPage = 1;
      updateLanguageFilter(allRecords);
      applyFiltersAndPaginate();
      break;
  }
});

function updateDashboard(data) {
  if (!data) return;

  const todayStats = data.todayStats || {};
  const chartData = data.chartData || {};

  // Update stats cards
  setText("todayTokens", formatTokens(todayStats.totalTokens || 0));
  setText("todayTokensDetail", `${todayStats.inputTokens || 0} input, ${todayStats.outputTokens || 0} output`);
  setText("todayRequests", String(todayStats.requestCount || 0));
  setText("todayAvgTokens", `Avg: ${formatTokens(todayStats.averageTokens || 0)}`);
  setText("inputTokens", formatTokens(todayStats.inputTokens || 0));

  const inputPercentage =
    todayStats.totalTokens > 0
      ? ((todayStats.inputTokens / todayStats.totalTokens) * 100).toFixed(1)
      : "0";
  setText("inputTokensPercentage", `${inputPercentage}%`);

  // Update output tokens
  setText("outputTokens", formatTokens(todayStats.outputTokens || 0));
  const outputPercentage =
    todayStats.totalTokens > 0
      ? ((todayStats.outputTokens / todayStats.totalTokens) * 100).toFixed(1)
      : "0";
  setText("outputTokensPercentage", `${outputPercentage}%`);

  // Update today's estimated cost (server-computed from filtered records)
  setText("todayCost", formatCost(data.totalCost || 0));
  setText("todayCostDetail", "estimated (subscription)");

  // Update top lists
  updateTopList("topLanguages", chartData.byLanguage);
  updateTopList("topWorkspaces", chartData.byWorkspace);
  updateTopList("topFiles", chartData.byFile);

  updateLastUpdated();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function updateTopList(elementId, items) {
  const container = document.getElementById(elementId);
  if (!container) return;

  container.innerHTML = "";
  if (!items || items.length === 0) {
    container.innerHTML = '<div class="list-item"><span>No data yet</span></div>';
    return;
  }

  items.slice(0, 10).forEach((item) => {
    const key = item.language || item.workspace || item.file || "Unknown";
    const tokens = item.tokens || 0;

    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <div class="list-item-label" title="${key}">${key}</div>
      <div class="list-item-value" style="min-width: 60px; text-align: right;">${formatTokens(tokens)}</div>
    `;
    container.appendChild(div);
  });
}

function updateLanguageFilter(records) {
  const filterSelect = document.getElementById("languageFilter");
  if (!filterSelect) return;

  const languages = [...new Set(records.map((r) => r.language).filter(Boolean))];
  const currentValue = filterSelect.value;

  filterSelect.innerHTML = '<option value="">All Languages</option>';
  languages.sort().forEach((lang) => {
    const option = document.createElement("option");
    option.value = lang;
    option.textContent = lang;
    filterSelect.appendChild(option);
  });

  filterSelect.value = currentValue;
}

function applyFiltersAndPaginate() {
  const searchInput = document.getElementById("searchInput");
  const languageFilterEl = document.getElementById("languageFilter");
  const searchText = searchInput ? searchInput.value.toLowerCase() : "";
  const languageFilter = languageFilterEl ? languageFilterEl.value : "";

  filteredRecords = allRecords.filter((record) => {
    let matches = true;

    if (searchText) {
      matches =
        matches &&
        (record.prompt?.toLowerCase().includes(searchText) ||
          record.response?.toLowerCase().includes(searchText) ||
          record.file?.toLowerCase().includes(searchText));
    }

    if (languageFilter) {
      matches = matches && record.language === languageFilter;
    }

    return matches;
  });

  updateHistoryTable();
}

function updateHistoryTable() {
  const tbody = document.getElementById("historyBody");
  if (!tbody) return;

  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const pageRecords = filteredRecords.slice(startIdx, endIdx);

  tbody.innerHTML = "";

  if (pageRecords.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="loading">No records found</td></tr>';
  } else {
    pageRecords.forEach((record) => {
      const row = document.createElement("tr");
      const timestamp = new Date(record.timestamp).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      // Truncate prompt to 60 chars for display; show full text in title
      const promptText = record.prompt || "-";
      const promptDisplay = promptText.length > 60 ? promptText.slice(0, 60) + "…" : promptText;

      row.innerHTML = `
        <td>${timestamp}</td>
        <td>${record.model || "-"}</td>
        <td>${record.language || "-"}</td>
        <td title="${escapeHtml(promptText)}" style="max-width:200px;overflow:hidden;white-space:nowrap;">${escapeHtml(promptDisplay)}</td>
        <td>${formatTokens(record.inputTokens || 0)}</td>
        <td>${formatTokens(record.outputTokens || 0)}</td>
        <td style="font-weight: 600; color: #0ea5e9;">${formatTokens(record.totalTokens || 0)}</td>
        <td style="color: #22c55e;">${formatCost(record.cost || 0)}</td>
        <td>${record.duration ? formatDuration(record.duration) : "-"}</td>
      `;
      tbody.appendChild(row);
    });
  }

  // Update pagination
  const maxPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const pageInfo = document.getElementById("pageInfo");

  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= maxPages;
  if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${maxPages || 1}`;
}

function formatTokens(tokens) {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(2)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(2)}K`;
  }
  return String(tokens);
}

function formatDuration(ms) {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatCost(cost) {
  if (!cost || cost === 0) return "$0.00";
  if (cost < 0.000001) return `$${cost.toExponential(2)}`;
  if (cost < 0.01)     return `$${cost.toFixed(6)}`;
  if (cost < 1)        return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}