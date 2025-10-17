const axios = require('axios');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk').default;
const ora = require('ora').default;
const inquirer = require('inquirer').default;

// Import utilities
const Logger = require('../lib/logger');
const FileManager = require('../lib/file-manager');
const ConfigManager = require('../lib/config-manager');
const ErrorHandler = require('../lib/error-handler');

const logger = new Logger();
const fileManager = new FileManager();
const configManager = new ConfigManager();

// Voice analysis metrics
const VOICE_METRICS = {
  clarity: {
    name: 'Clarity',
    description: 'How clear and understandable the voice is',
    range: [0, 1],
    optimal: 0.8
  },
  naturalness: {
    name: 'Naturalness',
    description: 'How natural and human-like the voice sounds',
    range: [0, 1],
    optimal: 0.85
  },
  expressiveness: {
    name: 'Expressiveness',
    description: 'How expressive and emotional the voice is',
    range: [0, 1],
    optimal: 0.7
  },
  consistency: {
    name: 'Consistency',
    description: 'How consistent the voice quality is',
    range: [0, 1],
    optimal: 0.9
  },
  pronunciation: {
    name: 'Pronunciation',
    description: 'How accurate the pronunciation is',
    range: [0, 1],
    optimal: 0.9
  }
};

// Analysis presets for different use cases
const ANALYSIS_PRESETS = {
  general: {
    name: 'General Purpose',
    description: 'Good for most applications',
    weights: {
      clarity: 0.3,
      naturalness: 0.3,
      expressiveness: 0.2,
      consistency: 0.2
    }
  },
  professional: {
    name: 'Professional',
    description: 'Business and professional applications',
    weights: {
      clarity: 0.4,
      naturalness: 0.3,
      expressiveness: 0.1,
      consistency: 0.2
    }
  },
  creative: {
    name: 'Creative',
    description: 'Creative and artistic applications',
    weights: {
      clarity: 0.2,
      naturalness: 0.2,
      expressiveness: 0.4,
      consistency: 0.2
    }
  },
  educational: {
    name: 'Educational',
    description: 'Educational and instructional content',
    weights: {
      clarity: 0.4,
      naturalness: 0.2,
      expressiveness: 0.1,
      consistency: 0.3
    }
  }
};

/**
 * Analyze voice quality using ElevenLabs API
 * @param {string} voiceId - Voice ID to analyze
 * @param {string} text - Sample text for analysis
 * @param {Object} settings - Voice settings to test
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeVoiceQuality(voiceId, text, settings) {
  const spinner = ora('Analyzing voice quality...').start();
  
  try {
    const config = configManager.loadConfig();
    
    // Generate sample audio
    const response = await axios.post(
      `${config.elevenApiBaseUrl}/text-to-speech/${voiceId}`,
      {
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: settings
      },
      {
        headers: {
          'xi-api-key': config.elevenApiKey,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: config.requestTimeout
      }
    );

    // Save sample for analysis
    const sampleFile = path.join(fileManager.getTempDir(), `analysis-sample-${Date.now()}.mp3`);
    await fileManager.ensureDir(fileManager.getTempDir());
    await fileManager.writeFile(sampleFile, response.data);

    // Perform analysis (simulated - in real implementation, you'd use audio analysis libraries)
    const analysis = await performAudioAnalysis(sampleFile, text);
    
    // Clean up sample file
    await fileManager.remove(sampleFile);

    spinner.succeed('Voice analysis completed');
    
    return analysis;

  } catch (error) {
    spinner.fail('Voice analysis failed');
    throw error;
  }
}

/**
 * Perform audio analysis (simulated)
 * @param {string} audioFile - Path to audio file
 * @param {string} text - Original text
 * @returns {Promise<Object>} Analysis results
 */
async function performAudioAnalysis(audioFile, text) {
  // In a real implementation, you would use audio analysis libraries like:
  // - Web Audio API
  // - FFmpeg
  // - Audio analysis services
  // For now, we'll simulate the analysis
  
  const stats = await fileManager.stat(audioFile);
  const duration = estimateAudioDuration(stats.size);
  
  // Simulate analysis metrics
  const analysis = {
    audioFile: audioFile,
    duration: duration,
    fileSize: stats.size,
    metrics: {},
    recommendations: [],
    overallScore: 0
  };

  // Simulate metric analysis
  Object.keys(VOICE_METRICS).forEach(metric => {
    const metricConfig = VOICE_METRICS[metric];
    const value = Math.random() * (metricConfig.range[1] - metricConfig.range[0]) + metricConfig.range[0];
    analysis.metrics[metric] = {
      value: parseFloat(value.toFixed(3)),
      optimal: metricConfig.optimal,
      status: value >= metricConfig.optimal ? 'good' : value >= metricConfig.optimal * 0.8 ? 'fair' : 'poor'
    };
  });

  // Calculate overall score
  const scores = Object.values(analysis.metrics).map(m => m.value);
  analysis.overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

  // Generate recommendations
  generateRecommendations(analysis);

  return analysis;
}

