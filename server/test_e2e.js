require('dotenv').config();
const mongoose = require('mongoose');
const RecommendationController = require('./src/controllers/recommendationController');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const req = { body: { query: 'Barcelona vegetarian dinner' } };
  const res = {
    status: (code) => {
      console.log('STATUS:', code);
      return { json: (data) => console.log('RESPONSE JSON:', JSON.stringify(data, null, 2)) };
    },
    json: (data) => console.log('RESPONSE JSON:', JSON.stringify(data, null, 2))
  };

  try {
    await RecommendationController.getRecommendations(req, res);
  } catch (err) {
    console.error('ERROR IN CONTROLLER:', err);
  } finally {
    mongoose.disconnect();
  }
}

run();
