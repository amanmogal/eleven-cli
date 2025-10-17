const inquirer = require('inquirer').default;
const chalk = require('chalk').default;
const ora = require('ora');
const fs = require('fs');
const path = require('path');

// Import utilities
const Logger = require('../lib/logger');
const FileManager = require('../lib/file-manager');
const ConfigManager = require('../lib/config-manager');
const ErrorHandler = require('../lib/error-handler');

const logger = new Logger();
const fileManager = new FileManager();
const configManager = new ConfigManager();

// Voice settings configuration
const VOICE_SETTINGS = {
  stability: {
    min: 0.0,
    max: 1.0,
    default: 0.75,
    description: 'Controls consistency and stability of the voice',
    impact: 'Higher values = more consistent, lower values = more variable'
  },
  similarity_boost: {
    min: 0.0,
    max: 1.0,
    default: 0.75,
    description: 'Controls how closely the voice matches the original',
    impact: 'Higher values = closer to original voice, lower values = more creative'
  },
  style: {
    min: 0.0,
    max: 1.0,
    default: 0.0,
    description: 'Controls style exaggeration and expressiveness',
    impact: 'Higher values = more expressive, lower values = more neutral'
  },
  use_speaker_boost: {
    type: 'boolean',
    default: true,
    description: 'Enhances the similarity to the original speaker',
    impact: 'Improves voice quality and similarity to original'
  }
};

// Voice setting presets
const VOICE_PRESETS = {
  balanced: {
    name: 'Balanced',
    description: 'Good for most use cases',
    settings: {
      stability: 0.75,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true
    }
  },
  expressive: {
    name: 'Expressive',
    description: 'More emotional and varied',
    settings: {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.5,
      use_speaker_boost: true
    }
  },
  stable: {
    name: 'Stable',
    description: 'Consistent and predictable',
    settings: {
      stability: 0.9,
      similarity_boost: 0.6,
      style: 0.0,
      use_speaker_boost: true
    }
  },
  creative: {
    name: 'Creative',
    description: 'Experimental and unique',
    settings: {
      stability: 0.3,
      similarity_boost: 0.9,
      style: 0.8,
      use_speaker_boost: true
    }
  },
  professional: {
    name: 'Professional',
    description: 'Clear and business-appropriate',
    settings: {
      stability: 0.8,
      similarity_boost: 0.7,
      style: 0.1,
      use_speaker_boost: true
    }
  },
  conversational: {
    name: 'Conversational',
    description: 'Natural and friendly',
    settings: {
      stability: 0.6,
      similarity_boost: 0.8,
      style: 0.3,
      use_speaker_boost: true
    }
  }
};

/**
 * Interactive voice tuning mode
 * @returns {Promise<Object>} Voice settings
 */
async function interactiveTuning() {
  console.log(chalk.cyan('🎙️ Interactive Voice Settings Tuning'));
  console.log(chalk.gray('Adjust these parameters to optimize voice quality\n'));

  // First, ask for preset or custom
  const presetChoice = await inquirer.prompt([{
    type: 'list',
    name: 'mode',
    message: 'Choose tuning mode:',
    choices: [
      { name: 'Use Preset - Quick setup with predefined settings', value: 'preset' },
      { name: 'Custom Tuning - Fine-tune individual parameters', value: 'custom' }
    ]
  }]);

  if (presetChoice.mode === 'preset') {
    return await selectPreset();
  } else {
    return await customTuning();
  }
}

/**
 * Select voice preset
 * @returns {Promise<Object>} Voice settings
 */
async function selectPreset() {
  const presetQuestions = [
    {
      type: 'list',
      name: 'preset',
      message: 'Choose a voice preset:',
      choices: Object.keys(VOICE_PRESETS).map(key => ({
        name: `${VOICE_PRESETS[key].name} - ${VOICE_PRESETS[key].description}`,
        value: key
      }))
    },
    {
      type: 'confirm',
      name: 'customize',
      message: 'Would you like to customize this preset?',
      default: false
    }
  ];

  const answers = await inquirer.prompt(presetQuestions);
  let settings = { ...VOICE_PRESETS[answers.preset].settings };

  if (answers.customize) {
    settings = await customTuning(settings);
  }

  return settings;
}

/**
 * Custom voice parameter tuning
 * @param {Object} initialSettings - Initial settings to start with
 * @returns {Promise<Object>} Voice settings
 */
