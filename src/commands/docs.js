const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk').default;
const ora = require('ora');
const inquirer = require('inquirer');

// Import utilities
const Logger = require('../lib/logger');
const FileManager = require('../lib/file-manager');
const ConfigManager = require('../lib/config-manager');
const ErrorHandler = require('../lib/error-handler');

const logger = new Logger();
const fileManager = new FileManager();
const configManager = new ConfigManager();

// Documentation templates and prompts
const DOCUMENTATION_TEMPLATES = {
  readme: {
    prompt: `Generate a comprehensive README.md for a CLI tool that helps developers build voice agents with ElevenLabs and Cursor AI. Include:
- Project description and features
- Installation instructions
- Usage examples with code snippets
- API documentation
- Configuration options
- Contributing guidelines
- License information
- Troubleshooting section
Make it professional, developer-friendly, and include emojis for visual appeal.`,
    filename: 'README.md'
  },
  api: {
    prompt: `Generate comprehensive API documentation for a Node.js CLI tool that integrates with ElevenLabs voice synthesis API. Include:
- Function signatures and parameters
- Return types and error handling
- Usage examples with code snippets
- Configuration options
- Best practices and tips
- Error codes and troubleshooting
- Rate limiting information
Format as Markdown with proper code blocks and examples.`,
    filename: 'docs/API.md'
  },
  contributing: {
    prompt: `Generate a CONTRIBUTING.md file for an open-source CLI tool project. Include:
- How to contribute (issues, pull requests)
- Development setup and requirements
- Code style guidelines and linting
- Testing requirements and coverage
- Pull request process and review guidelines
- Issue reporting and bug templates
- Release process and versioning
- Community guidelines and code of conduct
Make it welcoming and comprehensive for new contributors.`,
    filename: 'CONTRIBUTING.md'
  },
  changelog: {
    prompt: `Generate a CHANGELOG.md file for a CLI tool project following Keep a Changelog format. Include:
- Version history with semantic versioning
- Feature additions and enhancements
- Bug fixes and improvements
- Breaking changes and migration guides
- Security updates
- Deprecations and removals
- Contributors and acknowledgments
Start with version 0.1.0 and include realistic changelog entries.`,
    filename: 'CHANGELOG.md'
  },
  troubleshooting: {
    prompt: `Generate a TROUBLESHOOTING.md file for a CLI tool that integrates with ElevenLabs API. Include:
- Common installation issues and solutions
- API key and authentication problems
- Network connectivity issues
- Voice synthesis errors and fixes
- Performance optimization tips
- Platform-specific issues (Windows, macOS, Linux)
- Debug mode and logging
- Community support and resources
- FAQ section with common questions
Make it practical and easy to follow.`,
    filename: 'docs/TROUBLESHOOTING.md'
  }
};

/**
 * Check if Cursor CLI is available
 * @returns {Promise<boolean>}
 */
async function checkCursorCLI() {
  const config = configManager.loadConfig();
  const cursorPath = config.cursorAgentPath;

  return new Promise((resolve) => {
    exec(`${cursorPath} --version`, (error, stdout, stderr) => {
      if (error) {
        logger.debug(`Cursor CLI check failed: ${error.message}`);
        resolve(false);
      } else {
        logger.debug(`Cursor CLI found: ${stdout.trim()}`);
        resolve(true);
      }
    });
  });
}

/**
 * Generate documentation using Cursor CLI
 * @param {string} prompt - Documentation prompt
 * @param {string} outputFile - Output file path
 * @param {Object} options - Generation options
 * @returns {Promise<void>}
 */
async function generateDocumentation(prompt, outputFile, options = {}) {
  const spinner = ora('Generating documentation with Cursor AI...').start();
  
  try {
    const config = configManager.loadConfig();
    const cursorPath = config.cursorAgentPath;
    
    // Check if Cursor CLI is available
    const isAvailable = await checkCursorCLI();
    if (!isAvailable) {
      throw new Error('Cursor CLI not found. Please install it first.');
    }

    // Prepare command
    const command = `"${cursorPath}" chat "${prompt}"`;
    
    spinner.text = 'Generating documentation...';

    exec(command, { 
      timeout: 60000, // 60 second timeout
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    }, (error, stdout, stderr) => {
      if (error) {
        spinner.fail('Failed to generate documentation');
        logger.error(`Cursor CLI Error: ${error.message}`);
        throw error;
      }

      if (stderr) {
        logger.warning(`Cursor CLI Warning: ${stderr}`);
      }

      // Clean up the output
      let content = stdout.trim();
      
      // Remove command prompt artifacts and cursor-specific output
      content = content.replace(/^.*cursor-agent.*$/gm, '');
      content = content.replace(/^.*\$.*$/gm, '');
      content = content.replace(/^.*>.*$/gm, '');
      
      // Ensure it starts with proper markdown
      if (!content.startsWith('#')) {
        content = `# Documentation\n\n${content}`;
      }

      // Ensure output directory exists
      const outputDir = path.dirname(outputFile);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Write to file
      fs.writeFileSync(outputFile, content);
      
      spinner.succeed('Documentation generated successfully!');
      logger.success(`Saved to: ${outputFile}`);
    });

  } catch (error) {
    spinner.fail('Failed to generate documentation');
    throw error;
  }
}

