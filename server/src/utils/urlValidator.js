const { URL } = require('url');

class UrlValidator {
  /**
   * Normalizes a candidate URL and resolves redirects like /goto?url=...
   */
  static normalizeCandidateUrl(urlStr) {
    if (!urlStr || typeof urlStr !== 'string') return null;
    
    let url = urlStr.trim();
    if (!url) return null;

    // Handle search engine redirects or local /goto?url= redirects
    if (url.startsWith('/goto?url=')) {
        try {
            const params = new URLSearchParams(url.substring(5)); // skip '/goto'
            if (params.has('url')) {
                url = params.get('url');
                // Some google URLs are base64 encoded or double encoded. If it doesn't start with http, reject it.
                if (!url.startsWith('http')) return null;
            }
        } catch (e) {
            return null;
        }
    } else if (url.includes('google.com/url?q=')) {
        try {
            const parsed = new URL(url);
            if (parsed.searchParams.has('q')) {
                url = parsed.searchParams.get('q');
            } else if (parsed.searchParams.has('url')) {
                url = parsed.searchParams.get('url');
            }
        } catch (e) {
            return null;
        }
    }

    return url;
  }

  /**
   * Validates if a string is a valid absolute HTTP/HTTPS URL
   */
  static isValidHttpUrl(urlStr) {
    if (!urlStr || typeof urlStr !== 'string') return false;

    let url;
    try {
      url = new URL(urlStr);
    } catch (_) {
      return false; // Invalid URL entirely, or relative
    }

    return url.protocol === 'http:' || url.protocol === 'https:';
  }
}

module.exports = UrlValidator;
