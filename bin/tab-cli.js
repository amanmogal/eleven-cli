#!/usr/bin/env node

/**
 * Eleven-CLI Tab Interface
 * Integrated tab-based interface for ElevenLabs and Cursor CLI
 */

// Load environment variables first
const path = require('path');
const dotenv = require('dotenv');

// Try to load .env from the project directory
const projectDir = path.join(__dirname, '..');
dotenv.config({ path: path.join(projectDir, '.env') });

const readline = require('readline');
const chalk = require('chalk').default;
const boxen = require('boxen').default;

// Import utilities
const Logger = require('../src/lib/logger');
const ErrorHandler = require('../src/lib/error-handler');
const ConfigManager = require('../src/lib/config-manager');
const CursorTabManager = require('../src/lib/cursor-tab-manager');

// Setup global error handlers
ErrorHandler.setupGlobalHandlers();

// Initialize logger and config
const logger = new Logger();
const configManager = new ConfigManager();

/**
 * Integrated Tab CLI Interface
 * Combines ElevenLabs CLI and Cursor CLI in a tab-based interface
 */
class ElevenTabCLI {
  constructor() {
    this.cursorTabManager = null;
    this.rl = null;
    this.isRunning = false;
    this.commandHistory = [];
    this.historyIndex = -1;
    
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
      
      // Initialize Cursor Tab Manager
      this.cursorTabManager = new CursorTabManager();
      
      // Wait for Cursor Tab Manager to be ready
      await new Promise((resolve, reject) => {
        this.cursorTabManager.on('ready', resolve);
        this.cursorTabManager.on('error', reject);
      });
      
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

    // Handle Cursor Tab Manager events
    this.cursorTabManager.on('output', (tab, output, type) => {
      this.displayTabOutput(tab, output, type);
    });

    this.cursorTabManager.on('tabCreated', (tab) => {
      console.log(chalk.green(`Created tab ${tab.id}: ${tab.name}`));
    });

    this.cursorTabManager.on('tabCompleted', (tab) => {
      const status = tab.exitCode === 0 ? '[SUCCESS]' : '[FAILED]';
      console.log(chalk.gray(`\n${status} Tab ${tab.id} completed`));
    });

    this.cursorTabManager.on('tabError', (tab, error) => {
      console.log(chalk.red(`[ERROR] Tab ${tab.id} error: ${error.message}`));
    });
  }

  /**
   * Show welcome message
   */
  showWelcome() {
    const welcomeMessage = boxen(
      chalk.cyan.bold('Eleven-CLI Tab Interface') + '\n' +
      chalk.gray('Integrated ElevenLabs + Cursor CLI with tab management') + '\n' +
      chalk.gray('Type "help" for available commands'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan'
      }
    );

    console.log(welcomeMessage);
    console.log(chalk.gray('\nCommands run in background tabs. Use "tabs" to see active tabs.'));
    console.log(chalk.gray('Cursor CLI integration enabled for AI-powered development.'));
  }

  /**
   * Get current prompt
   */
  getPrompt() {
    const activeTab = this.cursorTabManager.getActiveTab();
    const tabInfo = activeTab ? ` [${activeTab.id}]` : '';
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

    // Add to history
    this.commandHistory.push(input);
    this.historyIndex = this.commandHistory.length;

    const [command, ...args] = input.split(' ');

    try {
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
        case 'status':
          this.showStatus();
          break;
        case 'exit':
        case 'quit':
          this.handleExit();
          break;
        case 'init':
          await this.runElevenCommand('init', args);
          break;
        case 'test':
          await this.runElevenCommand('test', args);
          break;
        case 'docs':
          await this.runElevenCommand('docs', args);
          break;
        case 'tune':
          await this.runElevenCommand('tune', args);
          break;
        case 'clone':
          await this.runElevenCommand('clone', args);
          break;
        case 'analyze':
          await this.runElevenCommand('analyze', args);
          break;
        case 'config':
          await this.runElevenCommand('config', args);
          break;
        case 'advanced':
          await this.runElevenCommand('advanced', args);
          break;
        case 'cursor':
          await this.runCursorCommand(args[0], args.slice(1));
          break;
        case 'ai':
          await this.runAIAssistant(args.join(' '));
          break;
        default:
          console.log(chalk.red(`Unknown command: ${command}`));
          console.log(chalk.gray('Type "help" for available commands.'));
      }
    } catch (error) {
      console.log(chalk.red(`❌ Error: ${error.message}`));
    }

