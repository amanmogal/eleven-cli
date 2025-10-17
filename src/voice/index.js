/**
 * Voice Project Main Module
 * Comprehensive voice processing and AI integration
 */

const VoiceSynthesis = require('./voice-synthesis');
const VoiceRecognition = require('./voice-recognition');
const VoiceCloning = require('./voice-cloning');
const RealTimeVoice = require('./real-time-voice');
const VoiceUI = require('./voice-ui');
const { EventEmitter } = require('events');

class VoiceProject extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Initialize modules
    this.synthesis = new VoiceSynthesis(options);
    this.recognition = new VoiceRecognition(options);
    this.cloning = new VoiceCloning(options);
    this.realTime = new RealTimeVoice(options);
    this.ui = new VoiceUI(options);
    
    // Configuration
    this.config = {
      apiKey: options.apiKey || process.env.ELEVENLABS_API_KEY,
      baseUrl: options.baseUrl || 'https://api.elevenlabs.io/v1',
      outputDir: options.outputDir || './output',
      tempDir: options.tempDir || './temp',
      maxConcurrency: options.maxConcurrency || 3,
      defaultVoice: options.defaultVoice || 'pNInz6obpgDQGcFmaJgB',
      defaultModel: options.defaultModel || 'eleven_multilingual_v2'
    };
    
    // State
    this.isInitialized = false;
    this.activeConnections = new Set();
    this.processingQueue = [];
    
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for all modules
   */
  setupEventHandlers() {
    // Synthesis events
    this.synthesis.on('synthesisComplete', (data) => {
      this.emit('synthesisComplete', data);
    });
    
    this.synthesis.on('synthesisError', (error) => {
      this.emit('synthesisError', error);
    });

    // Recognition events
    this.recognition.on('transcriptionComplete', (data) => {
      this.emit('transcriptionComplete', data);
    });
    
    this.recognition.on('transcriptionError', (error) => {
      this.emit('transcriptionError', error);
    });

    // Cloning events
    this.cloning.on('voiceCloned', (data) => {
      this.emit('voiceCloned', data);
    });
    
    this.cloning.on('voiceCloneError', (error) => {
      this.emit('voiceCloneError', error);
    });

    // Real-time events
    this.realTime.on('connected', () => {
      this.emit('realTimeConnected');
    });
    
    this.realTime.on('disconnected', () => {
      this.emit('realTimeDisconnected');
    });
  }

  /**
   * Initialize the voice project
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.ui.showHeader('Voice Project', '1.0.0');
      
      if (!this.config.apiKey) {
        throw new Error('ElevenLabs API key is required');
      }

      // Test API connection
      await this.testConnection();
      
      this.isInitialized = true;
      this.emit('initialized');
      this.ui.showSuccess('Voice project initialized successfully');
      
    } catch (error) {
      this.ui.showError('Failed to initialize voice project', error);
      throw error;
    }
  }

  /**
   * Test API connection
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      const voices = await this.synthesis.getVoices();
      return voices.length > 0;
    } catch (error) {
      throw new Error(`API connection failed: ${error.message}`);
    }
  }

  /**
   * Get project status
   * @returns {Object} Project status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      apiKey: this.config.apiKey ? '***' + this.config.apiKey.slice(-4) : 'Not set',
      activeConnections: this.activeConnections.size,
      processingQueue: this.processingQueue.length,
      realTimeStatus: this.realTime.getStatus()
    };
  }

  /**
   * Synthesize text to speech
   * @param {string} text - Text to synthesize
   * @param {Object} options - Synthesis options
   * @returns {Promise<Buffer>} Audio buffer
   */
  async synthesize(text, options = {}) {
    this.ui.showSynthesisProgress({ current: 1, total: 1, text });
    return await this.synthesis.synthesize(text, options);
  }

  /**
   * Synthesize and save to file
   * @param {string} text - Text to synthesize
   * @param {string} outputPath - Output file path
   * @param {Object} options - Synthesis options
   * @returns {Promise<string>} Saved file path
   */
  async synthesizeToFile(text, outputPath, options = {}) {
    this.ui.showSynthesisProgress({ current: 1, total: 1, text });
    return await this.synthesis.synthesizeToFile(text, outputPath, options);
  }

  /**
   * Transcribe audio to text
   * @param {string} audioPath - Audio file path
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Transcription result
   */
  async transcribe(audioPath, options = {}) {
    this.ui.showRecognitionProgress({ percentCompleted: 0, text: '' });
    return await this.recognition.transcribe(audioPath, options);
  }

  /**
   * Clone a voice
   * @param {Object} voiceData - Voice cloning data
   * @returns {Promise<Object>} Cloned voice details
   */
  async cloneVoice(voiceData) {
    this.ui.showCloningProgress({ 
      step: 'Preparing voice data', 
      totalSteps: 3, 
      currentStep: 1 
    });
    
    const result = await this.cloning.cloneVoice(voiceData);
    
    this.ui.showCloningProgress({ 
      step: 'Voice cloning complete', 
      totalSteps: 3, 
      currentStep: 3 
    });
    
    return result;
  }

  /**
   * Start real-time voice processing
   * @param {Object} options - Real-time options
   * @returns {Promise<void>}
   */
  async startRealTime(options = {}) {
    await this.realTime.connect();
    this.activeConnections.add('realTime');
    this.emit('realTimeStarted');
  }

  /**
   * Stop real-time voice processing
   */
  stopRealTime() {
    this.realTime.disconnect();
    this.activeConnections.delete('realTime');
    this.emit('realTimeStopped');
  }

  /**
   * Get available voices
   * @returns {Promise<Array>} Available voices
   */
  async getVoices() {
    return await this.synthesis.getVoices();
  }

  /**
   * Interactive voice selection
   * @returns {Promise<Object>} Selected voice
   */
  async selectVoice() {
    const voices = await this.getVoices();
    return await this.ui.selectVoice(voices);
  }

  /**
   * Interactive text synthesis
   * @returns {Promise<string>} Output file path
   */
  async interactiveSynthesis() {
    const text = await this.ui.getTextInput();
    const voice = await this.selectVoice();
    const settings = await this.ui.configureVoiceSettings();
    
    const outputPath = `./output/synthesis_${Date.now()}.mp3`;
    return await this.synthesizeToFile(text, outputPath, {
      voiceId: voice.voice_id,
      voiceSettings: settings
    });
  }

  /**
   * Batch process multiple texts
   * @param {Array} texts - Array of texts
   * @param {Object} options - Processing options
   * @returns {Promise<Array>} Array of output file paths
   */
  async batchProcess(texts, options = {}) {
    const results = [];
    const voice = options.voice || await this.selectVoice();
    
    for (let i = 0; i < texts.length; i++) {
      this.ui.showSynthesisProgress({ 
        current: i + 1, 
        total: texts.length, 
        text: texts[i] 
      });
      
      const outputPath = `./output/batch_${i + 1}_${Date.now()}.mp3`;
      const result = await this.synthesizeToFile(texts[i], outputPath, {
        voiceId: voice.voice_id,
        ...options
      });
      
      results.push(result);
    }
    
    return results;
  }

  /**
   * Create voice conversation
   * @param {Object} config - Conversation configuration
   * @returns {Promise<void>}
   */
  async startConversation(config = {}) {
    await this.startRealTime();
    this.realTime.startConversation(config);
    this.emit('conversationStarted', config);
  }

  /**
   * Stop voice conversation
   */
  stopConversation() {
    this.realTime.stopConversation();
    this.stopRealTime();
    this.emit('conversationStopped');
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopRealTime();
    this.activeConnections.clear();
    this.processingQueue = [];
    this.emit('cleanup');
  }
}

module.exports = VoiceProject;