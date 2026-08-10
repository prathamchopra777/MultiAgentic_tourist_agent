const axios = require('axios');
const dotenv = require('dotenv');
const UrlValidator = require('./urlValidator');
dotenv.config();

class HttpClient {
  constructor() {
    this.firecrawlKey = process.env.FIRECRAWL_API_KEY;
  }

  async fetchHtmlWithFallback(rawUrl, timeoutMs = 15000, maxRetries = 1) {
    const url = UrlValidator.normalizeCandidateUrl(rawUrl);
    if (!UrlValidator.isValidHttpUrl(url)) {
       console.log(`[HttpClient] Rejected invalid URL: ${rawUrl}`);
       return { success: false, error: 'Invalid URL' };
    }

    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        console.log(`[HttpClient] Direct fetch attempt ${attempt} for ${url}`);
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
          },
          timeout: timeoutMs,
          responseType: 'arraybuffer'
        });
        
        return {
           success: true,
           data: response.data,
           contentType: response.headers['content-type'] || '',
           source: 'direct'
        };
      } catch (e) {
        lastError = e;
        const status = e.response ? e.response.status : null;
        console.warn(`[HttpClient] Direct fetch failed for ${url} (Status: ${status || 'Timeout/Network'})`);
        
        if (status === 404 || status === 429) {
           console.warn(`[HttpClient] Aborting direct fetch retries due to Status ${status}`);
           break; // Don't retry or fallback on 404, but for 429 we break and go to Firecrawl
        }
        
        if (attempt <= maxRetries) {
           const delay = Math.pow(2, attempt) * 1000;
           console.log(`[HttpClient] Waiting ${delay}ms before retry...`);
           await new Promise(res => setTimeout(res, delay));
        }
      }
    }

    if (this.firecrawlKey) {
        console.log(`\n[FIRECRAWL_REQUEST]
restaurant=unknown
url=${url}`);
        try {
            const response = await axios.post('https://api.firecrawl.dev/v1/scrape', {
                url: url,
                formats: ["html"]
            }, {
                headers: {
                    'Authorization': `Bearer ${this.firecrawlKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });
            if (response.data && response.data.success) {
                const htmlContent = response.data.data.html || '';
                console.log(`\n[FIRECRAWL_RESPONSE]
status=success
contentLength=${htmlContent.length}`);
                
                return {
                    success: true,
                    data: Buffer.from(htmlContent, 'utf-8'),
                    contentType: 'text/html',
                    source: 'firecrawl'
                };
            } else {
                 console.log(`\n[FIRECRAWL_RESPONSE]
status=failed_api_error
contentLength=0`);
            }
        } catch (e) {
             const status = e.response ? e.response.status : null;
             console.log(`\n[FIRECRAWL_RESPONSE]
status=failed_http_${status || 'Error'}
contentLength=0`);
        }
    } else {
        console.warn(`[HttpClient] Firecrawl API key not configured, skipping fallback`);
    }

    return { success: false, error: lastError?.message || 'Unknown error' };
  }
}

module.exports = new HttpClient();
