const axios = require('axios');

// For hackathon MVP, we'll use a simplified LLM integration
// Replace this with actual API calls to OpenAI/Claude

const analyzeCommand = async (command, pageContext = null) => {
  try {
    const safeCommand = typeof command === 'string' ? command : '';
    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

    // Check if OpenAI API key is set
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_api_key_here') {
      return getContextualResponse(safeCommand);
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages: [
          {
            role: 'system',
            content: `You are an accessibility web agent planner.
Return ONLY valid JSON. Do not include markdown or code fences.

Schema:
{
  "type": "agent_plan|read_page|click|fill_form|navigate|search|scroll",
  "description": "string",
  "feedback": "string",
  "target": "string",
  "fields": {},
  "url": "string",
  "query": "string",
  "direction": "up|down",
  "steps": [
    {
      "type": "click|fill|navigate|search|scroll|read|press|wait|hover_preview",
      "target": "string",
      "selector": "string",
      "query": "string",
      "fields": {},
      "url": "string",
      "direction": "up|down",
      "key": "Enter|Tab|Escape|ArrowUp|ArrowDown|ArrowLeft|ArrowRight",
      "ms": 300
    }
  ]
}

Rules:
- Prefer "agent_plan" with one or more "steps" for multi-step requests.
- Use short robust steps that can run on arbitrary pages.
- feedback must be concise, user-facing, and non-technical.
- do not mention AI reasoning, planning, or internal thought process.
- avoid phrases like "I will", "I am thinking", "plan", "step", or "analyzing".
- If unsure, choose a safe best-effort plan and explain limits in feedback.`
          },
          {
            role: 'user',
            content: JSON.stringify({
              command: safeCommand,
              pageContext: pageContext || {}
            })
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 350
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    return normalizeIntent(extractIntentFromResponse(content), safeCommand);
  } catch (error) {
    console.error('LLM error:', error.message);
    // Fallback to contextual response
    return getContextualResponse(command);
  }
};

const extractIntentFromResponse = (content) => {
  if (typeof content !== 'string') {
    throw new Error('Invalid LLM response format');
  }

  try {
    return JSON.parse(content);
  } catch {
    // Handle cases where the model wraps JSON in prose/code fences.
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in LLM response');
    }
    return JSON.parse(jsonMatch[0]);
  }
};

const normalizeIntent = (intent, originalCommand = '') => {
  const base = {
    type: 'read_page',
    description: 'Read page content',
    feedback: 'Reading the page now.'
  };
  if (!intent || typeof intent !== 'object') {
    return base;
  }

  const normalized = {
    type: typeof intent.type === 'string' ? intent.type : base.type,
    description: typeof intent.description === 'string' && intent.description.trim()
      ? intent.description
      : base.description,
    feedback: typeof intent.feedback === 'string' && intent.feedback.trim()
      ? intent.feedback
      : base.feedback,
    target: typeof intent.target === 'string' ? intent.target : '',
    fields: intent.fields && typeof intent.fields === 'object' ? intent.fields : {},
    url: typeof intent.url === 'string' ? intent.url : '',
    query: typeof intent.query === 'string' ? intent.query : '',
    direction: intent.direction === 'up' ? 'up' : 'down'
  };

  if (Array.isArray(intent.steps)) {
    normalized.steps = intent.steps
      .filter((step) => step && typeof step === 'object' && typeof step.type === 'string')
      .map((step) => ({
        type: step.type,
        target: typeof step.target === 'string' ? step.target : '',
        selector: typeof step.selector === 'string' ? step.selector : '',
        query: typeof step.query === 'string' ? step.query : '',
        fields: step.fields && typeof step.fields === 'object' ? step.fields : {},
        url: typeof step.url === 'string' ? step.url : '',
        direction: step.direction === 'up' ? 'up' : 'down',
        key: typeof step.key === 'string' ? step.key : '',
        ms: Number.isFinite(step.ms) ? Math.max(0, Math.floor(step.ms)) : 0,
        enabled: typeof step.enabled === 'boolean' ? step.enabled : true
      }));
  }

  if (normalized.steps && normalized.steps.length) {
    normalized.type = 'agent_plan';
  }

  if (!normalized.description || !normalized.feedback) {
    const fallback = getContextualResponse(originalCommand);
    normalized.description = normalized.description || fallback.description;
    normalized.feedback = normalized.feedback || fallback.feedback;
  }

  return normalized;
};

const parseRuleBasedStep = (segment) => {
  const text = (segment || '').trim();
  const lower = text.toLowerCase();
  if (!text) return null;

  if (lower.includes('click') || lower.includes('select')) {
    const match = text.match(/click\s+(?:the\s+)?(.+)/i);
    return {
      type: 'click',
      target: match ? match[1] : 'button'
    };
  }
  if (lower.includes('search') || lower.includes('find')) {
    const match = text.match(/search\s+(?:for\s+)?(.+)/i);
    return {
      type: 'search',
      query: match ? match[1] : 'information'
    };
  }
  if (lower.includes('scroll') || lower.includes('down') || lower.includes('up')) {
    return {
      type: 'scroll',
      direction: lower.includes('up') ? 'up' : 'down'
    };
  }
  if (lower.includes('go to') || lower.includes('navigate') || /^open\s+/.test(lower)) {
    const match = text.match(/(?:go\s+to|navigate\s+to|open)\s+(.+)/i);
    return {
      type: 'navigate',
      url: match ? match[1] : ''
    };
  }
  if (lower.includes('press ') || lower.includes('hit ')) {
    const keyMatch = text.match(/(?:press|hit)\s+([a-z0-9]+)/i);
    return {
      type: 'press',
      key: keyMatch ? keyMatch[1] : 'Enter'
    };
  }
  if (lower.includes('wait')) {
    const msMatch = text.match(/(\d+)\s*(seconds|second|ms|milliseconds?)/i);
    let ms = 1000;
    if (msMatch) {
      const amount = Number(msMatch[1]);
      ms = /sec/i.test(msMatch[2]) ? amount * 1000 : amount;
    }
    return { type: 'wait', ms };
  }
  if (lower.includes('read') || lower.includes('tell') || lower.includes('what')) {
    return { type: 'read' };
  }
  if (lower.includes('hover')) {
    const disabled = lower.includes('off') || lower.includes('disable') || lower.includes('stop');
    return {
      type: 'hover_preview',
      enabled: !disabled
    };
  }

  return null;
};

const getContextualResponse = (command) => {
  const normalizedCommand = typeof command === 'string' ? command : '';
  const cmd = normalizedCommand.toLowerCase();
  const multiSegments = normalizedCommand
    .split(/\b(?:and then|after that|then|and)\b|,/i)
    .map((part) => part.trim())
    .filter(Boolean);

  if (multiSegments.length > 1) {
    const steps = multiSegments
      .map(parseRuleBasedStep)
      .filter(Boolean);
    if (steps.length) {
      return {
        type: 'agent_plan',
        description: 'Execute multi-step command',
        feedback: 'Got it. Executing your request now.',
        steps
      };
    }
  }

  if (cmd.includes('hover') && (cmd.includes('product') || cmd.includes('preview') || cmd.includes('voice'))) {
    const disabled = cmd.includes('off') || cmd.includes('disable') || cmd.includes('stop');
    return {
      type: 'agent_plan',
      description: disabled ? 'Disable hover product preview' : 'Enable hover product preview',
      feedback: disabled ? 'Product hover voice preview turned off.' : 'Product hover voice preview turned on.',
      steps: [{ type: 'hover_preview', enabled: !disabled }]
    };
  }

  if (cmd.includes('read') || cmd.includes('what') || cmd.includes('tell')) {
    return {
      type: 'read_page',
      description: 'Read page content',
      feedback: 'Reading the page now.',
      steps: [{ type: 'read' }]
    };
  } else if (cmd.includes('click') || cmd.includes('select')) {
    const match = normalizedCommand.match(/click\s+(?:the\s+)?(.+)/i);
    const target = match ? match[1] : 'button';
    return {
      type: 'click',
      target,
      description: `Click on ${target}`,
      feedback: `Clicked ${target}.`,
      steps: [{ type: 'click', target }]
    };
  } else if (cmd.includes('search') || cmd.includes('find')) {
    const match = normalizedCommand.match(/search\s+(?:for\s+)?(.+)/i);
    const query = match ? match[1] : 'information';
    return {
      type: 'search',
      query,
      description: `Search for ${query}`,
      feedback: `Searching for ${query}.`,
      steps: [{ type: 'search', query }]
    };
  } else if (cmd.includes('scroll') || cmd.includes('down') || cmd.includes('up')) {
    const direction = cmd.includes('up') ? 'up' : 'down';
    return {
      type: 'scroll',
      direction,
      description: `Scroll ${direction}`,
      feedback: `Scrolled ${direction}.`,
      steps: [{ type: 'scroll', direction }]
    };
  } else if (cmd.includes('go to') || cmd.includes('navigate')) {
    const match = normalizedCommand.match(/go\s+to\s+(.+)/i);
    const url = match ? match[1] : 'home';
    return {
      type: 'navigate',
      url,
      description: `Navigate to ${url}`,
      feedback: `Navigating to ${url}.`,
      steps: [{ type: 'navigate', url }]
    };
  } else if (cmd.includes('press ') || cmd.includes('hit ')) {
    const step = parseRuleBasedStep(normalizedCommand);
    const key = step && step.key ? step.key : 'Enter';
    return {
      type: 'agent_plan',
      description: `Press ${key}`,
      feedback: `Pressed ${key}.`,
      steps: [{ type: 'press', key }]
    };
  } else if (cmd.includes('wait')) {
    const step = parseRuleBasedStep(normalizedCommand);
    const ms = step && step.ms ? step.ms : 1000;
    return {
      type: 'agent_plan',
      description: 'Wait briefly',
      feedback: 'Paused briefly.',
      steps: [{ type: 'wait', ms }]
    };
  } else {
    return {
      type: 'read_page',
      description: 'Default action',
      feedback: 'Processing your request.',
      steps: [{ type: 'read' }]
    };
  }
};

module.exports = { analyzeCommand };
