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

## Notes

- The app is static and does not require a build step.
- Internet access is required for live OpenRouter data.
- If you use a local API key, avoid committing it to source control.
