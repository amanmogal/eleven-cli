#!/usr/bin/env node

/**
 * Eleven-CLI Interactive Tab Interface
 * Tab-based interface similar to Cursor CLI for running commands in background
 */

// Load environment variables first
const path = require('path');
const dotenv = require('dotenv');

// Try to load .env from the project directory
const projectDir = path.join(__dirname, '..');
dotenv.config({ path: path.join(projectDir, '.env') });

const readline = require('readline');
const { spawn, exec } = require('child_process');
const chalk = require('chalk').default;
const boxen = require('boxen').default;
const fs = require('fs-extra');

// Import utilities
const Logger = require('../src/lib/logger');
const ErrorHandler = require('../src/lib/error-handler');
const ConfigManager = require('../src/lib/config-manager');

// Setup global error handlers
ErrorHandler.setupGlobalHandlers();

// Initialize logger and config
const logger = new Logger();
const configManager = new ConfigManager();

/**
 * Tab-based CLI Interface
 * Similar to Cursor CLI with background command execution
 */
class ElevenTabCLI {
  constructor() {
    this.tabs = new Map();
    this.activeTab = 0;
    this.tabCounter = 0;
    this.rl = null;
    this.isRunning = false;
    
    // Initialize
    this.initialize();
  }

  /**
   * Initialize the CLI interface
   */
  async initialize() {
    try {
      // Load configuration
      configManager.loadConfig();
      
      // Create readline interface
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: this.getPrompt()
      });

      // Setup event listeners
      this.setupEventListeners();
      
      // Show welcome message
      this.showWelcome();
      
