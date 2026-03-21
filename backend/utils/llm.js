const axios = require('axios');

// For hackathon MVP, we'll use a simplified LLM integration
// Replace this with actual API calls to OpenAI/Claude

const analyzeCommand = async (command) => {
  try {
    // Check if OpenAI API key is set
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_api_key_here') {
      // Mock response for testing
      return getContextualResponse(command);
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an accessibility AI assistant. Analyze voice commands and determine the user's intent.
            Respond in JSON format with: {"type": "read_page|click|fill_form|navigate|search|scroll", "target": "...", "description": "...", "fields": {...}, "url": "...", "query": "...", "direction": "..."}
            Be concise and focused on what the user wants to do.`
          },
          {
            role: 'user',
            content: command
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
    return JSON.parse(content);
  } catch (error) {
    console.error('LLM error:', error.message);
    // Fallback to contextual response
    return getContextualResponse(command);
  }
};

const getContextualResponse = (command) => {
  const cmd = command.toLowerCase();

  if (cmd.includes('read') || cmd.includes('what') || cmd.includes('tell')) {
    return {
      type: 'read_page',
      description: 'Read page content',
      message: 'Reading page content'
    };
  } else if (cmd.includes('click') || cmd.includes('select')) {
    const match = command.match(/click\s+(?:the\s+)?(.+)/i);
    const target = match ? match[1] : 'button';
    return {
      type: 'click',
      target,
      description: `Click on ${target}`,
      message: `Clicking ${target}`
    };
  } else if (cmd.includes('search') || cmd.includes('find')) {
    const match = command.match(/search\s+(?:for\s+)?(.+)/i);
    const query = match ? match[1] : 'information';
    return {
      type: 'search',
      query,
      description: `Search for ${query}`,
      message: `Searching for ${query}`
    };
  } else if (cmd.includes('scroll') || cmd.includes('down') || cmd.includes('up')) {
    const direction = cmd.includes('up') ? 'up' : 'down';
    return {
      type: 'scroll',
      direction,
      description: `Scroll ${direction}`,
      message: `Scrolling ${direction}`
    };
  } else if (cmd.includes('go to') || cmd.includes('navigate')) {
    const match = command.match(/go\s+to\s+(.+)/i);
    const url = match ? match[1] : 'home';
    return {
      type: 'navigate',
      url,
      description: `Navigate to ${url}`,
      message: `Navigating to ${url}`
    };
  } else {
    return {
      type: 'read_page',
      description: 'Default action',
      message: 'Performing default action'
    };
  }
};

module.exports = { analyzeCommand };
