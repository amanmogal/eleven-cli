const axios = require('axios');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk').default;
const ora = require('ora');
const inquirer = require('inquirer');

// Import utilities
const Logger = require('../lib/logger');
const FileManager = require('../lib/file-manager');
const ConfigManager = require('../lib/config-manager');
const ErrorHandler = require('../lib/error-handler');

const logger = new Logger();
const fileManager = new FileManager();
const configManager = new ConfigManager();

// Sample texts for testing
const SAMPLE_TEXTS = [
  "Hello! This is a voice generated using ElevenLabs and the eleven-cursor CLI.",
  "Welcome to the future of voice AI development. This is just the beginning.",
  "The quick brown fox jumps over the lazy dog. This is a test of voice synthesis.",
  "Artificial intelligence is transforming how we interact with technology through voice.",
  "ElevenLabs provides state-of-the-art text-to-speech technology for developers.",
  "This is a demonstration of natural-sounding voice synthesis with advanced AI.",
  "Voice technology is revolutionizing user interfaces and accessibility.",
  "Thank you for using eleven-cursor CLI for your voice agent development."
];

// Voice settings presets
const VOICE_PRESETS = {
  balanced: {
    stability: 0.75,
    similarity_boost: 0.75,
    style: 0.0,
    use_speaker_boost: true
  },
  expressive: {
    stability: 0.5,
    similarity_boost: 0.8,
    style: 0.5,
    use_speaker_boost: true
  },
  stable: {
    stability: 0.9,
    similarity_boost: 0.6,
    style: 0.0,
    use_speaker_boost: true
  },
  creative: {
    stability: 0.3,
    similarity_boost: 0.9,
    style: 0.8,
    use_speaker_boost: true
  }
};

/**
 * Test voice synthesis with ElevenLabs API
 * @param {Object} options - Command options
 * @returns {Promise<void>}
 */
async function testVoiceSynthesis(options = {}) {
  const config = configManager.loadConfig();
  
  const text = options.text || SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)];
  const voiceId = options.voice || config.defaultVoiceId;
  const outputFile = options.output || path.join(fileManager.getOutputDir(), `test-${Date.now()}.mp3`);

  // Parse voice settings
  let voiceSettings = VOICE_PRESETS.balanced;
  if (options.settings) {
    try {
      voiceSettings = JSON.parse(options.settings);
    } catch (error) {
      logger.warn('Invalid voice settings JSON, using default preset');
    }
  }

  const spinner = ora('Generating voice...').start();

  try {
    // Ensure output directory exists
    await fileManager.ensureOutputDir();

    const response = await axios.post(
      `${config.elevenApiBaseUrl}/text-to-speech/${voiceId}`,
      {
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: voiceSettings
      },
      {
        headers: {
          'xi-api-key': config.elevenApiKey,
          'Content-Type': 'application/json'
        },
        responseType: 'stream',
        timeout: config.requestTimeout
      }
    );

    const writer = fs.createWriteStream(outputFile);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        spinner.succeed(`Voice generated successfully!`);
        logger.success(`Audio saved as: ${outputFile}`);
        logger.info(`Text: "${text}"`);
        logger.info(`Voice ID: ${voiceId}`);
        logger.info(`Settings: ${JSON.stringify(voiceSettings, null, 2)}`);
        resolve(outputFile);
      });

      writer.on('error', (error) => {
        spinner.fail('Failed to save audio file');
        reject(error);
      });
    });

  } catch (error) {
    spinner.fail('Failed to generate voice');
    
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      const message = data?.detail || data?.message || error.response.statusText;
      
      logger.error(`API Error (${status}): ${message}`);
      
      if (status === 401) {
        logger.warn('Please check your ElevenLabs API key in the .env file');
      } else if (status === 429) {
        logger.warn('Rate limit exceeded. Please wait before making more requests.');
      } else if (status === 400) {
        logger.warn('Bad request. Please check your voice ID and settings.');
      }
    } else if (error.request) {
      logger.error('Network Error: Unable to connect to ElevenLabs API');
      logger.warn('Please check your internet connection and try again');
    } else {
      logger.error(`Error: ${error.message}`);
    }
    
    throw error;
  }
}

/**
 * List available voices from ElevenLabs API
 * @returns {Promise<void>}
 */
async function listAvailableVoices() {
  const config = configManager.loadConfig();
  const spinner = ora('Fetching available voices...').start();

  try {
    const response = await axios.get(`${config.elevenApiBaseUrl}/voices`, {
      headers: {
        'xi-api-key': config.elevenApiKey
      },
      timeout: config.requestTimeout
    });

    spinner.succeed('Available voices:');
    
    if (response.data.voices && response.data.voices.length > 0) {
      console.log(chalk.cyan('\n🎤 ElevenLabs Voices:'));
      console.log(chalk.gray('─'.repeat(80)));
      
      response.data.voices.forEach((voice, index) => {
        console.log(chalk.white(`${index + 1}. ${voice.name}`));
        console.log(chalk.gray(`   ID: ${voice.voice_id}`));
        console.log(chalk.gray(`   Category: ${voice.category || 'Unknown'}`));
        console.log(chalk.gray(`   Description: ${voice.description || 'No description'}`));
        console.log(chalk.gray(`   Labels: ${voice.labels ? Object.entries(voice.labels).map(([k, v]) => `${k}: ${v}`).join(', ') : 'None'}`));
        console.log('');
      });
    } else {
      console.log(chalk.yellow('No voices found'));
    }

  } catch (error) {
    spinner.fail('Failed to fetch voices');
    
    if (error.response) {
      logger.error(`API Error (${error.response.status}): ${error.response.data?.detail || error.response.statusText}`);
    } else {
      logger.error(`Error: ${error.message}`);
    }
  }
}

