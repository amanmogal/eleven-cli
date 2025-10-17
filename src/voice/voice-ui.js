/**
 * Voice UI Components Module
 * Modern voice interface components and utilities
 */

const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const { EventEmitter } = require('events');

class VoiceUI extends EventEmitter {
  constructor(options = {}) {
    super();
    this.theme = options.theme || 'modern';
    this.colors = this.getThemeColors(this.theme);
    this.spinner = null;
  }

  /**
   * Get theme colors
   * @param {string} theme - Theme name
   * @returns {Object} Color configuration
   */
  getThemeColors(theme) {
    const themes = {
      modern: {
        primary: chalk.cyan,
        secondary: chalk.blue,
        success: chalk.green,
        warning: chalk.yellow,
        error: chalk.red,
        info: chalk.gray,
        accent: chalk.magenta
      },
      dark: {
        primary: chalk.white,
        secondary: chalk.gray,
        success: chalk.green,
        warning: chalk.yellow,
        error: chalk.red,
        info: chalk.blue,
        accent: chalk.cyan
      },
      colorful: {
        primary: chalk.rainbow,
        secondary: chalk.blue,
        success: chalk.green,
        warning: chalk.yellow,
        error: chalk.red,
        info: chalk.cyan,
        accent: chalk.magenta
      }
    };
    return themes[theme] || themes.modern;
  }

  /**
   * Display voice project header
   * @param {string} title - Project title
   * @param {string} version - Project version
   */
  showHeader(title = 'Voice Project', version = '1.0.0') {
    const colors = this.colors;
    const header = `
${colors.primary('╔══════════════════════════════════════════════════════════════╗')}
${colors.primary('║')}                    ${colors.accent(title)}                    ${colors.primary('║')}
${colors.primary('║')}                      ${colors.info(`v${version}`)}                      ${colors.primary('║')}
${colors.primary('╚══════════════════════════════════════════════════════════════╝')}
`;
    console.log(header);
  }

  /**
   * Display voice status
   * @param {Object} status - Voice status object
   */
  showVoiceStatus(status) {
    const colors = this.colors;
    const statusText = status.isConnected ? 'Connected' : 'Disconnected';
    const statusColor = status.isConnected ? colors.success : colors.error;
    
    console.log(`
${colors.info('Voice Status:')} ${statusColor(statusText)}
${colors.info('Voice ID:')} ${colors.primary(status.voiceId)}
${colors.info('Model:')} ${colors.secondary(status.modelId)}
${colors.info('Processing:')} ${status.isProcessing ? colors.warning('Active') : colors.info('Idle')}
`);
  }

  /**
   * Show voice synthesis progress
   * @param {Object} progress - Progress object
   */
  showSynthesisProgress(progress) {
    if (!this.spinner) {
      this.spinner = ora({
        text: 'Synthesizing voice...',
        color: 'cyan'
      }).start();
    }

    const { current, total, text } = progress;
    const percentage = Math.round((current / total) * 100);
    
    this.spinner.text = `${this.colors.info('Synthesizing')} ${percentage}% - ${text.substring(0, 50)}...`;
    
    if (current === total) {
      this.spinner.succeed(this.colors.success('Synthesis complete!'));
      this.spinner = null;
    }
  }

  /**
   * Show voice recognition progress
   * @param {Object} progress - Progress object
   */
  showRecognitionProgress(progress) {
    if (!this.spinner) {
      this.spinner = ora({
        text: 'Recognizing speech...',
        color: 'blue'
      }).start();
    }

    const { percentCompleted, text } = progress;
    
    this.spinner.text = `${this.colors.info('Recognizing')} ${percentCompleted}%${text ? ` - ${text.substring(0, 30)}...` : ''}`;
    
    if (percentCompleted === 100) {
      this.spinner.succeed(this.colors.success('Recognition complete!'));
      this.spinner = null;
    }
  }

  /**
   * Display voice list
   * @param {Array} voices - Array of voice objects
   */
  showVoiceList(voices) {
    const colors = this.colors;
    console.log(`\n${colors.info('Available Voices:')}`);
    console.log(colors.primary('─'.repeat(60)));
    
    voices.forEach((voice, index) => {
      const name = voice.name || 'Unnamed Voice';
      const id = voice.voice_id || 'Unknown ID';
      const category = voice.category || 'General';
      
      console.log(`${colors.accent(`${index + 1}.`)} ${colors.primary(name)}`);
      console.log(`   ${colors.info('ID:')} ${colors.secondary(id)}`);
      console.log(`   ${colors.info('Category:')} ${colors.info(category)}`);
      console.log('');
    });
  }

