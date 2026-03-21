const llm = require('../utils/llm');
const domInteraction = require('../utils/domInteraction');

const mergeFeedback = (actionMessage, intentFeedback) => {
  const primary = (actionMessage || '').trim();
  const secondary = (intentFeedback || '').trim();

  if (!primary && !secondary) return 'Action completed';
  if (!primary) return secondary;
  if (!secondary) return primary;
  if (primary.toLowerCase() === secondary.toLowerCase()) return primary;
  return `${primary} ${secondary}`;
};

const executeTask = async (userCommand) => {
  try {
    // Step 1: Use LLM to understand intent
    const intent = await llm.analyzeCommand(userCommand);
    
    console.log('Detected intent:', intent);

    // Step 2: Determine action type
    let result;
    
    if (intent.type === 'read_page') {
      result = await domInteraction.readPageContent();
    } else if (intent.type === 'click') {
      result = await domInteraction.clickElement(intent.target);
    } else if (intent.type === 'fill_form') {
      result = await domInteraction.fillForm(intent.fields);
    } else if (intent.type === 'navigate') {
      result = await domInteraction.navigate(intent.url);
    } else if (intent.type === 'search') {
      result = await domInteraction.search(intent.query);
    } else if (intent.type === 'scroll') {
      result = await domInteraction.scroll(intent.direction);
    } else {
      result = { success: false, message: 'Unknown command type' };
    }

    return {
      action: intent.type,
      description: intent.description,
      feedback: mergeFeedback(result.message, intent.feedback)
    };
  } catch (error) {
    console.error('Task execution error:', error);
    return {
      action: 'error',
      description: 'Task failed',
      feedback: error.message
    };
  }
};

module.exports = { executeTask };
