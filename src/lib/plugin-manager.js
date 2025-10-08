const fs = require('fs-extra');
const path = require('path');
const { EventEmitter } = require('events');

// Import utilities
const Logger = require('./logger');
const FileManager = require('./file-manager');

const logger = new Logger();
const fileManager = new FileManager();

/**
 * Plugin Manager for extensible architecture
 * Provides plugin loading, lifecycle management, and event system
 */
class PluginManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.pluginsDir = options.pluginsDir || path.join(process.cwd(), 'plugins');
    this.plugins = new Map();
    this.hooks = new Map();
    this.commands = new Map();
    this.middleware = [];
    
    // Plugin lifecycle states
    this.states = {
      LOADING: 'loading',
      LOADED: 'loaded',
      INITIALIZING: 'initializing',
      INITIALIZED: 'initialized',
      STARTING: 'starting',
      STARTED: 'started',
      STOPPING: 'stopping',
      STOPPED: 'stopped',
      ERROR: 'error'
    };
    
    this.initialize();
  }

  /**
   * Initialize plugin manager
   * @private
   */
  async initialize() {
    try {
      await fileManager.ensureDir(this.pluginsDir);
      await this.loadPlugins();
      logger.debug('Plugin manager initialized');
    } catch (error) {
      logger.error(`Failed to initialize plugin manager: ${error.message}`);
    }
  }

  /**
   * Load all plugins from plugins directory
   * @private
   */
  async loadPlugins() {
    try {
      const pluginDirs = await fs.readdir(this.pluginsDir, { withFileTypes: true });
      
      for (const dirent of pluginDirs) {
        if (dirent.isDirectory()) {
          await this.loadPlugin(dirent.name);
        }
      }
    } catch (error) {
      logger.warn(`Failed to load plugins: ${error.message}`);
    }
  }

  /**
   * Load individual plugin
   * @param {string} pluginName - Plugin name
   * @private
   */
  async loadPlugin(pluginName) {
    try {
      const pluginPath = path.join(this.pluginsDir, pluginName);
      const manifestPath = path.join(pluginPath, 'plugin.json');
      
      if (!await fileManager.exists(manifestPath)) {
        logger.warn(`Plugin ${pluginName} missing manifest file`);
        return;
      }

      const manifest = await fileManager.readFile(manifestPath, 'utf8');
      const pluginConfig = JSON.parse(manifest);

      // Validate plugin configuration
      if (!this.validatePluginConfig(pluginConfig)) {
        logger.warn(`Plugin ${pluginName} has invalid configuration`);
        return;
      }

      // Load plugin module
      const modulePath = path.join(pluginPath, pluginConfig.main || 'index.js');
      const PluginClass = require(modulePath);

      // Create plugin instance
      const plugin = new PluginClass({
        name: pluginName,
        config: pluginConfig,
        path: pluginPath,
        manager: this
      });

      // Set initial state
      plugin.state = this.states.LOADED;
      plugin.manifest = pluginConfig;

      this.plugins.set(pluginName, plugin);
      
      logger.debug(`Plugin ${pluginName} loaded successfully`);
      this.emit('pluginLoaded', { name: pluginName, plugin });

    } catch (error) {
      logger.error(`Failed to load plugin ${pluginName}: ${error.message}`);
      this.emit('pluginError', { name: pluginName, error: error.message });
    }
  }

  /**
   * Validate plugin configuration
   * @param {Object} config - Plugin configuration
   * @returns {boolean} Is valid
   * @private
   */
  validatePluginConfig(config) {
    const required = ['name', 'version', 'description'];
    
    for (const field of required) {
      if (!config[field]) {
        logger.warn(`Plugin missing required field: ${field}`);
        return false;
      }
    }

    // Validate version format
    if (!/^\d+\.\d+\.\d+/.test(config.version)) {
      logger.warn(`Plugin ${config.name} has invalid version format`);
      return false;
    }

    return true;
  }

  /**
   * Initialize all loaded plugins
   * @returns {Promise<void>}
   */
  async initializePlugins() {
    const initPromises = [];
    
    for (const [name, plugin] of this.plugins) {
      if (plugin.state === this.states.LOADED) {
        initPromises.push(this.initializePlugin(name));
      }
    }

    await Promise.allSettled(initPromises);
  }

  /**
   * Initialize individual plugin
   * @param {string} pluginName - Plugin name
   * @returns {Promise<void>}
   * @private
   */
  async initializePlugin(pluginName) {
    try {
      const plugin = this.plugins.get(pluginName);
      if (!plugin) return;

      plugin.state = this.states.INITIALIZING;
      
      if (typeof plugin.initialize === 'function') {
        await plugin.initialize();
      }

      plugin.state = this.states.INITIALIZED;
      
      logger.debug(`Plugin ${pluginName} initialized`);
      this.emit('pluginInitialized', { name: pluginName, plugin });

    } catch (error) {
      plugin.state = this.states.ERROR;
      logger.error(`Failed to initialize plugin ${pluginName}: ${error.message}`);
      this.emit('pluginError', { name: pluginName, error: error.message });
    }
  }

  /**
   * Start all initialized plugins
   * @returns {Promise<void>}
   */
  async startPlugins() {
    const startPromises = [];
    
    for (const [name, plugin] of this.plugins) {
      if (plugin.state === this.states.INITIALIZED) {
        startPromises.push(this.startPlugin(name));
      }
    }

    await Promise.allSettled(startPromises);
  }

  /**
   * Start individual plugin
   * @param {string} pluginName - Plugin name
   * @returns {Promise<void>}
   * @private
   */
  async startPlugin(pluginName) {
    try {
      const plugin = this.plugins.get(pluginName);
      if (!plugin) return;

      plugin.state = this.states.STARTING;
      
      if (typeof plugin.start === 'function') {
        await plugin.start();
      }

      plugin.state = this.states.STARTED;
      
      logger.debug(`Plugin ${pluginName} started`);
      this.emit('pluginStarted', { name: pluginName, plugin });

    } catch (error) {
      plugin.state = this.states.ERROR;
      logger.error(`Failed to start plugin ${pluginName}: ${error.message}`);
      this.emit('pluginError', { name: pluginName, error: error.message });
    }
  }

  /**
   * Stop all running plugins
   * @returns {Promise<void>}
   */
  async stopPlugins() {
    const stopPromises = [];
    
    for (const [name, plugin] of this.plugins) {
      if (plugin.state === this.states.STARTED) {
        stopPromises.push(this.stopPlugin(name));
      }
    }

    await Promise.allSettled(stopPromises);
  }

  /**
   * Stop individual plugin
   * @param {string} pluginName - Plugin name
   * @returns {Promise<void>}
   * @private
   */
  async stopPlugin(pluginName) {
    try {
      const plugin = this.plugins.get(pluginName);
      if (!plugin) return;

      plugin.state = this.states.STOPPING;
      
      if (typeof plugin.stop === 'function') {
        await plugin.stop();
      }

      plugin.state = this.states.STOPPED;
      
      logger.debug(`Plugin ${pluginName} stopped`);
      this.emit('pluginStopped', { name: pluginName, plugin });

    } catch (error) {
      plugin.state = this.states.ERROR;
      logger.error(`Failed to stop plugin ${pluginName}: ${error.message}`);
      this.emit('pluginError', { name: pluginName, error: error.message });
    }
  }

  /**
   * Register plugin command
   * @param {string} pluginName - Plugin name
   * @param {string} command - Command name
   * @param {Function} handler - Command handler
   * @param {Object} options - Command options
   */
  registerCommand(pluginName, command, handler, options = {}) {
    const commandKey = `${pluginName}:${command}`;
    
    this.commands.set(commandKey, {
      plugin: pluginName,
      command,
      handler,
      options: {
        description: options.description || `Plugin command: ${command}`,
        usage: options.usage || '',
        aliases: options.aliases || [],
        ...options
      }
    });

    logger.debug(`Command ${commandKey} registered`);
    this.emit('commandRegistered', { plugin: pluginName, command, options });
  }

  /**
   * Unregister plugin command
   * @param {string} pluginName - Plugin name
   * @param {string} command - Command name
   */
  unregisterCommand(pluginName, command) {
    const commandKey = `${pluginName}:${command}`;
    
    if (this.commands.has(commandKey)) {
      this.commands.delete(commandKey);
      logger.debug(`Command ${commandKey} unregistered`);
      this.emit('commandUnregistered', { plugin: pluginName, command });
    }
  }

  /**
   * Register plugin hook
   * @param {string} pluginName - Plugin name
   * @param {string} hook - Hook name
   * @param {Function} handler - Hook handler
   * @param {number} priority - Hook priority (higher = earlier execution)
   */
  registerHook(pluginName, hook, handler, priority = 0) {
    if (!this.hooks.has(hook)) {
      this.hooks.set(hook, []);
    }

    const hookData = {
      plugin: pluginName,
      handler,
      priority
    };

    this.hooks.get(hook).push(hookData);
    this.hooks.get(hook).sort((a, b) => b.priority - a.priority);

    logger.debug(`Hook ${hook} registered for plugin ${pluginName}`);
    this.emit('hookRegistered', { plugin: pluginName, hook, priority });
  }

  /**
   * Unregister plugin hook
   * @param {string} pluginName - Plugin name
   * @param {string} hook - Hook name
   */
  unregisterHook(pluginName, hook) {
    if (this.hooks.has(hook)) {
      const hooks = this.hooks.get(hook);
      const index = hooks.findIndex(h => h.plugin === pluginName);
      
      if (index !== -1) {
        hooks.splice(index, 1);
        logger.debug(`Hook ${hook} unregistered for plugin ${pluginName}`);
        this.emit('hookUnregistered', { plugin: pluginName, hook });
      }
    }
  }

  /**
   * Execute hook handlers
   * @param {string} hook - Hook name
   * @param {*} data - Hook data
   * @returns {Promise<*>} Modified data
   */
  async executeHook(hook, data) {
    if (!this.hooks.has(hook)) {
      return data;
    }

    let result = data;
    const hooks = this.hooks.get(hook);

    for (const hookData of hooks) {
      try {
        if (typeof hookData.handler === 'function') {
          result = await hookData.handler(result);
        }
      } catch (error) {
        logger.error(`Hook ${hook} error in plugin ${hookData.plugin}: ${error.message}`);
        this.emit('hookError', { 
          plugin: hookData.plugin, 
          hook, 
          error: error.message 
        });
      }
    }

    return result;
  }

  /**
   * Add middleware
   * @param {string} pluginName - Plugin name
   * @param {Function} middleware - Middleware function
   * @param {number} priority - Middleware priority
   */
  addMiddleware(pluginName, middleware, priority = 0) {
    this.middleware.push({
      plugin: pluginName,
      middleware,
      priority
    });

    this.middleware.sort((a, b) => b.priority - a.priority);
    
    logger.debug(`Middleware added for plugin ${pluginName}`);
    this.emit('middlewareAdded', { plugin: pluginName, priority });
  }

  /**
   * Remove middleware
   * @param {string} pluginName - Plugin name
   */
  removeMiddleware(pluginName) {
    const initialLength = this.middleware.length;
    this.middleware = this.middleware.filter(m => m.plugin !== pluginName);
    
    if (this.middleware.length < initialLength) {
      logger.debug(`Middleware removed for plugin ${pluginName}`);
      this.emit('middlewareRemoved', { plugin: pluginName });
    }
  }

  /**
   * Execute middleware chain
   * @param {string} command - Command name
   * @param {Object} context - Command context
   * @returns {Promise<Object>} Modified context
   */
  async executeMiddleware(command, context) {
    let result = context;

    for (const middlewareData of this.middleware) {
      try {
        if (typeof middlewareData.middleware === 'function') {
          result = await middlewareData.middleware(command, result);
        }
      } catch (error) {
        logger.error(`Middleware error in plugin ${middlewareData.plugin}: ${error.message}`);
        this.emit('middlewareError', { 
          plugin: middlewareData.plugin, 
          command, 
          error: error.message 
        });
      }
    }

    return result;
  }

  /**
   * Get plugin by name
   * @param {string} name - Plugin name
   * @returns {Object|null} Plugin instance
   */
  getPlugin(name) {
    return this.plugins.get(name) || null;
  }

  /**
   * Get all plugins
   * @returns {Array} Plugin instances
   */
  getAllPlugins() {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins by state
   * @param {string} state - Plugin state
   * @returns {Array} Plugin instances
   */
  getPluginsByState(state) {
    return this.getAllPlugins().filter(plugin => plugin.state === state);
  }

  /**
   * Get all registered commands
   * @returns {Array} Command definitions
   */
  getAllCommands() {
    return Array.from(this.commands.values());
  }

  /**
   * Get commands by plugin
   * @param {string} pluginName - Plugin name
   * @returns {Array} Command definitions
   */
  getCommandsByPlugin(pluginName) {
    return this.getAllCommands().filter(cmd => cmd.plugin === pluginName);
  }

  /**
   * Get plugin statistics
   * @returns {Object} Plugin statistics
   */
  getStats() {
    const plugins = this.getAllPlugins();
    const states = {};
    
    for (const state of Object.values(this.states)) {
      states[state] = plugins.filter(p => p.state === state).length;
    }

    return {
      total: plugins.length,
      states,
      commands: this.commands.size,
      hooks: this.hooks.size,
      middleware: this.middleware.length
    };
  }

  /**
   * Reload plugin
   * @param {string} pluginName - Plugin name
   * @returns {Promise<void>}
   */
  async reloadPlugin(pluginName) {
    try {
      // Stop and unload plugin
      await this.stopPlugin(pluginName);
      this.plugins.delete(pluginName);
      
      // Reload plugin
      await this.loadPlugin(pluginName);
      await this.initializePlugin(pluginName);
      await this.startPlugin(pluginName);
      
      logger.debug(`Plugin ${pluginName} reloaded`);
      this.emit('pluginReloaded', { name: pluginName });

    } catch (error) {
      logger.error(`Failed to reload plugin ${pluginName}: ${error.message}`);
      this.emit('pluginError', { name: pluginName, error: error.message });
    }
  }

  /**
   * Destroy plugin manager
   * @returns {Promise<void>}
   */
  async destroy() {
    try {
      await this.stopPlugins();
      this.plugins.clear();
      this.hooks.clear();
      this.commands.clear();
      this.middleware = [];
      this.removeAllListeners();
      
      logger.debug('Plugin manager destroyed');
    } catch (error) {
      logger.error(`Plugin manager destroy error: ${error.message}`);
    }
  }
}

module.exports = PluginManager;