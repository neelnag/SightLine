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

const summarizePlan = (steps = []) => {
  if (!Array.isArray(steps) || !steps.length) return '';
  if (steps.length === 1) return `Planned 1 step: ${steps[0].type}.`;
  return `Planned ${steps.length} steps: ${steps.map((s) => s.type).join(', ')}.`;
};

const buildActionPayload = (intent = {}) => {
  if (Array.isArray(intent.steps) && intent.steps.length) {
    return {
      type: 'agent_plan',
      steps: intent.steps
    };
  }

  switch (intent.type) {
    case 'click':
      return {
        type: 'click',
        target: intent.target || 'button'
      };
    case 'fill_form':
      return {
        type: 'fill',
        fields: intent.fields || {}
      };
    case 'navigate':
      return {
        type: 'navigate',
        url: intent.url || ''
      };
    case 'search':
      return {
        type: 'search',
        query: intent.query || ''
      };
    case 'scroll':
      return {
        type: 'scroll',
        direction: intent.direction || 'down'
      };
    case 'read_page':
      return {
        type: 'read'
      };
    default:
      return null;
  }
};

const executeTask = async (userCommand, pageContext = null) => {
  try {
    // Step 1: Use LLM to understand intent
    const intent = await llm.analyzeCommand(userCommand, pageContext);
    
    console.log('Detected intent:', intent);

    // Step 2: Build action plan for execution in browser content script.
    let result;

    if (intent.type === 'agent_plan') {
      result = { success: true, message: summarizePlan(intent.steps) };
    } else if (intent.type === 'read_page') {
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
      feedback: mergeFeedback(result.message, intent.feedback),
      actionPayload: buildActionPayload(intent)
    };
  } catch (error) {
    console.error('Task execution error:', error);
    return {
      action: 'error',
      description: 'Task failed',
      feedback: error.message,
      actionPayload: null
    };
  }
};

module.exports = { executeTask };
