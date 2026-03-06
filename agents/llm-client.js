/**
 * LLM Client Wrapper
 * Thin wrapper around backend/llm.js for agents to use
 */

const backendLLM = require('../backend/llm');

/**
 * Call LLM with prompt
 * @param {string} prompt - The prompt to send
 * @param {object} options - Optional parameters
 * @returns {Promise<string>} LLM response
 */
async function callLLM(prompt, options = {}) {
  return await backendLLM.callLLM(prompt, options);
}

module.exports = {
  callLLM
};
