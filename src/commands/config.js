const chalk = require('chalk').default;
const inquirer = require('inquirer');

// Import utilities
const Logger = require('../lib/logger');
const ConfigManager = require('../lib/config-manager');
const ErrorHandler = require('../lib/error-handler');

const logger = new Logger();
const configManager = new ConfigManager();

/**
 * Display current configuration
 * @param {Object} options - Command options
 * @returns {Promise<void>}
 */
async function showConfig(options = {}) {
  try {
    const config = configManager.loadConfig();
    const summary = configManager.getSummary();

    console.log(chalk.cyan('🔧 Current Configuration:'));
    console.log(chalk.gray('─'.repeat(50)));

    // Display configuration in a table format
    const configItems = [
      { key: 'Default Voice ID', value: summary.defaultVoiceId },
      { key: 'Cursor Agent Path', value: summary.cursorAgentPath },
      { key: 'Debug Mode', value: summary.debug ? 'Enabled' : 'Disabled' },
      { key: 'Log Level', value: summary.logLevel },
      { key: 'Node Environment', value: summary.nodeEnv },
      { key: 'API Base URL', value: summary.elevenApiBaseUrl },
      { key: 'Request Timeout', value: `${summary.requestTimeout}ms` },
      { key: 'Max Retries', value: summary.maxRetries },
      { key: 'Default Output Dir', value: summary.defaultOutputDir },
      { key: 'Temp Directory', value: summary.tempDir },
      { key: 'API Key', value: summary.hasApiKey ? '✅ Set' : '❌ Not Set' }
    ];

    configItems.forEach(item => {
      console.log(chalk.white(`${item.key.padEnd(20)}: ${chalk.gray(item.value)}`));
    });

    // Show validation status
    console.log(chalk.gray('\n─'.repeat(50)));
    const isValid = configManager.isValid();
    console.log(chalk.white(`Configuration Status: ${isValid ? chalk.green('✅ Valid') : chalk.red('❌ Invalid')}`));

    if (!isValid) {
      console.log(chalk.yellow('\n⚠️ Configuration issues detected:'));
      try {
        configManager.loadConfig(); // This will throw if invalid
      } catch (error) {
        console.log(chalk.red(`  • ${error.message}`));
      }
    }

  } catch (error) {
    ErrorHandler.handle(error, 'show config');
  }
}

/**
 * Set configuration value
 * @param {string} keyValue - Key=value string
 * @returns {Promise<void>}
 */
async function setConfig(keyValue) {
  try {
    const [key, value] = keyValue.split('=', 2);
    
    if (!key || value === undefined) {
      throw new Error('Invalid format. Use: key=value');
    }

    // Validate key
    const validKeys = [
      'defaultVoiceId',
      'cursorAgentPath',
      'debug',
      'logLevel',
      'nodeEnv',
      'elevenApiBaseUrl',
      'requestTimeout',
      'maxRetries',
      'defaultOutputDir',
      'tempDir'
    ];

    if (!validKeys.includes(key)) {
      throw new Error(`Invalid key. Valid keys: ${validKeys.join(', ')}`);
    }

    // Parse value based on key type
    let parsedValue = value;
    if (key === 'debug') {
      parsedValue = value.toLowerCase() === 'true';
    } else if (key === 'requestTimeout' || key === 'maxRetries') {
      parsedValue = parseInt(value, 10);
      if (isNaN(parsedValue)) {
        throw new Error(`${key} must be a number`);
      }
    }

    // Set the value
    configManager.set(key, parsedValue);
    await configManager.saveConfig();

    logger.success(`Configuration updated: ${key} = ${parsedValue}`);

  } catch (error) {
    ErrorHandler.handle(error, 'set config');
  }
}

/**
 * Reset configuration to defaults
 * @returns {Promise<void>}
 */
