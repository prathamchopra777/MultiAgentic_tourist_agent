require('dotenv').config();
const ai = require('./src/services/aiOrchestrationService');
ai.parseIntent('Barcelona vegetarian dinner')
  .then(res => console.log('RESULT:', res))
  .catch(err => console.error('ERROR:', err));
