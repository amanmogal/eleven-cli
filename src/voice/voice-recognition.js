/**
 * Voice Recognition Module
 * Provides speech-to-text capabilities with advanced processing
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { EventEmitter } = require('events');

class VoiceRecognition extends EventEmitter {
  constructor(options = {}) {
    super();
    this.apiKey = options.apiKey || process.env.ELEVENLABS_API_KEY;
    this.baseUrl = options.baseUrl || 'https://api.elevenlabs.io/v1';
    this.modelId = options.modelId || 'whisper-1';
    this.language = options.language || 'en';
    this.responseFormat = options.responseFormat || 'json';
  }

  /**
   * Transcribe audio file to text
   * @param {string} audioPath - Path to audio file
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Transcription result
   */
  async transcribe(audioPath, options = {}) {
    try {
      const audioBuffer = await fs.readFile(audioPath);
      return await this.transcribeBuffer(audioBuffer, options);
    } catch (error) {
      this.emit('transcriptionError', error);
      throw new Error(`Failed to transcribe audio file: ${error.message}`);
    }
  }

  /**
   * Transcribe audio buffer to text
   * @param {Buffer} audioBuffer - Audio buffer
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Transcription result
   */
  async transcribeBuffer(audioBuffer, options = {}) {
    try {
      const formData = new FormData();
      formData.append('file', new Blob([audioBuffer]), 'audio.wav');
      formData.append('model', options.modelId || this.modelId);
      formData.append('language', options.language || this.language);
      formData.append('response_format', options.responseFormat || this.responseFormat);

      const response = await axios.post(`${this.baseUrl}/speech-to-text`, formData, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'multipart/form-data'
        }
      });

      this.emit('transcriptionComplete', { 
        text: response.data.text, 
        duration: audioBuffer.length,
        language: options.language || this.language
      });

      return response.data;
    } catch (error) {
      this.emit('transcriptionError', error);
      throw new Error(`Voice recognition failed: ${error.message}`);
    }
  }

  /**
   * Real-time transcription with streaming
   * @param {ReadableStream} audioStream - Audio stream
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Streaming transcription result
   */
  async transcribeStream(audioStream, options = {}) {
    try {
      const formData = new FormData();
      formData.append('file', audioStream);
      formData.append('model', options.modelId || this.modelId);
      formData.append('language', options.language || this.language);
      formData.append('response_format', 'verbose_json');

      const response = await axios.post(`${this.baseUrl}/speech-to-text`, formData, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          this.emit('transcriptionProgress', { percentCompleted });
        }
      });

      this.emit('streamTranscriptionComplete', response.data);
      return response.data;
    } catch (error) {
      this.emit('streamTranscriptionError', error);
      throw new Error(`Stream transcription failed: ${error.message}`);
    }
  }

  /**
   * Batch transcribe multiple audio files
   * @param {Array} audioPaths - Array of audio file paths
   * @param {Object} options - Transcription options
   * @returns {Promise<Array>} Array of transcription results
   */
  async batchTranscribe(audioPaths, options = {}) {
    const results = [];
    const concurrency = options.concurrency || 3;

    for (let i = 0; i < audioPaths.length; i += concurrency) {
      const batch = audioPaths.slice(i, i + concurrency);
      const batchPromises = batch.map(audioPath => this.transcribe(audioPath, options));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        this.emit('batchTranscriptionProgress', { 
          completed: i + batch.length, 
          total: audioPaths.length 
        });
      } catch (error) {
        this.emit('batchTranscriptionError', { error, batchIndex: i });
        throw error;
      }
    }

    return results;
  }

  /**
   * Get supported languages
   * @returns {Promise<Array>} Supported languages
   */
  async getSupportedLanguages() {
    try {
      const response = await axios.get(`${this.baseUrl}/languages`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch supported languages: ${error.message}`);
    }
  }

  /**
   * Validate audio file format
   * @param {string} audioPath - Path to audio file
   * @returns {Promise<Object>} Validation result
   */
  async validateAudioFile(audioPath) {
    try {
      const stats = await fs.stat(audioPath);
      const ext = path.extname(audioPath).toLowerCase();
      const supportedFormats = ['.wav', '.mp3', '.m4a', '.flac', '.ogg'];
      
      const isValid = supportedFormats.includes(ext) && stats.size > 0;
      
      return {
        isValid,
        format: ext,
        size: stats.size,
        supportedFormats
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Extract audio metadata
   * @param {string} audioPath - Path to audio file
   * @returns {Promise<Object>} Audio metadata
   */
  async getAudioMetadata(audioPath) {
    try {
      const stats = await fs.stat(audioPath);
      const ext = path.extname(audioPath).toLowerCase();
      
      return {
        path: audioPath,
        size: stats.size,
        format: ext,
        modified: stats.mtime,
        created: stats.birthtime
      };
    } catch (error) {
      throw new Error(`Failed to get audio metadata: ${error.message}`);
    }
  }
}

module.exports = VoiceRecognition;