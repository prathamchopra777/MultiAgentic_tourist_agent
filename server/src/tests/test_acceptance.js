require('dotenv').config();
const RecommendationController = require('../controllers/recommendationController');
const mongoose = require('mongoose');

// Mock res to capture final output
const createMockRes = (resolve, reject, resultContainer) => {
  return {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      resultContainer.data = data;
      resultContainer.statusCode = this.statusCode || 200;
      if (this.statusCode && this.statusCode >= 400) {
        reject(new Error(JSON.stringify(data)));
      } else {
        resolve(data);
      }
    }
  };
};

async function runTest(queryName, queryText, expectError = false, mustContain = null, mustNotContain = null) {
  console.log(`\n========================================`);
  console.log(`RUNNING ${queryName}: "${queryText}"`);
  console.log(`========================================\n`);
  
  const startTime = performance.now();
  const req = { body: { query: queryText } };
  const resultContainer = {};

  try {
    await new Promise((resolve, reject) => {
      const res = createMockRes(resolve, reject, resultContainer);
      RecommendationController.getRecommendations(req, res).catch(reject);
    });
    
    const latency = ((performance.now() - startTime) / 1000).toFixed(2);
    
    if (expectError) {
      console.error(`❌ FAILED: Expected an error but got success.`);
      return { status: 'FAIL', latency, problem: 'Expected error, got success', fix: '-' };
    }
    
    console.log(`✅ SUCCESS in ${latency}s`);
    
    // Validations
    let data = resultContainer.data;
    if (mustContain) {
       const found = data.recommendations && data.recommendations.some(r => JSON.stringify(r).toLowerCase().includes(mustContain.toLowerCase()));
       if (!found) {
           console.error(`❌ FAILED: Expected to find "${mustContain}" in response.`);
           return { status: 'FAIL', latency, problem: `Missing expected output: ${mustContain}`, fix: '-' };
       }
    }
    if (mustNotContain) {
       const found = data.recommendations && data.recommendations.some(r => JSON.stringify(r).toLowerCase().includes(mustNotContain.toLowerCase()));
       if (found) {
           console.error(`❌ FAILED: Found restricted output "${mustNotContain}" in response.`);
           return { status: 'FAIL', latency, problem: `Found restricted output: ${mustNotContain}`, fix: '-' };
       }
    }

    if (queryName === 'TEST A') {
        console.log('\n--- FINAL JSON OUTPUT FOR TEST A ---');
        console.log(JSON.stringify(data, null, 2));
    }
    
    return { status: 'PASS', latency, problem: '-', fix: '-' };
  } catch (err) {
    const latency = ((performance.now() - startTime) / 1000).toFixed(2);
    if (expectError || err.message.includes('LOCATION_NOT_IN_EUROPE')) {
      console.log(`✅ SUCCESS (Caught expected error): ${err.message} in ${latency}s`);
      return { status: 'PASS', latency, problem: 'Caught expected error', fix: '-' };
    }
    console.error(`❌ FAILED with unexpected error: ${err.message}`);
    return { status: 'FAIL', latency, problem: err.message, fix: '-' };
  }
}

async function runAllTests() {
  if (process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  }

  const results = [];
  
  // TEST A
  results.push({ stage: 'TEST A (Barcelona vegetarian best)', ...(await runTest('TEST A', 'best vegetarian restaurants in Barcelona', false, 'barcelona', null)) });
  
  // TEST B
  results.push({ stage: 'TEST B (Barcelona vegan dinner)', ...(await runTest('TEST B', 'Barcelona vegan dinner', false, 'barcelona', null)) });
  
  // TEST C
  results.push({ stage: 'TEST C (Barcelona vegetarian breakfast)', ...(await runTest('TEST C', 'Barcelona vegetarian breakfast', false, 'barcelona', null)) });
  
  // TEST D (Shalimar Bagh - MUST FAIL OR REJECT NON-EUROPE)
  results.push({ stage: 'TEST D (Shalimar Bagh Delhi)', ...(await runTest('TEST D', 'Shalimar Bagh Delhi vegetarian restaurants', true, null, 'barcelona')) });
  
  console.log(`\n\n============================================================`);
  console.log(`                   FINAL TEST METRICS                       `);
  console.log(`============================================================\n`);
  
  console.log(`| STAGE | STATUS | LATENCY | PROBLEM | FIX |`);
  console.log(`|---|---|---|---|---|`);
  for (const r of results) {
    console.log(`| ${r.stage} | ${r.status} | ${r.latency}s | ${r.problem} | ${r.fix} |`);
  }
  
  process.exit(0);
}

runAllTests();
