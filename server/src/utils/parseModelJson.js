function parseModelJson(text) {
  try {
    if (!text || typeof text !== 'string') {
      return { success: false, error: 'MODEL_INVALID_STRUCTURED_OUTPUT' };
    }

    let cleanedText = text.trim();

    // Remove markdown code fences if present
    cleanedText = cleanedText.replace(/```json/g, '').replace(/```/g, '').trim();

    // Find the first JSON structure
    const firstBrace = cleanedText.indexOf('{');
    const firstBracket = cleanedText.indexOf('[');

    let startIdx = -1;
    let isObject = false;

    if (firstBrace !== -1 && firstBracket !== -1) {
      if (firstBrace < firstBracket) {
        startIdx = firstBrace;
        isObject = true;
      } else {
        startIdx = firstBracket;
        isObject = false;
      }
    } else if (firstBrace !== -1) {
      startIdx = firstBrace;
      isObject = true;
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
      isObject = false;
    }

    if (startIdx === -1) {
      return { success: false, error: 'MODEL_INVALID_STRUCTURED_OUTPUT' };
    }

    // Find the last matching brace/bracket
    let endIdx = -1;
    if (isObject) {
      endIdx = cleanedText.lastIndexOf('}');
    } else {
      endIdx = cleanedText.lastIndexOf(']');
    }

    if (endIdx > startIdx) {
      cleanedText = cleanedText.substring(startIdx, endIdx + 1);
    } else {
      return { success: false, error: 'MODEL_INVALID_STRUCTURED_OUTPUT' };
    }

    const parsed = JSON.parse(cleanedText);
    
    // Check if the parsed object is the exact failure case we want to test: {"items":[]}
    if (parsed && Array.isArray(parsed.items) && parsed.items.length === 0) {
       // Allow empty arrays if it's explicitly parsed properly, the validation schema will handle it
    }

    return { success: true, data: parsed };
  } catch (error) {
    return { success: false, error: 'MODEL_INVALID_STRUCTURED_OUTPUT', details: error.message };
  }
}

module.exports = parseModelJson;
