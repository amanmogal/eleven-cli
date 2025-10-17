const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk').default;
const { EventEmitter } = require('events');

// Import utilities
const Logger = require('./logger');
const ConfigManager = require('./config-manager');

const logger = new Logger();
const configManager = new ConfigManager();

/**
 * Cursor Tab Manager
 * Manages Cursor CLI execution in tabs similar to Cursor's interface
 */
class CursorTabManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.tabs = new Map();
    this.activeTab = null;
    this.tabCounter = 0;
    this.cursorPath = options.cursorPath || 'cursor-agent';
    this.projectPath = options.projectPath || process.cwd();
    this.isRunning = false;
    
    // Initialize
    this.initialize();
  }

  /**
   * Initialize the tab manager
   */
  async initialize() {
    try {
      // Check if Cursor CLI is available
      await this.checkCursorCLI();
      
      // Load configuration
      const config = configManager.loadConfig();
      this.cursorPath = config.cursorAgentPath || this.cursorPath;
      this.projectPath = config.cursorProjectPath || this.projectPath;
      
      this.isRunning = true;
      this.emit('ready');
      
    } catch (error) {
      logger.error(`Failed to initialize Cursor Tab Manager: ${error.message}`);
      this.emit('error', error);
    }
  }

  /**
   * Check if Cursor CLI is available
   */
  async checkCursorCLI() {
    return new Promise((resolve, reject) => {
      exec(`${this.cursorPath} --version`, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Cursor CLI not found: ${error.message}`));
          return;
        }
        
        logger.info(`Cursor CLI found: ${stdout.trim()}`);
        resolve(stdout.trim());
      });
    });
  }

  /**
   * Create a new tab with Cursor CLI
   */
  async createTab(options = {}) {
    try {
      const tabId = ++this.tabCounter;
      const tabName = options.name || `tab-${tabId}`;
      
      const tab = {
        id: tabId,
        name: tabName,
        command: options.command || 'help',
        args: options.args || [],
        process: null,
        status: 'starting',
        output: [],
        startTime: Date.now(),
        type: 'cursor',
        projectPath: this.projectPath
      };

      this.tabs.set(tabId, tab);
      this.activeTab = tabId;

      logger.info(`Creating Cursor tab ${tabId}: ${tabName}`);
      this.emit('tabCreated', tab);

      // Start the Cursor CLI process
      await this.startCursorProcess(tab);

      return tab;

    } catch (error) {
      logger.error(`Failed to create tab: ${error.message}`);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Start Cursor CLI process in tab
   */
  async startCursorProcess(tab) {
    return new Promise((resolve, reject) => {
      const args = [tab.command, ...tab.args];
      
      // Spawn Cursor CLI process
      const childProcess = spawn(this.cursorPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: tab.projectPath,
        env: { ...process.env, CURSOR_PROJECT_PATH: tab.projectPath }
      });

      tab.process = childProcess;
      tab.status = 'running';

      // Handle output
      childProcess.stdout.on('data', (data) => {
        const output = data.toString();
        tab.output.push({ type: 'stdout', data: output, timestamp: Date.now() });
        this.emit('output', tab, output, 'stdout');
      });

      childProcess.stderr.on('data', (data) => {
        const output = data.toString();
        tab.output.push({ type: 'stderr', data: output, timestamp: Date.now() });
        this.emit('output', tab, output, 'stderr');
      });

      // Handle process completion
      childProcess.on('close', (code) => {
        tab.status = code === 0 ? 'completed' : 'failed';
        tab.endTime = Date.now();
        tab.exitCode = code;
        
        logger.info(`Tab ${tab.id} completed with code ${code}`);
        this.emit('tabCompleted', tab);
        resolve();
      });

      childProcess.on('error', (error) => {
        tab.status = 'error';
        tab.error = error.message;
        logger.error(`Tab ${tab.id} error: ${error.message}`);
        this.emit('tabError', tab, error);
        reject(error);
      });

      // Send input to process if provided
      if (options.input) {
        childProcess.stdin.write(options.input);
        childProcess.stdin.end();
      }
    });
  }

  /**
   * Send input to active tab
   */
  sendInput(input) {
    if (!this.activeTab || !this.tabs.has(this.activeTab)) {
      throw new Error('No active tab');
    }

    const tab = this.tabs.get(this.activeTab);
    if (tab.process && tab.status === 'running') {
      tab.process.stdin.write(input + '\n');
    }
  }

  /**
   * Switch to tab
   */
  switchTab(tabId) {
    if (!this.tabs.has(tabId)) {
      throw new Error(`Tab ${tabId} not found`);
    }

    this.activeTab = tabId;
    this.emit('tabSwitched', tabId);
    logger.info(`Switched to tab ${tabId}`);
  }

  /**
   * Close tab
   */
  closeTab(tabId) {
    if (!this.tabs.has(tabId)) {
      throw new Error(`Tab ${tabId} not found`);
    }

    const tab = this.tabs.get(tabId);
    if (tab.process && tab.status === 'running') {
      tab.process.kill();
    }

    this.tabs.delete(tabId);
    
    // Adjust active tab if needed
    if (this.activeTab === tabId) {
      this.activeTab = this.tabs.size > 0 ? Math.min(...this.tabs.keys()) : null;
    }

    this.emit('tabClosed', tabId);
    logger.info(`Closed tab ${tabId}`);
  }

  /**
   * Get tab information
   */
  getTab(tabId) {
    return this.tabs.get(tabId);
  }

  /**
   * Get all tabs
   */
  getAllTabs() {
    return Array.from(this.tabs.values());
  }

  /**
   * Get active tab
   */
  getActiveTab() {
    return this.activeTab ? this.tabs.get(this.activeTab) : null;
  }

  /**
   * Run ElevenLabs command in Cursor tab
   */
  async runElevenCommand(command, args = [], options = {}) {
    try {
      // Use the global eleven-classic command instead of node
      const tab = await this.createTab({
        name: `eleven-${command}`,
        command: 'eleven-classic',
        args: [command, ...args],
        ...options
      });

      return tab;

    } catch (error) {
      logger.error(`Failed to run ElevenLabs command: ${error.message}`);
      throw error;
    }
  }

  /**
   * Run Cursor CLI command in tab
   */
  async runCursorCommand(command, args = [], options = {}) {
    try {
      const tab = await this.createTab({
        name: `cursor-${command}`,
        command: command,
        args: args,
        ...options
      });

      return tab;

    } catch (error) {
      logger.error(`Failed to run Cursor command: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate documentation using Cursor CLI
   */
  async generateDocs(options = {}) {
    try {
      const tab = await this.runElevenCommand('docs', [], {
        name: 'docs-generation',
        input: options.input || 'Generate comprehensive documentation for this project'
      });

      return tab;

    } catch (error) {
      logger.error(`Failed to generate docs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Test voice synthesis in tab
   */
  async testVoice(options = {}) {
    try {
      const args = [];
      if (options.text) args.push('--text', options.text);
      if (options.voice) args.push('--voice', options.voice);
      if (options.output) args.push('--output', options.output);

      const tab = await this.runElevenCommand('test', args, {
        name: 'voice-test'
      });

      return tab;

    } catch (error) {
      logger.error(`Failed to test voice: ${error.message}`);
      throw error;
    }
  }

  /**
   * Initialize project in tab
   */
  async initProject(projectName, options = {}) {
    try {
      const args = [projectName];
      if (options.template) args.push('--template', options.template);
      if (options.yes) args.push('--yes');
      if (options.output) args.push('--output', options.output);

      const tab = await this.runElevenCommand('init', args, {
        name: 'project-init'
      });

      return tab;

    } catch (error) {
      logger.error(`Failed to initialize project: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get tab status summary
   */
  getStatusSummary() {
    const tabs = this.getAllTabs();
    const summary = {
      total: tabs.length,
      running: tabs.filter(t => t.status === 'running').length,
      completed: tabs.filter(t => t.status === 'completed').length,
      failed: tabs.filter(t => t.status === 'failed').length,
      error: tabs.filter(t => t.status === 'error').length
    };

    return summary;
  }

  /**
   * Cleanup all tabs
   */
  cleanup() {
    this.tabs.forEach((tab, id) => {
      if (tab.process && tab.status === 'running') {
        tab.process.kill();
      }
    });

    this.tabs.clear();
    this.activeTab = null;
    this.isRunning = false;

    this.emit('cleanup');
    logger.info('Cursor Tab Manager cleaned up');
  }
}

module.exports = CursorTabManager;