// assets/js/main.js
import { AI_BENCHMARK_DATABASE } from '../../src/data/data.js';
import FormWizard from '../../src/components/FormWizard.js';

console.log('AI_BENCHMARK_DATABASE loaded, entries:', AI_BENCHMARK_DATABASE.length);

document.addEventListener('DOMContentLoaded', () => {
  const wizard = new FormWizard({ rootSelector: 'body' });
});
import APIClient from '../../src/components/APIClient.js';

document.addEventListener('DOMContentLoaded', async () => {
  const api = new APIClient();
  const results = await api.fetchBenchmarks();
  console.log('APIClient test:', results.slice(0, 3));
});