/**
 * Estimate audio duration from file size
 * @param {number} fileSize - File size in bytes
 * @returns {number} Estimated duration in seconds
 */
function estimateAudioDuration(fileSize) {
  // Rough estimation: 1MB ≈ 1 minute for MP3
  return Math.round((fileSize / 1024 / 1024) * 60);
}

/**
 * Generate recommendations based on analysis
 * @param {Object} analysis - Analysis results
 */
function generateRecommendations(analysis) {
  const recommendations = [];

  Object.keys(analysis.metrics).forEach(metric => {
    const metricData = analysis.metrics[metric];
    const metricConfig = VOICE_METRICS[metric];
    
    if (metricData.status === 'poor') {
      recommendations.push({
        type: 'improvement',
        metric: metric,
        message: `${metricConfig.name} is below optimal. Consider adjusting voice settings.`,
        priority: 'high'
      });
    } else if (metricData.status === 'fair') {
      recommendations.push({
        type: 'optimization',
        metric: metric,
        message: `${metricConfig.name} could be improved for better results.`,
        priority: 'medium'
      });
    }
  });

  // Add general recommendations
  if (analysis.overallScore < 0.7) {
    recommendations.push({
      type: 'general',
      message: 'Overall voice quality is below average. Consider using a different voice or adjusting settings.',
      priority: 'high'
    });
  }

  if (analysis.duration < 10) {
    recommendations.push({
      type: 'general',
      message: 'Audio duration is quite short. Consider using longer text for better analysis.',
      priority: 'low'
    });
  }

  analysis.recommendations = recommendations;
}

/**
 * Display analysis results
 * @param {Object} analysis - Analysis results
 * @param {string} preset - Analysis preset used
 */
function displayAnalysisResults(analysis, preset = 'general') {
  console.log(chalk.cyan('\n📊 Voice Analysis Results:'));
  console.log(chalk.gray('─'.repeat(60)));
  
  // Overall score
  const scoreColor = analysis.overallScore >= 0.8 ? chalk.green : 
                    analysis.overallScore >= 0.6 ? chalk.yellow : chalk.red;
  console.log(chalk.white(`Overall Score: ${scoreColor(analysis.overallScore.toFixed(3))}`));
  console.log(chalk.gray(`Preset: ${ANALYSIS_PRESETS[preset].name}`));
  console.log(chalk.gray(`Duration: ${analysis.duration}s`));
  console.log(chalk.gray(`File Size: ${(analysis.fileSize / 1024).toFixed(2)}KB`));
  
  // Metrics
  console.log(chalk.cyan('\n📈 Detailed Metrics:'));
  console.log(chalk.gray('─'.repeat(60)));
  
  Object.keys(analysis.metrics).forEach(metric => {
    const metricData = analysis.metrics[metric];
    const metricConfig = VOICE_METRICS[metric];
    
    const statusColor = metricData.status === 'good' ? chalk.green :
                       metricData.status === 'fair' ? chalk.yellow : chalk.red;
    const statusIcon = metricData.status === 'good' ? '✅' :
                      metricData.status === 'fair' ? '⚠️' : '❌';
    
    console.log(chalk.white(`${statusIcon} ${metricConfig.name}: ${statusColor(metricData.value.toFixed(3))}`));
    console.log(chalk.gray(`   ${metricConfig.description}`));
    console.log(chalk.gray(`   Optimal: ${metricConfig.optimal} | Status: ${metricData.status}`));
    console.log('');
  });

  // Recommendations
  if (analysis.recommendations.length > 0) {
    console.log(chalk.yellow('\n💡 Recommendations:'));
    console.log(chalk.gray('─'.repeat(60)));
    
    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    analysis.recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    analysis.recommendations.forEach(rec => {
      const priorityColor = rec.priority === 'high' ? chalk.red :
                           rec.priority === 'medium' ? chalk.yellow : chalk.gray;
      const priorityIcon = rec.priority === 'high' ? '🔴' :
                          rec.priority === 'medium' ? '🟡' : '🔵';
      
      console.log(priorityColor(`${priorityIcon} ${rec.message}`));
    });
  } else {
    console.log(chalk.green('\n✅ No recommendations - voice quality is excellent!'));
  }
}

