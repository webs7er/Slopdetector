// StopTheSlop - Background Service Worker
// Handles LM Studio API communication and message routing

// Load shared configuration
importScripts('../shared/config.js');
importScripts('../shared/stats.js');

class BackgroundService {
  constructor() {
    this.defaultSystemPrompt = StopTheSlopConfig.DEFAULT_SYSTEM_PROMPT;
    this.settings = { ...StopTheSlopConfig.DEFAULT_SETTINGS };
    this.requestQueue = [];
    this.isProcessing = false;
    this.init();
  }

  getSystemPrompt() {
    const core = this.settings.customCorePrompt || StopTheSlopConfig.DEFAULT_CORE_PROMPT;
    const format = this.settings.customOutputFormat || StopTheSlopConfig.DEFAULT_OUTPUT_FORMAT_JSON;

    // Inject max bullet points constraint to save tokens
    const maxPoints = this.settings.maxBulletPoints || StopTheSlopConfig.DEFAULT_SETTINGS.maxBulletPoints;
    const constraint = `\nIMPORTANT CONSTRAINT: You must limit 'human_signals' and 'ai_signals' lists to a MAXIMUM of ${maxPoints} items each.`;

    // Construct Anchor Text
    const anchors = this.settings.anchors || StopTheSlopConfig.DEFAULT_SETTINGS.anchors;
    const anchorText = `- 0.0-${anchors.likelyHuman} → Likely human
- ${(anchors.likelyHuman + 0.01).toFixed(2)}-${anchors.ambiguous} → Probably human
- ${(anchors.ambiguous + 0.01).toFixed(2)}-${anchors.likelyAi} → Ambiguous / AI-assisted human writing
- ${(anchors.likelyAi + 0.01).toFixed(2)}-${anchors.highAi} → Likely AI-generated
- ${(anchors.highAi + 0.01).toFixed(2)}-1.0 → High confidence AI`;

    let fullPrompt = `${core}\n\n${format}\n${constraint}`;
    fullPrompt = fullPrompt.replace('{{ANCHORS}}', anchorText);

    return fullPrompt;
  }

  async init() {
    // CRITICAL: Listeners must be registered synchronously to catch events on wakeup
    this.setupMessageListener();
    this.setupStorageListener();

    await this.loadSettings();
    this.setupKeepAlive();
  }

