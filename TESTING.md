## Testing & Development Guide

### Prerequisites
- ✓ Node.js installed
- ✓ npm dependencies installed (`npm install` completed)
- Chrome or Chrome-based browser (Edge, Brave, etc.)
- Microphone access enabled for your browser

### Step 1: Start the Backend Server

```bash
cd backend
npm start
```

You should see:
```
Server running on http://localhost:3000
```

Keep this terminal open - the backend needs to run while you test.

### Step 2: Load the Extension in Chrome

1. Open Chrome/Edge
2. Go to **`chrome://extensions/`**
3. Toggle **"Developer mode"** (top right corner)
4. Click **"Load unpacked"**
5. Navigate to and select the **`extension/`** folder
6. You should see "Voice Navigator for Accessibility" in your extensions list

### Step 3: Create Placeholder Icons

The extension needs 3 icon files. Choose one of these methods:

#### Option A: Quick Online Method (Fastest for Hackathon)
1. Go to https://www.favicon-generator.org/
2. Upload any image (or download a microphone icon from flaticon.com)
3. Download the PNG files
4. Save them as:
   - `extension/icons/icon16.png`
   - `extension/icons/icon48.png`
   - `extension/icons/icon128.png`
5. Refresh the extension in Chrome

#### Option B: Using Python (if you have it)
```python
# Save this as create_icons.py and run: python create_icons.py
from PIL import Image

for size in [16, 48, 128]:
    # Create a simple green square
    img = Image.new('RGB', (size, size), color='#4CAF50')
    img.save(f'extension/icons/icon{size}.png')
    print(f'Created icon{size}.png')
```

#### Option C: Quick Placeholder (For Demo Only)
Simply refresh the extension - it will work without proper icons for testing, but they'll show as blank.

### Step 4: Test the Extension

1. Open any website (e.g., Google, Wikipedia)
2. Click the Voice Navigator extension icon in your toolbar
   - You should see the popup with "🎤 Start Listening" button
3. Click **"Start Listening"**
4. Speak one of these commands:
   - "Read the page"
   - "Search for cats"
   - "Scroll down"
   - "Click the first link"

**What happens:**
1. Your speech is transcribed by your browser's Speech Recognition API
2. Text is sent to the backend at `http://localhost:3000/api/voice/process`
3. AI analyzes the command and returns an action
4. The extension speaks back the feedback via Text-to-Speech

### Expected Behavior

**Command:** "Read the page"
```
Status: Processing your command...
Feedback: Page content read. Provide specific instructions for more details.
[Extension speaks this back to you]
```

**Command:** "Search for puppies"
```
Status: Sending to AI...
Feedback: Search results for "puppies" displayed.
[Extension speaks: "Search results for puppies displayed"]
```

### Debugging

#### No sound output from extension?
- Check browser settings: is Text-to-Speech enabled?
- Open DevTools (F12) → Console tab
- Look for errors mentioning "speechSynthesis"

#### "Backend not responding" error?
- Make sure `npm start` is running in the backend folder
- Check that port 3000 is available: `netstat -an | find ":3000"` (Windows) or `lsof -i :3000` (Mac/Linux)
- Check browser console (F12) for CORS errors

#### Microphone not working?
- Allow microphone permissions when prompted
- Check chrome://settings/content/microphone
- Try a different browser (Chrome works best)

#### Commands not executing?
- Open DevTools (F12) → Look at Network tab
- Check if requests are sent to `localhost:3000`
- Verify response JSON format in the Network tab

### Advanced Testing

#### Test Backend Directly (without extension)
Use curl or Postman:

```bash
curl -X POST http://localhost:3000/api/voice/process \
  -H "Content-Type: application/json" \
  -d "{\"transcript\":\"Search for puppies\"}"
```

Expected response:
```json
{
  "success": true,
  "action": "search",
  "description": "Search for puppies",
  "feedback": "Search results for \"puppies\" displayed."
}
```

#### Check Backend Health
```bash
curl http://localhost:3000/health
```

Should return:
```json
{
  "status": "Backend running"
}
```

### Adding OpenAI API (Optional)

The extension works with or without an API key. To add real AI:

1. Get an API key from https://openai.com/api
2. Edit `backend/.env`:
   ```
   OPENAI_API_KEY=sk-your-key-here
   ```
3. Restart the backend: `npm start`
4. Now it will use GPT-4 for command interpretation

Without an API key, it uses built-in fallback logic that still works great for demos!

### Next: Adding Real Web Automation

For full functionality, you'll want to add Puppeteer:

```bash
cd backend
npm install puppeteer
```

Then update `backend/utils/domInteraction.js` to use actual browser automation instead of mock responses.

### Hackathon Tips

✅ Focus on **"Say a command → see it execute"** demo flow
✅ Start with simple commands (scroll, read page)
✅ The fallback LLM logic works fine for MVP - don't need OpenAI API key
✅ Test on multiple websites
✅ Record a video demo showing voice control in action
✅ Make sure accessibility is accessible (your own extension)

Good luck! 🎤
