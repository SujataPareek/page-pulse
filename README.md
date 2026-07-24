# Page Pulse

A lightweight web tool that audits any public URL by fetching its HTML and generating a structural and performance report.

**Live Demo:** https://page-pulse-n8mn.onrender.com

**GitHub Repository:** https://github.com/SujataPareek/page-pulse

Built as part of the Digital Heroes Software Development Internship assessment.

## Features

- Analyze any public HTTP/HTTPS webpage
- Measure HTTP status and response time
- Extract page title and meta description
- Count H1 headings
- Detect images missing alt text
- Estimate page word count
- Graceful handling of invalid URLs, timeouts, and non-HTML responses


## Setup

Requirements:
- Node.js 18 or later

Install dependencies:

npm install

Start the server:

node server.js

The application runs at:
http://localhost:3000
### Running tests

```bash
node --test tests/audit.test.js
```

## API contract

### `GET /api/audit?url=<url>`

**Query params**
- `url` (required) — the target page to audit. Must be a valid `http://` or `https://` URL.

**Success response** — `200 OK`
```json
{
  "url": "https://example.com/",
  "ok": true,
  "httpStatus": 200,
  "responseTimeMs": 134,
  "pageTitle": "Example Domain",
  "metaDescription": null,
  "h1Count": 1,
  "totalImages": 0,
  "imagesMissingAlt": 0,
  "wordCount": 28
}
```

**Failure response (target page unreachable, times out, returns a bad status, or isn't HTML)** — still `200 OK`, because the *audit itself* succeeded even though the *target* failed:
```json
{
  "url": "https://example.com/",
  "ok": false,
  "error": "Request timed out",
  "httpStatus": null,
  "responseTimeMs": 8004
}
```

**Client error (malformed/missing URL)** — `400 Bad Request`
```json
{ "ok": false, "error": "Invalid URL format" }
```

## Design decisions

1. **`ok: false` failures return HTTP 200, not a 4xx/5xx.** The audit endpoint's job is to report on a URL, not to be that URL. If `github.com` times out, that's a successful audit with a negative finding — the client asked "how is this page doing?" and got a real answer. Only genuinely bad *requests to this API* (missing/malformed `url` param) get a 400. This keeps the frontend's error-handling logic simple: check `data.ok`, not the HTTP status of my own endpoint.

2. **Parsing logic is a pure function, separate from the network call.** `parseHtml(html)` takes a string and returns the report fields with no I/O. `auditUrl()` handles fetching and wraps it. This is what makes the test suite possible without mocking HTTP or hitting real servers in tests — I can feed `parseHtml` a fixed HTML string and assert on the output deterministically.

3. **`validateStatus: () => true` on the axios call, instead of letting axios throw on non-2xx.** By default axios throws on 4xx/5xx, which would force me to catch-and-reclassify errors that aren't actually failures of the fetch itself. Telling axios to never throw on status and checking `response.status` manually keeps the "timeout vs. bad URL vs. bad HTTP status vs. non-HTML" cases cleanly separated in one place instead of split across a try/catch and an if-block.

## What I'd change with another day

The word count is a rough whitespace-split approximation and doesn't handle non-Latin scripts or heavily componentized SPAs where content loads client-side after the initial HTML (this tool only sees server-rendered HTML, not post-JS-execution DOM). With more time I'd add a headless-browser fallback (e.g. Playwright) for pages that return near-empty bodies, and a proper tokenizer for word count instead of a naive split.

## AI usage 

I used AI tools as learning and development assistants throughout this assignment. Claude helped me understand the project requirements, build the application, and implement the code. ChatGPT assisted me with brainstorming the project structure, reviewing the overall workflow, and guiding me through the GitHub and Render deployment process. I personally tested the application, verified different scenarios, completed the deployment, and reviewed the implementation to understand how each component works before submission.
