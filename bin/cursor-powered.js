#!/usr/bin/env node

/**
 * Eleven-CLI Cursor-Powered Interface (DEVELOPMENT ONLY)
 * Natural language interface powered by Cursor CLI
 * DO NOT PUSH TO PRODUCTION
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
 * Cursor-Powered Eleven CLI Interface
 * Natural language interface with animations and visual effects
 */
class CursorPoweredElevenCLI {
  constructor() {
    this.rl = null;
    this.isRunning = false;
    this.cursorAgent = null;
    this.animationInterval = null;
    this.currentStatus = 'idle';
    this.isProcessing = false;
    
    // Initialize
    this.initialize();
  }

  /**
   * Initialize the Cursor-powered CLI
   */
  async initialize() {
    try {
      // Load configuration
      configManager.loadConfig();
      
      // Check for Cursor CLI
      await this.checkCursorCLI();
      
      // Create readline interface
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: this.getPrompt()
      });

      // Setup event listeners
      this.setupEventListeners();
      
      // Show welcome animation
      await this.showWelcomeAnimation();
      
      // Start the interface
      this.start();
      
    } catch (error) {
      ErrorHandler.handle(error, 'Cursor-powered CLI initialization');
    }
  }

  /**
   * Check if Cursor CLI is available
   */
  async checkCursorCLI() {
    return new Promise((resolve, reject) => {
      exec('cursor-agent --version', (error, stdout, stderr) => {
        if (error) {
          reject(new Error('Cursor CLI not found. Please install Cursor CLI first.'));
          return;
        }
        
        this.cursorAgent = 'cursor-agent';
        logger.info(`Cursor CLI found: ${stdout.trim()}`);
        resolve(stdout.trim());
      });
    });
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
   * Show welcome animation
   */
  async showWelcomeAnimation() {
    console.clear();
    
    // Animated welcome message with boxen
    const welcomeBox = boxen(
      chalk.cyan.bold('🎧 Eleven-CLI Cursor-Powered Interface') + '\n' +
      chalk.gray('Powered by Cursor AI • Natural Language Voice Development') + '\n' +
      chalk.yellow('DEVELOPMENT ONLY - DO NOT PUSH TO PRODUCTION'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'cyan',
        backgroundColor: 'black'
      }
    );

    // Typewriter effect for the box
    const lines = welcomeBox.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (let j = 0; j < line.length; j++) {
        process.stdout.write(line[j]);
        await this.sleep(15);
      }
      console.log();
    }

    console.log();
    
    // Animated features with different colors
    const features = [
      { text: '🚀 Natural Language Commands', color: 'green' },
      { text: '🎯 AI-Powered Voice Development', color: 'blue' },
      { text: '⚡ Real-time Processing', color: 'yellow' },
      { text: '🎨 Beautiful Animations', color: 'magenta' },
      { text: '🤖 Cursor AI Integration', color: 'cyan' }
    ];

    for (const feature of features) {
      process.stdout.write('   ');
      const colorFn = chalk[feature.color] || chalk.white;
      for (let i = 0; i < feature.text.length; i++) {
        process.stdout.write(colorFn(feature.text[i]));
        await this.sleep(30);
      }
      console.log();
      await this.sleep(300);
    }

    console.log();
    
    // Animated examples
    const examples = [
      '💡 Try: "Create a voice bot that greets users"',
      '🎧 Try: "Test voice with Hello World"',
      '🤖 Try: "How do I optimize voice quality?"',
      '📚 Try: "Generate documentation for my project"'
    ];

    for (const example of examples) {
      process.stdout.write('   ');
      for (let i = 0; i < example.length; i++) {
        process.stdout.write(chalk.gray(example[i]));
        await this.sleep(25);
      }
      console.log();
      await this.sleep(150);
    }

    console.log();
    console.log(chalk.red.bold('⚠️  DEVELOPMENT MODE - NOT FOR PRODUCTION USE'));
    console.log();
  }

  /**
   * Get animated prompt
   */
  getPrompt() {
    const status = this.isProcessing ? '🤖' : '🎧';
    const animation = this.isProcessing ? this.getProcessingAnimation() : '●';
    return chalk.cyan(`${status} ${animation} `);
  }

  /**
   * Get processing animation
   */
  getProcessingAnimation() {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    return frames[Math.floor(Date.now() / 100) % frames.length];
  }

  /**
   * Start the interface
   */
  start() {
    this.isRunning = true;
    this.startStatusAnimation();
    this.rl.prompt();
  }

  /**
   * Start status animation
   */
  startStatusAnimation() {
    this.animationInterval = setInterval(() => {
      if (this.isProcessing) {
        // Update prompt with animation
        this.rl.setPrompt(this.getPrompt());
        this.rl.prompt(true);
      }
    }, 100);
  }

  /**
   * Handle user input
   */
  async handleInput(input) {
    if (!input) {
      this.rl.prompt();
      return;
    }

    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      this.handleExit();
      return;
    }

    if (input.toLowerCase() === 'clear') {
      console.clear();
      await this.showWelcomeAnimation();
      this.rl.prompt();
      return;
    }

    if (input.toLowerCase() === 'help') {
      this.showHelp();
      this.rl.prompt();
      return;
    }

    // Process natural language input
    await this.processNaturalLanguage(input);
  }

  /**
   * Process natural language input
   */
  async processNaturalLanguage(input) {
    this.isProcessing = true;
    this.currentStatus = 'processing';

    try {
      // Show processing animation
      console.log(chalk.yellow('\n🤖 Processing your request...'));
      
      // Analyze the input and determine what to do
      const intent = await this.analyzeIntent(input);
      
      // Execute the appropriate action
      await this.executeIntent(intent, input);
      
    } catch (error) {
      console.log(chalk.red(`\n❌ Error: ${error.message}`));
    } finally {
      this.isProcessing = false;
      this.currentStatus = 'idle';
      this.rl.prompt();
    }
  }

  /**
   * Analyze user intent
   */
  async analyzeIntent(input) {
    const lowerInput = input.toLowerCase();
    
    // Project-related intents (check this FIRST)
    if ((lowerInput.includes('create') || lowerInput.includes('build') || lowerInput.includes('make') || 
        lowerInput.includes('start') || lowerInput.includes('new') || lowerInput.includes('init')) &&
        (lowerInput.includes('project') || lowerInput.includes('app') || lowerInput.includes('bot') || 
         lowerInput.includes('assistant') || lowerInput.includes('agent') || lowerInput.includes('application'))) {
      return { type: 'project_create', name: this.extractProjectName(input) };
    }
    
    // Voice-related intents
    if (lowerInput.includes('voice') || lowerInput.includes('speak') || lowerInput.includes('audio') || 
        lowerInput.includes('tts') || lowerInput.includes('synthesis') || lowerInput.includes('sound')) {
      if (lowerInput.includes('test') || lowerInput.includes('try') || lowerInput.includes('generate')) {
        return { type: 'voice_test', text: this.extractText(input) };
      }
      if (lowerInput.includes('clone') || lowerInput.includes('copy') || lowerInput.includes('duplicate')) {
        return { type: 'voice_clone', file: this.extractFile(input) };
      }
      if (lowerInput.includes('analyze') || lowerInput.includes('check') || lowerInput.includes('review') || 
          lowerInput.includes('quality') || lowerInput.includes('performance')) {
        return { type: 'voice_analyze', voice: this.extractVoice(input) };
      }
      if (lowerInput.includes('tune') || lowerInput.includes('optimize') || lowerInput.includes('adjust') || 
          lowerInput.includes('settings') || lowerInput.includes('configure')) {
        return { type: 'voice_tune', voice: this.extractVoice(input) };
      }
      if (lowerInput.includes('list') || lowerInput.includes('show') || lowerInput.includes('available')) {
        return { type: 'voice_list' };
      }
      return { type: 'voice_general' };
    }

    // AI-related intents
    if (lowerInput.includes('ask') || lowerInput.includes('how') || lowerInput.includes('what') || 
        lowerInput.includes('explain') || lowerInput.includes('tell') || lowerInput.includes('help') ||
        lowerInput.includes('why') || lowerInput.includes('when') || lowerInput.includes('where')) {
      return { type: 'ai_ask', question: input };
    }

    // Documentation intents
    if (lowerInput.includes('documentation') || lowerInput.includes('docs') || lowerInput.includes('readme') ||
        lowerInput.includes('document') || lowerInput.includes('write') || lowerInput.includes('generate docs')) {
      return { type: 'docs_generate' };
    }

    // System intents
    if (lowerInput.includes('status') || lowerInput.includes('health') || lowerInput.includes('check system')) {
      return { type: 'system_status' };
    }
    if (lowerInput.includes('config') || lowerInput.includes('settings') || lowerInput.includes('configure')) {
      return { type: 'system_config' };
    }

    // Template intents (check before AI intents)
    if (lowerInput.includes('template') || lowerInput.includes('templates') || lowerInput.includes('show templates') ||
        lowerInput.includes('available templates') || lowerInput.includes('list templates')) {
      return { type: 'template_list' };
    }

    // Default to AI assistant
    return { type: 'ai_ask', question: input };
  }

  /**
   * Execute intent
   */
  async executeIntent(intent, originalInput) {
    switch (intent.type) {
      case 'voice_test':
        await this.testVoice(intent.text || 'Hello, this is a test of the voice synthesis system.');
        break;
      case 'voice_clone':
        await this.cloneVoice(intent.file);
        break;
      case 'voice_analyze':
        await this.analyzeVoice(intent.voice);
        break;
      case 'voice_tune':
        await this.tuneVoice(intent.voice);
        break;
      case 'voice_list':
        await this.listVoices();
        break;
      case 'project_create':
        await this.createProject(intent.name || 'my-voice-project');
        break;
      case 'ai_ask':
        await this.askAI(intent.question);
        break;
      case 'docs_generate':
        await this.generateDocs();
        break;
      case 'system_status':
        await this.showSystemStatus();
        break;
      case 'system_config':
        await this.showSystemConfig();
        break;
      case 'template_list':
        await this.showTemplates();
        break;
      case 'voice_general':
        await this.showVoiceHelp();
        break;
      default:
        await this.askAI(originalInput);
    }
  }

  /**
   * Test voice synthesis
   */
  async testVoice(text) {
    console.log(chalk.blue('\n🎧 Testing voice synthesis...'));
    console.log(chalk.gray(`Text: "${text}"`));
    
    try {
      // Run voice test command
      const result = await this.runCommand('test', ['--text', text]);
      console.log(chalk.green('\n✅ Voice synthesis completed!'));
    } catch (error) {
      console.log(chalk.red(`\n❌ Voice synthesis failed: ${error.message}`));
    }
  }

  /**
   * Clone voice
   */
  async cloneVoice(file) {
    console.log(chalk.blue('\n🎭 Cloning voice from audio...'));
    
    if (!file) {
      console.log(chalk.yellow('Please provide an audio file path.'));
      return;
    }
    
    try {
      const result = await this.runCommand('clone', ['--file', file]);
      console.log(chalk.green('\n✅ Voice cloning completed!'));
    } catch (error) {
      console.log(chalk.red(`\n❌ Voice cloning failed: ${error.message}`));
    }
  }

  /**
   * Analyze voice
   */
  async analyzeVoice(voiceId) {
    console.log(chalk.blue('\n🔍 Analyzing voice quality...'));
    
    try {
      const result = await this.runCommand('analyze', voiceId ? ['--voice', voiceId] : []);
      console.log(chalk.green('\n✅ Voice analysis completed!'));
    } catch (error) {
      console.log(chalk.red(`\n❌ Voice analysis failed: ${error.message}`));
    }
  }

  /**
   * Create project
   */
  async createProject(name) {
    console.log(chalk.blue(`\n🚀 Creating project: ${name}`));
    
    try {
      const result = await this.runCommand('init', [name, '--yes']);
      console.log(chalk.green(`\n✅ Project "${name}" created successfully!`));
      console.log(chalk.gray(`\nNext steps:`));
      console.log(chalk.gray(`  cd ${name}`));
      console.log(chalk.gray(`  cp .env.example .env`));
      console.log(chalk.gray(`  # Edit .env with your ElevenLabs API key`));
      console.log(chalk.gray(`  npm start`));
    } catch (error) {
      console.log(chalk.red(`\n❌ Project creation failed: ${error.message}`));
    }
  }

  /**
   * Ask AI assistant
   */
  async askAI(question) {
    console.log(chalk.blue('\n🤖 Asking AI assistant...'));
    
    try {
      const result = await this.runCursorCommand('ask', [question]);
      console.log(chalk.green('\n✅ AI response received!'));
    } catch (error) {
      console.log(chalk.red(`\n❌ AI request failed: ${error.message}`));
    }
  }

  /**
   * Generate documentation
   */
  async generateDocs() {
    console.log(chalk.blue('\n📚 Generating documentation...'));
    
    try {
      const result = await this.runCommand('docs', ['--project']);
      console.log(chalk.green('\n✅ Documentation generated!'));
    } catch (error) {
      console.log(chalk.red(`\n❌ Documentation generation failed: ${error.message}`));
    }
  }

  /**
   * Tune voice settings
   */
  async tuneVoice(voiceId) {
    console.log(chalk.blue('\n🎛️ Tuning voice settings...'));
    
    try {
      const result = await this.runCommand('tune', voiceId ? ['--voice', voiceId, '--interactive'] : ['--interactive']);
      console.log(chalk.green('\n✅ Voice tuning completed!'));
    } catch (error) {
      console.log(chalk.red(`\n❌ Voice tuning failed: ${error.message}`));
    }
  }

  /**
   * List available voices
   */
  async listVoices() {
    console.log(chalk.blue('\n🎵 Listing available voices...'));
    
    try {
      const result = await this.runCommand('test', ['--list-voices']);
      console.log(chalk.green('\n✅ Voice list retrieved!'));
    } catch (error) {
      console.log(chalk.red(`\n❌ Failed to list voices: ${error.message}`));
    }
  }

  /**
   * Show system status
   */
  async showSystemStatus() {
    console.log(chalk.blue('\n📊 Checking system status...'));
    
    try {
      const result = await this.runCommand('status');
      console.log(chalk.green('\n✅ System status retrieved!'));
    } catch (error) {
      console.log(chalk.red(`\n❌ Failed to get system status: ${error.message}`));
    }
  }

  /**
   * Show system configuration
   */
  async showSystemConfig() {
    console.log(chalk.blue('\n⚙️ Showing system configuration...'));
    
    try {
      const result = await this.runCommand('config', ['--show']);
      console.log(chalk.green('\n✅ Configuration retrieved!'));
    } catch (error) {
      console.log(chalk.red(`\n❌ Failed to get configuration: ${error.message}`));
    }
  }

  /**
   * Show available templates
   */
  async showTemplates() {
    console.log(chalk.blue('\n📋 Showing available templates...'));
    
    const templates = [
      { name: 'voice-agent', desc: 'Basic Node.js voice agent', color: 'green' },
      { name: 'react-voice', desc: 'React app with voice synthesis', color: 'blue' },
      { name: 'python-voice', desc: 'Python Flask voice bot', color: 'yellow' }
    ];

    console.log(chalk.cyan('\nAvailable Project Templates:'));
    console.log(chalk.gray('─'.repeat(50)));
    
    templates.forEach(template => {
      const colorFn = chalk[template.color] || chalk.white;
      console.log(colorFn(`  ${template.name.padEnd(15)} - ${template.desc}`));
    });
    
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.gray('Use: "Create a voice bot project with react-voice template"'));
  }

  /**
   * Show voice help
   */
  showVoiceHelp() {
    console.log(chalk.cyan('\n🎧 Voice Development Commands:'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.white('Try these natural language commands:'));
    console.log(chalk.gray('  • "Test voice with Hello World"'));
    console.log(chalk.gray('  • "Clone voice from audio.wav"'));
    console.log(chalk.gray('  • "Analyze voice quality"'));
    console.log(chalk.gray('  • "Tune voice settings"'));
    console.log(chalk.gray('  • "List available voices"'));
    console.log(chalk.gray('  • "Create a voice bot project"'));
    console.log(chalk.gray('  • "How do I optimize voice synthesis?"'));
    console.log(chalk.gray('  • "Show system status"'));
    console.log(chalk.gray('  • "Generate documentation"'));
    console.log(chalk.gray('─'.repeat(50)));
  }

  /**
   * Run ElevenLabs command
   */
  async runCommand(command, args = []) {
    return new Promise((resolve, reject) => {
      const commandPath = path.join(__dirname, 'index.js');
      const fullArgs = [command, ...args];
      
      const childProcess = spawn('node', [commandPath, ...fullArgs], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      let output = '';
      let errorOutput = '';

      childProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      childProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(errorOutput || `Command failed with code ${code}`));
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
    return new Promise((resolve, reject) => {
      const fullArgs = [command, ...args];
      
      const childProcess = spawn(this.cursorAgent, fullArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      let output = '';
      let errorOutput = '';

      childProcess.stdout.on('data', (data) => {
        output += data.toString();
        // Display output in real-time
        process.stdout.write(data);
      });

      childProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(errorOutput || `Cursor command failed with code ${code}`));
        }
      });

      childProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Extract text from input
   */
  extractText(input) {
    const match = input.match(/"([^"]+)"/);
    return match ? match[1] : 'Hello, this is a test of the voice synthesis system.';
  }

  /**
   * Extract file path from input
   */
  extractFile(input) {
    const match = input.match(/(\w+\.\w+)/);
    return match ? match[1] : null;
  }

  /**
   * Extract voice ID from input
   */
  extractVoice(input) {
    const match = input.match(/([A-Za-z0-9_-]{20,})/);
    return match ? match[1] : null;
  }

  /**
   * Extract project name from input
   */
  extractProjectName(input) {
    const match = input.match(/(?:create|build|make)\s+(?:a\s+)?(?:project|app|bot)\s+(?:called\s+)?([a-zA-Z0-9-_]+)/i);
    return match ? match[1] : 'my-voice-project';
  }

  /**
   * Show help
   */
  showHelp() {
    console.log(chalk.cyan.bold('\n🎧 Eleven-CLI Cursor-Powered Interface'));
    console.log(chalk.gray('─'.repeat(50)));
    
    console.log(chalk.white('\nNatural Language Commands:'));
    console.log(chalk.gray('  • "Create a voice bot project"'));
    console.log(chalk.gray('  • "Test voice with Hello World"'));
    console.log(chalk.gray('  • "Clone voice from audio.wav"'));
    console.log(chalk.gray('  • "Analyze voice quality"'));
    console.log(chalk.gray('  • "How do I optimize voice synthesis?"'));
    console.log(chalk.gray('  • "Generate documentation"'));
    
    console.log(chalk.white('\nDirect Commands:'));
    console.log(chalk.gray('  • help    - Show this help'));
    console.log(chalk.gray('  • clear   - Clear screen'));
    console.log(chalk.gray('  • exit    - Exit CLI'));
    
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.yellow('🔧 Development Mode - Not for production use'));
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle exit
   */
  handleExit() {
    console.log(chalk.yellow('\n\n👋 Exiting Eleven-CLI Cursor-Powered Interface...'));
    this.cleanup();
  }

  /**
   * Handle suspend
   */
  handleSuspend() {
    console.log(chalk.yellow('\n\n⏸️ Suspending Eleven-CLI Cursor-Powered Interface...'));
    console.log(chalk.gray('Use "fg" to resume.'));
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.isRunning = false;
    
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
    }
    
    if (this.rl) {
      this.rl.close();
    }
    
    process.exit(0);
  }
}

// Start the Cursor-powered CLI
if (require.main === module) {
  new CursorPoweredElevenCLI();
}

module.exports = CursorPoweredElevenCLI;