// Content script - runs on every webpage.
// Handles page actions and speech recognition in tab context.

console.log('Content script loaded');

const recognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;
let stopRequested = false;

const sendRuntimeMessage = (payload) => {
  try {
    chrome.runtime.sendMessage(payload);
  } catch (error) {
    console.warn('Could not send runtime message:', error);
  }
};

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
    executePageAction(request.action);
    sendResponse({ success: true });
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

const executePageAction = (action) => {
  try {
    switch (action.type) {
      case 'click': {
        const clickElement = document.querySelector(action.selector);
        if (clickElement) {
          clickElement.click();
          console.log('Clicked:', action.selector);
        } else {
          console.log('Element not found:', action.selector);
        }
        break;
      }
      case 'fill': {
        const input = document.querySelector(action.selector);
        if (input) {
          input.value = action.value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          console.log('Filled:', action.selector);
        }
        break;
      }
      case 'read':
        return document.body.innerText;
      case 'scroll': {
        const direction = action.direction === 'up' ? -1 : 1;
        window.scrollBy(0, direction * 300);
        break;
      }
      case 'navigate':
        window.location.href = action.url;
        break;
    }
  } catch (error) {
    console.error('Error executing action:', error);
  }
};
