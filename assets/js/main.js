import { AI_BENCHMARK_DATABASE } from '../../src/data/data.js';
import { FormWizard } from '../../src/components/FormWizard.js';

console.log('AI_BENCHMARK_DATABASE loaded, entries:', AI_BENCHMARK_DATABASE.length);
console.table(AI_BENCHMARK_DATABASE.slice(0, 10));

// Instantiate the class to attach the event listener to the DOM
const wizard = new FormWizard();