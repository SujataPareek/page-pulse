const form = document.getElementById('audit-form');
const input = document.getElementById('url-input');
const submitBtn = document.getElementById('submit-btn');
const statusEl = document.getElementById('status');
const reportEl = document.getElementById('report');

function row(label, value) {
  return `<div class="row"><span class="label">${label}</span><span class="value">${value}</span></div>`;
}

function renderSuccess(data) {
  reportEl.className = 'report';
  reportEl.style.display = 'block';
  reportEl.innerHTML = [
    row('Status', `<span class="badge ok">HTTP ${data.httpStatus}</span>`),
    row('Response time', `${data.responseTimeMs} ms`),
    row('Page title', escapeHtml(data.pageTitle) || '<em>missing</em>'),
    row('Meta description', escapeHtml(data.metaDescription) || '<em>missing</em>'),
    row('H1 count', data.h1Count),
    row('Total images', data.totalImages),
    row('Images missing alt text', data.imagesMissingAlt),
    row('Approx. word count', data.wordCount),
  ].join('');
}

function renderError(data) {
  reportEl.className = 'report error';
  reportEl.style.display = 'block';
  reportEl.innerHTML = [
    row('Status', `<span class="badge bad">${data.httpStatus ? 'HTTP ' + data.httpStatus : 'Failed'}</span>`),
    row('Response time', data.responseTimeMs != null ? `${data.responseTimeMs} ms` : '—'),
    row('Error', escapeHtml(data.error)),
  ].join('');
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = input.value.trim();
  if (!url) return;

  submitBtn.disabled = true;
  statusEl.textContent = 'Auditing…';
  reportEl.style.display = 'none';

  try {
    const res = await fetch(`/api/audit?url=${encodeURIComponent(url)}`);
    const data = await res.json();

    if (!res.ok) {
      statusEl.textContent = '';
      renderError(data);
      return;
    }

    statusEl.textContent = '';
    if (data.ok) {
      renderSuccess(data);
    } else {
      renderError(data);
    }
  } catch (err) {
    statusEl.textContent = '';
    renderError({ error: 'Network error — could not reach the audit server', httpStatus: null, responseTimeMs: null });
  } finally {
    submitBtn.disabled = false;
  }
});
