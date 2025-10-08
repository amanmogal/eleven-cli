const inquirer = require('inquirer');
const chalk = require('chalk').default;
const ora = require('ora').default;
const path = require('path');
const validateNpmPackageName = require('validate-npm-package-name');

// Import utilities
const Logger = require('../lib/logger');
const FileManager = require('../lib/file-manager');
const ConfigManager = require('../lib/config-manager');
const ErrorHandler = require('../lib/error-handler');
const TemplateManager = require('../lib/template-manager');

const logger = new Logger();
const fileManager = new FileManager();
const configManager = new ConfigManager();
const templateManager = new TemplateManager();

// Voice options with detailed information
const VOICE_OPTIONS = [
  { 
    name: 'Bella (Female, American, Clear)', 
    value: 'EXAVITQu4vr4xnSDxMaL',
    description: 'Clear, professional female voice'
  },
  { 
    name: 'Antoni (Male, American, Deep)', 
    value: 'ErXwobaYiN019PkySvjV',
    description: 'Deep, authoritative male voice'
  },
  { 
    name: 'Elli (Female, American, Friendly)', 
    value: 'MF3mGyEYCl7XYWbV9V6O',
    description: 'Friendly, conversational female voice'
  },
  { 
    name: 'Domi (Female, American, Energetic)', 
    value: 'AZnzlk1XvdvUeBnXmlld',
    description: 'Energetic, upbeat female voice'
  },
  { 
    name: 'Jane (Female, American, Calm)', 
    value: 'XB0fDUnXU5TxlolQwKzX',
    description: 'Calm, soothing female voice'
  },
  { 
    name: 'Josh (Male, American, Casual)', 
    value: 'TxGEqnHWrfWFTfGW9XjX',
    description: 'Casual, approachable male voice'
  }
];

// Get template options from template manager
function getTemplateOptions() {
  const templates = templateManager.getAvailableTemplates();
  return templates.map(template => ({
    name: `${template.name} (${template.language}/${template.framework})`,
    value: template.id,
    description: template.description
  }));
}

/**
 * Prompt for project details with validation
 * @param {Object} options - Command options
 * @returns {Promise<Object>} Project configuration
 */
async function promptForProjectDetails(options = {}) {
  const questions = [
    {
      type: 'input',
      name: 'projectName',
      message: 'What is your project name?',
      default: 'my-voice-agent',
      validate: (input) => {
        if (!input || !input.trim()) {
          return 'Project name is required';
        }
        
        const trimmed = input.trim();
        if (trimmed.length < 2) {
          return 'Project name must be at least 2 characters long';
        }
        
        if (trimmed.length > 50) {
          return 'Project name must be less than 50 characters';
        }
        
        // Validate npm package name
        const validation = validateNpmPackageName(trimmed);
        if (!validation.validForNewPackages) {
          return `Invalid project name: ${validation.errors?.join(', ') || 'Invalid format'}`;
        }
        
        return true;
      },
      filter: (input) => input.trim()
    },
    {
      type: 'input',
      name: 'description',
      message: 'Project description:',
      default: 'A voice agent built with ElevenLabs and Cursor AI',
      validate: (input) => {
        if (!input || !input.trim()) {
          return 'Description is required';
        }
        if (input.length > 200) {
          return 'Description must be less than 200 characters';
        }
        return true;
      },
      filter: (input) => input.trim()
    },
    {
      type: 'list',
      name: 'template',
      message: 'Choose a project template:',
      choices: getTemplateOptions().map(template => ({
        name: `${template.name} - ${template.description}`,
        value: template.value
      })),
      default: options.template || 'voice-agent'
    },
    {
      type: 'list',
      name: 'voice',
      message: 'Choose a default voice:',
      choices: VOICE_OPTIONS.map(voice => ({
        name: `${voice.name} - ${voice.description}`,
        value: voice.voice
      })),
      default: options.voice || 'EXAVITQu4vr4xnSDxMaL'
    },
    {
      type: 'input',
      name: 'author',
      message: 'Author name:',
      default: process.env.USER || process.env.USERNAME || 'Developer',
      validate: (input) => {
        if (!input || !input.trim()) {
          return 'Author name is required';
        }
        return true;
      },
      filter: (input) => input.trim()
    },
    {
      type: 'input',
      name: 'version',
      message: 'Initial version:',
      default: '0.1.0',
      validate: (input) => {
        if (!input || !input.trim()) {
          return 'Version is required';
        }
        // Basic semver validation
        const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
        if (!semverRegex.test(input.trim())) {
          return 'Version must follow semantic versioning (e.g., 1.0.0)';
        }
        return true;
      },
      filter: (input) => input.trim()
    },
    {
      type: 'confirm',
      name: 'installDeps',
      message: 'Install dependencies automatically?',
      default: true
    }
  ];

  return await inquirer.prompt(questions);
}

/**
 * Create project directory structure
 * @param {string} projectPath - Project root path
 * @param {Object} config - Project configuration
 * @returns {Promise<void>}
 */
