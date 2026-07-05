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

  _normalizeSearchText(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  _getModelPopularityScore(model) {
    const vendor = this._normalizeSearchText(model.vendor);
    const haystack = this._normalizeSearchText(`${model.vendor || ''} ${model.model_name || ''} ${model.api_id || ''}`);
    const providerWeights = new Map([
      ['openai', 120],
      ['anthropic', 115],
      ['google', 100],
      ['meta', 90],
      ['mistral', 78],
      ['deepseek', 74],
      ['x ai', 68],
      ['qwen', 64],
      ['cohere', 58]
    ]);
    const familyWeights = [
      ['gpt 5', 190],
      ['claude sonnet 4', 180],
      ['gemini 2 5 pro', 172],
      ['gpt 4 1', 168],
      ['gpt 4o', 164],
      ['o3', 154],
      ['claude 3 7', 152],
      ['claude 3 5', 146],
      ['gemini 2 5 flash', 142],
      ['o4', 138],
      ['deepseek r1', 132],
      ['llama 4', 128],
      ['deepseek v3', 122],
      ['qwen3', 116],
      ['llama 3 3', 112],
      ['mistral large', 104],
      ['gpt', 88],
      ['claude', 86],
      ['gemini', 82],
      ['llama', 70],
      ['deepseek', 68],
      ['qwen', 62],
      ['mistral', 58]
    ];

    let score = providerWeights.get(vendor) || 0;

    for (const [needle, weight] of familyWeights) {
      if (haystack.includes(needle)) score += weight;
    }

    const contextWindow = Number(model.context_window);
    if (Number.isFinite(contextWindow) && contextWindow > 0) {
      score += Math.min(40, Math.log2(contextWindow) * 2);
    }

    return score;
  }

  _getSearchRelevanceScore(model, searchTerm) {
    const normalizedTerm = this._normalizeSearchText(searchTerm);
    if (!normalizedTerm) return 0;

    const modelName = this._normalizeSearchText(model.model_name);
    const apiId = this._normalizeSearchText(model.api_id || model.id);
    const vendor = this._normalizeSearchText(model.vendor);
    const haystack = `${modelName} ${apiId} ${vendor}`;
    const terms = normalizedTerm.split(/\s+/).filter(Boolean);

    if (modelName === normalizedTerm || apiId === normalizedTerm) return 1200;
    if (modelName.startsWith(normalizedTerm) || apiId.startsWith(normalizedTerm)) return 900;
    if (terms.every(term => haystack.includes(term))) return 650;
    if (terms.some(term => modelName.split(/\s+/).some(word => word.startsWith(term)))) return 420;
    if (haystack.includes(normalizedTerm)) return 280;

    return 0;
  }

  _sortModelsBySearchRelevance(models, searchTerm) {
    return [...models].sort((a, b) => {
      const relevanceDiff = this._getSearchRelevanceScore(b, searchTerm) - this._getSearchRelevanceScore(a, searchTerm);
      if (relevanceDiff !== 0) return relevanceDiff;

      const popularityDiff = this._getModelPopularityScore(b) - this._getModelPopularityScore(a);
      if (popularityDiff !== 0) return popularityDiff;

      const contextDiff = (Number(b.context_window) || 0) - (Number(a.context_window) || 0);
      if (contextDiff !== 0) return contextDiff;

      const createdDiff = (Number(b.created) || 0) - (Number(a.created) || 0);
      if (createdDiff !== 0) return createdDiff;

      return String(a.model_name || '').localeCompare(String(b.model_name || ''));
    });
  }

  async searchModels(keyword) {
    const data = await this.fetchBenchmarks();
    if (!Array.isArray(data) || data.length === 0) return [];

    const term = String(keyword || '').trim().toLowerCase();
    if (!term) return [];

    const searchTerms = this._normalizeSearchText(term).split(/\s+/).filter(Boolean);
    const results = data.filter(model => {
      const haystack = this._normalizeSearchText(`${model.model_name || ''} ${model.vendor || ''} ${model.api_id || ''} ${model.id || ''}`);
      return searchTerms.every(searchTerm => haystack.includes(searchTerm));
    });

    return this._sortModelsBySearchRelevance(results, term);
  }
}
