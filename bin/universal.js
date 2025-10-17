#!/usr/bin/env node

/**
 * Eleven-CLI Universal Interactive Interface
 * Single comprehensive CLI with all functionality integrated
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
const CursorTabManager = require('../src/lib/cursor-tab-manager');
const VoiceCommand = require('../src/commands/voice');

// Setup global error handlers
ErrorHandler.setupGlobalHandlers();

// Initialize logger and config
const logger = new Logger();
const configManager = new ConfigManager();

/**
 * Universal Interactive CLI
 * Combines all functionality into a single comprehensive interface
 */
class UniversalElevenCLI {
  constructor() {
    this.cursorTabManager = null;
    this.voiceCommand = null;
    this.rl = null;
    this.isRunning = false;
    this.commandHistory = [];
    this.historyIndex = -1;
    this.currentMode = 'main'; // main, tab, cursor, voice, system
    this.tabs = new Map();
    this.activeTab = null;
    this.tabCounter = 0;
    
    // Initialize
    this.initialize();
  }

  /**
   * Initialize the universal CLI
   */
  async initialize() {
    try {
      // Load configuration
      configManager.loadConfig();
      
      // Initialize Cursor Tab Manager
      this.cursorTabManager = new CursorTabManager();
      
      // Initialize Voice Command
      this.voiceCommand = new VoiceCommand();
      
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
      ErrorHandler.handle(error, 'Universal CLI initialization');
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
      chalk.cyan.bold('Eleven-CLI Universal Interface') + '\n' +
      chalk.gray('Complete voice development platform with AI integration') + '\n' +
      chalk.gray('Type "help" for available commands or "modes" to see all modes'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan'
      }
    );

    console.log(welcomeMessage);
    console.log(chalk.gray('\nFeatures: Voice Synthesis | AI Integration | Tab Management | Project Tools'));
    console.log(chalk.gray('Modes: main | voice | ai | tabs | system | project'));
  }

  /**
   * Get current prompt based on mode
   */
  getPrompt() {
    const modeIndicator = this.currentMode !== 'main' ? `[${this.currentMode}]` : '';
    const tabInfo = this.activeTab ? ` [${this.activeTab}]` : '';
    return chalk.cyan(`eleven${modeIndicator}${tabInfo}> `);
  }

  /**
   * Start the universal interface
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
      // Mode switching commands
      if (command === 'mode' || command === 'modes') {
        this.handleModeCommand(args);
        return;
      }

      // Route commands based on current mode
      switch (this.currentMode) {
        case 'main':
          await this.handleMainCommand(command, args);
          break;
        case 'voice':
          await this.handleVoiceCommand(command, args);
          break;
        case 'ai':
          await this.handleAICommand(command, args);
          break;
        case 'tabs':
          await this.handleTabCommand(command, args);
          break;
        case 'system':
          await this.handleSystemCommand(command, args);
          break;
        case 'project':
          await this.handleProjectCommand(command, args);
          break;
        default:
          await this.handleMainCommand(command, args);
      }
    } catch (error) {
      console.log(chalk.red(`[ERROR] ${error.message}`));
    }

    this.rl.prompt();
  }

  /**
   * Handle mode switching
   */
  handleModeCommand(args) {
    if (args.length === 0) {
      this.showModes();
      return;
    }

    const mode = args[0].toLowerCase();
    const validModes = ['main', 'voice', 'ai', 'tabs', 'system', 'project'];
    
    if (validModes.includes(mode)) {
      this.currentMode = mode;
      console.log(chalk.green(`Switched to ${mode} mode`));
      this.showModeHelp();
    } else {
      console.log(chalk.red(`Invalid mode: ${mode}`));
      console.log(chalk.gray(`Valid modes: ${validModes.join(', ')}`));
    }
  }

  /**
   * Show available modes
   */
  showModes() {
    console.log(chalk.cyan.bold('\nAvailable Modes:'));
    console.log(chalk.gray('─'.repeat(40)));
    
    const modes = [
      { name: 'main', desc: 'General commands and mode switching' },
      { name: 'voice', desc: 'Voice synthesis and analysis commands' },
      { name: 'ai', desc: 'AI assistant and Cursor CLI integration' },
      { name: 'tabs', desc: 'Tab management and background processes' },
      { name: 'system', desc: 'System status and configuration' },
      { name: 'project', desc: 'Project creation and management' }
    ];

    modes.forEach(mode => {
      const current = mode.name === this.currentMode ? chalk.yellow('*') : ' ';
      console.log(chalk.white(`${current} ${mode.name.padEnd(8)} - ${mode.desc}`));
    });
    
    console.log(chalk.gray('─'.repeat(40)));
    console.log(chalk.gray('Use "mode <name>" to switch modes'));
  }

