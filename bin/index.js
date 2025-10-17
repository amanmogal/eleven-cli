#!/usr/bin/env node

/**
 * Eleven-CLI Entry Point
 * Main executable for the eleven-cli command-line tool
 */

// Load environment variables first
const path = require('path');
const dotenv = require('dotenv');

// Try to load .env from the project directory
const projectDir = path.join(__dirname, '..');
dotenv.config({ path: path.join(projectDir, '.env') });

const { Command } = require('commander');
const chalk = require('chalk').default;
const boxen = require('boxen').default;

// Import utilities
const Logger = require('../src/lib/logger');
const ErrorHandler = require('../src/lib/error-handler');
const ConfigManager = require('../src/lib/config-manager');

// Setup global error handlers
ErrorHandler.setupGlobalHandlers();

// Initialize logger and config
const logger = new Logger();
const configManager = new ConfigManager();

// Create commander instance
const program = new Command();

// ASCII Art and Welcome Message
const welcomeMessage = boxen(
  chalk.cyan.bold('Eleven-CLI') + '\n' +
  chalk.gray('CLI for building ElevenLabs voice agents with AI assistance') + '\n' +
  chalk.gray('Version: 1.0.4'),
  {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'cyan'
  }
);

// Program configuration
program
  .name('eleven')
  .description('CLI for building ElevenLabs voice agents with AI assistance')
  .version('1.0.4')
  .addHelpText('before', welcomeMessage);

// Global options
program
  .option('-v, --verbose', 'enable verbose output')
  .option('--debug', 'enable debug mode')
  .option('--config <path>', 'specify config file path')
  .option('--silent', 'suppress all output except errors')
  .option('--log-level <level>', 'set log level (error, warn, info, verbose, debug)', 'info');

// Global option handler
program.hook('preAction', (thisCommand, actionCommand) => {
  const options = thisCommand.opts();
  
  // Update logger configuration
  logger.verbose = options.verbose || false;
  logger.debugMode = options.debug || false;
  logger.silent = options.silent || false;
  logger.logLevel = options.logLevel || 'info';

  // Load configuration
  try {
    configManager.loadConfig();
    logger.debug('Configuration loaded successfully');
  } catch (error) {
    ErrorHandler.handle(error, 'configuration loading');
  }
});

// Command registration with lazy loading and error handling
program
  .command('init [projectName]')
  .description('Scaffold a new voice agent project')
  .option('-t, --template <template>', 'project template to use', 'voice-agent')
  .option('-y, --yes', 'skip prompts and use defaults')
  .option('-o, --output <dir>', 'output directory for the project')
  .option('--voice <voice>', 'default voice ID to use')
  .option('--author <author>', 'project author name')
  .action(async (projectName, options) => {
    try {
      const initCommand = require('../src/commands/init');
      await initCommand({ ...options, projectName });
    } catch (error) {
      ErrorHandler.handle(error, 'init command');
    }
  });

program
  .command('test')
  .description('Test TTS with a sample prompt')
  .option('-t, --text <text>', 'text to synthesize')
  .option('-v, --voice <voice>', 'voice ID to use')
  .option('-o, --output <file>', 'output file path')
  .option('--list-voices', 'list available voices')
  .option('--settings <json>', 'voice settings as JSON string')
  .action(async (options) => {
    try {
      const testCommand = require('../src/commands/test');
      await testCommand(options);
    } catch (error) {
      ErrorHandler.handle(error, 'test command');
    }
  });

program
  .command('docs')
  .description('Generate README using Cursor AI')
  .option('-f, --file <file>', 'specific file to document')
  .option('-o, --output <file>', 'output file path')
  .option('-t, --type <type>', 'documentation type (readme, api, contributing, changelog)', 'readme')
  .option('--project', 'generate project documentation')
  .action(async (options) => {
    try {
      const docsCommand = require('../src/commands/docs');
      await docsCommand(options);
    } catch (error) {
      ErrorHandler.handle(error, 'docs command');
    }
  });

