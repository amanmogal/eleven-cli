/**
 * Voice Command Module
 * CLI commands for voice project functionality
 */

const { Command } = require('commander');
const VoiceProject = require('../voice');
const chalk = require('chalk');
const ora = require('ora');

class VoiceCommand {
  constructor() {
    this.program = new Command();
    this.voiceProject = null;
    this.setupCommands();
  }

  /**
   * Setup voice commands
   */
  setupCommands() {
    this.program
      .name('voice')
      .description('Voice processing and AI integration commands')
      .version('1.0.0');

    // Initialize voice project
    this.program
      .command('init')
      .description('Initialize voice project')
      .option('-k, --api-key <key>', 'ElevenLabs API key')
      .option('-o, --output-dir <dir>', 'Output directory', './output')
      .action(async (options) => {
        await this.initVoiceProject(options);
      });

    // Synthesize text to speech
    this.program
      .command('synthesize')
      .description('Synthesize text to speech')
      .requiredOption('-t, --text <text>', 'Text to synthesize')
      .option('-v, --voice <voiceId>', 'Voice ID to use')
      .option('-o, --output <file>', 'Output file path')
      .option('-s, --stability <value>', 'Voice stability (0.0-1.0)', '0.5')
      .option('-b, --similarity-boost <value>', 'Similarity boost (0.0-1.0)', '0.5')
      .action(async (options) => {
        await this.synthesizeText(options);
      });

    // Transcribe audio to text
    this.program
      .command('transcribe')
      .description('Transcribe audio to text')
      .requiredOption('-i, --input <file>', 'Input audio file')
      .option('-l, --language <lang>', 'Audio language', 'en')
      .option('-f, --format <format>', 'Response format', 'json')
      .action(async (options) => {
        await this.transcribeAudio(options);
      });

    // Clone voice
    this.program
      .command('clone')
      .description('Clone a voice from audio samples')
      .requiredOption('-n, --name <name>', 'Voice name')
      .requiredOption('-d, --description <desc>', 'Voice description')
      .requiredOption('-f, --files <files...>', 'Audio sample files')
      .action(async (options) => {
        await this.cloneVoice(options);
      });

    // List available voices
    this.program
      .command('list-voices')
      .description('List available voices')
      .option('-c, --category <category>', 'Filter by category')
      .action(async (options) => {
        await this.listVoices(options);
      });

    // Real-time voice processing
    this.program
      .command('realtime')
      .description('Start real-time voice processing')
      .option('-v, --voice <voiceId>', 'Voice ID to use')
      .option('-d, --duration <seconds>', 'Processing duration', '60')
      .action(async (options) => {
        await this.startRealTime(options);
      });

    // Voice conversation
    this.program
      .command('conversation')
      .description('Start voice conversation')
      .option('-v, --voice <voiceId>', 'Voice ID to use')
      .option('-t, --timeout <seconds>', 'Conversation timeout', '300')
      .action(async (options) => {
        await this.startConversation(options);
      });

    // Batch processing
    this.program
      .command('batch')
      .description('Batch process multiple texts')
      .requiredOption('-f, --file <file>', 'Text file with one text per line')
      .option('-v, --voice <voiceId>', 'Voice ID to use')
      .option('-o, --output-dir <dir>', 'Output directory', './output/batch')
      .action(async (options) => {
        await this.batchProcess(options);
      });

    // Test voice functionality
    this.program
      .command('test')
      .description('Test voice functionality')
      .option('-c, --category <category>', 'Test category (synthesis, recognition, cloning, realtime, performance, errors)')
      .option('-r, --report', 'Generate test report')
      .action(async (options) => {
        await this.runTests(options);
      });

    // Interactive mode
    this.program
      .command('interactive')
      .description('Start interactive voice mode')
      .action(async () => {
        await this.startInteractiveMode();
      });
  }

