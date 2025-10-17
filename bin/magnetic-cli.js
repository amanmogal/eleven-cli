#!/usr/bin/env node

/**
 * Eleven-CLI Magnetic Interface
 * Single, powerful CLI interface that automatically integrates with Cursor AI
 * Magnetic: Attractive, intuitive, and pulls you into productive workflows
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
const ora = require('ora').default;

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
 * Magnetic CLI Interface
 * Single, powerful interface that combines all ElevenLabs and Cursor functionality
 */
class MagneticElevenCLI {
  constructor() {
    this.cursorTabManager = null;
    this.rl = null;
    this.isRunning = false;
    this.commandHistory = [];
    this.historyIndex = -1;
    this.currentContext = 'main';
    this.tabs = new Map();
    this.activeTab = null;
    this.tabCounter = 0;

    // Magnetic features
    this.autoComplete = new Map();
    this.shortcuts = new Map();
    this.themes = new Map();
    this.plugins = new Map();

    // Initialize
    this.initialize();
  }

  /**
   * Initialize the magnetic CLI
   */
  async initialize() {
    try {
      // Load configuration
      configManager.loadConfig();

      // Initialize Cursor Tab Manager with auto-detection
      this.cursorTabManager = new CursorTabManager();
      await this.autoDetectCursor();

      // Wait for Cursor Tab Manager to be ready
      await new Promise((resolve, reject) => {
        this.cursorTabManager.on('ready', resolve);
        this.cursorTabManager.on('error', reject);
      });

      // Setup auto-complete
      this.setupAutoComplete();

      // Setup shortcuts
      this.setupShortcuts();

      // Setup themes
      this.setupThemes();

      // Create readline interface with magnetic styling
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: this.getMagneticPrompt(),
        completer: this.autoCompleter.bind(this)
      });

      // Setup event listeners
      this.setupEventListeners();

      // Show magnetic welcome
      this.showMagneticWelcome();

