const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Load backend-local env first, then fallback to repo-root env for missing keys.
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const voiceRoutes = require('./routes/voice');
const commandRoutes = require('./routes/commands');
const webUiRoutes = require('./routes/webui');
const webUiService = require('./services/webUiService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/voice', voiceRoutes);
app.use('/api/commands', commandRoutes);
app.use('/api/web-ui', webUiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Backend running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  if (String(process.env.BROWSER_USE_WEB_UI_AUTO_START || '').toLowerCase() === 'true') {
    webUiService.startWebUi()
      .then((result) => {
        if (result.success) {
          console.log(`[web-ui] ready at ${result.url}`);
        } else {
          console.warn(`[web-ui] failed to start: ${result.error}`);
        }
      })
      .catch((err) => {
        console.warn(`[web-ui] auto-start error: ${err.message}`);
      });
  }
});
