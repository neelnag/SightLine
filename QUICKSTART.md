# 🎤 Voice Navigator - QUICKSTART GUIDE

Everything is set up and ready to go! Follow these steps to test your voice-controlled accessibility extension.

## ✅ What's Already Done

- [x] Backend server code created
- [x] Chrome extension files created  
- [x] npm dependencies installed
- [x] Placeholder icons generated
- [x] Project structure ready

## 🚀 3-Minute Startup

### Step 1: Start the Backend (Terminal 1)

```bash
cd backend
npm start
```

You'll see:
```
Server running on http://localhost:3000
```

**Keep this running!** The extension needs it.

### Step 2: Load Extension in Chrome (Browser)

1. Open **Chrome** (or Edge)
2. Go to **`chrome://extensions/`**
3. Toggle **"Developer mode"** (top right)
4. Click **"Load unpacked"**
5. Select the **`extension`** folder from your project
6. Done! You should see "Voice Navigator for Accessibility" in your extensions

### Step 3: Test It!

1. Open any website (Google, Wikipedia, etc.)
2. Click the **Voice Navigator** icon in your toolbar (should be green with microphone)
3. Click **"🎤 Start Listening"**
4. Speak clearly: **"Read the page"** or **"Scroll down"**
5. You'll hear the extension speak back to you!

## 📋 Test Commands You Can Try

| Command | What It Does |
|---------|------------|
| "Read the page" | Summarizes the content |
| "Search for puppies" | Prepares to search for puppies |
| "Scroll down" | Scrolls the page down |
| "Scroll up" | Scrolls the page up |
| "Click the first link" | Clicks the first link on page |
| "What's on this page" | Reads page content |

## 🔧 Troubleshooting

### Issue: "Backend not responding"
**Solution:** Make sure `npm start` is running in the backend folder in a terminal

### Issue: No microphone input
**Solution:** 
- Allow microphone in Chrome: **Settings → Privacy → Site Settings → Microphone**
- Refresh the extension page
- Try Chrome instead of other browsers

### Issue: Extension icon doesn't appear
**Solution:** 
- Refresh the page where you want to test (after loading extension)
- Pin the extension icon to toolbar (click puzzle icon, then pin)

### Issue: Commands not executing
**Solution:**
- Check that backend is running (see Terminal)
- Open DevTools (F12) and look at Network tab
- Make sure you're on a regular website, not special pages like Gmail or Maps

## 📊 What's Happening Behind the Scenes

```
Your Voice
    ↓
Browser Speech Recognition API (transcribes to text)
    ↓
Extension sends text to Backend
    ↓
Backend AI analyzes the command (with or without OpenAI)
    ↓
Backend decides what action to take (read, search, scroll, etc.)
    ↓
Extension executes action on the webpage
    ↓
Extension speaks feedback back to you
```

## 🔑 Optional: Add OpenAI API (For Better AI)

The extension works great without this, but for better natural language understanding:

1. Get a key from https://openai.com/api
2. Edit `backend/.env`:
   ```
   OPENAI_API_KEY=sk-your-actual-key-here
   ```
3. Restart backend: `npm start`

Done! Now it uses GPT-4 for understanding.

## 📁 Project Structure

```
hoohacks-2026/
├── backend/               # Node.js/Express server
│   ├── server.js         # Main server
│   ├── routes/           # API endpoints
│   ├── agents/           # AI logic
│   ├── utils/            # Helper functions
│   ├── .env              # Configuration (add API key here)
│   └── package.json      # Dependencies
│
├── extension/            # Chrome extension
│   ├── manifest.json     # Extension config
│   ├── popup.js          # Main UI logic
│   ├── popup.html        # UI
│   ├── popup.css         # Styling
│   ├── content.js        # Page interaction
│   ├── background.js     # Service worker
│   └── icons/            # Extension icons
│
├── README.md             # Full documentation
├── TESTING.md            # Detailed testing guide
└── QUICKSTART.md         # You are here!
```

## 🎥 Demo Ideas for Hackathon

1. **Text-to-Speech Demo**: "Read the page" command shows accessibility
2. **Search Demo**: "Search for [topic]" shows voice control
3. **Navigation Demo**: "Scroll down", "Click link" shows hands-free browsing
4. **Accessibility Story**: Show how this helps blind/low-vision users
5. **Multiple Websites**: Test on different sites to show versatility

## 🆘 Getting Help

1. **Check the logs**: Look at the terminal where `npm start` is running - it shows errors
2. **Check browser console**: Press F12 → Console tab → look for red errors
3. **Check network requests**: F12 → Network tab → try a command and watch requests
4. **Read TESTING.md**: Deep dive guide with more debugging info

## 🎯 Next Steps After Demo

1. Improve UI with better styling
2. Add more command types (fill forms, read emails, etc.)
3. Add Puppeteer for advanced web automation
4. Create better icons
5. Test on more websites
6. Add user preference storage
7. Implement accessibility compliance (WCAG)

## 🚀 Deploy Your Success

When you're ready to submit to hackathon:

1. Record a video of the extension in action
2. Include the README.md documentation
3. Mention this is an **MVP built in a hackathon**
4. Highlight the accessibility impact
5. Show the clean architecture (frontend + backend)

---

## 💡 Pro Tips

✅ **Start simple**: Get one command working before adding more
✅ **Test frequently**: Click the button and talk to your computer
✅ **Iterate fast**: Change backend code and restart (no extension reload needed)
✅ **Make it accessible**: Users will test your extension for accessibility!
✅ **Document your progress**: Show judges your git commits

---

**Good luck! You've got a working voice-powered accessibility tool. Now go make it amazing! 🎤**
