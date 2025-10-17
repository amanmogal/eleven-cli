const axios = require('axios');
const { exec } = require('child_process');
const chalk = require('chalk').default;
const ora = require('ora').default;

// Import utilities
const Logger = require('../lib/logger');
const ConfigManager = require('../lib/config-manager');
const ErrorHandler = require('../lib/error-handler');

const logger = new Logger();
const configManager = new ConfigManager();

/**
 * Check API connectivity
 * @returns {Promise<Object>} API status
 */
async function checkApiConnectivity() {
  const spinner = ora('Checking ElevenLabs API connectivity...').start();
  
  try {
    const config = configManager.loadConfig();
    
    const response = await axios.get(`${config.elevenApiBaseUrl}/voices`, {
      headers: {
        'xi-api-key': config.elevenApiKey
      },
      timeout: config.requestTimeout
    });

    spinner.succeed('ElevenLabs API is accessible');
    
    return {
      status: 'connected',
      voices: response.data.voices?.length || 0,
      responseTime: response.headers['x-response-time'] || 'unknown'
    };

  } catch (error) {
    spinner.fail('ElevenLabs API is not accessible');
    
    let status = 'error';
    let message = 'Unknown error';
    
    if (error.response) {
      status = 'error';
      message = `HTTP ${error.response.status}: ${error.response.data?.detail || error.response.statusText}`;
    } else if (error.request) {
      status = 'timeout';
      message = 'Request timeout - check your internet connection';
    } else {
      status = 'error';
      message = error.message;
    }

    return {
      status,
      message,
      voices: 0
    };
  }
}

/**
 * Check Cursor CLI availability
 * @returns {Promise<Object>} Cursor CLI status
 */
async function checkCursorCLI() {
  const spinner = ora('Checking Cursor CLI availability...').start();
  
  try {
    const config = configManager.loadConfig();
    const cursorPath = config.cursorAgentPath;

    return new Promise((resolve) => {
      exec(`${cursorPath} --version`, (error, stdout, stderr) => {
        if (error) {
          spinner.fail('Cursor CLI not found');
          resolve({
            status: 'not_found',
            message: `Command not found: ${cursorPath}`,
            version: null
          });
        } else {
          spinner.succeed('Cursor CLI is available');
          resolve({
            status: 'available',
            message: 'Cursor CLI is working',
            version: stdout.trim()
          });
        }
      });
    });

  } catch (error) {
    spinner.fail('Cursor CLI check failed');
    return {
      status: 'error',
      message: error.message,
      version: null
    };
  }
}

/**
 * Check system requirements
 * @returns {Promise<Object>} System status
 */
