// tests/metrics.test.js
// Browser-friendly test harness for the static benchmark app.
// Loaded by tests/metrics.html so it stays aligned with the project style.

import APIClient from '../src/components/APIClient.js';
import { AI_BENCHMARK_DATABASE } from '../src/data/data.js';

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

  suite.test('dataset exposes benchmark entries', () => {
    assert(Array.isArray(AI_BENCHMARK_DATABASE), 'dataset should be an array');
    assert(AI_BENCHMARK_DATABASE.length > 0, 'dataset should not be empty');
  });

  suite.test('dataset entries have the core UI fields', () => {
    const sample = AI_BENCHMARK_DATABASE[0];
    assert(sample.id != null, 'id is required');
    assert(sample.model_name, 'model_name is required');
    assert(sample.vendor, 'vendor is required');
    assert(typeof sample.context_window === 'number', 'context_window should be numeric');
  });

  suite.test('APIClient resolves a model from the local dataset', async () => {
    const client = new APIClient();
    client.fetchBenchmarks = async () => AI_BENCHMARK_DATABASE;

    const model = await client.getModelById(AI_BENCHMARK_DATABASE[0].id);
    assert(model?.id === AI_BENCHMARK_DATABASE[0].id, 'expected the requested model');
  });

  suite.test('APIClient searches models by keyword', async () => {
    const client = new APIClient();
    client.fetchBenchmarks = async () => AI_BENCHMARK_DATABASE;

    const results = await client.searchModels('gpt');
    assert(results.length > 0, 'expected at least one matching model');
  });

  return suite.run();
}

// Keep the harness simple when opened directly in the browser.
if (typeof window !== 'undefined') {
  window.runMetricsTests = runMetricsTests;
}
