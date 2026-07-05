// assets/js/main.js
import APIClient from '../../src/components/APIClient.js';
import FormWizard from '../../src/components/FormWizard.js';

let globalModelsData = [];

document.addEventListener('DOMContentLoaded', async () => {
  const comparisonArea = document.getElementById('comparison-area');
  const themeToggle = document.getElementById('themeToggle');
  const globalSearch = document.getElementById('globalSearch');
  const sortSelect = document.getElementById('sortSelect');
  const browseBtn = document.getElementById('browseBtn');
  const catalogBody = document.getElementById('catalogBody');
  const catalogWrapper = document.getElementById('catalogTableWrapper');
  const wizardRoot = document.querySelector('#config-wizard');
  const wizard = wizardRoot ? new FormWizard({ rootSelector: '#config-wizard' }) : null;

  const API_ENDPOINT = 'https://openrouter.ai/api/v1/models';
  const API_KEY = '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';
  const apiClient = new APIClient({ endpoint: API_ENDPOINT, apiKey: API_KEY });

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"'`=\/]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;' }[c]));
  }

  function applyTheme(theme) {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    if (themeToggle) themeToggle.textContent = theme === 'dark' ? 'Light' : 'Dark';
  }

  function getFilteredSortedModels() {
    const term = String(globalSearch?.value || '').trim().toLowerCase();
    const sortMode = sortSelect?.value || 'created_desc';
    const getPriceValue = (model, key) => {
      const price = Number(model?.pricing?.[key]);
      return Number.isFinite(price) ? price : Number.POSITIVE_INFINITY;
    };

    const filtered = globalModelsData.filter(model => {
      if (!term) return true;
      return [
        model.model_name,
        model.vendor,
        model.architecture,
        model.notes,
        model.api_id,
        model.pricing?.prompt,
        model.pricing?.completion,
        String(model.id)
      ].some(value => String(value || '').toLowerCase().includes(term));
    });

    return filtered.sort((a, b) => {
      if (sortMode === 'name_asc') return String(a.model_name || '').localeCompare(String(b.model_name || ''));
      if (sortMode === 'context_desc') return (b.context_window || 0) - (a.context_window || 0);
      if (sortMode === 'input_cost_asc') return getPriceValue(a, 'prompt') - getPriceValue(b, 'prompt');
      if (sortMode === 'output_cost_asc') return getPriceValue(a, 'completion') - getPriceValue(b, 'completion');
      return (b.created || 0) - (a.created || 0);
    });
  }

  function formatPrice(value) {
    if (value == null || value === '') return 'Data Unavailable';
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0) return 'Data Unavailable';
    return `$${numericValue.toLocaleString(undefined, { maximumFractionDigits: 10 })}/token`;
  }

  function formatUnixDate(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) return 'Data Unavailable';
    return new Date(numericValue * 1000).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function renderCatalogRows(models) {
    if (!catalogBody) return;

    const rows = models.map(model => `
      <tr>
        <td>${escapeHtml(String(model.id))}</td>
        <td>${escapeHtml(model.model_name)}</td>
        <td>${escapeHtml(model.vendor)}</td>
        <td><code>${escapeHtml(model.api_id || String(model.id))}</code></td>
        <td>${model.context_window ? Number(model.context_window).toLocaleString() : '-'}</td>
        <td>${escapeHtml(formatPrice(model.pricing?.prompt))}</td>
        <td>${escapeHtml(formatPrice(model.pricing?.completion))}</td>
      </tr>
    `).join('');

    catalogBody.innerHTML = rows || `
      <tr>
        <td colspan="7" class="py-4">
          <div class="alert alert-info mb-0" role="status">No data available.</div>
        </td>
      </tr>
    `;
  }

  function renderCatalogLoadingState(message = 'Loading benchmark data...') {
    if (!catalogBody) return;
    if (catalogWrapper) catalogWrapper.setAttribute('aria-busy', 'true');
    catalogBody.innerHTML = `
      <tr>
        <td colspan="7" class="py-5">
          <div class="d-flex align-items-center justify-content-center gap-3 text-muted">
            <div class="spinner-border text-primary" role="status" aria-hidden="true"></div>
            <div>
              <div class="fw-semibold">${escapeHtml(message)}</div>
              <div class="small">Please wait while the benchmark catalog loads.</div>
            </div>
          </div>
        </td>
      </tr>
    `;
  }

  function renderCatalogErrorState(message) {
    if (!catalogBody) return;
    if (catalogWrapper) catalogWrapper.setAttribute('aria-busy', 'false');
    catalogBody.innerHTML = `
      <tr>
        <td colspan="7" class="py-4">
          <div class="alert alert-danger mb-0" role="alert">
            <strong>Unable to load benchmark data.</strong>
            <div class="mt-1">${escapeHtml(message || 'The external API request failed.')}</div>
          </div>
        </td>
      </tr>
    `;
  }

  function renderCatalogEmptyState(message = 'No data available.') {
    if (!catalogBody) return;
    if (catalogWrapper) catalogWrapper.setAttribute('aria-busy', 'false');
    catalogBody.innerHTML = `
      <tr>
        <td colspan="7" class="py-4">
          <div class="alert alert-info mb-0" role="status">
            ${escapeHtml(message)}
          </div>
        </td>
      </tr>
    `;
  }

  function renderComparisonLoadingState(message = 'Loading benchmark data...') {
    if (!comparisonArea) return;
    comparisonArea.innerHTML = `
      <div class="selector-card state-panel" aria-live="polite">
        <div class="d-flex align-items-center gap-3">
          <div class="spinner-border text-primary" role="status" aria-hidden="true"></div>
          <div>
            <div class="fw-semibold">${escapeHtml(message)}</div>
            <div class="small-muted">The catalog is being prepared from the live API dataset.</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderComparisonErrorState(message) {
    if (!comparisonArea) return;
    comparisonArea.innerHTML = `
      <div class="alert alert-danger shadow-sm" role="alert">
        <strong>API error:</strong> ${escapeHtml(message || 'Unable to load benchmark data.')}
      </div>
    `;
  }

  function renderComparisonEmptyState(message = 'No data available.') {
    if (!comparisonArea) return;
    comparisonArea.innerHTML = `
      <div class="alert alert-info shadow-sm" role="status">
        ${escapeHtml(message)}
      </div>
    `;
  }

  function syncCatalog() {
    renderCatalogRows(getFilteredSortedModels());
  }

  async function loadModels() {
    renderCatalogLoadingState();
    renderComparisonLoadingState();

    if (browseBtn) browseBtn.disabled = true;

    try {
      const result = await apiClient.fetchBenchmarks({ includeMeta: true });

      if (result?.error) {
        globalModelsData = [];
        if (wizard && typeof wizard.setDataset === 'function') {
          wizard.setDataset([]);
        }

        renderCatalogErrorState(result.error.message);
        renderComparisonErrorState(result.error.message);
        return;
      }

      if (!Array.isArray(result?.data) || result.data.length === 0) {
        globalModelsData = [];
        if (wizard && typeof wizard.setDataset === 'function') {
          wizard.setDataset([]);
        }

        renderCatalogEmptyState('No data available.');
        renderComparisonEmptyState('No data available.');
        return;
      }

      globalModelsData = result.data;

      if (wizard && typeof wizard.setDataset === 'function') {
        wizard.setDataset(globalModelsData);
      }

      if (catalogWrapper) catalogWrapper.setAttribute('aria-busy', 'false');
      syncCatalog();
      renderComparisonEmptyState('Choose two models above to run a comparison.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The benchmark request failed.';
      globalModelsData = [];

      if (wizard && typeof wizard.setDataset === 'function') {
        wizard.setDataset([]);
      }

      renderCatalogErrorState(message);
      renderComparisonErrorState(message);
    } finally {
      if (browseBtn) browseBtn.disabled = false;
      if (catalogWrapper) catalogWrapper.setAttribute('aria-busy', 'false');
    }
  }

  function simulateRun(payload, ms = 1200) {
    return new Promise(resolve => {
      setTimeout(() => {
        const left = globalModelsData.find(m => String(m.id) === String(payload.modelA)) || {};
        const right = globalModelsData.find(m => String(m.id) === String(payload.modelB)) || {};

        resolve({
          runId: 'sim-' + Date.now(),
          left,
          right,
          metrics: {},
          summary: 'Simulated comparison complete'
        });
      }, ms);
    });
  }

  function renderResultCard(payload, result) {
    const left = result.left || {};
    const right = result.right || {};

    const hasValidMetric = (value) => {
      const numericValue = Number(value);
      return Number.isFinite(numericValue) && numericValue > 0;
    };

    const hasValidCost = (value) => {
      const numericValue = Number(value);
      return Number.isFinite(numericValue) && numericValue >= 0;
    };

    const maxFromCompared = (...values) => {
      const validValues = values
        .map(value => Number(value))
        .filter(value => Number.isFinite(value) && value > 0);
      return validValues.length ? Math.max(...validValues) : null;
    };

    const maxCostFromCompared = (...values) => {
      const validValues = values
        .map(value => Number(value))
        .filter(value => Number.isFinite(value) && value >= 0);
      return validValues.length ? Math.max(...validValues) : null;
    };

    const percentOfMax = (value, max) => {
      const numericValue = Number(value);
      const numericMax = Number(max);
      if (!hasValidMetric(numericValue) || !hasValidMetric(numericMax)) {
        return null;
      }
      return Math.max(0, Math.min(100, Math.round((numericValue / numericMax) * 100)));
    };

    const percentOfCostMax = (value, max) => {
      const numericValue = Number(value);
      const numericMax = Number(max);
      if (!hasValidCost(numericValue) || !hasValidCost(numericMax)) {
        return null;
      }
      if (numericMax === 0) return 100;
      return Math.max(0, Math.min(100, Math.round((numericValue / numericMax) * 100)));
    };

    const formatAvailableNumber = (value) => {
      if (!hasValidMetric(value)) return 'Data Unavailable';
      return Number(value).toLocaleString();
    };

    const formatPercentSummary = (leftPercent, rightPercent) => {
      const leftLabel = leftPercent == null ? 'N/A' : `${leftPercent}%`;
      const rightLabel = rightPercent == null ? 'N/A' : `${rightPercent}%`;
      if (leftPercent == null && rightPercent == null) return 'Data Unavailable';
      return `${leftLabel} vs ${rightLabel}`;
    };

    const maxContext = maxFromCompared(left.context_window, right.context_window);
    const leftInputCost = left.pricing?.prompt;
    const rightInputCost = right.pricing?.prompt;
    const leftOutputCost = left.pricing?.completion;
    const rightOutputCost = right.pricing?.completion;
    const maxInputCost = maxCostFromCompared(leftInputCost, rightInputCost);
    const maxOutputCost = maxCostFromCompared(leftOutputCost, rightOutputCost);

    const visualMetrics = [
      {
        label: 'Input Cost',
        leftValue: leftInputCost,
        rightValue: rightInputCost,
        leftPercent: percentOfCostMax(leftInputCost, maxInputCost),
        rightPercent: percentOfCostMax(rightInputCost, maxInputCost),
        format: formatPrice
      },
      {
        label: 'Context Window',
        leftValue: left.context_window,
        rightValue: right.context_window,
        leftPercent: percentOfMax(left.context_window, maxContext),
        rightPercent: percentOfMax(right.context_window, maxContext),
        format: formatAvailableNumber
      },
      {
        label: 'Output Cost',
        leftValue: leftOutputCost,
        rightValue: rightOutputCost,
        leftPercent: percentOfCostMax(leftOutputCost, maxOutputCost),
        rightPercent: percentOfCostMax(rightOutputCost, maxOutputCost),
        format: formatPrice
      }
    ];

    const renderMetricBar = (side, modelName, value, percent, format) => {
      const displayValue = format(value);
      const unavailable = displayValue === 'Data Unavailable';
      const barClass = side === 'left' ? 'bg-primary' : 'bg-info';

      return `
        <div class="d-flex justify-content-between small mb-1">
          <span>${escapeHtml(modelName || 'Model')}</span>
          <span>${escapeHtml(displayValue)}</span>
        </div>
        ${unavailable ? `
          <div class="small-muted py-2">Data Unavailable</div>
        ` : `
          <div class="progress compare-progress" role="progressbar" aria-label="${escapeHtml(`${modelName || 'Model'} comparison bar`)}" aria-valuenow="${percent ?? 0}" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-bar progress-bar-striped progress-bar-animated ${barClass}" style="width: ${percent ?? 0}%"></div>
          </div>
        `}
      `;
    };

    const comparisonBars = visualMetrics.map(metric => `
      <div class="metric-bar-group">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="fw-semibold">${escapeHtml(metric.label)}</span>
          <span class="small-muted">${escapeHtml(formatPercentSummary(metric.leftPercent, metric.rightPercent))}</span>
        </div>
        <div class="row g-3 align-items-center">
          <div class="col-md-6">
            ${renderMetricBar('left', left.model_name || 'Model A', metric.leftValue, metric.leftPercent, metric.format)}
          </div>
          <div class="col-md-6">
            ${renderMetricBar('right', right.model_name || 'Model B', metric.rightValue, metric.rightPercent, metric.format)}
          </div>
        </div>
      </div>
    `).join('');

    return `
      <div class="compare-card form-step" id="resultCard">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <h5 class="mb-0">Comparison result - ${escapeHtml(result.runId)}</h5>
          <div class="small-muted">Max tokens: ${escapeHtml(String(payload.maxTokens))}</div>
        </div>

        <section class="visual-compare-panel mb-3" aria-label="Visual model comparison">
          <div class="d-flex flex-column flex-md-row justify-content-between gap-2 mb-3">
            <div>
              <div class="small-muted text-uppercase">Model A</div>
              <strong>${escapeHtml(left.model_name || 'N/A')}</strong>
            </div>
            <div class="text-md-end">
              <div class="small-muted text-uppercase">Model B</div>
              <strong>${escapeHtml(right.model_name || 'N/A')}</strong>
            </div>
          </div>
          <div class="metric-bar-stack">
            ${comparisonBars}
          </div>
        </section>

        <div class="table-responsive">
          <table class="table table-bordered">
            <thead class="table-light">
              <tr>
                <th>Metric</th>
                <th>${escapeHtml(left.model_name || 'N/A')}</th>
                <th>${escapeHtml(right.model_name || 'N/A')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Vendor</td>
                <td>${escapeHtml(left.vendor || '')}</td>
                <td>${escapeHtml(right.vendor || '')}</td>
              </tr>
              <tr>
                <td>API ID</td>
                <td><code>${escapeHtml(left.api_id || left.model_name || '')}</code></td>
                <td><code>${escapeHtml(right.api_id || right.model_name || '')}</code></td>
              </tr>
              <tr>
                <td>Context Window</td>
                <td>${left.context_window ? Number(left.context_window).toLocaleString() : '-'}</td>
                <td>${right.context_window ? Number(right.context_window).toLocaleString() : '-'}</td>
              </tr>
              <tr>
                <td>Input Cost</td>
                <td>${escapeHtml(formatPrice(leftInputCost))}</td>
                <td>${escapeHtml(formatPrice(rightInputCost))}</td>
              </tr>
              <tr>
                <td>Output Cost</td>
                <td>${escapeHtml(formatPrice(leftOutputCost))}</td>
                <td>${escapeHtml(formatPrice(rightOutputCost))}</td>
              </tr>
              <tr>
                <td>Added to OpenRouter</td>
                <td>${escapeHtml(formatUnixDate(left.created))}</td>
                <td>${escapeHtml(formatUnixDate(right.created))}</td>
              </tr>
              <tr>
                <td>Architecture</td>
                <td>${escapeHtml(left.architecture || '-')}</td>
                <td>${escapeHtml(right.architecture || '-')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function bindCatalogControls() {
    if (globalSearch) globalSearch.addEventListener('input', syncCatalog);
    if (sortSelect) sortSelect.addEventListener('change', syncCatalog);

    if (browseBtn && catalogWrapper) {
      browseBtn.addEventListener('click', () => {
        syncCatalog();
        const modalEl = document.getElementById('browseModal');
        if (modalEl && window.bootstrap?.Modal) {
          window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
        }
      });
    }
  }

  function bindWizardEvents() {
    document.addEventListener('wizardSubmitted', (e) => {
      const p = e.detail || {};
      if (!p.modelA || !p.modelB || p.modelA === p.modelB) {
        if (comparisonArea) comparisonArea.innerHTML = '<div class="alert alert-warning">Please choose two different models.</div>';
        return;
      }

      if (comparisonArea) {
        comparisonArea.innerHTML = `
          <div class="compare-card running" id="runningCard">
            <div class="d-flex align-items-center mb-3">
              <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
              <strong>Running comparison simulation...</strong>
            </div>
            <div class="progress" style="height: 5px;">
              <div id="runProgressBar" class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 6%"></div>
            </div>
          </div>
        `;
        comparisonArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      const progressBar = document.getElementById('runProgressBar');
      setTimeout(() => { if (progressBar) progressBar.style.width = '60%'; }, 120);

      simulateRun(p, 1200)
        .then(result => {
          if (progressBar) progressBar.style.width = '100%';
          setTimeout(() => {
            if (comparisonArea) {
              comparisonArea.innerHTML = renderResultCard(p, result);
              const card = document.getElementById('resultCard');
              if (card) {
                void card.offsetWidth;
                card.classList.add('active');
              }
            }
          }, 300);
        })
        .catch(err => {
          if (comparisonArea) comparisonArea.innerHTML = '<div class="alert alert-danger">Simulation failed</div>';
          console.error('simulateRun error', err);
        });
    });
  }

  const savedTheme = localStorage.getItem('cmh_theme') || 'light';
  applyTheme(savedTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem('cmh_theme', next);
      applyTheme(next);
    });
  }

  bindCatalogControls();
  bindWizardEvents();
  await loadModels();
});