/**
 * Generate documentation for a specific file
 * @param {string} filePath - File to document
 * @param {string} outputFile - Output file path
 * @returns {Promise<void>}
 */
async function generateFileDocumentation(filePath, outputFile) {
  const spinner = ora('Generating file documentation...').start();
  
  try {
    if (!await fileManager.exists(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const config = configManager.loadConfig();
    const cursorPath = config.cursorAgentPath;
    
    const prompt = `Generate comprehensive documentation for this file: ${filePath}. Include:
- File purpose and functionality
- Function and class descriptions
- Parameter and return value documentation
- Usage examples
- Error handling
- Dependencies and requirements
Format as Markdown with proper code blocks.`;

    const command = `"${cursorPath}" chat "${prompt}" --file "${filePath}"`;
    
    exec(command, { timeout: 60000 }, (error, stdout) => {
      if (error) {
        spinner.fail('Failed to generate file documentation');
        logger.error(`Error: ${error.message}`);
        return;
      }

      // Clean and save content
      let content = stdout.trim();
      if (!content.startsWith('#')) {
        content = `# ${path.basename(filePath)} Documentation\n\n${content}`;
      }

      fs.writeFileSync(outputFile, content);
      spinner.succeed('File documentation generated!');
      logger.success(`Saved to: ${outputFile}`);
    });

  } catch (error) {
    spinner.fail('Failed to generate file documentation');
    throw error;
  }
}

/**
 * Generate project documentation
 * @param {Object} options - Command options
 * @returns {Promise<void>}
 */
async function generateProjectDocumentation(options = {}) {
  const projectPath = options.project || process.cwd();
  const spinner = ora('Analyzing project structure...').start();

  try {
    // Analyze project structure
    const packageJsonPath = path.join(projectPath, 'package.json');
    let projectInfo = {};

    if (await fileManager.exists(packageJsonPath)) {
      const packageJson = JSON.parse(await fileManager.readFile(packageJsonPath, 'utf8'));
      projectInfo = {
        name: packageJson.name,
        description: packageJson.description,
        version: packageJson.version,
        author: packageJson.author,
        license: packageJson.license,
        keywords: packageJson.keywords || []
      };
    }

    spinner.succeed('Project analyzed');

    // Generate comprehensive documentation
    const docsToGenerate = [
      { type: 'readme', output: path.join(projectPath, 'README.md') },
      { type: 'api', output: path.join(projectPath, 'docs/API.md') },
      { type: 'contributing', output: path.join(projectPath, 'CONTRIBUTING.md') },
      { type: 'changelog', output: path.join(projectPath, 'CHANGELOG.md') },
      { type: 'troubleshooting', output: path.join(projectPath, 'docs/TROUBLESHOOTING.md') }
    ];

    for (const doc of docsToGenerate) {
      try {
        const template = DOCUMENTATION_TEMPLATES[doc.type];
        if (template) {
          await generateDocumentation(template.prompt, doc.output, options);
        }
      } catch (error) {
        logger.warn(`Failed to generate ${doc.type}: ${error.message}`);
      }
    }

    logger.success('Project documentation generated successfully!');
    logger.info(`Documentation files created in: ${projectPath}`);

  } catch (error) {
    spinner.fail('Failed to analyze project');
    throw error;
  }
}

/**
 * Interactive documentation generation
 * @returns {Promise<void>}
 */
async function interactiveDocsMode() {
  console.log(chalk.cyan('📚 Interactive Documentation Generator'));
  console.log(chalk.gray('Generate documentation with AI assistance\n'));

  const questions = [
    {
      type: 'list',
      name: 'docType',
      message: 'What type of documentation do you want to generate?',
      choices: [
        { name: 'README.md - Project overview and setup', value: 'readme' },
        { name: 'API Documentation - Function and API reference', value: 'api' },
        { name: 'CONTRIBUTING.md - Contribution guidelines', value: 'contributing' },
        { name: 'CHANGELOG.md - Version history', value: 'changelog' },
        { name: 'TROUBLESHOOTING.md - Common issues and solutions', value: 'troubleshooting' },
        { name: 'Custom - Generate custom documentation', value: 'custom' }
      ]
    },
    {
      type: 'input',
      name: 'outputFile',
      message: 'Output file path:',
      default: (answers) => {
        const template = DOCUMENTATION_TEMPLATES[answers.docType];
        return template ? template.filename : 'documentation.md';
      },
      validate: (input) => {
        if (!input || !input.trim()) {
          return 'Output file path is required';
        }
        return true;
      }
    }
  ];

  const answers = await inquirer.prompt(questions);

  if (answers.docType === 'custom') {
    const customQuestions = [
      {
        type: 'input',
        name: 'customPrompt',
        message: 'Enter your documentation prompt:',
        validate: (input) => {
          if (!input || !input.trim()) {
            return 'Prompt is required';
          }
          return true;
        }
      }
    ];

    const customAnswers = await inquirer.prompt(customQuestions);
    await generateDocumentation(customAnswers.customPrompt, answers.outputFile);
  } else {
    const template = DOCUMENTATION_TEMPLATES[answers.docType];
    if (template) {
      await generateDocumentation(template.prompt, answers.outputFile);
    }
  }
}

/**
 * Validate generated documentation
 * @param {string} filePath - Documentation file path
 * @returns {Promise<Object>} Validation results
 */
async function validateDocumentation(filePath) {
  const results = {
    isValid: true,
    issues: [],
    suggestions: []
  };

  try {
    if (!await fileManager.exists(filePath)) {
      results.isValid = false;
      results.issues.push('File does not exist');
      return results;
    }

    const content = await fileManager.readFile(filePath, 'utf8');

    // Basic validation checks
    if (content.length < 100) {
      results.issues.push('Documentation is too short (less than 100 characters)');
    }

    if (!content.includes('#')) {
      results.issues.push('Documentation should include markdown headers');
    }

    if (!content.includes('```')) {
      results.suggestions.push('Consider adding code examples');
    }

    if (!content.includes('##')) {
      results.suggestions.push('Consider adding subsections for better organization');
    }

    // Check for common issues
    if (content.includes('TODO') || content.includes('FIXME')) {
      results.suggestions.push('Remove TODO/FIXME comments from final documentation');
    }

    if (content.includes('{{') || content.includes('}}')) {
      results.issues.push('Template variables not replaced');
    }

    results.isValid = results.issues.length === 0;

  } catch (error) {
    results.isValid = false;
    results.issues.push(`Validation error: ${error.message}`);
  }

  return results;
}

/**
 * Main docs command function
 * @param {Object} options - Command options
 * @returns {Promise<void>}
 */
async function docsCommand(options = {}) {
  try {
    logger.info('📚 Generating documentation with Cursor AI...');

    // Check if Cursor CLI is available
    const isCursorAvailable = await checkCursorCLI();
    if (!isCursorAvailable) {
      throw ErrorHandler.createError(
        'Cursor CLI not found. Please install it first.',
        'CURSOR_CLI_NOT_FOUND'
      );
    }

    if (options.interactive) {
      await interactiveDocsMode();
      return;
    }

    if (options.file) {
      // Generate documentation for specific file
      const filePath = path.resolve(options.file);
      const outputFile = options.output || `${path.basename(filePath, path.extname(filePath))}-docs.md`;
      
      await generateFileDocumentation(filePath, outputFile);
      
      // Validate generated documentation
      const validation = await validateDocumentation(outputFile);
      if (!validation.isValid) {
        logger.warn('Documentation validation failed:');
        validation.issues.forEach(issue => logger.warn(`- ${issue}`));
      }
      
      if (validation.suggestions.length > 0) {
        logger.info('Suggestions for improvement:');
        validation.suggestions.forEach(suggestion => logger.info(`- ${suggestion}`));
      }
    } else {
      // Generate project documentation
      await generateProjectDocumentation(options);
    }

  } catch (error) {
    ErrorHandler.handle(error, 'docs command');
  }
}

module.exports = docsCommand;