  setupKeepAlive() {
    // Keep service worker alive with periodic ping
    setInterval(() => {
      // Simple operation to keep worker alive
      console.log('StopTheSlop: Service worker keepalive');
    }, 20000); // Every 20 seconds
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get('settings');
      if (result.settings) {
        this.settings = { ...this.settings, ...result.settings };
      }
    } catch (error) {
      console.error('StopTheSlop: Error loading settings:', error);
    }
  }

  setupStorageListener() {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.settings) {
        this.settings = { ...this.settings, ...changes.settings.newValue };
      }
    });
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Handle async message processing properly
      (async () => {
        try {
          switch (message.action) {
            case 'analyzeText':
              const result = await this.analyzeText(message.text, message.platform);
              sendResponse(result);
              break;

            case 'checkConnection':
              const connectionResult = await this.checkLMStudioConnection();
              sendResponse(connectionResult);
              break;

            case 'getModels':
              const provider = message.provider || 'lmstudio';
              const cacheKey = `cachedModels_${provider}`;

              // Check session cache first
              const cached = await chrome.storage.session.get(cacheKey);
              if (cached[cacheKey]) {
                console.log(`StopTheSlop: Returning session cached models for ${provider}`);
                sendResponse({ models: cached[cacheKey] });
                break;
              }

              let models = [];

              if (provider === 'openai') {
                models = await this.getOpenAIModels();
              } else if (provider === 'claude') {
                models = await this.getClaudeModels();
              } else if (provider === 'openrouter') {
                models = await this.getOpenRouterModels();
              } else if (provider === 'gemini') {
                models = await this.getGeminiModels();
              } else {
                models = await this.getLMStudioModels();
              }

              // If fetch successful, update both caches
              if (models && models.length > 0) {
                await chrome.storage.session.set({ [cacheKey]: models });
                // Only persist remote API models, not local ones (which change with LM Studio state)
                if (provider !== 'lmstudio') {
                  await chrome.storage.local.set({ [cacheKey]: models });
                }
              } else {
                // If fetch failed/empty, try to recover from local storage (persistent cache)
                if (provider !== 'lmstudio') {
                  console.log(`StopTheSlop: Fetch failed for ${provider}, checking persistent cache`);
                  const localCache = await chrome.storage.local.get(cacheKey);
                  if (localCache[cacheKey] && localCache[cacheKey].length > 0) {
                    models = localCache[cacheKey];
                    // Reinstate to session cache too
                    await chrome.storage.session.set({ [cacheKey]: models });
                  }
                }
              }

              sendResponse({ models });
              break;

            case 'recordScan':
              await ScanStatsManager.recordScan({
                score: message.score,
                platform: message.platform
              });
              sendResponse({ success: true });
              break;

            case 'getHistoricalStats':
              const allStats = await ScanStatsManager.getAllRangeStats(this.settings.anchors?.ambiguous || 0.5);
              sendResponse(allStats);
              break;

            case 'clearScanHistory':
              await ScanStatsManager.clearHistory();
              sendResponse({ success: true });
              break;

            default:
              sendResponse({ error: 'Unknown action' });
          }
        } catch (error) {
          console.error('StopTheSlop: Message handler error:', error);
          sendResponse({ error: error.message });
        }
      })();
      return true; // Required for async response
    });
  }

  async checkLMStudioConnection() {
    // Only check connection for LM Studio
    if (this.settings.modelProvider !== 'lmstudio') {
      return { connected: true, provider: this.settings.modelProvider };
    }

    try {
      const response = await fetch(`${this.settings.lmStudioUrl}/v1/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          connected: true,
          models: data.data || []
        };
      } else {
        return { connected: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }

  async getLMStudioModels() {
    try {
      const response = await fetch(`${this.settings.lmStudioUrl}/v1/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.data || [];
      }
      return [];
    } catch (error) {
      console.error('StopTheSlop: Error fetching models:', error);
      return [];
    }
  }

  async getOpenAIModels() {
    await this.loadSettings();
    if (!this.settings.openaiApiKey) return [];

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.settings.openaiApiKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Filter for chat models (gpt-*) to be helpful, as we only do text analysis
        // and sort by created date descending
        const models = (data.data || [])
          .filter(model => model.id.includes('gpt'))
          .sort((a, b) => (b.created || 0) - (a.created || 0));

        return models;
      }
      console.error('StopTheSlop: Failed to fetch OpenAI models:', response.status);
      return [];
    } catch (error) {
      console.error('StopTheSlop: Error fetching OpenAI models:', error);
      return [];
    }
  }

  async getClaudeModels() {
    await this.loadSettings();
    if (!this.settings.claudeApiKey) return [];

    try {
      const response = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': this.settings.claudeApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Anthropic returns a list, sort by created_at descending (newest first)
        const models = (data.data || []).sort((a, b) => {
          const dateA = new Date(a.created_at || 0);
          const dateB = new Date(b.created_at || 0);
          return dateB - dateA;
        });

        return models;
      }
      console.error('StopTheSlop: Failed to fetch Claude models:', response.status);
      return [];
    } catch (error) {
      console.error('StopTheSlop: Error fetching Claude models:', error);
      return [];
    }
  }

  async getOpenRouterModels() {
    await this.loadSettings();
    if (!this.settings.openrouterApiKey) return [];

    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.settings.openrouterApiKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // OpenRouter returns models in a 'data' array
        return data.data || [];
      }
      console.error('StopTheSlop: Failed to fetch OpenRouter models:', response.status);
      return [];
    } catch (error) {
      console.error('StopTheSlop: Error fetching OpenRouter models:', error);
      return [];
    }
  }

  async getGeminiModels() {
    await this.loadSettings();
    if (!this.settings.geminiApiKey) return [];

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.settings.geminiApiKey}`);

      if (response.ok) {
        const data = await response.json();
        // Filter models that support generateContent and contain "gemini"
        const models = (data.models || [])
          .filter(model => model.name.includes('gemini') && (model.supportedGenerationMethods || []).includes('generateContent'))
          .map(model => ({
            id: model.name.replace('models/', ''),
            display_name: model.displayName || model.name.replace('models/', '')
          }));
        
        return models;
      }
      console.error('StopTheSlop: Failed to fetch Gemini models:', response.status);
      return [];
    } catch (error) {
      console.error('StopTheSlop: Error fetching Gemini models:', error);
      return [];
    }
  }

  async analyzeText(text, platform = 'Social Media') {
    // Reload settings to ensure we have the latest provider selection
    await this.loadSettings();

    console.log(`StopTheSlop: Analyzing with provider: ${this.settings.modelProvider} for platform: ${platform}`);

    let result;
    let modelName = 'Unknown Model';

    // Route to appropriate provider
    if (this.settings.modelProvider === 'openai') {
      result = await this.analyzeWithOpenAI(text, platform);
      modelName = this.settings.openaiModel || 'GPT-3.5 Turbo';
    } else if (this.settings.modelProvider === 'gemini') {
      result = await this.analyzeWithGemini(text, platform);
      modelName = this.settings.geminiModel || 'Gemini Model';
      modelName = modelName
        .replace(/-/g, ' ')
        .replace(/\bgemini\b/i, 'Gemini')
        .replace(/\bflash\b/i, 'Flash')
        .replace(/\bpro\b/i, 'Pro');
      modelName = modelName.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase());
    } else if (this.settings.modelProvider === 'claude') {
      result = await this.analyzeWithClaude(text, platform);
      // Format Claude model name nicely
      // e.g. claude-3-5-sonnet-xxxx -> Claude 3.5 Sonnet
      const rawModel = this.settings.claudeModel || 'claude-3-5-sonnet';

      modelName = rawModel
        .replace(/-/g, ' ')
        .replace(/\bclaude\b/i, 'Claude')
        .replace(/\b(\d)\s+(\d)\b/g, '$1.$2') // e.g. 3 5 -> 3.5
        .replace(/\bsonnet\b/i, 'Sonnet')
        .replace(/\bhaiku\b/i, 'Haiku')
        .replace(/\bopus\b/i, 'Opus')
        .replace(/\s\d{8}$/, ''); // Remove date suffix if present

      // Capitalize first letter of each word if not already done
      modelName = modelName.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase());
      // Fix "Claude" capitalization explicitly just in case
      modelName = modelName.replace(/claude/i, 'Claude').replace(/gpt/i, 'GPT');

    } else if (this.settings.modelProvider === 'openrouter') {
      result = await this.analyzeWithOpenRouter(text, platform);
      modelName = this.settings.openrouterModel || 'OpenRouter Model';
    } else {
      result = await this.analyzeWithLMStudio(text, platform);
      // For local models, try to make it readable too
      let rawLocal = this.settings.lmStudioModel || 'Local Model';
      // Remove file extension if present (common in LM Studio)
      rawLocal = rawLocal.replace(/\.gguf$|\.bin$/i, '');
      modelName = rawLocal;
    }

    return { ...result, model: modelName };
  }

  async analyzeWithOpenAI(text, platform) {
    await this.loadSettings();

    if (!this.settings.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.openaiApiKey}`
        },
        body: JSON.stringify({
          model: this.settings.openaiModel || 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt()
            },
            {
              role: 'user',
              content: `Analyze this ${platform} content for authenticity:\n\n${text}`
            }
          ],
          temperature: this.settings.temperature !== undefined ? this.settings.temperature : 0.3,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('Invalid OpenAI API key. Please check your API key.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (response.status === 400) {
          throw new Error(`Bad request: ${errorData.error?.message || 'Unknown error'}`);
        }
        throw new Error(`OpenAI API error (${response.status}): ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message;
      const content = message?.content || '';

      console.log('StopTheSlop: OpenAI response:', content.substring(0, 200));

      return this.parseAnalysisResponse(content);
    } catch (error) {
      console.error('StopTheSlop: OpenAI analysis error:', error);
      throw error;
    }
  }

  async analyzeWithClaude(text, platform) {
    // Reload settings to ensure we have the latest API key
    await this.loadSettings();

    if (!this.settings.claudeApiKey) {
      throw new Error('Claude API key not configured');
    }

    console.log('StopTheSlop: Claude API key length:', this.settings.claudeApiKey.length);
    console.log('StopTheSlop: Claude API key prefix:', this.settings.claudeApiKey.substring(0, 15) + '...');

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.settings.claudeApiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: this.settings.claudeModel || 'claude-sonnet-4-5',
          max_tokens: 1024,
          temperature: this.settings.temperature !== undefined ? this.settings.temperature : 0.3,
          temperature: this.settings.temperature !== undefined ? this.settings.temperature : 0.3,
          system: this.getSystemPrompt(),
          messages: [
            {
              role: 'user',
              content: `Analyze this ${platform} content for authenticity:\n\n${text}`
            }
          ]
        })
      });

      console.log('StopTheSlop: Claude response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('StopTheSlop: Claude error response:', errorText);

        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: { message: errorText } };
        }

        if (response.status === 401) {
          throw new Error('Invalid Claude API key. Please verify your API key at console.anthropic.com');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (response.status === 400) {
          throw new Error(`Bad request: ${errorData.error?.message || errorText}`);
        }
        throw new Error(`Claude API error (${response.status}): ${errorData.error?.message || errorText}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || '';

      console.log('StopTheSlop: Claude response:', content.substring(0, 200));

      return this.parseAnalysisResponse(content);
    } catch (error) {
      console.error('StopTheSlop: Claude analysis error:', error);
      throw error;
    }
  }

  async analyzeWithOpenRouter(text, platform) {
    await this.loadSettings();

    if (!this.settings.openrouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.openrouterApiKey}`,
          'HTTP-Referer': chrome.runtime.getURL(''),
          'X-Title': 'StopTheSlop'
        },
        body: JSON.stringify({
          model: this.settings.openrouterModel || 'openai/gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt()
            },
            {
              role: 'user',
              content: `Analyze this ${platform} content for authenticity:\n\n${text}`
            }
          ],
          temperature: this.settings.temperature !== undefined ? this.settings.temperature : 0.3
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('Invalid OpenRouter API key. Please check your API key.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (response.status === 400) {
          throw new Error(`Bad request: ${errorData.error?.message || 'Unknown error'}`);
        }
        throw new Error(`OpenRouter API error (${response.status}): ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message;
      const content = message?.content || '';

      console.log('StopTheSlop: OpenRouter response:', content.substring(0, 200));

      return this.parseAnalysisResponse(content);
    } catch (error) {
      console.error('StopTheSlop: OpenRouter analysis error:', error);
      throw error;
    }
  }

  async analyzeWithGemini(text, platform) {
    await this.loadSettings();

    if (!this.settings.geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const model = this.settings.geminiModel || 'gemini-2.5-flash';
      // Add 'models/' prefix if not present
      const modelId = model.startsWith('models/') ? model : `models/${model}`;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelId}:generateContent?key=${this.settings.geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: this.getSystemPrompt() }]
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: `Analyze this ${platform} content for authenticity:\n\n${text}` }]
            }
          ],
          generationConfig: {
            temperature: this.settings.temperature !== undefined ? this.settings.temperature : 0.3
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 400 && errorData.error?.message?.includes('API key not valid')) {
          throw new Error('Invalid Gemini API key. Please check your API key.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (response.status === 400) {
          throw new Error(`Bad request: ${errorData.error?.message || 'Unknown error'}`);
        }
        throw new Error(`Gemini API error (${response.status}): ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      console.log('StopTheSlop: Gemini response:', content.substring(0, 200));

      return this.parseAnalysisResponse(content);
    } catch (error) {
      console.error('StopTheSlop: Gemini analysis error:', error);
      throw error;
    }
  }

  async analyzeWithLMStudio(text, platform) {
    const prompt = this.buildAnalysisPrompt(text);

    try {
      const response = await fetch(`${this.settings.lmStudioUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.settings.lmStudioModel || undefined,
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt()
            },
            {
              role: 'user',
              content: `Analyze this ${platform} content for authenticity:\n\n${text}`
            }
          ],
          temperature: this.settings.temperature !== undefined ? this.settings.temperature : 0.3,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        if (response.status === 400) {
          throw new Error('No model loaded in LM Studio. Please load a model first.');
        } else if (response.status === 404) {
          throw new Error('LM Studio API not found. Check if LM Studio is running.');
        } else if (response.status === 503) {
          throw new Error('LM Studio is busy. Please wait and try again.');
        }
        throw new Error(`LM Studio error (${response.status}): ${errorBody || 'Unknown error'}`);
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message;
      const content = message?.content || '';
      const finishReason = data.choices?.[0]?.finish_reason;

      console.log('StopTheSlop: Raw LLM response - content:', content.substring(0, 200), 'finish_reason:', finishReason);

      if (!content.trim() && finishReason === 'length') {
        // Model ran out of tokens before producing output
        console.warn('StopTheSlop: Model hit token limit, response truncated');
        return {
          score: 0.5,
          conclusion: 'Analysis incomplete - model ran out of tokens',
          humanSignals: [],
          aiSignals: [],
          legacySignals: []
        };
      }

      return this.parseAnalysisResponse(content);
    } catch (error) {
      console.error('StopTheSlop: LM Studio analysis error:', error);

      // Provide clearer error messages for common issues
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        throw new Error(`Cannot connect to LM Studio at ${this.settings.lmStudioUrl}. Make sure LM Studio is running and the local server is started.`);
      }

      throw error;
    }
  }

  parseAnalysisResponse(content) {
    console.log('StopTheSlop: Parsing response, length:', content.length, 'content:', content.substring(0, 200));

    try {
      let score = 0.5;
      let reasoning = '';
      let confidence = '';

      // Clean up markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();

      // --- Method 1: Parse parsed/extracted JSON ---
      let parsed = null;
      try {
        // Try strict parse first
        parsed = JSON.parse(cleanContent);
      } catch (e1) {
        // Try extracting JSON object from text (regex)
        const jsonMatch = content.match(/\{[\s\S]*?"score"[\s\S]*?\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch (e2) {
            console.log('StopTheSlop: Failed to parse extracted JSON');
          }
        }
      }

      if (parsed && parsed.score !== undefined) {
        score = parseFloat(parsed.score);
        const conclusion = parsed.conclusion || '';
        const humanSignals = Array.isArray(parsed.human_signals) ? parsed.human_signals : [];
        const aiSignals = Array.isArray(parsed.ai_signals) ? parsed.ai_signals : [];

        // Legacy/Fallback: If explicit categories missing, check for generic 'signals'
        let legacySignals = [];
        if (humanSignals.length === 0 && aiSignals.length === 0 && Array.isArray(parsed.signals)) {
          legacySignals = parsed.signals;
        }

        // Final sanity check on score
        if (!isNaN(score) && score >= 0 && score <= 1) {
          console.log('StopTheSlop: Successfully parsed JSON, score:', score);
          return { score, conclusion, humanSignals, aiSignals, legacySignals };
        }
      }

      // --- Method 2: Loose Extraction (Fallback) ---
      // If we are here, we didn't get a valid JSON object with a score.
      // Use the entire text as reasoning.
      reasoning = cleanContent;

      console.warn('StopTheSlop: JSON parsing failed, attempting loose score extraction.');

      // Look for explicit "Score: 0.8" or "Score: 8/10" patterns
      // 1. Decimal score (e.g. "Score: 0.85" or "score": 0.85)
      const explicitDecimal = content.match(/\b(?:score|rating|probability|likelihood)"?[:\s]+(0\.[0-9]+|1\.0|0|1)\b/i);
      if (explicitDecimal) {
        score = parseFloat(explicitDecimal[1]);
      } else {
        // 2. Percentage (e.g. "95% AI")
        const percentMatch = content.match(/(\d{1,3})%/);
        if (percentMatch) {
          const val = parseInt(percentMatch[1], 10);
          if (val >= 0 && val <= 100) score = val / 100;
        } else {
          // 3. Fraction (e.g. "8/10")
          const fractionMatch = content.match(/(\d+(?:\.\d+)?)\s*\/\s*10\b/);
          if (fractionMatch) {
            const val = parseFloat(fractionMatch[1]);
            if (val >= 0 && val <= 10) score = val / 10;
          }
        }
      }

      // Clamp score
      if (isNaN(score) || score < 0) score = 0;
      if (score > 1) score = 1;

      console.log(`StopTheSlop: Fallback extraction used. Score: ${score}`);

      // If reasoning is empty (e.g. empty response), provide a default
      if (!reasoning) {
        reasoning = 'No explanation provided by the model.';
      }

      // In fallback mode, "reasoning" is the whole text. We treat it as the "conclusion".
      return {
        score,
        conclusion: reasoning,
        humanSignals: [],
        aiSignals: [],
        legacySignals: []
      };

    } catch (error) {
      console.error('StopTheSlop: Parse error:', error);
      return {
        score: 0.5,
        conclusion: `Error parsing analysis: ${error.message}\n\nRaw Output:\n${content.substring(0, 200)}...`,
        humanSignals: [],
        aiSignals: [],
        legacySignals: []
      };
    }
  }

  buildAnalysisPrompt(text) {
    // Truncate very long texts
    const maxLength = 2000;
    const truncatedText = text.length > maxLength
      ? text.substring(0, maxLength) + '...[truncated]'
      : text;

    return truncatedText;
  }
}

// Initialize background service
const backgroundService = new BackgroundService();
