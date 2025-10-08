const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

// Import utilities
const Logger = require('./logger');
const FileManager = require('./file-manager');

const logger = new Logger();
const fileManager = new FileManager();
const execAsync = promisify(exec);

/**
 * Comprehensive Documentation Generator
 * Generates API docs, guides, examples, and interactive documentation
 */
class DocsGenerator extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.docsDir = options.docsDir || path.join(process.cwd(), 'docs');
    this.srcDir = options.srcDir || path.join(process.cwd(), 'src');
    this.templatesDir = options.templatesDir || path.join(__dirname, '../templates/docs');
    this.outputDir = options.outputDir || path.join(process.cwd(), 'docs-generated');
    
    // Documentation configuration
    this.config = {
      title: 'Eleven-Cursor CLI Documentation',
      version: process.env.npm_package_version || '1.0.0',
      description: 'Comprehensive CLI for building ElevenLabs voice agents with AI assistance',
      author: 'Silver Team',
      license: 'MIT',
      repository: 'https://github.com/silver-team/eleven-cursor',
      baseUrl: '/',
      theme: 'default',
      search: true,
      navigation: true,
      sidebar: true
    };
    
    // Documentation sections
    this.sections = {
      gettingStarted: 'Getting Started',
      api: 'API Reference',
      commands: 'Commands',
      examples: 'Examples',
      guides: 'Guides',
      plugins: 'Plugins',
      troubleshooting: 'Troubleshooting',
      contributing: 'Contributing'
    };
    
    this.initialize();
  }

  /**
   * Initialize documentation generator
   * @private
   */
  async initialize() {
    try {
      await fileManager.ensureDir(this.docsDir);
      await fileManager.ensureDir(this.outputDir);
      await fileManager.ensureDir(this.templatesDir);
      
      logger.debug('Documentation generator initialized');
    } catch (error) {
      logger.error(`Failed to initialize docs generator: ${error.message}`);
    }
  }

  /**
   * Generate all documentation
   * @param {Object} options - Generation options
   * @returns {Promise<void>}
   */
  async generateAll(options = {}) {
    try {
      this.emit('generationStart', { options });
      
      // Generate different types of documentation
      await Promise.all([
        this.generateAPIReference(),
        this.generateCommandDocs(),
        this.generateExamples(),
        this.generateGuides(),
        this.generateTroubleshooting(),
        this.generateContributing()
      ]);
      
      // Generate main documentation files
      await this.generateIndex();
      await this.generateSidebar();
      await this.generateSearchIndex();
      
      // Generate interactive documentation
      await this.generateInteractiveDocs();
      
      this.emit('generationComplete', { outputDir: this.outputDir });
      logger.success('Documentation generated successfully');
      
    } catch (error) {
      logger.error(`Documentation generation failed: ${error.message}`);
      this.emit('generationError', error);
      throw error;
    }
  }

  /**
   * Generate API reference documentation
   * @returns {Promise<void>}
   * @private
   */
  async generateAPIReference() {
    try {
      const apiDir = path.join(this.outputDir, 'api');
      await fileManager.ensureDir(apiDir);
      
      // Extract API information from source files
      const apiData = await this.extractAPIInfo();
      
      // Generate API documentation
      const apiDocs = this.generateAPIDocs(apiData);
      await fileManager.writeFile(path.join(apiDir, 'index.md'), apiDocs);
      
      // Generate individual module docs
      for (const [moduleName, moduleData] of Object.entries(apiData.modules)) {
        const moduleDocs = this.generateModuleDocs(moduleName, moduleData);
        await fileManager.writeFile(
          path.join(apiDir, `${moduleName}.md`), 
          moduleDocs
        );
      }
      
      logger.debug('API reference generated');
    } catch (error) {
      logger.warn(`Failed to generate API reference: ${error.message}`);
    }
  }

  /**
   * Extract API information from source files
   * @returns {Promise<Object>} API data
   * @private
   */
  async extractAPIInfo() {
    const apiData = {
      modules: {},
      classes: {},
      functions: {},
      constants: {}
    };
    
    try {
      const files = await this.getAllSourceFiles();
      
      for (const file of files) {
        const content = await fileManager.readFile(file, 'utf8');
        const fileData = this.parseSourceFile(content, file);
        
        if (fileData.classes.length > 0) {
          apiData.classes[file] = fileData.classes;
        }
        
        if (fileData.functions.length > 0) {
          apiData.functions[file] = fileData.functions;
        }
        
        if (fileData.constants.length > 0) {
          apiData.constants[file] = fileData.constants;
        }
      }
      
      return apiData;
    } catch (error) {
      logger.warn(`Failed to extract API info: ${error.message}`);
      return apiData;
    }
  }

  /**
   * Get all source files
   * @returns {Promise<Array>} Source file paths
   * @private
   */
  async getAllSourceFiles() {
    const files = [];
    
    try {
      const items = await fs.readdir(this.srcDir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(this.srcDir, item.name);
        
        if (item.isDirectory()) {
          const subFiles = await this.getAllSourceFiles(fullPath);
          files.push(...subFiles);
        } else if (item.name.endsWith('.js')) {
          files.push(fullPath);
        }
      }
      
      return files;
    } catch (error) {
      logger.warn(`Failed to get source files: ${error.message}`);
      return [];
    }
  }

  /**
   * Parse source file for documentation
   * @param {string} content - File content
   * @param {string} filePath - File path
   * @returns {Object} Parsed data
   * @private
   */
  parseSourceFile(content, filePath) {
    const data = {
      classes: [],
      functions: [],
      constants: []
    };
    
    // Parse JSDoc comments
    const jsdocRegex = /\/\*\*\s*\n([\s\S]*?)\s*\*\/\s*\n\s*(?:export\s+)?(?:class|function|const|let|var)\s+(\w+)/g;
    let match;
    
    while ((match = jsdocRegex.exec(content)) !== null) {
      const [, jsdoc, name] = match;
      const docData = this.parseJSDoc(jsdoc);
      
      if (content.includes(`class ${name}`)) {
        data.classes.push({ name, ...docData, file: filePath });
      } else if (content.includes(`function ${name}`) || content.includes(`const ${name} =`)) {
        data.functions.push({ name, ...docData, file: filePath });
      } else {
        data.constants.push({ name, ...docData, file: filePath });
      }
    }
    
    return data;
  }

  /**
   * Parse JSDoc comment
   * @param {string} jsdoc - JSDoc comment
   * @returns {Object} Parsed JSDoc data
   * @private
   */
  parseJSDoc(jsdoc) {
    const data = {
      description: '',
      params: [],
      returns: '',
      examples: [],
      tags: []
    };
    
    const lines = jsdoc.split('\n');
    let currentSection = 'description';
    
    for (const line of lines) {
      const trimmed = line.trim().replace(/^\*\s?/, '');
      
      if (trimmed.startsWith('@param')) {
        currentSection = 'params';
        const paramMatch = trimmed.match(/@param\s+{([^}]+)}\s+(\w+)\s+(.+)/);
        if (paramMatch) {
          data.params.push({
            type: paramMatch[1],
            name: paramMatch[2],
            description: paramMatch[3]
          });
        }
      } else if (trimmed.startsWith('@returns') || trimmed.startsWith('@return')) {
        currentSection = 'returns';
        data.returns = trimmed.replace(/@returns?\s+/, '');
      } else if (trimmed.startsWith('@example')) {
        currentSection = 'examples';
        data.examples.push(trimmed.replace('@example', '').trim());
      } else if (trimmed.startsWith('@')) {
        currentSection = 'tags';
        data.tags.push(trimmed);
      } else if (trimmed && currentSection === 'description') {
        data.description += (data.description ? ' ' : '') + trimmed;
      }
    }
    
    return data;
  }

  /**
   * Generate API documentation
   * @param {Object} apiData - API data
   * @returns {string} API documentation
   * @private
   */
  generateAPIDocs(apiData) {
    let docs = `# API Reference\n\n`;
    docs += `This section contains the complete API reference for the Eleven-Cursor CLI.\n\n`;
    
    // Classes
    if (Object.keys(apiData.classes).length > 0) {
      docs += `## Classes\n\n`;
      
      for (const [file, classes] of Object.entries(apiData.classes)) {
        for (const cls of classes) {
          docs += `### ${cls.name}\n\n`;
          docs += `${cls.description}\n\n`;
          
          if (cls.params.length > 0) {
            docs += `**Parameters:**\n\n`;
            for (const param of cls.params) {
              docs += `- \`${param.name}\` (${param.type}): ${param.description}\n`;
            }
            docs += `\n`;
          }
          
          if (cls.examples.length > 0) {
            docs += `**Example:**\n\n`;
            docs += `\`\`\`javascript\n${cls.examples[0]}\n\`\`\`\n\n`;
          }
        }
      }
    }
    
    // Functions
    if (Object.keys(apiData.functions).length > 0) {
      docs += `## Functions\n\n`;
      
      for (const [file, functions] of Object.entries(apiData.functions)) {
        for (const func of functions) {
          docs += `### ${func.name}\n\n`;
          docs += `${func.description}\n\n`;
          
          if (func.params.length > 0) {
            docs += `**Parameters:**\n\n`;
            for (const param of func.params) {
              docs += `- \`${param.name}\` (${param.type}): ${param.description}\n`;
            }
            docs += `\n`;
          }
          
          if (func.returns) {
            docs += `**Returns:** ${func.returns}\n\n`;
          }
          
          if (func.examples.length > 0) {
            docs += `**Example:**\n\n`;
            docs += `\`\`\`javascript\n${func.examples[0]}\n\`\`\`\n\n`;
          }
        }
      }
    }
    
    return docs;
  }

  /**
   * Generate module documentation
   * @param {string} moduleName - Module name
   * @param {Object} moduleData - Module data
   * @returns {string} Module documentation
   * @private
   */
  generateModuleDocs(moduleName, moduleData) {
    let docs = `# ${moduleName}\n\n`;
    
    if (moduleData.description) {
      docs += `${moduleData.description}\n\n`;
    }
    
    // Add class, function, and constant documentation
    // Implementation similar to generateAPIDocs but focused on single module
    
    return docs;
  }

  /**
   * Generate command documentation
   * @returns {Promise<void>}
   * @private
   */
  async generateCommandDocs() {
    try {
      const commandsDir = path.join(this.outputDir, 'commands');
      await fileManager.ensureDir(commandsDir);
      
      // Get command information from CLI
      const commands = await this.getCommandInfo();
      
      for (const command of commands) {
        const commandDocs = this.generateCommandDoc(command);
        await fileManager.writeFile(
          path.join(commandsDir, `${command.name}.md`),
          commandDocs
        );
      }
      
      // Generate commands index
      const commandsIndex = this.generateCommandsIndex(commands);
      await fileManager.writeFile(
        path.join(commandsDir, 'index.md'),
        commandsIndex
      );
      
      logger.debug('Command documentation generated');
    } catch (error) {
      logger.warn(`Failed to generate command docs: ${error.message}`);
    }
  }

  /**
   * Get command information from CLI
   * @returns {Promise<Array>} Command information
   * @private
   */
  async getCommandInfo() {
    try {
      const { stdout } = await execAsync('node bin/index.js --help');
      return this.parseCommandHelp(stdout);
    } catch (error) {
      logger.warn(`Failed to get command info: ${error.message}`);
      return [];
    }
  }

  /**
   * Parse command help output
   * @param {string} helpOutput - Help output
   * @returns {Array} Command information
   * @private
   */
  parseCommandHelp(helpOutput) {
    const commands = [];
    const lines = helpOutput.split('\n');
    let inCommandsSection = false;
    
    for (const line of lines) {
      if (line.includes('Commands:')) {
        inCommandsSection = true;
        continue;
      }
      
      if (inCommandsSection && line.trim()) {
        const match = line.match(/^\s*(\w+)\s+(.+)/);
        if (match) {
          commands.push({
            name: match[1],
            description: match[2]
          });
        }
      }
    }
    
    return commands;
  }

  /**
   * Generate command documentation
   * @param {Object} command - Command information
   * @returns {string} Command documentation
   * @private
   */
  generateCommandDoc(command) {
    return `# ${command.name}\n\n${command.description}\n\n## Usage\n\n\`\`\`bash\neleven ${command.name} [options]\n\`\`\`\n\n## Options\n\n*Options will be populated from CLI help*\n\n## Examples\n\n*Examples will be generated from command usage*\n\n## See Also\n\n- [Commands Index](./index.md)\n- [API Reference](../api/index.md)`;
  }

  /**
   * Generate commands index
   * @param {Array} commands - Commands array
   * @returns {string} Commands index
   * @private
   */
  generateCommandsIndex(commands) {
    let docs = `# Commands\n\nThis section contains documentation for all available commands.\n\n`;
    
    for (const command of commands) {
      docs += `## [${command.name}](./${command.name}.md)\n\n`;
      docs += `${command.description}\n\n`;
    }
    
    return docs;
  }

  /**
   * Generate examples documentation
   * @returns {Promise<void>}
   * @private
   */
  async generateExamples() {
    try {
      const examplesDir = path.join(this.outputDir, 'examples');
      await fileManager.ensureDir(examplesDir);
      
      const examples = [
        {
          title: 'Basic Voice Synthesis',
          description: 'Generate voice from text using the default voice',
          code: `const { ElevenLabsClient } = require('elevenlabs');

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVEN_API_KEY
});

async function generateVoice() {
  const audio = await client.generate({
    voice: 'EXAVITQu4vr4xnSDxMaL',
    text: 'Hello, world!'
  });
  
  // Save audio to file
  require('fs').writeFileSync('output.mp3', audio);
}

generateVoice();`
        },
        {
          title: 'Custom Voice Settings',
          description: 'Generate voice with custom settings',
          code: `const { ElevenLabsClient } = require('elevenlabs');

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVEN_API_KEY
});

async function generateCustomVoice() {
  const audio = await client.generate({
    voice: 'EXAVITQu4vr4xnSDxMaL',
    text: 'This is a custom voice with specific settings.',
    voice_settings: {
      stability: 0.8,
      similarity_boost: 0.9,
      style: 0.2,
      use_speaker_boost: true
    }
  });
  
  require('fs').writeFileSync('custom-voice.mp3', audio);
}

generateCustomVoice();`
        }
      ];
      
      for (const example of examples) {
        const exampleDoc = this.generateExampleDoc(example);
        const filename = example.title.toLowerCase().replace(/\s+/g, '-') + '.md';
        await fileManager.writeFile(
          path.join(examplesDir, filename),
          exampleDoc
        );
      }
      
      // Generate examples index
      const examplesIndex = this.generateExamplesIndex(examples);
      await fileManager.writeFile(
        path.join(examplesDir, 'index.md'),
        examplesIndex
      );
      
      logger.debug('Examples documentation generated');
    } catch (error) {
      logger.warn(`Failed to generate examples: ${error.message}`);
    }
  }

  /**
   * Generate example documentation
   * @param {Object} example - Example data
   * @returns {string} Example documentation
   * @private
   */
  generateExampleDoc(example) {
    return `# ${example.title}\n\n${example.description}\n\n## Code\n\n\`\`\`javascript\n${example.code}\n\`\`\`\n\n## Explanation\n\n*Explanation will be generated based on the example*\n\n## See Also\n\n- [Examples Index](./index.md)\n- [API Reference](../api/index.md)`;
  }

  /**
   * Generate examples index
   * @param {Array} examples - Examples array
   * @returns {string} Examples index
   * @private
   */
  generateExamplesIndex(examples) {
    let docs = `# Examples\n\nThis section contains practical examples of using the Eleven-Cursor CLI.\n\n`;
    
    for (const example of examples) {
      const filename = example.title.toLowerCase().replace(/\s+/g, '-') + '.md';
      docs += `## [${example.title}](./${filename})\n\n`;
      docs += `${example.description}\n\n`;
    }
    
    return docs;
  }

  /**
   * Generate guides documentation
   * @returns {Promise<void>}
   * @private
   */
  async generateGuides() {
    try {
      const guidesDir = path.join(this.outputDir, 'guides');
      await fileManager.ensureDir(guidesDir);
      
      const guides = [
        {
          title: 'Getting Started',
          content: `# Getting Started\n\nWelcome to Eleven-Cursor CLI! This guide will help you get up and running quickly.\n\n## Installation\n\n\`\`\`bash\nnpm install -g eleven-cursor\n\`\`\`\n\n## Quick Start\n\n1. Set up your ElevenLabs API key:\n   \`\`\`bash\n   export ELEVEN_API_KEY=your_api_key_here\n   \`\`\`\n\n2. Create your first voice agent:\n   \`\`\`bash\n   eleven init my-voice-agent\n   \`\`\`\n\n3. Test voice synthesis:\n   \`\`\`bash\n   eleven test --text "Hello, world!"\n   \`\`\`\n\n## Next Steps\n\n- Explore the [Commands](./commands/index.md) documentation\n- Check out [Examples](./examples/index.md) for practical usage\n- Read the [API Reference](./api/index.md) for advanced features`
        },
        {
          title: 'Voice Cloning',
          content: `# Voice Cloning Guide\n\nLearn how to clone voices using the Eleven-Cursor CLI.\n\n## Prerequisites\n\n- ElevenLabs API key with voice cloning access\n- High-quality audio sample (1-5 minutes)\n- Supported audio format (MP3, WAV, M4A, AAC, OGG)\n\n## Step-by-Step Process\n\n1. Prepare your audio sample\n2. Use the clone command:\n   \`\`\`bash\n   eleven clone --interactive\n   \`\`\`\n3. Follow the interactive prompts\n4. Test your cloned voice\n\n## Best Practices\n\n- Use clear, high-quality audio\n- Avoid background noise\n- Speak naturally and consistently\n- Include various emotions and tones`
        }
      ];
      
      for (const guide of guides) {
        const filename = guide.title.toLowerCase().replace(/\s+/g, '-') + '.md';
        await fileManager.writeFile(
          path.join(guidesDir, filename),
          guide.content
        );
      }
      
      logger.debug('Guides documentation generated');
    } catch (error) {
      logger.warn(`Failed to generate guides: ${error.message}`);
    }
  }

  /**
   * Generate troubleshooting documentation
   * @returns {Promise<void>}
   * @private
   */
  async generateTroubleshooting() {
    const content = `# Troubleshooting\n\nCommon issues and solutions when using Eleven-Cursor CLI.\n\n## Common Issues\n\n### API Key Issues\n\n**Problem:** "Invalid API key" error\n\n**Solution:**\n1. Verify your API key is correct\n2. Check that the key has proper permissions\n3. Ensure the key is set in your environment:\n   \`\`\`bash\n   export ELEVEN_API_KEY=your_key_here\n   \`\`\`\n\n### Voice Generation Fails\n\n**Problem:** Voice generation returns an error\n\n**Solution:**\n1. Check your internet connection\n2. Verify the voice ID is valid\n3. Ensure your text is not too long\n4. Check API rate limits\n\n### Installation Issues\n\n**Problem:** Command not found after installation\n\n**Solution:**\n1. Ensure npm global bin is in your PATH\n2. Try reinstalling:\n   \`\`\`bash\n   npm uninstall -g eleven-cursor\n   npm install -g eleven-cursor\n   \`\`\`\n\n## Getting Help\n\n- Check the [GitHub Issues](https://github.com/silver-team/eleven-cursor/issues)\n- Read the [API Reference](./api/index.md)\n- Review [Examples](./examples/index.md)`;
    
    await fileManager.writeFile(
      path.join(this.outputDir, 'troubleshooting.md'),
      content
    );
    
    logger.debug('Troubleshooting documentation generated');
  }

  /**
   * Generate contributing documentation
   * @returns {Promise<void>}
   * @private
   */
  async generateContributing() {
    const content = `# Contributing\n\nThank you for your interest in contributing to Eleven-Cursor CLI!\n\n## Development Setup\n\n1. Fork the repository\n2. Clone your fork:\n   \`\`\`bash\n   git clone https://github.com/your-username/eleven-cursor.git\n   \`\`\`\n3. Install dependencies:\n   \`\`\`bash\n   cd eleven-cursor\n   npm install\n   \`\`\`\n4. Run tests:\n   \`\`\`bash\n   npm test\n   \`\`\`\n\n## Code Style\n\n- Use ESLint and Prettier\n- Follow existing code patterns\n- Write comprehensive tests\n- Document new features\n\n## Pull Request Process\n\n1. Create a feature branch\n2. Make your changes\n3. Add tests for new functionality\n4. Update documentation\n5. Submit a pull request\n\n## Reporting Issues\n\n- Use the GitHub issue tracker\n- Provide detailed reproduction steps\n- Include system information\n- Attach relevant logs`;
    
    await fileManager.writeFile(
      path.join(this.outputDir, 'contributing.md'),
      content
    );
    
    logger.debug('Contributing documentation generated');
  }

  /**
   * Generate main index page
   * @returns {Promise<void>}
   * @private
   */
  async generateIndex() {
    const content = `# ${this.config.title}\n\n${this.config.description}\n\n## Quick Start\n\n\`\`\`bash\n# Install\neleven-cursor\n\n# Create a project\neleven init my-voice-agent\n\n# Test voice synthesis\neleven test --text "Hello, world!"\n\`\`\`\n\n## Documentation\n\n- [Getting Started](./guides/getting-started.md)\n- [Commands](./commands/index.md)\n- [API Reference](./api/index.md)\n- [Examples](./examples/index.md)\n- [Troubleshooting](./troubleshooting.md)\n- [Contributing](./contributing.md)\n\n## Features\n\n- 🎧 Voice synthesis with ElevenLabs\n- 🤖 AI-powered documentation\n- 🎭 Voice cloning capabilities\n- 📊 Voice quality analysis\n- 🏗️ Project templates\n- 🔌 Plugin architecture\n\n## License\n\n${this.config.license}`;
    
    await fileManager.writeFile(
      path.join(this.outputDir, 'index.md'),
      content
    );
    
    logger.debug('Index documentation generated');
  }

  /**
   * Generate sidebar navigation
   * @returns {Promise<void>}
   * @private
   */
  async generateSidebar() {
    const sidebar = {
      'Getting Started': [
        'guides/getting-started.md',
        'guides/voice-cloning.md'
      ],
      'Commands': [
        'commands/index.md',
        'commands/init.md',
        'commands/test.md',
        'commands/docs.md',
        'commands/tune.md',
        'commands/clone.md',
        'commands/analyze.md'
      ],
      'API Reference': [
        'api/index.md'
      ],
      'Examples': [
        'examples/index.md'
      ],
      'Guides': [
        'guides/index.md'
      ],
      'Help': [
        'troubleshooting.md',
        'contributing.md'
      ]
    };
    
    await fileManager.writeFile(
      path.join(this.outputDir, 'sidebar.json'),
      JSON.stringify(sidebar, null, 2)
    );
    
    logger.debug('Sidebar navigation generated');
  }

  /**
   * Generate search index
   * @returns {Promise<void>}
   * @private
   */
  async generateSearchIndex() {
    // Simple search index - in production, use a proper search engine
    const searchIndex = {
      pages: [
        { title: 'Getting Started', url: 'guides/getting-started.md', content: 'Welcome to Eleven-Cursor CLI' },
        { title: 'Commands', url: 'commands/index.md', content: 'All available commands' },
        { title: 'API Reference', url: 'api/index.md', content: 'Complete API documentation' }
      ]
    };
    
    await fileManager.writeFile(
      path.join(this.outputDir, 'search.json'),
      JSON.stringify(searchIndex, null, 2)
    );
    
    logger.debug('Search index generated');
  }

  /**
   * Generate interactive documentation
   * @returns {Promise<void>}
   * @private
   */
  async generateInteractiveDocs() {
    const interactiveDir = path.join(this.outputDir, 'interactive');
    await fileManager.ensureDir(interactiveDir);
    
    // Generate interactive examples
    const interactiveHTML = `<!DOCTYPE html>
<html>
<head>
    <title>Interactive Examples</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .example { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .code { background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 5px; }
        button { background: #4299e1; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>Interactive Examples</h1>
    
    <div class="example">
        <h2>Voice Synthesis</h2>
        <p>Try generating voice with different settings:</p>
        <div class="code">
            <pre>eleven test --text "Your text here" --voice EXAVITQu4vr4xnSDxMaL</pre>
        </div>
        <button onclick="runExample('test')">Run Example</button>
    </div>
    
    <div class="example">
        <h2>Voice Cloning</h2>
        <p>Clone a voice from audio sample:</p>
        <div class="code">
            <pre>eleven clone --interactive</pre>
        </div>
        <button onclick="runExample('clone')">Run Example</button>
    </div>
    
    <script>
        function runExample(command) {
            alert('This would run: eleven ' + command);
        }
    </script>
</body>
</html>`;
    
    await fileManager.writeFile(
      path.join(interactiveDir, 'index.html'),
      interactiveHTML
    );
    
    logger.debug('Interactive documentation generated');
  }

  /**
   * Generate documentation statistics
   * @returns {Object} Documentation statistics
   */
  getStats() {
    return {
      sections: Object.keys(this.sections).length,
      outputDir: this.outputDir,
      generated: new Date().toISOString()
    };
  }

  /**
   * Clean up generated documentation
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      await fs.remove(this.outputDir);
      logger.debug('Generated documentation cleaned up');
    } catch (error) {
      logger.warn(`Failed to cleanup documentation: ${error.message}`);
    }
  }

  /**
   * Destroy documentation generator
   * @returns {Promise<void>}
   */
  async destroy() {
    try {
      this.removeAllListeners();
      logger.debug('Documentation generator destroyed');
    } catch (error) {
      logger.error(`Documentation generator destroy error: ${error.message}`);
    }
  }
}

module.exports = DocsGenerator;