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

  _applyVendorFilter() {
    const vendorSelect = document.getElementById('wizardWorkload');
    const selectedVendor = vendorSelect ? this._normalizeVendor(vendorSelect.value) : 'ALL';

    let filteredData = this.apiDataset;

    if (selectedVendor !== 'ALL') {
      filteredData = this.apiDataset.filter(model =>
        this._normalizeVendor(model.vendor) === selectedVendor
      );
    }

    this._renderDropdowns(filteredData);
  }

  _renderVendorOptions(modelsArray) {
    const vendorSelect = document.getElementById('wizardWorkload');
    if (!vendorSelect) return;

    const currentValue = vendorSelect.value || 'all';
    const vendors = Array.from(new Set(
      modelsArray
        .map(model => String(model.vendor || '').trim())
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b));

    vendorSelect.innerHTML = [
      '<option value="all">All Vendors</option>',
      ...vendors.map(vendor => `<option value="${this._escapeHtml(vendor)}">${this._escapeHtml(vendor)}</option>`)
    ].join('');

    const normalizedCurrent = this._normalizeVendor(currentValue);
    const hasCurrentValue = normalizedCurrent === 'ALL' || Array.from(vendorSelect.options)
      .some(option => this._normalizeVendor(option.value) === normalizedCurrent);

    vendorSelect.value = hasCurrentValue ? currentValue : 'all';
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

  _renderDropdowns(modelsArray) {
    const selectA = document.getElementById('wizardModelA');
    const selectB = document.getElementById('wizardModelB');

    if (!selectA || !selectB) return;

    if (modelsArray.length === 0) {
      const emptyHtml = `<option value="">- No models found -</option>`;
      selectA.innerHTML = emptyHtml;
      selectB.innerHTML = emptyHtml;
      return;
    }

    const optionsHtml = modelsArray.map(model =>
      `<option value="${this._escapeHtml(model.id)}">${this._escapeHtml(model.model_name)}</option>`
    ).join('');

    selectA.innerHTML = `<option value="">- select Model A -</option>${optionsHtml}`;
    selectB.innerHTML = `<option value="">- select Model B -</option>${optionsHtml}`;

    this._bindSelectTypeahead(selectA);
    this._bindSelectTypeahead(selectB);
  }

  submit() {
    const modelA = (document.getElementById('wizardModelA')?.value || '').trim();
    const modelB = (document.getElementById('wizardModelB')?.value || '').trim();
    const maxTokensRaw = document.getElementById('wizardMaxTokens')?.value;
    const maxTokens = Number(maxTokensRaw);

    const payload = { modelA, modelB, maxTokens };

    if (!modelA || !modelB) {
      alert('Please select both Model A and Model B before submitting.');
      return;
    }
    if (modelA === modelB) {
      alert('Model A and Model B must be different.');
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
