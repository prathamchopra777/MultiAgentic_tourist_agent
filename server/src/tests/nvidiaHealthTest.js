const axios = require('axios');
require('dotenv').config();

async function runNvidiaHealthTest(modelName) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    console.error('ERROR: NVIDIA_API_KEY is not set in the environment variables.');
    process.exit(1);
  }

  const baseURL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
  const url = `${baseURL}/chat/completions`;

  const requestBody = {
    model: modelName,
    messages: [
      {
        role: 'user',
        content: 'Return ONLY this JSON:\n{\n  "ok": true,\n  "message": "NVIDIA connection works"\n}'
      }
    ],
    temperature: 0,
    max_tokens: 100,
    stream: false
  };

  console.log('--- NVIDIA HEALTH TEST ---');
  console.log(`URL: ${url}`);
  console.log(`Model: ${modelName}`);

  const startTime = Date.now();
  
  try {
    const response = await axios.post(url, requestBody, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60s for diagnostic
    });

    const latency = Date.now() - startTime;
    const choice = response.data.choices[0];

    console.log('--- SUCCESS ---');
    console.log(`Model: ${modelName}`);
    console.log(`HTTP Status: ${response.status}`);
    console.log(`Latency: ${latency}ms`);
    console.log(`Finish Reason: ${choice.finish_reason}`);
    console.log(`Response Content: ${choice.message.content}`);
    
  } catch (error) {
    const latency = Date.now() - startTime;
    console.log('--- ERROR ---');
    console.log(`Model: ${modelName}`);
    console.log(`Latency: ${latency}ms`);
    
    if (error.response) {
      console.log(`HTTP Status: ${error.response.status}`);
      console.log(`Error Message: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`HTTP Status: Network/Timeout`);
      console.log(`Error Message: ${error.message}`);
    }
  }
}

const args = process.argv.slice(2);
const modelName = args[0] || 'nvidia/nemotron-3-nano-30b-a3b';
runNvidiaHealthTest(modelName);