  /**
   * Show mode-specific help
   */
  showModeHelp() {
    switch (this.currentMode) {
      case 'main':
        this.showMainHelp();
        break;
      case 'voice':
        this.showVoiceHelp();
        break;
      case 'ai':
        this.showAIHelp();
        break;
      case 'tabs':
        this.showTabHelp();
        break;
      case 'system':
        this.showSystemHelp();
        break;
      case 'project':
        this.showProjectHelp();
        break;
    }
  }

  /**
   * Handle main mode commands
   */
  async handleMainCommand(command, args) {
    switch (command.toLowerCase()) {
      case 'help':
        this.showMainHelp();
        break;
      case 'modes':
        this.showModes();
        break;
      case 'clear':
        this.clearScreen();
        break;
      case 'exit':
      case 'quit':
        this.handleExit();
        break;
      case 'status':
        await this.runSystemCommand('status', args);
        break;
      case 'config':
        await this.runSystemCommand('config', args);
        break;
      default:
        // Try to run as voice command
        await this.handleVoiceCommand(command, args);
    }
  }

  /**
   * Handle voice mode commands
   */
  async handleVoiceCommand(command, args) {
    try {
      // Use the voice command module for voice-specific commands
      const voiceArgs = [command, ...args];
      this.voiceCommand.parse(['node', 'voice', ...voiceArgs]);
    } catch (error) {
      console.log(chalk.red(`Voice command error: ${error.message}`));
      console.log(chalk.gray('Type "help" for available voice commands'));
    }
  }

  /**
   * Handle AI mode commands
   */
  async handleAICommand(command, args) {
    switch (command.toLowerCase()) {
      case 'help':
        this.showAIHelp();
        break;
      case 'ask':
        await this.runAIAssistant(args.join(' '));
        break;
      case 'cursor':
        await this.runCursorCommand(args[0], args.slice(1));
        break;
      case 'docs':
        await this.runElevenCommand('docs', args);
        break;
      case 'explain':
        await this.runCursorCommand('explain', args);
        break;
      case 'refactor':
        await this.runCursorCommand('refactor', args);
        break;
      default:
        console.log(chalk.red(`Unknown AI command: ${command}`));
        console.log(chalk.gray('Type "help" for available AI commands'));
    }
  }

  /**
   * Handle tab mode commands
   */
  async handleTabCommand(command, args) {
    switch (command.toLowerCase()) {
      case 'help':
        this.showTabHelp();
        break;
      case 'list':
      case 'tabs':
        this.showTabs();
        break;
      case 'switch':
        this.switchTab(args[0]);
        break;
      case 'close':
        this.closeTab(args[0]);
        break;
      case 'new':
        await this.createNewTab(args);
        break;
      case 'run':
        await this.runInTab(args);
        break;
      default:
        console.log(chalk.red(`Unknown tab command: ${command}`));
        console.log(chalk.gray('Type "help" for available tab commands'));
    }
  }

  /**
   * Handle system mode commands
   */
  async handleSystemCommand(command, args) {
    switch (command.toLowerCase()) {
      case 'help':
        this.showSystemHelp();
        break;
      case 'status':
        await this.runSystemCommand('status', args);
        break;
      case 'config':
        await this.runSystemCommand('config', args);
        break;
      case 'advanced':
        await this.runElevenCommand('advanced', args);
        break;
      case 'health':
        await this.runSystemCommand('status', ['--api', '--cursor']);
        break;
      default:
        console.log(chalk.red(`Unknown system command: ${command}`));
        console.log(chalk.gray('Type "help" for available system commands'));
    }
  }

  /**
   * Handle project mode commands
   */
  async handleProjectCommand(command, args) {
    switch (command.toLowerCase()) {
      case 'help':
        this.showProjectHelp();
        break;
      case 'init':
      case 'create':
        await this.runElevenCommand('init', args);
        break;
      case 'templates':
        this.showTemplates();
        break;
      case 'docs':
        await this.runElevenCommand('docs', args);
        break;
      case 'test':
        await this.runElevenCommand('test', args);
        break;
      default:
        console.log(chalk.red(`Unknown project command: ${command}`));
        console.log(chalk.gray('Type "help" for available project commands'));
    }
  }