  /**
   * Initialize voice project
   * @param {Object} options - Command options
   */
  async initVoiceProject(options) {
    const spinner = ora('Initializing voice project...').start();
    
    try {
      this.voiceProject = new VoiceProject({
        apiKey: options.apiKey,
        outputDir: options.outputDir
      });
      
      await this.voiceProject.initialize();
      spinner.succeed('Voice project initialized successfully');
      
    } catch (error) {
      spinner.fail('Failed to initialize voice project');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Synthesize text to speech
   * @param {Object} options - Command options
   */
  async synthesizeText(options) {
    if (!this.voiceProject) {
      await this.initVoiceProject({});
    }

    const spinner = ora('Synthesizing text...').start();
    
    try {
      const voiceSettings = {
        stability: parseFloat(options.stability),
        similarityBoost: parseFloat(options.similarityBoost)
      };

      const outputPath = options.output || `./output/synthesis_${Date.now()}.mp3`;
      
      await this.voiceProject.synthesizeToFile(options.text, outputPath, {
        voiceId: options.voice,
        voiceSettings
      });
      
      spinner.succeed(`Audio saved to: ${outputPath}`);
      
    } catch (error) {
      spinner.fail('Synthesis failed');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Transcribe audio to text
   * @param {Object} options - Command options
   */
  async transcribeAudio(options) {
    if (!this.voiceProject) {
      await this.initVoiceProject({});
    }

    const spinner = ora('Transcribing audio...').start();
    
    try {
      const result = await this.voiceProject.transcribe(options.input, {
        language: options.language,
        responseFormat: options.format
      });
      
      spinner.succeed('Transcription complete');
      console.log(chalk.green('Transcription:'), result.text);
      
    } catch (error) {
      spinner.fail('Transcription failed');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Clone voice
   * @param {Object} options - Command options
   */
  async cloneVoice(options) {
    if (!this.voiceProject) {
      await this.initVoiceProject({});
    }

    const spinner = ora('Cloning voice...').start();
    
    try {
      const voiceData = {
        name: options.name,
        description: options.description,
        audioFiles: options.files
      };
      
      const result = await this.voiceProject.cloneVoice(voiceData);
      
      spinner.succeed('Voice cloned successfully');
      console.log(chalk.green('Voice ID:'), result.voice_id);
      
    } catch (error) {
      spinner.fail('Voice cloning failed');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  }

  /**
   * List available voices
   * @param {Object} options - Command options
   */
  async listVoices(options) {
    if (!this.voiceProject) {
      await this.initVoiceProject({});
    }

    const spinner = ora('Fetching voices...').start();
    
    try {
      const voices = await this.voiceProject.getVoices();
      
      spinner.succeed(`Found ${voices.length} voices`);
      
      const filteredVoices = options.category 
        ? voices.filter(v => v.category === options.category)
        : voices;
      
      this.voiceProject.ui.showVoiceList(filteredVoices);
      
    } catch (error) {
      spinner.fail('Failed to fetch voices');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Start real-time voice processing
   * @param {Object} options - Command options
   */
  async startRealTime(options) {
    if (!this.voiceProject) {
      await this.initVoiceProject({});
    }

    console.log(chalk.blue('Starting real-time voice processing...'));
    
    try {
      await this.voiceProject.startRealTime({
        voiceId: options.voice,
        duration: parseInt(options.duration) * 1000
      });
      
      console.log(chalk.green('Real-time processing started. Press Ctrl+C to stop.'));
      
      // Keep process alive
      process.on('SIGINT', () => {
        this.voiceProject.stopRealTime();
        console.log(chalk.yellow('\nReal-time processing stopped.'));
        process.exit(0);
      });
      
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Start voice conversation
   * @param {Object} options - Command options
   */
  async startConversation(options) {
    if (!this.voiceProject) {
      await this.initVoiceProject({});
    }

    console.log(chalk.blue('Starting voice conversation...'));
    
    try {
      await this.voiceProject.startConversation({
        voiceId: options.voice,
        maxDuration: parseInt(options.timeout) * 1000
      });
      
      console.log(chalk.green('Conversation started. Press Ctrl+C to stop.'));
      
      // Keep process alive
      process.on('SIGINT', () => {
        this.voiceProject.stopConversation();
        console.log(chalk.yellow('\nConversation stopped.'));
        process.exit(0);
      });
      
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Batch process texts
   * @param {Object} options - Command options
   */
  async batchProcess(options) {
    if (!this.voiceProject) {
      await this.initVoiceProject({});
    }

    const spinner = ora('Processing batch...').start();
    
    try {
      const fs = require('fs-extra');
      const texts = (await fs.readFile(options.file, 'utf8'))
        .split('\n')
        .filter(line => line.trim());
      
      const results = await this.voiceProject.batchProcess(texts, {
        voiceId: options.voice,
        outputDir: options.outputDir
      });
      
      spinner.succeed(`Processed ${results.length} texts`);
      console.log(chalk.green('Output files:'));
      results.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file}`);
      });
      
    } catch (error) {
      spinner.fail('Batch processing failed');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Run voice tests
   * @param {Object} options - Command options
   */
  async runTests(options) {
    if (!this.voiceProject) {
      await this.initVoiceProject({});
    }

    const spinner = ora('Running voice tests...').start();
    
    try {
      const VoiceTesting = require('../voice/voice-testing');
      const testing = new VoiceTesting();
      
      const summary = options.category 
        ? await testing.runTestCategory(options.category)
        : await testing.runAllTests();
      
      spinner.succeed('Tests completed');
      
      console.log(chalk.blue('\nTest Results:'));
      console.log(`  Total: ${summary.total}`);
      console.log(`  Passed: ${chalk.green(summary.passed)}`);
      console.log(`  Failed: ${chalk.red(summary.failed)}`);
      console.log(`  Success Rate: ${summary.successRate.toFixed(1)}%`);
      console.log(`  Duration: ${summary.totalDuration}ms`);
      
      if (options.report) {
        const reportPath = await testing.generateTestReport(summary);
        console.log(chalk.green(`\nTest report saved to: ${reportPath}`));
      }
      
    } catch (error) {
      spinner.fail('Tests failed');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Start interactive mode
   */
  async startInteractiveMode() {
    if (!this.voiceProject) {
      await this.initVoiceProject({});
    }

    console.log(chalk.blue('Starting interactive voice mode...'));
    console.log(chalk.gray('Type "help" for available commands, "exit" to quit.\n'));
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const prompt = () => {
      rl.question(chalk.cyan('voice> '), async (input) => {
        const [command, ...args] = input.trim().split(' ');
        
        try {
          switch (command.toLowerCase()) {
            case 'help':
              this.showInteractiveHelp();
              break;
            case 'synthesize':
              await this.interactiveSynthesize(args.join(' '));
              break;
            case 'transcribe':
              await this.interactiveTranscribe(args[0]);
              break;
            case 'voices':
              await this.interactiveListVoices();
              break;
            case 'status':
              this.showStatus();
              break;
            case 'exit':
            case 'quit':
              rl.close();
              return;
            default:
              console.log(chalk.yellow('Unknown command. Type "help" for available commands.'));
          }
        } catch (error) {
          console.error(chalk.red('Error:'), error.message);
        }
        
        prompt();
      });
    };
    
    prompt();
  }

  /**
   * Show interactive help
   */
  showInteractiveHelp() {
    console.log(chalk.blue('\nAvailable Commands:'));
    console.log('  synthesize <text>  - Synthesize text to speech');
    console.log('  transcribe <file>  - Transcribe audio file');
    console.log('  voices            - List available voices');
    console.log('  status            - Show project status');
    console.log('  help              - Show this help');
    console.log('  exit              - Exit interactive mode\n');
  }

  /**
   * Interactive synthesize
   * @param {string} text - Text to synthesize
   */
  async interactiveSynthesize(text) {
    if (!text) {
      console.log(chalk.yellow('Please provide text to synthesize.'));
      return;
    }
    
    try {
      const outputPath = await this.voiceProject.interactiveSynthesis();
      console.log(chalk.green(`Audio saved to: ${outputPath}`));
    } catch (error) {
      console.error(chalk.red('Synthesis failed:'), error.message);
    }
  }

  /**
   * Interactive transcribe
   * @param {string} filePath - Audio file path
   */
  async interactiveTranscribe(filePath) {
    if (!filePath) {
      console.log(chalk.yellow('Please provide audio file path.'));
      return;
    }
    
    try {
      const result = await this.voiceProject.transcribe(filePath);
      console.log(chalk.green('Transcription:'), result.text);
    } catch (error) {
      console.error(chalk.red('Transcription failed:'), error.message);
    }
  }

  /**
   * Interactive list voices
   */
  async interactiveListVoices() {
    try {
      const voices = await this.voiceProject.getVoices();
      this.voiceProject.ui.showVoiceList(voices);
    } catch (error) {
      console.error(chalk.red('Failed to fetch voices:'), error.message);
    }
  }

  /**
   * Show project status
   */
  showStatus() {
    const status = this.voiceProject.getStatus();
    this.voiceProject.ui.showVoiceStatus(status);
  }

  /**
   * Parse command line arguments
   * @param {Array} args - Command line arguments
   */
  parse(args) {
    this.program.parse(args);
  }
}

module.exports = VoiceCommand;