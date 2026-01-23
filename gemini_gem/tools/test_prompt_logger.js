/**
 * Test script for prompt_logger.js
 * Simulates calling the prompt logger with sample data
 */

import { logPromptInteraction, getPromptHistory } from './prompt_logger.js';

// Test data matching the user's example
const testData = {
  user_id: 'test-user-123',
  prompt: "What's the current status of my savings?",
  response: "Your current savings are $12,300 across three accounts.",
  timestamp: new Date().toISOString(),
};

console.log('🧪 Testing prompt_logger.js...\n');

// Test logging an interaction
console.log('1. Testing logPromptInteraction:');
const result = logPromptInteraction(testData);
console.log('Result:', JSON.stringify(result, null, 2));

console.log('\n2. Testing getPromptHistory:');
const history = getPromptHistory({ user_id: 'test-user-123', limit: 10 });
console.log('Result:', JSON.stringify(history, null, 2));

console.log('\n✅ Prompt logger test completed!');
