// src/data/data.js
// AI_BENCHMARK_DATABASE - expanded dataset with vendors, submodels, and basic metrics.
// Fields used by the UI: id, model_name, vendor, submodel, context_window, architecture, params_billion, inference_speed_tps, quantization, notes

export const AI_BENCHMARK_DATABASE = [
  // OpenAI family
  { id: 1, model_name: "gpt-4o", vendor: "OpenAI", submodel: "gpt-4o-mini", context_window: 32768, architecture: "transformer", params_billion: 175, inference_speed_tps: 1200, quantization: "fp16", notes: "OpenAI high-capacity family" },
  { id: 2, model_name: "gpt-4o", vendor: "OpenAI", submodel: "gpt-4o-large", context_window: 32768, architecture: "transformer", params_billion: 280, inference_speed_tps: 900, quantization: "fp16", notes: "Large variant" },
  { id: 3, model_name: "gpt-4o-mini", vendor: "OpenAI", submodel: "gpt-4o-mini", context_window: 8192, architecture: "transformer", params_billion: 20, inference_speed_tps: 4000, quantization: "int8", notes: "Efficient mini variant" },

  // OpenAI ChatGPT family (legacy names for familiarity)
  { id: 4, model_name: "gpt-4", vendor: "OpenAI", submodel: "gpt-4-32k", context_window: 32768, architecture: "transformer", params_billion: 175, inference_speed_tps: 800, quantization: "fp16", notes: "High context window" },
  { id: 5, model_name: "gpt-4", vendor: "OpenAI", submodel: "gpt-4-8k", context_window: 8192, architecture: "transformer", params_billion: 175, inference_speed_tps: 1200, quantization: "fp16", notes: "" },

  // Google Gemini family
  { id: 6, model_name: "gemini-pro", vendor: "Google", submodel: "gemini-pro-1.0", context_window: 65536, architecture: "transformer", params_billion: 300, inference_speed_tps: 700, quantization: "fp16", notes: "High-capacity Gemini Pro" },
  { id: 7, model_name: "gemini-ultra", vendor: "Google", submodel: "gemini-ultra-1.0", context_window: 131072, architecture: "transformer", params_billion: 600, inference_speed_tps: 450, quantization: "fp16", notes: "Ultra large context" },
  { id: 8, model_name: "gemini-mini", vendor: "Google", submodel: "gemini-mini", context_window: 8192, architecture: "transformer", params_billion: 18, inference_speed_tps: 4200, quantization: "int8", notes: "Edge/efficient variant" },

  // Anthropic family
  { id: 9, model_name: "claude-3", vendor: "Anthropic", submodel: "claude-3-opus", context_window: 131072, architecture: "transformer", params_billion: 280, inference_speed_tps: 650, quantization: "fp16", notes: "High-context Claude 3" },
  { id: 10, model_name: "claude-3", vendor: "Anthropic", submodel: "claude-3-mini", context_window: 32768, architecture: "transformer", params_billion: 40, inference_speed_tps: 2200, quantization: "int8", notes: "Efficient Claude variant" },

  // Meta / Llama family
  { id: 11, model_name: "llama-3", vendor: "Meta", submodel: "llama-3-70b", context_window: 32768, architecture: "transformer", params_billion: 70, inference_speed_tps: 1100, quantization: "int8", notes: "" },
  { id: 12, model_name: "llama-3", vendor: "Meta", submodel: "llama-3-13b", context_window: 32768, architecture: "transformer", params_billion: 13, inference_speed_tps: 3000, quantization: "int8", notes: "" },

  // Mistral / Mosaic
  { id: 13, model_name: "mistral-large", vendor: "Mistral", submodel: "mistral-7b", context_window: 8192, architecture: "transformer", params_billion: 7, inference_speed_tps: 3800, quantization: "int8", notes: "" },

  // Cohere
  { id: 14, model_name: "command-xlarge", vendor: "Cohere", submodel: "command-xlarge", context_window: 8192, architecture: "transformer", params_billion: 52, inference_speed_tps: 1500, quantization: "fp16", notes: "" },

  // GitHub Copilot family (Microsoft / GitHub)
  { id: 15, model_name: "github-copilot", vendor: "GitHub", submodel: "copilot-codegen-v1", context_window: 16384, architecture: "transformer", params_billion: 60, inference_speed_tps: 1400, quantization: "fp16", notes: "Code-specialized model" },
  { id: 16, model_name: "github-copilot", vendor: "GitHub", submodel: "copilot-codegen-small", context_window: 8192, architecture: "transformer", params_billion: 12, inference_speed_tps: 3600, quantization: "int8", notes: "Lightweight code model" },

  // Open-source smaller models
  { id: 17, model_name: "falcon", vendor: "TII", submodel: "falcon-40b", context_window: 8192, architecture: "transformer", params_billion: 40, inference_speed_tps: 900, quantization: "int8", notes: "" },
  { id: 18, model_name: "starcoder", vendor: "BigCode", submodel: "starcoder-15b", context_window: 16384, architecture: "transformer", params_billion: 15, inference_speed_tps: 1600, quantization: "int8", notes: "Code-focused" },

  // Smaller / edge models
  { id: 19, model_name: "tiny-llm", vendor: "Community", submodel: "tiny-1", context_window: 2048, architecture: "transformer", params_billion: 1.2, inference_speed_tps: 12000, quantization: "int8", notes: "Edge/embedded" },

  // Add more submodels and variants for coverage
  { id: 20, model_name: "gpt-4o", vendor: "OpenAI", submodel: "gpt-4o-vision", context_window: 65536, architecture: "multimodal-transformer", params_billion: 220, inference_speed_tps: 600, quantization: "fp16", notes: "Vision-capable variant" },
  { id: 21, model_name: "claude-3", vendor: "Anthropic", submodel: "claude-3-vision", context_window: 65536, architecture: "multimodal-transformer", params_billion: 300, inference_speed_tps: 520, quantization: "fp16", notes: "Vision-enabled" },

  // Placeholder entries to expand dataset
  { id: 22, model_name: "gemini-pro", vendor: "Google", submodel: "gemini-pro-code", context_window: 65536, architecture: "transformer", params_billion: 320, inference_speed_tps: 680, quantization: "fp16", notes: "Code-optimized" },
  { id: 23, model_name: "anthropic-claude", vendor: "Anthropic", submodel: "claude-2-1.3", context_window: 9000, architecture: "transformer", params_billion: 1.3, inference_speed_tps: 4200, quantization: "int8", notes: "Older small variant" }
];
