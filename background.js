/**
 * AMABA Background Service Worker
 * Handles periodic polling of backend status, badge updates,
 * and message routing between popup ↔ content scripts ↔ backend.
 */

const API_BASE = 'https://amaba-backend.onrender.com';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let backendOnline = false;
let pollingInterval = null;
const POLL_INTERVAL_MS = 15000; // 15 seconds

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function apiGet(endpoint) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[AMABA BG] GET ${endpoint} failed:`, err.message);
    return null;
  }
}

async function apiPost(endpoint, body = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[AMABA BG] POST ${endpoint} failed:`, err.message);
    return null;
  }
}

function setBadge(text, color) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

// ---------------------------------------------------------------------------
// Health polling
// ---------------------------------------------------------------------------
async function pollHealth() {
  const data = await apiGet('/health');
  const wasOnline = backendOnline;
  backendOnline = !!data;

  if (backendOnline) {
    setBadge('ON', '#11ffa0');
  } else {
    setBadge('OFF', '#ff4444');
  }

  // Notify popup if state changed
  if (wasOnline !== backendOnline) {
    try {
      await chrome.runtime.sendMessage({
        type: 'BACKEND_STATUS',
        online: backendOnline,
      });
    } catch {
      // popup not open, ignore
    }
  }
}

function startPolling() {
  if (pollingInterval) return;
  pollHealth(); // immediate first check
  pollingInterval = setInterval(pollHealth, POLL_INTERVAL_MS);
  console.log('[AMABA BG] Polling started');
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('[AMABA BG] Polling stopped');
  }
}

// ---------------------------------------------------------------------------
// Message handler (popup, content script, options page)
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        // ------ Health & Status ------------------------------------------
        case 'GET_HEALTH': {
          const data = await apiGet('/health');
          sendResponse({ success: !!data, data });
          break;
        }
        case 'GET_STATUS': {
          const data = await apiGet('/api/status');
          sendResponse({ success: !!data, data });
          break;
        }
        case 'GET_METRICS': {
          const data = await apiGet('/api/metrics');
          sendResponse({ success: !!data, data });
          break;
        }

        // ------ Agents ---------------------------------------------------
        case 'GET_AGENTS': {
          const data = await apiGet('/api/agents');
          sendResponse({ success: !!data, data });
          break;
        }
        case 'GET_AGENT': {
          const data = await apiGet(`/api/agents/${encodeURIComponent(message.agentId)}`);
          sendResponse({ success: !!data, data });
          break;
        }
        case 'START_AGENT': {
          const data = await apiPost(`/api/agents/${encodeURIComponent(message.agentId)}/start`);
          sendResponse({ success: !!data, data });
          break;
        }
        case 'STOP_AGENT': {
          const data = await apiPost(`/api/agents/${encodeURIComponent(message.agentId)}/stop`);
          sendResponse({ success: !!data, data });
          break;
        }

        // ------ Orchestrator ---------------------------------------------
        case 'GET_ORCHESTRATOR_STATUS': {
          const data = await apiGet('/api/orchestrator/status');
          sendResponse({ success: !!data, data });
          break;
        }
        case 'RUN_ORCHESTRATION': {
          const body = { task_description: message.taskDescription };
          if (message.taskId) body.task_id = message.taskId;
          const data = await apiPost('/api/orchestrator/run', body);
          sendResponse({ success: !!data, data });
          break;
        }
        case 'GET_ORCHESTRATOR_HISTORY': {
          const limit = message.limit || 10;
          const data = await apiGet(`/api/orchestrator/history?limit=${limit}`);
          sendResponse({ success: !!data, data });
          break;
        }

        // ------ Tasks ----------------------------------------------------
        case 'CREATE_TASK': {
          const data = await apiPost('/api/tasks', message.taskData);
          sendResponse({ success: !!data, data });
          break;
        }
        case 'GET_TASK': {
          const data = await apiGet(`/api/tasks/${encodeURIComponent(message.taskId)}`);
          sendResponse({ success: !!data, data });
          break;
        }

        // ------ Logs -----------------------------------------------------
        case 'GET_LOGS': {
          const limit = message.limit || 50;
          const data = await apiGet(`/api/logs?limit=${limit}`);
          sendResponse({ success: !!data, data });
          break;
        }
        case 'ADD_LOG': {
          const data = await apiPost('/api/logs', message.logEntry);
          sendResponse({ success: !!data, data });
          break;
        }

        // ------ Browser actions ------------------------------------------
        case 'BROWSER_NAVIGATE': {
          const data = await apiPost(`/api/browser/navigate?url=${encodeURIComponent(message.url)}`);
          sendResponse({ success: !!data, data });
          break;
        }
        case 'BROWSER_SCRAPE': {
          const data = await apiPost(`/api/browser/scrape?selector=${encodeURIComponent(message.selector)}`);
          sendResponse({ success: !!data, data });
          break;
        }
        case 'BROWSER_CLICK': {
          const data = await apiPost(`/api/browser/click?selector=${encodeURIComponent(message.selector)}`);
          sendResponse({ success: !!data, data });
          break;
        }

        // ------ Database -------------------------------------------------
        case 'GET_DATABASE_STATUS': {
          const data = await apiGet('/api/database/status');
          sendResponse({ success: !!data, data });
          break;
        }

        // ------ Polling control ------------------------------------------
        case 'START_POLLING': {
          startPolling();
          sendResponse({ success: true });
          break;
        }
        case 'STOP_POLLING': {
          stopPolling();
          sendResponse({ success: true });
          break;
        }

        default:
          sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
      }
    } catch (err) {
      console.error('[AMABA BG] Message handler error:', err);
      sendResponse({ success: false, error: err.message });
    }
  })();
  return true; // Keep message channel open for async sendResponse
});

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
chrome.runtime.onInstalled.addListener(() => {
  console.log('[AMABA] Extension installed / updated');
  startPolling();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[AMABA] Browser started');
  startPolling();
});

// Start polling immediately on service-worker load
startPolling();
