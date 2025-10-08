const axios = require('axios');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk').default;
const ora = require('ora').default;
const inquirer = require('inquirer');

// Import utilities
const Logger = require('../lib/logger');
const FileManager = require('../lib/file-manager');
const ConfigManager = require('../lib/config-manager');
const ErrorHandler = require('../lib/error-handler');

const logger = new Logger();
const fileManager = new FileManager();
const configManager = new ConfigManager();

// Supported audio formats for voice cloning
const SUPPORTED_FORMATS = [
  { ext: '.mp3', mime: 'audio/mpeg', description: 'MP3 Audio' },
  { ext: '.wav', mime: 'audio/wav', description: 'WAV Audio' },
  { ext: '.m4a', mime: 'audio/mp4', description: 'M4A Audio' },
  { ext: '.aac', mime: 'audio/aac', description: 'AAC Audio' },
  { ext: '.ogg', mime: 'audio/ogg', description: 'OGG Audio' }
];

// Voice cloning quality presets
const QUALITY_PRESETS = {
  standard: {
    name: 'Standard',
    description: 'Good quality, faster processing',
    settings: {
      stability: 0.75,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true
    }
  },
  high: {
    name: 'High Quality',
    description: 'Best quality, slower processing',
    settings: {
      stability: 0.85,
      similarity_boost: 0.85,
      style: 0.1,
      use_speaker_boost: true
    }
  },
  creative: {
    name: 'Creative',
    description: 'More expressive and varied',
    settings: {
      stability: 0.6,
      similarity_boost: 0.8,
      style: 0.4,
      use_speaker_boost: true
    }
  }
};

/**
 * Upload audio file for voice cloning
 * @param {string} filePath - Path to audio file
 * @param {string} voiceName - Name for the cloned voice
 * @param {string} description - Description of the voice
 * @returns {Promise<Object>} Upload result
 */
async function uploadVoiceSample(filePath, voiceName, description) {
  const spinner = ora('Uploading voice sample...').start();
  
  try {
    const config = configManager.loadConfig();
    
    // Read audio file
    const audioBuffer = await fileManager.readFile(filePath);
    const fileExt = path.extname(filePath).toLowerCase();
    const format = SUPPORTED_FORMATS.find(f => f.ext === fileExt);
    
    if (!format) {
      throw new Error(`Unsupported audio format: ${fileExt}`);
    }

    // Create form data
    const FormData = require('form-data');
    const form = new FormData();
    
    form.append('name', voiceName);
    form.append('description', description);
    form.append('files', audioBuffer, {
      filename: path.basename(filePath),
      contentType: format.mime
    });

    const response = await axios.post(
      `${config.elevenApiBaseUrl}/voices/add`,
      form,
      {
        headers: {
          'xi-api-key': config.elevenApiKey,
          ...form.getHeaders()
        },
        timeout: config.requestTimeout * 2 // Longer timeout for uploads
      }
    );

    spinner.succeed('Voice sample uploaded successfully');
    
    return {
      voiceId: response.data.voice_id,
      name: response.data.name,
      description: response.data.description,
      category: response.data.category,
      settings: response.data.settings
    };

  } catch (error) {
    spinner.fail('Failed to upload voice sample');
    
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      const message = data?.detail || data?.message || error.response.statusText;
      
      logger.error(`API Error (${status}): ${message}`);
      
      if (status === 400) {
        logger.warn('Invalid audio file format or quality');
      } else if (status === 413) {
        logger.warn('Audio file too large. Please use a smaller file.');
      } else if (status === 429) {
        logger.warn('Rate limit exceeded. Please wait before trying again.');
      }
    } else if (error.request) {
      logger.error('Network Error: Unable to connect to ElevenLabs API');
    } else {
      logger.error(`Error: ${error.message}`);
    }
    
    throw error;
  }
}

/**
 * Test cloned voice with sample text
 * @param {string} voiceId - Cloned voice ID
 * @param {string} text - Text to synthesize
 * @param {Object} settings - Voice settings
 * @returns {Promise<string>} Output file path
 */
async function testClonedVoice(voiceId, text, settings) {
  const spinner = ora('Testing cloned voice...').start();
  
  try {
    const config = configManager.loadConfig();
    const outputFile = path.join(fileManager.getOutputDir(), `cloned-voice-test-${Date.now()}.mp3`);
    
    // Ensure output directory exists
    await fileManager.ensureOutputDir();
    
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
        responseType: 'stream',
        timeout: config.requestTimeout
      }
    );

    const writer = fs.createWriteStream(outputFile);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        spinner.succeed('Cloned voice test completed');
        logger.success(`Test audio saved as: ${outputFile}`);
        resolve(outputFile);
      });

      writer.on('error', (error) => {
        spinner.fail('Failed to save test audio');
        reject(error);
      });
    });

  } catch (error) {
    spinner.fail('Cloned voice test failed');
    throw error;
  }
}

