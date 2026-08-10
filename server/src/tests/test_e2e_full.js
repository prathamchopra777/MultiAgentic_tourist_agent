require('dotenv').config();
const RecommendationController = require('../controllers/recommendationController');
const mongoose = require('mongoose');

async function runE2ETest() {
  console.log('--- STARTING E2E TEST ---');
  
  if (process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  }

  // Mock Request and Response for the Controller
  const req = {
    body: {
      query: "Barcelona vegetarian dinner. I want something affordable and I don't like very spicy food."
    }
  };

  const res = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      console.log('\n--- FINAL E2E RECOMMENDATIONS ---');
      console.log(`Status: ${this.statusCode || 200}`);
      console.log(JSON.stringify(data, null, 2));
      process.exit(0);
    }
  };

  try {
    await RecommendationController.getRecommendations(req, res);
  } catch (err) {
    console.error('E2E Test Failed:', err);
    process.exit(1);
  }
}

runE2ETest();
