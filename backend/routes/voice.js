const express = require('express');
const router = express.Router();
const taskExecutor = require('../agents/taskExecutor');
const voiceAgentService = require('../services/voiceAgentService');

// Receive transcribed voice command
router.post('/process', async (req, res) => {
  try {
    const { transcript, pageContext } = req.body;
    
    if (!transcript) {
      return res.status(400).json({ error: 'No transcript provided' });
    }

    console.log('Processing transcript:', transcript);

    if (voiceAgentService.isEnabled()) {
      const agentResult = await voiceAgentService.runVoiceTask(transcript, pageContext || null);
      if (agentResult && agentResult.success) {
        return res.json({
          success: true,
          action: 'agent_browser_use',
          description: 'Agent mode execution',
          feedback: agentResult.feedback || 'Agent task completed.',
          actionPayload: null,
          agentMode: true
        });
      }
      console.warn('Agent mode fallback:', agentResult && agentResult.error);
    }

    // Send to AI agent
    const result = await taskExecutor.executeTask(transcript, pageContext || null);
    
    res.json({
      success: true,
      action: result.action,
      description: result.description,
      feedback: result.feedback,
      actionPayload: result.actionPayload || null
    });
  } catch (error) {
    console.error('Error processing voice:', error);
    res.status(500).json({ error: 'Failed to process command' });
  }
});

module.exports = router;
