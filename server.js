const express = require('express');
const path = require('path');
const { auditUrl } = require('./lib/audit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * GET /api/audit?url=<encoded url>
 * Returns a JSON report. Never crashes on bad input — always
 * responds with a structured JSON body and an appropriate status.
 */
app.get('/api/audit', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ ok: false, error: 'Missing "url" query parameter' });
  }

  try {
    const report = await auditUrl(url);
    // auditUrl only throws for malformed URL input (400-worthy).
    // Network/HTTP/content-type failures come back as report.ok === false
    // with a 200, since the audit itself succeeded even if the target didn't.
    return res.status(200).json(report);
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

app.use((err, req, res, next) => {
  // Catch-all safety net so an unexpected error never crashes the process
  // or leaks a stack trace to the client.
  console.error(err);
  res.status(500).json({ ok: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Page Pulse listening on port ${PORT}`);
});

module.exports = app;