async function checkSystemRequirements() {
  const spinner = ora('Checking system requirements...').start();
  
  try {
    const requirements = {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
    const nodeVersionOk = majorVersion >= 16;

    // Check available memory
    const totalMemory = process.memoryUsage().heapTotal;
    const memoryOk = totalMemory > 50 * 1024 * 1024; // 50MB

    spinner.succeed('System requirements checked');

    return {
      status: 'ok',
      requirements,
      issues: [
        ...(nodeVersionOk ? [] : ['Node.js version should be 16 or higher']),
        ...(memoryOk ? [] : ['Low memory available'])
      ]
    };

  } catch (error) {
    spinner.fail('System check failed');
    return {
      status: 'error',
      message: error.message,
      requirements: null
    };
  }
}

/**
 * Check configuration validity
 * @returns {Object} Configuration status
 */
function checkConfiguration() {
  try {
    const config = configManager.loadConfig();
    const isValid = configManager.isValid();
    const summary = configManager.getSummary();

    return {
      status: isValid ? 'valid' : 'invalid',
      hasApiKey: summary.hasApiKey,
      config: summary,
      issues: isValid ? [] : ['Configuration validation failed']
    };

  } catch (error) {
    return {
      status: 'error',
      message: error.message,
      hasApiKey: false,
      config: null,
      issues: [error.message]
    };
  }
}

/**
 * Display status information
 * @param {Object} status - Status information
 */
function displayStatus(status) {
  console.log(chalk.cyan('Eleven-Cursor Status Report'));
  console.log(chalk.gray('─'.repeat(50)));

  // API Status
  console.log(chalk.white('\nElevenLabs API:'));
  if (status.api.status === 'connected') {
    console.log(chalk.green(`  [CONNECTED] (${status.api.voices} voices available)`));
  } else {
    console.log(chalk.red(`  [ERROR] ${status.api.status}: ${status.api.message}`));
  }

  // Cursor CLI Status
  console.log(chalk.white('\n🤖 Cursor CLI:'));
  if (status.cursor.status === 'available') {
    console.log(chalk.green(`  [AVAILABLE] (${status.cursor.version})`));
  } else {
    console.log(chalk.red(`  [ERROR] ${status.cursor.status}: ${status.cursor.message}`));
  }

  // Configuration Status
  console.log(chalk.white('\nConfiguration:'));
  if (status.config.status === 'valid') {
    console.log(chalk.green('  ✅ Valid'));
    console.log(chalk.gray(`  API Key: ${status.config.hasApiKey ? 'Set' : 'Not Set'}`));
  } else {
    console.log(chalk.red(`  [ERROR] ${status.config.status}`));
    status.config.issues.forEach(issue => {
      console.log(chalk.red(`    • ${issue}`));
    });
  }

  // System Status
  console.log(chalk.white('\nSystem:'));
  if (status.system.status === 'ok') {
    console.log(chalk.green('  [REQUIREMENTS MET]'));
    console.log(chalk.gray(`  Node.js: ${status.system.requirements.nodeVersion}`));
    console.log(chalk.gray(`  Platform: ${status.system.requirements.platform}`));
  } else {
    console.log(chalk.red(`  ❌ ${status.system.status}`));
    status.system.issues?.forEach(issue => {
      console.log(chalk.red(`    • ${issue}`));
    });
  }

  // Overall Status
  console.log(chalk.gray('\n─'.repeat(50)));
  const allGood = status.api.status === 'connected' && 
                  status.cursor.status === 'available' && 
                  status.config.status === 'valid' && 
                  status.system.status === 'ok';

  if (allGood) {
    console.log(chalk.green('[SUCCESS] All systems operational!'));
  } else {
    console.log(chalk.yellow('[WARNING] Some issues detected. Check the details above.'));
  }
}

/**
 * Generate health check report
 * @param {Object} options - Command options
 * @returns {Promise<Object>} Health report
 */
async function generateHealthReport(options = {}) {
  const report = {
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    checks: {}
  };

  // Run all checks
  if (options.api || !options.cursor) {
    report.checks.api = await checkApiConnectivity();
  }

  if (options.cursor || !options.api) {
    report.checks.cursor = await checkCursorCLI();
  }

  report.checks.config = checkConfiguration();
  report.checks.system = await checkSystemRequirements();

  return report;
}

/**
 * Main status command function
 * @param {Object} options - Command options
 * @returns {Promise<void>}
 */
async function statusCommand(options = {}) {
  try {
    logger.info('Checking application status...');

    const status = {
      api: { status: 'skipped' },
      cursor: { status: 'skipped' },
      config: { status: 'skipped' },
      system: { status: 'skipped' }
    };

    // Run specific checks based on options
    if (options.api) {
      status.api = await checkApiConnectivity();
    }

    if (options.cursor) {
      status.cursor = await checkCursorCLI();
    }

    // Always check config and system
    status.config = checkConfiguration();
    status.system = await checkSystemRequirements();

    // If no specific checks requested, run all
    if (!options.api && !options.cursor) {
      status.api = await checkApiConnectivity();
      status.cursor = await checkCursorCLI();
    }

    // Display status
    displayStatus(status);

    // Generate detailed report if requested
    if (options.report) {
      const report = await generateHealthReport(options);
      const reportFile = `status-report-${Date.now()}.json`;
      require('fs').writeFileSync(reportFile, JSON.stringify(report, null, 2));
      logger.info(`Detailed report saved to: ${reportFile}`);
    }

  } catch (error) {
    ErrorHandler.handle(error, 'status command');
  }
}

module.exports = statusCommand;