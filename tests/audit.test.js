const test = require('node:test');
const assert = require('node:assert/strict');
const { parseHtml, parseUrl } = require('../lib/audit');

test('parseHtml — happy path extracts all fields correctly', () => {
  const html = `
    <html>
      <head>
        <title>  My Test Page  </title>
        <meta name="description" content="A page for testing." />
      </head>
      <body>
        <h1>Welcome</h1>
        <h1>Second H1</h1>
        <img src="a.jpg" alt="a photo" />
        <img src="b.jpg" alt="" />
        <img src="c.jpg" />
        <p>Some visible words go right here in the body.</p>
        <script>var shouldNotCount = "these words should not count";</script>
      </body>
    </html>
  `;

  const result = parseHtml(html);

  assert.equal(result.pageTitle, 'My Test Page');
  assert.equal(result.metaDescription, 'A page for testing.');
  assert.equal(result.h1Count, 2);
  assert.equal(result.totalImages, 3);
  assert.equal(result.imagesMissingAlt, 2); // empty alt + missing alt both count
  assert.ok(result.wordCount >= 8); // rough sanity check, not exact-match brittle
});

test('parseHtml — failure case: missing title and meta description', () => {
  const html = `<html><head></head><body><p>No head metadata here.</p></body></html>`;

  const result = parseHtml(html);

  assert.equal(result.pageTitle, null);
  assert.equal(result.metaDescription, null);
  assert.equal(result.h1Count, 0);
  assert.equal(result.totalImages, 0);
});

test('parseHtml — failure case: empty/malformed HTML does not throw', () => {
  assert.doesNotThrow(() => {
    const result = parseHtml('');
    assert.equal(result.h1Count, 0);
    assert.equal(result.wordCount, 0);
  });

  assert.doesNotThrow(() => {
    parseHtml('<div>not even a real page structure');
  });
});

test('parseUrl — rejects invalid URL formats', () => {
  assert.throws(() => parseUrl('not a url'), /Invalid URL format/);
  assert.throws(() => parseUrl(''), /URL is required/);
  assert.throws(() => parseUrl('ftp://example.com/file'), /http or https/);
});

test('parseUrl — accepts valid http/https URLs', () => {
  assert.doesNotThrow(() => parseUrl('https://example.com'));
  assert.doesNotThrow(() => parseUrl('http://example.com/path?query=1'));
});
