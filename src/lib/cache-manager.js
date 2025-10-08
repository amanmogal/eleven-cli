const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { EventEmitter } = require('events');

// Import utilities
const Logger = require('./logger');
const FileManager = require('./file-manager');

const logger = new Logger();

/**
 * High-Performance Cache Manager
 * Provides intelligent caching with TTL, LRU eviction, and persistence
 */
class CacheManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.maxSize = options.maxSize || 100 * 1024 * 1024; // 100MB default
    this.ttl = options.ttl || 3600000; // 1 hour default
    this.persistent = options.persistent !== false;
    this.cacheDir = options.cacheDir || path.join(process.cwd(), '.cache');
    this.compression = options.compression !== false;
    
    // In-memory cache
    this.cache = new Map();
    this.accessOrder = new Map();
    this.size = 0;
    this.hits = 0;
    this.misses = 0;
    
    // Performance metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      writes: 0,
      reads: 0,
      errors: 0
    };
    
    this.initialize();
  }

  /**
   * Initialize cache system
   * @private
   */
  async initialize() {
    try {
      if (this.persistent) {
        await fs.ensureDir(this.cacheDir);
        await this.loadPersistentCache();
      }
      
      // Start cleanup interval
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 60000); // Cleanup every minute
      
      logger.debug('Cache manager initialized');
    } catch (error) {
      logger.error(`Failed to initialize cache: ${error.message}`);
      this.metrics.errors++;
    }
  }

  /**
   * Generate cache key from data
   * @param {string} key - Base key
   * @param {Object} data - Data to hash
   * @returns {string} Cache key
   * @private
   */
  generateKey(key, data = {}) {
    const hash = crypto.createHash('sha256');
    hash.update(key);
    hash.update(JSON.stringify(data));
    return hash.digest('hex').substring(0, 16);
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @param {Object} options - Cache options
   * @returns {Promise<*>} Cached value or null
   */
  async get(key, options = {}) {
    try {
      this.metrics.reads++;
      
      const cacheKey = this.generateKey(key, options);
      const item = this.cache.get(cacheKey);
      
      if (!item) {
        this.metrics.misses++;
        this.misses++;
        return null;
      }
      
      // Check TTL
      if (Date.now() > item.expires) {
        this.cache.delete(cacheKey);
        this.accessOrder.delete(cacheKey);
        this.size -= item.size;
        this.metrics.misses++;
        this.misses++;
        return null;
      }
      
      // Update access order for LRU
      this.accessOrder.set(cacheKey, Date.now());
      
      this.metrics.hits++;
      this.hits++;
      
      // Load from persistent storage if needed
      if (item.persistent && !item.loaded) {
        try {
          const persistentData = await this.loadFromPersistent(cacheKey);
          if (persistentData) {
            item.value = persistentData;
            item.loaded = true;
          }
        } catch (error) {
          logger.warn(`Failed to load persistent cache for ${key}: ${error.message}`);
        }
      }
      
      this.emit('hit', { key, cacheKey, size: item.size });
      return item.value;
      
    } catch (error) {
      logger.error(`Cache get error for ${key}: ${error.message}`);
      this.metrics.errors++;
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {Object} options - Cache options
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, options = {}) {
    try {
      this.metrics.writes++;
      
      const ttl = options.ttl || this.ttl;
      const persistent = options.persistent !== false && this.persistent;
      const priority = options.priority || 'normal';
      
      const cacheKey = this.generateKey(key, options);
      const size = this.calculateSize(value);
      const expires = Date.now() + ttl;
      
      // Check if we need to evict
      await this.ensureSpace(size);
      
      const item = {
        key,
        value,
        size,
        expires,
        created: Date.now(),
        accessed: Date.now(),
        persistent,
        loaded: !persistent,
        priority
      };
      
      // Remove existing item if present
      if (this.cache.has(cacheKey)) {
        const existingItem = this.cache.get(cacheKey);
        this.size -= existingItem.size;
        this.accessOrder.delete(cacheKey);
      }
      
      this.cache.set(cacheKey, item);
      this.accessOrder.set(cacheKey, Date.now());
      this.size += size;
      
      // Save to persistent storage if needed
      if (persistent) {
        try {
          await this.saveToPersistent(cacheKey, value);
        } catch (error) {
          logger.warn(`Failed to save persistent cache for ${key}: ${error.message}`);
        }
      }
      
      this.emit('set', { key, cacheKey, size, ttl });
      return true;
      
    } catch (error) {
      logger.error(`Cache set error for ${key}: ${error.message}`);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @param {Object} options - Cache options
   * @returns {Promise<boolean>} Success status
   */
  async delete(key, options = {}) {
    try {
      const cacheKey = this.generateKey(key, options);
      const item = this.cache.get(cacheKey);
      
      if (item) {
        this.cache.delete(cacheKey);
        this.accessOrder.delete(cacheKey);
        this.size -= item.size;
        
        // Remove from persistent storage
        if (item.persistent) {
          await this.deleteFromPersistent(cacheKey);
        }
        
        this.emit('delete', { key, cacheKey });
        return true;
      }
      
      return false;
      
    } catch (error) {
      logger.error(`Cache delete error for ${key}: ${error.message}`);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @param {Object} options - Cache options
   * @returns {boolean} Exists status
   */
  has(key, options = {}) {
    const cacheKey = this.generateKey(key, options);
    const item = this.cache.get(cacheKey);
    
    if (!item) return false;
    
    // Check TTL
    if (Date.now() > item.expires) {
      this.cache.delete(cacheKey);
      this.accessOrder.delete(cacheKey);
      this.size -= item.size;
      return false;
    }
    
    return true;
  }

  /**
   * Clear all cache entries
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      this.cache.clear();
      this.accessOrder.clear();
      this.size = 0;
      
      if (this.persistent) {
        await fs.emptyDir(this.cacheDir);
      }
      
      this.emit('clear');
      logger.debug('Cache cleared');
      
    } catch (error) {
      logger.error(`Cache clear error: ${error.message}`);
      this.metrics.errors++;
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const hitRate = this.hits + this.misses > 0 ? 
      (this.hits / (this.hits + this.misses)) * 100 : 0;
    
    return {
      size: this.size,
      maxSize: this.maxSize,
      entries: this.cache.size,
      hitRate: parseFloat(hitRate.toFixed(2)),
      hits: this.hits,
      misses: this.misses,
      evictions: this.metrics.evictions,
      errors: this.metrics.errors,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  /**
   * Calculate size of value
   * @param {*} value - Value to measure
   * @returns {number} Size in bytes
   * @private
   */
  calculateSize(value) {
    try {
      return Buffer.byteLength(JSON.stringify(value), 'utf8');
    } catch (error) {
      return 1024; // Default size if calculation fails
    }
  }

  /**
   * Ensure space for new item
   * @param {number} requiredSize - Required size
   * @private
   */
  async ensureSpace(requiredSize) {
    while (this.size + requiredSize > this.maxSize && this.cache.size > 0) {
      await this.evictLRU();
    }
  }

  /**
   * Evict least recently used item
   * @private
   */
  async evictLRU() {
    if (this.accessOrder.size === 0) return;
    
    // Find LRU item
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, time] of this.accessOrder) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      const item = this.cache.get(oldestKey);
      if (item) {
        this.cache.delete(oldestKey);
        this.accessOrder.delete(oldestKey);
        this.size -= item.size;
        this.metrics.evictions++;
        
        // Remove from persistent storage
        if (item.persistent) {
          await this.deleteFromPersistent(oldestKey);
        }
        
        this.emit('evict', { key: item.key, size: item.size });
      }
    }
  }

  /**
   * Cleanup expired entries
   * @private
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache) {
      if (now > item.expires) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        this.size -= item.size;
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired cache entries`);
      this.emit('cleanup', { cleaned });
    }
  }

  /**
   * Load persistent cache on startup
   * @private
   */
  async loadPersistentCache() {
    try {
      const manifestPath = path.join(this.cacheDir, 'manifest.json');
      
      if (await fs.pathExists(manifestPath)) {
        const manifest = await fs.readJson(manifestPath);
        
        for (const [key, metadata] of Object.entries(manifest)) {
          if (Date.now() < metadata.expires) {
            this.cache.set(key, {
              ...metadata,
              loaded: false
            });
            this.accessOrder.set(key, metadata.accessed);
            this.size += metadata.size;
          }
        }
        
        logger.debug(`Loaded ${Object.keys(manifest).length} persistent cache entries`);
      }
    } catch (error) {
      logger.warn(`Failed to load persistent cache: ${error.message}`);
    }
  }

  /**
   * Save to persistent storage
   * @param {string} cacheKey - Cache key
   * @param {*} value - Value to save
   * @private
   */
  async saveToPersistent(cacheKey, value) {
    try {
      const filePath = path.join(this.cacheDir, `${cacheKey}.json`);
      await fs.writeJson(filePath, value, { spaces: 0 });
    } catch (error) {
      logger.warn(`Failed to save persistent cache for ${cacheKey}: ${error.message}`);
    }
  }

  /**
   * Load from persistent storage
   * @param {string} cacheKey - Cache key
   * @returns {Promise<*>} Loaded value
   * @private
   */
  async loadFromPersistent(cacheKey) {
    try {
      const filePath = path.join(this.cacheDir, `${cacheKey}.json`);
      return await fs.readJson(filePath);
    } catch (error) {
      logger.warn(`Failed to load persistent cache for ${cacheKey}: ${error.message}`);
      return null;
    }
  }

  /**
   * Delete from persistent storage
   * @param {string} cacheKey - Cache key
   * @private
   */
  async deleteFromPersistent(cacheKey) {
    try {
      const filePath = path.join(this.cacheDir, `${cacheKey}.json`);
      await fs.remove(filePath);
    } catch (error) {
      logger.warn(`Failed to delete persistent cache for ${cacheKey}: ${error.message}`);
    }
  }

  /**
   * Save cache manifest
   * @private
   */
  async saveManifest() {
    try {
      const manifest = {};
      
      for (const [key, item] of this.cache) {
        if (item.persistent) {
          manifest[key] = {
            key: item.key,
            size: item.size,
            expires: item.expires,
            created: item.created,
            accessed: item.accessed,
            priority: item.priority
          };
        }
      }
      
      const manifestPath = path.join(this.cacheDir, 'manifest.json');
      await fs.writeJson(manifestPath, manifest, { spaces: 2 });
    } catch (error) {
      logger.warn(`Failed to save cache manifest: ${error.message}`);
    }
  }

  /**
   * Destroy cache manager
   */
  async destroy() {
    try {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }
      
      if (this.persistent) {
        await this.saveManifest();
      }
      
      this.removeAllListeners();
      logger.debug('Cache manager destroyed');
    } catch (error) {
      logger.error(`Cache destroy error: ${error.message}`);
    }
  }
}

module.exports = CacheManager;