  /**
   * Run ElevenLabs command
   */
  async runElevenCommand(command, args = []) {
    try {
      console.log(chalk.green(`Running eleven ${command}...`));
      
      // For simple commands, run directly instead of using tabs
      if (['test', 'status', 'voices'].includes(command)) {
        return await this.runDirectCommand('eleven-classic', [command, ...args]);
      }
      
      // For complex commands, use tab manager
      const tab = await this.cursorTabManager.runElevenCommand(command, args, {});
      return tab;
    } catch (error) {
      console.log(chalk.red(`Failed to run eleven ${command}: ${error.message}`));
      throw error;
    }
  }

  /**
   * Run command directly without tabs
   */
  async runDirectCommand(command, args = []) {
    return new Promise((resolve, reject) => {
      const childProcess = spawn(command, args, {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });

      childProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Run Cursor CLI command
   */
  async runCursorCommand(command, args = []) {
    try {
      console.log(chalk.green(`Running cursor ${command}...`));
      const tab = await this.cursorTabManager.runCursorCommand(command, args, {});
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
      const tab = await this.cursorTabManager.runCursorCommand('ask', [prompt], {});
      return tab;
    } catch (error) {
      console.log(chalk.red(`Failed to run AI assistant: ${error.message}`));
      throw error;
    }
  }

  /**
   * Run system command
   */
  async runSystemCommand(command, args = []) {
    try {
      console.log(chalk.green(`Running system ${command}...`));
      const tab = await this.cursorTabManager.runElevenCommand(command, args, {});
      return tab;
    } catch (error) {
      console.log(chalk.red(`Failed to run system ${command}: ${error.message}`));
      throw error;
    }
  }

  /**
   * Create new tab
   */
  async createNewTab(args) {
    try {
      const [command, ...commandArgs] = args;
      if (!command) {
        console.log(chalk.red('Please specify a command to run in the new tab'));
        return;
      }

      const tab = await this.cursorTabManager.createTab({
        name: `tab-${command}`,
        command: command,
        args: commandArgs
      });

      this.activeTab = tab.id;
      console.log(chalk.green(`Created tab ${tab.id} running ${command}`));
    } catch (error) {
      console.log(chalk.red(`Failed to create tab: ${error.message}`));
    }
  }

  /**
   * Run command in tab
   */
  async runInTab(args) {
    try {
      const [tabId, command, ...commandArgs] = args;
      if (!tabId || !command) {
        console.log(chalk.red('Usage: run <tab-id> <command> [args...]'));
        return;
      }

      const tab = this.cursorTabManager.getTab(parseInt(tabId));
      if (!tab) {
        console.log(chalk.red(`Tab ${tabId} not found`));
        return;
      }

      // Send command to tab
      this.cursorTabManager.sendInput(`${command} ${commandArgs.join(' ')}`);
      console.log(chalk.green(`Sent command to tab ${tabId}`));
    } catch (error) {
      console.log(chalk.red(`Failed to run in tab: ${error.message}`));
    }
  }

  /**
   * Show tabs
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
      
      const active = tab.id === this.activeTab ? chalk.yellow('*') : ' ';
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
      this.activeTab = id;
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
      if (this.activeTab === id) {
        this.activeTab = null;
      }
      console.log(chalk.green(`Closed tab ${id}`));
    } catch (error) {
      console.log(chalk.red(`Failed to close tab: ${error.message}`));
    }
  }

  /**
   * Show templates
   */
  showTemplates() {
    console.log(chalk.cyan.bold('\nAvailable Project Templates:'));
    console.log(chalk.gray('─'.repeat(40)));
    
    const templates = [
      { name: 'voice-agent', desc: 'Basic Node.js voice agent' },
      { name: 'react-voice', desc: 'React app with voice synthesis' },
      { name: 'python-voice', desc: 'Python Flask voice bot' }
    ];

    templates.forEach(template => {
      console.log(chalk.white(`${template.name.padEnd(15)} - ${template.desc}`));
    });
    
    console.log(chalk.gray('─'.repeat(40)));
    console.log(chalk.gray('Use: init <project-name> --template <template-name>'));
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
   * Show help for different modes
   */
  showMainHelp() {
    console.log(chalk.cyan.bold('\nMain Mode Commands:'));
    console.log(chalk.white('\nGeneral:'));
    console.log(chalk.gray('  help               - Show this help'));
    console.log(chalk.gray('  modes              - Show available modes'));
    console.log(chalk.gray('  clear              - Clear screen'));
    console.log(chalk.gray('  exit/quit          - Exit CLI'));
    
    console.log(chalk.white('\nQuick Commands:'));
    console.log(chalk.gray('  status             - Show system status'));
    console.log(chalk.gray('  config             - Manage configuration'));
    
    console.log(chalk.gray('\nUse "mode <name>" to switch to specific modes'));
  }

  showVoiceHelp() {
    console.log(chalk.cyan.bold('\nVoice Mode Commands:'));
    console.log(chalk.white('\nVoice Synthesis:'));
    console.log(chalk.gray('  synthesize -t <text> -o <file>  - Synthesize text to speech'));
    console.log(chalk.gray('  transcribe -i <file>             - Transcribe audio to text'));
    console.log(chalk.gray('  clone -n <name> -f <files>       - Clone voice from samples'));
    console.log(chalk.gray('  list-voices                       - List available voices'));
    console.log(chalk.gray('  realtime -v <voice> -d <sec>     - Start real-time processing'));
    console.log(chalk.gray('  conversation -v <voice>          - Start voice conversation'));
    console.log(chalk.gray('  batch -f <file> -o <dir>         - Batch process texts'));
    console.log(chalk.gray('  test [-c <category>] [-r]        - Run voice tests'));
    console.log(chalk.gray('  interactive                       - Start interactive mode'));
    
    console.log(chalk.gray('\nUse "mode main" to return to main mode'));
  }

  showAIHelp() {
    console.log(chalk.cyan.bold('\nAI Mode Commands:'));
    console.log(chalk.white('\nAI Assistant:'));
    console.log(chalk.gray('  ask <prompt>       - Ask AI assistant'));
    console.log(chalk.gray('  explain <file>     - Explain code'));
    console.log(chalk.gray('  refactor <file>    - Refactor code'));
    
    console.log(chalk.white('\nDocumentation:'));
    console.log(chalk.gray('  docs [options]     - Generate documentation'));
    
    console.log(chalk.white('\nCursor CLI:'));
    console.log(chalk.gray('  cursor <command>   - Run Cursor CLI command'));
    
    console.log(chalk.gray('\nUse "mode main" to return to main mode'));
  }

  showTabHelp() {
    console.log(chalk.cyan.bold('\nTab Mode Commands:'));
    console.log(chalk.white('\nTab Management:'));
    console.log(chalk.gray('  list/tabs          - Show active tabs'));
    console.log(chalk.gray('  switch <id>        - Switch to tab'));
    console.log(chalk.gray('  close <id>         - Close tab'));
    console.log(chalk.gray('  new <command>      - Create new tab'));
    console.log(chalk.gray('  run <id> <cmd>     - Run command in tab'));
    
    console.log(chalk.gray('\nUse "mode main" to return to main mode'));
  }

  showSystemHelp() {
    console.log(chalk.cyan.bold('\nSystem Mode Commands:'));
    console.log(chalk.white('\nSystem Status:'));
    console.log(chalk.gray('  status             - Show system status'));
    console.log(chalk.gray('  health             - Quick health check'));
    console.log(chalk.gray('  config             - Manage configuration'));
    
    console.log(chalk.white('\nAdvanced:'));
    console.log(chalk.gray('  advanced [options] - Advanced features'));
    
    console.log(chalk.gray('\nUse "mode main" to return to main mode'));
  }

  showProjectHelp() {
    console.log(chalk.cyan.bold('\nProject Mode Commands:'));
    console.log(chalk.white('\nProject Management:'));
    console.log(chalk.gray('  init/create <name> - Create new project'));
    console.log(chalk.gray('  templates          - Show available templates'));
    console.log(chalk.gray('  docs [options]     - Generate documentation'));
    console.log(chalk.gray('  test [options]     - Test project'));
    
    console.log(chalk.gray('\nUse "mode main" to return to main mode'));
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
    console.log(chalk.yellow('\n\nExiting Eleven-CLI Universal Interface...'));
    
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
    console.log(chalk.yellow('\n\nSuspending Eleven-CLI Universal Interface...'));
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

// Start the universal CLI
if (require.main === module) {
  new UniversalElevenCLI();
}

module.exports = UniversalElevenCLI;