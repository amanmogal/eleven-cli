const fs = require('fs-extra');
const path = require('path');
const { EventEmitter } = require('events');

// Import utilities
const Logger = require('./logger');
const FileManager = require('./file-manager');

const logger = new Logger();
const fileManager = new FileManager();

/**
 * Analytics and Monitoring System
 * Tracks usage patterns, performance metrics, and system health
 */
class Analytics extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.enabled = options.enabled !== false;
    this.anonymize = options.anonymize !== false;
    this.dataDir = options.dataDir || path.join(process.cwd(), '.analytics');
    this.retentionDays = options.retentionDays || 30;
    this.batchSize = options.batchSize || 100;
    this.flushInterval = options.flushInterval || 60000; // 1 minute
    
    // Metrics storage
    this.metrics = {
      commands: new Map(),
      errors: new Map(),
      performance: new Map(),
      usage: new Map(),
      system: new Map()
    };
    
    // Event queue for batching
    this.eventQueue = [];
    this.flushTimer = null;
    
    // Session tracking
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    
    this.initialize();
  }

  /**
   * Initialize analytics system
   * @private
   */
  async initialize() {
    if (!this.enabled) return;

    try {
      await fileManager.ensureDir(this.dataDir);
      
      // Start flush timer
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.flushInterval);
      
      // Track session start
      this.trackEvent('session_start', {
        sessionId: this.sessionId,
        timestamp: this.sessionStart,
        version: process.env.npm_package_version || '1.0.0',
        platform: process.platform,
        nodeVersion: process.version
      });
      
      logger.debug('Analytics system initialized');
    } catch (error) {
      logger.error(`Failed to initialize analytics: ${error.message}`);
    }
  }

  /**
   * Generate unique session ID
   * @returns {string} Session ID
   * @private
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track command execution
   * @param {string} command - Command name
   * @param {Object} options - Command options
   * @param {number} duration - Execution duration
   * @param {boolean} success - Success status
   * @param {Object} metadata - Additional metadata
   */
  trackCommand(command, options = {}, duration = 0, success = true, metadata = {}) {
    if (!this.enabled) return;

    const event = {
      type: 'command',
      command,
      options: this.anonymize ? this.anonymizeOptions(options) : options,
      duration,
      success,
      metadata: this.anonymize ? this.anonymizeMetadata(metadata) : metadata,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    this.queueEvent(event);
    this.updateCommandMetrics(command, duration, success);
  }

  /**
   * Track error occurrence
   * @param {string} errorType - Error type
   * @param {string} message - Error message
   * @param {string} context - Error context
   * @param {Object} metadata - Additional metadata
   */
  trackError(errorType, message, context = '', metadata = {}) {
    if (!this.enabled) return;

    const event = {
      type: 'error',
      errorType,
      message: this.anonymize ? this.anonymizeString(message) : message,
      context,
      metadata: this.anonymize ? this.anonymizeMetadata(metadata) : metadata,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    this.queueEvent(event);
    this.updateErrorMetrics(errorType, context);
  }

  /**
   * Track performance metric
   * @param {string} metric - Metric name
   * @param {number} value - Metric value
   * @param {string} unit - Metric unit
   * @param {Object} metadata - Additional metadata
   */
  trackPerformance(metric, value, unit = 'ms', metadata = {}) {
    if (!this.enabled) return;

    const event = {
      type: 'performance',
      metric,
      value,
      unit,
      metadata: this.anonymize ? this.anonymizeMetadata(metadata) : metadata,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    this.queueEvent(event);
    this.updatePerformanceMetrics(metric, value, unit);
  }

  /**
   * Track usage pattern
   * @param {string} feature - Feature name
   * @param {Object} data - Usage data
   * @param {Object} metadata - Additional metadata
   */
  trackUsage(feature, data = {}, metadata = {}) {
    if (!this.enabled) return;

    const event = {
      type: 'usage',
      feature,
      data: this.anonymize ? this.anonymizeData(data) : data,
      metadata: this.anonymize ? this.anonymizeMetadata(metadata) : metadata,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    this.queueEvent(event);
    this.updateUsageMetrics(feature, data);
  }

  /**
   * Track system event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @param {Object} metadata - Additional metadata
   */
  trackSystemEvent(event, data = {}, metadata = {}) {
    if (!this.enabled) return;

    const eventData = {
      type: 'system',
      event,
      data: this.anonymize ? this.anonymizeData(data) : data,
      metadata: this.anonymize ? this.anonymizeMetadata(metadata) : metadata,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    this.queueEvent(eventData);
    this.updateSystemMetrics(event, data);
  }

  /**
   * Queue event for batch processing
   * @param {Object} event - Event data
   * @private
   */
  queueEvent(event) {
    this.eventQueue.push(event);
    
    if (this.eventQueue.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Flush queued events to storage
   * @private
   */
  async flush() {
    if (this.eventQueue.length === 0) return;

    try {
      const events = [...this.eventQueue];
      this.eventQueue = [];

      const filename = `events_${Date.now()}.json`;
      const filepath = path.join(this.dataDir, filename);
      
      await fileManager.writeFile(filepath, JSON.stringify(events, null, 0));
      
      this.emit('eventsFlushed', { count: events.length, filename });
      
    } catch (error) {
      logger.error(`Failed to flush analytics events: ${error.message}`);
      this.emit('flushError', error);
    }
  }

  /**
   * Update command metrics
   * @param {string} command - Command name
   * @param {number} duration - Execution duration
   * @param {boolean} success - Success status
   * @private
   */
  updateCommandMetrics(command, duration, success) {
    if (!this.metrics.commands.has(command)) {
      this.metrics.commands.set(command, {
        count: 0,
        successCount: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        lastExecuted: null
      });
    }

    const metric = this.metrics.commands.get(command);
    metric.count++;
    metric.totalDuration += duration;
    metric.avgDuration = metric.totalDuration / metric.count;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    metric.lastExecuted = Date.now();

    if (success) {
      metric.successCount++;
    }
  }

  /**
   * Update error metrics
   * @param {string} errorType - Error type
   * @param {string} context - Error context
   * @private
   */
  updateErrorMetrics(errorType, context) {
    const key = `${errorType}:${context}`;
    
    if (!this.metrics.errors.has(key)) {
      this.metrics.errors.set(key, {
        count: 0,
        firstOccurred: Date.now(),
        lastOccurred: null
      });
    }

    const metric = this.metrics.errors.get(key);
    metric.count++;
    metric.lastOccurred = Date.now();
  }

  /**
   * Update performance metrics
   * @param {string} metric - Metric name
   * @param {number} value - Metric value
   * @param {string} unit - Metric unit
   * @private
   */
  updatePerformanceMetrics(metric, value, unit) {
    if (!this.metrics.performance.has(metric)) {
      this.metrics.performance.set(metric, {
        count: 0,
        total: 0,
        average: 0,
        min: Infinity,
        max: 0,
        unit,
        lastUpdated: null
      });
    }

    const perfMetric = this.metrics.performance.get(metric);
    perfMetric.count++;
    perfMetric.total += value;
    perfMetric.average = perfMetric.total / perfMetric.count;
    perfMetric.min = Math.min(perfMetric.min, value);
    perfMetric.max = Math.max(perfMetric.max, value);
    perfMetric.lastUpdated = Date.now();
  }

  /**
   * Update usage metrics
   * @param {string} feature - Feature name
   * @param {Object} data - Usage data
   * @private
   */
  updateUsageMetrics(feature, data) {
    if (!this.metrics.usage.has(feature)) {
      this.metrics.usage.set(feature, {
        count: 0,
        lastUsed: null,
        data: {}
      });
    }

    const metric = this.metrics.usage.get(feature);
    metric.count++;
    metric.lastUsed = Date.now();
    
    // Merge usage data
    Object.assign(metric.data, data);
  }

  /**
   * Update system metrics
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @private
   */
  updateSystemMetrics(event, data) {
    if (!this.metrics.system.has(event)) {
      this.metrics.system.set(event, {
        count: 0,
        lastOccurred: null,
        data: {}
      });
    }

    const metric = this.metrics.system.get(event);
    metric.count++;
    metric.lastOccurred = Date.now();
    
    // Merge system data
    Object.assign(metric.data, data);
  }

  /**
   * Anonymize options data
   * @param {Object} options - Options to anonymize
   * @returns {Object} Anonymized options
   * @private
   */
  anonymizeOptions(options) {
    const sensitive = ['apiKey', 'password', 'token', 'secret'];
    const anonymized = { ...options };
    
    for (const key of sensitive) {
      if (anonymized[key]) {
        anonymized[key] = '[REDACTED]';
      }
    }
    
    return anonymized;
  }

  /**
   * Anonymize metadata
   * @param {Object} metadata - Metadata to anonymize
   * @returns {Object} Anonymized metadata
   * @private
   */
  anonymizeMetadata(metadata) {
    const sensitive = ['path', 'file', 'url', 'email'];
    const anonymized = { ...metadata };
    
    for (const key of sensitive) {
      if (anonymized[key]) {
        anonymized[key] = this.anonymizeString(anonymized[key]);
      }
    }
    
    return anonymized;
  }

  /**
   * Anonymize data object
   * @param {Object} data - Data to anonymize
   * @returns {Object} Anonymized data
   * @private
   */
  anonymizeData(data) {
    const anonymized = { ...data };
    
    // Remove or hash sensitive fields
    if (anonymized.path) {
      anonymized.path = this.hashString(anonymized.path);
    }
    
    if (anonymized.file) {
      anonymized.file = this.hashString(anonymized.file);
    }
    
    return anonymized;
  }

  /**
   * Anonymize string
   * @param {string} str - String to anonymize
   * @returns {string} Anonymized string
   * @private
   */
  anonymizeString(str) {
    if (typeof str !== 'string') return str;
    
    // Hash the string to maintain uniqueness while anonymizing
    return this.hashString(str);
  }

  /**
   * Hash string for anonymization
   * @param {string} str - String to hash
   * @returns {string} Hashed string
   * @private
   */
  hashString(str) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(str).digest('hex').substring(0, 8);
  }

  /**
   * Get analytics summary
   * @returns {Object} Analytics summary
   */
  getSummary() {
    const sessionDuration = Date.now() - this.sessionStart;
    
    return {
      session: {
        id: this.sessionId,
        duration: sessionDuration,
        startTime: this.sessionStart
      },
      commands: Object.fromEntries(this.metrics.commands),
      errors: Object.fromEntries(this.metrics.errors),
      performance: Object.fromEntries(this.metrics.performance),
      usage: Object.fromEntries(this.metrics.usage),
      system: Object.fromEntries(this.metrics.system),
      queue: {
        pending: this.eventQueue.length,
        batchSize: this.batchSize
      }
    };
  }

  /**
   * Get command statistics
   * @param {string} command - Command name (optional)
   * @returns {Object} Command statistics
   */
  getCommandStats(command = null) {
    if (command) {
      return this.metrics.commands.get(command) || null;
    }
    
    return Object.fromEntries(this.metrics.commands);
  }

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getErrorStats() {
    const errors = Object.fromEntries(this.metrics.errors);
    const totalErrors = Object.values(errors).reduce((sum, err) => sum + err.count, 0);
    
    return {
      total: totalErrors,
      byType: errors,
      topErrors: Object.entries(errors)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 10)
    };
  }

  /**
   * Get performance statistics
   * @param {string} metric - Metric name (optional)
   * @returns {Object} Performance statistics
   */
  getPerformanceStats(metric = null) {
    if (metric) {
      return this.metrics.performance.get(metric) || null;
    }
    
    return Object.fromEntries(this.metrics.performance);
  }

  /**
   * Get usage statistics
   * @returns {Object} Usage statistics
   */
  getUsageStats() {
    const usage = Object.fromEntries(this.metrics.usage);
    const totalUsage = Object.values(usage).reduce((sum, u) => sum + u.count, 0);
    
    return {
      total: totalUsage,
      byFeature: usage,
      topFeatures: Object.entries(usage)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 10)
    };
  }

  /**
   * Export analytics data
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Exported data
   */
  async exportData(options = {}) {
    const {
      format = 'json',
      includeEvents = false,
      startDate = null,
      endDate = null
    } = options;

    const data = {
      summary: this.getSummary(),
      exportedAt: Date.now(),
      version: process.env.npm_package_version || '1.0.0'
    };

    if (includeEvents) {
      data.events = await this.getEvents(startDate, endDate);
    }

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return data;
  }

  /**
   * Get events from storage
   * @param {number} startDate - Start date timestamp
   * @param {number} endDate - End date timestamp
   * @returns {Promise<Array>} Events array
   * @private
   */
  async getEvents(startDate = null, endDate = null) {
    try {
      const files = await fs.readdir(this.dataDir);
      const eventFiles = files.filter(f => f.startsWith('events_') && f.endsWith('.json'));
      const events = [];

      for (const file of eventFiles) {
        const filepath = path.join(this.dataDir, file);
        const fileEvents = await fileManager.readFile(filepath, 'utf8');
        const parsedEvents = JSON.parse(fileEvents);

        // Filter by date range if specified
        const filteredEvents = parsedEvents.filter(event => {
          if (startDate && event.timestamp < startDate) return false;
          if (endDate && event.timestamp > endDate) return false;
          return true;
        });

        events.push(...filteredEvents);
      }

      return events.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      logger.error(`Failed to get events: ${error.message}`);
      return [];
    }
  }

  /**
   * Convert data to CSV format
   * @param {Object} data - Data to convert
   * @returns {string} CSV data
   * @private
   */
  convertToCSV(data) {
    // Simple CSV conversion - in production, use a proper CSV library
    const lines = [];
    lines.push('Type,Command,Count,Success Rate,Avg Duration');
    
    for (const [command, stats] of Object.entries(data.summary.commands)) {
      const successRate = stats.count > 0 ? (stats.successCount / stats.count * 100).toFixed(2) : 0;
      lines.push(`command,${command},${stats.count},${successRate}%,${stats.avgDuration.toFixed(2)}ms`);
    }
    
    return lines.join('\n');
  }

  /**
   * Clean up old analytics data
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      const cutoffTime = Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000);
      const files = await fs.readdir(this.dataDir);
      
      for (const file of files) {
        if (file.startsWith('events_') && file.endsWith('.json')) {
          const filepath = path.join(this.dataDir, file);
          const stats = await fs.stat(filepath);
          
          if (stats.mtime.getTime() < cutoffTime) {
            await fs.remove(filepath);
            logger.debug(`Cleaned up old analytics file: ${file}`);
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to cleanup analytics data: ${error.message}`);
    }
  }

  /**
   * Destroy analytics system
   * @returns {Promise<void>}
   */
  async destroy() {
    try {
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
      }
      
      await this.flush();
      this.removeAllListeners();
      
      logger.debug('Analytics system destroyed');
    } catch (error) {
      logger.error(`Analytics destroy error: ${error.message}`);
    }
  }
}

module.exports = Analytics;