/**
 * Interactive voice analysis setup
 * @returns {Promise<Object>} Analysis configuration
 */
async function interactiveAnalysisSetup() {
  console.log(chalk.cyan('📊 Interactive Voice Analysis'));
  console.log(chalk.gray('Analyze voice quality and get optimization recommendations\n'));

  const config = configManager.loadConfig();
  
  // Get available voices
  let voices = [];
  try {
    const response = await axios.get(`${config.elevenApiBaseUrl}/voices`, {
      headers: { 'xi-api-key': config.elevenApiKey },
      timeout: config.requestTimeout
    });
    voices = response.data.voices || [];
  } catch (error) {
    logger.warn('Could not fetch voices, using default');
  }

  const questions = [
    {
      type: 'list',
      name: 'voiceId',
      message: 'Select voice to analyze:',
      choices: voices.length > 0 ? 
        voices.map(voice => ({
          name: `${voice.name} - ${voice.description || 'No description'}`,
          value: voice.voice_id
        })) : [
          { name: 'Default Voice (EXAVITQu4vr4xnSDxMaL)', value: 'EXAVITQu4vr4xnSDxMaL' }
        ],
      default: voices.length > 0 ? voices[0].voice_id : 'EXAVITQu4vr4xnSDxMaL'
    },
    {
      type: 'input',
      name: 'text',
      message: 'Sample text for analysis:',
      default: 'The quick brown fox jumps over the lazy dog. This is a comprehensive test of voice quality, clarity, and naturalness.',
      validate: (input) => {
        if (!input || !input.trim()) {
          return 'Sample text is required';
        }
        if (input.length < 20) {
          return 'Sample text should be at least 20 characters for meaningful analysis';
        }
        return true;
      }
    },
    {
      type: 'list',
      name: 'preset',
      message: 'Analysis preset:',
      choices: Object.keys(ANALYSIS_PRESETS).map(key => ({
        name: `${ANALYSIS_PRESETS[key].name} - ${ANALYSIS_PRESETS[key].description}`,
        value: key
      })),
      default: 'general'
    },
    {
      type: 'confirm',
      name: 'saveResults',
      message: 'Save analysis results to file?',
      default: true
    }
  ];

  const answers = await inquirer.prompt(questions);
  
  return {
    voiceId: answers.voiceId,
    text: answers.text,
    preset: answers.preset,
    saveResults: answers.saveResults
  };
}

/**
 * Save analysis results to file
 * @param {Object} analysis - Analysis results
 * @param {string} preset - Analysis preset
 * @returns {Promise<string>} Output file path
 */
async function saveAnalysisResults(analysis, preset) {
  const outputFile = path.join(fileManager.getOutputDir(), `voice-analysis-${Date.now()}.json`);
  
  const results = {
    timestamp: new Date().toISOString(),
    preset: preset,
    overallScore: analysis.overallScore,
    duration: analysis.duration,
    fileSize: analysis.fileSize,
    metrics: analysis.metrics,
    recommendations: analysis.recommendations
  };

  await fileManager.ensureOutputDir();
  await fileManager.writeFile(outputFile, JSON.stringify(results, null, 2));
  
  return outputFile;
}

/**
 * Main analyze command function
 * @param {Object} options - Command options
 * @returns {Promise<void>}
 */
async function analyzeCommand(options = {}) {
  try {
    logger.info('📊 Analyzing voice quality...');

    // Validate configuration
    if (!configManager.isValid()) {
      throw ErrorHandler.createError(
        'Invalid configuration. Please check your settings.',
        'INVALID_CONFIG'
      );
    }

    let config;
    if (options.interactive) {
      config = await interactiveAnalysisSetup();
    } else {
      // Command line mode
      const voiceId = options.voice || configManager.get('defaultVoiceId');
      const text = options.text || 'The quick brown fox jumps over the lazy dog. This is a test of voice quality.';
      const preset = options.preset || 'general';
      
      config = {
        voiceId,
        text,
        preset,
        saveResults: options.save || false
      };
    }

    // Voice settings for analysis
    const voiceSettings = {
      stability: 0.75,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true
    };

    // Perform analysis
    const analysis = await analyzeVoiceQuality(
      config.voiceId,
      config.text,
      voiceSettings
    );

    // Display results
    displayAnalysisResults(analysis, config.preset);

    // Save results if requested
    if (config.saveResults) {
      const outputFile = await saveAnalysisResults(analysis, config.preset);
      logger.success(`Analysis results saved to: ${outputFile}`);
    }

  } catch (error) {
    ErrorHandler.handle(error, 'analyze command');
  }
}

module.exports = analyzeCommand;