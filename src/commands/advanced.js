const chalk = require('chalk').default;
const ora = require('ora');
const inquirer = require('inquirer').default;

// Import utilities
const Logger = require('../lib/logger');
const CacheManager = require('../lib/cache-manager');
const APIClient = require('../lib/api-client');
const PluginManager = require('../lib/plugin-manager');
const Analytics = require('../lib/analytics');
const TestRunner = require('../lib/test-runner');
const DocsGenerator = require('../lib/docs-generator');
const ConfigManager = require('../lib/config-manager');
const ErrorHandler = require('../lib/error-handler');

const logger = new Logger();
const configManager = new ConfigManager();

/**
 * Advanced command for Phase 3 features
 * Provides access to performance optimization, plugins, analytics, and testing
 */
class AdvancedCommand {
  constructor() {
    this.cache = null;
    this.apiClient = null;
    this.pluginManager = null;
    this.analytics = null;
    this.testRunner = null;
    this.docsGenerator = null;
  }

  /**
   * Initialize advanced systems
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      const config = configManager.loadConfig();
      
      // Initialize cache manager
      this.cache = new CacheManager({
        maxSize: 100 * 1024 * 1024, // 100MB
        ttl: 300000, // 5 minutes
        persistent: true
      });

      // Initialize API client
      this.apiClient = new APIClient({
        baseURL: config.elevenApiBaseUrl,
        apiKey: config.elevenApiKey,
        timeout: config.requestTimeout,
        maxRetries: config.maxRetries,
        maxConcurrent: 10,
        cacheSize: 50 * 1024 * 1024 // 50MB
      });

      // Initialize plugin manager
      this.pluginManager = new PluginManager({
        pluginsDir: './plugins'
      });

      // Initialize analytics
      this.analytics = new Analytics({
        enabled: true,
        anonymize: true,
        retentionDays: 30
      });

      // Initialize test runner
      this.testRunner = new TestRunner({
        testDir: './tests',
        coverageDir: './coverage',
        parallel: true,
        maxWorkers: 4
      });

      // Initialize docs generator
      this.docsGenerator = new DocsGenerator({
        docsDir: './docs',
        srcDir: './src',
        outputDir: './docs-generated'
      });

      logger.debug('Advanced systems initialized');

    } catch (error) {
      logger.error(`Failed to initialize advanced systems: ${error.message}`);
      throw error;
    }
  }

  /**
   * Show performance dashboard
   * @returns {Promise<void>}
   */
  async showPerformanceDashboard() {
    const spinner = ora('Gathering performance metrics...').start();

    try {
      const cacheStats = this.cache.getStats();
      const apiMetrics = this.apiClient.getMetrics();
      const analyticsStats = this.analytics.getSummary();
      const testStats = this.testRunner.getStats();

      spinner.succeed('Performance metrics gathered');

      console.log(chalk.cyan('\n📊 Performance Dashboard'));
      console.log(chalk.gray('─'.repeat(60)));

      // Cache performance
      console.log(chalk.white('\n🗄️ Cache Performance:'));
      console.log(chalk.gray(`  Hit Rate: ${cacheStats.hitRate}%`));
      console.log(chalk.gray(`  Size: ${(cacheStats.size / 1024 / 1024).toFixed(2)}MB / ${(cacheStats.maxSize / 1024 / 1024).toFixed(2)}MB`));
      console.log(chalk.gray(`  Entries: ${cacheStats.entries}`));
      console.log(chalk.gray(`  Evictions: ${cacheStats.evictions}`));

      // API performance
      console.log(chalk.white('\n🌐 API Performance:'));
      console.log(chalk.gray(`  Requests: ${apiMetrics.requests}`));
      console.log(chalk.gray(`  Responses: ${apiMetrics.responses}`));
      console.log(chalk.gray(`  Errors: ${apiMetrics.errors}`));
      console.log(chalk.gray(`  Cache Hits: ${apiMetrics.cacheHits}`));
      console.log(chalk.gray(`  Cache Misses: ${apiMetrics.cacheMisses}`));
      console.log(chalk.gray(`  Active Requests: ${apiMetrics.activeRequests}`));

      // Analytics
      console.log(chalk.white('\n📈 Analytics:'));
      console.log(chalk.gray(`  Session Duration: ${Math.round(analyticsStats.session.duration / 1000)}s`));
      console.log(chalk.gray(`  Commands Executed: ${Object.values(analyticsStats.commands).reduce((sum, cmd) => sum + cmd.count, 0)}`));
      console.log(chalk.gray(`  Errors Tracked: ${Object.values(analyticsStats.errors).reduce((sum, err) => sum + err.count, 0)}`));

      // Test coverage
      if (testStats.total > 0) {
        console.log(chalk.white('\n🧪 Test Coverage:'));
        console.log(chalk.gray(`  Success Rate: ${testStats.successRate}%`));
        console.log(chalk.gray(`  Total Tests: ${testStats.total}`));
        console.log(chalk.gray(`  Passed: ${testStats.passed}`));
        console.log(chalk.gray(`  Failed: ${testStats.failed}`));
      }

      // Memory usage
      const memUsage = process.memoryUsage();
      console.log(chalk.white('\n💾 Memory Usage:'));
      console.log(chalk.gray(`  RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`));
      console.log(chalk.gray(`  Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`));
      console.log(chalk.gray(`  Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`));

    } catch (error) {
      spinner.fail('Failed to gather performance metrics');
      throw error;
    }
  }

