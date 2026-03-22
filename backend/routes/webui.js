const express = require('express');
const router = express.Router();
const webUiService = require('../services/webUiService');

router.get('/status', async (req, res) => {
  try {
    const health = await webUiService.checkHealth();
    res.json({ success: true, running: health.running, url: health.url });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/start', async (req, res) => {
  try {
    const result = await webUiService.startWebUi();
    if (!result.success) {
      return res.status(500).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/stop', async (req, res) => {
  try {
    const result = await webUiService.stopWebUi();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/url', (req, res) => {
  res.json({ success: true, url: webUiService.getBaseUrl() });
});

module.exports = router;