/**
 * Interactive voice testing mode
 * @returns {Promise<void>}
 */
async function interactiveTestMode() {
  console.log(chalk.cyan('🎧 Interactive Voice Testing Mode'));
  console.log(chalk.gray('Test different voices and settings interactively\n'));

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
    logger.error('Failed to fetch voices for interactive mode');
    return;
  }

  if (voices.length === 0) {
    logger.warn('No voices available for interactive testing');
    return;
  }

  const questions = [
    {
      type: 'input',
      name: 'text',
      message: 'Enter text to synthesize:',
      default: SAMPLE_TEXTS[0],
      validate: (input) => {
        if (!input || !input.trim()) {
          return 'Text is required';
        }
        if (input.length > 1000) {
          return 'Text must be less than 1000 characters';
        }
        return true;
      }
    },
    {
      type: 'list',
      name: 'voice',
      message: 'Choose a voice:',
      choices: voices.map(voice => ({
        name: `${voice.name} - ${voice.description || 'No description'}`,
        value: voice.voice_id
      })),
      pageSize: 10
    },
    {
      type: 'list',
      name: 'preset',
      message: 'Choose voice preset:',
      choices: [
        { name: 'Balanced - Good for most use cases', value: 'balanced' },
        { name: 'Expressive - More emotional and varied', value: 'expressive' },
        { name: 'Stable - Consistent and predictable', value: 'stable' },
        { name: 'Creative - Experimental and unique', value: 'creative' }
      ],
      default: 'balanced'
    },
    {
      type: 'input',
      name: 'output',
      message: 'Output file name (optional):',
      default: `test-${Date.now()}.mp3`
    }
  ];

  const answers = await inquirer.prompt(questions);
  
  // Apply voice settings
  const voiceSettings = VOICE_PRESETS[answers.preset];
  
  // Test the voice
  try {
    await testVoiceSynthesis({
      text: answers.text,
      voice: answers.voice,
      output: path.join(fileManager.getOutputDir(), answers.output),
      settings: JSON.stringify(voiceSettings)
    });
  } catch (error) {
    ErrorHandler.handle(error, 'interactive test');
  }
}

/**
 * Batch test multiple voices
 * @param {Object} options - Command options
 * @returns {Promise<void>}
 */
async function batchTestVoices(options = {}) {
  const config = configManager.loadConfig();
  const spinner = ora('Running batch voice tests...').start();

  try {
    // Get available voices
    const response = await axios.get(`${config.elevenApiBaseUrl}/voices`, {
      headers: { 'xi-api-key': config.elevenApiKey },
      timeout: config.requestTimeout
    });

    const voices = response.data.voices || [];
    if (voices.length === 0) {
      throw new Error('No voices available for batch testing');
    }

    // Test first 5 voices with sample text
    const testVoices = voices.slice(0, 5);
    const testText = "This is a batch test of multiple voices.";
    
    spinner.text = `Testing ${testVoices.length} voices...`;

    for (let i = 0; i < testVoices.length; i++) {
      const voice = testVoices[i];
      const outputFile = path.join(fileManager.getOutputDir(), `batch-test-${voice.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.mp3`);
      
      try {
        await testVoiceSynthesis({
          text: testText,
          voice: voice.voice_id,
          output: outputFile
        });
        
        spinner.text = `Tested ${i + 1}/${testVoices.length} voices`;
      } catch (error) {
        logger.warn(`Failed to test voice ${voice.name}: ${error.message}`);
      }
    }

    spinner.succeed(`Batch test completed! Tested ${testVoices.length} voices`);
    logger.info(`Output files saved in: ${fileManager.getOutputDir()}`);

  } catch (error) {
    spinner.fail('Batch test failed');
    throw error;
  }
}

/**
 * Main test command function
 * @param {Object} options - Command options
 * @returns {Promise<void>}
 */
async function testCommand(options = {}) {
  try {
    logger.info('🎧 Testing voice synthesis...');

    // Validate configuration
    if (!configManager.isValid()) {
      throw ErrorHandler.createError(
        'Invalid configuration. Please check your settings.',
        'INVALID_CONFIG'
      );
    }

    if (options.listVoices) {
      await listAvailableVoices();
      return;
    }

    if (options.interactive) {
      await interactiveTestMode();
      return;
    }

    if (options.batch) {
      await batchTestVoices(options);
      return;
    }

    // Single voice test
    await testVoiceSynthesis(options);

  } catch (error) {
    ErrorHandler.handle(error, 'test command');
  }
}

module.exports = testCommand;