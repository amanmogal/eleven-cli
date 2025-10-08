# 🔧 Eleven-Cursor CLI - API Reference

## 📋 **Table of Contents**
1. [Command Line Interface](#command-line-interface)
2. [Configuration API](#configuration-api)
3. [Core Library API](#core-library-api)
4. [Template System API](#template-system-api)
5. [Plugin System API](#plugin-system-api)
6. [Analytics API](#analytics-api)
7. [Error Handling API](#error-handling-api)

---

## 🖥️ **Command Line Interface**

### **Global Options**
```bash
eleven [options] [command]

Options:
  -V, --version                 output the version number
  -v, --verbose                 enable verbose output
  --debug                       enable debug mode
  --config <path>               specify config file path
  --silent                      suppress all output except errors
  --log-level <level>           set log level (error, warn, info, verbose, debug)
  -h, --help                    display help for command
```

### **Command Structure**
```bash
eleven <command> [options] [arguments]
```

---

## 🎯 **Core Commands API**

### **`init` Command**
```bash
eleven init [projectName] [options]
```

**Description**: Create a new voice agent project with scaffolding.

**Arguments**:
- `projectName` (optional): Name of the project to create

**Options**:
- `--template <name>`: Project template to use
- `--author <name>`: Set project author
- `--interactive`: Interactive project setup
- `--yes`: Skip confirmations

**Examples**:
```bash
eleven init my-project
eleven init my-app --template react-voice
eleven init my-bot --author "John Doe" --interactive
```

**Templates Available**:
- `voice-agent`: Basic Node.js voice agent
- `react-voice`: React-based voice application
- `python-voice`: Python Flask voice bot

### **`test` Command**
```bash
eleven test [options]
```

**Description**: Test text-to-speech synthesis with various voices.

**Options**:
- `--text <text>`: Text to synthesize
- `--voice <id>`: Voice ID to use
- `--interactive`: Interactive testing mode
- `--batch`: Batch processing mode
- `--file <path>`: Input file for batch processing
- `--output <path>`: Output file path
- `--format <format>`: Audio format (mp3, wav, m4a)

**Examples**:
```bash
eleven test --text "Hello, world!"
eleven test --text "Hello!" --voice EXAVITQu4vr4xnSDxMaL
eleven test --interactive
eleven test --batch --file sentences.txt
```

### **`docs` Command**
```bash
eleven docs [options]
```

**Description**: Generate documentation using Cursor AI assistance.

**Options**:
- `--project`: Generate project documentation
- `--api`: Generate API documentation
- `--ai`: Use Cursor AI assistance
- `--interactive`: Interactive documentation mode
- `--output <path>`: Output directory for documentation
- `--format <format>`: Documentation format (md, html, pdf)

**Examples**:
```bash
eleven docs --project
eleven docs --ai --project
eleven docs --interactive
eleven docs --api --output ./docs
```

### **`tune` Command**
```bash
eleven tune [options]
```

**Description**: Tune voice parameters for optimal synthesis.

**Options**:
- `--voice <id>`: Voice ID to tune
- `--preset <name>`: Apply preset settings
- `--stability <value>`: Stability parameter (0-1)
- `--similarity <value>`: Similarity parameter (0-1)
- `--style <value>`: Style parameter (0-1)
- `--interactive`: Interactive tuning mode
- `--save`: Save tuned settings

**Examples**:
```bash
eleven tune --interactive
eleven tune --voice EXAVITQu4vr4xnSDxMaL --stability 0.8
eleven tune --preset professional
```

### **`clone` Command**
```bash
eleven clone [options]
```

**Description**: Clone voices from audio samples.

**Options**:
- `--file <path>`: Audio file to clone
- `--name <name>`: Name for cloned voice
- `--description <desc>`: Description for cloned voice
- `--quality <quality>`: Voice quality preset (standard, high)
- `--test`: Test cloned voice after creation
- `--interactive`: Interactive cloning mode
- `--list`: List cloned voices

**Examples**:
```bash
eleven clone --interactive
eleven clone --file sample.wav --name "My Voice"
eleven clone --list
eleven clone --test --voice cloned_voice_id
```

### **`analyze` Command**
```bash
eleven analyze [options]
```

**Description**: Analyze voice quality and get recommendations.

**Options**:
- `--voice <id>`: Voice ID to analyze
- `--text <text>`: Sample text for analysis
- `--preset <preset>`: Analysis preset (general, professional, creative)
- `--save`: Save analysis results to file
- `--interactive`: Interactive analysis mode
- `--output <path>`: Output file for results

**Examples**:
```bash
eleven analyze --voice EXAVITQu4vr4xnSDxMaL
eleven analyze --voice EXAVITQu4vr4xnSDxMaL --text "Sample text"
eleven analyze --interactive
```

### **`config` Command**
```bash
eleven config [options]
```

**Description**: Manage configuration settings.

**Options**:
- `--show`: Show current configuration
- `--set <key> <value>`: Set configuration value
- `--get <key>`: Get configuration value
- `--reset`: Reset to default configuration
- `--interactive`: Interactive configuration mode
- `--file <path>`: Configuration file path

**Examples**:
```bash
eleven config --show
eleven config --set elevenApiKey new_key
eleven config --interactive
eleven config --reset
```

### **`status` Command**
```bash
eleven status [options]
```

**Description**: Show application status and health checks.

**Options**:
- `--api`: Check API connectivity
- `--cursor`: Check Cursor CLI availability
- `--full`: Complete health check
- `--json`: Output in JSON format
- `--quiet`: Quiet mode (errors only)

**Examples**:
```bash
eleven status
eleven status --api
eleven status --full --json
```

### **`advanced` Command**
```bash
eleven advanced [options]
```

**Description**: Advanced Phase 3 features and system management.

**Options**:
- `--performance`: Show performance dashboard
- `--analytics`: Show analytics dashboard
- `--plugins`: Manage plugins
- `--test`: Run comprehensive tests
- `--docs`: Generate documentation
- `--optimize`: Optimize system performance
- `--health`: Show system health status
- `--list-plugins`: List installed plugins
- `--install-plugin <name>`: Install plugin
- `--uninstall-plugin <name>`: Uninstall plugin
- `--reload-plugin <name>`: Reload plugin

**Examples**:
```bash
eleven advanced --performance
eleven advanced --analytics
eleven advanced --plugins
eleven advanced --test
```

---

## ⚙️ **Configuration API**

### **Configuration Manager**
```javascript
const ConfigManager = require('eleven-cursor/src/lib/config-manager');

const config = new ConfigManager();
```

### **Methods**

#### **`loadConfig()`**
```javascript
const config = configManager.loadConfig();
```
Load configuration from environment variables and config file.

#### **`saveConfig(config)`**
```javascript
await configManager.saveConfig(newConfig);
```
Save configuration to file.

#### **`get(key)`**
```javascript
const value = configManager.get('elevenApiKey');
```
Get configuration value by key.

#### **`set(key, value)`**
```javascript
configManager.set('elevenApiKey', 'new_key');
```
Set configuration value.

#### **`reset()`**
```javascript
configManager.reset();
```
Reset configuration to defaults.

#### **`isValid()`**
```javascript
const isValid = configManager.isValid();
```
Check if configuration is valid.

### **Configuration Schema**
```javascript
{
  elevenApiKey: 'string',
  defaultVoiceId: 'string',
  outputDir: 'string',
  tempDir: 'string',
  debug: 'boolean',
  logLevel: 'string',
  cache: {
    enabled: 'boolean',
    maxSize: 'string',
    ttl: 'string',
    persistent: 'boolean'
  },
  api: {
    baseUrl: 'string',
    timeout: 'number',
    maxRetries: 'number',
    rateLimit: {
      requests: 'number',
      window: 'string'
    }
  }
}
```

---

## 📚 **Core Library API**

### **Logger**
```javascript
const Logger = require('eleven-cursor/src/lib/logger');

const logger = new Logger({
  verbose: true,
  debug: false,
  silent: false,
  logLevel: 'info'
});
```

#### **Methods**
- `logger.error(message, ...args)`
- `logger.warn(message, ...args)`
- `logger.info(message, ...args)`
- `logger.success(message, ...args)`
- `logger.verbose(message, ...args)`
- `logger.debug(message, ...args)`
- `logger.progress(message)`

### **File Manager**
```javascript
const FileManager = require('eleven-cursor/src/lib/file-manager');

const fileManager = new FileManager();
```

#### **Methods**
- `fileManager.ensureDir(path)`
- `fileManager.writeFile(path, content, options)`
- `fileManager.readFile(path, encoding)`
- `fileManager.exists(path)`
- `fileManager.copy(src, dest)`
- `fileManager.move(src, dest)`
- `fileManager.remove(path)`

### **Cache Manager**
```javascript
const CacheManager = require('eleven-cursor/src/lib/cache-manager');

const cache = new CacheManager({
  maxSize: 100 * 1024 * 1024, // 100MB
  ttl: 300000, // 5 minutes
  persistent: true
});
```

#### **Methods**
- `cache.get(key, options)`
- `cache.set(key, value, options)`
- `cache.delete(key, options)`
- `cache.has(key, options)`
- `cache.clear()`
- `cache.getStats()`

### **API Client**
```javascript
const APIClient = require('eleven-cursor/src/lib/api-client');

const apiClient = new APIClient({
  baseURL: 'https://api.elevenlabs.io/v1',
  apiKey: 'your_api_key',
  timeout: 30000,
  maxRetries: 3
});
```

#### **Methods**
- `apiClient.get(url, options)`
- `apiClient.post(url, data, options)`
- `apiClient.put(url, data, options)`
- `apiClient.delete(url, options)`
- `apiClient.stream(method, url, options)`
- `apiClient.getMetrics()`
- `apiClient.clearCache()`

---

## 🏗️ **Template System API**

### **Template Manager**
```javascript
const TemplateManager = require('eleven-cursor/src/lib/template-manager');

const templateManager = new TemplateManager();
```

#### **Methods**
- `templateManager.getAvailableTemplates()`
- `templateManager.getTemplate(templateId)`
- `templateManager.generateProject(templateId, projectPath, variables)`
- `templateManager.validateTemplate(templateId)`

### **Template Configuration**
```json
{
  "name": "Template Name",
  "description": "Template description",
  "category": "voice-agent",
  "language": "javascript",
  "framework": "node",
  "features": ["voice-synthesis", "api-integration"],
  "requirements": {
    "node": ">=16.0.0",
    "npm": ">=8.0.0"
  },
  "installDependencies": true,
  "additionalFiles": {
    "src/index.js": "// Main application file"
  }
}
```

---

## 🔌 **Plugin System API**

### **Plugin Manager**
```javascript
const PluginManager = require('eleven-cursor/src/lib/plugin-manager');

const pluginManager = new PluginManager({
  pluginsDir: './plugins'
});
```

#### **Methods**
- `pluginManager.loadPlugin(pluginName)`
- `pluginManager.initializePlugins()`
- `pluginManager.startPlugins()`
- `pluginManager.stopPlugins()`
- `pluginManager.registerCommand(pluginName, command, handler, options)`
- `pluginManager.registerHook(pluginName, hook, handler, priority)`
- `pluginManager.executeHook(hook, data)`

### **Plugin Structure**
```javascript
class MyPlugin {
  constructor(options) {
    this.name = options.name;
    this.config = options.config;
    this.manager = options.manager;
  }

  async initialize() {
    // Plugin initialization
  }

  async start() {
    // Plugin startup
  }

  async stop() {
    // Plugin shutdown
  }
}

module.exports = MyPlugin;
```

---

## 📊 **Analytics API**

### **Analytics**
```javascript
const Analytics = require('eleven-cursor/src/lib/analytics');

const analytics = new Analytics({
  enabled: true,
  anonymize: true,
  retentionDays: 30
});
```

#### **Methods**
- `analytics.trackCommand(command, options, duration, success, metadata)`
- `analytics.trackError(errorType, message, context, metadata)`
- `analytics.trackPerformance(metric, value, unit, metadata)`
- `analytics.trackUsage(feature, data, metadata)`
- `analytics.trackSystemEvent(event, data, metadata)`
- `analytics.getSummary()`
- `analytics.getCommandStats(command)`
- `analytics.getErrorStats()`
- `analytics.getPerformanceStats(metric)`
- `analytics.getUsageStats()`
- `analytics.exportData(options)`

---

## 🛡️ **Error Handling API**

### **Error Handler**
```javascript
const ErrorHandler = require('eleven-cursor/src/lib/error-handler');

// Handle specific error
ErrorHandler.handle(error, context, options);

// Create custom error
const customError = ErrorHandler.createError('CUSTOM_ERROR', message, code);

// Setup global handlers
ErrorHandler.setupGlobalHandlers();
```

#### **Error Types**
- `API_ERROR`: API-related errors
- `FILE_ERROR`: File operation errors
- `CONFIG_ERROR`: Configuration errors
- `NETWORK_ERROR`: Network-related errors
- `VALIDATION_ERROR`: Input validation errors

#### **Error Handling Options**
```javascript
{
  exit: true,        // Exit process on error
  showStack: false,  // Show stack trace
  silent: false      // Silent mode
}
```

---

## 🧪 **Testing API**

### **Test Runner**
```javascript
const TestRunner = require('eleven-cursor/src/lib/test-runner');

const testRunner = new TestRunner({
  testDir: './tests',
  coverageDir: './coverage',
  parallel: true,
  maxWorkers: 4
});
```

#### **Methods**
- `testRunner.runTests(options)`
- `testRunner.watchTests()`
- `testRunner.getStats()`
- `testRunner.cleanup()`

---

## 📚 **Documentation API**

### **Documentation Generator**
```javascript
const DocsGenerator = require('eleven-cursor/src/lib/docs-generator');

const docsGenerator = new DocsGenerator({
  docsDir: './docs',
  srcDir: './src',
  outputDir: './docs-generated'
});
```

#### **Methods**
- `docsGenerator.generateAll(options)`
- `docsGenerator.generateAPIReference()`
- `docsGenerator.generateCommandDocs()`
- `docsGenerator.generateExamples()`
- `docsGenerator.generateGuides()`
- `docsGenerator.getStats()`

---

## 🔧 **Advanced Configuration**

### **Environment Variables**
```bash
# ElevenLabs API Configuration
ELEVEN_API_KEY=your_api_key_here
DEFAULT_VOICE_ID=EXAVITQu4vr4xnSDxMaL

# Cursor CLI Configuration
CURSOR_AGENT_PATH=cursor-agent
CURSOR_PROJECT_PATH=./

# Debug and Logging
DEBUG=false
LOG_LEVEL=info
SILENT=false

# API Configuration
ELEVEN_API_BASE_URL=https://api.elevenlabs.io/v1
REQUEST_TIMEOUT=30000
MAX_RETRIES=3

# Output Directories
DEFAULT_OUTPUT_DIR=./output
TEMP_DIR=./temp
```

### **Configuration File**
```json
{
  "elevenApiKey": "your_api_key_here",
  "defaultVoiceId": "EXAVITQu4vr4xnSDxMaL",
  "outputDir": "./output",
  "tempDir": "./temp",
  "debug": false,
  "logLevel": "info",
  "cache": {
    "enabled": true,
    "maxSize": "100MB",
    "ttl": "5m",
    "persistent": true
  },
  "api": {
    "baseUrl": "https://api.elevenlabs.io/v1",
    "timeout": 30000,
    "maxRetries": 3,
    "rateLimit": {
      "requests": 100,
      "window": "1m"
    }
  }
}
```

---

## 🎯 **Usage Examples**

### **Basic Voice Synthesis**
```javascript
const { APIClient } = require('eleven-cursor');

const apiClient = new APIClient({
  apiKey: process.env.ELEVEN_API_KEY
});

// Synthesize voice
const audio = await apiClient.post('/text-to-speech/EXAVITQu4vr4xnSDxMaL', {
  text: 'Hello, world!',
  voice_settings: {
    stability: 0.8,
    similarity_boost: 0.9
  }
});
```

### **Voice Cloning**
```javascript
const { APIClient } = require('eleven-cursor');

const apiClient = new APIClient({
  apiKey: process.env.ELEVEN_API_KEY
});

// Clone voice
const formData = new FormData();
formData.append('name', 'My Voice');
formData.append('files', audioFile);

const clonedVoice = await apiClient.post('/voices/add', formData);
```

### **Analytics Tracking**
```javascript
const { Analytics } = require('eleven-cursor');

const analytics = new Analytics();

// Track command usage
analytics.trackCommand('test', { voice: 'EXAVITQu4vr4xnSDxMaL' }, 1500, true);

// Track performance
analytics.trackPerformance('api_response_time', 500, 'ms');

// Track errors
analytics.trackError('API_ERROR', 'Invalid API key', 'test_command');
```

---

## 🚀 **Advanced Usage**

### **Custom Plugin Development**
```javascript
class CustomPlugin {
  constructor(options) {
    this.name = options.name;
    this.manager = options.manager;
  }

  async initialize() {
    // Register custom command
    this.manager.registerCommand(this.name, 'custom', this.handleCustomCommand, {
      description: 'Custom command',
      usage: 'eleven custom [options]'
    });
  }

  async handleCustomCommand(options) {
    console.log('Custom command executed!');
  }
}

module.exports = CustomPlugin;
```

### **Custom Template Development**
```json
{
  "name": "Custom Template",
  "description": "Custom voice agent template",
  "category": "voice-agent",
  "language": "javascript",
  "framework": "node",
  "features": ["voice-synthesis", "custom-feature"],
  "requirements": {
    "node": ">=16.0.0"
  },
  "installDependencies": true,
  "additionalFiles": {
    "src/custom.js": "// Custom implementation"
  }
}
```

---

## 📝 **API Response Formats**

### **Success Response**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### **Error Response**
```json
{
  "success": false,
  "error": {
    "type": "API_ERROR",
    "message": "Invalid API key",
    "code": "INVALID_API_KEY",
    "details": { ... }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### **Analytics Response**
```json
{
  "session": {
    "id": "session_123",
    "duration": 3600000,
    "startTime": "2024-01-01T00:00:00.000Z"
  },
  "commands": {
    "test": {
      "count": 10,
      "successCount": 9,
      "avgDuration": 1500
    }
  },
  "performance": {
    "cache_hit_rate": 85.5,
    "api_response_time": 500
  }
}
```

---

## 🎉 **You're Ready!**

This API reference provides everything you need to integrate with and extend the Eleven-Cursor CLI. The system is designed to be modular, extensible, and easy to use.

**Happy coding!** 🚀