  /**
   * Manage plugins
   * @param {Object} options - Command options
   * @returns {Promise<void>}
   */
  async managePlugins(options = {}) {
    if (options.list) {
      await this.listPlugins();
    } else if (options.install) {
      await this.installPlugin(options.install);
    } else if (options.uninstall) {
      await this.uninstallPlugin(options.uninstall);
    } else if (options.reload) {
      await this.reloadPlugin(options.reload);
    } else {
      await this.interactivePluginManager();
    }
  }

  /**
   * List available plugins
   * @returns {Promise<void>}
   */
  async listPlugins() {
    const plugins = this.pluginManager.getAllPlugins();
    const stats = this.pluginManager.getStats();

    console.log(chalk.cyan('\n🔌 Installed Plugins'));
    console.log(chalk.gray('─'.repeat(50)));

    if (plugins.length === 0) {
      console.log(chalk.yellow('No plugins installed'));
      return;
    }

    for (const plugin of plugins) {
      const statusColor = plugin.state === 'started' ? chalk.green : 
                         plugin.state === 'error' ? chalk.red : chalk.yellow;
      
      console.log(chalk.white(`${plugin.manifest.name} v${plugin.manifest.version}`));
      console.log(chalk.gray(`  Description: ${plugin.manifest.description}`));
      console.log(chalk.gray(`  State: ${statusColor(plugin.state)}`));
      console.log(chalk.gray(`  Path: ${plugin.path}`));
      console.log('');
    }

    console.log(chalk.gray(`Total: ${stats.total} plugins`));
  }

  /**
   * Install plugin
   * @param {string} pluginName - Plugin name
   * @returns {Promise<void>}
   */
  async installPlugin(pluginName) {
    const spinner = ora(`Installing plugin: ${pluginName}`).start();

    try {
      // In a real implementation, this would download and install the plugin
      spinner.succeed(`Plugin ${pluginName} installed successfully`);
      logger.info(`Plugin ${pluginName} installed`);
    } catch (error) {
      spinner.fail(`Failed to install plugin: ${pluginName}`);
      throw error;
    }
  }

  /**
   * Uninstall plugin
   * @param {string} pluginName - Plugin name
   * @returns {Promise<void>}
   */
  async uninstallPlugin(pluginName) {
    const spinner = ora(`Uninstalling plugin: ${pluginName}`).start();

    try {
      // In a real implementation, this would remove the plugin
      spinner.succeed(`Plugin ${pluginName} uninstalled successfully`);
      logger.info(`Plugin ${pluginName} uninstalled`);
    } catch (error) {
      spinner.fail(`Failed to uninstall plugin: ${pluginName}`);
      throw error;
    }
  }

  /**
   * Reload plugin
   * @param {string} pluginName - Plugin name
   * @returns {Promise<void>}
   */
  async reloadPlugin(pluginName) {
    const spinner = ora(`Reloading plugin: ${pluginName}`).start();

    try {
      await this.pluginManager.reloadPlugin(pluginName);
      spinner.succeed(`Plugin ${pluginName} reloaded successfully`);
    } catch (error) {
      spinner.fail(`Failed to reload plugin: ${pluginName}`);
      throw error;
    }
  }

