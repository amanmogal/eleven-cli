const chalk = require('chalk').default;
const { format } = require('util');

/**
 * Enhanced Logger class with multiple output levels and formatting
 * Provides consistent logging across the application
 */
class Logger {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.debugMode = options.debug || false;
    this.silent = options.silent || false;
    this.logLevel = this._parseLogLevel(options.logLevel || 'info');
  }

  _parseLogLevel(level) {
    const levels = { error: 0, warn: 1, info: 2, verbose: 3, debug: 4 };
    return levels[level.toLowerCase()] || 2;
  }

  _shouldLog(level) {
    if (this.silent) return false;
    return this._parseLogLevel(level) <= this.logLevel;
  }

  _formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const formattedMessage = format(message, ...args);
    return `[${timestamp}] [${level.toUpperCase()}] ${formattedMessage}`;
  }

  error(message, ...args) {
    if (!this._shouldLog('error')) return;
    console.error(chalk.red('❌'), this._formatMessage('error', message, ...args));
  }

  warn(message, ...args) {
    if (!this._shouldLog('warn')) return;
    console.warn(chalk.yellow('⚠️'), this._formatMessage('warn', message, ...args));
  }

  info(message, ...args) {
    if (!this._shouldLog('info')) return;
    console.log(chalk.blue('ℹ️'), this._formatMessage('info', message, ...args));
  }

  success(message, ...args) {
    if (!this._shouldLog('info')) return;
    console.log(chalk.green('✅'), this._formatMessage('success', message, ...args));
  }

  verbose(message, ...args) {
    if (!this._shouldLog('verbose')) return;
    console.log(chalk.gray('📝'), this._formatMessage('verbose', message, ...args));
  }

  debug(message, ...args) {
    if (!this._shouldLog('debug')) return;
    console.log(chalk.gray('🐛'), this._formatMessage('debug', message, ...args));
  }

  progress(message) {
    if (this.silent) return;
    console.log(chalk.cyan('🔄'), message);
  }

  // Specialized logging methods
  apiCall(method, url, statusCode) {
    this.debug(`API ${method} ${url} -> ${statusCode}`);
  }

  fileOperation(operation, filePath, success = true) {
    const status = success ? 'completed' : 'failed';
    this.debug(`File ${operation} ${filePath} -> ${status}`);
  }

  commandExecution(command, args = [], success = true) {
    const status = success ? 'completed' : 'failed';
    const fullCommand = `${command} ${args.join(' ')}`.trim();
    this.debug(`Command execution: ${fullCommand} -> ${status}`);
  }
}

module.exports = Logger;