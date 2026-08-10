const nvidiaProvider = require('./providers/nvidiaProvider');
const geminiProvider = require('./providers/geminiProvider');

class ModelRouter {
  getProvider() {
     if (process.env.PRIMARY_LLM_PROVIDER === 'gemini' && process.env.GEMINI_API_KEY) {
         return geminiProvider;
     }
     return nvidiaProvider;
  }

  getFastModelConfig() {
    if (process.env.PRIMARY_LLM_PROVIDER === 'gemini') {
        return {
           primaryModel: process.env.GEMINI_FAST_MODEL || 'gemini-1.5-flash',
           fallbackModel: process.env.GEMINI_SUPER_MODEL || 'gemini-1.5-pro'
        };
    }
    return {
       primaryModel: process.env.NVIDIA_NANO_MODEL || 'nvidia/nemotron-3-nano-30b-a3b',
       fallbackModel: process.env.NVIDIA_SUPER_MODEL || 'nvidia/nemotron-3-super-120b-a12b'
    };
  }

  getReasoningModelConfig() {
    if (process.env.PRIMARY_LLM_PROVIDER === 'gemini') {
        return {
           primaryModel: process.env.GEMINI_SUPER_MODEL || 'gemini-1.5-pro',
           fallbackModel: process.env.GEMINI_FAST_MODEL || 'gemini-1.5-flash'
        };
    }
    return {
       primaryModel: process.env.NVIDIA_SUPER_MODEL || 'nvidia/nemotron-3-super-120b-a12b',
       fallbackModel: process.env.NVIDIA_ULTRA_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b'
    };
  }
}

module.exports = new ModelRouter();
