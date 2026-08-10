const parseModelJson = require('../utils/parseModelJson');

console.log('--- TEST 1: Conversational Garbage ---');
const text1 = 'We need to inspect the menu first.';
const res1 = parseModelJson(text1);
console.log('Result:', res1);
if (res1.success === false && res1.error === 'MODEL_INVALID_STRUCTURED_OUTPUT') {
  console.log('✅ TEST 1 PASSED\n');
} else {
  console.log('❌ TEST 1 FAILED\n');
}

console.log('--- TEST 2: Valid JSON with Markdown Fences ---');
const text2 = '```json\n{"items": []}\n```';
const res2 = parseModelJson(text2);
console.log('Result:', res2);
if (res2.success === true && Array.isArray(res2.data.items)) {
  console.log('✅ TEST 2 PASSED\n');
} else {
  console.log('❌ TEST 2 FAILED\n');
}

console.log('--- TEST 3: Conversational Garbage surrounding JSON ---');
const text3 = 'Here is the data:\n{"key": "value"}\nHope this helps! [End of response]';
const res3 = parseModelJson(text3);
console.log('Result:', res3);
if (res3.success === true && res3.data.key === 'value') {
  console.log('✅ TEST 3 PASSED\n');
} else {
  console.log('❌ TEST 3 FAILED\n');
}

console.log('--- TEST 4: Empty Array ---');
const text4 = '{"items":[]}';
const res4 = parseModelJson(text4);
console.log('Result:', res4);
if (res4.success === true && Array.isArray(res4.data.items) && res4.data.items.length === 0) {
  console.log('✅ TEST 4 PASSED\n');
} else {
  console.log('❌ TEST 4 FAILED\n');
}