/**
 * Interactive voice cloning setup
 * @returns {Promise<Object>} Cloning configuration
 */
async function interactiveCloneSetup() {
  console.log(chalk.cyan('🎭 Interactive Voice Cloning Setup'));
  console.log(chalk.gray('Create a custom voice from your audio sample\n'));

  const questions = [
    {
      type: 'input',
      name: 'audioFile',
      message: 'Path to audio file:',
      validate: (input) => {
        if (!input || !input.trim()) {
          return 'Audio file path is required';
        }
        
        const filePath = path.resolve(input.trim());
        if (!fs.existsSync(filePath)) {
          return 'Audio file does not exist';
        }
        
        const ext = path.extname(filePath).toLowerCase();
        const supportedExts = SUPPORTED_FORMATS.map(f => f.ext);
        if (!supportedExts.includes(ext)) {
          return `Unsupported format. Supported: ${supportedExts.join(', ')}`;
        }
        
        return true;
      },
      filter: (input) => input.trim()
    },
    {
      type: 'input',
      name: 'voiceName',
      message: 'Voice name:',
      validate: (input) => {
        if (!input || !input.trim()) {
          return 'Voice name is required';
        }
        if (input.length > 50) {
          return 'Voice name must be less than 50 characters';
        }
        return true;
      },
      filter: (input) => input.trim()
    },
    {
      type: 'input',
      name: 'description',
      message: 'Voice description:',
      default: 'Custom cloned voice',
      validate: (input) => {
        if (!input || !input.trim()) {
          return 'Description is required';
        }
        if (input.length > 200) {
          return 'Description must be less than 200 characters';
        }
        return true;
      },
      filter: (input) => input.trim()
    },
    {
      type: 'list',
      name: 'quality',
      message: 'Voice quality preset:',
      choices: Object.keys(QUALITY_PRESETS).map(key => ({
        name: `${QUALITY_PRESETS[key].name} - ${QUALITY_PRESETS[key].description}`,
        value: key
      })),
      default: 'standard'
    },
    {
      type: 'confirm',
      name: 'testVoice',
      message: 'Test the cloned voice after creation?',
      default: true
    }
  ];

  const answers = await inquirer.prompt(questions);
  
  return {
    audioFile: path.resolve(answers.audioFile),
    voiceName: answers.voiceName,
    description: answers.description,
    quality: answers.quality,
    testVoice: answers.testVoice
  };
}

/**
 * Validate audio file for voice cloning
 * @param {string} filePath - Path to audio file
 * @returns {Promise<Object>} Validation result
 */
