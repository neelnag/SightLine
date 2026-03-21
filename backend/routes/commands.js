const express = require('express');
const router = express.Router();
const domInteraction = require('../utils/domInteraction');

// Execute a specific command
router.post('/execute', async (req, res) => {
  try {
    const { action, target, value } = req.body;
    
    if (!action) {
      return res.status(400).json({ error: 'No action provided' });
    }

    let result;
    
    switch (action) {
      case 'click':
        result = await domInteraction.clickElement(target);
        break;
      case 'fill':
        result = await domInteraction.fillForm({ selector: target, value });
        break;
      case 'read':
        result = await domInteraction.readPageContent();
        break;
      case 'navigate':
        result = await domInteraction.navigate(target);
        break;
      default:
        result = { success: false, message: 'Unknown action' };
    }

    res.json({ success: result.success, message: result.message });
  } catch (error) {
    console.error('Error executing command:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
