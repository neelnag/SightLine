# Voice Navigator - Hoohacks 2026
## AI-Powered Accessibility Browser Extension

### Overview
This project is a voice-controlled browser extension that allows blind users and people with visual impairments to navigate the internet using natural language commands and an agentic AI system.

### Project Structure
```
hoohacks-2026/
├── backend/              # Node.js/Express AI backend
├── extension/            # Chrome extension
├── README.md
└── .gitignore
```

### Quick Start

#### Backend Setup
```bash
cd backend
npm install
# Add your OpenAI API key to .env (optional for hackathon MVP)
npm start  # Runs on http://localhost:3000
```

#### Extension Setup
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle top-right)
3. Click "Load unpacked"
4. Select the `extension/` folder
5. Refresh the page you're testing on

### How to Use
1. Click the extension icon in your toolbar
2. Click **"🎤 Start Listening"**
3. Speak a command like:
   - "Read the page"
   - "Click the first link"
   - "Search for puppies"
   - "Scroll down"
4. The AI will interpret and execute the command

### Features
- ✅ Voice input via Web Speech API
- ✅ AI command interpretation (with fallback responses)
- ✅ Text-to-speech feedback
- ✅ Extensible backend for complex web automation
- ✅ Accessible, high-contrast UI

### Technologies Used
- **Frontend**: HTML, CSS, JavaScript (Web Speech API)
- **Backend**: Node.js, Express
- **AI**: OpenAI GPT-4 (with built-in fallback)
- **Browser API**: Chrome Extensions API v3

### Next Steps (Post-MVP)
- [ ] Add Puppeteer for automated web interaction
- [ ] Implement form auto-fill
- [ ] Add page element enumeration (link/button reading)
- [ ] Support for shopping sites (Amazon, eBay)
- [ ] Email integration
- [ ] Action history/logging
- [ ] Database for preferences

### Troubleshooting

**No voice input?**
- Check if your browser supports Web Speech API (Chrome/Edge)
- Allow microphone permissions

**Backend not responding?**
- Make sure backend is running: `npm start` in the backend folder
- Check that port 3000 is not in use

**Commands not working?**
- Verify CORS is enabled in backend
- Check browser DevTools console for errors

### Team Notes
- This is a hackathon MVP - focus on core functionality first
- The LLM module has fallback logic for testing without API keys
- Icons in `extension/icons/` are placeholders
- Consider adding accessibility features to the extension itself!

### License
MIT