async function customTuning(initialSettings = {}) {
  const questions = Object.keys(VOICE_SETTINGS).map(key => {
    const setting = VOICE_SETTINGS[key];
    const currentValue = initialSettings[key] !== undefined ? initialSettings[key] : setting.default;
    
    if (setting.type === 'boolean') {
      return {
        type: 'confirm',
        name: key,
        message: `${key}: ${setting.description}`,
        default: currentValue
      };
    } else {
      return {
        type: 'number',
        name: key,
        message: `${key} (${setting.min}-${setting.max}): ${setting.description}`,
        default: currentValue,
        validate: (value) => {
          if (value < setting.min || value > setting.max) {
            return `Value must be between ${setting.min} and ${setting.max}`;
          }
          return true;
        }
      };
    }
  });

  const answers = await inquirer.prompt(questions);
  return answers;
}

/**
 * Generate voice settings recommendations
 * @param {Object} settings - Current voice settings
 * @returns {Array} Array of recommendations
 */
function generateRecommendations(settings) {
  const recommendations = [];

  // Stability recommendations
  if (settings.stability < 0.3) {
    recommendations.push({
      setting: 'stability',
      current: settings.stability,
      recommended: 0.5,
      reason: 'Very low stability may cause inconsistent voice quality',
      priority: 'high'
    });
  } else if (settings.stability > 0.9) {
    recommendations.push({
      setting: 'stability',
      current: settings.stability,
      recommended: 0.8,
      reason: 'Very high stability may make voice sound robotic',
      priority: 'medium'
    });
  }

  // Similarity boost recommendations
  if (settings.similarity_boost < 0.3) {
    recommendations.push({
      setting: 'similarity_boost',
      current: settings.similarity_boost,
      recommended: 0.6,
      reason: 'Low similarity boost may not match the original voice well',
      priority: 'high'
    });
  } else if (settings.similarity_boost > 0.95) {
    recommendations.push({
      setting: 'similarity_boost',
      current: settings.similarity_boost,
      recommended: 0.9,
      reason: 'Very high similarity boost may cause artifacts',
      priority: 'medium'
    });
  }

  // Style recommendations
  if (settings.style > 0.9) {
    recommendations.push({
      setting: 'style',
      current: settings.style,
      recommended: 0.7,
      reason: 'Very high style may make voice sound unnatural',
      priority: 'medium'
    });
  }

  // Speaker boost recommendations
  if (settings.use_speaker_boost === false) {
    recommendations.push({
      setting: 'use_speaker_boost',
      current: false,
      recommended: true,
      reason: 'Speaker boost generally improves voice quality',
      priority: 'low'
    });
  }

  return recommendations;
}

/**
 * Display current voice settings
 * @param {Object} settings - Voice settings to display
 */
function displaySettings(settings) {
  console.log(chalk.cyan('\n🎙️ Current Voice Settings:'));
  console.log(chalk.gray('─'.repeat(60)));
  
  Object.keys(settings).forEach(key => {
    const value = settings[key];
    const setting = VOICE_SETTINGS[key];
    
    if (typeof value === 'boolean') {
      console.log(chalk.white(`${key.padEnd(20)}: ${value ? '✅' : '❌'}`));
    } else {
      console.log(chalk.white(`${key.padEnd(20)}: ${value.toFixed(2)}`));
    }
    console.log(chalk.gray(`  ${setting.description}`));
    console.log(chalk.gray(`  Impact: ${setting.impact}`));
    console.log('');
  });
}

/**
 * Display recommendations
 * @param {Array} recommendations - Array of recommendations
 */
function displayRecommendations(recommendations) {
  if (recommendations.length === 0) {
    console.log(chalk.green('✅ All settings look good!'));
    return;
  }

  console.log(chalk.yellow('\n💡 Recommendations:'));
  console.log(chalk.gray('─'.repeat(60)));
  
  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  recommendations.forEach(rec => {
    const priorityColor = rec.priority === 'high' ? chalk.red : 
                         rec.priority === 'medium' ? chalk.yellow : chalk.gray;
    
    console.log(priorityColor(`• ${rec.setting}:`));
    console.log(chalk.gray(`  Current: ${rec.current}`));
    console.log(chalk.green(`  Recommended: ${rec.recommended}`));
    console.log(chalk.gray(`  Reason: ${rec.reason}`));
    console.log('');
  });
}

/**
 * Generate configuration file
 * @param {Object} settings - Voice settings
 * @param {string} outputFile - Output file path
 * @returns {Promise<void>}
 */