async function createProjectStructure(projectPath, config) {
  const spinner = ora('Creating project structure...').start();
  
  try {
    // Create main directories
    await fileManager.ensureDir(projectPath);
    await fileManager.ensureDir(path.join(projectPath, 'src'));
    await fileManager.ensureDir(path.join(projectPath, 'tests'));
    await fileManager.ensureDir(path.join(projectPath, 'docs'));
    await fileManager.ensureDir(path.join(projectPath, 'assets'));
    await fileManager.ensureDir(path.join(projectPath, 'output'));

    spinner.succeed('Project structure created');
  } catch (error) {
    spinner.fail('Failed to create project structure');
    throw error;
  }
}

/**
 * Generate package.json for the project
 * @param {string} projectPath - Project root path
 * @param {Object} config - Project configuration
 * @returns {Promise<void>}
 */
async function generatePackageJson(projectPath, config) {
  const packageJson = {
    name: config.projectName,
    version: config.version,
    description: config.description,
    main: 'src/index.js',
    scripts: {
      start: 'node src/index.js',
      test: 'jest',
      dev: 'nodemon src/index.js',
      lint: 'eslint src/ tests/',
      'lint:fix': 'eslint src/ tests/ --fix'
    },
    dependencies: {
      'elevenlabs': '^0.1.0',
      'axios': '^1.6.2',
      'dotenv': '^16.3.1'
    },
    devDependencies: {
      'jest': '^29.7.0',
      'nodemon': '^3.0.2',
      'eslint': '^8.55.0'
    },
    author: config.author,
    license: 'MIT',
    keywords: ['voice', 'ai', 'elevenlabs', 'tts', 'voice-agent'],
    engines: {
      node: '>=16.0.0'
    }
  };

  await fileManager.writeFile(
    path.join(projectPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
}

/**
 * Generate main index.js file
 * @param {string} projectPath - Project root path
 * @param {Object} config - Project configuration
 * @returns {Promise<void>}
 */
async function generateIndexFile(projectPath, config) {
  const indexContent = `#!/usr/bin/env node
/**
 * ${config.projectName}
 * ${config.description}
 * 
 * Generated by eleven-cursor CLI
 * Created: ${new Date().toISOString()}
 */

require('dotenv').config();
const { ElevenLabsClient } = require('elevenlabs');

// Initialize ElevenLabs client
const client = new ElevenLabsClient({
  apiKey: process.env.ELEVEN_API_KEY
});

// Voice configuration
const VOICE_CONFIG = {
  voiceId: '${config.voice}',
  settings: {
    stability: 0.75,
    similarity_boost: 0.75,
    style: 0.0,
    use_speaker_boost: true
  }
};

/**
 * Generate voice from text
 * @param {string} text - Text to synthesize
 * @param {string} outputPath - Output file path
 * @returns {Promise<void>}
 */
async function generateVoice(text, outputPath = 'output/voice.mp3') {
  try {
    console.log('🎧 Generating voice...');
    console.log(\`Text: "\${text}"\`);
    console.log(\`Voice: \${VOICE_CONFIG.voiceId}\`);
    
    const audio = await client.generate({
      voice: VOICE_CONFIG.voiceId,
      text: text,
      voice_settings: VOICE_CONFIG.settings
    });
    
    // Save audio to file
    const fs = require('fs');
    const path = require('path');
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write audio buffer to file
    fs.writeFileSync(outputPath, audio);
    
    console.log(\`✅ Voice generated successfully: \${outputPath}\`);
  } catch (error) {
    console.error('❌ Error generating voice:', error.message);
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🎧 Voice Agent Started');
  console.log(\`Project: \${process.env.npm_package_name || '${config.projectName}'}\`);
  
  // Example usage
  const sampleText = "Hello! This is your voice agent speaking. Welcome to the future of voice AI!";
  
  try {
    await generateVoice(sampleText);
    console.log('\\n🎉 Voice agent is working correctly!');
  } catch (error) {
    console.error('\\n❌ Voice agent failed:', error.message);
    process.exit(1);
  }
}

// Run main function if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  generateVoice,
  VOICE_CONFIG
};
`;

  await fileManager.writeFile(
    path.join(projectPath, 'src/index.js'),
    indexContent
  );
}

/**
 * Generate environment configuration files
 * @param {string} projectPath - Project root path
 * @param {Object} config - Project configuration
 * @returns {Promise<void>}
 */
async function generateEnvFiles(projectPath, config) {
  // .env.example
  const envExample = `# ElevenLabs API Configuration
# Get your API key from: https://elevenlabs.io/app/settings/api-keys
ELEVEN_API_KEY=your_elevenlabs_api_key_here

# Voice Configuration
DEFAULT_VOICE_ID=${config.voice}

# Application Configuration
DEBUG=false
LOG_LEVEL=info
NODE_ENV=development

# Output Configuration
OUTPUT_DIR=./output
TEMP_DIR=./.temp
`;

  await fileManager.writeFile(
    path.join(projectPath, '.env.example'),
    envExample
  );

  // .gitignore
  const gitignore = `# Dependencies
node_modules/
npm-debug.log*

# Environment variables
.env
.env.local

# Generated files
output/
*.mp3
*.wav
*.m4a

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log

# Temporary files
.temp/
`;

  await fileManager.writeFile(
    path.join(projectPath, '.gitignore'),
    gitignore
  );
}

/**
 * Generate README.md
 * @param {string} projectPath - Project root path
 * @param {Object} config - Project configuration
 * @returns {Promise<void>}
 */
async function generateReadme(projectPath, config) {
  const readmeContent = `# ${config.projectName}

${config.description}

## Quick Start

1. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Set up environment variables:**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your ElevenLabs API key
   \`\`\`

3. **Run the voice agent:**
   \`\`\`bash
   npm start
   \`\`\`

## Features

- 🎧 Voice synthesis with ElevenLabs
- ⚡ Easy configuration and setup
- 🚀 Built with Node.js
- 📝 Generated by eleven-cursor CLI

## Configuration

Edit \`src/index.js\` to customize your voice agent behavior.

### Voice Settings

The default voice settings can be modified in the \`VOICE_CONFIG\` object:

\`\`\`javascript
const VOICE_CONFIG = {
  voiceId: '${config.voice}',
  settings: {
    stability: 0.75,        // 0.0 - 1.0
    similarity_boost: 0.75, // 0.0 - 1.0
    style: 0.0,             // 0.0 - 1.0
    use_speaker_boost: true
  }
};
\`\`\`

## API Usage

\`\`\`javascript
const { generateVoice } = require('./src/index');

// Generate voice from text
await generateVoice('Hello, world!', 'output/hello.mp3');
\`\`\`

## Development

\`\`\`bash
# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint
\`\`\`

## License

MIT

---

Generated by [eleven-cursor](https://github.com/silver-team/eleven-cursor) CLI
`;

  await fileManager.writeFile(
    path.join(projectPath, 'README.md'),
    readmeContent
  );
}

/**
 * Install project dependencies
 * @param {string} projectPath - Project root path
 * @returns {Promise<void>}
 */
async function installDependencies(projectPath) {
  const spinner = ora('Installing dependencies...').start();
  
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);

    await execAsync('npm install', { cwd: projectPath });
    spinner.succeed('Dependencies installed');
  } catch (error) {
    spinner.fail('Failed to install dependencies');
    logger.warn('You may need to run "npm install" manually');
    throw error;
  }
}

