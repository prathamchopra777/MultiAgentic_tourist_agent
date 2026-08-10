const modelRouter = require('./modelRouter');

class AIOrchestrationService { 

  async parseIntent(query) {
    console.log('AIOrchestrationService.parseIntent - Input:', query);
    const systemInstruction = `You are an expert intent parser for a European restaurant recommendation agent.
    Extract the requirements into a structured JSON format.
    CRITICAL: Ensure 'isEurope' is true ONLY if the requested location is a city within Europe. 
    If the location is not in Europe, set 'isEurope' to false.
    
    Required JSON Schema:
    {
      "city": "string",
      "country": "string",
      "isEurope": boolean,
      "area": "string|null",
      "meal": "string|null",
      "diet": ["string"],
      "cuisine": ["string"],
      "budget": { "currency": "string", "min": number|null, "max": number|null } | null,
      "spicePreference": "string|null",
      "distancePreference": "string|null",
      "additionalPreferences": ["string"],
      "allergies": ["string"]
    }`;
    
    const provider = modelRouter.getProvider();
    const config = modelRouter.getFastModelConfig();
    return await provider.callStructured(systemInstruction, `Parse the following user query for restaurant recommendations: "${query}"`, config, ['city', 'country', 'isEurope'], null, 0);
  }

  async parseMenuStructure(rawText) {
    console.log('AIOrchestrationService.parseMenuStructure - Parsing structure...');
    const systemInstruction = `You are a strict menu parsing agent. Extract the food items, their names, description, and price.
    Prices are critical and MUST NOT be invented.
    If a price cannot be verified from the text, you MUST output price: null. NEVER guess a missing price.
    DO NOT group items. Return a flat list of individual dishes.
    Limit your extraction to a MAXIMUM of 5 items.
    Do not output any reasoning or thinking steps. Just output the JSON.
    
    Required JSON Schema:
    {
      "items": [
        {
          "name": "string",
          "description": "string",
          "price": "number|null"
        }
      ]
    }`;
    
    const provider = modelRouter.getProvider();
    const config = modelRouter.getFastModelConfig();
    const res = await provider.callStructured(systemInstruction, `Extract menu items strictly from the following text:\n\n${rawText}`, config, ['items'], { items: [] }, 0);
    return res.items || [];
  }

  async translateMenuItems(menuItems, restaurantName = 'unknown') {
    if (!menuItems || menuItems.length === 0) return [];
    
    const itemsToTranslate = menuItems.map(item => ({
      name: item.name,
      description: item.description
    }));
    
    const systemInstruction = `You are an expert translation agent. Translate the food items and their descriptions from their original language to English.
    
    Required JSON Schema:
    {
      "translations": [
        {
          "name": "string",
          "translatedName": "string",
          "translatedDescription": "string|null"
        }
      ]
    }`;
    
    const provider = modelRouter.getProvider();
    const config = modelRouter.getFastModelConfig();
    const res = await provider.callStructured(systemInstruction, `Translate the following items:\n${JSON.stringify(itemsToTranslate)}`, config, ['translations'], { translations: [] }, 0);
    
    const translationsMap = {};
    (res.translations || []).forEach(t => {
      translationsMap[t.name] = t;
    });

    console.log(`\n[TRANSLATION]
restaurant=${restaurantName}
itemsTranslated=${(res.translations || []).length}
sourceLanguage=auto
targetLanguage=en
status=success`);

    return menuItems.map(item => {
      const translation = translationsMap[item.name] || {};
      return {
        ...item,
        originalName: item.name,
        originalDescription: item.description || null,
        name: translation.translatedName || item.name,
        description: translation.translatedDescription || item.description || null,
        translatedName: translation.translatedName || item.name,
        translatedDescription: translation.translatedDescription || null
      };
    });
  }