async function generateConfigFile(settings, outputFile) {
  const config = {
    voice_settings: settings,
    generated_at: new Date().toISOString(),
    generated_by: 'eleven-cursor',
    version: '0.1.0',
    notes: 'Generated by eleven-cursor tune command'
  };

  const configContent = `// Voice settings configuration
// Generated by eleven-cursor tune command
// Generated: ${config.generated_at}

module.exports = ${JSON.stringify(config, null, 2)};

// Usage in your code:
// const voiceSettings = require('./voice-config.js');
// const response = await client.generate({
//   voice: 'your-voice-id',
//   text: 'your text',
//   voice_settings: voiceSettings.voice_settings
// });

// Or use individual settings:
// const { voice_settings } = require('./voice-config.js');
// const response = await client.generate({
//   voice: 'your-voice-id',
//   text: 'your text',
//   ...voice_settings
// });
`;

  await fileManager.writeFile(outputFile, configContent);
  logger.success(`Configuration saved to: ${outputFile}`);
}

/**
 * Test voice settings with sample text
 * @param {Object} settings - Voice settings to test
 * @param {string} voiceId - Voice ID to test with
 * @returns {Promise<void>}
 */
async function testVoiceSettings(settings, voiceId) {
  const spinner = ora('Testing voice settings...').start();
  
  try {
    const config = configManager.loadConfig();
    const axios = require('axios');
    
    const testText = "This is a test of the voice settings. How does it sound?";
    const outputFile = path.join(fileManager.getOutputDir(), `tune-test-${Date.now()}.mp3`);
    
    // Ensure output directory exists
    await fileManager.ensureOutputDir();
    
    const response = await axios.post(
      `${config.elevenApiBaseUrl}/text-to-speech/${voiceId}`,
      {
        text: testText,
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
        spinner.succeed('Voice test completed!');
        logger.success(`Test audio saved as: ${outputFile}`);
        logger.info(`Text: "${testText}"`);
        resolve();
      });

      writer.on('error', (error) => {
        spinner.fail('Failed to save test audio');
        reject(error);
      });
    });

  } catch (error) {
    spinner.fail('Voice test failed');
    throw error;
  }
}

/**
 * Main tune command function
 * @param {Object} options - Command options
 * @returns {Promise<void>}
 */
async function tuneCommand(options = {}) {
  try {
    logger.info('🎙️ Voice settings tuning...');

    let settings = {};

    if (options.interactive) {
      settings = await interactiveTuning();
    } else if (options.stability !== undefined || options.similarity !== undefined || options.style !== undefined) {
      // Command line tuning
      settings = {
        stability: options.stability !== undefined ? parseFloat(options.stability) : VOICE_SETTINGS.stability.default,
        similarity_boost: options.similarity !== undefined ? parseFloat(options.similarity) : VOICE_SETTINGS.similarity_boost.default,
        style: options.style !== undefined ? parseFloat(options.style) : VOICE_SETTINGS.style.default,
        use_speaker_boost: true
      };
    } else {
      // Display default settings and recommendations
      settings = {
        stability: VOICE_SETTINGS.stability.default,
        similarity_boost: VOICE_SETTINGS.similarity_boost.default,
        style: VOICE_SETTINGS.style.default,
        use_speaker_boost: VOICE_SETTINGS.use_speaker_boost.default
      };
    }

    // Display current settings
    displaySettings(settings);
    
    // Generate and display recommendations
    const recommendations = generateRecommendations(settings);
    displayRecommendations(recommendations);

    // Test voice settings if requested
    if (options.test) {
      const config = configManager.loadConfig();
      const voiceId = options.voice || config.defaultVoiceId;
      await testVoiceSettings(settings, voiceId);
    }

    // Save configuration if output file specified
    if (options.output) {
      await generateConfigFile(settings, options.output);
    } else if (options.interactive) {
      const { saveConfig } = await inquirer.prompt([{
        type: 'confirm',
        name: 'saveConfig',
        message: 'Save these settings to a config file?',
        default: true
      }]);

      if (saveConfig) {
        const outputFile = options.output || 'voice-config.js';
        await generateConfigFile(settings, outputFile);
      }
    }

    if (!options.interactive && !options.stability && !options.similarity && !options.style) {
      console.log(chalk.cyan('\n💡 Use --interactive flag for interactive tuning'));
      console.log(chalk.gray('Or specify individual parameters: --stability 0.8 --similarity 0.7 --style 0.2'));
    }

  } catch (error) {
    ErrorHandler.handle(error, 'tune command');
  }
}

module.exports = tuneCommand;