const axios = require('axios');
const LLMProvider = require('./llmProvider');
const parseModelJson = require('../../utils/parseModelJson');

class NvidiaProvider extends LLMProvider {
  constructor() {
    super();
    this.apiKey = process.env.NVIDIA_API_KEY;
    this.baseURL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
  }

  async _callRawInternal(systemInstruction, userText, modelName, temperature = 0) {
    try {
      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: modelName,
        messages: [
          { role: 'system', content: systemInstruction + '\n\nIMPORTANT: YOU MUST RETURN ONLY RAW VALID JSON! NO MARKDOWN! NO CODE BLOCKS! JUST JSON!' },
          { role: 'user', content: userText }
        ],
        temperature: temperature,
        max_tokens: 4096,
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      if (error.response) {
         console.error(`NVIDIA API Error [${modelName}]:`, error.response.status, JSON.stringify(error.response.data).substring(0, 200));
      }
      throw error;
    }
  }

  async callRaw(systemInstruction, userText, modelConfig, temperature = 0) {
      const { primaryModel, fallbackModel } = modelConfig;
      try {
          return await this._callRawInternal(systemInstruction, userText, primaryModel, temperature);
      } catch (e) {
          if (fallbackModel) {
              console.warn(`[NVIDIA Provider] Primary model failed, falling back to ${fallbackModel}`);
              return await this._callRawInternal(systemInstruction, userText, fallbackModel, temperature);
          }
          throw e;
      }
  }

  async callStructured(systemInstruction, userText, modelConfig, schema, fallbackValue, temperature = 0, options = {}) {
    const { primaryModel, fallbackModel } = modelConfig;
    
    const validateSchema = (data) => {
        if (!schema || !Array.isArray(schema)) return true; // No validation required
        if (typeof data !== 'object' || data === null) return false;
        for (const key of schema) {
            if (!(key in data)) return false;
        }
        return true;
    };

    let attempts = 0;
    let currentPrompt = userText;
    const maxAttempts = options.maxAttempts || 3;

    while (attempts < maxAttempts) {
      attempts++;
      const isFallbackAttempt = attempts === maxAttempts;
      const modelToUse = (isFallbackAttempt && options.fallbackModel !== null) ? (fallbackModel || primaryModel) : primaryModel;
      
      try {
        if (isFallbackAttempt && fallbackModel && options.fallbackModel !== null) {
             console.warn(`[Retry ${attempts}] Primary model failed. Falling back to ${fallbackModel}...`);
        } else if (isFallbackAttempt) {
             console.warn(`[Retry ${attempts}] Retrying with primary model ${primaryModel}...`);
        }
        
        const startTime = Date.now();
        let rawResponse = '';
        let finishReason = 'unknown';
        let httpStatus = 200;

        try {
            const response = await axios.post(`${this.baseURL}/chat/completions`, {
                model: modelToUse,
                messages: [
                  { role: 'system', content: systemInstruction + '\n\nIMPORTANT: YOU MUST RETURN ONLY RAW VALID JSON! NO MARKDOWN! NO CODE BLOCKS! JUST JSON!' },
                  { role: 'user', content: currentPrompt }
                ],
                temperature: temperature,
                max_tokens: options.maxTokens || 4096,
            }, {
                headers: {
                  'Authorization': `Bearer ${this.apiKey}`,
                  'Content-Type': 'application/json'
                },
                timeout: 90000
            });
            rawResponse = response.data.choices[0].message.content.trim();
            finishReason = response.data.choices[0].finish_reason || 'stop';
        } catch (apiError) {
            httpStatus = apiError.response ? apiError.response.status : 'network_error';
            throw apiError; // Handled by outer try/catch
        }

        const latency = Date.now() - startTime;
        let parsedResult = parseModelJson(rawResponse);
        const schemaValid = parsedResult.success ? validateSchema(parsedResult.data) : false;

        if (options.logTag === 'FINAL_RANKING') {
            console.log(`\n[FINAL_RANKING]
candidatesBeforePreRank: ${options.candidatesBeforePreRank || 0}
candidatesSentToLLM: ${options.candidatesSentToLLM || 0}
inputCharacters: ${currentPrompt.length}
estimatedInputTokens: ${Math.ceil(currentPrompt.length / 4)}
maxTokens: ${options.maxTokens || 4096}
latency: ${latency}ms
finishReason: ${finishReason}
jsonValid: ${parsedResult.success}
schemaValid: ${schemaValid}`);
        }

        console.log(`\n[LLM_CALL]
stage=${options.logTag || 'UNKNOWN'}
model=${modelToUse}
latency=${latency}ms
status=${httpStatus}
finish=${finishReason}
json=${parsedResult.success}
schema=${schemaValid}
attempt=${attempts}`);

        if (parsedResult.success && schemaValid) {
            return parsedResult.data;
        }

        if (!schemaValid && parsedResult.success) {
             console.warn(`[LLM_CALL] Schema Validation Failed. Keys missing.`);
        }

        if (attempts === 1) {
            console.warn(`[Retry 1] Primary model ${primaryModel} returned invalid JSON or missing schema keys. Retrying with correction prompt...`);
            currentPrompt = `${userText}\n\nWARNING: Your previous response was invalid JSON or missing required schema keys. You must return perfectly valid JSON matching the exact schema requested.`;
        }
      } catch (e) {
        const status = e.response ? e.response.status : 'Timeout/Network';
        console.warn(`[Attempt ${attempts}] Model ${modelToUse} failed with error: ${e.message} | HTTP Status: ${status}`);
      }
    }

    console.error(`[Fatal] All attempts to generate structured output failed.`);
    if (fallbackValue !== undefined) return fallbackValue;
    throw new Error('MODEL_INVALID_STRUCTURED_OUTPUT');
  }
}

module.exports = new NvidiaProvider();
