// StopTheSlop - Shared Configuration
// Single source of truth for default settings and prompts

const DEFAULT_CORE_PROMPT = `Analyse the following text and give me a probability score in percentage signifying if the text is AI-generated:

AI-content score sensitivity thresholds:
{{ANCHORS}}

Output format (respond with valid JSON ONLY):`;

const DEFAULT_OUTPUT_FORMAT_JSON = `{
  "score": <number>",
  "conclusion": "<2-3 sentence conversational summary explaining your final verdict>",
  "human_signals": [
    "<specific evidence favoring human origin, if applicable>"
  ],
  "ai_signals": [
    "<specific evidence favoring AI origin, if applicable>"
  ]
}`;

const DEFAULT_SYSTEM_PROMPT = `${DEFAULT_CORE_PROMPT}\n\n${DEFAULT_OUTPUT_FORMAT_JSON}`;

const DEFAULT_SETTINGS = {
  enabled: true,
  modelProvider: 'lmstudio',
  lmStudioUrl: 'http://localhost:1234',
  openaiApiKey: '',
  claudeApiKey: '',
  openrouterApiKey: '',
  openaiModel: '',
  claudeModel: '',
  openrouterModel: '',
  lmStudioModel: '',
  geminiApiKey: '',
  geminiModel: '',

  // Custom Prompt Settings (empty string = use default)
  customCorePrompt: '',
  customOutputFormat: '',

  temperature: 0.2,
  enableMinLength: true,
  minTextLength: 75, // In words
  maxConcurrent: 3,
  showReasoning: true,
  showCertainty: false,
  maxBulletPoints: 2,
  anchors: {
    highAi: 0.85,
    likelyAi: 0.7,
    ambiguous: 0.5,
    likelyHuman: 0.2
  }
};

// Expose as global for all contexts
const globalScope = typeof globalThis !== 'undefined' ? globalThis :
  typeof window !== 'undefined' ? window :
    typeof self !== 'undefined' ? self : {};

globalScope.StopTheSlopConfig = {
  DEFAULT_CORE_PROMPT,
  DEFAULT_OUTPUT_FORMAT_JSON,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_SETTINGS
};

// Also export for ES6 modules (background Service Worker)
if (typeof exports !== 'undefined') {
  exports.DEFAULT_CORE_PROMPT = DEFAULT_CORE_PROMPT;
  exports.DEFAULT_OUTPUT_FORMAT_JSON = DEFAULT_OUTPUT_FORMAT_JSON;
  exports.DEFAULT_SYSTEM_PROMPT = DEFAULT_SYSTEM_PROMPT;
  exports.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
}