async function resetConfig() {
  try {
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: 'Are you sure you want to reset configuration to defaults?',
      default: false
    }]);

    if (!confirm) {
      logger.info('Configuration reset cancelled');
      return;
    }

    configManager.reset();
    await configManager.saveConfig();

    logger.success('Configuration reset to defaults');

  } catch (error) {
    ErrorHandler.handle(error, 'reset config');
  }
}

/**
 * Interactive configuration mode
 * @returns {Promise<void>}
 */
async function interactiveConfig() {
  console.log(chalk.cyan('🔧 Interactive Configuration'));
  console.log(chalk.gray('Configure eleven-cursor settings interactively\n'));

  const questions = [
    {
      type: 'input',
      name: 'defaultVoiceId',
      message: 'Default Voice ID:',
      default: configManager.get('defaultVoiceId'),
      validate: (input) => {
        if (!input || !input.trim()) {
          return 'Voice ID is required';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'cursorAgentPath',
      message: 'Cursor Agent Path:',
      default: configManager.get('cursorAgentPath'),
      validate: (input) => {
        if (!input || !input.trim()) {
          return 'Cursor Agent Path is required';
        }
        return true;
      }
    },
    {
      type: 'list',
      name: 'logLevel',
      message: 'Log Level:',
      choices: ['error', 'warn', 'info', 'verbose', 'debug'],
      default: configManager.get('logLevel')
    },
    {
      type: 'confirm',
      name: 'debug',
      message: 'Enable Debug Mode:',
      default: configManager.get('debug')
    },
    {
      type: 'list',
      name: 'nodeEnv',
      message: 'Node Environment:',
      choices: ['development', 'production', 'test'],
      default: configManager.get('nodeEnv')
    },
    {
      type: 'number',
      name: 'requestTimeout',
      message: 'Request Timeout (ms):',
      default: configManager.get('requestTimeout'),
      validate: (value) => {
        if (value < 1000 || value > 300000) {
          return 'Timeout must be between 1000 and 300000 milliseconds';
        }
        return true;
      }
    },
    {
      type: 'number',
      name: 'maxRetries',
      message: 'Max Retries:',
      default: configManager.get('maxRetries'),
      validate: (value) => {
        if (value < 0 || value > 10) {
          return 'Max retries must be between 0 and 10';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'defaultOutputDir',
      message: 'Default Output Directory:',
      default: configManager.get('defaultOutputDir'),
      validate: (input) => {
        if (!input || !input.trim()) {
          return 'Output directory is required';
        }
        return true;
      }
    }
  ];

  const answers = await inquirer.prompt(questions);

  // Save configuration
  Object.keys(answers).forEach(key => {
    configManager.set(key, answers[key]);
  });

  await configManager.saveConfig();

  logger.success('Configuration updated successfully!');
}

/**
 * Validate configuration
 * @returns {Promise<void>}
 */
async function validateConfig() {
  try {
    console.log(chalk.cyan('🔍 Validating Configuration...'));

    const isValid = configManager.isValid();
    
    if (isValid) {
      logger.success('Configuration is valid!');
    } else {
      logger.error('Configuration is invalid!');
      
      try {
        configManager.loadConfig(); // This will throw if invalid
      } catch (error) {
        console.log(chalk.red(`Error: ${error.message}`));
      }
    }

  } catch (error) {
    ErrorHandler.handle(error, 'validate config');
  }
}

/**
 * Main config command function
 * @param {Object} options - Command options
 * @returns {Promise<void>}
 */
async function configCommand(options = {}) {
  try {
    if (options.show) {
      await showConfig(options);
    } else if (options.set) {
      await setConfig(options.set);
    } else if (options.reset) {
      await resetConfig();
    } else if (options.interactive) {
      await interactiveConfig();
    } else if (options.validate) {
      await validateConfig();
    } else {
      // Default: show configuration
      await showConfig(options);
    }

  } catch (error) {
    ErrorHandler.handle(error, 'config command');
  }
}

module.exports = configCommand;