// assets/js/main.js
import FormWizard from '../../src/components/FormWizard.js';

// Global dataset accessible across functions
let globalModelsData = [];

document.addEventListener('DOMContentLoaded', async () => {
  // 1) Initialize wizard and DOM refs (Stripped dead queries)
  const wizard = new FormWizard({ rootSelector: '#config-wizard' });
  const comparisonArea = document.getElementById('comparison-area');
  const themeToggle = document.getElementById('themeToggle');

  // 2) Small helpers
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

  // 3) Theme toggle (persisted)
  function applyTheme(theme) {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    if (themeToggle) themeToggle.textContent = theme === 'dark' ? 'Light' : 'Dark';
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

  // 4) Fetch models from API and normalize
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        // Ensure you are using a secure, restricted API key here
        'Authorization': 'Bearer YOUR_NEW_API_KEY_HERE'
      }
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const apiData = await response.json();
    const rawModels = apiData.data || [];

    globalModelsData = rawModels
      .filter(model => model.name)
      .map(model => ({
        id: model.id || model.name,
        model_name: model.name || model.id,
        context_window: model.context_length || model.context_window || 0,
        // FATAL FLAW FIXED: Re-added .toUpperCase() to map data correctly for the wizard
        vendor: ((model.id && model.id.split('/')[0]) ? model.id.split('/')[0] : (model.vendor || 'unknown')).toUpperCase(),
        params_billion: model.params_billion || model.params || null,
        inference_speed_tps: model.inference_speed_tps || model.speed || null,
        architecture: model.architecture || '',
        quantization: model.quantization || '',
        notes: model.notes || '',
        api_id: model.id || model.name
      }))
      .map(m => ({ ...m, _power: computePower(m) }));

    // Provide dataset to the wizard
    if (typeof wizard.setDataset === 'function') {
      try { wizard.setDataset(globalModelsData); } catch (err) { console.warn('wizard.setDataset failed', err); }
    }

    console.log(`Loaded ${globalModelsData.length} models from OpenRouter.`);
  } catch (error) {
    console.error('Failed to fetch API data. Network error or CORS issue:', error);
  }

  // 5) Simulate run (richer metrics + animation-friendly)
  function simulateRun(payload, ms = 1200) {
    return new Promise(resolve => {
      setTimeout(() => {
        const left = globalModelsData.find(m => String(m.id) === String(payload.modelA)) || {};
        const right = globalModelsData.find(m => String(m.id) === String(payload.modelB)) || {};

        const leftSpeed = left.inference_speed_tps || 1;
        const rightSpeed = right.inference_speed_tps || 1;
        const leftLatencyMs = Math.round(1000 / Math.max(1, leftSpeed) * 10) / 10;
        const rightLatencyMs = Math.round(1000 / Math.max(1, rightSpeed) * 10) / 10;
        const leftMem = left.params_billion ? Math.round(left.params_billion * 2) : null;
        const rightMem = right.params_billion ? Math.round(right.params_billion * 2) : null;
        const costBucket = p => (p.params_billion || 0) > 200 ? 'high' : (p.params_billion || 0) > 20 ? 'medium' : 'low';
        const taskScore = p => Math.min(100, Math.round((p._power || 0) / 10));

        const result = {
          runId: 'sim-' + Date.now(),
          left, right,
          metrics: {
            leftPower: left._power || 0,
            rightPower: right._power || 0,
            leftSpeed, rightSpeed,
            leftLatencyMs, rightLatencyMs,
            leftMem, rightMem,
            leftCost: costBucket(left), rightCost: costBucket(right),
            leftTaskScore: taskScore(left), rightTaskScore: taskScore(right)
          },
          summary: 'Simulated comparison complete'
        };
        resolve(result);
      }, ms);
    });
  }

  // 6) Render richer result card (animated)
  function renderResultCard(payload, result) {
    const left = result.left || {};
    const right = result.right || {};
    const m = result.metrics || {};

    const costBadge = (c) => {
      const color = c === 'high' ? 'danger' : c === 'medium' ? 'warning' : 'success';
      return `<span class="badge bg-${color}">${c}</span>`;
    };

    return `
      <div class="compare-card form-step" id="resultCard">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <h5 class="mb-0">Comparison result — ${result.runId}</h5>
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
                <td>${left.context_window ? Number(left.context_window).toLocaleString() : ''}</td>
                <td>${right.context_window ? Number(right.context_window).toLocaleString() : ''}</td>
              </tr>
              <tr>
                <td>Params (B)</td>
                <td>${left.params_billion || '—'}</td>
                <td>${right.params_billion || '—'}</td>
              </tr>
              <tr>
                <td>Power Score (Heuristic)</td>
                <td>${(left._power||0).toFixed(2)}</td>
                <td>${(right._power||0).toFixed(2)}</td>
              </tr>
              <tr>
                <td>Speed (tps)</td>
                <td>${m.leftSpeed || '—'}</td>
                <td>${m.rightSpeed || '—'}</td>
              </tr>
              <tr>
                <td>Est. Latency (ms)</td>
                <td>${m.leftLatencyMs || '—'}</td>
                <td>${m.rightLatencyMs || '—'}</td>
              </tr>
              <tr>
                <td>Est. VRAM Required (GB)</td>
                <td>${m.leftMem || '—'}</td>
                <td>${m.rightMem || '—'}</td>
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
                <td>${escapeHtml(left.architecture || '—')}</td>
                <td>${escapeHtml(right.architecture || '—')}</td>
              </tr>
              <tr>
                <td>Quantization</td>
                <td>${escapeHtml(left.quantization || '—')}</td>
                <td>${escapeHtml(right.quantization || '—')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 7) Handle wizardSubmitted: show spinner/progress, simulate, then render
  document.addEventListener('wizardSubmitted', (e) => {
    const p = e.detail || {};
    if (!p.modelA || !p.modelB || p.modelA === p.modelB) {
      if (comparisonArea) comparisonArea.innerHTML = `<div class="alert alert-warning">Please choose two different models.</div>`;
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

    simulateRun(p, 1200).then(result => {
      if (progressBar) progressBar.style.width = '100%';
      setTimeout(() => {
        if (comparisonArea) {
          comparisonArea.innerHTML = renderResultCard(p, result);
          const card = document.getElementById('resultCard');
          // Trigger the entrance animation
          if (card) {
            void card.offsetWidth; 
            card.classList.add('active');
          }
        }
      }, 300);
    }).catch(err => {
      if (comparisonArea) comparisonArea.innerHTML = `<div class="alert alert-danger">Simulation failed</div>`;
      console.error('simulateRun error', err);
    });
  });
});