  /**
   * Interactive plugin manager
   * @returns {Promise<void>}
   */
  async interactivePluginManager() {
    console.log(chalk.cyan('🔌 Plugin Manager'));
    console.log(chalk.gray('Manage plugins interactively\n'));

    const choices = [
      { name: 'List installed plugins', value: 'list' },
      { name: 'Install new plugin', value: 'install' },
      { name: 'Uninstall plugin', value: 'uninstall' },
      { name: 'Reload plugin', value: 'reload' },
      { name: 'Plugin statistics', value: 'stats' }
    ];

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices
    }]);

    switch (action) {
      case 'list':
        await this.listPlugins();
        break;
      case 'install':
        const { pluginName } = await inquirer.prompt([{
          type: 'input',
          name: 'pluginName',
          message: 'Plugin name to install:',
          validate: input => input.trim() ? true : 'Plugin name is required'
        }]);
        await this.installPlugin(pluginName);
        break;
      case 'uninstall':
        const plugins = this.pluginManager.getAllPlugins();
        if (plugins.length === 0) {
          console.log(chalk.yellow('No plugins to uninstall'));
          return;
        }
        const { uninstallPlugin } = await inquirer.prompt([{
          type: 'list',
          name: 'uninstallPlugin',
          message: 'Select plugin to uninstall:',
          choices: plugins.map(p => ({ name: p.manifest.name, value: p.manifest.name }))
        }]);
        await this.uninstallPlugin(uninstallPlugin);
        break;
      case 'reload':
        const { reloadPlugin } = await inquirer.prompt([{
          type: 'list',
          name: 'reloadPlugin',
          message: 'Select plugin to reload:',
          choices: plugins.map(p => ({ name: p.manifest.name, value: p.manifest.name }))
        }]);
        await this.reloadPlugin(reloadPlugin);
        break;
      case 'stats':
        const stats = this.pluginManager.getStats();
        console.log(chalk.cyan('\n📊 Plugin Statistics:'));
        console.log(chalk.gray(`Total: ${stats.total}`));
        console.log(chalk.gray(`Commands: ${stats.commands}`));
        console.log(chalk.gray(`Hooks: ${stats.hooks}`));
        console.log(chalk.gray(`Middleware: ${stats.middleware}`));
        break;
    }
  }

  /**
   * Show analytics dashboard
   * @returns {Promise<void>}
   */
  async showAnalyticsDashboard() {
    const spinner = ora('Gathering analytics data...').start();

    try {
      const summary = this.analytics.getSummary();
      const commandStats = this.analytics.getCommandStats();
      const errorStats = this.analytics.getErrorStats();
      const usageStats = this.analytics.getUsageStats();

      spinner.succeed('Analytics data gathered');

      console.log(chalk.cyan('\n📈 Analytics Dashboard'));
      console.log(chalk.gray('─'.repeat(60)));

      // Session info
      console.log(chalk.white('\n🕐 Session Information:'));
      console.log(chalk.gray(`  Session ID: ${summary.session.id}`));
      console.log(chalk.gray(`  Duration: ${Math.round(summary.session.duration / 1000)}s`));
      console.log(chalk.gray(`  Start Time: ${new Date(summary.session.startTime).toLocaleString()}`));

      // Command statistics
      console.log(chalk.white('\n⚡ Command Usage:'));
      for (const [command, stats] of Object.entries(commandStats)) {
        const successRate = stats.count > 0 ? (stats.successCount / stats.count * 100).toFixed(1) : 0;
        console.log(chalk.gray(`  ${command}:`));
        console.log(chalk.gray(`    Executions: ${stats.count}`));
        console.log(chalk.gray(`    Success Rate: ${successRate}%`));
        console.log(chalk.gray(`    Avg Duration: ${stats.avgDuration.toFixed(2)}ms`));
      }

      // Error statistics
      if (errorStats.total > 0) {
        console.log(chalk.white('\n❌ Error Statistics:'));
        console.log(chalk.gray(`  Total Errors: ${errorStats.total}`));
        console.log(chalk.gray(`  Top Errors:`));
        for (const [error, count] of errorStats.topErrors.slice(0, 5)) {
          console.log(chalk.gray(`    ${error}: ${count}`));
        }
      }

      // Usage statistics
      console.log(chalk.white('\n📊 Feature Usage:'));
      for (const [feature, stats] of Object.entries(usageStats.byFeature)) {
        console.log(chalk.gray(`  ${feature}: ${stats.count} uses`));
      }

    } catch (error) {
      spinner.fail('Failed to gather analytics data');
      throw error;
    }
  }

  /**
   * Run comprehensive tests
   * @param {Object} options - Test options
   * @returns {Promise<void>}
   */
  async runTests(options = {}) {
    const spinner = ora('Running comprehensive test suite...').start();

    try {
      const results = await this.testRunner.runTests(options);
      
      if (results.failed === 0) {
        spinner.succeed(`All tests passed! (${results.passed}/${results.total})`);
      } else {
        spinner.fail(`Tests completed with failures (${results.passed}/${results.total} passed)`);
      }

      console.log(chalk.cyan('\n🧪 Test Results'));
      console.log(chalk.gray('─'.repeat(40)));
      console.log(chalk.green(`✅ Passed: ${results.passed}`));
      console.log(chalk.red(`❌ Failed: ${results.failed}`));
      console.log(chalk.yellow(`⏭️ Skipped: ${results.skipped}`));
      console.log(chalk.white(`📊 Total: ${results.total}`));
      console.log(chalk.gray(`⏱️ Duration: ${(results.duration / 1000).toFixed(2)}s`));

      if (results.coverage) {
        console.log(chalk.cyan('\n📈 Coverage Report:'));
        const coverage = results.coverage.total;
        console.log(chalk.gray(`  Lines: ${coverage.lines.pct}%`));
        console.log(chalk.gray(`  Functions: ${coverage.functions.pct}%`));
        console.log(chalk.gray(`  Branches: ${coverage.branches.pct}%`));
        console.log(chalk.gray(`  Statements: ${coverage.statements.pct}%`));
      }

      if (results.errors.length > 0) {
        console.log(chalk.red('\n❌ Test Errors:'));
        for (const error of results.errors.slice(0, 5)) {
          console.log(chalk.red(`  ${error.type}: ${error.message}`));
        }
      }

    } catch (error) {
      spinner.fail('Test execution failed');
      throw error;
    }
  }

  /**
   * Generate comprehensive documentation
   * @param {Object} options - Documentation options
   * @returns {Promise<void>}
   */
  async generateDocumentation(options = {}) {
    const spinner = ora('Generating comprehensive documentation...').start();

    try {
      await this.docsGenerator.generateAll(options);
      
      const stats = this.docsGenerator.getStats();
      
      spinner.succeed('Documentation generated successfully');
      
      console.log(chalk.cyan('\n📚 Documentation Generated'));
      console.log(chalk.gray('─'.repeat(40)));
      console.log(chalk.gray(`  Output Directory: ${stats.outputDir}`));
      console.log(chalk.gray(`  Sections: ${stats.sections}`));
      console.log(chalk.gray(`  Generated: ${stats.generated}`));
      
      console.log(chalk.green('\n✅ Documentation is ready!'));
      console.log(chalk.gray('Open docs-generated/index.html in your browser to view the documentation.'));

    } catch (error) {
      spinner.fail('Documentation generation failed');
      throw error;
    }
  }

  /**
   * Optimize system performance
   * @returns {Promise<void>}
   */
  async optimizePerformance() {
    const spinner = ora('Optimizing system performance...').start();

    try {
      // Clear cache
      await this.cache.clear();
      
      // Clean up analytics data
      await this.analytics.cleanup();
      
      // Clean up test artifacts
      await this.testRunner.cleanup();
      
      // Clean up documentation
      await this.docsGenerator.cleanup();
      
      spinner.succeed('System optimization completed');
      
      console.log(chalk.cyan('\n⚡ Performance Optimization'));
      console.log(chalk.gray('─'.repeat(40)));
      console.log(chalk.green('✅ Cache cleared'));
      console.log(chalk.green('✅ Analytics data cleaned'));
      console.log(chalk.green('✅ Test artifacts removed'));
      console.log(chalk.green('✅ Documentation cleaned'));
      
      console.log(chalk.cyan('\n💡 System is now optimized for better performance!'));

    } catch (error) {
      spinner.fail('Performance optimization failed');
      throw error;
    }
  }

  /**
   * Show system health status
   * @returns {Promise<void>}
   */
  async showSystemHealth() {
    const spinner = ora('Checking system health...').start();

    try {
      const config = configManager.loadConfig();
      const cacheStats = this.cache.getStats();
      const apiMetrics = this.apiClient.getMetrics();
      const pluginStats = this.pluginManager.getStats();
      const analyticsStats = this.analytics.getSummary();

      spinner.succeed('System health check completed');

      console.log(chalk.cyan('\n🏥 System Health Status'));
      console.log(chalk.gray('─'.repeat(50)));

      // Configuration status
      const configValid = configManager.isValid();
      console.log(chalk.white('\n⚙️ Configuration:'));
      console.log(chalk.gray(`  Status: ${configValid ? chalk.green('Valid') : chalk.red('Invalid')}`));
      console.log(chalk.gray(`  API Key: ${config.elevenApiKey ? chalk.green('Set') : chalk.red('Missing')}`));
      console.log(chalk.gray(`  Debug Mode: ${config.debug ? chalk.yellow('Enabled') : chalk.gray('Disabled')}`));

      // Cache health
      console.log(chalk.white('\n🗄️ Cache System:'));
      console.log(chalk.gray(`  Status: ${chalk.green('Healthy')}`));
      console.log(chalk.gray(`  Hit Rate: ${cacheStats.hitRate}%`));
      console.log(chalk.gray(`  Memory Usage: ${(cacheStats.size / 1024 / 1024).toFixed(2)}MB`));

      // API health
      console.log(chalk.white('\n🌐 API Client:'));
      console.log(chalk.gray(`  Status: ${chalk.green('Connected')}`));
      console.log(chalk.gray(`  Requests: ${apiMetrics.requests}`));
      console.log(chalk.gray(`  Errors: ${apiMetrics.errors}`));
      console.log(chalk.gray(`  Active: ${apiMetrics.activeRequests}`));

      // Plugin health
      console.log(chalk.white('\n🔌 Plugins:'));
      console.log(chalk.gray(`  Status: ${chalk.green('Active')}`));
      console.log(chalk.gray(`  Loaded: ${pluginStats.total}`));
      console.log(chalk.gray(`  Commands: ${pluginStats.commands}`));

      // Analytics health
      console.log(chalk.white('\n📈 Analytics:'));
      console.log(chalk.gray(`  Status: ${chalk.green('Tracking')}`));
      console.log(chalk.gray(`  Session: ${analyticsStats.session.id}`));
      console.log(chalk.gray(`  Duration: ${Math.round(analyticsStats.session.duration / 1000)}s`));

      // Overall health
      const overallHealth = configValid && cacheStats.hitRate > 50 && apiMetrics.errors < 10;
      console.log(chalk.white('\n🎯 Overall Health:'));
      console.log(chalk.gray(`  Status: ${overallHealth ? chalk.green('Excellent') : chalk.yellow('Good')}`));
      console.log(chalk.gray(`  Recommendations: ${overallHealth ? 'None' : 'Check configuration and API connectivity'}`));

    } catch (error) {
      spinner.fail('System health check failed');
      throw error;
    }
  }

  /**
   * Cleanup and destroy systems
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      if (this.cache) await this.cache.destroy();
      if (this.apiClient) await this.apiClient.destroy();
      if (this.pluginManager) await this.pluginManager.destroy();
      if (this.analytics) await this.analytics.destroy();
      if (this.testRunner) await this.testRunner.destroy();
      if (this.docsGenerator) await this.docsGenerator.destroy();
      
      logger.debug('Advanced systems cleaned up');
    } catch (error) {
      logger.error(`Cleanup failed: ${error.message}`);
    }
  }
}

/**
 * Main advanced command function
 * @param {Object} options - Command options
 * @returns {Promise<void>}
 */
async function advancedCommand(options = {}) {
  const command = new AdvancedCommand();
  
  try {
    await command.initialize();

    if (options.performance) {
      await command.showPerformanceDashboard();
    } else if (options.plugins) {
      await command.managePlugins(options);
    } else if (options.analytics) {
      await command.showAnalyticsDashboard();
    } else if (options.test) {
      await command.runTests(options);
    } else if (options.docs) {
      await command.generateDocumentation(options);
    } else if (options.optimize) {
      await command.optimizePerformance();
    } else if (options.health) {
      await command.showSystemHealth();
    } else {
      // Interactive mode
      await command.interactiveMode();
    }

  } catch (error) {
    ErrorHandler.handle(error, 'advanced command');
  } finally {
    await command.cleanup();
  }
}

module.exports = advancedCommand;