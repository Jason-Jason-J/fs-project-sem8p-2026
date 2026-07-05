// src/components/FormWizard.js
// Manages the multi-step form state, DOM transitions, and client-side data filtering.

export default class FormWizard {
  constructor({
    rootSelector = '#config-wizard',
    stepSelector = '.wizard-step',
    nextSelector = '#nextBtn',
    prevSelector = '#prevBtn',
    statusSelector = '#wizardStatus'
  } = {}) {
    this.root = document.querySelector(rootSelector);
    if (!this.root) {
      console.error('FormWizard: Root element not found.');
      return;
    }

    this.steps = Array.from(this.root.querySelectorAll(stepSelector));
    this.nextBtn = this.root.querySelector(nextSelector);
    this.prevBtn = this.root.querySelector(prevSelector);
    this.statusEl = this.root.querySelector(statusSelector);
    this.currentIndex = 0;
    this.apiDataset = [];
    this._typeaheadBuffers = new WeakMap();

    this._bindHandlers();
    this._showStep(this.currentIndex, true);
  }

  _bindHandlers() {
    if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.next());
    if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.prev());

    this.root.addEventListener('change', (event) => {
      const id = event.target?.id;
      if (id === 'wizardVendorA') this._renderSideDropdown('A');
      if (id === 'wizardVendorB') this._renderSideDropdown('B');
      if (id === 'wizardWorkload') this._applyVendorFilter();
    });

    document.addEventListener('keydown', (e) => {
      if (!this.root.contains(document.activeElement)) return;
      if (e.key === 'ArrowRight') this.next();
      if (e.key === 'ArrowLeft') this.prev();
    });
  }

  _showStep(index) {
    this.steps.forEach((el, i) => {
      if (i === index) {
        el.classList.remove('hidden');
        el.classList.add('visible');
        void el.offsetWidth;
        el.classList.add('active');
      } else {
        el.classList.remove('active', 'visible');
        el.classList.add('hidden');
      }
    });

    this._updateControls(index);
  }

  _updateControls(index) {
    if (this.prevBtn) {
      if (index === 0) this.prevBtn.classList.add('d-none');
      else this.prevBtn.classList.remove('d-none');
    }

    if (this.nextBtn) {
      this.nextBtn.textContent = index === this.steps.length - 1 ? 'Submit Configuration' : 'Next Step';
    }

    if (this.statusEl) {
      this.statusEl.textContent = `Step ${index + 1} of ${this.steps.length}`;
    }
  }

  setDataset(dataArray) {
    if (!Array.isArray(dataArray)) {
      console.error('FormWizard: Expected an array for dataset.');
      return;
    }
    this.apiDataset = dataArray;
    this._renderVendorOptions(dataArray);
    this._renderDropdowns();
  }

  _escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  next() {
    if (this.currentIndex === 0) {
      this._applyVendorFilter();
    }

    if (this.currentIndex < this.steps.length - 1) {
      this.currentIndex += 1;
      this._showStep(this.currentIndex);
    } else if (this.currentIndex === this.steps.length - 1) {
      this.submit();
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex -= 1;
      this._showStep(this.currentIndex);
    }
  }

  _normalizeVendor(value) {
    return String(value || '').trim().replace(/^~+/, '').toUpperCase();
  }

  _getVendorPopularityScore(vendor) {
    const normalizedVendor = this._normalizeVendor(vendor);
    const scores = new Map([
      ['OPENAI', 120],
      ['ANTHROPIC', 115],
      ['GOOGLE', 105],
      ['META', 95],
      ['MISTRAL', 82],
      ['DEEPSEEK', 78],
      ['X AI', 72],
      ['QWEN', 68],
      ['COHERE', 62],
      ['PERPLEXITY', 56],
      ['MICROSOFT', 52],
      ['AMAZON', 48],
      ['NVIDIA', 44]
    ]);

    return scores.get(normalizedVendor) || 0;
  }

  _applyVendorFilter() {
    const legacyVendorSelect = document.getElementById('wizardWorkload');
    const legacyVendor = legacyVendorSelect?.value;

    if (legacyVendor) {
      const vendorA = document.getElementById('wizardVendorA');
      const vendorB = document.getElementById('wizardVendorB');
      if (vendorA && !vendorA.value) vendorA.value = legacyVendor;
      if (vendorB && !vendorB.value) vendorB.value = legacyVendor;
    }

    this._renderDropdowns();
  }

  _renderVendorOptions(modelsArray) {
    const vendorSelects = [
      document.getElementById('wizardVendorA'),
      document.getElementById('wizardVendorB'),
      document.getElementById('wizardWorkload')
    ].filter(Boolean);

    if (vendorSelects.length === 0) return;

    const vendors = Array.from(new Set(
      modelsArray
        .map(model => String(model.vendor || '').trim())
        .filter(Boolean)
    )).sort((a, b) => {
      const popularityDiff = this._getVendorPopularityScore(b) - this._getVendorPopularityScore(a);
      if (popularityDiff !== 0) return popularityDiff;
      return a.localeCompare(b);
    });

    for (const vendorSelect of vendorSelects) {
      const currentValue = vendorSelect.value || 'all';
      vendorSelect.innerHTML = [
        '<option value="all">All Vendors</option>',
        ...vendors.map(vendor => `<option value="${this._escapeHtml(vendor)}">${this._escapeHtml(vendor)}</option>`)
      ].join('');

      const normalizedCurrent = this._normalizeVendor(currentValue);
      const hasCurrentValue = normalizedCurrent === 'ALL' || Array.from(vendorSelect.options)
        .some(option => this._normalizeVendor(option.value) === normalizedCurrent);

      vendorSelect.value = hasCurrentValue ? currentValue : 'all';
    }
  }

  _bindSelectTypeahead(select) {
    if (!select || select.dataset.typeaheadBound === 'true') return;

    select.dataset.typeaheadBound = 'true';
    select.addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.length !== 1) return;

      event.preventDefault();

      const buffer = (this._typeaheadBuffers.get(select) || '') + event.key;
      this._typeaheadBuffers.set(select, buffer);

      clearTimeout(select._typeaheadResetTimer);
      select._typeaheadResetTimer = setTimeout(() => {
        this._typeaheadBuffers.set(select, '');
      }, 700);

      const term = buffer.trim().toLowerCase();
      if (!term) return;

      const match = Array.from(select.options).find(option =>
        option.value && option.text.toLowerCase().includes(term)
      );

      if (match) {
        select.value = match.value;
        match.selected = true;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  _sortModelsByLatest(modelsArray) {
    return [...modelsArray].sort((a, b) => {
      const createdDiff = (Number(b.created) || 0) - (Number(a.created) || 0);
      if (createdDiff !== 0) return createdDiff;

      return String(a.model_name || '').localeCompare(String(b.model_name || ''));
    });
  }

  _getModelsForSide(side) {
    const vendorSelect = document.getElementById(`wizardVendor${side}`) || document.getElementById('wizardWorkload');
    const selectedVendor = vendorSelect ? this._normalizeVendor(vendorSelect.value) : 'ALL';

    let filteredData = this.apiDataset;

    if (selectedVendor !== 'ALL') {
      filteredData = filteredData.filter(model =>
        this._normalizeVendor(model.vendor) === selectedVendor
      );
    }

    return this._sortModelsByLatest(filteredData);
  }

  _renderSideDropdown(side) {
    const select = document.getElementById(`wizardModel${side}`);
    if (!select) return;

    const modelsArray = this._getModelsForSide(side);
    const selectedValue = select.value;

    if (modelsArray.length === 0) {
      select.innerHTML = `<option value="">- No models found -</option>`;
      return;
    }

    const optionsHtml = modelsArray.map(model =>
      `<option value="${this._escapeHtml(model.id)}">${this._escapeHtml(model.model_name)}</option>`
    ).join('');

    select.innerHTML = `<option value="">- select model -</option>${optionsHtml}`;

    if (modelsArray.some(model => String(model.id) === String(selectedValue))) {
      select.value = selectedValue;
    }

    this._bindSelectTypeahead(select);
  }

  _renderDropdowns() {
    this._renderSideDropdown('A');
    this._renderSideDropdown('B');
  }

  submit() {
    const modelA = (document.getElementById('wizardModelA')?.value || '').trim();
    const modelB = (document.getElementById('wizardModelB')?.value || '').trim();
    const maxTokensRaw = document.getElementById('wizardMaxTokens')?.value;
    const maxTokens = Number(maxTokensRaw);

    const payload = { modelA, modelB, maxTokens };

    if (!modelA || !modelB) {
      alert('Please select both models before submitting.');
      return;
    }
    if (modelA === modelB) {
      alert('The selected models must be different.');
      return;
    }
    if (!Number.isFinite(maxTokens) || maxTokens <= 0) {
      alert('Max tokens must be a positive number.');
      return;
    }

    console.log('Wizard Payload Ready:', payload);

    const event = new CustomEvent('wizardSubmitted', { detail: payload });
    document.dispatchEvent(event);

    try {
      localStorage.setItem('cmh_last_config', JSON.stringify(payload));
    } catch (e) {
      console.warn('Could not persist config to localStorage', e);
    }

    return payload;
  }
}
