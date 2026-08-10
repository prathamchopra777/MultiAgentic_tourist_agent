require('dotenv').config();
const MenuExtractionService = require('../services/menuExtractionService');

async function test() {
  const service = new MenuExtractionService();
  const url = process.argv[2] || 'https://www.honestgreens.com/en/menu';
  
  console.log('Testing MenuExtractionService on:', url);
  try {
    const result = await service.extractMenu(url);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Test Failed:', err);
  }
  process.exit(0);
}

test();
