const path = require('path');
const fs = require('fs-extra');
const Logger = require('./logger');
const FileManager = require('./file-manager');

const logger = new Logger();
const fileManager = new FileManager();

/**
 * Template Manager for handling project templates
 * Provides comprehensive template management and generation
 */
class TemplateManager {
  constructor() {
    this.templatesDir = path.join(__dirname, '../templates');
    this.availableTemplates = this._loadAvailableTemplates();
  }

  /**
   * Load available templates from templates directory
   * @returns {Array} Array of available templates
   */
  _loadAvailableTemplates() {
    try {
      const templates = [];
      const templateDirs = fs.readdirSync(this.templatesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const templateDir of templateDirs) {
        const templatePath = path.join(this.templatesDir, templateDir);
        const configPath = path.join(templatePath, 'template.json');
        
        if (fs.existsSync(configPath)) {
          try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            templates.push({
              id: templateDir,
              name: config.name || templateDir,
              description: config.description || 'No description',
              category: config.category || 'general',
              language: config.language || 'javascript',
              framework: config.framework || 'vanilla',
              features: config.features || [],
              requirements: config.requirements || {},
              config: config
            });
          } catch (error) {
            logger.warn(`Failed to load template config for ${templateDir}: ${error.message}`);
          }
        }
      }

      return templates;
    } catch (error) {
      logger.error(`Failed to load templates: ${error.message}`);
      return [];
    }
  }

  /**
   * Get all available templates
   * @returns {Array} Available templates
   */
  getAvailableTemplates() {
    return this.availableTemplates;
  }

  /**
   * Get template by ID
   * @param {string} templateId - Template ID
   * @returns {Object|null} Template object or null
   */
  getTemplate(templateId) {
    return this.availableTemplates.find(t => t.id === templateId) || null;
  }

  /**
   * Get templates by category
   * @param {string} category - Template category
   * @returns {Array} Templates in category
   */
  getTemplatesByCategory(category) {
    return this.availableTemplates.filter(t => t.category === category);
  }

  /**
   * Get templates by language
   * @param {string} language - Template language
   * @returns {Array} Templates in language
   */
  getTemplatesByLanguage(language) {
    return this.availableTemplates.filter(t => t.language === language);
  }

  /**
   * Generate project from template
   * @param {string} templateId - Template ID
   * @param {string} projectPath - Project output path
   * @param {Object} variables - Template variables
   * @returns {Promise<void>}
   */
  async generateProject(templateId, projectPath, variables) {
    try {
      const template = this.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      const templatePath = path.join(this.templatesDir, templateId);
      
      // Create project directory
      await fileManager.ensureDir(projectPath);

      // Copy template files
      await this._copyTemplateFiles(templatePath, projectPath, variables);

      // Generate additional files
      await this._generateAdditionalFiles(projectPath, variables, template);

      // Install dependencies if specified
      if (template.config.installDependencies !== false) {
        await this._installDependencies(projectPath, template);
      }

      logger.success(`Project generated successfully from template: ${template.name}`);

    } catch (error) {
      logger.error(`Failed to generate project: ${error.message}`);
      throw error;
    }
  }

  /**
   * Copy template files with variable substitution
   * @param {string} sourcePath - Source template path
   * @param {string} destPath - Destination project path
   * @param {Object} variables - Template variables
   * @returns {Promise<void>}
   */
  async _copyTemplateFiles(sourcePath, destPath, variables) {
    const items = await fs.readdir(sourcePath, { withFileTypes: true });

    for (const item of items) {
      const sourceItemPath = path.join(sourcePath, item.name);
      const destItemPath = path.join(destPath, item.name);

      if (item.isDirectory()) {
        // Skip certain directories
        if (['node_modules', '.git', 'dist', 'build'].includes(item.name)) {
          continue;
        }
        
        await fileManager.ensureDir(destItemPath);
        await this._copyTemplateFiles(sourceItemPath, destItemPath, variables);
      } else {
        // Copy file with variable substitution
        await this._copyFileWithSubstitution(sourceItemPath, destItemPath, variables);
      }
    }
  }

  /**
   * Copy file with variable substitution
   * @param {string} sourceFile - Source file path
   * @param {string} destFile - Destination file path
   * @param {Object} variables - Template variables
   * @returns {Promise<void>}
   */
  async _copyFileWithSubstitution(sourceFile, destFile, variables) {
    try {
      let content = await fileManager.readFile(sourceFile, 'utf8');
      
      // Replace template variables {{variableName}}
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, variables[key]);
      });

      // Handle special template logic
      content = this._processTemplateLogic(content, variables);

      await fileManager.writeFile(destFile, content);
      
    } catch (error) {
      logger.warn(`Failed to process file ${sourceFile}: ${error.message}`);
      // Copy file as-is if processing fails
      await fileManager.copy(sourceFile, destFile);
    }
  }

  /**
   * Process template logic and conditionals
   * @param {string} content - File content
   * @param {Object} variables - Template variables
   * @returns {string} Processed content
   */
  _processTemplateLogic(content, variables) {
    // Handle conditional blocks {{#if condition}}...{{/if}}
    content = content.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, block) => {
      return variables[condition] ? block : '';
    });

    // Handle conditional blocks {{#unless condition}}...{{/unless}}
    content = content.replace(/\{\{#unless\s+(\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g, (match, condition, block) => {
      return !variables[condition] ? block : '';
    });

    // Handle loops {{#each array}}...{{/each}}
    content = content.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayName, block) => {
      const array = variables[arrayName];
      if (!Array.isArray(array)) return '';
      
      return array.map(item => {
        let itemBlock = block;
        Object.keys(item).forEach(key => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          itemBlock = itemBlock.replace(regex, item[key]);
        });
        return itemBlock;
      }).join('');
    });

    return content;
  }

  /**
   * Generate additional files based on template configuration
   * @param {string} projectPath - Project path
   * @param {Object} variables - Template variables
   * @param {Object} template - Template configuration
   * @returns {Promise<void>}
   */
  async _generateAdditionalFiles(projectPath, variables, template) {
    // Generate README.md if not exists
    const readmePath = path.join(projectPath, 'README.md');
    if (!await fileManager.exists(readmePath)) {
      await this._generateReadme(projectPath, variables, template);
    }

    // Generate .gitignore if not exists
    const gitignorePath = path.join(projectPath, '.gitignore');
    if (!await fileManager.exists(gitignorePath)) {
      await this._generateGitignore(projectPath, template);
    }

    // Generate environment files
    await this._generateEnvFiles(projectPath, variables, template);

    // Generate additional files from template config
    if (template.config.additionalFiles) {
      for (const fileConfig of template.config.additionalFiles) {
        await this._generateFileFromConfig(projectPath, fileConfig, variables);
      }
    }
  }

  /**
   * Generate README.md file
   * @param {string} projectPath - Project path
   * @param {Object} variables - Template variables
   * @param {Object} template - Template configuration
   * @returns {Promise<void>}
   */
  async _generateReadme(projectPath, variables, template) {
    const readmeContent = `# ${variables.projectName}

${variables.description}

## Quick Start

1. **Install dependencies:**
   \`\`\`bash
   ${this._getInstallCommand(template)}
   \`\`\`

2. **Set up environment variables:**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your ElevenLabs API key
   \`\`\`

3. **Run the application:**
   \`\`\`bash
   ${this._getRunCommand(template)}
   \`\`\`

## Features

${template.features.map(feature => `- ${feature}`).join('\n')}

## Technology Stack

- **Language**: ${template.language}
- **Framework**: ${template.framework}
- **Voice AI**: ElevenLabs
- **Generated by**: eleven-cursor CLI

## Configuration

Edit the configuration in your main application file to customize voice settings.

## License

MIT

---

Generated by [eleven-cursor](https://github.com/silver-team/eleven-cursor) CLI
`;

    await fileManager.writeFile(path.join(projectPath, 'README.md'), readmeContent);
  }

  /**
   * Generate .gitignore file
   * @param {string} projectPath - Project path
   * @param {Object} template - Template configuration
   * @returns {Promise<void>}
   */
  async _generateGitignore(projectPath, template) {
    const gitignoreContent = `# Dependencies
node_modules/
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Generated files
output/
*.mp3
*.wav
*.m4a
*.aac
*.ogg

# IDE and editors
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Logs
logs/
*.log

# Build outputs
dist/
build/
lib/

# Temporary files
.temp/
temp/
`;

    await fileManager.writeFile(path.join(projectPath, '.gitignore'), gitignoreContent);
  }

  /**
   * Generate environment files
   * @param {string} projectPath - Project path
   * @param {Object} variables - Template variables
   * @param {Object} template - Template configuration
   * @returns {Promise<void>}
   */
  async _generateEnvFiles(projectPath, variables, template) {
    const envExample = `# ElevenLabs API Configuration
# Get your API key from: https://elevenlabs.io/app/settings/api-keys
ELEVEN_API_KEY=your_elevenlabs_api_key_here

# Voice Configuration
DEFAULT_VOICE_ID=${variables.voice}

# Application Configuration
DEBUG=false
LOG_LEVEL=info
NODE_ENV=development

# ${template.framework} Configuration
${this._getFrameworkEnvVars(template)}

# Output Configuration
OUTPUT_DIR=./output
TEMP_DIR=./.temp
`;

    await fileManager.writeFile(path.join(projectPath, '.env.example'), envExample);
  }

  /**
   * Generate file from template configuration
   * @param {string} projectPath - Project path
   * @param {Object} fileConfig - File configuration
   * @param {Object} variables - Template variables
   * @returns {Promise<void>}
   */
  async _generateFileFromConfig(projectPath, fileConfig, variables) {
    const filePath = path.join(projectPath, fileConfig.path);
    const content = this._processTemplateLogic(fileConfig.content, variables);
    
    await fileManager.ensureDir(path.dirname(filePath));
    await fileManager.writeFile(filePath, content);
  }

  /**
   * Get install command for template
   * @param {Object} template - Template configuration
   * @returns {string} Install command
   */
  _getInstallCommand(template) {
    switch (template.language) {
      case 'python':
        return 'pip install -r requirements.txt';
      case 'javascript':
      case 'typescript':
        return 'npm install';
      case 'java':
        return './gradlew build';
      default:
        return 'npm install';
    }
  }

  /**
   * Get run command for template
   * @param {Object} template - Template configuration
   * @returns {string} Run command
   */
  _getRunCommand(template) {
    switch (template.framework) {
      case 'react':
        return 'npm start';
      case 'vue':
        return 'npm run serve';
      case 'angular':
        return 'ng serve';
      case 'flask':
        return 'python app.py';
      case 'django':
        return 'python manage.py runserver';
      case 'express':
        return 'npm start';
      default:
        return 'npm start';
    }
  }

  /**
   * Get framework-specific environment variables
   * @param {Object} template - Template configuration
   * @returns {string} Environment variables
   */
  _getFrameworkEnvVars(template) {
    switch (template.framework) {
      case 'react':
        return 'REACT_APP_ELEVEN_API_KEY=your_api_key_here';
      case 'vue':
        return 'VUE_APP_ELEVEN_API_KEY=your_api_key_here';
      case 'flask':
        return 'FLASK_ENV=development\nFLASK_DEBUG=True';
      case 'django':
        return 'DJANGO_DEBUG=True\nDJANGO_SECRET_KEY=your_secret_key_here';
      default:
        return '';
    }
  }

  /**
   * Install dependencies for template
   * @param {string} projectPath - Project path
   * @param {Object} template - Template configuration
   * @returns {Promise<void>}
   */
  async _installDependencies(projectPath, template) {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);

      const command = this._getInstallCommand(template);
      await execAsync(command, { cwd: projectPath });
      
      logger.success('Dependencies installed successfully');
    } catch (error) {
      logger.warn(`Failed to install dependencies: ${error.message}`);
      logger.info('You may need to install dependencies manually');
    }
  }

  /**
   * Validate template
   * @param {string} templateId - Template ID
   * @returns {Promise<Object>} Validation result
   */
  async validateTemplate(templateId) {
    const template = this.getTemplate(templateId);
    if (!template) {
      return { valid: false, errors: ['Template not found'] };
    }

    const errors = [];
    const warnings = [];

    // Check required files
    const requiredFiles = ['template.json'];
    for (const file of requiredFiles) {
      const filePath = path.join(this.templatesDir, templateId, file);
      if (!await fileManager.exists(filePath)) {
        errors.push(`Missing required file: ${file}`);
      }
    }

    // Check template configuration
    if (!template.config.name) {
      warnings.push('Template name not specified');
    }

    if (!template.config.description) {
      warnings.push('Template description not specified');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

module.exports = TemplateManager;