  async classifyDietaryProperties(menuItems, restaurantName = 'unknown') {
    if (!menuItems || menuItems.length === 0) return [];
    
    const itemsToClassify = menuItems.map(item => ({
      name: item.translatedName || item.name,
      description: item.translatedDescription || item.description
    }));

    const systemInstruction = `You are a strict dietary classification agent. Determine if the item is vegetarian and/or vegan strictly based on its description/ingredients.
    If the ingredients are unknown and it is not obviously vegetarian/vegan, you MUST output null (unknown). Do not hallucinate ingredients.
    
    Required JSON Schema:
    {
      "classifications": [
        {
          "name": "string",
          "vegetarian": boolean|null,
          "vegan": boolean|null,
          "classificationConfidence": number
        }
      ]
    }`;
    
    const provider = modelRouter.getProvider();
    const config = modelRouter.getFastModelConfig();
    const res = await provider.callStructured(systemInstruction, `Classify the following items:\n${JSON.stringify(itemsToClassify)}`, config, ['classifications'], { classifications: [] }, 0);
    
    const classMap = {};
    (res.classifications || []).forEach(c => {
      classMap[c.name] = c;
    });

    const classifiedItems = menuItems.map(item => {
      const classification = classMap[item.translatedName || item.name] || {};
      return {
        ...item,
        dietaryStatus: (classification.vegetarian === true || classification.vegan === true) ? 'vegetarian/vegan' : (classification.vegetarian === false ? 'non-vegetarian' : 'unknown'),
        vegetarian: classification.vegetarian !== undefined ? classification.vegetarian : null,
        vegan: classification.vegan !== undefined ? classification.vegan : null,
        classificationConfidence: classification.classificationConfidence || 0
      };
    });

    const vegCount = classifiedItems.filter(i => i.vegetarian === true).length;
    const veganCount = classifiedItems.filter(i => i.vegan === true).length;
    const unknownCount = classifiedItems.filter(i => i.vegetarian === null && i.vegan === null).length;

    console.log(`\n[DIETARY]
restaurant=${restaurantName}
itemsAnalyzed=${classifiedItems.length}
vegetarianItems=${vegCount}
veganItems=${veganCount}
unknownItems=${unknownCount}`);

    return classifiedItems;
  }

  async analyzeReviews(reviewsText, userContext, restaurantName = 'unknown') {
    const systemInstruction = `You are an expert restaurant review analyst.
    Analyze the reviews and provide insights based on the user's specific context and preferences.
    Also extract general positive and negative themes.
    
    Required JSON Schema:
    {
      "positiveInsights": ["string"],
      "negativeInsights": ["string"],
      "contextualInsights": ["string"],
      "matchScore": number
    }`;
    
    const provider = modelRouter.getProvider();
    const config = modelRouter.getFastModelConfig();
    const result = await provider.callStructured(systemInstruction, `User Context: ${JSON.stringify(userContext)}\n\nReviews:\n${reviewsText}`, config, ['positiveInsights', 'negativeInsights', 'contextualInsights', 'matchScore'], {
      positiveInsights: [], negativeInsights: [], contextualInsights: [], matchScore: 50
    }, 0.2);

    console.log(`\n[REVIEWS]
restaurant=${restaurantName}
sources=Google Places
positiveThemes=${(result.positiveInsights || []).length}
negativeThemes=${(result.negativeInsights || []).length}
contextRelevantThemes=${(result.contextualInsights || []).length}
status=${result.positiveInsights?.length > 0 ? 'success' : 'unavailable'}`);

    return result;
  }

  async verifyMenuCandidate(restaurantName, locationContext, pageTitle, snippet) {
    console.log(`AIOrchestrationService.verifyMenuCandidate - Verifying page for: ${restaurantName}`);
    
    const systemInstruction = `You are a strict Verification Agent. Your job is to determine if a web page is the actual menu for a specific restaurant.
    You must return a JSON object with 'isMenu' (boolean) and 'reason' (string).
    
    RULES:
    - If the page is a blog post, an article (e.g. "Best places to eat"), a city guide, or a generic landing page without food items, return false.
    - If the page does not appear to belong to the requested restaurant in the specified location, return false.
    - The page title containing the word "Menu" or "Food" is NOT sufficient evidence.
    - You must find actual menu evidence: dish names, food descriptions, prices, menu sections, or ingredient info.
    - If the page lists actual food dishes and belongs to the restaurant, return true.
    
    Required JSON Schema:
    {
      "isMenu": boolean,
      "reason": "string"
    }`;
    
    const userText = `Location: ${locationContext.city}, ${locationContext.country}
Restaurant Name: ${restaurantName}
Page Title: ${pageTitle}

Page Snippet (first 2000 chars):
${snippet}`;

    try {
      const provider = modelRouter.getProvider();
      const config = modelRouter.getFastModelConfig();
      const res = await provider.callStructured(systemInstruction, userText, config, ['isMenu', 'reason'], { isMenu: false, reason: "Fallback failure" }, 0);
      return res;
    } catch (e) {
      return { isMenu: false, reason: "Verification crashed" };
    }
  }

