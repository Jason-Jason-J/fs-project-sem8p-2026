# ComputeMetrics Hub

ComputeMetrics Hub is a static AI model comparison dashboard built around OpenRouter model metadata. It lets you browse the catalog, filter vendors independently for two models, and compare standardized API fields such as context window, pricing, and the date a model was added to OpenRouter.

## What It Does

- Loads live model data from `https://openrouter.ai/api/v1/models`
- Normalizes the OpenRouter payload into a UI-friendly shape
- Lets you compare two models side by side
- Shows input and output pricing, context window, architecture, and model creation date
- Keeps the interface browser-friendly with no build step required

## Pages

- `index.html` - landing page and glossary
- `benchmarks.html` - benchmark browser and comparison entry point
- `configurator.html` - comparison workflow with the wizard
- `tests/metrics.html` - browser-based test harness

## How To Run

1. Open `index.html` in a browser, or serve the folder with any static file server.
2. Use `benchmarks.html` to browse the catalog.
3. Use `configurator.html` to pick vendors and compare two models.

## Data Source

The app reads standardized OpenRouter model metadata and normalizes:

- `pricing.prompt`
- `pricing.completion`
- `created`

The comparison UI is intentionally limited to fields that are consistently available from the API.

## Testing

Open `tests/metrics.html` in a browser to run the lightweight test harness against mocked API payloads and shared helpers.

## Project Structure

- `assets/js/main.js` - app bootstrap and comparison rendering
- `assets/css/styles.css` - shared styling
- `src/components/APIClient.js` - OpenRouter fetch and normalization logic
- `src/components/FormWizard.js` - step flow and dropdown population
- `src/components/SelectionManager.js` - legacy selection/comparison helper

## My own curated content 
This project includes an "AI Evaluation metrics" section located on the main page (index.html). This section acts as my curated content, containing 15 researched definitions of AI benchmarking metrics (like MMLU, HumanEval, TTFT, and MoE architectures) to provide educational context for the user.

## My individual requirement
Include a multi-step form with animated transitions.

**Implementation Explanation:**
I implemented this using a custom ES6 class (`FormWizard.js`) that manages the state of the form steps. The JavaScript logic tracks the current index and applies specific classes (`visible`, `hidden`, and `active`) to the DOM elements. The actual animations are handled entirely by CSS using `transform` and `opacity` transitions, alongside a custom `@keyframes stepPop` animation that creates a smooth scaling effect when a new step becomes active. 

## AI-Use Appendix

**Tools Used:**
*   Gemini (for logic troubleshooting)
*   Codex/Cursor agents for layout and syntax precision

**Prompts Used:**
1.  "In main.js, the calculations for the visual comparison bars are scaling against the absolute maximum values found in the entire globalModelsData array. Because the API has extremes, the bars render gives percentages (like 3% vs 3% or 100% vs 100%). Make it so that maxSpeed and maxContext are calculated only using the maximum values of the two models currently being compared (left and right). If something is missing, 'Data Unavailable' rather than defaulting random stuff"
2.  "Remind me the commit syntax for github"
3.  "Why is my API key failing and why are we pulling missing data?? My previous versions contained the latest models (like fable 5 and GPT 5.5) I can only see old models now, revert changes and highlight what went wrong."

**What the AI got wrong and how I fixed it:**
1. Messed up data: The AI completely ruined the comparison rendering logic at first. When I selected two entirely different models, it generated garbage output where Model B just duplicated all the stats from Model A. It was reusing the same object reference for both sides of the result card. I had to ask it to rewrite the rendering function to properly separate the `left` and `right` variables so they pulled the correct, independent data from the API payload.

2. Ugly API data formatting: The AI's code just dumped the raw API strings directly into the UI. Because OpenRouter returns some vendor names with symbols like `~anthropic`, the dropdown menus looked terrible. I asked it to fix the labels and sort by the most popular models (instead of the old version which defaulted to alphabetical search). The interface actually looked professional.

## Notes

- The app is static and does not require a build step.
- Internet access is required for live OpenRouter data.
- If you use a local API key, avoid committing it to source control.
