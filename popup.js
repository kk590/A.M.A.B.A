/**
 * AMABA Popup Script
 * Connects directly to the FastAPI backend and renders live data.
 *
 * Backend: https://amaba-backend.onrender.com
 */

const API = 'https://amaba-backend.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
  // -----------------------------------------------------------------------
  // DOM
  // -----------------------------------------------------------------------
  const badge       = document.getElementById('badge');
  const badgeDot    = document.getElementById('badge-dot');
  const badgeText   = document.getElementById('badge-text');
  const mAgents     = document.getElementById('m-agents');
  const mTasks      = document.getElementById('m-tasks');
  const mLatency    = document.getElementById('m-latency');
  const mReliability= document.getElementById('m-reliability');
  const agentsList  = document.getElementById('agents-list');
  const logsBody    = document.getElementById('logs-body');
  const logsCount   = document.getElementById('logs-count');
  const inputField  = document.getElementById('input-field');
  const startBtn    = document.getElementById('start-btn');
  const pauseBtn    = document.getElementById('pause-btn');
  const abortBtn    = document.getElementById('abort-btn');
  const refreshBtn  = document.getElementById('refresh-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const connStatus  = document.getElementById('conn-status');
  const connText    = document.getElementById('conn-text');
  const chips       = document.querySelectorAll('.chip');

  let pollTimer = null;

  // -----------------------------------------------------------------------
  // Fetch helpers (direct fetch, no background.js dependency)
  // -----------------------------------------------------------------------
  async function apiGet(endpoint) {
    const res = await fetch(`${API}${endpoint}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function apiPost(endpoint, body) {
    const res = await fetch(`${API}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  // -----------------------------------------------------------------------
  // Set connection status
  // -----------------------------------------------------------------------
  function setConnected(online) {
    if (online) {
      connStatus.className = 'footer-status ok';
      connStatus.querySelector('.material-icons').textContent = 'cloud_done';
      connText.textContent = 'Backend online';
      badge.className = 'badge ready';
      badgeDot.className = 'dot pulse';
      badgeText.textContent = 'READY';
    } else {
      connStatus.className = 'footer-status err';
      connStatus.querySelector('.material-icons').textContent = 'cloud_off';
      connText.textContent = 'Backend offline';
      badge.className = 'badge off';
      badgeDot.className = 'dot';
      badgeText.textContent = 'OFFLINE';
    }
  }

  // -----------------------------------------------------------------------
  // Fetch & render: Health
  // -----------------------------------------------------------------------
  async function fetchHealth() {
    try {
      const data = await apiGet('/health');
      setConnected(true);
      return data;
    } catch {
      setConnected(false);
      return null;
    }
  }

  // -----------------------------------------------------------------------
  // Fetch & render: Metrics
  // -----------------------------------------------------------------------
  async function fetchMetrics() {
    try {
      const status = await apiGet('/api/status');
      // status = { status, uptime, agents_active, tasks_running, orchestration_ready, metrics: {...} }
      mAgents.textContent = status.agents_active ?? '—';
      mTasks.textContent  = status.metrics?.tasks_completed ?? '—';
      mLatency.textContent = status.metrics?.latency ? `${status.metrics.latency}ms` : '—';
      mReliability.textContent = status.metrics?.reliability ? `${status.metrics.reliability}%` : '—';

      // Update badge if orchestration is active
      if (status.tasks_running > 0) {
        badge.className = 'badge active';
        badgeText.textContent = 'ACTIVE';
      }
    } catch {
      mAgents.textContent = '—';
      mTasks.textContent = '—';
      mLatency.textContent = '—';
      mReliability.textContent = '—';
    }
  }

  // -----------------------------------------------------------------------
  // Fetch & render: Agents
  // -----------------------------------------------------------------------
  async function fetchAgents() {
    try {
      const data = await apiGet('/api/agents');
      // data = { agents: [ { id, name, status, progress, last_updated, type }, ... ] }
      const agents = data.agents || [];

      if (agents.length === 0) {
        agentsList.innerHTML = '<div class="logs-empty">No agents registered</div>';
        return;
      }

      agentsList.innerHTML = '';
      agents.forEach((agent) => {
        const s = (agent.status || 'idle').toLowerCase();
        const dotClass = s === 'active' ? 'active' : s === 'running' ? 'running' : 'idle';
        const tagClass = dotClass;

        const row = document.createElement('div');
        row.className = 'agent-row';
        row.innerHTML = `
          <div class="agent-dot ${dotClass}"></div>
          <div class="agent-info">
            <div class="agent-name">${agent.name || agent.id}</div>
            <div class="agent-type">${agent.type || agent.id}</div>
          </div>
          <span class="agent-status-tag ${tagClass}">${s.toUpperCase()}</span>
        `;
        agentsList.appendChild(row);
      });
    } catch (err) {
      agentsList.innerHTML = `<div class="logs-empty" style="color:var(--error)">Failed to load agents: ${err.message}</div>`;
    }
  }

  // -----------------------------------------------------------------------
  // Fetch & render: Logs
  // -----------------------------------------------------------------------
  async function fetchLogs() {
    try {
      const data = await apiGet('/api/logs?limit=20');
      // data = { logs: [ { timestamp, message, level }, ... ], total }
      const logs = data.logs || [];
      logsCount.textContent = `${data.total || logs.length} entries`;

      if (logs.length === 0) {
        logsBody.innerHTML = '<div class="logs-empty">No logs yet</div>';
        return;
      }

      logsBody.innerHTML = '';
      logs.forEach((log, i) => {
        const level = (log.level || 'info').toLowerCase();
        const dotClass = level === 'error' ? 'error' : level === 'warning' ? 'warning' : level === 'success' ? 'success' : 'info';

        const line = document.createElement('div');
        line.className = 'log-line';
        line.style.animationDelay = `${i * 0.05}s`;
        line.innerHTML = `
          <span class="log-ts">${log.timestamp || '--:--'}</span>
          <span class="log-dot ${dotClass}"></span>
          <span class="log-msg">${log.message || ''}</span>
        `;
        logsBody.appendChild(line);
      });
      logsBody.scrollTop = logsBody.scrollHeight;
    } catch (err) {
      logsBody.innerHTML = `<div class="logs-empty" style="color:var(--error)">Failed: ${err.message}</div>`;
    }
  }

  // -----------------------------------------------------------------------
  // Refresh all data
  // -----------------------------------------------------------------------
  async function refreshAll() {
    // Spin the refresh icon
    const icon = refreshBtn.querySelector('.material-icons');
    icon.classList.add('spinning');

    await fetchHealth();
    await Promise.all([fetchMetrics(), fetchAgents(), fetchLogs()]);

    setTimeout(() => icon.classList.remove('spinning'), 500);
  }

  // -----------------------------------------------------------------------
  // Start polling
  // -----------------------------------------------------------------------
  function startPolling() {
    stopPolling();
    pollTimer = setInterval(refreshAll, 10000); // every 10s
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  // -----------------------------------------------------------------------
  // Start Automation
  // -----------------------------------------------------------------------
  async function startAutomation(description) {
    if (!description.trim()) return;

    startBtn.disabled = true;
    startBtn.innerHTML = '<span class="material-icons spinning">sync</span> Starting...';

    try {
      const result = await apiPost('/api/orchestrator/run', {
        task_description: description.trim(),
      });

      // Add local log entry
      appendLocalLog('success', `Task submitted: "${description.trim()}"`);
      if (result.task_id) {
        appendLocalLog('info', `Task ID: ${result.task_id}`);
      }

      badge.className = 'badge active';
      badgeText.textContent = 'ACTIVE';

      // Refresh to show updated agents/logs
      await refreshAll();
    } catch (err) {
      appendLocalLog('error', `Failed to start: ${err.message}`);
    }

    startBtn.disabled = false;
    startBtn.innerHTML = '<span class="material-icons">play_arrow</span> Start Automation';
  }

  function appendLocalLog(level, message) {
    const dotClass = level === 'error' ? 'error' : level === 'success' ? 'success' : 'info';
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Remove "empty" placeholder
    const empty = logsBody.querySelector('.logs-empty');
    if (empty) empty.remove();

    const line = document.createElement('div');
    line.className = 'log-line';
    line.innerHTML = `
      <span class="log-ts">${now}</span>
      <span class="log-dot ${dotClass}"></span>
      <span class="log-msg">${message}</span>
    `;
    logsBody.appendChild(line);
    logsBody.scrollTop = logsBody.scrollHeight;
  }

  // -----------------------------------------------------------------------
  // Pause / Abort
  // -----------------------------------------------------------------------
  pauseBtn.addEventListener('click', async () => {
    try {
      const data = await apiGet('/api/agents');
      const agents = data.agents || [];
      for (const agent of agents) {
        if (agent.status === 'active' || agent.status === 'running') {
          await apiPost(`/api/agents/${agent.id}/stop`);
        }
      }
      appendLocalLog('info', 'Agents paused');
      await refreshAll();
    } catch (err) {
      appendLocalLog('error', `Pause failed: ${err.message}`);
    }
  });

  abortBtn.addEventListener('click', async () => {
    try {
      const data = await apiGet('/api/agents');
      const agents = data.agents || [];
      for (const agent of agents) {
        await apiPost(`/api/agents/${agent.id}/stop`);
      }
      appendLocalLog('error', 'All tasks aborted');
      badge.className = 'badge ready';
      badgeText.textContent = 'READY';
      await refreshAll();
    } catch (err) {
      appendLocalLog('error', `Abort failed: ${err.message}`);
    }
  });

  // -----------------------------------------------------------------------
  // Event listeners
  // -----------------------------------------------------------------------
  startBtn.addEventListener('click', () => startAutomation(inputField.value));

  inputField.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') startAutomation(inputField.value);
  });

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const text = chip.dataset.text || chip.textContent.trim();
      inputField.value = text;
      startAutomation(text);
    });
  });

  refreshBtn.addEventListener('click', () => refreshAll());

  settingsBtn.addEventListener('click', () => {
    if (chrome?.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    }
  });

  // -----------------------------------------------------------------------
  // Init: fetch everything immediately
  // -----------------------------------------------------------------------
  refreshAll();
  startPolling();
});