      // Start the interface
      this.start();
      
    } catch (error) {
      ErrorHandler.handle(error, 'CLI initialization');
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    this.rl.on('line', (input) => {
      this.handleInput(input.trim());
    });

    this.rl.on('close', () => {
      this.cleanup();
    });

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      this.handleExit();
    });

    // Handle Ctrl+Z
    process.on('SIGTSTP', () => {
      this.handleSuspend();
    });
  }

  /**
   * Show welcome message
   */
  showWelcome() {
    const welcomeMessage = boxen(
      chalk.cyan.bold('Eleven-CLI Interactive') + '\n' +
      chalk.gray('Tab-based interface for voice agent development') + '\n' +
      chalk.gray('Type "help" for available commands'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan'
      }
    );

    console.log(welcomeMessage);
    console.log(chalk.gray('\nTip: Commands run in background tabs. Use "tabs" to see active tabs.'));
  }

  /**
   * Get current prompt
   */
  getPrompt() {
    const tabInfo = this.tabs.size > 0 ? ` [${this.activeTab + 1}/${this.tabs.size}]` : '';
    return chalk.cyan(`eleven${tabInfo}> `);
  }

  /**
   * Start the interactive interface
   */
  start() {
    this.isRunning = true;
    this.rl.prompt();
  }

  /**
   * Handle user input
   */
  async handleInput(input) {
    if (!input) {
      this.rl.prompt();
      return;
    }

    const [command, ...args] = input.split(' ');

    switch (command.toLowerCase()) {
      case 'help':
        this.showHelp();
        break;
      case 'tabs':
        this.showTabs();
        break;
      case 'switch':
        this.switchTab(args[0]);
        break;
      case 'close':
        this.closeTab(args[0]);
        break;
      case 'clear':
        this.clearScreen();
        break;
      case 'exit':
      case 'quit':
        this.handleExit();
        break;
      case 'init':
        this.runCommand('init', args);
        break;
      case 'test':
        this.runCommand('test', args);
        break;
      case 'docs':
        this.runCommand('docs', args);
        break;
      case 'tune':
        this.runCommand('tune', args);
        break;
      case 'clone':
        this.runCommand('clone', args);
        break;
      case 'analyze':
        this.runCommand('analyze', args);
        break;
      case 'config':
        this.runCommand('config', args);
        break;
      case 'status':
        this.runCommand('status', args);
        break;
      case 'advanced':
        this.runCommand('advanced', args);
        break;
      default:
        console.log(chalk.red(`Unknown command: ${command}`));
        console.log(chalk.gray('Type "help" for available commands.'));
    }

    this.rl.prompt();
  }

  /**
   * Run command in a new tab
   */
  async runCommand(command, args = []) {
    try {
      const tabId = ++this.tabCounter;
      const tabName = `${command}-${tabId}`;
      
      // Create new tab
      const tab = {
        id: tabId,
        name: tabName,
        command: command,
        args: args,
        process: null,
        status: 'starting',
        output: [],
        startTime: Date.now()
      };

      this.tabs.set(tabId, tab);
      this.activeTab = tabId;

      console.log(chalk.green(`Starting ${command} in tab ${tabId}...`));

      // Run the command
      await this.executeCommand(tab);

    } catch (error) {
      console.log(chalk.red(`❌ Failed to start command: ${error.message}`));
    }
  }

  /**
   * Execute command in background
   */
  async executeCommand(tab) {
    return new Promise((resolve, reject) => {
      const commandPath = path.join(__dirname, 'index.js');
      const fullArgs = [tab.command, ...tab.args];
      
      // Spawn the process
      const childProcess = spawn('node', [commandPath, ...fullArgs], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      tab.process = childProcess;
      tab.status = 'running';

      // Handle output
      childProcess.stdout.on('data', (data) => {
        const output = data.toString();
        tab.output.push({ type: 'stdout', data: output, timestamp: Date.now() });
        this.displayTabOutput(tab, output);
      });

      childProcess.stderr.on('data', (data) => {
        const output = data.toString();
        tab.output.push({ type: 'stderr', data: output, timestamp: Date.now() });
        this.displayTabOutput(tab, output, 'stderr');
      });

      // Handle process completion
      childProcess.on('close', (code) => {
        tab.status = code === 0 ? 'completed' : 'failed';
        tab.endTime = Date.now();
        tab.exitCode = code;
        
        const status = code === 0 ? '[SUCCESS]' : '[FAILED]';
        console.log(chalk.gray(`\n${status} Tab ${tab.id} (${tab.command}) completed with code ${code}`));
        
        resolve();
      });

      childProcess.on('error', (error) => {
        tab.status = 'error';
        tab.error = error.message;
        console.log(chalk.red(`[ERROR] Tab ${tab.id} error: ${error.message}`));
        reject(error);
      });
    });
  }

  /**
   * Display tab output
   */
  displayTabOutput(tab, output, type = 'stdout') {
    const prefix = `[${tab.id}] `;
    const color = type === 'stderr' ? chalk.red : chalk.white;
    
    // Split output by lines and display with tab prefix
    const lines = output.split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(color(prefix + line));
      }
    });
  }

  /**
   * Show help
   */
  showHelp() {
    console.log(chalk.cyan.bold('\nEleven-CLI Interactive Commands:'));
    console.log(chalk.white('\nVoice Commands:'));
    console.log(chalk.gray('  init [project]     - Create new voice agent project'));
    console.log(chalk.gray('  test [options]     - Test voice synthesis'));
    console.log(chalk.gray('  docs [options]     - Generate documentation'));
    console.log(chalk.gray('  tune [options]     - Tune voice settings'));
    console.log(chalk.gray('  clone [options]    - Clone voice from audio'));
    console.log(chalk.gray('  analyze [options]  - Analyze voice quality'));
    
    console.log(chalk.white('\nSystem Commands:'));
    console.log(chalk.gray('  config [options]   - Manage configuration'));
    console.log(chalk.gray('  status [options]   - Show system status'));
    console.log(chalk.gray('  advanced [options] - Advanced features'));
    
    console.log(chalk.white('\nTab Management:'));
    console.log(chalk.gray('  tabs               - Show active tabs'));
    console.log(chalk.gray('  switch <id>        - Switch to tab'));
    console.log(chalk.gray('  close <id>         - Close tab'));
    console.log(chalk.gray('  clear              - Clear screen'));
    
    console.log(chalk.white('\nControl:'));
    console.log(chalk.gray('  help               - Show this help'));
    console.log(chalk.gray('  exit/quit          - Exit CLI'));
    
    console.log(chalk.gray('\nCommands run in background tabs. Use "tabs" to see active tabs.'));
  }

  /**
   * Show active tabs
   */
  showTabs() {
    if (this.tabs.size === 0) {
      console.log(chalk.gray('No active tabs.'));
      return;
    }

    console.log(chalk.cyan.bold('\nActive Tabs:'));
    console.log(chalk.gray('─'.repeat(60)));
    
    this.tabs.forEach((tab, id) => {
      const status = this.getStatusIcon(tab.status);
      const duration = tab.endTime ? 
        `${Math.round((tab.endTime - tab.startTime) / 1000)}s` : 
        `${Math.round((Date.now() - tab.startTime) / 1000)}s`;
      
      const active = id === this.activeTab ? chalk.yellow('*') : ' ';
      console.log(chalk.white(`${active} ${id}: ${tab.command} ${status} (${duration})`));
    });
    
    console.log(chalk.gray('─'.repeat(60)));
  }

  /**
   * Get status icon
   */
  getStatusIcon(status) {
    switch (status) {
      case 'starting': return chalk.yellow('[STARTING]');
      case 'running': return chalk.green('[RUNNING]');
      case 'completed': return chalk.green('[COMPLETED]');
      case 'failed': return chalk.red('[FAILED]');
      case 'error': return chalk.red('[ERROR]');
      default: return chalk.gray('[UNKNOWN]');
    }
  }

  /**
   * Switch to tab
   */
  switchTab(tabId) {
    const id = parseInt(tabId);
    if (!this.tabs.has(id)) {
      console.log(chalk.red(`Tab ${tabId} not found.`));
      return;
    }
    
    this.activeTab = id;
    console.log(chalk.green(`Switched to tab ${id}`));
  }

  /**
   * Close tab
   */
  closeTab(tabId) {
    const id = parseInt(tabId);
    if (!this.tabs.has(id)) {
      console.log(chalk.red(`Tab ${tabId} not found.`));
      return;
    }
    
    const tab = this.tabs.get(id);
    if (tab.process && tab.status === 'running') {
      tab.process.kill();
    }
    
    this.tabs.delete(id);
    console.log(chalk.green(`Closed tab ${id}`));
    
    // Adjust active tab if needed
    if (this.activeTab === id) {
      this.activeTab = this.tabs.size > 0 ? Math.min(...this.tabs.keys()) : 0;
    }
  }

  /**
   * Clear screen
   */
  clearScreen() {
    console.clear();
    this.showWelcome();
  }

  /**
   * Handle exit
   */
  handleExit() {
    console.log(chalk.yellow('\n\nExiting Eleven-CLI Interactive...'));
    
    // Close all tabs
    this.tabs.forEach((tab, id) => {
      if (tab.process && tab.status === 'running') {
        tab.process.kill();
      }
    });
    
    this.cleanup();
  }

  /**
   * Handle suspend
   */
  handleSuspend() {
    console.log(chalk.yellow('\n\nSuspending Eleven-CLI Interactive...'));
    console.log(chalk.gray('Use "fg" to resume.'));
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.isRunning = false;
    this.rl.close();
    process.exit(0);
  }
}

// Start the interactive CLI
if (require.main === module) {
  new ElevenTabCLI();
}

module.exports = ElevenTabCLI;