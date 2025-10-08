const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');

// Import utilities
const Logger = require('./logger');
const FileManager = require('./file-manager');

const logger = new Logger();
const fileManager = new FileManager();

/**
 * Advanced Test Runner with comprehensive validation
 * Provides unit, integration, and end-to-end testing capabilities
 */
class TestRunner extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.testDir = options.testDir || path.join(process.cwd(), 'tests');
    this.coverageDir = options.coverageDir || path.join(process.cwd(), 'coverage');
    this.timeout = options.timeout || 30000;
    this.parallel = options.parallel !== false;
    this.maxWorkers = options.maxWorkers || 4;
    this.verbose = options.verbose || false;
    this.watch = options.watch || false;
    
    // Test configuration
    this.config = {
      testEnvironment: 'node',
      collectCoverage: true,
      coverageThreshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      },
      testMatch: [
        '**/tests/**/*.test.js',
        '**/tests/**/*.spec.js'
      ],
      setupFilesAfterEnv: [],
      reporters: ['default', 'json', 'html']
    };
    
    // Test results
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      duration: 0,
      coverage: null,
      errors: []
    };
    
    this.initialize();
  }

  /**
   * Initialize test runner
   * @private
   */
  async initialize() {
    try {
      await fileManager.ensureDir(this.testDir);
      await fileManager.ensureDir(this.coverageDir);
      
      logger.debug('Test runner initialized');
    } catch (error) {
      logger.error(`Failed to initialize test runner: ${error.message}`);
    }
  }

  /**
   * Run all tests
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test results
   */
  async runTests(options = {}) {
    const startTime = Date.now();
    
    try {
      this.emit('testRunStart', { options });
      
      // Discover test files
      const testFiles = await this.discoverTests();
      
      if (testFiles.length === 0) {
        logger.warn('No test files found');
        return this.results;
      }
      
      logger.info(`Found ${testFiles.length} test files`);
      
      // Run tests
      const results = await this.executeTests(testFiles, options);
      
      // Calculate coverage
      const coverage = await this.calculateCoverage();
      
      // Generate reports
      await this.generateReports(results, coverage);
      
      this.results = {
        ...results,
        duration: Date.now() - startTime,
        coverage
      };
      
      this.emit('testRunComplete', this.results);
      
      return this.results;
      
    } catch (error) {
      logger.error(`Test run failed: ${error.message}`);
      this.emit('testRunError', error);
      throw error;
    }
  }

  /**
   * Discover test files
   * @returns {Promise<Array>} Test file paths
   * @private
   */
  async discoverTests() {
    const testFiles = [];
    
    try {
      const files = await this.getAllFiles(this.testDir);
      
      for (const file of files) {
        if (this.isTestFile(file)) {
          testFiles.push(file);
        }
      }
      
      return testFiles;
    } catch (error) {
      logger.error(`Failed to discover tests: ${error.message}`);
      return [];
    }
  }

  /**
   * Get all files in directory recursively
   * @param {string} dir - Directory path
   * @returns {Promise<Array>} File paths
   * @private
   */
  async getAllFiles(dir) {
    const files = [];
    
    try {
      const items = await fs.readdir(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
          const subFiles = await this.getAllFiles(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
      
      return files;
    } catch (error) {
      logger.warn(`Failed to read directory ${dir}: ${error.message}`);
      return [];
    }
  }

  /**
   * Check if file is a test file
   * @param {string} filePath - File path
   * @returns {boolean} Is test file
   * @private
   */
  isTestFile(filePath) {
    const ext = path.extname(filePath);
    const basename = path.basename(filePath);
    
    return (ext === '.js' || ext === '.ts') && 
           (basename.includes('.test.') || basename.includes('.spec.'));
  }

  /**
   * Execute tests
   * @param {Array} testFiles - Test file paths
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test results
   * @private
   */
  async executeTests(testFiles, options) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      errors: []
    };
    
    if (this.parallel && testFiles.length > 1) {
      return this.runTestsInParallel(testFiles, options);
    } else {
      return this.runTestsSequentially(testFiles, options);
    }
  }

  /**
   * Run tests in parallel
   * @param {Array} testFiles - Test file paths
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test results
   * @private
   */
  async runTestsInParallel(testFiles, options) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      errors: []
    };
    
    const chunks = this.chunkArray(testFiles, this.maxWorkers);
    const promises = [];
    
    for (const chunk of chunks) {
      promises.push(this.runTestChunk(chunk, options));
    }
    
    const chunkResults = await Promise.allSettled(promises);
    
    for (const result of chunkResults) {
      if (result.status === 'fulfilled') {
        results.passed += result.value.passed;
        results.failed += result.value.failed;
        results.skipped += result.value.skipped;
        results.total += result.value.total;
        results.errors.push(...result.value.errors);
      } else {
        results.failed++;
        results.total++;
        results.errors.push({
          type: 'chunk_error',
          message: result.reason.message,
          stack: result.reason.stack
        });
      }
    }
    
    return results;
  }

  /**
   * Run tests sequentially
   * @param {Array} testFiles - Test file paths
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test results
   * @private
   */
  async runTestsSequentially(testFiles, options) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      errors: []
    };
    
    for (const testFile of testFiles) {
      try {
        const result = await this.runSingleTest(testFile, options);
        
        results.passed += result.passed;
        results.failed += result.failed;
        results.skipped += result.skipped;
        results.total += result.total;
        results.errors.push(...result.errors);
        
      } catch (error) {
        results.failed++;
        results.total++;
        results.errors.push({
          file: testFile,
          type: 'execution_error',
          message: error.message,
          stack: error.stack
        });
      }
    }
    
    return results;
  }

  /**
   * Run test chunk
   * @param {Array} testFiles - Test file paths
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test results
   * @private
   */
  async runTestChunk(testFiles, options) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      errors: []
    };
    
    for (const testFile of testFiles) {
      try {
        const result = await this.runSingleTest(testFile, options);
        
        results.passed += result.passed;
        results.failed += result.failed;
        results.skipped += result.skipped;
        results.total += result.total;
        results.errors.push(...result.errors);
        
      } catch (error) {
        results.failed++;
        results.total++;
        results.errors.push({
          file: testFile,
          type: 'execution_error',
          message: error.message,
          stack: error.stack
        });
      }
    }
    
    return results;
  }

  /**
   * Run single test file
   * @param {string} testFile - Test file path
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test results
   * @private
   */
  async runSingleTest(testFile, options) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const jestArgs = [
        '--testPathPattern', testFile,
        '--verbose',
        '--no-cache',
        '--detectOpenHandles',
        '--forceExit'
      ];
      
      if (this.config.collectCoverage) {
        jestArgs.push('--coverage');
        jestArgs.push('--coverageDirectory', this.coverageDir);
      }
      
      const jest = spawn('npx', ['jest', ...jestArgs], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });
      
      let stdout = '';
      let stderr = '';
      
      jest.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      jest.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      jest.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        try {
          const result = this.parseJestOutput(stdout, stderr, code, testFile, duration);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      jest.on('error', (error) => {
        reject(error);
      });
      
      // Set timeout
      setTimeout(() => {
        jest.kill('SIGTERM');
        reject(new Error(`Test timeout: ${testFile}`));
      }, this.timeout);
    });
  }

  /**
   * Parse Jest output
   * @param {string} stdout - Standard output
   * @param {string} stderr - Standard error
   * @param {number} code - Exit code
   * @param {string} testFile - Test file path
   * @param {number} duration - Test duration
   * @returns {Object} Parsed results
   * @private
   */
  parseJestOutput(stdout, stderr, code, testFile, duration) {
    const result = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      errors: [],
      duration
    };
    
    // Parse test results from stdout
    const testMatch = stdout.match(/(\d+) tests?/);
    const passMatch = stdout.match(/(\d+) passed/);
    const failMatch = stdout.match(/(\d+) failed/);
    const skipMatch = stdout.match(/(\d+) skipped/);
    
    if (testMatch) result.total = parseInt(testMatch[1]);
    if (passMatch) result.passed = parseInt(passMatch[1]);
    if (failMatch) result.failed = parseInt(failMatch[1]);
    if (skipMatch) result.skipped = parseInt(skipMatch[1]);
    
    // Parse errors
    if (code !== 0) {
      result.errors.push({
        file: testFile,
        type: 'test_failure',
        message: stderr || 'Test execution failed',
        output: stdout
      });
    }
    
    return result;
  }

  /**
   * Calculate test coverage
   * @returns {Promise<Object>} Coverage data
   * @private
   */
  async calculateCoverage() {
    try {
      const coverageFile = path.join(this.coverageDir, 'coverage-summary.json');
      
      if (await fileManager.exists(coverageFile)) {
        const coverageData = await fileManager.readFile(coverageFile, 'utf8');
        return JSON.parse(coverageData);
      }
      
      return null;
    } catch (error) {
      logger.warn(`Failed to calculate coverage: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate test reports
   * @param {Object} results - Test results
   * @param {Object} coverage - Coverage data
   * @returns {Promise<void>}
   * @private
   */
  async generateReports(results, coverage) {
    try {
      // Generate JSON report
      const jsonReport = {
        timestamp: Date.now(),
        results,
        coverage,
        environment: {
          node: process.version,
          platform: process.platform,
          arch: process.arch
        }
      };
      
      const jsonPath = path.join(this.coverageDir, 'test-results.json');
      await fileManager.writeFile(jsonPath, JSON.stringify(jsonReport, null, 2));
      
      // Generate HTML report
      await this.generateHTMLReport(results, coverage);
      
      // Generate JUnit report
      await this.generateJUnitReport(results);
      
    } catch (error) {
      logger.warn(`Failed to generate reports: ${error.message}`);
    }
  }

  /**
   * Generate HTML test report
   * @param {Object} results - Test results
   * @param {Object} coverage - Coverage data
   * @returns {Promise<void>}
   * @private
   */
  async generateHTMLReport(results, coverage) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .stat { background: #e9ecef; padding: 15px; border-radius: 5px; text-align: center; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .coverage { margin-top: 20px; }
        .coverage-bar { background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden; }
        .coverage-fill { height: 100%; background: #28a745; transition: width 0.3s; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Test Results</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="summary">
        <div class="stat">
            <h3 class="passed">${results.passed}</h3>
            <p>Passed</p>
        </div>
        <div class="stat">
            <h3 class="failed">${results.failed}</h3>
            <p>Failed</p>
        </div>
        <div class="stat">
            <h3 class="skipped">${results.skipped}</h3>
            <p>Skipped</p>
        </div>
        <div class="stat">
            <h3>${results.total}</h3>
            <p>Total</p>
        </div>
    </div>
    
    ${coverage ? `
    <div class="coverage">
        <h2>Code Coverage</h2>
        <div class="coverage-bar">
            <div class="coverage-fill" style="width: ${coverage.total?.lines?.pct || 0}%"></div>
        </div>
        <p>Lines: ${coverage.total?.lines?.pct || 0}%</p>
    </div>
    ` : ''}
</body>
</html>`;

    const htmlPath = path.join(this.coverageDir, 'test-report.html');
    await fileManager.writeFile(htmlPath, html);
  }

  /**
   * Generate JUnit XML report
   * @param {Object} results - Test results
   * @returns {Promise<void>}
   * @private
   */
  async generateJUnitReport(results) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="eleven-cursor-tests" tests="${results.total}" failures="${results.failed}" skipped="${results.skipped}" time="${results.duration / 1000}">
    <properties>
        <property name="node.version" value="${process.version}"/>
        <property name="platform" value="${process.platform}"/>
    </properties>
    <testcase name="test-suite" time="${results.duration / 1000}">
        ${results.failed > 0 ? '<failure message="Some tests failed"/>' : ''}
    </testcase>
</testsuite>`;

    const xmlPath = path.join(this.coverageDir, 'junit.xml');
    await fileManager.writeFile(xmlPath, xml);
  }

  /**
   * Chunk array into smaller arrays
   * @param {Array} array - Array to chunk
   * @param {number} size - Chunk size
   * @returns {Array} Chunked arrays
   * @private
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Watch for file changes and re-run tests
   * @returns {Promise<void>}
   */
  async watchTests() {
    const chokidar = require('chokidar');
    
    const watcher = chokidar.watch([
      'src/**/*.js',
      'tests/**/*.js',
      'bin/**/*.js'
    ], {
      ignored: /node_modules/,
      persistent: true
    });
    
    watcher.on('change', async (filePath) => {
      logger.info(`File changed: ${filePath}`);
      await this.runTests({ watch: true });
    });
    
    logger.info('Watching for file changes...');
  }

  /**
   * Get test statistics
   * @returns {Object} Test statistics
   */
  getStats() {
    return {
      ...this.results,
      successRate: this.results.total > 0 ? 
        (this.results.passed / this.results.total * 100).toFixed(2) : 0,
      averageDuration: this.results.total > 0 ? 
        (this.results.duration / this.results.total).toFixed(2) : 0
    };
  }

  /**
   * Clean up test artifacts
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      await fs.remove(this.coverageDir);
      logger.debug('Test artifacts cleaned up');
    } catch (error) {
      logger.warn(`Failed to cleanup test artifacts: ${error.message}`);
    }
  }

  /**
   * Destroy test runner
   * @returns {Promise<void>}
   */
  async destroy() {
    try {
      this.removeAllListeners();
      logger.debug('Test runner destroyed');
    } catch (error) {
      logger.error(`Test runner destroy error: ${error.message}`);
    }
  }
}

module.exports = TestRunner;