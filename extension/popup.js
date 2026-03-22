const BACKEND_URL = 'http://localhost:3000';

let isListening = false;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const hoverToggleBtn = document.getElementById('hoverToggleBtn');
const openWebUiBtn = document.getElementById('openWebUiBtn');
const statusDiv = document.getElementById('status');
const transcriptDiv = document.getElementById('transcript');
const feedbackDiv = document.getElementById('feedback');
const micHelpDiv = document.getElementById('micHelp');
const openMicSettingsBtn = document.getElementById('openMicSettingsBtn');
let hoverPreviewEnabled = false;

const showMicHelp = (show) => {
  if (!micHelpDiv) return;
  micHelpDiv.classList.toggle('hidden', !show);
};

if (openMicSettingsBtn) {
  openMicSettingsBtn.addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: 'chrome://settings/content/microphone' });
    }
  });
}

const sendToActiveTab = (message) => {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      try {
        if (!tabs || !tabs.length || !tabs[0].id) {
          throw new Error('No active tab found.');
        }

        const tab = tabs[0];
        if (isRestrictedTabUrl(tab.url || '')) {
          throw new Error('restricted_page');
        }

        await ensureContentScriptReady(tab.id);
        const response = await sendMessageToTab(tab.id, message);
        resolve(response || {});
      } catch (error) {
        reject(error);
      }
    });
  });
};

const isRestrictedTabUrl = (url) => {
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('view-source:')
  );
};

const sendMessageToTab = (tabId, message) => {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response || {});
    });
  });
};

const ensureContentScriptReady = async (tabId) => {
  const isPingHealthy = async () => {
    const ping = await sendMessageToTab(tabId, { type: 'PING' });
    return Boolean(ping && ping.success);
  };

  try {
    if (await isPingHealthy()) {
      return;
    }
  } catch (error) {
    if (!/Receiving end does not exist/i.test(error.message)) {
      throw error;
    }
  }

  // Inject latest content script when missing or stale.
  await new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      { target: { tabId }, files: ['content.js'] },
      () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      }
    );
  });

  if (!(await isPingHealthy())) {
    throw new Error('content_script_not_ready');
  }
};

const setIdleUi = () => {
  isListening = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  statusDiv.textContent = '✓ Ready to listen';
};

const updateHoverToggleUi = () => {
  if (!hoverToggleBtn) return;
  hoverToggleBtn.textContent = hoverPreviewEnabled
    ? '🔊 Hover Voice: On'
    : '🔇 Hover Voice: Off';
};

const syncHoverToggleState = async () => {
  try {
    const response = await sendToActiveTab({ type: 'GET_HOVER_PREVIEW_STATE' });
    if (response && response.success) {
      hoverPreviewEnabled = response.enabled !== false;
      updateHoverToggleUi();
    }
  } catch (error) {
    updateHoverToggleUi();
  }
};

const getSpeechErrorMessage = (errorCode) => {
  switch (errorCode) {
    case 'not-allowed':
      return 'Microphone permission denied for this tab. Allow microphone access in site settings, then retry.';
    case 'service-not-allowed':
      return 'Speech recognition is not available on this page context. Open a normal HTTPS webpage and try again.';
    case 'audio-capture':
      return 'No microphone was found. Check your microphone connection/settings.';
    case 'network':
      return 'Speech service network error. Check internet and retry.';
    case 'no-speech':
      return 'No speech detected. Speak a little louder and try again.';
    case 'aborted':
      return 'Listening stopped.';
    case 'unsupported':
      return 'Speech recognition is not supported in this tab.';
    default:
      return 'Speech recognition error. Please try again.';
  }
};

chrome.runtime.onMessage.addListener((request) => {
  if (!request || !request.type) return;

  if (request.type === 'VOICE_STATUS') {
    if (request.status === 'listening') {
      isListening = true;
      startBtn.disabled = true;
      stopBtn.disabled = false;
      statusDiv.textContent = '🎤 Listening...';
      feedbackDiv.textContent = '';
      transcriptDiv.textContent = '';
      showMicHelp(false);
    } else if (request.status === 'stopped') {
      setIdleUi();
    }
  }

  if (request.type === 'VOICE_RESULT') {
    if (request.isFinal) {
      transcriptDiv.textContent = request.text || '';
      if (request.text) {
        processCommand(request.text);
      }
    } else {
      transcriptDiv.textContent = request.text || 'Listening...';
    }
  }

  if (request.type === 'VOICE_ERROR') {
    statusDiv.textContent = `❌ Error: ${request.error}`;
    feedbackDiv.textContent = getSpeechErrorMessage(request.error);
    showMicHelp(request.error === 'not-allowed');
    setIdleUi();
  }
});

