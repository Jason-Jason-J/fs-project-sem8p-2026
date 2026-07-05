// tests/metrics.test.js
// Browser-friendly test harness for the static benchmark app.
// Loaded by tests/metrics.html so it stays aligned with the project style.

import APIClient from '../src/components/APIClient.js';

const MOCK_API_MODELS = [
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    context_length: 128000,
    pricing: {
      prompt: '0.0000025',
      completion: '0.00001'
    },
    created: 1715367049,
    description: 'OpenAI flagship multimodal model'
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    context_length: 200000,
    pricing: {
      prompt: '0.000003',
      completion: '0.000015'
    },
    created: 1718841600,
    description: 'Anthropic balanced reasoning model'
  },
  {
    id: 'small-lab/gpt-niche-experiment',
    name: 'GPT Niche Experiment',
    context_length: 8192,
    pricing: {
      prompt: '0.0000001',
      completion: '0.0000002'
    },
    created: 1710000000,
    description: 'Less common experimental model'
  }
];

function createSuite() {
  const cases = [];

  function test(name, fn) {
    cases.push({ name, fn });
  }

  async function run() {
    const results = [];

    for (const item of cases) {
      try {
        await item.fn();
        results.push({ name: item.name, ok: true });
      } catch (error) {
        results.push({ name: item.name, ok: false, error });
      }
    }

    return results;
  }

  return { test, run };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

export async function runMetricsTests() {
  const suite = createSuite();

  suite.test('APIClient normalizes external API records', () => {
    const client = new APIClient();
    const normalized = client.normalizeBenchmarks(MOCK_API_MODELS);

    assert(Array.isArray(normalized), 'normalized data should be an array');
    assert(normalized.length === MOCK_API_MODELS.length, 'expected one normalized record per API model');
    assert(normalized[0].model_name === 'GPT-4o', 'model_name should come from the API name field');
    assert(normalized[0].api_id === 'openai/gpt-4o', 'api_id should preserve the external endpoint id');
  });

  suite.test('APIClient strips OpenRouter vendor prefixes and tilde aliases', () => {
    const client = new APIClient();
    const normalized = client.normalizeBenchmarks([
      {
        id: '~anthropic/fable-5',
        name: 'Anthropic: Fable 5',
        context_length: 200000
      }
    ])[0];

    assert(normalized.vendor === 'Anthropic', 'vendor should not include the OpenRouter ~ alias prefix');
    assert(normalized.model_name === 'Fable 5', 'model_name should drop the vendor prefix from the API label');
  });

  suite.test('normalized entries expose the core UI fields', () => {
    const client = new APIClient();
    const sample = client.normalizeBenchmarks([MOCK_API_MODELS[0]])[0];

    assert(sample.id != null, 'id is required');
    assert(sample.model_name, 'model_name is required');
    assert(sample.vendor, 'vendor is required');
    assert(typeof sample.context_window === 'number', 'context_window should be numeric');
  });

  suite.test('APIClient preserves OpenRouter pricing and creation metadata', () => {
    const client = new APIClient();
    const sample = client.normalizeBenchmarks([MOCK_API_MODELS[0]])[0];

    assert(sample.pricing.prompt === '0.0000025', 'pricing.prompt should come from the API pricing object');
    assert(sample.pricing.completion === '0.00001', 'pricing.completion should come from the API pricing object');
    assert(sample.created === 1715367049, 'created should preserve the API Unix timestamp');
  });

  suite.test('APIClient resolves a model from the API dataset', async () => {
    const client = new APIClient();
    client.fetchBenchmarks = async () => client.normalizeBenchmarks(MOCK_API_MODELS);

    const model = await client.getModelById('openai/gpt-4o');
    assert(model?.id === 'openai/gpt-4o', 'expected the requested model');
  });

  suite.test('APIClient searches models by keyword', async () => {
    const client = new APIClient();
    client.fetchBenchmarks = async () => client.normalizeBenchmarks(MOCK_API_MODELS);

    const results = await client.searchModels('gpt');
    assert(results.length > 0, 'expected at least one matching model');
    assert(results[0].id === 'openai/gpt-4o', 'popular GPT models should rank above niche GPT matches');
  });

  return suite.run();
}

// Keep the harness simple when opened directly in the browser.
if (typeof window !== 'undefined') {
  window.runMetricsTests = runMetricsTests;
}
