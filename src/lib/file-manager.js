const fs = require('fs-extra');
const path = require('path');
const { promisify } = require('util');
const Logger = require('./logger');

const logger = new Logger();

/**
 * Enhanced FileManager class with comprehensive file operations
 * Provides safe, atomic file operations with proper error handling
 */
class FileManager {
  constructor() {
    this.tempDir = path.join(process.cwd(), '.temp');
    this.outputDir = path.join(process.cwd(), 'output');
  }

  /**
   * Ensure directory exists, create if it doesn't
   * @param {string} dirPath - Directory path
   * @returns {Promise<void>}
   */
  async ensureDir(dirPath) {
    try {
      await fs.ensureDir(dirPath);
      logger.fileOperation('ensureDir', dirPath, true);
    } catch (error) {
      logger.fileOperation('ensureDir', dirPath, false);
      throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Write file with atomic operation
   * @param {string} filePath - File path
   * @param {string|Buffer} content - File content
   * @param {Object} options - Write options
   * @returns {Promise<void>}
   */
  async writeFile(filePath, content, options = {}) {
    try {
      const dir = path.dirname(filePath);
      await this.ensureDir(dir);

      // Write to temporary file first, then rename (atomic operation)
      const tempFile = `${filePath}.tmp.${Date.now()}`;
      await fs.writeFile(tempFile, content, options);
      await fs.move(tempFile, filePath, { overwrite: true });
      
      logger.fileOperation('writeFile', filePath, true);
    } catch (error) {
      logger.fileOperation('writeFile', filePath, false);
      throw new Error(`Failed to write file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Read file content
   * @param {string} filePath - File path
   * @param {Object} options - Read options
   * @returns {Promise<string|Buffer>}
   */
  async readFile(filePath, options = {}) {
    try {
      const content = await fs.readFile(filePath, options);
      logger.fileOperation('readFile', filePath, true);
      return content;
    } catch (error) {
      logger.fileOperation('readFile', filePath, false);
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Check if file or directory exists
   * @param {string} filePath - File path
   * @returns {Promise<boolean>}
   */
  async exists(filePath) {
    try {
      const exists = await fs.pathExists(filePath);
      if (logger.debug) if (logger.debug) logger.debug(`File exists check: ${filePath} -> ${exists}`);
      return exists;
    } catch (error) {
      if (logger.debug) logger.debug(`File exists check failed: ${filePath} -> false`);
      return false;
    }
  }

  /**
   * Copy file or directory
   * @param {string} src - Source path
   * @param {string} dest - Destination path
   * @param {Object} options - Copy options
   * @returns {Promise<void>}
   */
  async copy(src, dest, options = {}) {
    try {
      await fs.copy(src, dest, options);
      logger.fileOperation('copy', `${src} -> ${dest}`, true);
    } catch (error) {
      logger.fileOperation('copy', `${src} -> ${dest}`, false);
      throw new Error(`Failed to copy ${src} to ${dest}: ${error.message}`);
    }
  }

  /**
   * Move file or directory
   * @param {string} src - Source path
   * @param {string} dest - Destination path
   * @param {Object} options - Move options
   * @returns {Promise<void>}
   */
  async move(src, dest, options = {}) {
    try {
      await fs.move(src, dest, options);
      logger.fileOperation('move', `${src} -> ${dest}`, true);
    } catch (error) {
      logger.fileOperation('move', `${src} -> ${dest}`, false);
      throw new Error(`Failed to move ${src} to ${dest}: ${error.message}`);
    }
  }

  /**
   * Remove file or directory
   * @param {string} filePath - File path
   * @param {Object} options - Remove options
   * @returns {Promise<void>}
   */
  async remove(filePath, options = {}) {
    try {
      await fs.remove(filePath, options);
      logger.fileOperation('remove', filePath, true);
    } catch (error) {
      logger.fileOperation('remove', filePath, false);
      throw new Error(`Failed to remove ${filePath}: ${error.message}`);
    }
  }

  /**
   * Get file stats
   * @param {string} filePath - File path
   * @returns {Promise<Object>}
   */
  async stat(filePath) {
    try {
      const stats = await fs.stat(filePath);
      if (logger.debug) logger.debug(`File stats: ${filePath} -> ${stats.size} bytes`);
      return stats;
    } catch (error) {
      if (logger.debug) logger.debug(`File stats failed: ${filePath}`);
      throw new Error(`Failed to get stats for ${filePath}: ${error.message}`);
    }
  }

  /**
   * Copy template with variable substitution
   * @param {string} templatePath - Template file path
   * @param {string} destPath - Destination file path
   * @param {Object} variables - Template variables
   * @returns {Promise<void>}
   */
  async copyTemplate(templatePath, destPath, variables = {}) {
    try {
      let content = await this.readFile(templatePath, 'utf8');
      
      // Replace template variables {{variableName}}
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, variables[key]);
      });

      await this.writeFile(destPath, content);
      logger.fileOperation('copyTemplate', `${templatePath} -> ${destPath}`, true);
    } catch (error) {
      logger.fileOperation('copyTemplate', `${templatePath} -> ${destPath}`, false);
      throw new Error(`Failed to copy template ${templatePath} to ${destPath}: ${error.message}`);
    }
  }

  /**
   * Create temporary file
   * @param {string} prefix - File prefix
   * @param {string} suffix - File suffix
   * @returns {Promise<string>} - Temporary file path
   */
  async createTempFile(prefix = 'temp', suffix = '.tmp') {
    try {
      await this.ensureDir(this.tempDir);
      const tempFile = path.join(this.tempDir, `${prefix}-${Date.now()}${suffix}`);
      await this.writeFile(tempFile, '');
      if (logger.debug) logger.debug(`Created temp file: ${tempFile}`);
      return tempFile;
    } catch (error) {
      throw new Error(`Failed to create temporary file: ${error.message}`);
    }
  }

  /**
   * Clean up temporary files
   * @returns {Promise<void>}
   */
  async cleanupTemp() {
    try {
      if (await this.exists(this.tempDir)) {
        await this.remove(this.tempDir);
        if (logger.debug) logger.debug('Cleaned up temporary files');
      }
    } catch (error) {
      logger.warn(`Failed to cleanup temporary files: ${error.message}`);
    }
  }

  /**
   * Ensure output directory exists
   * @returns {Promise<void>}
   */
  async ensureOutputDir() {
    await this.ensureDir(this.outputDir);
  }

  /**
   * Get output directory path
   * @returns {string}
   */
  getOutputDir() {
    return this.outputDir;
  }

  /**
   * Get temporary directory path
   * @returns {string}
   */
  getTempDir() {
    return this.tempDir;
  }
}

module.exports = FileManager;