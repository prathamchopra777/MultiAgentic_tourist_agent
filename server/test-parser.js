const axios = require('axios');
const cheerio = require('cheerio');
const priceRegex = /(?:€|£|\$)\s*\d+(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?\s*(?:€|£|\$|EUR|GBP|USD)/i;

async function test(url) {
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla' }});
  const $ = cheerio.load(res.data);
  $('script, style, noscript, iframe, img, svg').remove();
  $('nav, footer, header, aside, form, .cookie, .banner, .ad, .social, #navigation, #footer').remove();
  
  const candidateBlocks = [];
  $('li, tr, p, div, h2, h3, h4, h5, section, article').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text.length > 3 && text.length < 800) {
       const isHeader = ['h2','h3','h4','h5'].includes(el.tagName.toLowerCase());
       if (priceRegex.test(text) || isHeader) {
         candidateBlocks.push(text);
       }
    }
  });

  let rawText = '';
  if (candidateBlocks.length === 0) {
    let contentArea = $('main, #main, .menu, #menu, .content, #content');
    if (contentArea.length === 0) contentArea = $('body');
    rawText = contentArea.text().replace(/\s+/g, ' ').trim();
  } else {
    rawText = [...new Set(candidateBlocks)].join('\n');
  }
  
  console.log("Extracted Length:", rawText.length);
  console.log("Text:\n", rawText.substring(0, 1000));
}
test("https://www.bloomebysasha.es");
