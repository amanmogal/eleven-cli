const axios = require('axios');
const { EventEmitter } = require('events');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');

// Import utilities
const Logger = require('./logger');
const CacheManager = require('./cache-manager');

const logger = new Logger();

/**
 * High-Performance API Client with Connection Pooling and Retry Logic
 * Optimized for ElevenLabs API with intelligent caching and rate limiting
 */
class APIClient extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.baseURL = options.baseURL || 'https://api.elevenlabs.io/v1';
    this.apiKey = options.apiKey;
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.retryMultiplier = options.retryMultiplier || 2;
    this.maxRetryDelay = options.maxRetryDelay || 10000;
    
    // Rate limiting
    this.rateLimit = {
      requests: options.rateLimit?.requests || 100,
      window: options.rateLimit?.window || 60000, // 1 minute
      current: 0,
      resetTime: Date.now() + 60000
    };
    
    // Connection pooling
    this.maxConcurrent = options.maxConcurrent || 10;
    this.activeRequests = 0;
    this.requestQueue = [];
    
    // Caching
    this.cache = new CacheManager({
      maxSize: options.cacheSize || 50 * 1024 * 1024, // 50MB
      ttl: options.cacheTTL || 300000, // 5 minutes
      persistent: options.persistentCache !== false
    });
    
    // Metrics
    this.metrics = {
      requests: 0,
      responses: 0,
      errors: 0,
      cacheHits: 0,
      cacheMisses: 0,
      retries: 0,
      rateLimited: 0
    };
    
    this.initialize();
  }

  /**
   * Initialize API client
   * @private
   */
  initialize() {
    // Create axios instance with optimized configuration
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'User-Agent': 'eleven-cursor/1.0.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      maxRedirects: 3,
      maxContentLength: 50 * 1024 * 1024, // 50MB
      maxBodyLength: 50 * 1024 * 1024,
      validateStatus: (status) => status < 500, // Don't throw on 4xx
      httpAgent: this.createHttpAgent(),
      httpsAgent: this.createHttpsAgent()
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => this.handleRequest(config),
      (error) => this.handleRequestError(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => this.handleResponse(response),
      (error) => this.handleResponseError(error)
    );

    // Setup cache event listeners
    this.cache.on('hit', (data) => {
      this.metrics.cacheHits++;
      this.emit('cacheHit', data);
    });

    this.cache.on('miss', (data) => {
      this.metrics.cacheMisses++;
      this.emit('cacheMiss', data);
    });

    logger.debug('API client initialized');
  }

  /**
   * Create HTTP agent for connection pooling
   * @returns {Object} HTTP agent configuration
   * @private
   */
  createHttpAgent() {
    return {
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: this.maxConcurrent,
      maxFreeSockets: 5,
      timeout: this.timeout,
      freeSocketTimeout: 30000
    };
  }

  /**
   * Create HTTPS agent for connection pooling
   * @returns {Object} HTTPS agent configuration
   * @private
   */
  createHttpsAgent() {
    return {
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: this.maxConcurrent,
      maxFreeSockets: 5,
      timeout: this.timeout,
      freeSocketTimeout: 30000,
      rejectUnauthorized: true
    };
  }

  /**
   * Handle outgoing request
   * @param {Object} config - Axios config
   * @returns {Promise<Object>} Modified config
   * @private
   */
  async handleRequest(config) {
    // Add API key
    if (this.apiKey) {
      config.headers['xi-api-key'] = this.apiKey;
    }

    // Add request ID for tracking
    config.metadata = {
      requestId: this.generateRequestId(),
      startTime: Date.now(),
      retryCount: 0
    };

    // Check rate limiting
    await this.checkRateLimit();

    // Check cache for GET requests
    if (config.method === 'get' && config.cache !== false) {
      const cacheKey = this.generateCacheKey(config);
      const cached = await this.cache.get(cacheKey);
      
      if (cached) {
        config.cached = true;
        config.cachedData = cached;
        return config;
      }
    }

    this.metrics.requests++;
    this.activeRequests++;
    
    this.emit('request', {
      method: config.method,
      url: config.url,
      requestId: config.metadata.requestId
    });

    return config;
  }

  /**
   * Handle request error
   * @param {Error} error - Request error
   * @returns {Promise<Error>} Error
   * @private
   */
  async handleRequestError(error) {
    this.metrics.errors++;
    this.emit('requestError', error);
    return Promise.reject(error);
  }

  /**
   * Handle response
   * @param {Object} response - Axios response
   * @returns {Promise<Object>} Response
   * @private
   */
  async handleResponse(response) {
    const { config, data, status } = response;
    const duration = Date.now() - config.metadata.startTime;

    this.metrics.responses++;
    this.activeRequests--;

    // Cache successful GET responses
    if (config.method === 'get' && status === 200 && config.cache !== false) {
      const cacheKey = this.generateCacheKey(config);
      await this.cache.set(cacheKey, data, {
        ttl: this.getCacheTTL(config.url)
      });
    }

    this.emit('response', {
      method: config.method,
      url: config.url,
      status,
      duration,
      requestId: config.metadata.requestId,
      cached: config.cached || false
    });

    return response;
  }

  /**
   * Handle response error with retry logic
   * @param {Error} error - Response error
   * @returns {Promise<Object>} Response or error
   * @private
   */
  async handleResponseError(error) {
    const config = error.config;
    
    if (!config || !config.metadata) {
      this.metrics.errors++;
      return Promise.reject(error);
    }

    const { requestId, retryCount } = config.metadata;
    const isRetryable = this.isRetryableError(error);
    const shouldRetry = retryCount < this.maxRetries && isRetryable;

    if (shouldRetry) {
      config.metadata.retryCount++;
      this.metrics.retries++;

      const delay = this.calculateRetryDelay(retryCount);
      
      this.emit('retry', {
        requestId,
        retryCount: retryCount + 1,
        delay,
        error: error.message
      });

      await this.sleep(delay);
      return this.client.request(config);
    }

    this.metrics.errors++;
    this.activeRequests--;

    this.emit('error', {
      requestId,
      retryCount,
      error: error.message,
      status: error.response?.status
    });

    return Promise.reject(error);
  }

  /**
   * Check rate limiting
   * @private
   */
  async checkRateLimit() {
    const now = Date.now();
    
    // Reset counter if window has passed
    if (now > this.rateLimit.resetTime) {
      this.rateLimit.current = 0;
      this.rateLimit.resetTime = now + this.rateLimit.window;
    }

    // Check if we're at the limit
    if (this.rateLimit.current >= this.rateLimit.requests) {
      const waitTime = this.rateLimit.resetTime - now;
      
      this.metrics.rateLimited++;
      this.emit('rateLimited', { waitTime, current: this.rateLimit.current });
      
      await this.sleep(waitTime);
      this.rateLimit.current = 0;
      this.rateLimit.resetTime = Date.now() + this.rateLimit.window;
    }

    this.rateLimit.current++;
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} Is retryable
   * @private
   */
  isRetryableError(error) {
    if (!error.response) {
      // Network error - retryable
      return true;
    }

    const status = error.response.status;
    
    // Retry on 5xx errors and specific 4xx errors
    return status >= 500 || 
           status === 408 || // Request Timeout
           status === 429 || // Too Many Requests
           status === 502 || // Bad Gateway
           status === 503 || // Service Unavailable
           status === 504;   // Gateway Timeout
  }

  /**
   * Calculate retry delay with exponential backoff
   * @param {number} retryCount - Current retry count
   * @returns {number} Delay in milliseconds
   * @private
   */
  calculateRetryDelay(retryCount) {
    const delay = this.retryDelay * Math.pow(this.retryMultiplier, retryCount);
    const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
    return Math.min(delay + jitter, this.maxRetryDelay);
  }

  /**
   * Generate cache key for request
   * @param {Object} config - Axios config
   * @returns {string} Cache key
   * @private
   */
  generateCacheKey(config) {
    const key = `${config.method}:${config.url}`;
    const params = config.params ? JSON.stringify(config.params) : '';
    const data = config.data ? JSON.stringify(config.data) : '';
    return `${key}:${params}:${data}`;
  }

  /**
   * Get cache TTL for URL
   * @param {string} url - Request URL
   * @returns {number} TTL in milliseconds
   * @private
   */
  getCacheTTL(url) {
    // Different TTL for different endpoints
    if (url.includes('/voices')) return 300000; // 5 minutes
    if (url.includes('/text-to-speech')) return 60000; // 1 minute
    return 300000; // Default 5 minutes
  }

  /**
   * Generate unique request ID
   * @returns {string} Request ID
   * @private
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep for specified duration
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   * @private
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Make API request with intelligent caching and retry
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async request(method, url, options = {}) {
    try {
      // Check cache first for GET requests
      if (method.toLowerCase() === 'get' && options.cache !== false) {
        const cacheKey = this.generateCacheKey({ method, url, params: options.params });
        const cached = await this.cache.get(cacheKey);
        
        if (cached) {
          this.emit('cacheHit', { url, cacheKey });
          return cached;
        }
      }

      // Make request
      const response = await this.client.request({
        method,
        url,
        ...options
      });

      // Handle cached response
      if (response.config.cached) {
        return response.config.cachedData;
      }

      return response.data;

    } catch (error) {
      this.emit('requestError', {
        method,
        url,
        error: error.message,
        status: error.response?.status
      });
      throw error;
    }
  }

  /**
   * GET request
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async get(url, options = {}) {
    return this.request('GET', url, options);
  }

  /**
   * POST request
   * @param {string} url - Request URL
   * @param {Object} data - Request data
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async post(url, data, options = {}) {
    return this.request('POST', url, { ...options, data });
  }

  /**
   * PUT request
   * @param {string} url - Request URL
   * @param {Object} data - Request data
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async put(url, data, options = {}) {
    return this.request('PUT', url, { ...options, data });
  }

  /**
   * DELETE request
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async delete(url, options = {}) {
    return this.request('DELETE', url, options);
  }

  /**
   * Stream request for large responses
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<Stream>} Response stream
   */
  async stream(method, url, options = {}) {
    const response = await this.client.request({
      method,
      url,
      responseType: 'stream',
      ...options
    });

    return response.data;
  }

  /**
   * Get client metrics
   * @returns {Object} Metrics
   */
  getMetrics() {
    const cacheStats = this.cache.getStats();
    
    return {
      ...this.metrics,
      activeRequests: this.activeRequests,
      queuedRequests: this.requestQueue.length,
      rateLimit: {
        current: this.rateLimit.current,
        limit: this.rateLimit.requests,
        resetTime: this.rateLimit.resetTime
      },
      cache: cacheStats
    };
  }

  /**
   * Clear cache
   * @returns {Promise<void>}
   */
  async clearCache() {
    await this.cache.clear();
    this.emit('cacheCleared');
  }

  /**
   * Update rate limit settings
   * @param {Object} rateLimit - New rate limit settings
   */
  updateRateLimit(rateLimit) {
    this.rateLimit = { ...this.rateLimit, ...rateLimit };
    this.emit('rateLimitUpdated', this.rateLimit);
  }

  /**
   * Destroy client and cleanup resources
   * @returns {Promise<void>}
   */
  async destroy() {
    try {
      await this.cache.destroy();
      this.removeAllListeners();
      logger.debug('API client destroyed');
    } catch (error) {
      logger.error(`API client destroy error: ${error.message}`);
    }
  }
}

module.exports = APIClient;