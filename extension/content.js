// Content script - runs on every webpage.
// Handles page actions and speech recognition in tab context.

console.log('Content script loaded');

const recognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;
let stopRequested = false;
let hoverPreviewEnabled = false;
let lastHoverText = '';
let lastHoverSpokenAt = 0;
let hoverSpeakTimer = null;

const sendRuntimeMessage = (payload) => {
  try {
    chrome.runtime.sendMessage(payload);
  } catch (error) {
    console.warn('Could not send runtime message:', error);
  }
};

const sanitizeSpokenText = (text) => {
  return (text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
};

const speakShortText = (text) => {
  const phrase = sanitizeSpokenText(text);
  if (!phrase || !('speechSynthesis' in window)) return;

  const now = Date.now();
  if (phrase === lastHoverText && now - lastHoverSpokenAt < 2500) return;

  lastHoverText = phrase;
  lastHoverSpokenAt = now;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(phrase);
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
};

const inferProductLabel = (element) => {
  if (!element) return '';

  const card = element.closest(
    '[data-product], [data-testid*="product" i], article, li, .product, .product-card, .item, .card'
  ) || element;

  const direct =
    card.getAttribute('aria-label') ||
    card.getAttribute('title') ||
    card.getAttribute('data-product-name') ||
    '';
  if (direct && direct.trim().length > 2) return direct.trim();

  const heading = card.querySelector('h1, h2, h3, h4, [role="heading"]');
  if (heading && heading.textContent) {
    const t = heading.textContent.trim();
    if (t.length > 2 && t.length < 80) return t;
  }

  const candidates = [card, ...card.querySelectorAll('a, span, p, div')];
  for (const node of candidates.slice(0, 20)) {
    const text = (node.innerText || node.textContent || '').trim();
    if (!text || text.length < 3 || text.length > 80) continue;
    if (/\$|€|£|¥/.test(text) && text.length < 25) continue;
    if (/add to cart|buy now|wishlist|compare/i.test(text)) continue;
    return text;
  }

  return '';
};

const scheduleHoverAnnouncement = (event) => {
  if (!hoverPreviewEnabled) return;
  const target = event.target;
  if (!target || !(target instanceof Element)) return;

  clearTimeout(hoverSpeakTimer);
  hoverSpeakTimer = setTimeout(() => {
    const label = inferProductLabel(target);
    if (label) speakShortText(label);
  }, 250);
};

document.addEventListener('mouseover', scheduleHoverAnnouncement, true);

if (recognitionAPI) {
  recognition = new recognitionAPI();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isListening = true;
    stopRequested = false;
    sendRuntimeMessage({ type: 'VOICE_STATUS', status: 'listening' });
  };

  recognition.onresult = (event) => {
    let interim = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += `${transcript} `;
      } else {
        interim += transcript;
      }
    }

    if (interim) {
      sendRuntimeMessage({
        type: 'VOICE_RESULT',
        isFinal: false,
        text: interim.trim()
      });
    }

    if (finalTranscript.trim()) {
      sendRuntimeMessage({
        type: 'VOICE_RESULT',
        isFinal: true,
        text: finalTranscript.trim()
      });
    }
  };

  recognition.onerror = (event) => {
    sendRuntimeMessage({ type: 'VOICE_ERROR', error: event.error });
  };

  recognition.onend = () => {
    isListening = false;
    sendRuntimeMessage({
      type: 'VOICE_STATUS',
      status: 'stopped',
      reason: stopRequested ? 'manual' : 'ended'
    });
    stopRequested = false;
  };
}

// Listen for messages from popup/background.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);

  if (request.type === 'PING') {
    sendResponse({ success: true });
    return;
  }

  if (request.type === 'START_VOICE_RECOGNITION') {
    if (!recognition) {
      sendResponse({ success: false, error: 'unsupported' });
      return;
    }

    if (isListening) {
      sendResponse({ success: true, status: 'already_listening' });
      return;
    }

    try {
      recognition.start();
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({
        success: false,
        error: error.message || 'failed_to_start'
      });
    }
    return;
  }

  if (request.type === 'STOP_VOICE_RECOGNITION') {
    if (recognition && isListening) {
      stopRequested = true;
      recognition.stop();
    }
    sendResponse({ success: true });
    return;
  }

  if (request.type === 'EXECUTE_ACTION') {
    (async () => {
      const result = await executePageAction(request.action || {});
      sendResponse(result || { success: false, message: 'No result returned from action handler.' });
    })();
    return true;
  }

  if (request.type === 'EXECUTE_AGENT_PLAN') {
    (async () => {
      const result = await executeAgentPlan(request.steps || []);
      sendResponse(result);
    })();
    return true;
  }

  if (request.type === 'GET_PAGE_CONTEXT') {
    const context = getPageContext();
    sendResponse({ success: true, context });
    return;
  }

  if (request.type === 'GET_HOVER_PREVIEW_STATE') {
    sendResponse({ success: true, enabled: hoverPreviewEnabled });
    return;
  }

  if (request.type === 'READ_PAGE') {
    const content = document.body.innerText;
    sendResponse({ success: true, content });
  }
});

// Listen for messages from service worker injected on page.
window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  if (event.data.type && event.data.type === 'EXECUTE_ACTION') {
    executePageAction(event.data.action);
  }
});