    this.rl.prompt();
  }

  /**
   * Run ElevenLabs command in tab
   */
  async runElevenCommand(command, args = []) {
    try {
      console.log(chalk.green(`Running eleven ${command}...`));
      const tab = await this.cursorTabManager.runElevenCommand(command, args);
      return tab;
    } catch (error) {
      console.log(chalk.red(`Failed to run eleven ${command}: ${error.message}`));
      throw error;
    }
  }

  /**
   * Run Cursor CLI command in tab
   */
  async runCursorCommand(command, args = []) {
    try {
      console.log(chalk.green(`Running cursor ${command}...`));
      const tab = await this.cursorTabManager.runCursorCommand(command, args);
      return tab;
    } catch (error) {
      console.log(chalk.red(`Failed to run cursor ${command}: ${error.message}`));
      throw error;
    }
  }

  /**
   * Run AI assistant
   */
  async runAIAssistant(prompt) {
    try {
      console.log(chalk.green(`Running AI assistant...`));
      const tab = await this.cursorTabManager.runCursorCommand('ask', [prompt]);
      return tab;
    } catch (error) {
      console.log(chalk.red(`Failed to run AI assistant: ${error.message}`));
      throw error;
    }
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
    console.log(chalk.cyan.bold('\nEleven-CLI Tab Interface Commands:'));
    
    console.log(chalk.white('\nElevenLabs Commands:'));
    console.log(chalk.gray('  init [project]     - Create new voice agent project'));
    console.log(chalk.gray('  test [options]     - Test voice synthesis'));
    console.log(chalk.gray('  docs [options]     - Generate documentation'));
    console.log(chalk.gray('  tune [options]     - Tune voice settings'));
    console.log(chalk.gray('  clone [options]    - Clone voice from audio'));
    console.log(chalk.gray('  analyze [options]  - Analyze voice quality'));
    console.log(chalk.gray('  config [options]   - Manage configuration'));
    console.log(chalk.gray('  advanced [options] - Advanced features'));
    
    console.log(chalk.white('\nCursor AI Commands:'));
    console.log(chalk.gray('  cursor <command>   - Run Cursor CLI command'));
    console.log(chalk.gray('  ai <prompt>        - Ask AI assistant'));
    
    console.log(chalk.white('\nTab Management:'));
    console.log(chalk.gray('  tabs               - Show active tabs'));
    console.log(chalk.gray('  switch <id>        - Switch to tab'));
    console.log(chalk.gray('  close <id>         - Close tab'));
    console.log(chalk.gray('  status             - Show system status'));
    console.log(chalk.gray('  clear              - Clear screen'));
    
    console.log(chalk.white('\nControl:'));
    console.log(chalk.gray('  help               - Show this help'));
    console.log(chalk.gray('  exit/quit          - Exit CLI'));
    
    console.log(chalk.gray('\nCommands run in background tabs. Use "tabs" to see active tabs.'));
    console.log(chalk.gray('Cursor CLI integration enables AI-powered development.'));
  }

  /**
   * Show active tabs
   */
  showTabs() {
    const tabs = this.cursorTabManager.getAllTabs();
    
    if (tabs.length === 0) {
      console.log(chalk.gray('No active tabs.'));
      return;
    }

    console.log(chalk.cyan.bold('\nActive Tabs:'));
    console.log(chalk.gray('─'.repeat(60)));
    
    tabs.forEach((tab) => {
      const status = this.getStatusIcon(tab.status);
      const duration = tab.endTime ? 
        `${Math.round((tab.endTime - tab.startTime) / 1000)}s` : 
        `${Math.round((Date.now() - tab.startTime) / 1000)}s`;
      
      const active = tab.id === this.cursorTabManager.activeTab ? chalk.yellow('*') : ' ';
      const type = tab.type === 'cursor' ? '[AI]' : '[VOICE]';
      console.log(chalk.white(`${active} ${tab.id}: ${type} ${tab.name} ${status} (${duration})`));
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
    try {
      const id = parseInt(tabId);
      this.cursorTabManager.switchTab(id);
      console.log(chalk.green(`Switched to tab ${id}`));
    } catch (error) {
      console.log(chalk.red(`Failed to switch to tab: ${error.message}`));
    }
  }

  /**
   * Close tab
   */
  closeTab(tabId) {
    try {
      const id = parseInt(tabId);
      this.cursorTabManager.closeTab(id);
      console.log(chalk.green(`Closed tab ${id}`));
    } catch (error) {
      console.log(chalk.red(`Failed to close tab: ${error.message}`));
    }
  }

  /**
   * Show system status
   */
  showStatus() {
    const summary = this.cursorTabManager.getStatusSummary();
    const config = configManager.getSummary();
    
    console.log(chalk.cyan.bold('\nSystem Status:'));
    console.log(chalk.gray('─'.repeat(40)));
    
    console.log(chalk.white(`Tabs: ${summary.total} total, ${summary.running} running, ${summary.completed} completed`));
    console.log(chalk.white(`API Key: ${config.hasApiKey ? '[SET]' : '[NOT SET]'}`));
    console.log(chalk.white(`Cursor CLI: ${this.cursorTabManager ? '[AVAILABLE]' : '[NOT AVAILABLE]'}`));
    console.log(chalk.white(`Node.js: ${process.version}`));
    console.log(chalk.white(`Platform: ${process.platform}`));
    
    console.log(chalk.gray('─'.repeat(40)));
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
    console.log(chalk.yellow('\n\nExiting Eleven-CLI Tab Interface...'));
    
    // Cleanup Cursor Tab Manager
    if (this.cursorTabManager) {
      this.cursorTabManager.cleanup();
    }
    
    this.cleanup();
  }

  /**
   * Handle suspend
   */
  handleSuspend() {
    console.log(chalk.yellow('\n\nSuspending Eleven-CLI Tab Interface...'));
    console.log(chalk.gray('Use "fg" to resume.'));
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.isRunning = false;
    if (this.rl) {
      this.rl.close();
    }
    process.exit(0);
  }
}

// Start the tab CLI
if (require.main === module) {
  new ElevenTabCLI();
}

module.exports = ElevenTabCLI;