async function validateAudioFile(filePath) {
  const stats = await fileManager.stat(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const format = SUPPORTED_FORMATS.find(f => f.ext === ext);
  
  const validation = {
    isValid: true,
    issues: [],
    warnings: [],
    fileSize: stats.size,
    duration: null,
    format: format
  };

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (stats.size > maxSize) {
    validation.isValid = false;
    validation.issues.push(`File too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB (max 10MB)`);
  }

  // Check minimum file size (at least 1MB)
  const minSize = 1024 * 1024; // 1MB
  if (stats.size < minSize) {
    validation.warnings.push(`File quite small: ${(stats.size / 1024).toFixed(2)}KB (recommended: 1MB+)`);
  }

  // Check format
  if (!format) {
    validation.isValid = false;
    validation.issues.push(`Unsupported format: ${ext}`);
  }

  // Estimate duration (rough calculation)
  if (format) {
    // Rough estimation: 1MB ≈ 1 minute for MP3
    const estimatedDuration = (stats.size / 1024 / 1024) * 60; // seconds
    validation.duration = estimatedDuration;
    
    if (estimatedDuration < 30) {
      validation.warnings.push('Audio duration may be too short (recommended: 30+ seconds)');
    } else if (estimatedDuration > 300) {
      validation.warnings.push('Audio duration may be too long (recommended: 5 minutes or less)');
    }
  }

  return validation;
}

/**
 * Display voice cloning results
 * @param {Object} result - Cloning result
 * @param {string} testFile - Test audio file path
 */
function displayCloneResults(result, testFile = null) {
  console.log(chalk.cyan('\n🎭 Voice Cloning Results:'));
  console.log(chalk.gray('─'.repeat(50)));
  
  console.log(chalk.white(`Voice ID: ${result.voiceId}`));
  console.log(chalk.white(`Name: ${result.name}`));
  console.log(chalk.white(`Description: ${result.description}`));
  console.log(chalk.white(`Category: ${result.category || 'Custom'}`));
  
  if (result.settings) {
    console.log(chalk.gray('\nVoice Settings:'));
    Object.keys(result.settings).forEach(key => {
      const value = result.settings[key];
      if (typeof value === 'boolean') {
        console.log(chalk.gray(`  ${key}: ${value ? '✅' : '❌'}`));
      } else {
        console.log(chalk.gray(`  ${key}: ${value}`));
      }
    });
  }
  
  if (testFile) {
    console.log(chalk.green(`\n✅ Test audio: ${testFile}`));
  }
  
  console.log(chalk.cyan('\n💡 Usage in your code:'));
  console.log(chalk.gray(`const voiceId = '${result.voiceId}';`));
  console.log(chalk.gray('const response = await client.generate({'));
  console.log(chalk.gray('  voice: voiceId,'));
  console.log(chalk.gray('  text: "Your text here"'));
  console.log(chalk.gray('});'));
}

/**
 * List cloned voices
 * @returns {Promise<void>}
 */
async function listClonedVoices() {
  const spinner = ora('Fetching cloned voices...').start();
  
  try {
    const config = configManager.loadConfig();
    
    const response = await axios.get(`${config.elevenApiBaseUrl}/voices`, {
      headers: {
        'xi-api-key': config.elevenApiKey
      },
      timeout: config.requestTimeout
    });

    spinner.succeed('Cloned voices:');
    
    if (response.data.voices && response.data.voices.length > 0) {
      console.log(chalk.cyan('\n🎭 Your Cloned Voices:'));
      console.log(chalk.gray('─'.repeat(80)));
      
      response.data.voices.forEach((voice, index) => {
        const isCloned = voice.category === 'cloned' || voice.labels?.cloned;
        if (isCloned) {
          console.log(chalk.white(`${index + 1}. ${voice.name}`));
          console.log(chalk.gray(`   ID: ${voice.voice_id}`));
          console.log(chalk.gray(`   Description: ${voice.description || 'No description'}`));
          console.log(chalk.gray(`   Category: ${voice.category || 'Custom'}`));
          console.log('');
        }
      });
    } else {
      console.log(chalk.yellow('No cloned voices found'));
    }

  } catch (error) {
    spinner.fail('Failed to fetch cloned voices');
    
    if (error.response) {
      logger.error(`API Error (${error.response.status}): ${error.response.data?.detail || error.response.statusText}`);
    } else {
      logger.error(`Error: ${error.message}`);
    }
  }
}

/**
 * Main clone command function
 * @param {Object} options - Command options
 * @returns {Promise<void>}
 */
async function cloneCommand(options = {}) {
  try {
    logger.info('🎭 Voice cloning...');

    if (options.list) {
      await listClonedVoices();
      return;
    }

    // Validate configuration for operations that require API access
    if (!configManager.isValid()) {
      throw ErrorHandler.createError(
        'Invalid configuration. Please check your settings.',
        'INVALID_CONFIG'
      );
    }

    let config;
    if (options.interactive) {
      config = await interactiveCloneSetup();
    } else {
      // Command line mode
      if (!options.file || !options.name) {
        throw ErrorHandler.createError(
          'Audio file and voice name are required. Use --interactive for guided setup.',
          'MISSING_REQUIRED_ARGS'
        );
      }
      
      config = {
        audioFile: path.resolve(options.file),
        voiceName: options.name,
        description: options.description || 'Custom cloned voice',
        quality: options.quality || 'standard',
        testVoice: options.test || false
      };
    }

    // Validate audio file
    const validation = await validateAudioFile(config.audioFile);
    
    if (!validation.isValid) {
      console.log(chalk.red('\n❌ Audio file validation failed:'));
      validation.issues.forEach(issue => console.log(chalk.red(`  • ${issue}`)));
      return;
    }

    if (validation.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️ Audio file warnings:'));
      validation.warnings.forEach(warning => console.log(chalk.yellow(`  • ${warning}`)));
      
      const { continueAnyway } = await inquirer.prompt([{
        type: 'confirm',
        name: 'continueAnyway',
        message: 'Continue with cloning anyway?',
        default: true
      }]);
      
      if (!continueAnyway) {
        logger.info('Voice cloning cancelled');
        return;
      }
    }

    // Upload voice sample
    const result = await uploadVoiceSample(
      config.audioFile,
      config.voiceName,
      config.description
    );

    // Test voice if requested
    let testFile = null;
    if (config.testVoice) {
      const testText = "Hello! This is a test of my cloned voice. How does it sound?";
      const settings = QUALITY_PRESETS[config.quality].settings;
      
      try {
        testFile = await testClonedVoice(result.voiceId, testText, settings);
      } catch (error) {
        logger.warn('Voice test failed, but cloning was successful');
      }
    }

    // Display results
    displayCloneResults(result, testFile);

  } catch (error) {
    ErrorHandler.handle(error, 'clone command');
  }
}

module.exports = cloneCommand;