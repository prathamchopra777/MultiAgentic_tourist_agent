const AIOrchestrationService = require('../services/aiOrchestrationService');
const googlePlacesService = require('../services/googlePlacesService');
const rankingService = require('../services/rankingService');
const webResearchService = require('../services/webResearchService');
const menuExtractionService = require('../services/menuExtractionService');
const Restaurant = require('../models/Restaurant');

class RecommendationController {
  static async getRecommendations(req, res) {
    console.log('\n--- NEW RECOMMENDATION REQUEST ---');
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      console.log('User Query:', query);

      // STEP 1: Query Understanding
      console.log('\n[STEP 1] Parsing intent...');
      const structuredRequirements = await AIOrchestrationService.parseIntent(query);
      console.log('Structured Requirements:', JSON.stringify(structuredRequirements, null, 2));

      if (!structuredRequirements.isEurope) {
        return res.status(400).json({ error: 'LOCATION_NOT_IN_EUROPE', message: 'The requested location is outside of Europe.', requirements: structuredRequirements });
      }

      if (!structuredRequirements.city || !structuredRequirements.country) {
        return res.status(400).json({ error: 'MISSING_LOCATION', message: 'Could not identify a complete city and country.', requirements: structuredRequirements });
      }

      // STEP 2: Restaurant Discovery
      console.log('\n[STEP 2] Discovering restaurants...');
      const discoveredPlaces = await googlePlacesService.searchRestaurants(structuredRequirements);
      
      if (discoveredPlaces.length === 0) {
        return res.status(404).json({ error: 'NO_RESTAURANTS_FOUND', message: 'Could not find any restaurants.' });
      }

      // STEP 3: Hard Filtering & Initial Ranking
      console.log('\n[STEP 3] Hard Filtering & Initial Ranking...');
      const topCandidates = rankingService.rankAndFilter(discoveredPlaces, structuredRequirements);
      
      // STEP 4: Deep Research Fan-out
      console.log('\n[STEP 4] Deep Research on Candidates...');
      const BATCH_SIZE = 3;
      const enrichedCandidates = [];

      for (let i = 0; i < topCandidates.length; i += BATCH_SIZE) {
        const batch = topCandidates.slice(i, i + BATCH_SIZE);
        
        const batchResults = await Promise.allSettled(batch.map(async (place) => {
          console.log(`\n[RESEARCH_START]
restaurant=${place.name}`);
          
          try {
             if (!place.placeId) {
                console.log(`[Cache Skipped] Missing Google Places placeId for ${place.name}`);
             } else {
                const cachedPlace = await Restaurant.findOne({ placeId: place.placeId });
                if (cachedPlace) {
                   console.log(`[Cache Hit] Using cached data for ${place.name}`);
                   return cachedPlace.toObject();
                }
             }
          } catch (dbErr) {
             console.warn(`[Cache Error] Failed to read from cache for ${place.name}:`, dbErr.message);
          }
          
          // Reviews
          const reviewsPromise = (async () => {
            const placeDetails = await googlePlacesService.getPlaceDetails(place.placeId);
            const reviewsText = (placeDetails.reviews || []).map(r => r.text?.text).filter(Boolean).join('\n---\n');
            if (reviewsText) {
              return await AIOrchestrationService.analyzeReviews(reviewsText, structuredRequirements, place.name);
            }
            return null;
          })();

          // Website & Menu
          const websiteMenuPromise = (async () => {
            let officialWebsiteUrl = place.websiteUrl;
            let websiteSource = officialWebsiteUrl ? 'Google Places' : null;

            if (!officialWebsiteUrl) {
              const tavilyResult = await webResearchService.findOfficialWebsite(place.name, place.address);
              if (tavilyResult) {
                officialWebsiteUrl = tavilyResult.url;
                websiteSource = tavilyResult.source;
              }
            }

            let menuUrl = null;
            let menuExtraction = { menuStatus: 'unavailable', sourceType: null, items: [] };
            if (officialWebsiteUrl) {
              menuUrl = await webResearchService.findMenuPage(place.name, officialWebsiteUrl, structuredRequirements);
              if (menuUrl) {
                menuExtraction = await menuExtractionService.extractMenu(menuUrl, place.name);
              }
            }

            return {
              officialWebsiteUrl: officialWebsiteUrl ? { url: officialWebsiteUrl, source: websiteSource, verified: true } : { url: null, source: null, verified: false },
              menuUrl: menuUrl ? { url: menuUrl, source: 'Tavily', verified: menuExtraction.verified === true } : { url: null, source: null, verified: false },
              menuStatus: menuExtraction.menuStatus,
              sourceType: menuExtraction.sourceType,
              menuItems: menuExtraction.items
            };
          })();

          const [reviewResult, websiteMenuResult] = await Promise.allSettled([reviewsPromise, websiteMenuPromise]);

          const reviewInsights = reviewResult.status === 'fulfilled' ? reviewResult.value : null;
          const websiteMenuData = websiteMenuResult.status === 'fulfilled' ? websiteMenuResult.value : {
            officialWebsiteUrl: { url: null, source: null, verified: false },
            menuUrl: { url: null, source: null, verified: false },
            menuStatus: 'unavailable',
            sourceType: null,
            menuItems: []
          };

          const enrichedPlace = {
            ...place,
            ...websiteMenuData,
            reviewInsights
          };
          
          try {
             if (place.placeId) {
                 await Restaurant.findOneAndUpdate(
                    { placeId: place.placeId },
                    { ...enrichedPlace, lastUpdated: new Date() },
                    { upsert: true }
                 );
             }
          } catch (dbErr) {
             console.warn(`[Cache Error] Failed to write to cache for ${place.name}:`, dbErr.message);
          }
          
          console.log(`\n[RESEARCH_COMPLETE]
restaurant=${place.name}
menuVerified=${enrichedPlace.menuStatus === 'verified'}
menuItems=${(enrichedPlace.menuItems || []).length}
pricedItems=${(enrichedPlace.menuItems || []).filter(i => i.price !== null).length}
reviewInsights=${enrichedPlace.reviewInsights ? 'available' : 'unavailable'}
status=accepted`);

          return enrichedPlace;
        }));

        batchResults.forEach(r => {
          if (r.status === 'fulfilled') {
            enrichedCandidates.push(r.value);
          } else {
            console.log(`\n[RESTAURANT_REJECTED]
restaurant=unknown
reason=deep_research_failed
error=${r.reason}`);
          }
        });
      }

      // STEP 5: Deterministic Ranking & Final AI Reasoning
      console.log('\n[STEP 5] Deterministic Ranking & Final AI Reasoning...');
      
      enrichedCandidates.forEach(c => {
        let score = 0;
        
        // Menu evidence (up to 30)
        if (c.menuStatus === 'verified' && c.menuItems && c.menuItems.length > 0) {
           score += 20;
           // Dietary match on menu (up to 10)
           const isVegetarianReq = structuredRequirements.diet?.map(d => d.toLowerCase()).includes('vegetarian');
           const isVeganReq = structuredRequirements.diet?.map(d => d.toLowerCase()).includes('vegan');
           
           if (isVeganReq && c.menuItems.some(i => i.vegan)) score += 10;
           else if (isVegetarianReq && c.menuItems.some(i => i.vegetarian || i.vegan)) score += 10;
        }

        // Review Sentiment / Insights (up to 25)
        if (c.reviewInsights && c.reviewInsights.matchScore) {
           score += (c.reviewInsights.matchScore * 0.25); // matchScore is 0-100, so max 25
        }

        // Base rating (up to 25)
        score += (c.rating || 0) * 5; 
        
        // Reviews Count boost (up to 10)
        score += Math.min((c.reviewCount || 0) / 100, 10);
        
        // Distance/Address
        score += 10;
        
        c.deterministicScore = score;
      });

      enrichedCandidates.sort((a, b) => b.deterministicScore - a.deterministicScore);
      
      // Top 5 go to LLM for final justification
      const topCandidatesForAI = enrichedCandidates.slice(0, 5);
      
      const rejectedCandidates = enrichedCandidates.slice(5);
      rejectedCandidates.forEach(rc => {
         console.log(`\n[RESTAURANT_REJECTED]
restaurant=${rc.name}
reason=low_deterministic_rank
menuVerified=${rc.menuStatus === 'verified'}
score=${rc.deterministicScore}`);
      });
      
      let finalRankings = [];
      try {
         finalRankings = await AIOrchestrationService.rankAndRecommend(topCandidatesForAI, structuredRequirements);
      } catch (err) {
         console.error('Final LLM reasoning failed. Falling back to deterministic ranking.', err.message);
         finalRankings = topCandidatesForAI.map(c => ({
            placeId: c.placeId,
            score: c.deterministicScore,
            whyRecommended: c.reviewInsights?.contextualInsights?.[0] || 'Recommended based on overall match with your preferences.'
         }));
      }
      
      // Match the enriched candidates with the rankings provided by the reasoning model
      const finalRecommendations = finalRankings.map(ranking => {
         const candidate = enrichedCandidates.find(c => c.placeId === ranking.placeId);
         if (!candidate) return null;
         return {
            ...candidate,
            score: ranking.score,
            whyRecommended: ranking.whyRecommended
         };
      }).filter(Boolean);
      
      // Add any candidates that the reasoning model didn't explicitly rank, just append them to the end
      const rankedIds = new Set(finalRecommendations.map(c => c.placeId));
      for (const candidate of enrichedCandidates) {
          if (!rankedIds.has(candidate.placeId)) {
              finalRecommendations.push({
                  ...candidate,
                  score: candidate.score || 0, // Fallback to Google places score
                  whyRecommended: "Recommended based on overall match with your preferences."
              });
          }
      }
      
      // Sort the final array by score descending
      finalRecommendations.sort((a, b) => b.score - a.score);

      finalRecommendations.forEach(rec => {
         console.log(`\n[API_MENU_DATA]
restaurant=${rec.name}
menuVerified=${rec.menuStatus === 'verified'}
menuItemsCount=${(rec.menuItems || []).length}
pricedItemsCount=${(rec.menuItems || []).filter(i => i.price !== null).length}`);
      });

      console.log('\n[SUCCESS] Pipeline execution complete.');

      res.json({
        userRequirements: structuredRequirements,
        restaurants: discoveredPlaces.length,
        recommendations: finalRecommendations
      });

    } catch (error) {
      console.error('\n❌ Controller Error:', error);
      res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  }
}

module.exports = RecommendationController;
