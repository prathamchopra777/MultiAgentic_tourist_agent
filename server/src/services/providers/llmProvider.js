class LLMProvider {
  /**
   * Calls the LLM to get structured output.
   * @param {string} systemInstruction 
   * @param {string} userText 
   * @param {object} modelConfig { primaryModel, fallbackModel }
   * @param {object} schema optional JSON schema object if supported
   * @param {any} fallbackValue value to return if all retries fail
   * @param {number} temperature 
   */
  async callStructured(systemInstruction, userText, modelConfig, schema, fallbackValue, temperature = 0, options = {}) {
    throw new Error('Not implemented');
  }

  async callRaw(systemInstruction, userText, modelConfig, temperature = 0) {
    throw new Error('Not implemented');
  }
}

module.exports = LLMProvider;
