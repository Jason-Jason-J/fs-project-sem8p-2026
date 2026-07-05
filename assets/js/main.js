// assets/js/main.js
import FormWizard from '../../src/components/FormWizard.js';
import { AI_BENCHMARK_DATABASE } from '../../src/data/data.js';

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

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"'`=\/]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;' }[c]));
  }

  function computePower(model) {
    const params = Number(model.params_billion) || 1;
    const context = Number(model.context_window) || 1024;
    const speed = Number(model.inference_speed_tps) || 1;
    return params * Math.log2(context) * (1 + params / 100) / (1 + 1000 / speed);
  }

  function normalizeModel(model) {
    const normalized = {
      id: model.id ?? model.api_id ?? model.model_name,
      model_name: model.model_name || model.name || model.id || 'Unknown model',
      vendor: String(model.vendor || 'Unknown').trim(),
      submodel: model.submodel || '',
      context_window: Number(model.context_window || model.context_length || 0),
      architecture: model.architecture || '',
      params_billion: model.params_billion ?? model.params ?? null,
      inference_speed_tps: model.inference_speed_tps ?? model.speed ?? null,
      quantization: model.quantization || '',
      notes: model.notes || '',
      api_id: model.api_id || model.id || model.name || ''
    };

    return { ...normalized, _power: computePower(normalized) };
  }

  function uniqById(models) {
    const seen = new Set();
    return models.filter(model => {
      const key = String(model.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function applyTheme(theme) {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    if (themeToggle) themeToggle.textContent = theme === 'dark' ? 'Light' : 'Dark';
  }

  function getFilteredSortedModels() {
    const term = String(globalSearch?.value || '').trim().toLowerCase();
    const sortMode = sortSelect?.value || 'power_desc';

    const filtered = globalModelsData.filter(model => {
      if (!term) return true;
      return [
        model.model_name,
        model.vendor,
        model.submodel,
        model.architecture,
        model.notes,
        model.api_id,
        String(model.id)
      ].some(value => String(value || '').toLowerCase().includes(term));
    });

    return filtered.sort((a, b) => {
      if (sortMode === 'power_asc') return (a._power || 0) - (b._power || 0);
      if (sortMode === 'params_desc') return (b.params_billion || 0) - (a.params_billion || 0);
      if (sortMode === 'speed_desc') return (b.inference_speed_tps || 0) - (a.inference_speed_tps || 0);
      return (b._power || 0) - (a._power || 0);
    });
  }

  function renderCatalog(models) {
    if (!catalogBody) return;

    const rows = models.map(model => `
      <tr>
        <td>${escapeHtml(String(model.id))}</td>
        <td>${escapeHtml(model.model_name)}</td>
        <td>${escapeHtml(model.vendor)}</td>
        <td>${escapeHtml(model.submodel || '')}</td>
        <td>${model.context_window ? Number(model.context_window).toLocaleString() : ''}</td>
        <td>${model.params_billion ?? ''}</td>
      </tr>
    `).join('');

    catalogBody.innerHTML = rows || '<tr><td colspan="6" class="text-center text-muted py-4">No models match your search.</td></tr>';
  }

  function syncCatalog() {
    renderCatalog(getFilteredSortedModels());
  }

  async function loadModels() {
    globalModelsData = uniqById(AI_BENCHMARK_DATABASE.map(normalizeModel));

    if (wizard && typeof wizard.setDataset === 'function') {
      wizard.setDataset(globalModelsData);
    }

    syncCatalog();
  }

  function simulateRun(payload, ms = 1200) {
    return new Promise(resolve => {
      setTimeout(() => {
        const left = globalModelsData.find(m => String(m.id) === String(payload.modelA)) || {};
        const right = globalModelsData.find(m => String(m.id) === String(payload.modelB)) || {};

        const leftSpeed = left.inference_speed_tps || 1;
        const rightSpeed = right.inference_speed_tps || 1;
        const leftLatencyMs = Math.round((1000 / Math.max(1, leftSpeed)) * 10) / 10;
        const rightLatencyMs = Math.round((1000 / Math.max(1, rightSpeed)) * 10) / 10;
        const leftMem = left.params_billion ? Math.round(left.params_billion * 2) : null;
        const rightMem = right.params_billion ? Math.round(right.params_billion * 2) : null;
        const costBucket = p => (p.params_billion || 0) > 200 ? 'high' : (p.params_billion || 0) > 20 ? 'medium' : 'low';
        const taskScore = p => Math.min(100, Math.round((p._power || 0) / 10));

        resolve({
          runId: 'sim-' + Date.now(),
          left,
          right,
          metrics: {
            leftPower: left._power || 0,
            rightPower: right._power || 0,
            leftSpeed,
            rightSpeed,
            leftLatencyMs,
            rightLatencyMs,
            leftMem,
            rightMem,
            leftCost: costBucket(left),
            rightCost: costBucket(right),
            leftTaskScore: taskScore(left),
            rightTaskScore: taskScore(right)
          },
          summary: 'Simulated comparison complete'
        });
      }, ms);
    });
  }

  function renderResultCard(payload, result) {
    const left = result.left || {};
    const right = result.right || {};
    const m = result.metrics || {};

    const costBadge = c => {
      const color = c === 'high' ? 'danger' : c === 'medium' ? 'warning' : 'success';
      return `<span class="badge bg-${color}">${escapeHtml(c)}</span>`;
    };

    return `
      <div class="compare-card form-step" id="resultCard">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <h5 class="mb-0">Comparison result - ${escapeHtml(result.runId)}</h5>
          <div class="small-muted">Max tokens: ${escapeHtml(String(payload.maxTokens))}</div>
        </div>

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
                <td>Params (B)</td>
                <td>${left.params_billion ?? '-'}</td>
                <td>${right.params_billion ?? '-'}</td>
              </tr>
              <tr>
                <td>Power Score (Heuristic)</td>
                <td>${(left._power || 0).toFixed(2)}</td>
                <td>${(right._power || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td>Speed (tps)</td>
                <td>${m.leftSpeed ?? '-'}</td>
                <td>${m.rightSpeed ?? '-'}</td>
              </tr>
              <tr>
                <td>Est. Latency (ms)</td>
                <td>${m.leftLatencyMs ?? '-'}</td>
                <td>${m.rightLatencyMs ?? '-'}</td>
              </tr>
              <tr>
                <td>Est. VRAM Required (GB)</td>
                <td>${m.leftMem ?? '-'}</td>
                <td>${m.rightMem ?? '-'}</td>
              </tr>
              <tr>
                <td>Cost Proxy</td>
                <td>${costBadge(m.leftCost)}</td>
                <td>${costBadge(m.rightCost)}</td>
              </tr>
              <tr>
                <td>Task Proxy Score</td>
                <td>${m.leftTaskScore || 0}/100</td>
                <td>${m.rightTaskScore || 0}/100</td>
              </tr>
              <tr>
                <td>Architecture</td>
                <td>${escapeHtml(left.architecture || '-')}</td>
                <td>${escapeHtml(right.architecture || '-')}</td>
              </tr>
              <tr>
                <td>Quantization</td>
                <td>${escapeHtml(left.quantization || '-')}</td>
                <td>${escapeHtml(right.quantization || '-')}</td>
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