const executeAgentPlan = async (steps) => {
  if (!Array.isArray(steps) || !steps.length) {
    return { success: false, message: 'No plan steps were provided.' };
  }

  const results = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    // eslint-disable-next-line no-await-in-loop
    const stepResult = await executePageAction(step || {});
    results.push({
      index: i,
      type: step && step.type ? step.type : 'unknown',
      success: Boolean(stepResult && stepResult.success),
      message: (stepResult && stepResult.message) || ''
    });

    if (!stepResult || !stepResult.success) {
      return {
        success: false,
        message: `Step ${i + 1} failed (${results[i].type}). ${results[i].message || ''}`.trim(),
        results
      };
    }
  }

  return {
    success: true,
    message: `Completed ${steps.length} planned step${steps.length === 1 ? '' : 's'}.`,
    results
  };
};

const executePageAction = async (action) => {
  try {
    switch (action.type) {
      case 'agent_plan':
        return executeAgentPlan(action.steps || []);
      case 'click': {
        const clickElement = resolveClickableElement(action);
        if (clickElement) {
          clickElement.click();
          console.log('Clicked:', action.selector);
          return { success: true, message: 'Clicked target element on page.' };
        } else {
          console.log('Element not found:', action);
          return { success: false, message: 'Could not find a matching element to click.' };
        }
      }
      case 'fill': {
        const fillResult = fillPageInput(action);
        if (fillResult.success) {
          console.log('Filled input:', fillResult.selector || 'resolved');
          return { success: true, message: 'Filled input field on page.' };
        }
        return { success: false, message: fillResult.message };
      }
      case 'read':
        return { success: true, content: document.body.innerText };
      case 'scroll': {
        const direction = action.direction === 'up' ? -1 : 1;
        window.scrollBy(0, direction * 300);
        return { success: true, message: `Scrolled ${action.direction === 'up' ? 'up' : 'down'}.` };
      }
      case 'navigate':
        if (!action.url) {
          return { success: false, message: 'No URL provided for navigation.' };
        }
        window.location.href = action.url;
        return { success: true, message: `Navigating to ${action.url}.` };
      case 'search': {
        const searchInput =
          document.querySelector('input[type="search"]') ||
          document.querySelector('input[name*="search" i]') ||
          document.querySelector('input[aria-label*="search" i]') ||
          document.querySelector('input[type="text"]');
        if (!searchInput || !action.query) {
          return { success: false, message: 'Search input not found on this page.' };
        }
        searchInput.focus();
        searchInput.value = action.query;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        searchInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
        return { success: true, message: `Searched for "${action.query}".` };
      }
      case 'press': {
        const key = action.key || 'Enter';
        const target = document.activeElement || document.body;
        target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
        target.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
        return { success: true, message: `Pressed ${key}.` };
      }
      case 'wait': {
        const ms = Number.isFinite(action.ms) ? Math.max(0, Math.floor(action.ms)) : 500;
        await new Promise((resolve) => setTimeout(resolve, ms));
        return { success: true, message: `Waited ${ms} ms.` };
      }
      case 'hover_preview': {
        hoverPreviewEnabled = action.enabled !== false;
        return {
          success: true,
          message: hoverPreviewEnabled
            ? 'Hover voice preview enabled.'
            : 'Hover voice preview disabled.'
        };
      }
      default:
        return { success: false, message: `Unsupported action type: ${action.type}` };
    }
  } catch (error) {
    console.error('Error executing action:', error);
    return { success: false, message: `Action execution error: ${error.message}` };
  }
};

const getPageContext = () => {
  const title = document.title || '';
  const url = window.location.href || '';
  const links = [...document.querySelectorAll('a')]
    .slice(0, 20)
    .map((a) => (a.innerText || a.getAttribute('aria-label') || '').trim())
    .filter(Boolean);
  const buttons = [...document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]')]
    .slice(0, 20)
    .map((b) => (b.innerText || b.value || b.getAttribute('aria-label') || '').trim())
    .filter(Boolean);
  const inputs = [...document.querySelectorAll('input, textarea, select')]
    .slice(0, 20)
    .map((el) => ({
      name: el.name || '',
      id: el.id || '',
      placeholder: el.placeholder || '',
      type: el.type || el.tagName.toLowerCase()
    }));

  return { title, url, links, buttons, inputs };
};

const resolveClickableElement = (action) => {
  if (!action) return null;
  if (action.selector) {
    return document.querySelector(action.selector);
  }

  const targetText = (action.target || '').trim();
  if (!targetText) return null;
  const normalizedTarget = targetText.toLowerCase();

  if (normalizedTarget.includes('first link')) {
    return document.querySelector('a');
  }
  if (normalizedTarget.includes('first button')) {
    return document.querySelector('button, [role="button"], input[type="button"], input[type="submit"]');
  }

  const clickables = [
    ...document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]')
  ];

  return clickables.find((el) =>
    (el.innerText || el.value || el.getAttribute('aria-label') || '')
      .toLowerCase()
      .includes(normalizedTarget)
  ) || null;
};

const fillPageInput = (action) => {
  if (!action || !action.fields) {
    return { success: false, message: 'No form fields were provided.' };
  }

  const fields = action.fields;
  if (fields.selector && typeof fields.value !== 'undefined') {
    const input = document.querySelector(fields.selector);
    if (!input) {
      return { success: false, message: 'Could not find input for provided selector.' };
    }
    input.focus();
    input.value = fields.value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return { success: true, selector: fields.selector };
  }

  const entries = Object.entries(fields).filter(([, value]) => typeof value !== 'object');
  let filledCount = 0;
  entries.forEach(([name, value]) => {
    const input =
      document.querySelector(`[name="${name}"]`) ||
      document.querySelector(`[id="${name}"]`) ||
      document.querySelector(`input[placeholder*="${name}" i]`) ||
      document.querySelector(`textarea[placeholder*="${name}" i]`);
    if (input) {
      input.focus();
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      filledCount += 1;
    }
  });

  if (!filledCount) {
    return { success: false, message: 'No matching form fields were found on this page.' };
  }

  return { success: true };
};
