const axios = require('axios');
const cheerio = require('cheerio');

const FETCH_TIMEOUT_MS = 8000;

/**
 * Validates a URL string. Returns a URL object or throws.
 */
function parseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    throw new Error('URL is required');
  }
  let url;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error('Invalid URL format');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('URL must use http or https');
  }
  return url;
}

/**
 * Parses raw HTML into the report fields we care about.
 * Pure function — no network calls — so it's independently testable.
 */
function parseHtml(html) {
  const $ = cheerio.load(html);

  const title = $('title').first().text().trim() || null;
  const metaDescription =
    $('meta[name="description"]').attr('content')?.trim() || null;

  const h1Count = $('h1').length;

  const images = $('img');
  let imagesMissingAlt = 0;
  images.each((_, el) => {
    const alt = $(el).attr('alt');
    if (alt === undefined || alt.trim() === '') imagesMissingAlt += 1;
  });

  // Approximate word count from visible body text.
  $('script, style, noscript').remove();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = bodyText ? bodyText.split(' ').length : 0;

  return {
    pageTitle: title,
    metaDescription,
    h1Count,
    totalImages: images.length,
    imagesMissingAlt,
    wordCount,
  };
}

/**
 * Fetches a URL and returns the full audit report.
 * Never throws for "expected" failure modes (bad status, timeout,
 * non-HTML) — those are represented as structured error fields instead,
 * per the "sensible errors, never a crash" requirement.
 */
async function auditUrl(rawUrl) {
  const url = parseUrl(rawUrl); // throws for malformed input — caller (route) maps to 400

  const start = Date.now();
  let response;
  try {
    response = await axios.get(url.toString(), {
      timeout: FETCH_TIMEOUT_MS,
      maxRedirects: 5,
      validateStatus: () => true, // we want to report non-2xx, not throw on it
      headers: { 'User-Agent': 'PagePulse-Audit/1.0' },
      responseType: 'text',
    });
  } catch (err) {
    const responseTimeMs = Date.now() - start;
    const reason =
      err.code === 'ECONNABORTED'
        ? 'Request timed out'
        : err.code === 'ENOTFOUND'
        ? 'Host not found'
        : 'Could not reach the URL';
    return {
      url: url.toString(),
      ok: false,
      error: reason,
      httpStatus: null,
      responseTimeMs,
    };
  }

  const responseTimeMs = Date.now() - start;
  const contentType = response.headers['content-type'] || '';

  if (!contentType.includes('text/html')) {
    return {
      url: url.toString(),
      ok: false,
      error: `Non-HTML response (content-type: ${contentType || 'unknown'})`,
      httpStatus: response.status,
      responseTimeMs,
    };
  }

  if (response.status >= 400) {
    return {
      url: url.toString(),
      ok: false,
      error: `Page returned HTTP ${response.status}`,
      httpStatus: response.status,
      responseTimeMs,
    };
  }

  const parsed = parseHtml(response.data);

  return {
    url: url.toString(),
    ok: true,
    httpStatus: response.status,
    responseTimeMs,
    ...parsed,
  };
}

module.exports = { auditUrl, parseHtml, parseUrl };