program
  .command('tune')
  .description('Suggest voice settings (stability, style)')
  .option('-i, --interactive', 'interactive tuning mode')
  .option('--voice <voice>', 'voice ID to tune')
  .option('--stability <value>', 'stability value (0.0-1.0)')
  .option('--similarity <value>', 'similarity boost value (0.0-1.0)')
  .option('--style <value>', 'style exaggeration value (0.0-1.0)')
  .option('--output <file>', 'save settings to file')
  .action(async (options) => {
    try {
      const tuneCommand = require('../src/commands/tune');
      await tuneCommand(options);
    } catch (error) {
      ErrorHandler.handle(error, 'tune command');
    }
  });

program
  .command('clone')
  .description('Clone a voice from audio sample')
  .option('-f, --file <file>', 'audio file path')
  .option('-n, --name <name>', 'voice name')
  .option('-d, --description <desc>', 'voice description')
  .option('-q, --quality <quality>', 'voice quality preset', 'standard')
  .option('-t, --test', 'test cloned voice after creation')
  .option('-i, --interactive', 'interactive cloning mode')
  .option('--list', 'list cloned voices')
  .action(async (options) => {
    try {
      const cloneCommand = require('../src/commands/clone');
      await cloneCommand(options);
    } catch (error) {
      ErrorHandler.handle(error, 'clone command');
    }
  });

program
  .command('analyze')
  .description('Analyze voice quality and get recommendations')
  .option('-v, --voice <voice>', 'voice ID to analyze')
  .option('-t, --text <text>', 'sample text for analysis')
  .option('-p, --preset <preset>', 'analysis preset', 'general')
  .option('-s, --save', 'save analysis results to file')
  .option('-i, --interactive', 'interactive analysis mode')
  .action(async (options) => {
    try {
      const analyzeCommand = require('../src/commands/analyze');
      await analyzeCommand(options);
    } catch (error) {
      ErrorHandler.handle(error, 'analyze command');
    }
  });

// Additional utility commands
program
  .command('config')
  .description('Manage configuration settings')
  .option('--show', 'show current configuration')
  .option('--set <key=value>', 'set configuration value')
  .option('--reset', 'reset to default configuration')
  .action(async (options) => {
    try {
      const configCommand = require('../src/commands/config');
      await configCommand(options);
    } catch (error) {
      ErrorHandler.handle(error, 'config command');
    }
  });

program
  .command('status')
  .description('Show application status and health check')
  .option('--api', 'check API connectivity')
  .option('--cursor', 'check Cursor CLI availability')
  .action(async (options) => {
    try {
      const statusCommand = require('../src/commands/status');
      await statusCommand(options);
    } catch (error) {
      ErrorHandler.handle(error, 'status command');
    }
  });

program
  .command('advanced')
  .description('Advanced Phase 3 features and system management')
  .option('--performance', 'show performance dashboard')
  .option('--plugins', 'manage plugins')
  .option('--analytics', 'show analytics dashboard')
  .option('--test', 'run comprehensive tests')
  .option('--docs', 'generate documentation')
  .option('--optimize', 'optimize system performance')
  .option('--health', 'show system health status')
  .option('--list-plugins', 'list installed plugins')
  .option('--install-plugin <name>', 'install plugin')
  .option('--uninstall-plugin <name>', 'uninstall plugin')
  .option('--reload-plugin <name>', 'reload plugin')
  .action(async (options) => {
    try {
      const advancedCommand = require('../src/commands/advanced');
      await advancedCommand(options);
    } catch (error) {
      ErrorHandler.handle(error, 'advanced command');
    }
  });

// Error handling for unknown commands
program.on('command:*', (operands) => {
  console.error(chalk.red(`Invalid command: ${operands[0]}`));
  console.error(chalk.gray('See --help for a list of available commands.'));
  process.exit(1);
});

// Handle process signals gracefully
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\nProcess interrupted by user'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n\nProcess terminated'));
  process.exit(0);
});

// Parse command line arguments
try {
  program.parse();
} catch (error) {
  ErrorHandler.handle(error, 'argument parsing');
}

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
  process.exit(0);
}