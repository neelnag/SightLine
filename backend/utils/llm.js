const axios = require('axios');

// For hackathon MVP, we'll use a simplified LLM integration
// Replace this with actual API calls to OpenAI/Claude

const analyzeCommand = async (command) => {
  try {
    const safeCommand = typeof command === 'string' ? command : '';
    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

    // Check if OpenAI API key is set
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_api_key_here') {
      // Mock response for testing
      return getContextualResponse(safeCommand);
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages: [
          {
            role: 'system',
            content: `You are an accessibility AI assistant. Analyze the user's voice command and return ONLY valid JSON.
            Your response must include:
            {
              "type": "read_page|click|fill_form|navigate|search|scroll",
              "target": "...",
              "description": "...",
              "feedback": "...",
              "fields": {...},
              "url": "...",
              "query": "...",
              "direction": "up|down"
            }
            Requirements:
            - "description" should be clear and specific.
            - "feedback" should be user-friendly and descriptive (1-2 sentences) for screen-reader users.
            - If data is not relevant, return an empty string for that field.`
          },
          {
            role: 'user',
            content: safeCommand
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    return extractIntentFromResponse(content);
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

const getContextualResponse = (command) => {
  const normalizedCommand = typeof command === 'string' ? command : '';
  const cmd = normalizedCommand.toLowerCase();

  if (cmd.includes('read') || cmd.includes('what') || cmd.includes('tell')) {
    return {
      type: 'read_page',
      description: 'Read page content',
      feedback: 'I am reading the page content now and will summarize the most relevant information.'
    };
  } else if (cmd.includes('click') || cmd.includes('select')) {
    const match = normalizedCommand.match(/click\s+(?:the\s+)?(.+)/i);
    const target = match ? match[1] : 'button';
    return {
      type: 'click',
      target,
      description: `Click on ${target}`,
      feedback: `I am clicking ${target} for you now.`
    };
  } else if (cmd.includes('search') || cmd.includes('find')) {
    const match = normalizedCommand.match(/search\s+(?:for\s+)?(.+)/i);
    const query = match ? match[1] : 'information';
    return {
      type: 'search',
      query,
      description: `Search for ${query}`,
      feedback: `I am searching for ${query} and preparing the results.`
    };
  } else if (cmd.includes('scroll') || cmd.includes('down') || cmd.includes('up')) {
    const direction = cmd.includes('up') ? 'up' : 'down';
    return {
      type: 'scroll',
      direction,
      description: `Scroll ${direction}`,
      feedback: `I am scrolling ${direction} so you can continue navigating the page.`
    };
  } else if (cmd.includes('go to') || cmd.includes('navigate')) {
    const match = normalizedCommand.match(/go\s+to\s+(.+)/i);
    const url = match ? match[1] : 'home';
    return {
      type: 'navigate',
      url,
      description: `Navigate to ${url}`,
      feedback: `I am navigating to ${url} now.`
    };
  } else {
    return {
      type: 'read_page',
      description: 'Default action',
      feedback: 'I will read the current page and provide a helpful summary.'
    };
  }
};

module.exports = { analyzeCommand };
