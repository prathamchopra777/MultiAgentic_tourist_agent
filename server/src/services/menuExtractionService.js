const axios = require('axios');
const cheerio = require('cheerio');
const pdfParse = require('pdf-parse');
const AIOrchestrationService = require('./aiOrchestrationService');
const httpClient = require('../utils/httpClient');

class MenuExtractionService {
  async extractMenu(menuUrl, restaurantName = 'unknown') {
    
    const fetchResult = await httpClient.fetchHtmlWithFallback(menuUrl, 15000, 1);
    
    if (!fetchResult.success) {
      console.log(`\n[MENU_EXTRACTION]
restaurant=${restaurantName}
sourceUrl=${menuUrl}
status=failed
reason=fetch_failed`);
      return { menuStatus: 'unavailable', sourceType: null, items: [] };
    }

    const contentType = fetchResult.contentType;
    let rawText = '';
    let sourceType = fetchResult.source === 'firecrawl' ? 'html' : 'html';

    if (contentType.includes('application/pdf') || menuUrl.toLowerCase().endsWith('.pdf')) {
      sourceType = 'pdf';
      try {
        console.log(`MenuExtractionService - Parsing PDF...`);
        const pdfData = await pdfParse(fetchResult.data);
        rawText = pdfData.text.replace(/\s+/g, ' ').trim();
      } catch (err) {
        console.error('MenuExtractionService - PDF Parse Error:', err.message);
        return { menuStatus: 'unavailable', sourceType: 'pdf', items: [] };
      }
    } else {
      // HTML processing
      sourceType = fetchResult.source === 'firecrawl' ? 'firecrawl_html' : 'html';
      const htmlString = fetchResult.data.toString('utf-8');
      const $ = cheerio.load(htmlString);
      
      // Deterministic DOM parsing: Remove noise
      $('script, style, noscript, iframe, img, svg').remove();
      $('nav, footer, header, aside, form, .cookie, .banner, .ad, .social, #navigation, #footer').remove();
      
      const blockTags = new Set(['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'section', 'article', 'main', 'header', 'footer', 'br']);
      
      let targetElement = $('body');
      const contentAreas = $('main, #main, .menu, #menu, #content, .content, #main-content');
      contentAreas.each((_, el) => {
          if ($(el).text().trim().length > 200) {
              targetElement = $(el);
              return false;
          }
      });

      targetElement.find('*').each((_, el) => {
          if (blockTags.has(el.tagName.toLowerCase())) {
              $(el).append('\n');
          }
      });

      rawText = targetElement.text()
          .replace(/[ \t]+/g, ' ') // collapse horizontal spaces
          .replace(/\n\s*\n+/g, '\n') // collapse multiple newlines
          .trim();
    }

    const limitedText = rawText.substring(0, 2500);
    console.log(`MenuExtractionService - Extracted ${limitedText.length} characters of ${sourceType} text deterministically`);

    if (!limitedText) {
      console.log(`\n[MENU_EXTRACTION]
restaurant=${restaurantName}
sourceUrl=${menuUrl}
status=failed
reason=no_text_extracted`);
      return { menuStatus: 'unavailable', sourceType, items: [] };
    }

    try {
      // Stage 2 & 3: Parse Structure and Prices
      const parsePromise = AIOrchestrationService.parseMenuStructure(limitedText);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('MENU_EXTRACTION_TIMEOUT')), 45000));
      
      let menuItems = await Promise.race([parsePromise, timeoutPromise]);
      console.log(`MenuExtractionService - Parsed ${menuItems.length} menu items`);

      if (!menuItems || menuItems.length === 0) {
        console.log(`\n[MENU_EXTRACTION]
restaurant=${restaurantName}
sourceUrl=${menuUrl}
extractedCharacters=${limitedText.length}
itemsFound=0
pricesFound=0
status=success`);
        return { menuStatus: 'unavailable', sourceType, items: [], verified: false };
      }

      console.log(`\n[MENU_EXTRACTION]
restaurant=${restaurantName}
sourceUrl=${menuUrl}
extractedCharacters=${limitedText.length}
itemsFound=${menuItems.length}
pricesFound=${menuItems.filter(i => i.price !== null && i.price !== undefined).length}
status=success`);

      // Stage 4: Translation
      try {
        menuItems = await AIOrchestrationService.translateMenuItems(menuItems, restaurantName);
      } catch (err) {
        console.warn('MenuExtractionService - Translation failed, skipping:', err.message);
      }

      // Stage 5: Dietary Classification
      try {
        menuItems = await AIOrchestrationService.classifyDietaryProperties(menuItems, restaurantName);
      } catch (err) {
        console.warn('MenuExtractionService - Dietary classification failed, skipping:', err.message);
      }

      return { menuStatus: 'verified', sourceType, items: menuItems, verified: true };
    } catch (err) {
      console.log(`\n[MENU_EXTRACTION]
restaurant=${restaurantName}
sourceUrl=${menuUrl}
status=failed
reason=error_${err.message}`);
      return { menuStatus: 'unavailable', sourceType, items: [], verified: false };
    }
  }
}

module.exports = new MenuExtractionService();
