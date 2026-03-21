const BACKEND_URL = 'http://localhost:3000';
const recognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition;
let isListening = false;
let isStarting = false;
let stopRequested = false;

try {
  if (recognitionAPI) {
    recognition = new recognitionAPI();
  }
} catch (e) {
  console.error('Speech Recognition API not available:', e);
}

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDiv = document.getElementById('status');
const transcriptDiv = document.getElementById('transcript');
const feedbackDiv = document.getElementById('feedback');
const micHelpDiv = document.getElementById('micHelp');
const openMicSettingsBtn = document.getElementById('openMicSettingsBtn');

const showMicHelp = (show) => {
  if (!micHelpDiv) return;
  micHelpDiv.classList.toggle('hidden', !show);
};

const getMicPermissionState = async () => {
  if (!navigator.permissions || !navigator.permissions.query) {
    return 'unknown';
  }

  try {
    const result = await navigator.permissions.query({ name: 'microphone' });
    return result.state || 'unknown';
  } catch (error) {
    console.warn('Could not read microphone permission state:', error);
    return 'unknown';
  }
};

const canActuallyUseMicrophone = async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (error) {
    return false;
  }
};

if (openMicSettingsBtn) {
  openMicSettingsBtn.addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: 'chrome://settings/content/microphone' });
    } else {
      window.open('chrome://settings/content/microphone', '_blank');
    }
  });
}

if (recognition) {
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isStarting = false;
    stopRequested = false;
    isListening = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusDiv.textContent = '🎤 Listening...';
    transcriptDiv.textContent = '';
    feedbackDiv.textContent = '';
    showMicHelp(false);
  };

  recognition.onresult = (event) => {
    let interim = '';
    let finalTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interim += transcript;
      }
    }
    
    transcriptDiv.textContent = finalTranscript || interim || 'Listening...';
    
    if (finalTranscript) {
      processCommand(finalTranscript.trim());
    }
  };

  recognition.onerror = async (event) => {
    isStarting = false;
    statusDiv.textContent = `❌ Error: ${event.error}`;
    const micPermissionState = await getMicPermissionState();
    const micIsUsable = await canActuallyUseMicrophone();
    const isPermissionDenied = micPermissionState === 'denied' || !micIsUsable;
    feedbackDiv.textContent = getSpeechErrorMessage(
      event.error,
      micPermissionState,
      micIsUsable
    );
    showMicHelp(isPermissionDenied);

    // Ensure controls recover cleanly after an error.
    isListening = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
  };

  recognition.onend = () => {
    isStarting = false;
    isListening = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    statusDiv.textContent = stopRequested
      ? '✓ Stopped listening'
      : '✓ Ready to listen';
    stopRequested = false;
  };

  startBtn.addEventListener('click', async () => {
    if (isListening || isStarting) return;
    isStarting = true;
    statusDiv.textContent = 'Starting...';

    try {
      recognition.start();
    } catch (error) {
      isStarting = false;
      console.error('Recognition start failed:', error);
      statusDiv.textContent = '❌ Unable to start speech recognition';
      feedbackDiv.textContent = 'Please close and reopen the popup, then try again.';
    }
  });

  stopBtn.addEventListener('click', () => {
    stopRequested = true;
    recognition.stop();
  });
} else {
  statusDiv.textContent = '❌ Speech Recognition not supported in this browser';
  startBtn.disabled = true;
}

const getSpeechErrorMessage = (
  errorCode,
  micPermissionState = 'unknown',
  micIsUsable = false
) => {
  switch (errorCode) {
    case 'not-allowed':
      if (micIsUsable) {
        return 'Microphone is available, but speech recognition is blocked in this popup context. Try again on a normal webpage tab with the popup open.';
      }
      return micPermissionState === 'denied'
        ? 'Microphone permission denied. Use the button below to enable it, then retry.'
        : 'Microphone access was blocked for this attempt. Retry and allow microphone when prompted.';
    case 'service-not-allowed':
      return 'Speech recognition service is unavailable in this context. Try on a regular HTTPS webpage tab and keep the popup open while speaking.';
    case 'audio-capture':
      return 'No microphone was found. Check your microphone connection/settings.';
    case 'network':
      return 'Speech service network error. Check internet and retry.';
    case 'no-speech':
      return 'No speech detected. Speak a little louder and try again.';
    case 'aborted':
      return stopRequested ? 'Listening stopped.' : 'Speech recognition was interrupted. Try again.';
    default:
      return 'Speech recognition error. Please try again.';
  }
};

const processCommand = async (transcript) => {
  try {
    feedbackDiv.textContent = '⏳ Processing your command...';
    statusDiv.textContent = 'Sending to AI...';
    
    const response = await fetch(`${BACKEND_URL}/api/voice/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    
    feedbackDiv.textContent = `✓ ${data.feedback}`;
    statusDiv.textContent = 'Command executed';
    
    // Speak the feedback
    try {
      speakFeedback(data.feedback);
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
