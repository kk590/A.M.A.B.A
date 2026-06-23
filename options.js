/**
 * AMABA Options Page Script
 * Manages settings persistence via chrome.storage.local and
 * tests backend connectivity.
 */

document.addEventListener('DOMContentLoaded', () => {
  // -----------------------------------------------------------------------
  // DOM refs
  // -----------------------------------------------------------------------
  const modelGroup     = document.getElementById('model-group');
  const openaiKey      = document.getElementById('openai-key');
  const anthropicKey   = document.getElementById('anthropic-key');
  const backendUrl     = document.getElementById('backend-url');
  const connStatus     = document.getElementById('connection-status');
  const toggleDev      = document.getElementById('toggle-dev');
  const toggleAuto     = document.getElementById('toggle-auto');
  const saveBtn        = document.getElementById('save-btn');
  const resetBtn       = document.getElementById('reset-btn');
  const toast          = document.getElementById('toast');

  const DEFAULTS = {
    model: 'gpt-4o',
    openaiKey: '',
    anthropicKey: '',
    backendUrl: 'https://amaba-backend.onrender.com',
    devMode: true,
    autoExecute: false,
  };

  // -----------------------------------------------------------------------
  // Load saved settings
  // -----------------------------------------------------------------------
  chrome.storage.local.get(DEFAULTS, (settings) => {
    selectModel(settings.model);
    openaiKey.value    = settings.openaiKey;
    anthropicKey.value = settings.anthropicKey;
    backendUrl.value   = settings.backendUrl;
    setToggle(toggleDev, settings.devMode);
    setToggle(toggleAuto, settings.autoExecute);
    testConnection(settings.backendUrl);
  });

  // -----------------------------------------------------------------------
  // Model selection
  // -----------------------------------------------------------------------
  function selectModel(value) {
    modelGroup.querySelectorAll('.radio-card').forEach((card) => {
      card.classList.toggle('selected', card.dataset.value === value);
    });
  }

  modelGroup.addEventListener('click', (e) => {
    const card = e.target.closest('.radio-card');
    if (card) selectModel(card.dataset.value);
  });

  // -----------------------------------------------------------------------
  // Toggle switches
  // -----------------------------------------------------------------------
  function setToggle(el, on) {
    el.classList.toggle('on', on);
  }

  [toggleDev, toggleAuto].forEach((el) => {
    el.addEventListener('click', () => el.classList.toggle('on'));
  });

  // -----------------------------------------------------------------------
  // Backend connection test
  // -----------------------------------------------------------------------
  async function testConnection(url) {
    connStatus.style.color = 'var(--outline)';
    connStatus.textContent = 'Testing connection...';
    try {
      const res = await fetch(`${url}/health`, { method: 'GET' });
      if (res.ok) {
        connStatus.style.color = 'var(--secondary)';
        connStatus.textContent = '✓ Connected to backend';
      } else {
        connStatus.style.color = 'var(--error)';
        connStatus.textContent = `✗ Backend returned ${res.status}`;
      }
    } catch (err) {
      connStatus.style.color = 'var(--error)';
      connStatus.textContent = `✗ Cannot reach backend: ${err.message}`;
    }
  }

  backendUrl.addEventListener('change', () => {
    testConnection(backendUrl.value.trim());
  });

  // -----------------------------------------------------------------------
  // Save
  // -----------------------------------------------------------------------
  saveBtn.addEventListener('click', () => {
    const selectedModel = modelGroup.querySelector('.radio-card.selected')?.dataset.value || DEFAULTS.model;

    const settings = {
      model: selectedModel,
      openaiKey: openaiKey.value.trim(),
      anthropicKey: anthropicKey.value.trim(),
      backendUrl: backendUrl.value.trim() || DEFAULTS.backendUrl,
      devMode: toggleDev.classList.contains('on'),
      autoExecute: toggleAuto.classList.contains('on'),
    };

    chrome.storage.local.set(settings, () => {
      showToast('Settings saved ✓');
    });
  });

  // -----------------------------------------------------------------------
  // Reset
  // -----------------------------------------------------------------------
  resetBtn.addEventListener('click', () => {
    chrome.storage.local.set(DEFAULTS, () => {
      selectModel(DEFAULTS.model);
      openaiKey.value    = DEFAULTS.openaiKey;
      anthropicKey.value = DEFAULTS.anthropicKey;
      backendUrl.value   = DEFAULTS.backendUrl;
      setToggle(toggleDev, DEFAULTS.devMode);
      setToggle(toggleAuto, DEFAULTS.autoExecute);
      testConnection(DEFAULTS.backendUrl);
      showToast('Settings reset to defaults');
    });
  });

  // -----------------------------------------------------------------------
  // Toast
  // -----------------------------------------------------------------------
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }
});
