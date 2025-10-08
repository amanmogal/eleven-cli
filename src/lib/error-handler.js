const chalk = require('chalk').default;
const Logger = require('./logger');

const logger = new Logger();

/**
 * Comprehensive Error Handler for the application
 * Provides consistent error handling and user-friendly error messages
 */
class ErrorHandler {
  /**
   * Handle application errors with appropriate logging and user feedback
   * @param {Error} error - Error object
   * @param {string} context - Error context
   * @param {Object} options - Error handling options
   */
  static handle(error, context = '', options = {}) {
    const { exit = true, showStack = false } = options;

    // Log error details
    logger.error(`Error in ${context || 'unknown context'}: ${error.message}`);
    
    if (showStack || process.env.DEBUG === 'true') {
      console.log(chalk.gray(`Stack trace: ${error.stack}`));
    }

    // Display user-friendly error message
    console.error(chalk.red('\n❌ Error occurred:'));
    
    if (context) {
      console.error(chalk.gray(`Context: ${context}`));
    }

    // Handle specific error types
    this._handleSpecificErrors(error);

    // Show help information
    console.error(chalk.gray('\nFor more help, run: eleven --help'));

    if (exit) {
      process.exit(1);
    }
  }

  /**
   * Handle specific error types with custom messages
   * @param {Error} error - Error object
   */
  static _handleSpecificErrors(error) {
    // File system errors
    if (error.code === 'ENOENT') {
      console.error(chalk.yellow('File or directory not found. Please check the path.'));
    } else if (error.code === 'EACCES') {
      console.error(chalk.yellow('Permission denied. Please check file permissions.'));
    } else if (error.code === 'EMFILE' || error.code === 'ENFILE') {
      console.error(chalk.yellow('Too many open files. Please close some applications and try again.'));
    } else if (error.code === 'ENOSPC') {
      console.error(chalk.yellow('No space left on device. Please free up some space.'));
    }
    // Network errors
    else if (error.code === 'ENOTFOUND') {
      console.error(chalk.yellow('Network error: Unable to resolve hostname. Check your internet connection.'));
    } else if (error.code === 'ECONNREFUSED') {
      console.error(chalk.yellow('Connection refused. The server may be down or unreachable.'));
    } else if (error.code === 'ETIMEDOUT') {
      console.error(chalk.yellow('Request timeout. The server took too long to respond.'));
    }
    // API errors
    else if (error.response) {
      this._handleApiError(error);
    }
    // Configuration errors
    else if (error.message.includes('ELEVEN_API_KEY')) {
      this._handleApiKeyError();
    } else if (error.message.includes('configuration')) {
      this._handleConfigError(error);
    }
    // Generic error
    else {
      console.error(chalk.red(error.message));
    }
  }

  /**
   * Handle API-specific errors
   * @param {Error} error - Error object with response property
   */
  static _handleApiError(error) {
    const status = error.response.status;
    const data = error.response.data;
    const message = data?.detail || data?.message || error.response.statusText;

    console.error(chalk.red(`API Error (${status}): ${message}`));

    switch (status) {
      case 400:
        console.error(chalk.yellow('Bad request. Please check your input parameters.'));
        break;
      case 401:
        console.error(chalk.yellow('Unauthorized. Please check your ElevenLabs API key.'));
        console.error(chalk.gray('You can set it by:'));
        console.error(chalk.gray('1. Creating a .env file with ELEVEN_API_KEY=your_key'));
        console.error(chalk.gray('2. Or setting it in your shell: export ELEVEN_API_KEY=your_key'));
        break;
      case 403:
        console.error(chalk.yellow('Forbidden. Your API key may not have the required permissions.'));
        break;
      case 404:
        console.error(chalk.yellow('Not found. The requested resource does not exist.'));
        break;
      case 429:
        console.error(chalk.yellow('Rate limit exceeded. Please wait before making more requests.'));
        break;
      case 500:
        console.error(chalk.yellow('Internal server error. Please try again later.'));
        break;
      case 502:
      case 503:
      case 504:
        console.error(chalk.yellow('Service temporarily unavailable. Please try again later.'));
        break;
      default:
        console.error(chalk.yellow('Unexpected API error. Please check your request and try again.'));
    }
  }

