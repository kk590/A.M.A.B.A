/**
 * AMABA API Service
 * Centralized connection layer to the FastAPI backend at:
 * https://amaba-backend.onrender.com
 *
 * Every public function returns a Promise resolving to the parsed JSON
 * response, or throws an AmabaApiError on failure.
 */

const API_BASE_URL = 'https://amaba-backend.onrender.com';

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------
class AmabaApiError extends Error {
  constructor(message, status, endpoint) {
    super(message);
    this.name = 'AmabaApiError';
    this.status = status;
    this.endpoint = endpoint;
  }
}

// ---------------------------------------------------------------------------
// Internal fetch wrapper
// ---------------------------------------------------------------------------
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaults = {
    headers: { 'Content-Type': 'application/json' },
  };
  const config = { ...defaults, ...options };

  try {
    const res = await fetch(url, config);
    if (!res.ok) {
      let detail = '';
      try {
        const body = await res.json();
        detail = body.detail || JSON.stringify(body);
      } catch {
        detail = res.statusText;
      }
      throw new AmabaApiError(
        `API ${res.status}: ${detail}`,
        res.status,
        endpoint
      );
    }
    return await res.json();
  } catch (err) {
    if (err instanceof AmabaApiError) throw err;
    throw new AmabaApiError(
      `Network error: ${err.message}`,
      0,
      endpoint
    );
  }
}

// ---------------------------------------------------------------------------
// Health & Status
// ---------------------------------------------------------------------------
/** @returns {{ status: string }} */
async function healthCheck() {
  return request('/health');
}

/** @returns System-wide status object */
async function getSystemStatus() {
  return request('/api/status');
}

/** @returns System metrics */
async function getMetrics() {
  return request('/api/metrics');
}

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------
/** @returns Array of agent objects */
async function getAgents() {
  return request('/api/agents');
}

/** @param {string} agentId */
async function getAgent(agentId) {
  return request(`/api/agents/${encodeURIComponent(agentId)}`);
}

/** @param {string} agentId */
async function startAgent(agentId) {
  return request(`/api/agents/${encodeURIComponent(agentId)}/start`, {
    method: 'POST',
  });
}

/** @param {string} agentId */
async function stopAgent(agentId) {
  return request(`/api/agents/${encodeURIComponent(agentId)}/stop`, {
    method: 'POST',
  });
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------
/** @returns Orchestrator status object */
async function getOrchestratorStatus() {
  return request('/api/orchestrator/status');
}

/**
 * Run a new orchestration task through the CEO agent.
 * @param {string} taskDescription
 * @param {string} [taskId] optional task ID
 */
async function runOrchestration(taskDescription, taskId) {
  const body = { task_description: taskDescription };
  if (taskId) body.task_id = taskId;
  return request('/api/orchestrator/run', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * @param {number} [limit=10]
 */
async function getOrchestratorHistory(limit = 10) {
  return request(`/api/orchestrator/history?limit=${limit}`);
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------
/**
 * Create and execute a new task.
 * @param {{ task_name: string, task_type: string, url?: string, parameters?: object }} taskData
 */
async function createTask(taskData) {
  return request('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(taskData),
  });
}

/** @param {string} taskId */
async function getTask(taskId) {
  return request(`/api/tasks/${encodeURIComponent(taskId)}`);
}

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------
/**
 * @param {number} [limit=50]
 */
async function getLogs(limit = 50) {
  return request(`/api/logs?limit=${limit}`);
}

/**
 * @param {{ timestamp: string, level: string, message: string, agent_id?: string }} logEntry
 */
async function addLog(logEntry) {
  return request('/api/logs', {
    method: 'POST',
    body: JSON.stringify(logEntry),
  });
}

// ---------------------------------------------------------------------------
// Browser control
// ---------------------------------------------------------------------------
/** @param {string} url */
async function browserNavigate(url) {
  return request(`/api/browser/navigate?url=${encodeURIComponent(url)}`, {
    method: 'POST',
  });
}

/** @param {string} selector CSS selector */
async function browserScrape(selector) {
  return request(`/api/browser/scrape?selector=${encodeURIComponent(selector)}`, {
    method: 'POST',
  });
}

/** @param {string} selector CSS selector */
async function browserClick(selector) {
  return request(`/api/browser/click?selector=${encodeURIComponent(selector)}`, {
    method: 'POST',
  });
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------
async function getDatabaseStatus() {
  return request('/api/database/status');
}

// ---------------------------------------------------------------------------
// Export (works as a module or global)
// ---------------------------------------------------------------------------
if (typeof globalThis !== 'undefined') {
  globalThis.AmabaAPI = {
    API_BASE_URL,
    AmabaApiError,
    healthCheck,
    getSystemStatus,
    getMetrics,
    getAgents,
    getAgent,
    startAgent,
    stopAgent,
    getOrchestratorStatus,
    runOrchestration,
    getOrchestratorHistory,
    createTask,
    getTask,
    getLogs,
    addLog,
    browserNavigate,
    browserScrape,
    browserClick,
    getDatabaseStatus,
  };
}
