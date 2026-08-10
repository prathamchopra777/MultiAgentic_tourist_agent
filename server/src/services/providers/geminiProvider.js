const { GoogleGenAI } = require('@google/genai');
const LLMProvider = require('./llmProvider');

class GeminiProvider extends LLMProvider {
  constructor() {
    super();
    this.apiKey = process.env.GEMINI_API_KEY;
    if (this.apiKey) {
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    }
  }

  async _callRawInternal(systemInstruction, userText, modelName, temperature = 0) {
    if (!this.ai) throw new Error('GEMINI_API_KEY is missing');
    const response = await this.ai.models.generateContent({
        model: modelName,
        contents: userText,
        config: {
            systemInstruction: systemInstruction,
            temperature: temperature
        }
    });
    return response.text;
  }

  async callRaw(systemInstruction, userText, modelConfig, temperature = 0) {
      const { primaryModel, fallbackModel } = modelConfig;
      try {
          return await this._callRawInternal(systemInstruction, userText, primaryModel, temperature);
      } catch (e) {
          if (fallbackModel) {
              console.warn(`[Gemini Provider] Primary model failed, falling back to ${fallbackModel}`);
              return await this._callRawInternal(systemInstruction, userText, fallbackModel, temperature);
          }
          throw e;
      }
  }

  async callStructured(systemInstruction, userText, modelConfig, schema, fallbackValue, temperature = 0, options = {}) {
    if (!this.ai) {
        if (fallbackValue !== undefined) return fallbackValue;
        throw new Error('GEMINI_API_KEY is missing');
    }

    const { primaryModel, fallbackModel } = modelConfig;
    
    const validateSchema = (data) => {
        if (!schema || !Array.isArray(schema)) return true;
        if (typeof data !== 'object' || data === null) return false;
        for (const key of schema) {
            if (!(key in data)) return false;
        }
        return true;
    };

    let attempts = 0;
    let currentPrompt = userText;

    while (attempts < 3) {
      attempts++;
      const isFallbackAttempt = attempts === 3;
      const modelToUse = (isFallbackAttempt && fallbackModel) ? fallbackModel : primaryModel;
      
      try {
        if (isFallbackAttempt) {
             console.warn(`[Retry 2] Primary model failed. Falling back to ${fallbackModel}...`);
        }
        
        const response = await this.ai.models.generateContent({
            model: modelToUse,
            contents: currentPrompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                temperature: temperature
            }
        });
        
        let parsedResult;
        try {
            parsedResult = JSON.parse(response.text);
        } catch (e) {
            parsedResult = null;
        }
        
        if (parsedResult && validateSchema(parsedResult)) {
            return parsedResult;
        }

        if (attempts === 1) {
            console.warn(`[Retry 1] Primary model ${primaryModel} returned invalid JSON or missing schema keys. Retrying with correction prompt...`);
            currentPrompt = `${userText}\n\nWARNING: Your previous response was invalid JSON or missing required schema keys. You must return perfectly valid JSON matching the exact schema requested.`;
        }
      } catch (e) {
        console.warn(`[Attempt ${attempts}] Model ${modelToUse} failed with error:`, e.message);
      }
    }

    console.error(`[Fatal] All attempts to generate structured output failed.`);
    if (fallbackValue !== undefined) return fallbackValue;
    throw new Error('MODEL_INVALID_STRUCTURED_OUTPUT');
  }
}

module.exports = new GeminiProvider();
