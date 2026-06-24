/**
 * AMABA Popup Script
 * Connects the popup UI to the backend via background.js messaging.
 *
 * Views:
 *   #ready-view   — idle state (input + suggestions)
 *   #active-view  — running state (workflow + logs + controls)
 */

document.addEventListener('DOMContentLoaded', () => {
  // -----------------------------------------------------------------------
  // DOM refs
  // -----------------------------------------------------------------------
  const readyView       = document.getElementById('ready-view');
  const activeView      = document.getElementById('active-view');
  const statusBadge     = document.getElementById('status-badge');
  const statusDot       = document.getElementById('status-dot');
  const statusText      = document.getElementById('status-text');
  const inputField      = document.getElementById('input-field');
  const startBtn        = document.getElementById('start-btn');
  const pauseBtn        = document.getElementById('pause-btn');
  const abortBtn        = document.getElementById('abort-btn');
  const logsContainer   = document.getElementById('logsContainer');
  const workflowList    = document.getElementById('workflow-list');
  const settingsBtn     = document.getElementById('settings-btn');
  const suggestionCards = document.querySelectorAll('.suggestion-card');

  let currentTaskId     = null;
  let logPollTimer      = null;
  let workflowPollTimer = null;

  // -----------------------------------------------------------------------
  // Messaging helper
  // -----------------------------------------------------------------------
  function sendMsg(msg) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(msg, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response || { success: false, error: 'No response' });
        }
      });
    });
  }

  // -----------------------------------------------------------------------
  // View toggling
  // -----------------------------------------------------------------------
  function showReadyView() {
    readyView.classList.remove('hidden');
    activeView.classList.add('hidden');
    setStatus('ready');
    stopLivePolling();
  }

  function showActiveView() {
    readyView.classList.add('hidden');
    activeView.classList.remove('hidden');
    setStatus('active');
    startLivePolling();
  }

  function setStatus(state) {
    if (state === 'active') {
      statusBadge.className = 'status-badge active';
      statusDot.className = 'status-dot active';
      statusText.textContent = 'ACTIVE';
    } else if (state === 'error') {
      statusBadge.className = 'status-badge error';
      statusDot.className = 'status-dot';
      statusText.textContent = 'OFFLINE';
    } else {
      statusBadge.className = 'status-badge';
      statusDot.className = 'status-dot active';
      statusText.textContent = 'READY';
    }
  }

  // -----------------------------------------------------------------------
  // Backend connectivity check
  // -----------------------------------------------------------------------
  async function checkBackend() {
    const res = await sendMsg({ type: 'GET_HEALTH' });
    if (!res.success) {
      setStatus('error');
      updateStatusMessage('Backend offline', 'error');
    } else {
      setStatus('ready');
      updateStatusMessage('Agent ready to work', 'ok');
    }
    return res.success;
  }

  // -----------------------------------------------------------------------
  // Start Automation
  // -----------------------------------------------------------------------
  async function startAutomation(description) {
    if (!description.trim()) return;

    // Disable button, show loading
    startBtn.disabled = true;
    startBtn.innerHTML = `
      <span class="material-icons spinning">sync</span>
      Starting...
    `;
    updateStatusMessage('Connecting to orchestrator...', 'ok');

    const res = await sendMsg({
      type: 'RUN_ORCHESTRATION',
      taskDescription: description.trim(),
    });

    if (res.success && res.data) {
      currentTaskId = res.data.task_id || null;
      showActiveView();
      addLogEntry('info', `Task submitted: "${description.trim()}"`);
      addLogEntry('success', 'CEO agent orchestrating...');
      updateStatusMessage('CEO Orchestrating • Active', 'ok');

      // Fetch initial agents & populate workflow
      await refreshWorkflow();
    } else {
      addLogEntry('error', `Failed: ${res.error || 'Unknown error'}`);
      updateStatusMessage('Failed to start task', 'error');
    }

    // Re-enable
    startBtn.disabled = false;
    startBtn.innerHTML = `
      <span class="material-icons">auto_awesome</span>
      Start Automation
    `;
  }

  // -----------------------------------------------------------------------
  // Pause & Abort
  // -----------------------------------------------------------------------
  pauseBtn?.addEventListener('click', async () => {
    addLogEntry('info', 'Pausing agents...');
    // Stop all active agents
    const res = await sendMsg({ type: 'GET_AGENTS' });
    if (res.success && res.data) {
      const agents = res.data.agents || res.data || [];
      if (Array.isArray(agents)) {
        for (const agent of agents) {
          if (agent.status === 'running' || agent.status === 'active') {
            await sendMsg({ type: 'STOP_AGENT', agentId: agent.id || agent.agent_id });
          }
        }
      }
    }
    addLogEntry('success', 'Agents paused');
    setStatus('ready');
    updateStatusMessage('Automation paused', 'ok');
  });

  abortBtn?.addEventListener('click', async () => {
    addLogEntry('error', 'Aborting all tasks...');
    const res = await sendMsg({ type: 'GET_AGENTS' });
    if (res.success && res.data) {
      const agents = res.data.agents || res.data || [];
      if (Array.isArray(agents)) {
        for (const agent of agents) {
          await sendMsg({ type: 'STOP_AGENT', agentId: agent.id || agent.agent_id });
        }
      }
    }
    addLogEntry('info', 'All tasks aborted');
    currentTaskId = null;
    stopLivePolling();
    showReadyView();
    updateStatusMessage('Agent ready to work', 'ok');
  });

  // -----------------------------------------------------------------------
  // Workflow rendering
  // -----------------------------------------------------------------------
  async function refreshWorkflow() {
    const res = await sendMsg({ type: 'GET_AGENTS' });
    if (!res.success || !res.data) return;

    // Backend returns { agents: [...] }, unwrap it
    const agents = res.data.agents || res.data || [];
    if (!Array.isArray(agents) || agents.length === 0) return;

    workflowList.innerHTML = '';
    agents.forEach((agent) => {
      const status = (agent.status || 'idle').toLowerCase();
      let statusClass, iconName, tagText;

      if (status === 'completed' || status === 'done') {
        statusClass = 'completed';
        iconName = 'check_circle';
        tagText = 'DONE';
      } else if (status === 'running' || status === 'active') {
        statusClass = 'active';
        iconName = 'radio_button_checked';
        tagText = 'ACTIVE';
      } else {
        statusClass = 'pending';
        iconName = 'radio_button_unchecked';
        tagText = 'PENDING';
      }

      const item = document.createElement('div');
      item.className = 'workflow-item';
      item.innerHTML = `
        <div class="workflow-status ${statusClass}">
          <span class="material-icons">${iconName}</span>
        </div>
        <div class="workflow-info">
          <div class="workflow-name">
            ${agent.name || agent.agent_id || 'Agent'}
            <span class="workflow-tag ${statusClass}">${tagText}</span>
          </div>
          <div class="workflow-action">${agent.current_action || agent.description || 'Waiting...'}</div>
        </div>
      `;
      workflowList.appendChild(item);
    });
  }

  // -----------------------------------------------------------------------
  // Live logs
  // -----------------------------------------------------------------------
  async function fetchLogs() {
    const res = await sendMsg({ type: 'GET_LOGS', limit: 20 });
    if (!res.success) return;

    const logs = Array.isArray(res.data) ? res.data : (res.data?.logs || []);
    logsContainer.innerHTML = '';

    logs.forEach((log, i) => {
      const ts = log.timestamp
        ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : '--:--:--';
      const level = (log.level || 'info').toLowerCase();
      const dotClass = level === 'error' ? 'error' : level === 'success' ? 'success' : 'info';
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.style.animationDelay = `${i * 0.05}s`;
      entry.innerHTML = `
        <span class="log-timestamp">${ts}</span>
        <span class="log-dot ${dotClass}"></span>
        <span class="log-message">${log.message || ''}</span>
      `;
      logsContainer.appendChild(entry);
    });

    logsContainer.scrollTop = logsContainer.scrollHeight;
  }

  function addLogEntry(level, message) {
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dotClass = level === 'error' ? 'error' : level === 'success' ? 'success' : 'info';
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
      <span class="log-timestamp">${ts}</span>
      <span class="log-dot ${dotClass}"></span>
      <span class="log-message">${message}</span>
    `;
    logsContainer.appendChild(entry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
  }

  // -----------------------------------------------------------------------
  // Live polling (while active view is shown)
  // -----------------------------------------------------------------------
  function startLivePolling() {
    stopLivePolling();
    fetchLogs();
    refreshWorkflow();
    logPollTimer = setInterval(fetchLogs, 5000);
    workflowPollTimer = setInterval(refreshWorkflow, 8000);
  }

  function stopLivePolling() {
    if (logPollTimer) { clearInterval(logPollTimer); logPollTimer = null; }
    if (workflowPollTimer) { clearInterval(workflowPollTimer); workflowPollTimer = null; }
  }

  // -----------------------------------------------------------------------
  // Status message (bottom bar)
  // -----------------------------------------------------------------------
  function updateStatusMessage(text, type = 'ok') {
    const el = document.getElementById('status-message');
    if (!el) return;
    const icon = type === 'error' ? 'error_outline' : 'smart_toy';
    const cls = type === 'error' ? '' : 'breathing';
    el.innerHTML = `<span class="material-icons ${cls}">${icon}</span> ${text}`;
    el.style.color = type === 'error' ? 'var(--error)' : 'var(--secondary)';
  }

  // -----------------------------------------------------------------------
  // Event listeners
  // -----------------------------------------------------------------------
  startBtn.addEventListener('click', () => {
    startAutomation(inputField.value);
  });

  inputField.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      startAutomation(inputField.value);
    }
  });

  // Suggestion cards fill the input & submit
  suggestionCards.forEach((card) => {
    card.addEventListener('click', () => {
      const text = card.querySelector('.suggestion-text')?.textContent || '';
      inputField.value = text;
      startAutomation(text);
    });
  });

  // Settings button opens options page
  settingsBtn?.addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    }
  });

  // Listen for backend status changes from background.js
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'BACKEND_STATUS') {
      if (msg.online) {
        setStatus(activeView.classList.contains('hidden') ? 'ready' : 'active');
        updateStatusMessage('Agent ready to work', 'ok');
      } else {
        setStatus('error');
        updateStatusMessage('Backend offline — retrying...', 'error');
      }
    }
  });

  // -----------------------------------------------------------------------
  // Init
  // -----------------------------------------------------------------------
  showReadyView();
  checkBackend();
});
