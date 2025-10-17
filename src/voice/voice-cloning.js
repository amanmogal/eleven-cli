/**
 * Voice Cloning Module
 * Advanced voice cloning and customization capabilities
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { EventEmitter } = require('events');

class VoiceCloning extends EventEmitter {
  constructor(options = {}) {
    super();
    this.apiKey = options.apiKey || process.env.ELEVENLABS_API_KEY;
    this.baseUrl = options.baseUrl || 'https://api.elevenlabs.io/v1';
  }

  /**
   * Clone voice from audio samples
   * @param {Object} voiceData - Voice cloning data
   * @returns {Promise<Object>} Cloned voice details
   */
  async cloneVoice(voiceData) {
    try {
      const { name, description, audioFiles, labels = {} } = voiceData;
      
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      
      // Add audio files
      for (let i = 0; i < audioFiles.length; i++) {
        const audioBuffer = await fs.readFile(audioFiles[i]);
        formData.append('files', new Blob([audioBuffer]), `audio_${i}.wav`);
      }
      
      // Add labels
      Object.entries(labels).forEach(([key, value]) => {
        formData.append(`labels[${key}]`, value);
      });

      const response = await axios.post(`${this.baseUrl}/voices/add`, formData, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'multipart/form-data'
        }
      });

      this.emit('voiceCloned', { 
        name, 
        voiceId: response.data.voice_id,
        samples: audioFiles.length
      });

      return response.data;
    } catch (error) {
      this.emit('voiceCloneError', error);
      throw new Error(`Voice cloning failed: ${error.message}`);
    }
  }

  /**
   * Fine-tune existing voice
   * @param {string} voiceId - Voice ID to fine-tune
   * @param {Array} additionalSamples - Additional audio samples
   * @param {Object} options - Fine-tuning options
   * @returns {Promise<Object>} Fine-tuned voice details
   */
  async fineTuneVoice(voiceId, additionalSamples, options = {}) {
    try {
      const formData = new FormData();
      
      // Add additional samples
      for (let i = 0; i < additionalSamples.length; i++) {
        const audioBuffer = await fs.readFile(additionalSamples[i]);
        formData.append('files', new Blob([audioBuffer]), `sample_${i}.wav`);
      }
      
      // Add fine-tuning options
      if (options.learningRate) {
        formData.append('learning_rate', options.learningRate);
      }
      if (options.epochs) {
        formData.append('epochs', options.epochs);
      }

      const response = await axios.post(
        `${this.baseUrl}/voices/${voiceId}/fine-tune`,
        formData,
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      this.emit('voiceFineTuned', { voiceId, samples: additionalSamples.length });
      return response.data;
    } catch (error) {
      this.emit('voiceFineTuneError', error);
      throw new Error(`Voice fine-tuning failed: ${error.message}`);
    }
  }

  /**
   * Create voice variation
   * @param {string} voiceId - Base voice ID
   * @param {Object} variationSettings - Variation parameters
   * @returns {Promise<Object>} Voice variation details
   */
  async createVoiceVariation(voiceId, variationSettings) {
    try {
      const { name, description, stability, similarityBoost, style } = variationSettings;
      
      const response = await axios.post(
        `${this.baseUrl}/voices/${voiceId}/variations`,
        {
          name,
          description,
          voice_settings: {
            stability: stability || 0.5,
            similarity_boost: similarityBoost || 0.5,
            style: style || 0.0
          }
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      this.emit('voiceVariationCreated', { 
        baseVoiceId: voiceId, 
        variationId: response.data.voice_id,
        settings: variationSettings
      });

      return response.data;
    } catch (error) {
      this.emit('voiceVariationError', error);
      throw new Error(`Voice variation creation failed: ${error.message}`);
    }
  }

  /**
   * Analyze voice characteristics
   * @param {string} audioPath - Path to audio sample
   * @returns {Promise<Object>} Voice analysis results
   */
  async analyzeVoice(audioPath) {
    try {
      const audioBuffer = await fs.readFile(audioPath);
      
      const formData = new FormData();
      formData.append('file', new Blob([audioBuffer]), 'audio.wav');

      const response = await axios.post(`${this.baseUrl}/voice-analysis`, formData, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'multipart/form-data'
        }
      });

      this.emit('voiceAnalyzed', { audioPath, analysis: response.data });
      return response.data;
    } catch (error) {
      this.emit('voiceAnalysisError', error);
      throw new Error(`Voice analysis failed: ${error.message}`);
    }
  }

  /**
   * Get voice similarity score
   * @param {string} voiceId1 - First voice ID
   * @param {string} voiceId2 - Second voice ID
   * @returns {Promise<number>} Similarity score (0-1)
   */
  async getVoiceSimilarity(voiceId1, voiceId2) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/voice-similarity`,
        {
          voice_id_1: voiceId1,
          voice_id_2: voiceId2
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const similarity = response.data.similarity_score;
      this.emit('similarityCalculated', { voiceId1, voiceId2, similarity });
      return similarity;
    } catch (error) {
      this.emit('similarityError', error);
      throw new Error(`Voice similarity calculation failed: ${error.message}`);
    }
  }

  /**
   * Create voice blend
   * @param {Array} voiceIds - Array of voice IDs to blend
   * @param {Object} blendSettings - Blend configuration
   * @returns {Promise<Object>} Blended voice details
   */
  async createVoiceBlend(voiceIds, blendSettings) {
    try {
      const { name, description, weights } = blendSettings;
      
      const response = await axios.post(
        `${this.baseUrl}/voice-blend`,
        {
          name,
          description,
          voice_ids: voiceIds,
          weights: weights || voiceIds.map(() => 1 / voiceIds.length)
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      this.emit('voiceBlendCreated', { 
        voiceIds, 
        blendId: response.data.voice_id,
        weights
      });

      return response.data;
    } catch (error) {
      this.emit('voiceBlendError', error);
      throw new Error(`Voice blend creation failed: ${error.message}`);
    }
  }

  /**
   * Export voice model
   * @param {string} voiceId - Voice ID to export
   * @param {string} format - Export format
   * @returns {Promise<Buffer>} Exported voice model
   */
  async exportVoice(voiceId, format = 'onnx') {
    try {
      const response = await axios.get(
        `${this.baseUrl}/voices/${voiceId}/export`,
        {
          params: { format },
          headers: {
            'xi-api-key': this.apiKey
          },
          responseType: 'arraybuffer'
        }
      );

      this.emit('voiceExported', { voiceId, format, size: response.data.length });
      return Buffer.from(response.data);
    } catch (error) {
      this.emit('voiceExportError', error);
      throw new Error(`Voice export failed: ${error.message}`);
    }
  }

  /**
   * Import voice model
   * @param {Buffer} modelBuffer - Voice model buffer
   * @param {Object} voiceInfo - Voice information
   * @returns {Promise<Object>} Imported voice details
   */
  async importVoice(modelBuffer, voiceInfo) {
    try {
      const formData = new FormData();
      formData.append('model', new Blob([modelBuffer]), 'voice_model.onnx');
      formData.append('name', voiceInfo.name);
      formData.append('description', voiceInfo.description);

      const response = await axios.post(`${this.baseUrl}/voices/import`, formData, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'multipart/form-data'
        }
      });

      this.emit('voiceImported', { 
        name: voiceInfo.name, 
        voiceId: response.data.voice_id 
      });

      return response.data;
    } catch (error) {
      this.emit('voiceImportError', error);
      throw new Error(`Voice import failed: ${error.message}`);
    }
  }
}

module.exports = VoiceCloning;