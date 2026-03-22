# SightLine

Voice-controlled browser navigation for accessibility.  
SightLine lets a user speak natural commands, interprets intent with AI, executes actions on the current page, and provides spoken feedback.

## Why This Project
- Accessibility-first browsing for users who benefit from hands-free navigation.
- Faster interaction for common web tasks like reading, searching, clicking, and scrolling.
- Designed as a hackathon-ready MVP with clear extension + backend separation.

## Core Demo Flow
1. User clicks `Start Listening` in the Chrome extension popup.
2. Browser speech recognition transcribes the spoken command.
3. Transcript is sent to the backend (`/api/voice/process`).
4. AI maps the command to an actionable intent.
5. Content script performs the action in the active webpage.
6. Extension speaks concise confirmation feedback.

## Features
- Voice input via Web Speech API
- AI command interpretation (OpenAI + fallback behavior)
- Real page actions through Chrome Extension content scripts
- Text-to-speech output for response confirmation
- Clean popup UI optimized for quick demoing

## Tech Stack
- Chrome Extension Manifest V3
- JavaScript (frontend + content/background scripts)
- Node.js + Express backend
- OpenAI API integration (optional but recommended)

## Repository Structure
```text
hoohacks-2026/
├── extension/   # Chrome extension UI + content/background scripts
├── backend/     # Express API + intent parsing + action orchestration
├── SOURCES.md   # External references/attribution links
└── README.md
```

## Setup (Local)
1. Install backend dependencies:
```bash
cd backend
npm install
```
2. Configure environment:
- Create/update `backend/.env`
- Optional AI key:
```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
```
3. Start backend:
```bash
npm start
```
4. Load extension:
- Open `chrome://extensions/`
- Enable Developer mode
- Click `Load unpacked`
- Select `/Users/neel/Hoohacks-2026/extension`

## Judge Demo Script (Recommended)
1. Open a normal webpage (not a `chrome://` page).
2. Open SightLine popup.
3. Click `Start Listening`.
4. Say:
- "Read the page"
- "Search for watches"
- "Scroll down"
5. Show voice response + visible browser action.

## Notes
- If `OPENAI_API_KEY` is not set, the backend uses fallback logic.
- Speech recognition must run on a normal webpage tab where content scripts can execute.

## License
MIT