  /**
   * Display audio file information
   * @param {Object} fileInfo - File information object
   */
  showAudioFileInfo(fileInfo) {
    const colors = this.colors;
    const { path, size, format, duration, quality } = fileInfo;
    
    console.log(`\n${colors.info('Audio File Information:')}`);
    console.log(colors.primary('─'.repeat(40)));
    console.log(`${colors.info('Path:')} ${colors.secondary(path)}`);
    console.log(`${colors.info('Size:')} ${colors.secondary(this.formatFileSize(size))}`);
    console.log(`${colors.info('Format:')} ${colors.secondary(format.toUpperCase())}`);
    if (duration) console.log(`${colors.info('Duration:')} ${colors.secondary(duration)}s`);
    if (quality) console.log(`${colors.info('Quality:')} ${colors.secondary(quality)}`);
    console.log('');
  }

  /**
   * Format file size
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Show voice cloning progress
   * @param {Object} progress - Cloning progress
   */
  showCloningProgress(progress) {
    if (!this.spinner) {
      this.spinner = ora({
        text: 'Cloning voice...',
        color: 'magenta'
      }).start();
    }

    const { step, totalSteps, currentStep } = progress;
    const percentage = Math.round((currentStep / totalSteps) * 100);
    
    this.spinner.text = `${this.colors.info('Cloning')} ${percentage}% - ${step}`;
    
    if (currentStep === totalSteps) {
      this.spinner.succeed(this.colors.success('Voice cloned successfully!'));
      this.spinner = null;
    }
  }

  /**
   * Interactive voice selection
   * @param {Array} voices - Available voices
   * @returns {Promise<Object>} Selected voice
   */
  async selectVoice(voices) {
    const choices = voices.map(voice => ({
      name: `${voice.name} (${voice.category || 'General'})`,
      value: voice,
      short: voice.name
    }));

    const { selectedVoice } = await inquirer.prompt([{
      type: 'list',
      name: 'selectedVoice',
      message: this.colors.info('Select a voice:'),
      choices,
      pageSize: 10
    }]);

    return selectedVoice;
  }

  /**
   * Interactive text input for synthesis
   * @returns {Promise<string>} Input text
   */
  async getTextInput() {
    const { text } = await inquirer.prompt([{
      type: 'input',
      name: 'text',
      message: this.colors.info('Enter text to synthesize:'),
      validate: (input) => input.length > 0 || 'Please enter some text'
    }]);

    return text;
  }

  /**
   * Interactive voice settings configuration
   * @param {Object} currentSettings - Current voice settings
   * @returns {Promise<Object>} Updated settings
   */
  async configureVoiceSettings(currentSettings = {}) {
    const questions = [
      {
        type: 'number',
        name: 'stability',
        message: this.colors.info('Stability (0.0 - 1.0):'),
        default: currentSettings.stability || 0.5,
        validate: (value) => value >= 0 && value <= 1 || 'Value must be between 0.0 and 1.0'
      },
      {
        type: 'number',
        name: 'similarityBoost',
        message: this.colors.info('Similarity Boost (0.0 - 1.0):'),
        default: currentSettings.similarityBoost || 0.5,
        validate: (value) => value >= 0 && value <= 1 || 'Value must be between 0.0 and 1.0'
      },
      {
        type: 'number',
        name: 'style',
        message: this.colors.info('Style (0.0 - 1.0):'),
        default: currentSettings.style || 0.0,
        validate: (value) => value >= 0 && value <= 1 || 'Value must be between 0.0 and 1.0'
      },
      {
        type: 'confirm',
        name: 'useSpeakerBoost',
        message: this.colors.info('Use Speaker Boost?'),
        default: currentSettings.useSpeakerBoost !== false
      }
    ];

    return await inquirer.prompt(questions);
  }

  /**
   * Show error message
   * @param {string} message - Error message
   * @param {Error} error - Error object
   */
  showError(message, error = null) {
    const colors = this.colors;
    console.log(`\n${colors.error('❌ Error:')} ${colors.error(message)}`);
    if (error && error.message) {
      console.log(`${colors.info('Details:')} ${colors.secondary(error.message)}`);
    }
    console.log('');
  }

  /**
   * Show success message
   * @param {string} message - Success message
   */
  showSuccess(message) {
    const colors = this.colors;
    console.log(`\n${colors.success('✅ Success:')} ${colors.success(message)}\n`);
  }

  /**
   * Show warning message
   * @param {string} message - Warning message
   */
  showWarning(message) {
    const colors = this.colors;
    console.log(`\n${colors.warning('⚠️  Warning:')} ${colors.warning(message)}\n`);
  }

  /**
   * Show info message
   * @param {string} message - Info message
   */
  showInfo(message) {
    const colors = this.colors;
    console.log(`\n${colors.info('ℹ️  Info:')} ${colors.info(message)}\n`);
  }

  /**
   * Clear screen
   */
  clearScreen() {
    console.clear();
  }

  /**
   * Set theme
   * @param {string} theme - Theme name
   */
  setTheme(theme) {
    this.theme = theme;
    this.colors = this.getThemeColors(theme);
    this.emit('themeChanged', theme);
  }
}

module.exports = VoiceUI;