      // Start the interface
      this.start();

    } catch (error) {
      ErrorHandler.handle(error, 'Magnetic CLI initialization');
    }
  }

  /**
   * Auto-detect and configure Cursor CLI integration
   */
  async autoDetectCursor() {
    const spinner = ora('🔍 Detecting Cursor CLI...').start();

    try {
      // Try to find Cursor CLI in common locations
      const possiblePaths = [
        'cursor-agent',
        '/usr/local/bin/cursor-agent',
        '/opt/cursor-agent/cursor-agent',
        process.env.CURSOR_AGENT_PATH
      ].filter(Boolean);

      let cursorPath = null;

      for (const path of possiblePaths) {
        if (await this.checkCursorPath(path)) {
          cursorPath = path;
          break;
        }
      }

      if (cursorPath) {
        configManager.set('cursorAgentPath', cursorPath);
        spinner.succeed(`🎯 Cursor CLI detected at: ${cursorPath}`);
        logger.success('Auto-integration with Cursor AI enabled');
      } else {
        spinner.warn('⚠️ Cursor CLI not found - AI features will be limited');
        logger.warn('Install Cursor CLI for full AI integration');
      }

    } catch (error) {
      spinner.fail('❌ Failed to detect Cursor CLI');
      logger.error(`Cursor detection error: ${error.message}`);
    }
  }

  /**
   * Check if Cursor CLI path is valid
   */
  async checkCursorPath(path) {
    return new Promise((resolve) => {
      exec(`"${path}" --version`, (error, stdout, stderr) => {
        resolve(!error && stdout.trim());
      });
    });
  }

  /**
   * Setup intelligent auto-complete
   */
  setupAutoComplete() {
    // Command auto-complete
    this.autoComplete.set('commands', [
      'help', 'mode', 'modes', 'clear', 'exit', 'quit',
      'status', 'config', 'advanced', 'test', 'tune', 'clone',
      'analyze', 'docs', 'init', 'create', 'templates',
      'ask', 'explain', 'refactor', 'cursor', 'ai',
      'tabs', 'list', 'switch', 'close', 'new', 'run'
    ]);

    // Context-specific auto-complete
    this.autoComplete.set('voice', [
      'test', 'tune', 'clone', 'analyze', 'voices'
    ]);

    this.autoComplete.set('ai', [
      'ask', 'explain', 'refactor', 'docs', 'cursor'
    ]);

    this.autoComplete.set('project', [
      'init', 'create', 'templates', 'docs', 'test'
    ]);

    this.autoComplete.set('system', [
      'status', 'config', 'advanced', 'health'
    ]);
  }

  /**
   * Setup keyboard shortcuts
   */
  setupShortcuts() {
    this.shortcuts.set('Ctrl+R', 'Clear screen and show status');
    this.shortcuts.set('Ctrl+T', 'Show active tabs');
    this.shortcuts.set('Ctrl+A', 'Auto-complete current command');
    this.shortcuts.set('Ctrl+H', 'Show command history');
    this.shortcuts.set('Ctrl+M', 'Show magnetic tips');
  }

  /**
   * Setup color themes
   */
  setupThemes() {
    this.themes.set('default', {
      primary: chalk.cyan,
      secondary: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red,
      info: chalk.gray,
      accent: chalk.magenta
    });

    this.themes.set('dark', {
      primary: chalk.blue,
      secondary: chalk.cyan,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red,
      info: chalk.gray,
      accent: chalk.magenta
    });
  }

  /**
   * Auto-completer function for readline
   */
  autoCompleter(line) {
    const hits = this.autoComplete.get('commands')
      .filter(cmd => cmd.startsWith(line.toLowerCase()));

    return [hits.length ? hits : this.autoComplete.get('commands'), line];
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    this.rl.on('line', (input) => {
      this.handleMagneticInput(input.trim());
    });

    this.rl.on('close', () => {
      this.cleanup();
    });

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      this.handleMagneticExit();
    });

    // Handle Ctrl+Z
    process.on('SIGTSTP', () => {
      this.handleMagneticSuspend();
    });

    // Handle Cursor Tab Manager events
    if (this.cursorTabManager) {
      this.cursorTabManager.on('output', (tab, output, type) => {
        this.displayMagneticOutput(tab, output, type);
      });

      this.cursorTabManager.on('tabCreated', (tab) => {
        this.displayTabCreated(tab);
      });

      this.cursorTabManager.on('tabCompleted', (tab) => {
        this.displayTabCompleted(tab);
      });

      this.cursorTabManager.on('tabError', (tab, error) => {
        this.displayTabError(tab, error);
      });
    }
  }

  /**
   * Show magnetic welcome screen
   */
  showMagneticWelcome() {
    const welcomeMessage = boxen(
      chalk.cyan.bold('🎧 Eleven-CLI Magnetic Interface') + '\n' +
      chalk.gray('The ultimate voice development experience') + '\n' +
      chalk.magenta('✨ Auto-integrated with Cursor AI') + '\n' +
      chalk.blue('🚀 Magnetic: Attractive, intuitive, productive'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'cyan',
        backgroundColor: '#001122'
      }
    );

    console.log(welcomeMessage);

    // Show quick tips
    console.log(chalk.gray('\n💡 Quick Tips:'));
    console.log(chalk.cyan('  • Type "help" for commands'));
    console.log(chalk.cyan('  • Use "mode" to switch contexts'));
    console.log(chalk.cyan('  • Press Tab for auto-complete'));
    console.log(chalk.cyan('  • Use Ctrl+R for quick status'));

    // Show current integration status
    const cursorStatus = configManager.get('cursorAgentPath') ? '✅ Connected' : '⚠️ Not found';
    console.log(chalk.gray(`\n🤖 Cursor AI: ${cursorStatus}`));

    // Show active features
    console.log(chalk.gray('\n🎯 Active Features:'));
    console.log(chalk.green('  ✓ Voice Synthesis & Analysis'));
    console.log(chalk.green('  ✓ AI-Powered Documentation'));
    console.log(chalk.green('  ✓ Project Scaffolding'));
    console.log(chalk.green('  ✓ Background Task Management'));
    console.log(chalk.green('  ✓ Smart Auto-Complete'));
  }

  /**
   * Get magnetic prompt with context awareness
   */
  getMagneticPrompt() {
    const theme = this.themes.get('default');
    const contextIcon = this.getContextIcon();
    const tabInfo = this.activeTab ? ` [${this.activeTab.id}]` : '';

    return theme.primary(`eleven${contextIcon}${tabInfo}> `);
  }

  /**
   * Get context icon for prompt
   */
  getContextIcon() {
    const icons = {
      main: '',
      voice: '🎵',
      ai: '🤖',
      tabs: '📋',
      system: '⚙️',
      project: '🏗️'
    };

    return icons[this.currentContext] || '';
  }

  /**
   * Start the magnetic interface
   */
  start() {
    this.isRunning = true;
    this.rl.prompt();
  }

  /**
   * Handle magnetic input with intelligent routing
   */
  async handleMagneticInput(input) {
    if (!input) {
      this.rl.prompt();
      return;
    }

    // Add to history
    this.commandHistory.push(input);
    this.historyIndex = this.commandHistory.length;

    const [command, ...args] = input.split(' ');

    try {
      // Handle magnetic shortcuts
      if (command.startsWith('!')) {
        await this.handleMagneticShortcut(command, args);
        return;
      }

      // Handle magnetic commands
      if (command.startsWith('#')) {
        await this.handleMagneticCommand(command, args);
        return;
      }

      // Route based on current context
      switch (this.currentContext) {
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
      this.displayError(error);
    }

    this.rl.prompt();
  }

  /**
   * Handle main context commands
   */
  async handleMainCommand(command, args) {
    switch (command.toLowerCase()) {
      case 'help':
        this.showMagneticHelp();
        break;
      case 'mode':
      case 'modes':
        this.handleModeCommand(args);
        break;
      case 'clear':
        this.clearMagneticScreen();
        break;
      case 'exit':
      case 'quit':
        this.handleMagneticExit();
        break;
      case 'status':
        await this.runSystemCommand('status', args);
        break;
      case 'config':
        await this.runSystemCommand('config', args);
        break;
      case '!status':
        this.showQuickStatus();
        break;
      case '!tips':
        this.showMagneticTips();
        break;
      case '!history':
        this.showCommandHistory();
        break;
      default:
        // Try voice command as fallback
        await this.handleVoiceCommand(command, args);
    }
  }

  /**
   * Handle voice context commands
   */
  async handleVoiceCommand(command, args) {
    switch (command.toLowerCase()) {
      case 'help':
        this.showVoiceHelp();
        break;
      case 'test':
        await this.runElevenCommand('test', args);
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
      case 'voices':
        await this.runElevenCommand('test', ['--list-voices']);
        break;
      default:
        this.displayError(new Error(`Unknown voice command: ${command}`));
    }
  }

  /**
   * Handle AI context commands
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
        this.displayError(new Error(`Unknown AI command: ${command}`));
    }
  }

  /**
   * Handle tab context commands
   */
  async handleTabCommand(command, args) {
    switch (command.toLowerCase()) {
      case 'help':
        this.showTabHelp();
        break;
      case 'list':
      case 'tabs':
        this.showMagneticTabs();
        break;
      case 'switch':
        this.switchMagneticTab(args[0]);
        break;
      case 'close':
        this.closeMagneticTab(args[0]);
        break;
      case 'new':
        await this.createMagneticTab(args);
        break;
      case 'run':
        await this.runInMagneticTab(args);
        break;
      default:
        this.displayError(new Error(`Unknown tab command: ${command}`));
    }
  }

  /**
   * Handle system context commands
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
        this.displayError(new Error(`Unknown system command: ${command}`));
    }
  }

  /**
   * Handle project context commands
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
        this.showMagneticTemplates();
        break;
      case 'docs':
        await this.runElevenCommand('docs', args);
        break;
      case 'test':
        await this.runElevenCommand('test', args);
        break;
      default:
        this.displayError(new Error(`Unknown project command: ${command}`));
    }
  }

  /**
   * Handle magnetic shortcuts (!commands)
   */
  async handleMagneticShortcut(command, args) {
    switch (command) {
      case '!status':
        this.showQuickStatus();
        break;
      case '!clear':
        this.clearMagneticScreen();
        break;
      case '!tips':
        this.showMagneticTips();
        break;
      case '!history':
        this.showCommandHistory();
        break;
      case '!restart':
        await this.restartMagneticInterface();
        break;
      default:
        this.displayError(new Error(`Unknown shortcut: ${command}`));
    }
  }

  /**
   * Handle magnetic commands (#commands)
   */
  async handleMagneticCommand(command, args) {
    switch (command) {
      case '#theme':
        this.switchTheme(args[0]);
        break;
      case '#export':
        await this.exportCommandHistory();
        break;
      case '#import':
        await this.importCommandHistory();
        break;
      default:
        this.displayError(new Error(`Unknown magnetic command: ${command}`));
    }
  }

  /**
   * Handle mode switching
   */
  handleModeCommand(args) {
    if (args.length === 0) {
      this.showMagneticModes();
      return;
    }

    const mode = args[0].toLowerCase();
    const validModes = ['main', 'voice', 'ai', 'tabs', 'system', 'project'];

    if (validModes.includes(mode)) {
      this.currentContext = mode;
      this.displaySuccess(`Switched to ${mode} mode`);
      this.showContextHelp();
    } else {
      this.displayError(new Error(`Invalid mode: ${mode}`));
      console.log(chalk.gray(`Valid modes: ${validModes.join(', ')}`));
    }
  }

  /**
   * Show magnetic modes
   */
  showMagneticModes() {
    console.log(chalk.cyan.bold('\n🎯 Available Modes:'));
    console.log(chalk.gray('─'.repeat(50)));

    const modes = [
      { name: 'main', desc: 'General commands and shortcuts', icon: '🏠' },
      { name: 'voice', desc: 'Voice synthesis and analysis', icon: '🎵' },
      { name: 'ai', desc: 'AI assistant and Cursor integration', icon: '🤖' },
      { name: 'tabs', desc: 'Background task management', icon: '📋' },
      { name: 'system', desc: 'System status and configuration', icon: '⚙️' },
      { name: 'project', desc: 'Project creation and management', icon: '🏗️' }
    ];

    modes.forEach(mode => {
      const current = mode.name === this.currentContext ? chalk.yellow('●') : '○';
      const icon = mode.name === this.currentContext ? mode.icon : '  ';
      console.log(chalk.white(`${current} ${icon} ${mode.name.padEnd(8)} - ${mode.desc}`));
    });

    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.gray('Use "mode <name>" to switch modes'));
  }

  /**
   * Show context-specific help
   */
  showContextHelp() {
    switch (this.currentContext) {
      case 'main':
        this.showMagneticHelp();
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
   * Show main magnetic help
   */
  showMagneticHelp() {
    console.log(chalk.cyan.bold('\n🏠 Main Mode - Magnetic Commands:'));
    console.log(chalk.gray('─'.repeat(50)));

    console.log(chalk.white('\n🎯 Core Commands:'));
    console.log(chalk.gray('  help               - Show this help'));
    console.log(chalk.gray('  mode <name>        - Switch to mode'));
    console.log(chalk.gray('  clear              - Clear screen'));
    console.log(chalk.gray('  exit/quit          - Exit interface'));

    console.log(chalk.white('\n⚡ Magnetic Shortcuts:'));
    console.log(chalk.gray('  !status            - Quick system status'));
    console.log(chalk.gray('  !clear             - Clear screen'));
    console.log(chalk.gray('  !tips              - Show magnetic tips'));
    console.log(chalk.gray('  !history           - Command history'));
    console.log(chalk.gray('  !restart           - Restart interface'));

    console.log(chalk.white('\n🔧 Magnetic Commands:'));
    console.log(chalk.gray('  #theme <name>      - Switch theme'));
    console.log(chalk.gray('  #export            - Export history'));
    console.log(chalk.gray('  #import            - Import history'));

    console.log(chalk.gray('\n💡 Use "mode <name>" to access specific features'));
  }

  /**
   * Show voice help
   */
  showVoiceHelp() {
    console.log(chalk.cyan.bold('\n🎵 Voice Mode - Voice Commands:'));
    console.log(chalk.gray('─'.repeat(50)));

    console.log(chalk.white('\n🎤 Voice Synthesis:'));
    console.log(chalk.gray('  test [options]     - Test voice synthesis'));
    console.log(chalk.gray('  tune [options]     - Tune voice settings'));
    console.log(chalk.gray('  clone [options]    - Clone voice from audio'));
    console.log(chalk.gray('  analyze [options]  - Analyze voice quality'));
    console.log(chalk.gray('  voices             - List available voices'));
  }

  /**
   * Show AI help
   */
  showAIHelp() {
    console.log(chalk.cyan.bold('\n🤖 AI Mode - AI Commands:'));
    console.log(chalk.gray('─'.repeat(50)));

    console.log(chalk.white('\n🧠 AI Assistant:'));
    console.log(chalk.gray('  ask <prompt>       - Ask AI assistant'));
    console.log(chalk.gray('  explain <file>     - Explain code'));
    console.log(chalk.gray('  refactor <file>    - Refactor code'));

    console.log(chalk.white('\n📚 Documentation:'));
    console.log(chalk.gray('  docs [options]     - Generate documentation'));

    console.log(chalk.white('\n🎯 Cursor CLI:'));
    console.log(chalk.gray('  cursor <command>   - Run Cursor command'));
  }

  /**
   * Show tab help
   */
  showTabHelp() {
    console.log(chalk.cyan.bold('\n📋 Tab Mode - Background Tasks:'));
    console.log(chalk.gray('─'.repeat(50)));

    console.log(chalk.white('\n📑 Tab Management:'));
    console.log(chalk.gray('  list/tabs          - Show active tabs'));
    console.log(chalk.gray('  switch <id>        - Switch to tab'));
    console.log(chalk.gray('  close <id>         - Close tab'));
    console.log(chalk.gray('  new <command>      - Create new tab'));
    console.log(chalk.gray('  run <id> <cmd>     - Run command in tab'));
  }

  /**
   * Show system help
   */
  showSystemHelp() {
    console.log(chalk.cyan.bold('\n⚙️ System Mode - System Commands:'));
    console.log(chalk.gray('─'.repeat(50)));

    console.log(chalk.white('\n🔍 System Status:'));
    console.log(chalk.gray('  status             - Show system status'));
    console.log(chalk.gray('  health             - Quick health check'));
    console.log(chalk.gray('  config             - Manage configuration'));

    console.log(chalk.white('\n🚀 Advanced:'));
    console.log(chalk.gray('  advanced [options] - Advanced features'));
  }

  /**
   * Show project help
   */
  showProjectHelp() {
    console.log(chalk.cyan.bold('\n🏗️ Project Mode - Project Commands:'));
    console.log(chalk.gray('─'.repeat(50)));

    console.log(chalk.white('\n📁 Project Management:'));
    console.log(chalk.gray('  init/create <name> - Create new project'));
    console.log(chalk.gray('  templates          - Show available templates'));
    console.log(chalk.gray('  docs [options]     - Generate documentation'));
    console.log(chalk.gray('  test [options]     - Test project'));
  }

  /**
   * Show quick status
   */
  showQuickStatus() {
    const tabs = this.cursorTabManager ? this.cursorTabManager.getAllTabs() : [];
    const runningTabs = tabs.filter(t => t.status === 'running').length;

    console.log(chalk.cyan('\n⚡ Quick Status:'));
    console.log(chalk.gray('─'.repeat(30)));
    console.log(chalk.white(`Mode: ${this.currentContext}`));
    console.log(chalk.white(`Active Tabs: ${runningTabs}`));
    console.log(chalk.white(`History: ${this.commandHistory.length} commands`));
    console.log(chalk.gray('─'.repeat(30)));
  }

  /**
   * Show magnetic tips
   */
  showMagneticTips() {
    console.log(chalk.magenta.bold('\n✨ Magnetic Tips:'));
    console.log(chalk.gray('─'.repeat(40)));

    console.log(chalk.white('\n🎯 Productivity:'));
    console.log(chalk.gray('  • Use !status for quick system checks'));
    console.log(chalk.gray('  • Press Tab for intelligent auto-complete'));
    console.log(chalk.gray('  • Use modes to focus on specific tasks'));
    console.log(chalk.gray('  • Run long commands in background tabs'));

    console.log(chalk.white('\n🤖 AI Integration:'));
    console.log(chalk.gray('  • Cursor AI auto-detected and integrated'));
    console.log(chalk.gray('  • Use "mode ai" for AI assistance'));
    console.log(chalk.gray('  • Ask questions with "ask <question>"'));

    console.log(chalk.white('\n🎵 Voice Development:'));
    console.log(chalk.gray('  • All voice commands in "mode voice"'));
    console.log(chalk.gray('  • Use "test" to synthesize speech'));
    console.log(chalk.gray('  • Use "analyze" for voice optimization'));

    console.log(chalk.gray('─'.repeat(40)));
  }

  /**
   * Show command history
   */
  showCommandHistory() {
    if (this.commandHistory.length === 0) {
      console.log(chalk.gray('No command history'));
      return;
    }

    console.log(chalk.cyan.bold('\n📜 Command History:'));
    console.log(chalk.gray('─'.repeat(40)));

    this.commandHistory.slice(-10).forEach((cmd, index) => {
      const num = (this.commandHistory.length - 10 + index + 1).toString().padStart(3);
      console.log(chalk.gray(`${num}: ${cmd}`));
    });

    console.log(chalk.gray('─'.repeat(40)));
  }

  /**
   * Clear magnetic screen
   */
  clearMagneticScreen() {
    console.clear();
    this.showMagneticWelcome();
  }

  /**
   * Handle magnetic exit
   */
  handleMagneticExit() {
    console.log(chalk.yellow('\n\n🧲 Disconnecting from Eleven-CLI Magnetic Interface...'));

    // Cleanup Cursor Tab Manager
    if (this.cursorTabManager) {
      this.cursorTabManager.cleanup();
    }

    this.cleanup();
  }

  /**
   * Handle magnetic suspend
   */
  handleMagneticSuspend() {
    console.log(chalk.yellow('\n\n⏸️ Suspending Eleven-CLI Magnetic Interface...'));
    console.log(chalk.gray('Use "fg" to resume.'));
  }

  /**
   * Run ElevenLabs command
   */
  async runElevenCommand(command, args = []) {
    try {
      const tab = await this.cursorTabManager.runElevenCommand(command, args);
      return tab;
    } catch (error) {
      this.displayError(error);
      throw error;
    }
  }

  /**
   * Run Cursor CLI command
   */
  async runCursorCommand(command, args = []) {
    try {
      const tab = await this.cursorTabManager.runCursorCommand(command, args);
      return tab;
    } catch (error) {
      this.displayError(error);
      throw error;
    }
  }

  /**
   * Run AI assistant
   */
  async runAIAssistant(prompt) {
    try {
      const tab = await this.cursorTabManager.runCursorCommand('ask', [prompt]);
      return tab;
    } catch (error) {
      this.displayError(error);
      throw error;
    }
  }

  /**
   * Display success message
   */
  displaySuccess(message) {
    console.log(chalk.green(`✅ ${message}`));
  }

  /**
   * Display error message
   */
  displayError(error) {
    console.log(chalk.red(`❌ ${error.message}`));
  }

  /**
   * Display tab output
   */
  displayMagneticOutput(tab, output, type = 'stdout') {
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
   * Display tab created
   */
  displayTabCreated(tab) {
    console.log(chalk.green(`📋 Created tab ${tab.id}: ${tab.name}`));
  }

  /**
   * Display tab completed
   */
  displayTabCompleted(tab) {
    const status = tab.exitCode === 0 ? '✅' : '❌';
    console.log(chalk.gray(`\n${status} Tab ${tab.id} completed`));
  }

  /**
   * Display tab error
   */
  displayTabError(tab, error) {
    console.log(chalk.red(`❌ Tab ${tab.id} error: ${error.message}`));
  }

  /**
   * Show magnetic tabs
   */
  showMagneticTabs() {
    const tabs = this.cursorTabManager.getAllTabs();

    if (tabs.length === 0) {
      console.log(chalk.gray('No active tabs.'));
      return;
    }

    console.log(chalk.cyan.bold('\n📋 Active Tabs:'));
    console.log(chalk.gray('─'.repeat(60)));

    tabs.forEach((tab) => {
      const status = this.getMagneticStatusIcon(tab.status);
      const duration = tab.endTime ?
        `${Math.round((tab.endTime - tab.startTime) / 1000)}s` :
        `${Math.round((Date.now() - tab.startTime) / 1000)}s`;

      const active = tab.id === this.activeTab ? chalk.yellow('●') : '○';
      const type = tab.type === 'cursor' ? '[AI]' : '[VOICE]';
      console.log(chalk.white(`${active} ${tab.id}: ${type} ${tab.name} ${status} (${duration})`));
    });

    console.log(chalk.gray('─'.repeat(60)));
  }

  /**
   * Get magnetic status icon
   */
  getMagneticStatusIcon(status) {
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
   * Show magnetic templates
   */
  showMagneticTemplates() {
    console.log(chalk.cyan.bold('\n📁 Available Project Templates:'));
    console.log(chalk.gray('─'.repeat(50)));

    const templates = [
      { name: 'voice-agent', desc: 'Basic Node.js voice agent', icon: '🤖' },
      { name: 'react-voice', desc: 'React app with voice synthesis', icon: '⚛️' },
      { name: 'python-voice', desc: 'Python Flask voice bot', icon: '🐍' }
    ];

    templates.forEach(template => {
      console.log(chalk.white(`${template.icon} ${template.name.padEnd(15)} - ${template.desc}`));
    });

    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.gray('Use: init <project-name> --template <template-name>'));
  }

  /**
   * Switch theme
   */
  switchTheme(themeName) {
    if (this.themes.has(themeName)) {
      this.displaySuccess(`Switched to ${themeName} theme`);
    } else {
      this.displayError(new Error(`Unknown theme: ${themeName}`));
      console.log(chalk.gray(`Available themes: ${Array.from(this.themes.keys()).join(', ')}`));
    }
  }

  /**
   * Export command history
   */
  async exportCommandHistory() {
    try {
      const exportPath = path.join(projectDir, 'eleven-history.json');
      await fs.writeFile(exportPath, JSON.stringify({
        exportedAt: new Date().toISOString(),
        history: this.commandHistory
      }, null, 2));

      this.displaySuccess(`Command history exported to: ${exportPath}`);
    } catch (error) {
      this.displayError(error);
    }
  }

  /**
   * Import command history
   */
  async importCommandHistory() {
    try {
      const importPath = path.join(projectDir, 'eleven-history.json');

      if (!await fs.pathExists(importPath)) {
        this.displayError(new Error('History file not found'));
        return;
      }

      const data = await fs.readFile(importPath, 'utf8');
      const imported = JSON.parse(data);

      if (imported.history && Array.isArray(imported.history)) {
        this.commandHistory.push(...imported.history);
        this.displaySuccess(`Imported ${imported.history.length} commands from history`);
      } else {
        this.displayError(new Error('Invalid history file format'));
      }
    } catch (error) {
      this.displayError(error);
    }
  }

  /**
   * Restart magnetic interface
   */
  async restartMagneticInterface() {
    console.log(chalk.yellow('🔄 Restarting Eleven-CLI Magnetic Interface...'));

    // Cleanup
    if (this.cursorTabManager) {
      this.cursorTabManager.cleanup();
    }

    this.cleanup();

    // Restart
    setTimeout(() => {
      new MagneticElevenCLI();
    }, 1000);
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

// Start the magnetic CLI
if (require.main === module) {
  new MagneticElevenCLI();
}

module.exports = MagneticElevenCLI;
