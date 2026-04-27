// StopTheSlop - Popup Script

class PopupManager {
  constructor() {
    this.elements = {};
    this.defaultCorePrompt = StopTheSlopConfig.DEFAULT_CORE_PROMPT;
    this.defaultOutputFormat = StopTheSlopConfig.DEFAULT_OUTPUT_FORMAT_JSON;
    this.settings = { ...StopTheSlopConfig.DEFAULT_SETTINGS };
    this.currentStatsRange = 'day';
    this.cachedAllStats = null;
    this.init();
  }

  async init() {
    this.cacheElements();
    await this.loadSettings();
    this.bindEvents();
    this.bindStatsTabs();
    this.initExperimentalToggle();
    this.checkConnection();
    this.updateStats();
    // Fetch models for current provider
    this.updateModelList(this.settings.modelProvider);
  }

  cacheElements() {
    this.elements = {
      connectionStatus: document.getElementById('connectionStatus'),
      postsScanned: document.getElementById('postsScanned'),
      postsScannedNum: document.getElementById('postsScannedNum'),
      aiDetected: document.getElementById('aiDetected'),
      aiDetectedNum: document.getElementById('aiDetectedNum'),
      platformPie: document.getElementById('platformPie'),
      platformLegend: document.getElementById('platformLegend'),
      statsTabs: document.getElementById('statsTabs'),
      statsTabIndicator: document.getElementById('statsTabIndicator'),
      enableDetection: document.getElementById('enableDetection'),
      showReasoning: document.getElementById('showReasoning'),
      showCertainty: document.getElementById('showCertainty'),
      modelProvider: document.getElementById('modelProvider'),
      lmStudioUrl: document.getElementById('lmStudioUrl'),
      lmStudioSettings: document.getElementById('lmStudioSettings'),
      openaiApiKey: document.getElementById('openaiApiKey'),
      openaiKeyDisplay: document.getElementById('openaiKeyDisplay'),
      openaiSettings: document.getElementById('openaiSettings'),
      claudeApiKey: document.getElementById('claudeApiKey'),
      claudeKeyDisplay: document.getElementById('claudeKeyDisplay'),
      claudeSettings: document.getElementById('claudeSettings'),
      openrouterApiKey: document.getElementById('openrouterApiKey'),
      openrouterKeyDisplay: document.getElementById('openrouterKeyDisplay'),
      openrouterSettings: document.getElementById('openrouterSettings'),
      geminiApiKey: document.getElementById('geminiApiKey'),
      geminiKeyDisplay: document.getElementById('geminiKeyDisplay'),
      geminiSettings: document.getElementById('geminiSettings'),
      openaiModel: document.getElementById('openaiModel'),
      claudeModel: document.getElementById('claudeModel'),
      openrouterModel: document.getElementById('openrouterModel'),
      geminiModel: document.getElementById('geminiModel'),
      lmStudioModel: document.getElementById('lmStudioModel'),
      lmStudioModel: document.getElementById('lmStudioModel'),
      customCorePrompt: document.getElementById('customCorePrompt'),
      customOutputFormat: document.getElementById('customOutputFormat'),
      resetCorePrompt: document.getElementById('resetCorePrompt'),
      resetOutputFormat: document.getElementById('resetOutputFormat'),
      temperature: document.getElementById('temperature'),
      temperatureValue: document.getElementById('temperatureValue'),
      maxTokens: document.getElementById('maxTokens'),

      minTextLength: document.getElementById('minTextLength'),
      enableMinLength: document.getElementById('enableMinLength'),
      minLengthSettings: document.getElementById('minLengthSettings'),
      maxBulletPoints: document.getElementById('maxBulletPoints'),
      maxSignalsSettings: document.getElementById('maxSignalsSettings'),
      toggleLabel: document.getElementById('toggleLabel'),
      // resetSettings: document.getElementById('resetSettings'), // duplicate removed
      resetSettings: document.getElementById('resetSettings'),
      resetApiKeys: document.getElementById('resetApiKeys'),
      clearStats: document.getElementById('clearStats'),

      // Custom Select Elements
      providerSelect: document.getElementById('providerSelect'),
      providerTrigger: document.querySelector('.custom-select-trigger'),
      providerOptions: document.querySelectorAll('.custom-option'),

      // Zone Bar
      zoneBar: document.getElementById('zoneBar'),
      zoneBarContainer: document.getElementById('zoneBarContainer'),
      zoneValues: document.getElementById('zoneValues'),
      resetAnchors: document.getElementById('resetAnchors'),

      // Experimental section toggle
      experimentalToggle: document.getElementById('experimentalToggle'),
      experimentalBody: document.getElementById('experimentalBody'),
      experimentalSection: document.querySelector('.experimental-section')
    };
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get('settings');
      if (result.settings) {
        this.settings = { ...this.settings, ...result.settings };
      } else {
        // No saved settings - save defaults
        await this.saveSettings();
      }
      this.applySettingsToUI();
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  applySettingsToUI() {
    this.elements.enableDetection.checked = this.settings.enabled;
    this.updateToggleLabel();
    this.elements.showReasoning.checked = this.settings.showReasoning;
    this.elements.showCertainty.checked = this.settings.showCertainty;
    this.elements.showCertainty.checked = this.settings.showCertainty;

    // Set provider in both native select (hidden) and custom select
    const currentProvider = this.settings.modelProvider || 'lmstudio';
    this.elements.modelProvider.value = currentProvider;
    this.updateCustomSelectUI(currentProvider);

    this.elements.lmStudioUrl.value = this.settings.lmStudioUrl;
    this.elements.openaiApiKey.value = this.settings.openaiApiKey || '';
    this.updateApiKeyDisplay('openai', this.settings.openaiApiKey);
    this.elements.claudeApiKey.value = this.settings.claudeApiKey || '';
    this.updateApiKeyDisplay('claude', this.settings.claudeApiKey);
    this.elements.openrouterApiKey.value = this.settings.openrouterApiKey || '';
    this.updateApiKeyDisplay('openrouter', this.settings.openrouterApiKey);
    this.elements.geminiApiKey.value = this.settings.geminiApiKey || '';
    this.updateApiKeyDisplay('gemini', this.settings.geminiApiKey);
    this.elements.openaiModel.value = this.settings.openaiModel || 'gpt-3.5-turbo';
    this.elements.claudeModel.value = this.settings.claudeModel || 'claude-sonnet-4-5';
    this.elements.openrouterModel.value = this.settings.openrouterModel || 'openai/gpt-3.5-turbo';
    this.elements.geminiModel.value = this.settings.geminiModel || 'gemini-2.5-flash';
    this.elements.lmStudioModel.value = this.settings.lmStudioModel || '';

    // Load prompts or defaults
    this.elements.customCorePrompt.value = this.settings.customCorePrompt || StopTheSlopConfig.DEFAULT_CORE_PROMPT;
    this.elements.customOutputFormat.value = this.settings.customOutputFormat || StopTheSlopConfig.DEFAULT_OUTPUT_FORMAT_JSON;

    // Set default temperature if not present (backward compatibility)
    if (this.settings.temperature === undefined) {
      this.settings.temperature = 0.3;
    }
    this.elements.temperature.value = this.settings.temperature * 100;
    this.elements.temperatureValue.textContent = this.settings.temperature.toFixed(1);

    this.elements.maxTokens.value = this.settings.maxTokens || 5000;

    this.elements.enableMinLength.checked = this.settings.enableMinLength;
    this.elements.minTextLength.value = this.settings.minTextLength;
    this.updateMinLengthVisibility();
    this.elements.maxBulletPoints.value = this.settings.maxBulletPoints || 3;
    this.updateMaxSignalsVisibility();
    this.updateProviderVisibility();

    // Zone Bar
    this.updateZoneBar();
  }

  updateToggleLabel() {
    if (this.elements.toggleLabel) {
      this.elements.toggleLabel.textContent = this.settings.enabled ? 'ON' : 'OFF';
      this.elements.toggleLabel.classList.toggle('off', !this.settings.enabled);
      document.body.classList.toggle('disabled', !this.settings.enabled);
    }
  }

  updateProviderVisibility() {
    const provider = this.settings.modelProvider || 'lmstudio';
    this.elements.lmStudioSettings.style.display = provider === 'lmstudio' ? 'block' : 'none';
    this.elements.openaiSettings.style.display = provider === 'openai' ? 'block' : 'none';
    this.elements.claudeSettings.style.display = provider === 'claude' ? 'block' : 'none';
    this.elements.openrouterSettings.style.display = provider === 'openrouter' ? 'block' : 'none';
    this.elements.geminiSettings.style.display = provider === 'gemini' ? 'block' : 'none';
  }

  updateApiKeyDisplay(provider, key) {
    const displayElement = provider === 'openai'
      ? this.elements.openaiKeyDisplay
      : provider === 'claude'
        ? this.elements.claudeKeyDisplay
        : provider === 'gemini'
          ? this.elements.geminiKeyDisplay
          : this.elements.openrouterKeyDisplay;
    const inputElement = provider === 'openai'
      ? this.elements.openaiApiKey
      : provider === 'claude'
        ? this.elements.claudeApiKey
        : provider === 'gemini'
          ? this.elements.geminiApiKey
          : this.elements.openrouterApiKey;

    if (!displayElement) return;

    if (key && key.length > 20) {
      // Show masked key: first 15 chars + ... + last 4 chars
      const masked = `${key.substring(0, 15)}...${key.substring(key.length - 4)}`;
      displayElement.textContent = masked;
      displayElement.style.display = 'block';
      inputElement.style.display = 'none';
    } else {
      displayElement.style.display = 'none';
      inputElement.style.display = 'block';
    }
  }

  updateMinLengthVisibility() {
    if (this.elements.minLengthSettings) {
      this.elements.minLengthSettings.style.display = this.settings.enableMinLength ? 'block' : 'none';
    }
  }

  updateMaxSignalsVisibility() {
    if (this.elements.maxSignalsSettings) {
      this.elements.maxSignalsSettings.style.display = this.settings.showReasoning ? 'block' : 'none';
    }
  }

  bindEvents() {
    // Debounced helpers for real-time updates
    const debouncedSave = this.debounce(() => this.saveSettings(), 500);
    const debouncedCheckConnection = this.debounce(() => this.checkConnection(), 500);

    // Toggle switches
    this.elements.enableDetection.addEventListener('change', (e) => {
      this.settings.enabled = e.target.checked;
      this.updateToggleLabel();
      this.saveSettings();
    });

    this.elements.showReasoning.addEventListener('change', (e) => {
      this.settings.showReasoning = e.target.checked;
      this.updateMaxSignalsVisibility();
      this.saveSettings();
    });

    this.elements.showCertainty.addEventListener('change', (e) => {
      this.settings.showCertainty = e.target.checked;
      this.saveSettings();
    });

    // Custom Provider Select
    this.elements.providerTrigger.addEventListener('click', () => {
      this.elements.providerSelect.classList.toggle('open');
      this.elements.providerTrigger.classList.toggle('open');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.elements.providerSelect.contains(e.target)) {
        this.elements.providerSelect.classList.remove('open');
        this.elements.providerTrigger.classList.remove('open');
      }
    });

    // Handle Option Selection
    this.elements.providerOptions.forEach(option => {
      option.addEventListener('click', () => {
        const value = option.getAttribute('data-value');
        if (!value) return;

        // Update settings
        this.settings.modelProvider = value;
        this.elements.modelProvider.value = value; // Update hidden select

        // Update UI
        this.updateCustomSelectUI(value);
        this.updateProviderVisibility();
        this.elements.providerSelect.classList.remove('open');
        this.elements.providerTrigger.classList.remove('open');

        // Trigger save and logic
        this.saveSettings();
        if (this.settings.modelProvider === 'lmstudio') {
          this.checkConnection();
        } else {
          this.updateModelList(this.settings.modelProvider);
        }
      });
    });

    // Keep native listener just in case (though hidden)
    this.elements.modelProvider.addEventListener('change', (e) => {
      this.settings.modelProvider = e.target.value;
      this.updateCustomSelectUI(this.settings.modelProvider);
      this.updateProviderVisibility();
      this.saveSettings();
      if (this.settings.modelProvider === 'lmstudio') {
        this.checkConnection();
      } else {
        this.updateModelList(this.settings.modelProvider);
      }
    });

    // Text inputs
    this.elements.lmStudioUrl.addEventListener('input', (e) => {
      this.settings.lmStudioUrl = e.target.value;
      debouncedSave();
      debouncedCheckConnection();
    });

    this.elements.lmStudioUrl.addEventListener('blur', (e) => {
      this.settings.lmStudioUrl = e.target.value.trim() || 'http://localhost:1234';
      this.saveSettings();
      this.checkConnection();
    });

    this.elements.openaiApiKey.addEventListener('input', (e) => {
      this.settings.openaiApiKey = e.target.value;
      debouncedSave();
    });

    this.elements.openaiApiKey.addEventListener('blur', (e) => {
      this.settings.openaiApiKey = e.target.value.trim();
      this.updateApiKeyDisplay('openai', this.settings.openaiApiKey);
      this.saveSettings();
      this.updateModelList('openai');
    });

    this.elements.claudeApiKey.addEventListener('input', (e) => {
      this.settings.claudeApiKey = e.target.value;
      debouncedSave();
    });

    this.elements.claudeApiKey.addEventListener('blur', (e) => {
      this.settings.claudeApiKey = e.target.value.trim();
      this.updateApiKeyDisplay('claude', this.settings.claudeApiKey);
      this.saveSettings();
      this.updateModelList('claude');
    });

    this.elements.geminiApiKey.addEventListener('input', (e) => {
      this.settings.geminiApiKey = e.target.value;
      debouncedSave();
    });

    this.elements.geminiApiKey.addEventListener('blur', (e) => {
      this.settings.geminiApiKey = e.target.value.trim();
      this.updateApiKeyDisplay('gemini', this.settings.geminiApiKey);
      this.saveSettings();
      this.updateModelList('gemini');
    });

    // Model inputs
    this.elements.openaiModel.addEventListener('change', (e) => {
      this.settings.openaiModel = e.target.value;
      this.saveSettings();
    });

    this.elements.claudeModel.addEventListener('change', (e) => {
      this.settings.claudeModel = e.target.value;
      this.saveSettings();
    });

    this.elements.geminiModel.addEventListener('change', (e) => {
      this.settings.geminiModel = e.target.value;
      this.saveSettings();
    });

    this.elements.lmStudioModel.addEventListener('input', (e) => {
      this.settings.lmStudioModel = e.target.value;
      debouncedSave();
    });

    this.elements.lmStudioModel.addEventListener('blur', (e) => {
      this.settings.lmStudioModel = e.target.value.trim();
      this.saveSettings();
    });

    this.elements.openrouterApiKey.addEventListener('input', (e) => {
      this.settings.openrouterApiKey = e.target.value;
      debouncedSave();
    });

    this.elements.openrouterApiKey.addEventListener('blur', (e) => {
      this.settings.openrouterApiKey = e.target.value.trim();
      this.updateApiKeyDisplay('openrouter', this.settings.openrouterApiKey);
      this.saveSettings();
    });

    // OpenRouter model is free text, not a select
    this.elements.openrouterModel.addEventListener('input', (e) => {
      this.settings.openrouterModel = e.target.value;
      debouncedSave();
    });

    this.elements.openrouterModel.addEventListener('blur', (e) => {
      this.settings.openrouterModel = e.target.value.trim();
      this.saveSettings();
    });

    // Custom prompts
    this.elements.customCorePrompt.addEventListener('input', (e) => {
      this.settings.customCorePrompt = e.target.value;
      debouncedSave();
    });

    this.elements.customCorePrompt.addEventListener('blur', (e) => {
      // If matches default, save as empty string to track it as "default"
      const val = e.target.value.trim();
      if (val === StopTheSlopConfig.DEFAULT_CORE_PROMPT.trim()) {
        this.settings.customCorePrompt = '';
      } else {
        this.settings.customCorePrompt = val;
      }
      this.saveSettings();
    });

    this.elements.customOutputFormat.addEventListener('input', (e) => {
      this.settings.customOutputFormat = e.target.value;
      debouncedSave();
    });

    this.elements.customOutputFormat.addEventListener('blur', (e) => {
      const val = e.target.value.trim();
      if (val === StopTheSlopConfig.DEFAULT_OUTPUT_FORMAT_JSON.trim()) {
        this.settings.customOutputFormat = '';
      } else {
        this.settings.customOutputFormat = val;
      }
      this.saveSettings();
    });

    // Reset Buttons
    this.elements.resetCorePrompt.addEventListener('click', () => {
      this.settings.customCorePrompt = ''; // Reset to default (empty string logic)
      this.elements.customCorePrompt.value = StopTheSlopConfig.DEFAULT_CORE_PROMPT;
      this.saveSettings();
      this.showToast('System Prompt reset to default value.', 'success');
    });

    this.elements.resetOutputFormat.addEventListener('click', () => {
      this.settings.customOutputFormat = '';
      this.elements.customOutputFormat.value = StopTheSlopConfig.DEFAULT_OUTPUT_FORMAT_JSON;
      this.saveSettings();
      this.showToast('Output Format reset to default value.', 'success');
    });

    // Click on masked key to edit
    this.elements.openaiKeyDisplay?.addEventListener('click', () => {
      this.elements.openaiKeyDisplay.style.display = 'none';
      this.elements.openaiApiKey.style.display = 'block';
      this.elements.openaiApiKey.focus();
    });

    this.elements.claudeKeyDisplay?.addEventListener('click', () => {
      this.elements.claudeKeyDisplay.style.display = 'none';
      this.elements.claudeApiKey.style.display = 'block';
      this.elements.claudeApiKey.focus();
    });

    this.elements.openrouterKeyDisplay?.addEventListener('click', () => {
      this.elements.openrouterKeyDisplay.style.display = 'none';
      this.elements.openrouterApiKey.style.display = 'block';
      this.elements.openrouterApiKey.focus();
    });

    this.elements.geminiKeyDisplay?.addEventListener('click', () => {
      this.elements.geminiKeyDisplay.style.display = 'none';
      this.elements.geminiApiKey.style.display = 'block';
      this.elements.geminiApiKey.focus();
    });

    this.elements.enableMinLength.addEventListener('change', (e) => {
      this.settings.enableMinLength = e.target.checked;
      this.updateMinLengthVisibility();
      this.saveSettings();
    });

    this.elements.minTextLength.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      if (!isNaN(val)) {
        this.settings.minTextLength = Math.max(5, Math.min(200, val));
        debouncedSave();
      }
    });

    this.elements.minTextLength.addEventListener('blur', (e) => {
      this.settings.minTextLength = Math.max(5, Math.min(200, parseInt(e.target.value) || 20));
      e.target.value = this.settings.minTextLength;
      this.saveSettings();
    });

    this.elements.maxBulletPoints.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      if (!isNaN(val)) {
        this.settings.maxBulletPoints = Math.max(1, Math.min(10, val));
        debouncedSave();
      }
    });

    this.elements.maxBulletPoints.addEventListener('blur', (e) => {
      this.settings.maxBulletPoints = Math.max(1, Math.min(10, parseInt(e.target.value) || 3));
      e.target.value = this.settings.maxBulletPoints;
      this.saveSettings();
    });

    // Range slider - Temperature
    this.elements.temperature.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      const floatVal = value / 100;
      this.elements.temperatureValue.textContent = floatVal.toFixed(1);
      this.settings.temperature = floatVal;
      debouncedSave();
    });

    this.elements.maxTokens.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      if (!isNaN(val)) {
        this.settings.maxTokens = Math.max(100, Math.min(128000, val));
        debouncedSave();
      }
    });

    this.elements.maxTokens.addEventListener('blur', (e) => {
      const val = parseInt(e.target.value) || 5000;
      this.settings.maxTokens = Math.max(100, Math.min(128000, val));
      e.target.value = this.settings.maxTokens;
      this.saveSettings();
    });



    // Buttons
    this.elements.resetSettings.addEventListener('click', () => this.resetToDefaults());
    this.elements.resetApiKeys.addEventListener('click', () => this.resetApiKeys());
    this.elements.clearStats?.addEventListener('click', () => this.clearScanHistory());
    this.elements.resetAnchors.addEventListener('click', () => {
      this.settings.anchors = { ...StopTheSlopConfig.DEFAULT_SETTINGS.anchors };
      this.updateZoneBar();
      this.saveSettings();
      this.showToast('AI-content Score Sensitivity reset to default value.', 'success');
    });

    // Zone Bar Drag Logic
    this.initZoneBar();
  }

  initExperimentalToggle() {
    const { experimentalToggle, experimentalBody, experimentalSection } = this.elements;
    if (!experimentalToggle || !experimentalBody) return;

    // Restore persisted state
    const isCollapsed = localStorage.getItem('experimentalCollapsed') === 'true';
    if (isCollapsed) {
      experimentalBody.classList.add('collapsed');
      experimentalSection?.classList.add('collapsed');
    }

    experimentalToggle.addEventListener('click', () => {
      const collapsed = experimentalBody.classList.toggle('collapsed');
      experimentalSection?.classList.toggle('collapsed', collapsed);
      localStorage.setItem('experimentalCollapsed', collapsed);
    });
  }

  updateZoneBar() {
    const bar = this.elements.zoneBar;
    const valuesContainer = this.elements.zoneValues;
    if (!bar || !valuesContainer) return;

    const anchors = this.settings.anchors || StopTheSlopConfig.DEFAULT_SETTINGS.anchors;

    // Zone widths as percentages of total (0-1 range)
    const zones = [
      { zone: 'human', width: anchors.likelyHuman },
      { zone: 'probHuman', width: anchors.ambiguous - anchors.likelyHuman },
      { zone: 'ambiguous', width: anchors.likelyAi - anchors.ambiguous },
      { zone: 'likelyAi', width: anchors.highAi - anchors.likelyAi },
      { zone: 'highAi', width: 1 - anchors.highAi }
    ];

    // Update zone flex values
    const zoneDivs = bar.querySelectorAll('.zone');
    zoneDivs.forEach((div, i) => {
      div.style.flex = `${Math.max(zones[i].width, 0)} 0 0%`;
    });

    // Update percentage labels and their positions
    const keys = ['likelyHuman', 'ambiguous', 'likelyAi', 'highAi'];
    keys.forEach(key => {
      const label = valuesContainer.querySelector(`.zone-val[data-key="${key}"]`);
      if (label) {
        const pct = Math.round(anchors[key] * 100);
        label.textContent = `${pct}%`;
        label.style.left = `${anchors[key] * 100}%`;
      }
    });

    // Hide labels in zones that are too narrow
    const minLabelWidth = 40; // px
    zoneDivs.forEach(div => {
      const label = div.querySelector('.zone-label');
      if (label) {
        label.style.visibility = div.offsetWidth < minLabelWidth ? 'hidden' : 'visible';
      }
    });
  }

  initZoneBar() {
    const bar = this.elements.zoneBar;
    if (!bar) return;

    const container = this.elements.zoneBarContainer;
    const keys = ['likelyHuman', 'ambiguous', 'likelyAi', 'highAi'];
    const gap = 0.05;

    // Initial render
    this.updateZoneBar();

    let activeDivider = null;
    let activeKey = null;

    const onPointerDown = (e) => {
      const divider = e.target.closest('.zone-divider');
      if (!divider) return;

      activeDivider = divider;
      activeKey = divider.getAttribute('data-key');
      activeDivider.classList.add('active');

      document.addEventListener('mousemove', onPointerMove);
      document.addEventListener('mouseup', onPointerUp);
      e.preventDefault();
    };

    const onPointerMove = (e) => {
      if (!activeDivider || !activeKey) return;

      const rect = bar.getBoundingClientRect();
      let pct = (e.clientX - rect.left) / rect.width;

      // Clamp 0-1
      pct = Math.max(0, Math.min(1, pct));

      // Apply neighbor constraints
      const anchors = this.settings.anchors;
      const idx = keys.indexOf(activeKey);

      // Min boundary: previous key + gap (or gap from 0)
      const minVal = idx > 0 ? anchors[keys[idx - 1]] + gap : gap;
      // Max boundary: next key - gap (or 1 - gap)
      const maxVal = idx < keys.length - 1 ? anchors[keys[idx + 1]] - gap : 1 - gap;

      pct = Math.max(minVal, Math.min(maxVal, pct));

      // Round to 2 decimals
      pct = Math.round(pct * 100) / 100;

      // Update setting and UI
      this.settings.anchors[activeKey] = pct;
      this.updateZoneBar();
    };

    const onPointerUp = () => {
      if (activeDivider) {
        activeDivider.classList.remove('active');
        this.saveSettings();
      }
      activeDivider = null;
      activeKey = null;
      document.removeEventListener('mousemove', onPointerMove);
      document.removeEventListener('mouseup', onPointerUp);
    };

    bar.addEventListener('mousedown', onPointerDown);
  }

  async resetToDefaults() {
    const confirmed = await this.showConfirm(
      'Reset All Settings',
      'Are you sure you want to reset all settings to their default values? Your API keys will be preserved.'
    );
    if (!confirmed) return;

    // Preserve API keys when resetting
    const preservedKeys = {
      openaiApiKey: this.settings.openaiApiKey,
      claudeApiKey: this.settings.claudeApiKey,
      openrouterApiKey: this.settings.openrouterApiKey,
      geminiApiKey: this.settings.geminiApiKey
    };

    this.settings = {
      ...StopTheSlopConfig.DEFAULT_SETTINGS,
      openaiApiKey: preservedKeys.openaiApiKey,
      claudeApiKey: preservedKeys.claudeApiKey,
      openrouterApiKey: preservedKeys.openrouterApiKey,
      geminiApiKey: preservedKeys.geminiApiKey
    };
    await this.saveSettings();
    this.applySettingsToUI();
    this.showToast('Settings reset to default values.', 'success');
  }

  async clearScanHistory() {
    const confirmed = await this.showConfirm(
      'Clear Scan History',
      'Are you sure you want to clear all scan history and stats? This cannot be undone.'
    );
    if (!confirmed) return;

    await chrome.runtime.sendMessage({ action: 'clearScanHistory' });
    this.cachedAllStats = null;
    this.elements.postsScannedNum.textContent = '0';
    this.elements.aiDetectedNum.textContent = '0';
    this.elements.platformPie.style.background = 'rgba(255, 255, 255, 0.06)';
    this.elements.platformLegend.innerHTML = `<span class="platform-label" style="color:#8892b0">No data</span>`;
    await this.updateStats();
    this.showToast('Scan history cleared.', 'success');
  }

  async resetApiKeys() {
    const confirmed = await this.showConfirm(
      'Reset API Keys',
      'Are you sure you want to delete all stored API keys? This action cannot be undone.'
    );
    if (!confirmed) return;

    this.settings.openaiApiKey = '';
    this.settings.claudeApiKey = '';
    this.settings.openrouterApiKey = '';
    this.settings.geminiApiKey = '';
    await this.saveSettings();
    this.applySettingsToUI();
    this.showToast('API keys removed.', 'success');
  }

  async saveSettings() {
    try {
      await chrome.storage.local.set({ settings: this.settings });
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showToast('Failed to save settings', 'error');
    }
  }

  async checkConnection() {
    // Only show connection status for LM Studio
    if (this.settings.modelProvider !== 'lmstudio') {
      return;
    }

    const statusEl = this.elements.connectionStatus;

    statusEl.classList.remove('connected', 'disconnected');
    statusEl.classList.add('checking');
    statusEl.title = 'Checking connection...';

    try {
      const response = await chrome.runtime.sendMessage({ action: 'checkConnection' });

      statusEl.classList.remove('checking');
      if (response.connected) {
        statusEl.classList.add('connected');
        statusEl.title = 'Connected to LM Studio';
      } else {
        statusEl.classList.add('disconnected');
        statusEl.title = response.error || 'Not connected';
      }
    } catch (error) {
      statusEl.classList.remove('checking');
      statusEl.classList.add('disconnected');
      statusEl.title = 'Connection error';
    }
  }

  async updateStats() {
    try {
      // Fetch historical stats from persistent storage
      const allStats = await chrome.runtime.sendMessage({ action: 'getHistoricalStats' });

      if (allStats) {
        this.cachedAllStats = allStats;
        this.displayStatsForRange(this.currentStatsRange);
        this.updateTabIndicator();
      }
    } catch (error) {
      console.debug('Could not get stats:', error);
    }
  }

  displayStatsForRange(range) {
    const stats = this.cachedAllStats?.[range];
    if (!stats) return;

    this.elements.postsScannedNum.textContent = stats.scanned;
    this.elements.aiDetectedNum.textContent = stats.aiDetected;

    // Platform breakdown — fully dynamic pie chart
    const platforms = stats.platforms || {};
    const total = stats.scanned || 0;

    // Stable color palette per known platform, extras get fallback colors
    const PLATFORM_COLORS = {
      reddit: '#ff4500',
      linkedin: '#0077b5',
      twitter: '#1da1f2',
      facebook: '#1877f2',
      instagram: '#e1306c',
      youtube: '#ff0000',
      tiktok: '#69c9d0',
      unknown: '#8892b0'
    };
    const FALLBACK_COLORS = ['#a78bfa', '#34d399', '#fbbf24', '#f472b6'];

    const legend = this.elements.platformLegend;
    legend.innerHTML = '';

    if (total > 0) {
      // Sort platforms by count descending
      const sorted = Object.entries(platforms)
        .filter(([, count]) => count > 0)
        .sort(([, a], [, b]) => b - a);

      // Build conic-gradient segments
      let gradientParts = [];
      let deg = 0;
      let fallbackIdx = 0;

      sorted.forEach(([name, count]) => {
        const pct = count / total;
        const color = PLATFORM_COLORS[name] || FALLBACK_COLORS[fallbackIdx++ % FALLBACK_COLORS.length];
        const start = deg;
        deg += pct * 360;
        gradientParts.push(`${color} ${start.toFixed(1)}deg ${deg.toFixed(1)}deg`);

        // Legend row
        const pctLabel = Math.round(pct * 100);
        const displayName = name.charAt(0).toUpperCase() + name.slice(1);
        const item = document.createElement('div');
        item.className = 'platform-legend-item';
        item.innerHTML = `
          <span class="platform-dot" style="background:${color}"></span>
          <span class="platform-label" style="color:${color}">${displayName} ${pctLabel}%</span>
        `;
        legend.appendChild(item);
      });

      this.elements.platformPie.style.background =
        `conic-gradient(${gradientParts.join(', ')})`;
    } else {
      this.elements.platformPie.style.background = 'rgba(255, 255, 255, 0.06)';
      const item = document.createElement('div');
      item.className = 'platform-legend-item';
      item.innerHTML = `<span class="platform-label" style="color:#8892b0">No data</span>`;
      legend.appendChild(item);
    }
  }

  animateStatValue(element, targetValue) {
    const currentValue = parseInt(element.textContent) || 0;
    if (currentValue === targetValue) return;

    const duration = 400;
    const startTime = performance.now();

    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.round(currentValue + (targetValue - currentValue) * eased);
      element.textContent = current;
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }

  updateTabIndicator() {
    const tabs = this.elements.statsTabs;
    const indicator = this.elements.statsTabIndicator;
    if (!tabs || !indicator) return;

    const activeTab = tabs.querySelector('.stats-tab.active');
    if (activeTab) {
      indicator.style.width = `${activeTab.offsetWidth}px`;
      indicator.style.left = `${activeTab.offsetLeft}px`;
    }
  }

  bindStatsTabs() {
    const tabs = this.elements.statsTabs;
    if (!tabs) return;

    // Restore last-chosen range from localStorage
    const savedRange = localStorage.getItem('statsTabRange');
    if (savedRange) {
      const savedTab = tabs.querySelector(`.stats-tab[data-range="${savedRange}"]`);
      if (savedTab) {
        tabs.querySelectorAll('.stats-tab').forEach(t => t.classList.remove('active'));
        savedTab.classList.add('active');
        this.currentStatsRange = savedRange;
      }
    }

    tabs.querySelectorAll('.stats-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        // Update active tab
        tabs.querySelectorAll('.stats-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Persist chosen range and update display
        this.currentStatsRange = tab.dataset.range;
        localStorage.setItem('statsTabRange', this.currentStatsRange);
        this.displayStatsForRange(this.currentStatsRange);
        this.updateTabIndicator();
      });
    });

    // Set initial indicator position after DOM is ready
    requestAnimationFrame(() => this.updateTabIndicator());
  }

  /**
   * Show a custom-styled confirmation modal.
   * @param {string} title
   * @param {string} message
   * @returns {Promise<boolean>}
   */
  showConfirm(title, message) {
    return new Promise((resolve) => {
      // Remove any existing modal
      document.querySelector('.sts-modal-overlay')?.remove();

      const overlay = document.createElement('div');
      overlay.className = 'sts-modal-overlay';
      overlay.innerHTML = `
        <div class="sts-modal">
          <div class="sts-modal-header">
            <span class="sts-modal-icon">⚠️</span>
            <span class="sts-modal-title">${title}</span>
          </div>
          <p class="sts-modal-message">${message}</p>
          <div class="sts-modal-actions">
            <button class="sts-modal-btn sts-modal-cancel">Cancel</button>
            <button class="sts-modal-btn sts-modal-confirm">Confirm</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      // Animate in
      requestAnimationFrame(() => overlay.classList.add('show'));

      const close = (result) => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 200);
        resolve(result);
      };

      overlay.querySelector('.sts-modal-confirm').addEventListener('click', () => close(true));
      overlay.querySelector('.sts-modal-cancel').addEventListener('click', () => close(false));
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
    });
  }

  showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Show toast
    setTimeout(() => toast.classList.add('show'), 10);

    // Hide toast after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  async updateModelList(provider) {
    // OpenRouter uses free text input, no model fetching needed
    if (!provider || provider === 'lmstudio' || provider === 'openrouter') return;

    const selectId = provider === 'openai' ? 'openaiModel' : 
                     provider === 'claude' ? 'claudeModel' : 
                     provider === 'gemini' ? 'geminiModel' : 'openaiModel';
    const selectEl = this.elements[selectId];
    if (!selectEl) return;

    // Show loading state
    selectEl.innerHTML = '<option disabled selected>Loading models...</option>';
    selectEl.disabled = true;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getModels',
        provider: provider
      });

      // Clear loading message
      selectEl.innerHTML = '';
      selectEl.disabled = false;

      if (response && response.models && response.models.length > 0) {
        const currentModel = provider === 'openai'
          ? this.settings.openaiModel
          : provider === 'claude' ? this.settings.claudeModel
          : this.settings.geminiModel;

        let foundCurrent = false;

        response.models.forEach(model => {
          const option = document.createElement('option');
          option.value = model.id;
          // For OpenRouter, use the 'name' field if available for display
          option.textContent = provider === 'openrouter' ? (model.name || model.id) : (model.display_name || model.id);
          if (model.id === currentModel) {
            option.selected = true;
            foundCurrent = true;
          }
          selectEl.appendChild(option);
        });

        // If current selection is invalid (not in list), select the default
        if (!foundCurrent && selectEl.options.length > 0) {
          let defaultIndex = 0;

          if (provider === 'claude') {
            // Default to latest Haiku model (list is sorted by newest first)
            const haikuIndex = Array.from(selectEl.options).findIndex(opt => opt.value.toLowerCase().includes('haiku'));
            if (haikuIndex !== -1) {
              defaultIndex = haikuIndex;
            }
          }

          selectEl.selectedIndex = defaultIndex;
          // Immediately update settings to the valid model
          if (provider === 'openai') this.settings.openaiModel = selectEl.value;
          if (provider === 'claude') this.settings.claudeModel = selectEl.value;
          if (provider === 'gemini') this.settings.geminiModel = selectEl.value;
          // Note: openrouter not included as it uses free text input
          this.saveSettings();
        }
      } else {
        // No models returned (but no error thrown?) or empty list
        const option = document.createElement('option');
        option.text = 'No models found (Check API Key)';
        selectEl.add(option);
        selectEl.disabled = true;
      }
    } catch (error) {
      console.error(`Error updating ${provider} models:`, error);
      selectEl.innerHTML = '<option>Error fetching models</option>';
      selectEl.disabled = true;
    }
  }

  updateCustomSelectUI(value) {
    if (!this.elements.providerOptions) return;

    // Update selected class in dropdown list
    this.elements.providerOptions.forEach(opt => {
      if (opt.getAttribute('data-value') === value) {
        opt.classList.add('selected');

        // Update trigger content
        const iconSrc = opt.querySelector('img').src;
        const text = opt.querySelector('span').textContent;
        const triggerOption = this.elements.providerTrigger.querySelector('.selected-option');

        triggerOption.querySelector('img').src = iconSrc;
        triggerOption.querySelector('img').alt = text;
        triggerOption.querySelector('span').textContent = text;

      } else {
        opt.classList.remove('selected');
      }
    });
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
