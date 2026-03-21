const BACKEND_URL = 'http://localhost:3000';
const recognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition;
let isListening = false;

try {
  recognition = new recognitionAPI();
} catch (e) {
  console.error('Speech Recognition API not available');
}

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDiv = document.getElementById('status');
const transcriptDiv = document.getElementById('transcript');
const feedbackDiv = document.getElementById('feedback');

if (recognition) {
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isListening = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusDiv.textContent = '🎤 Listening...';
    transcriptDiv.textContent = '';
    feedbackDiv.textContent = '';
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

  recognition.onerror = (event) => {
    statusDiv.textContent = `❌ Error: ${event.error}`;
    feedbackDiv.textContent = 'Speech recognition error. Please try again.';
  };

  recognition.onend = () => {
    isListening = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    statusDiv.textContent = '✓ Ready to listen';
  };

  startBtn.addEventListener('click', () => {
    statusDiv.textContent = 'Starting...';
    recognition.start();
  });

  stopBtn.addEventListener('click', () => {
    recognition.stop();
  });
} else {
  statusDiv.textContent = '❌ Speech Recognition not supported in this browser';
  startBtn.disabled = true;
}

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
