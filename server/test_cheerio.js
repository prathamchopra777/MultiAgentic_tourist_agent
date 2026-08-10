const cheerio = require('cheerio');
const axios = require('axios');

async function test(url) {
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0'
      }
    });
    const htmlString = res.data;
    const $ = cheerio.load(htmlString);
    
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

    let rawText = targetElement.text()
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n+/g, '\n')
        .trim();
        
    console.log(`URL: ${url}`);
    console.log(`Extracted Length: ${rawText.length}`);
    console.log(`Preview: ${rawText.substring(0, 500)}...\n`);
  } catch (e) {
    console.error(e.message);
  }
}

test('https://www.teresacarles.com/tc/eng');
test('https://www.vegworld.es');
test('https://madmadvegan.com');