  /**
   * Handle API key related errors
   */
  static _handleApiKeyError() {
    console.error(chalk.yellow('Please set your ELEVEN_API_KEY environment variable.'));
    console.error(chalk.gray('You can do this by:'));
    console.error(chalk.gray('1. Creating a .env file with ELEVEN_API_KEY=your_key'));
    console.error(chalk.gray('2. Or setting it in your shell: export ELEVEN_API_KEY=your_key'));
    console.error(chalk.gray('3. Get your API key from: https://elevenlabs.io/app/settings/api-keys'));
  }

  /**
   * Handle configuration related errors
   * @param {Error} error - Configuration error
   */
  static _handleConfigError(error) {
    console.error(chalk.yellow('Configuration error detected.'));
    console.error(chalk.gray('Please check your configuration file or environment variables.'));
    
    if (error.message.includes('missing')) {
      console.error(chalk.gray('Some required configuration values are missing.'));
    } else if (error.message.includes('invalid')) {
      console.error(chalk.gray('Some configuration values are invalid.'));
    }
  }

  /**
   * Create a custom error with context
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {Object} context - Additional context
   * @returns {Error}
   */
  static createError(message, code = 'UNKNOWN_ERROR', context = {}) {
    const error = new Error(message);
    error.code = code;
    error.context = context;
    error.timestamp = new Date().toISOString();
    return error;
  }

  /**
   * Handle promise rejections
   * @param {Error} error - Rejection error
   * @param {string} context - Error context
   */
  static handleRejection(error, context = '') {
    logger.error(`Unhandled promise rejection in ${context}: ${error.message}`);
    this.handle(error, context, { exit: true });
  }

  /**
   * Handle uncaught exceptions
   * @param {Error} error - Exception error
   */
  static handleException(error) {
    logger.error(`Uncaught exception: ${error.message}`);
    this.handle(error, 'uncaught exception', { exit: true, showStack: true });
  }

  /**
   * Setup global error handlers
   */
  static setupGlobalHandlers() {
    process.on('unhandledRejection', (reason, promise) => {
      this.handleRejection(reason, 'unhandled promise rejection');
    });

    process.on('uncaughtException', (error) => {
      this.handleException(error);
    });

    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n\n⚠️ Process interrupted by user'));
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log(chalk.yellow('\n\n⚠️ Process terminated'));
      process.exit(0);
    });
  }

  /**
   * Validate and handle command line arguments
   * @param {Object} args - Command line arguments
   * @param {Object} schema - Validation schema
   * @returns {Object} Validated arguments
   */
  static validateArgs(args, schema) {
    const errors = [];

    Object.keys(schema).forEach(key => {
      const rule = schema[key];
      const value = args[key];

      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${key} is required`);
      }

      if (value !== undefined && rule.type) {
        if (rule.type === 'string' && typeof value !== 'string') {
          errors.push(`${key} must be a string`);
        } else if (rule.type === 'number' && typeof value !== 'number') {
          errors.push(`${key} must be a number`);
        } else if (rule.type === 'boolean' && typeof value !== 'boolean') {
          errors.push(`${key} must be a boolean`);
        }
      }

      if (value !== undefined && rule.min && value < rule.min) {
        errors.push(`${key} must be at least ${rule.min}`);
      }

      if (value !== undefined && rule.max && value > rule.max) {
        errors.push(`${key} must be at most ${rule.max}`);
      }

      if (value !== undefined && rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${key} format is invalid`);
      }
    });

    if (errors.length > 0) {
      const error = this.createError(`Validation failed: ${errors.join(', ')}`, 'VALIDATION_ERROR');
      this.handle(error, 'argument validation');
    }

    return args;
  }
}

module.exports = ErrorHandler;