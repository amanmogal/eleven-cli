/**
 * Advanced Voice Synthesis Module
 * Provides comprehensive text-to-speech capabilities with voice customization
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { EventEmitter } = require('events');

class VoiceSynthesis extends EventEmitter {
  constructor(options = {}) {
    super();
    this.apiKey = options.apiKey || process.env.ELEVENLABS_API_KEY;
    this.baseUrl = options.baseUrl || 'https://api.elevenlabs.io/v1';
    this.voiceId = options.voiceId || 'pNInz6obpgDQGcFmaJgB'; // Default voice
    this.modelId = options.modelId || 'eleven_multilingual_v2';
    this.voiceSettings = {
      stability: options.stability || 0.5,
      similarityBoost: options.similarityBoost || 0.5,
      style: options.style || 0.0,
      useSpeakerBoost: options.useSpeakerBoost || true
    };
  }

  /**
   * Synthesize text to speech with advanced options
   * @param {string} text - Text to synthesize
   * @param {Object} options - Synthesis options
   * @returns {Promise<Buffer>} Audio buffer
   */
  async synthesize(text, options = {}) {
    try {
      const voiceId = options.voiceId || this.voiceId;
      const modelId = options.modelId || this.modelId;
      const voiceSettings = { ...this.voiceSettings, ...options.voiceSettings };

      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${voiceId}`,
        {
          text,
          model_id: modelId,
          voice_settings: voiceSettings
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey
          },
          responseType: 'arraybuffer'
        }
      );

      this.emit('synthesisComplete', { text, voiceId, duration: response.data.length });
      return Buffer.from(response.data);
    } catch (error) {
      this.emit('synthesisError', error);
      throw new Error(`Voice synthesis failed: ${error.message}`);
    }
  }

  /**
   * Synthesize and save to file
   * @param {string} text - Text to synthesize
   * @param {string} outputPath - Output file path
   * @param {Object} options - Synthesis options
   * @returns {Promise<string>} Saved file path
   */
  async synthesizeToFile(text, outputPath, options = {}) {
    try {
      const audioBuffer = await this.synthesize(text, options);
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeFile(outputPath, audioBuffer);
      
      this.emit('fileSaved', { text, outputPath, size: audioBuffer.length });
      return outputPath;
    } catch (error) {
      this.emit('fileSaveError', error);
      throw new Error(`Failed to save audio file: ${error.message}`);
    }
  }

  /**
   * Batch synthesize multiple texts
   * @param {Array} texts - Array of texts to synthesize
   * @param {Object} options - Synthesis options
   * @returns {Promise<Array>} Array of audio buffers
   */
  async batchSynthesize(texts, options = {}) {
    const results = [];
    const concurrency = options.concurrency || 3;

    for (let i = 0; i < texts.length; i += concurrency) {
      const batch = texts.slice(i, i + concurrency);
      const batchPromises = batch.map(text => this.synthesize(text, options));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        this.emit('batchProgress', { completed: i + batch.length, total: texts.length });
      } catch (error) {
        this.emit('batchError', { error, batchIndex: i });
        throw error;
      }
    }

    return results;
  }

  /**
   * Get available voices
   * @returns {Promise<Array>} Available voices
   */
  async getVoices() {
    try {
      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });
      return response.data.voices;
    } catch (error) {
      throw new Error(`Failed to fetch voices: ${error.message}`);
    }
  }

  /**
   * Get voice details
   * @param {string} voiceId - Voice ID
   * @returns {Promise<Object>} Voice details
   */
  async getVoiceDetails(voiceId) {
    try {
      const response = await axios.get(`${this.baseUrl}/voices/${voiceId}`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch voice details: ${error.message}`);
    }
  }

  /**
   * Clone a voice from audio sample
   * @param {string} name - Voice name
   * @param {string} description - Voice description
   * @param {Buffer} audioBuffer - Audio sample buffer
   * @returns {Promise<Object>} Cloned voice details
   */
  async cloneVoice(name, description, audioBuffer) {
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('files', new Blob([audioBuffer]), 'audio.wav');

      const response = await axios.post(`${this.baseUrl}/voices/add`, formData, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'multipart/form-data'
        }
      });

      this.emit('voiceCloned', { name, voiceId: response.data.voice_id });
      return response.data;
    } catch (error) {
      this.emit('voiceCloneError', error);
      throw new Error(`Voice cloning failed: ${error.message}`);
    }
  }

  /**
   * Delete a voice
   * @param {string} voiceId - Voice ID to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteVoice(voiceId) {
    try {
      await axios.delete(`${this.baseUrl}/voices/${voiceId}`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });
      
      this.emit('voiceDeleted', { voiceId });
      return true;
    } catch (error) {
      this.emit('voiceDeleteError', error);
      throw new Error(`Failed to delete voice: ${error.message}`);
    }
  }

  /**
   * Update voice settings
   * @param {string} voiceId - Voice ID
   * @param {Object} settings - New voice settings
   * @returns {Promise<Object>} Updated voice settings
   */
  async updateVoiceSettings(voiceId, settings) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/voices/${voiceId}/edit`,
        settings,
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      this.emit('voiceSettingsUpdated', { voiceId, settings });
      return response.data;
    } catch (error) {
      this.emit('voiceSettingsUpdateError', error);
      throw new Error(`Failed to update voice settings: ${error.message}`);
    }
  }
}

module.exports = VoiceSynthesis;