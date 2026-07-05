// src/components/APIClient.js
// Fetches benchmark data from the external API and normalizes records for the UI.

export default class APIClient {
  constructor({
    endpoint = 'https://api.example.com/models',
    apiKey = ''
  } = {}) {
    this.endpoint = endpoint;
    this.apiKey = apiKey || (typeof window !== 'undefined' ? window.__API_KEY__ : '') || '';
    this.state = {
      status: 'idle',
      loading: false,
      error: null
    };
  }

  _setState(patch) {
    this.state = { ...this.state, ...patch };
    return this.state;
  }

  _cleanProviderSlug(value) {
    return String(value || '').trim().replace(/^~+/, '');
  }

  _formatVendorName(value) {
    const cleaned = this._cleanProviderSlug(value);
    return cleaned
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Unknown';
  }

  _slugToDisplayName(slug) {
    return this._cleanProviderSlug(String(slug || ''))
      .replace(/:.*$/, '')
      .split(/[-_/]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  _stripVendorPrefixFromName(name, vendor) {
    const raw = String(name || '').trim();
    if (!raw) return raw;

    const vendorPrefix = new RegExp(`^${String(vendor || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:/\\-–—]\\s*`, 'i');
    if (vendorPrefix.test(raw)) {
      return raw.replace(vendorPrefix, '').trim();
    }

    return raw.replace(/^[^:]+:\s*/, '').trim() || raw;
  }

  _formatModelName(model, vendor, id) {
    const apiName = model.name || model.model_name || '';
    const strippedName = this._stripVendorPrefixFromName(apiName, vendor);
    if (strippedName) return strippedName;

    const slugTail = String(id || '').split('/').pop();
    return this._slugToDisplayName(slugTail) || String(id) || 'Unknown model';
  }

  _extractVendor(model) {
    const explicitVendor = model.vendor || model.provider || model.provider_name;
    if (explicitVendor) return this._formatVendorName(explicitVendor);

    const id = String(model.id || model.api_id || '');
    if (id.includes('/')) {
      return this._formatVendorName(id.split('/')[0]);
    }

    return 'Unknown';
  }

  _normalizeModel(model) {
    const id = model.id ?? model.api_id ?? model.name ?? model.model_name ?? '';
    const vendor = this._extractVendor({ ...model, id });
    const contextWindow = Number(model.context_window ?? model.context_length ?? model.max_context ?? 0);
    const modelName = this._formatModelName(model, vendor, id);
    const created = Number(model.created);

    return {
      id,
      model_name: modelName,
      vendor,
      context_window: Number.isFinite(contextWindow) ? contextWindow : 0,
      architecture: model.architecture?.modality || model.architecture?.tokenizer || model.architecture || '',
      pricing: {
        prompt: model.pricing?.prompt ?? null,
        completion: model.pricing?.completion ?? null
      },
      created: Number.isFinite(created) ? created : null,
      notes: model.notes || model.description || '',
      api_id: model.id || model.api_id || '',
      source: 'external'
    };
  }

  _dedupeById(models) {
    const seen = new Set();
    return models.filter(model => {
      const key = String(model.id);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  normalizeBenchmarks(models = []) {
    return this._dedupeById(
      models
        .filter(Boolean)
        .map(model => this._normalizeModel(model))
    );
  }

  async fetchExternalBenchmarks() {
    if (!this.endpoint) {
      return { ok: true, data: [], error: null, skipped: true };
    }

    const headers = {
      Accept: 'application/json'
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    try {
      const response = await fetch(this.endpoint, { method: 'GET', headers });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} while fetching benchmark data.`);
      }

      const payload = await response.json();
      const records = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

      return { ok: true, data: records, error: null, skipped: false };
    } catch (error) {
      return {
        ok: false,
        data: [],
        error: error instanceof Error ? error : new Error('Failed to fetch external benchmark data.'),
        skipped: false
      };
    }
  }

  async fetchBenchmarks({ includeMeta = false } = {}) {
    this._setState({ loading: true, status: 'loading', error: null });

    try {
      const externalResult = await this.fetchExternalBenchmarks();

      if (!externalResult.ok) {
        this._setState({
          loading: false,
          status: 'error',
          error: externalResult.error
        });

        return includeMeta
          ? { ok: false, data: [], error: externalResult.error }
          : [];
      }

      if (externalResult.skipped || externalResult.data.length === 0) {
        const emptyState = { ok: true, data: [], error: null };
        this._setState({ loading: false, status: 'empty', error: null });
        return includeMeta ? emptyState : [];
      }

      const normalizedData = this.normalizeBenchmarks(externalResult.data);

      if (normalizedData.length === 0) {
        const emptyState = { ok: true, data: [], error: null };
        this._setState({ loading: false, status: 'empty', error: null });
        return includeMeta ? emptyState : [];
      }

      this._setState({ loading: false, status: 'success', error: null });
      return includeMeta ? { ok: true, data: normalizedData, error: null } : normalizedData;
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error('Failed to load benchmark data.');
      this._setState({ loading: false, status: 'error', error: normalizedError });

      return includeMeta
        ? { ok: false, data: [], error: normalizedError }
        : [];
    }
  }

  getState() {
    return { ...this.state };
  }

  async getModelById(id) {
    const data = await this.fetchBenchmarks();
    if (!Array.isArray(data) || data.length === 0) return null;
    return data.find(model => String(model.id) === String(id)) || null;
  }

  async searchModels(keyword) {
    const data = await this.fetchBenchmarks();
    if (!Array.isArray(data) || data.length === 0) return [];

    const term = String(keyword || '').trim().toLowerCase();
    if (!term) return [];

    return data.filter(model =>
      String(model.model_name || '').toLowerCase().includes(term) ||
      String(model.vendor || '').toLowerCase().includes(term) ||
      String(model.api_id || '').toLowerCase().includes(term)
    );
  }
}