  // Final Ranking
  async rankAndRecommend(enrichedRestaurants, structuredRequirements) {
    console.log('AIOrchestrationService.rankAndRecommend - Generating final rankings');
    
    // Deterministic Pre-Ranking
    const preRanked = [...enrichedRestaurants].sort((a, b) => {
        const scoreA = (a.reviewInsights?.matchScore || 50) + (a.menuItems?.length ? 20 : 0) + ((a.rating || 0) * 5);
        const scoreB = (b.reviewInsights?.matchScore || 50) + (b.menuItems?.length ? 20 : 0) + ((b.rating || 0) * 5);
        return scoreB - scoreA;
    });
    const topCandidates = preRanked.slice(0, 8);

    const systemInstruction = `You are the final recommendation agent for a restaurant app.
Given a list of validated candidates, select and order the best <= 5 candidates according to the user's request.
Return the top recommendations ranked best to worst.
Score must be 0-100.
Reason must be <= 25 words explaining why it matches the user's specific criteria.

CRITICAL: 
- Return ONLY valid JSON matching the schema. 
- Maximum 5 recommendations.
- NO markdown (e.g. \`\`\`json). 
- NO explanations outside the JSON. 
- NO chain-of-thought.

Required JSON Schema:
{
  "recommendations": [
    {
      "restaurantId": "string",
      "rank": number,
      "score": number,
      "reason": "string"
    }
  ]
}`;
    
    try {
       const provider = modelRouter.getProvider();
       const config = modelRouter.getReasoningModelConfig();
       
       const compactRestaurants = topCandidates.map(r => {
           console.log(`\n[FINAL_RANKING_INPUT]
restaurant=${r.name}
menuVerified=${r.menuStatus === 'verified'}
menuUrl=${r.menuUrl?.url || 'none'}
menuItems=${(r.menuItems || []).length}
pricedItems=${(r.menuItems || []).filter(i => i.price !== null && i.price !== undefined).length}
vegetarianItems=${(r.menuItems || []).filter(i => i.vegetarian === true).length}
veganItems=${(r.menuItems || []).filter(i => i.vegan === true).length}
positiveReviews=${(r.reviewInsights?.positiveInsights || []).length}
negativeReviews=${(r.reviewInsights?.negativeInsights || []).length}
contextReviews=${(r.reviewInsights?.contextualInsights || []).length}`);

           return {
               restaurantId: r.placeId,
               name: r.name,
               address: r.address,
               rating: r.rating,
               reviewCount: r.reviewCount,
               distanceKm: r.distanceKm || undefined,
               menuVerified: r.menuStatus === 'verified',
               dietaryMatch: r.menuItems ? r.menuItems.some(i => i.vegetarian || i.vegan) : false,
               matchingDishes: r.menuItems ? r.menuItems.slice(0, 5).map(i => ({ name: i.translatedName || i.name, price: i.price })) : [],
               reviewSummary: r.reviewInsights?.contextualInsights?.[0] || "",
               pros: r.reviewInsights?.positiveInsights?.slice(0, 3) || [],
               cons: r.reviewInsights?.negativeInsights?.slice(0, 3) || []
           };
       });

       const promptInput = `Requirements: ${JSON.stringify(structuredRequirements)}\n\nCandidates: ${JSON.stringify(compactRestaurants)}`;
       
       console.log(`\n[FINAL_RANKING_STATS]
candidatesBeforePreRank=${enrichedRestaurants.length}
candidatesSentToLLM=${compactRestaurants.length}
menuItemsSent=${compactRestaurants.reduce((sum, r) => sum + r.matchingDishes.length, 0)}
reviewInsightsSent=${compactRestaurants.reduce((sum, r) => sum + (r.reviewSummary ? 1 : 0) + r.pros.length + r.cons.length, 0)}
inputCharacters=${promptInput.length}
estimatedInputTokens=${Math.ceil(promptInput.length / 4)}`);

       const res = await provider.callStructured(
           systemInstruction, 
           promptInput, 
           config, 
           ['recommendations'], 
           null, 
           0, // temperature 0
           {
               maxTokens: 2048,
               maxAttempts: 2,
               fallbackModel: null,
               logTag: 'FINAL_RANKING',
               candidatesBeforePreRank: enrichedRestaurants.length,
               candidatesSentToLLM: compactRestaurants.length
           }
       );
       
       // Map back to full objects based on placeId and format according to UI expectation
       const validRecommendations = (res.recommendations || []).slice(0, 5).map(rec => {
           const fullRestaurant = topCandidates.find(r => r.placeId === rec.restaurantId);
           if (!fullRestaurant) return null;
           return {
               ...fullRestaurant,
               score: rec.score,
               whyRecommended: rec.reason
           };
       }).filter(r => r !== null);
       
       return validRecommendations.length > 0 ? validRecommendations : this._fallbackRanking(enrichedRestaurants);
     } catch (err) {
       console.error(`[AIOrchestrationService] LLM ranking failed:`, err.message);
       return this._fallbackRanking(enrichedRestaurants);
     }
  }

  _fallbackRanking(enrichedRestaurants) {
       console.log(`[AIOrchestrationService] Using deterministic fallback ranking`);
       return enrichedRestaurants
         .sort((a, b) => {
           const scoreA = (a.reviewInsights?.matchScore || 50);
           const scoreB = (b.reviewInsights?.matchScore || 50);
           if (scoreB !== scoreA) return scoreB - scoreA;
           return (b.rating || 0) - (a.rating || 0);
         })
         .map(r => ({
           ...r,
           score: r.reviewInsights?.matchScore || 50,
           whyRecommended: "Recommended based on overall rating and available reviews."
         })).slice(0, 5);
  }
}

module.exports = new AIOrchestrationService();
