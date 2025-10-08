const path = require('path');
const fs = require('fs-extra');
const Logger = require('./logger');
const FileManager = require('./file-manager');

const logger = new Logger();
const fileManager = new FileManager();

/**
 * Configuration Manager for handling application settings
 * Provides centralized configuration management with validation
 */
class ConfigManager {
  constructor() {
    this.config = null;
    this.configPath = path.join(process.cwd(), 'eleven-config.json');
    this.defaultConfig = this._getDefaultConfig();
  }

  /**
   * Get default configuration
   * @returns {Object} Default configuration object
   */
  _getDefaultConfig() {
    return {
      elevenApiKey: process.env.ELEVEN_API_KEY,
      defaultVoiceId: process.env.DEFAULT_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL',
      cursorAgentPath: process.env.CURSOR_AGENT_PATH || 'cursor-agent',
      cursorProjectPath: process.env.CURSOR_PROJECT_PATH || '.',
      debug: process.env.DEBUG === 'true',
      logLevel: process.env.LOG_LEVEL || 'info',
      nodeEnv: process.env.NODE_ENV || 'development',
      elevenApiBaseUrl: process.env.ELEVEN_API_BASE_URL || 'https://api.elevenlabs.io/v1',
      requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10),
      maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
      defaultOutputDir: process.env.DEFAULT_OUTPUT_DIR || './output',
      tempDir: process.env.TEMP_DIR || './.temp'
    };
  }

  /**
   * Load configuration from environment and file
   * @returns {Object} Configuration object
   */
  loadConfig() {
    if (this.config) {
      return this.config;
    }

    try {
      // Start with default config
      this.config = { ...this.defaultConfig };

      // Load from file if exists
      if (fs.existsSync(this.configPath)) {
        const fileConfig = fs.readJsonSync(this.configPath);
        this.config = { ...this.config, ...fileConfig };
      }

      // Validate required configuration
      this._validateConfig();
      return this.config;
    } catch (error) {
      logger.error(`Failed to load configuration: ${error.message}`);
      throw new Error(`Configuration error: ${error.message}`);
    }
  }

  /**
   * Validate configuration
   * @throws {Error} If configuration is invalid
   */
  _validateConfig() {
    const required = ['elevenApiKey'];
    const missing = required.filter(key => !this.config[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }

    // Validate API key format (basic check)
    if (this.config.elevenApiKey && !this._isValidApiKey(this.config.elevenApiKey)) {
      throw new Error('Invalid ElevenLabs API key format');
    }

    // Validate voice ID format
    if (this.config.defaultVoiceId && !this._isValidVoiceId(this.config.defaultVoiceId)) {
      throw new Error('Invalid voice ID format');
    }

    // Validate numeric values
    if (this.config.requestTimeout < 1000 || this.config.requestTimeout > 300000) {
      throw new Error('Request timeout must be between 1000 and 300000 milliseconds');
    }

    if (this.config.maxRetries < 0 || this.config.maxRetries > 10) {
      throw new Error('Max retries must be between 0 and 10');
    }
  }

  /**
   * Validate API key format
   * @param {string} apiKey - API key to validate
   * @returns {boolean}
   */
  _isValidApiKey(apiKey) {
    // Basic format validation for ElevenLabs API key
    return typeof apiKey === 'string' && apiKey.length > 20 && /^[a-zA-Z0-9_-]+$/.test(apiKey);
  }

  /**
   * Validate voice ID format
   * @param {string} voiceId - Voice ID to validate
   * @returns {boolean}
   */
  _isValidVoiceId(voiceId) {
    // Basic format validation for ElevenLabs voice ID
    return typeof voiceId === 'string' && voiceId.length > 10 && /^[a-zA-Z0-9_-]+$/.test(voiceId);
  }

  /**
   * Save configuration to file
   * @param {Object} config - Configuration to save
   * @returns {Promise<void>}
   */
  async saveConfig(config) {
    try {
      const configToSave = { ...this.config, ...config };
      await fileManager.writeFile(this.configPath, JSON.stringify(configToSave, null, 2));
      this.config = configToSave;
    } catch (error) {
      logger.error(`Failed to save configuration: ${error.message}`);
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  /**
   * Get configuration value
   * @param {string} key - Configuration key
   * @param {*} defaultValue - Default value if key not found
   * @returns {*} Configuration value
   */
  get(key, defaultValue = null) {
    if (!this.config) {
      this.loadConfig();
    }
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }

  /**
   * Set configuration value
   * @param {string} key - Configuration key
   * @param {*} value - Configuration value
   */
  set(key, value) {
    if (!this.config) {
      this.loadConfig();
    }
    this.config[key] = value;
  }

  /**
   * Reset configuration to defaults
   */
  reset() {
    this.config = { ...this.defaultConfig };
  }

  /**
   * Get all configuration
   * @returns {Object} Complete configuration object
   */
  getAll() {
    if (!this.config) {
      this.loadConfig();
    }
    return { ...this.config };
  }

  /**
   * Check if configuration is valid
   * @returns {boolean}
   */
  isValid() {
    try {
      this._validateConfig();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get configuration summary (without sensitive data)
   * @returns {Object} Configuration summary
   */
  getSummary() {
    if (!this.config) {
      this.loadConfig();
    }

    return {
      defaultVoiceId: this.config.defaultVoiceId,
      cursorAgentPath: this.config.cursorAgentPath,
      debug: this.config.debug,
      logLevel: this.config.logLevel,
      nodeEnv: this.config.nodeEnv,
      elevenApiBaseUrl: this.config.elevenApiBaseUrl,
      requestTimeout: this.config.requestTimeout,
      maxRetries: this.config.maxRetries,
      defaultOutputDir: this.config.defaultOutputDir,
      tempDir: this.config.tempDir,
      hasApiKey: !!this.config.elevenApiKey
    };
  }
}

module.exports = ConfigManager;