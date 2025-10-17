/**
 * Real-time Voice Processing Module
 * Handles live voice interactions and streaming
 */

const WebSocket = require('ws');
const { EventEmitter } = require('events');
const axios = require('axios');

class RealTimeVoice extends EventEmitter {
  constructor(options = {}) {
    super();
    this.apiKey = options.apiKey || process.env.ELEVENLABS_API_KEY;
    this.baseUrl = options.baseUrl || 'wss://api.elevenlabs.io/v1';
    this.voiceId = options.voiceId || 'pNInz6obpgDQGcFmaJgB';
    this.modelId = options.modelId || 'eleven_multilingual_v2';
    this.voiceSettings = {
      stability: options.stability || 0.5,
      similarityBoost: options.similarityBoost || 0.5,
      style: options.style || 0.0,
      useSpeakerBoost: options.useSpeakerBoost || true
    };
    this.ws = null;
    this.isConnected = false;
    this.audioQueue = [];
    this.isProcessing = false;
  }

  /**
   * Connect to real-time voice API
   * @returns {Promise<void>}
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.baseUrl}/text-to-speech/${this.voiceId}/stream-input?model_id=${this.modelId}`;
        
        this.ws = new WebSocket(wsUrl, {
          headers: {
            'xi-api-key': this.apiKey
          }
        });

        this.ws.on('open', () => {
          this.isConnected = true;
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            this.emit('messageError', error);
          }
        });

        this.ws.on('error', (error) => {
          this.emit('connectionError', error);
          reject(error);
        });

        this.ws.on('close', () => {
          this.isConnected = false;
          this.emit('disconnected');
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   * @param {Object} message - WebSocket message
   */
  handleMessage(message) {
    switch (message.type) {
      case 'audio':
        this.emit('audioChunk', message.audio);
        break;
      case 'audio_generation_complete':
        this.emit('generationComplete', message);
        break;
      case 'error':
        this.emit('generationError', message);
        break;
      default:
        this.emit('unknownMessage', message);
    }
  }

  /**
   * Send text for real-time synthesis
   * @param {string} text - Text to synthesize
   * @param {Object} options - Synthesis options
   */
  sendText(text, options = {}) {
    if (!this.isConnected) {
      throw new Error('Not connected to real-time voice API');
    }

    const message = {
      text,
      voice_settings: { ...this.voiceSettings, ...options.voiceSettings },
      generation_config: {
        chunk_length_schedule: options.chunkLength || [120, 160, 250, 290]
      }
    };

    this.ws.send(JSON.stringify(message));
    this.emit('textSent', { text, options });
  }

  /**
   * Send end of input signal
   */
  endInput() {
    if (!this.isConnected) {
      throw new Error('Not connected to real-time voice API');
    }

    this.ws.send(JSON.stringify({ text: '' }));
    this.emit('inputEnded');
  }

  /**
   * Process audio stream in real-time
   * @param {ReadableStream} audioStream - Audio input stream
   * @param {Object} options - Processing options
   */
  async processAudioStream(audioStream, options = {}) {
    try {
      this.isProcessing = true;
      this.emit('processingStarted');

      const chunks = [];
      let totalDuration = 0;

      for await (const chunk of audioStream) {
        chunks.push(chunk);
        totalDuration += chunk.length;
        
        this.emit('chunkProcessed', { 
          chunkSize: chunk.length, 
          totalDuration 
        });
      }

      this.emit('processingComplete', { 
        totalChunks: chunks.length, 
        totalDuration 
      });

      return chunks;
    } catch (error) {
      this.emit('processingError', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Start voice conversation
   * @param {Object} conversationConfig - Conversation settings
   */
  startConversation(conversationConfig = {}) {
    const {
      maxDuration = 300000, // 5 minutes
      silenceThreshold = 1000, // 1 second
      responseDelay = 500 // 500ms
    } = conversationConfig;

    this.conversationConfig = conversationConfig;
    this.emit('conversationStarted', conversationConfig);
  }

  /**
   * Stop voice conversation
   */
  stopConversation() {
    this.emit('conversationStopped');
  }

  /**
   * Set voice parameters in real-time
   * @param {Object} voiceSettings - New voice settings
   */
  updateVoiceSettings(voiceSettings) {
    this.voiceSettings = { ...this.voiceSettings, ...voiceSettings };
    this.emit('voiceSettingsUpdated', this.voiceSettings);
  }

  /**
   * Get connection status
   * @returns {Object} Connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isProcessing: this.isProcessing,
      voiceId: this.voiceId,
      modelId: this.modelId,
      voiceSettings: this.voiceSettings
    };
  }

  /**
   * Disconnect from real-time voice API
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.emit('disconnected');
  }

  /**
   * Reconnect to real-time voice API
   * @returns {Promise<void>}
   */
  async reconnect() {
    this.disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    return this.connect();
  }

  /**
   * Send keep-alive ping
   */
  ping() {
    if (this.isConnected && this.ws) {
      this.ws.ping();
      this.emit('pingSent');
    }
  }

  /**
   * Get audio quality metrics
   * @returns {Object} Quality metrics
   */
  getQualityMetrics() {
    return {
      connectionUptime: this.connectionUptime || 0,
      messagesReceived: this.messagesReceived || 0,
      audioChunksProcessed: this.audioChunksProcessed || 0,
      averageLatency: this.averageLatency || 0,
      errorCount: this.errorCount || 0
    };
  }
}

module.exports = RealTimeVoice;