startBtn.addEventListener('click', async () => {
  if (isListening) return;

  statusDiv.textContent = 'Starting...';
  feedbackDiv.textContent = '';
  transcriptDiv.textContent = '';
  showMicHelp(false);

  try {
    const response = await sendToActiveTab({ type: 'START_VOICE_RECOGNITION' });
    if (!response.success) {
      throw new Error(response.error || 'start_recognition_failed');
    }
  } catch (error) {
    console.error('Failed to start recognition in active tab:', error);
    statusDiv.textContent = '❌ Unable to start speech recognition';
    if (error.message === 'restricted_page') {
      feedbackDiv.textContent =
        'This page does not allow extension scripts. Open a regular https:// website tab and try again.';
    } else if (error.message === 'content_script_not_ready') {
      feedbackDiv.textContent =
        'Page script did not initialize. Refresh the webpage once, then try Start Listening again.';
    } else if (error.message === 'unsupported') {
      feedbackDiv.textContent =
        'Speech recognition is not supported on this tab/page. Try another standard HTTPS site.';
    } else {
      feedbackDiv.textContent =
        'Could not connect to the page script. Refresh the tab and try Start Listening again.';
    }
    setIdleUi();
  }
});

stopBtn.addEventListener('click', async () => {
  try {
    await sendToActiveTab({ type: 'STOP_VOICE_RECOGNITION' });
  } catch (error) {
    console.error('Failed to stop recognition in active tab:', error);
  } finally {
    setIdleUi();
  }
});

if (hoverToggleBtn) {
  hoverToggleBtn.addEventListener('click', async () => {
    const nextEnabled = !hoverPreviewEnabled;
    try {
      const response = await sendToActiveTab({
        type: 'EXECUTE_ACTION',
        action: { type: 'hover_preview', enabled: nextEnabled }
      });

      if (response && response.success) {
        hoverPreviewEnabled = nextEnabled;
        updateHoverToggleUi();
        feedbackDiv.textContent = hoverPreviewEnabled
          ? '✓ Hover voice preview enabled.'
          : '✓ Hover voice preview disabled.';
      } else {
        throw new Error((response && response.message) || 'Could not update hover preview.');
      }
    } catch (error) {
      console.error('Hover toggle failed:', error);
      feedbackDiv.textContent = '❌ Could not toggle hover preview on this page.';
    }
  });
}

if (openWebUiBtn) {
  openWebUiBtn.addEventListener('click', async () => {
    openWebUiBtn.disabled = true;
    const previousText = openWebUiBtn.textContent;
    openWebUiBtn.textContent = 'Starting Agent UI...';
    try {
      const response = await fetch(`${BACKEND_URL}/api/web-ui/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      if (!response.ok || !data.success || !data.url) {
        throw new Error(data.error || 'Unable to start browser-use/web-ui.');
      }

      chrome.tabs.create({ url: data.url });
      feedbackDiv.textContent = '✓ Agent Web UI opened.';
      statusDiv.textContent = data.alreadyRunning
        ? 'Agent UI already running'
        : 'Agent UI started';
    } catch (error) {
      console.error('Failed to open Agent UI:', error);
      feedbackDiv.textContent =
        '❌ Could not start Agent Web UI. Set BROWSER_USE_WEB_UI_DIR and ensure dependencies are installed.';
      statusDiv.textContent = 'Agent UI start failed';
    } finally {
      openWebUiBtn.disabled = false;
      openWebUiBtn.textContent = previousText;
    }
  });
}

const processCommand = async (transcript) => {
  try {
    feedbackDiv.textContent = '⏳ Processing your command...';
    statusDiv.textContent = 'Sending to AI...';

    let pageContext = null;
    try {
      const contextResponse = await sendToActiveTab({ type: 'GET_PAGE_CONTEXT' });
      if (contextResponse && contextResponse.success) {
        pageContext = contextResponse.context || null;
      }
    } catch (contextError) {
      console.warn('Could not collect page context:', contextError);
    }

    const response = await fetch(`${BACKEND_URL}/api/voice/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, pageContext })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();

    let finalFeedback = data.feedback || 'Command processed';
    statusDiv.textContent = 'Command processed';

    if (data.actionPayload) {
      try {
        const execResult = await sendToActiveTab({
          type: 'EXECUTE_ACTION',
          action: data.actionPayload
        });

        if (execResult && execResult.success) {
          const execMessage = execResult.message ? ` ${execResult.message}` : '';
          finalFeedback = `${finalFeedback}${execMessage}`.trim();
          statusDiv.textContent = 'Command executed';
        } else {
          const reason = execResult && execResult.message
            ? execResult.message
            : 'Action execution failed on page.';
          finalFeedback = `${finalFeedback} ${reason}`.trim();
          statusDiv.textContent = 'Command partially executed';
        }
      } catch (execError) {
        console.error('Page action execution error:', execError);
        finalFeedback = `${finalFeedback} Could not execute action on the page.`.trim();
        statusDiv.textContent = 'Command partially executed';
      }
    }

    feedbackDiv.textContent = `✓ ${finalFeedback}`;

    try {
      speakFeedback(toUserFacingSpeech(finalFeedback));
    } catch (e) {
      console.error('TTS error:', e);
    }
  } catch (error) {
    console.error('Error:', error);
    feedbackDiv.textContent = `❌ Error: ${error.message}`;
    statusDiv.textContent = 'Error processing command';
  }
};

const speakFeedback = (text) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }
};

const toUserFacingSpeech = (text) => {
  if (!text) return 'Done.';
  return text
    .replace(/\bplanned\b/gi, '')
    .replace(/\bplan\b/gi, '')
    .replace(/\bstep(s)?\b/gi, '')
    .replace(/\bexecuting\b/gi, 'done')
    .replace(/\s+/g, ' ')
    .trim();
};

setIdleUi();
updateHoverToggleUi();
syncHoverToggleState();
