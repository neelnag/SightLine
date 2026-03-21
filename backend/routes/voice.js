const express = require('express');
const router = express.Router();
const taskExecutor = require('../agents/taskExecutor');

// Receive transcribed voice command
router.post('/process', async (req, res) => {
  try {
    const { transcript } = req.body;
    
    if (!transcript) {
      return res.status(400).json({ error: 'No transcript provided' });
    }

    console.log('Processing transcript:', transcript);

    // Send to AI agent
    const result = await taskExecutor.executeTask(transcript);
    
    res.json({
      success: true,
      action: result.action,
      description: result.description,
      feedback: result.feedback
    });
  } catch (error) {
    console.error('Error processing voice:', error);
    res.status(500).json({ error: 'Failed to process command' });
  }
});

module.exports = router;
