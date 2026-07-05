// src/components/SelectionManager.js
// Manages model selection state and renders a simple comparison view.

export default class SelectionManager {
  constructor({ tableBodySelector = '#benchmarkBody', compareBtnSelector = '#compareBtn', selectAllSelector = '#selectAll', comparisonAreaSelector = '#comparison-area' } = {}) {
    this.tableBody = document.querySelector(tableBodySelector);
    this.compareBtn = document.querySelector(compareBtnSelector);
    this.selectAll = document.querySelector(selectAllSelector);
    this.comparisonArea = document.querySelector(comparisonAreaSelector);
    this.selected = new Set();

    this._bind();
  }

  _bind() {
    if (this.tableBody) {
      this.tableBody.addEventListener('change', (e) => {
        const target = e.target;
        if (target && target.matches('input.model-select')) {
          const id = String(target.dataset.id);
          if (target.checked) this.selected.add(id);
          else this.selected.delete(id);
          this._updateCompareButton();
        }
      });
    }

    if (this.selectAll) {
      this.selectAll.addEventListener('change', (e) => {
        const checked = e.target.checked;
        this._toggleAll(checked);
      });
    }

    if (this.compareBtn) {
      this.compareBtn.addEventListener('click', () => this.renderComparison());
    }
  }

  attachData(models) {
    // Called after table rows are rendered to ensure checkboxes exist
    this.models = Array.isArray(models) ? models : [];
    this.selected.clear();
    if (this.selectAll) this.selectAll.checked = false;
    this._updateCompareButton();
  }

  _toggleAll(checked) {
    const inputs = Array.from(this.tableBody.querySelectorAll('input.model-select'));
    inputs.forEach(input => {
      input.checked = checked;
      const id = String(input.dataset.id);
      if (checked) this.selected.add(id);
      else this.selected.delete(id);
    });
    this._updateCompareButton();
  }

  _updateCompareButton() {
    if (!this.compareBtn) return;
    this.compareBtn.disabled = this.selected.size < 2; // require at least 2 models to compare
  }

  getSelectedModels() {
    if (!this.models) return [];
    return this.models.filter(m => this.selected.has(m.id));
  }

  _formatPrice(value) {
    if (value == null || value === '') return 'Data Unavailable';
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0) return 'Data Unavailable';
    return `$${numericValue.toLocaleString(undefined, { maximumFractionDigits: 10 })}/token`;
  }

  _formatUnixDate(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) return 'Data Unavailable';
    return new Date(numericValue * 1000).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  renderComparison() {
    const selected = this.getSelectedModels();
    if (!this.comparisonArea) return;
    if (selected.length < 2) {
      this.comparisonArea.innerHTML = `<div class="alert alert-info">Select at least two models to compare.</div>`;
      return;
    }

    // Build a simple comparison table
    const headers = ['Model', 'Vendor', 'Context Window', 'Architecture', 'Input Cost', 'Output Cost', 'Added to OpenRouter'];
    const headerRow = headers.map(h => `<th>${h}</th>`).join('');
    const rows = selected.map(model => `
      <tr>
        <td>${model.model_name}</td>
        <td>${model.vendor}</td>
        <td>${model.context_window.toLocaleString()}</td>
        <td>${model.architecture}</td>
        <td>${this._formatPrice(model.pricing?.prompt)}</td>
        <td>${this._formatPrice(model.pricing?.completion)}</td>
        <td>${this._formatUnixDate(model.created)}</td>
      </tr>
    `).join('');

    this.comparisonArea.innerHTML = `
      <h4 class="h6 mb-2">Comparison (${selected.length} models)</h4>
      <div class="table-responsive">
        <table class="table table-bordered">
          <thead class="table-light"><tr>${headerRow}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }
}