/**
 * Save project configuration
 * @param {string} projectPath - Project root path
 * @param {Object} config - Project configuration
 * @returns {Promise<void>}
 */
async function saveProjectConfig(projectPath, config) {
  const projectConfig = {
    projectName: config.projectName,
    description: config.description,
    template: config.template,
    voice: config.voice,
    author: config.author,
    version: config.version,
    createdAt: new Date().toISOString(),
    generatedBy: 'eleven-cursor',
    generatedVersion: '0.1.0'
  };

  await fileManager.writeFile(
    path.join(projectPath, 'eleven-config.json'),
    JSON.stringify(projectConfig, null, 2)
  );
}

/**
 * Main init command function
 * @param {Object} options - Command options
 * @returns {Promise<void>}
 */
async function initCommand(options = {}) {
  try {
    logger.info('🎧 Initializing new voice agent project...');

    // Get project details
    const config = options.yes ? {
      projectName: options.projectName || 'my-voice-agent',
      description: 'A voice agent built with ElevenLabs and Cursor AI',
      template: options.template || 'voice-agent',
      voice: options.voice || 'EXAVITQu4vr4xnSDxMaL',
      author: options.author || process.env.USER || 'Developer',
      version: '0.1.0',
      installDeps: true
    } : await promptForProjectDetails(options);

    const projectPath = path.resolve(options.output || config.projectName);

    // Check if project already exists
    if (await fileManager.exists(projectPath)) {
      throw ErrorHandler.createError(
        `Project "${config.projectName}" already exists!`,
        'PROJECT_EXISTS',
        { projectPath }
      );
    }

    // Generate project using template system
    const templateVariables = {
      projectName: config.projectName,
      description: config.description,
      version: config.version,
      author: config.author,
      voice: config.voice,
      timestamp: new Date().toISOString()
    };

    await templateManager.generateProject(
      config.template,
      projectPath,
      templateVariables
    );

    // Save project configuration
    await saveProjectConfig(projectPath, config);

    // Success message
    logger.success(`Project "${config.projectName}" created successfully!`);
    
    console.log(chalk.cyan('\n📁 Next steps:'));
    console.log(chalk.gray(`  cd ${config.projectName}`));
    console.log(chalk.gray('  cp .env.example .env'));
    console.log(chalk.gray('  # Edit .env with your ElevenLabs API key'));
    console.log(chalk.gray('  npm start'));

    if (!config.installDeps) {
      console.log(chalk.yellow('\n⚠️  Don\'t forget to install dependencies:'));
      console.log(chalk.gray(`  cd ${config.projectName}`));
      console.log(chalk.gray('  npm install'));
    }

  } catch (error) {
    ErrorHandler.handle(error, 'init command');
  }
}

module.exports = initCommand;