/**
 * AMABA Content Script
 * Injected into every web page. Handles commands from the background
 * service worker for DOM interaction (click, scrape, navigate, highlight).
 */

(() => {
  'use strict';

  // Prevent double-injection
  if (window.__AMABA_INJECTED) return;
  window.__AMABA_INJECTED = true;

  console.log('[AMABA] Content script loaded on:', window.location.href);

  // -----------------------------------------------------------------------
  // Overlay for visual feedback
  // -----------------------------------------------------------------------
  let overlay = null;

  function showOverlay(text, color = '#00bfff') {
    removeOverlay();
    overlay = document.createElement('div');
    overlay.id = 'amaba-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 2147483647;
      padding: 10px 18px;
      background: rgba(10, 10, 10, 0.92);
      backdrop-filter: blur(12px);
      border: 1px solid ${color}44;
      border-radius: 10px;
      color: ${color};
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      pointer-events: none;
      animation: amaba-fade-in 0.3s ease;
    `;
    overlay.textContent = `🤖 AMABA: ${text}`;
    document.body.appendChild(overlay);

    setTimeout(removeOverlay, 4000);
  }

  function removeOverlay() {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
      overlay = null;
    }
  }

  // -----------------------------------------------------------------------
  // Highlight an element temporarily
  // -----------------------------------------------------------------------
  function highlightElement(el) {
    const prev = el.style.outline;
    const prevTransition = el.style.transition;
    el.style.transition = 'outline 0.2s ease';
    el.style.outline = '3px solid #00bfff';
    setTimeout(() => {
      el.style.outline = prev;
      el.style.transition = prevTransition;
    }, 2000);
  }

  // -----------------------------------------------------------------------
  // Message listener (from background.js)
  // -----------------------------------------------------------------------
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[AMABA] Message received:', request);

    switch (request.action) {
      case 'ping':
        sendResponse({ status: 'pong', url: window.location.href });
        break;

      case 'get_page_info':
        sendResponse({
          status: 'ok',
          url: window.location.href,
          title: document.title,
          text: document.body?.innerText?.substring(0, 2000) || '',
        });
        break;

      case 'highlight':
        try {
          const el = document.querySelector(request.selector);
          if (el) {
            highlightElement(el);
            showOverlay(`Highlighting: ${request.selector}`);
            sendResponse({ status: 'ok' });
          } else {
            sendResponse({ status: 'error', message: 'Element not found' });
          }
        } catch (err) {
          sendResponse({ status: 'error', message: err.message });
        }
        break;

      case 'click_element':
        try {
          const el = document.querySelector(request.selector);
          if (el) {
            highlightElement(el);
            showOverlay(`Clicking: ${request.selector}`);
            el.click();
            sendResponse({ status: 'ok' });
          } else {
            sendResponse({ status: 'error', message: 'Element not found' });
          }
        } catch (err) {
          sendResponse({ status: 'error', message: err.message });
        }
        break;

      case 'scrape_element':
        try {
          const els = document.querySelectorAll(request.selector);
          const results = Array.from(els).map((el) => ({
            tag: el.tagName.toLowerCase(),
            text: el.innerText?.substring(0, 500),
            html: el.innerHTML?.substring(0, 1000),
            attrs: Object.fromEntries(
              Array.from(el.attributes).map((a) => [a.name, a.value])
            ),
          }));
          showOverlay(`Scraped ${results.length} element(s)`);
          sendResponse({ status: 'ok', data: results });
        } catch (err) {
          sendResponse({ status: 'error', message: err.message });
        }
        break;

      case 'fill_field':
        try {
          const el = document.querySelector(request.selector);
          if (el) {
            highlightElement(el);
            el.value = request.value || '';
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            showOverlay(`Filled: ${request.selector}`);
            sendResponse({ status: 'ok' });
          } else {
            sendResponse({ status: 'error', message: 'Element not found' });
          }
        } catch (err) {
          sendResponse({ status: 'error', message: err.message });
        }
        break;

      case 'show_status':
        showOverlay(request.message || 'Working...', request.color);
        sendResponse({ status: 'ok' });
        break;

      default:
        sendResponse({ status: 'error', message: `Unknown action: ${request.action}` });
    }

    return true; // Keep channel open for async
  });

  // -----------------------------------------------------------------------
  // Inject CSS animation
  // -----------------------------------------------------------------------
  const style = document.createElement('style');
  style.textContent = `
    @keyframes amaba-fade-in {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
})();
