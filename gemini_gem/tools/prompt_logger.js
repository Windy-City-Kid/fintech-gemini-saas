/**
 * Prompt History Logger
 * Stores and retrieves prompt history and RAG logs for audit purposes
 */

import crypto from 'crypto';

/**
 * Log a prompt and response interaction
 * @param {Object} params - Interaction parameters
 * @param {string} params.user_id - User identifier
 * @param {string} params.prompt - User prompt
 * @param {string} params.response - AI response
 * @param {string} params.timestamp - ISO timestamp (optional)
 * @returns {Object} Log entry with hash
 */
function logPromptInteraction({ user_id, prompt, response, timestamp }) {
  const logEntry = {
    user_id,
    prompt,
    response,
    timestamp: timestamp || new Date().toISOString(),
    hash: crypto.createHash('sha256').update(prompt + response).digest('hex'),
  };

  // In production, this would write to a database
  console.log('[PROMPT LOG]:', logEntry);
  
  return {
    status: 'logged',
    hash: logEntry.hash,
    timestamp: logEntry.timestamp,
  };
}

/**
 * Retrieve prompt history for a user
 * @param {Object} params - Query parameters
 * @param {string} params.user_id - User identifier
 * @param {number} params.limit - Maximum number of entries (optional)
 * @returns {Array} Array of log entries
 */
function getPromptHistory({ user_id, limit = 50 }) {
  // In production, this would query a database
  console.log(`[RETRIEVE LOGS]: user_id=${user_id}, limit=${limit}`);
  
  return {
    status: 'success',
    entries: [],
    message: 'Prompt history retrieval - implement database query',
  };
}

export {
  logPromptInteraction,
  getPromptHistory,
};

// CLI interface for direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  // Read from stdin
  let inputData = '';
  process.stdin.setEncoding('utf8');
  
  process.stdin.on('data', (chunk) => {
    inputData += chunk;
  });
  
  process.stdin.on('end', () => {
    try {
      const data = JSON.parse(inputData);
      
      // Handle promptHistory array format
      if (data.promptHistory && Array.isArray(data.promptHistory)) {
        const userMessage = data.promptHistory.find(m => m.role === 'user');
        const assistantMessage = data.promptHistory.find(m => m.role === 'assistant');
        
        if (userMessage && assistantMessage) {
          const result = logPromptInteraction({
            user_id: data.user_id || 'cli-user',
            prompt: userMessage.content,
            response: assistantMessage.content,
            timestamp: data.timestamp,
          });
          
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.error('Error: promptHistory must contain both user and assistant messages');
          process.exit(1);
        }
      } else if (data.user_id && data.prompt && data.response) {
        // Handle direct function call format
        const result = logPromptInteraction(data);
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.error('Error: Invalid input format. Expected promptHistory array or {user_id, prompt, response}');
        process.exit(1);
      }
    } catch (error) {
      console.error('Error parsing JSON:', error.message);
      process.exit(1);
    }
  });
}
