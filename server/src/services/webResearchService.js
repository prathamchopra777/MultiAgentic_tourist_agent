const axios = require('axios');
const cheerio = require('cheerio');
const httpClient = require('../utils/httpClient');

class WebResearchService {
  constructor() {
    this.apiKey = process.env.TAVILY_API_KEY;
  }

  async findOfficialWebsite(restaurantName, address) {
    const query = `official website ${restaurantName} ${address}`;
    try {
      const response = await axios.post('https://api.tavily.com/search', {
        api_key: this.apiKey,
        query: `official website ${restaurantName} ${address}`,
        search_depth: "basic",
        include_domains: [],
        exclude_domains: ["tripadvisor.com", "yelp.com", "thefork.com", "ubereats.com", "deliveroo.com"],
        max_results: 3
      });

      const results = response.data.results || [];
      console.log(`\n[TAVILY]
restaurant=${restaurantName}
query="${query}"
results=${results.length}
status=success`);

      if (results.length > 0) {
        console.log(`\n[TAVILY_RESULT]
restaurant=${restaurantName}
title="${results[0].title || ''}"
url=${results[0].url}
sourceType=website`);
        return {
          url: results[0].url,
          source: 'Tavily',
          verified: true
        };
      }
      return null;
    } catch (error) {
      console.log(`\n[TAVILY]
restaurant=${restaurantName}
query="${query}"
results=0
status=failed
error=${error.message}`);
      return null;
    }
  }

  async verifyMenuUrl(candidateUrl, restaurantName, locationContext) {
    console.log(`\n[MENU_URL_VERIFICATION_START]
url=${candidateUrl}
restaurant=${restaurantName}`);
    
    // 1. Heuristic Rejection
    const lowerUrl = candidateUrl.toLowerCase();
    if (lowerUrl.includes('/blog/') || 
        lowerUrl.includes('/things-to-do/') || 
        lowerUrl.includes('/places-to-eat/') || 
        lowerUrl.includes('/news/') ||
        lowerUrl.includes('/article/') ||
        lowerUrl.includes('/gallery/')) {
       console.log(`\n[MENU_URL_VERIFICATION]
url=${candidateUrl}
restaurantMatch=false
menuEvidence=false
verified=false
reason=heuristic_rejection`);
       return false;
    }

    // 2. Fetch Page for LLM Verification
    try {
      const fetchResult = await httpClient.fetchHtmlWithFallback(candidateUrl, 10000, 0);
      if (!fetchResult.success) {
          console.log(`\n[MENU_URL_VERIFICATION]
url=${candidateUrl}
restaurantMatch=false
menuEvidence=false
verified=false
reason=fetch_failed`);
          return false;
      }
      
      const $ = cheerio.load(fetchResult.data.toString('utf-8'));
      const pageTitle = $('title').text() || 'No Title';
      
      $('script, style, noscript, iframe, nav, footer, aside').remove();
      const rawText = $('body').text().replace(/\s+/g, ' ').trim();
      const snippet = rawText.substring(0, 2000);

      const AIOrchestrationService = require('./aiOrchestrationService');
      const verification = await AIOrchestrationService.verifyMenuCandidate(restaurantName, locationContext, pageTitle, snippet);
      
      console.log(`\n[MENU_URL_VERIFICATION]
url=${candidateUrl}
restaurantMatch=${verification.isMenu}
menuEvidence=${verification.isMenu}
verified=${verification.isMenu}
reason="${verification.reason}"`);
      return verification.isMenu;

    } catch (error) {
      console.log(`\n[MENU_URL_VERIFICATION]
url=${candidateUrl}
restaurantMatch=false
menuEvidence=false
verified=false
reason=error_${error.message}`);
      return false;
    }
  }

  async findMenuPage(restaurantName, officialUrl, locationContext) {
    try {
      let candidateUrl = null;
      const queries = [
        `"${restaurantName}" ${locationContext.city} official menu`,
        `"${restaurantName}" ${locationContext.city} carta`,
        `menu "${restaurantName}" ${locationContext.city}`
      ];

      for (const query of queries) {
        console.log(`\n[TAVILY_MENU_SEARCH]
restaurant=${restaurantName}
city=${locationContext.city}
query="${query}"`);

        const requestBody = {
          api_key: this.apiKey,
          query: query,
          search_depth: "basic",
          max_results: 3
        };
        
        // If we have an official URL, prefer results from it
        if (officialUrl) {
            try {
               requestBody.include_domains = [new URL(officialUrl).hostname];
            } catch (e) {
               // ignore invalid official URL
            }
        }

        const response = await axios.post('https://api.tavily.com/search', requestBody);
        
        const results = response.data.results || [];
        if (results.length > 0) {
          const UrlValidator = require('../utils/urlValidator');
          for (const result of results) {
            console.log(`\n[TAVILY_MENU_RESULT]
restaurant=${restaurantName}
title="${result.title || ''}"
url=${result.url}
score=${result.score || 'N/A'}`);
            
            const normalized = UrlValidator.normalizeCandidateUrl(result.url);
            if (!UrlValidator.isValidHttpUrl(normalized)) continue;

            const isVerified = await this.verifyMenuUrl(normalized, restaurantName, locationContext);
            if (isVerified) {
              console.log(`WebResearchService - Found VERIFIED menu page: ${normalized}`);
              return normalized;
            }
          }
        }
      }
      return null;
    } catch (error) {
      console.log(`\n[TAVILY_MENU_SEARCH]
restaurant=${restaurantName}
query="menu search"
results=0
status=failed
error=${error.message}`);
      return null;
    }
  }
}

module.exports = new WebResearchService();
