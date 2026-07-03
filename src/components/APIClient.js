// src/components/APIClient.js
// Handles simulated API calls and benchmark data retrieval.

export default class APIClient {
  constructor(endpoint = '/mock-endpoint') {
    this.endpoint = endpoint;
  }

  async fetchBenchmarks() {
    try {
      // Simulated delay to mimic network latency
      await new Promise(resolve => setTimeout(resolve, 600));

      // Import the local dataset
      const { AI_BENCHMARK_DATABASE } = await import('../data/data.js');
      console.log('Fetched benchmark data:', AI_BENCHMARK_DATABASE.length, 'entries');
      return AI_BENCHMARK_DATABASE;
    } catch (error) {
      console.error('APIClient fetchBenchmarks error:', error);
      throw new Error('Failed to load benchmark data');
    }
  }

  async getModelById(id) {
    const data = await this.fetchBenchmarks();
    return data.find(model => model.id === id) || null;
  }

  async searchModels(keyword) {
    const data = await this.fetchBenchmarks();
    const term = keyword.toLowerCase();
    return data.filter(model => model.model_name.toLowerCase().includes(term));
  }
}
