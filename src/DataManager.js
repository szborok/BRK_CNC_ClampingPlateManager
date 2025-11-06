// src/DataManager.js
/**
 * Data management service for ClampingPlateManager
 * Handles data persistence, backup, and storage operations
 */

const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const { logInfo, logError, logWarn } = require('../utils/Logger');
const StorageAdapter = require('../utils/StorageAdapter');

class DataManager {
  constructor() {
    this.storageAdapter = new StorageAdapter();
    this.initialized = false;
  }

  /**
   * Initialize data manager
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    logInfo('Initializing DataManager');

    try {
      // Initialize storage adapter
      await this.storageAdapter.initialize();

      // Ensure data directories exist
      await this.ensureDataDirectories();

      this.initialized = true;
      logInfo('DataManager initialized successfully');

    } catch (error) {
      logError('Failed to initialize DataManager', { error: error.message });
      throw error;
    }
  }

  /**
   * Load plates data
   */
  async loadPlates() {
    try {
      const filePath = config.getPlatesDataPath();
      
      // Try storage adapter first
      if (this.storageAdapter.isConnected()) {
        return await this.storageAdapter.getPlates();
      }

      // Fallback to local file
      const data = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(data);
      
      return Array.isArray(parsed) ? parsed : parsed.plates || [];

    } catch (error) {
      if (error.code === 'ENOENT') {
        logInfo('No existing plates data found, starting fresh');
        return [];
      }
      throw error;
    }
  }

  /**
   * Save plates data
   */
  async savePlates(plates) {
    try {
      // Save to storage adapter
      if (this.storageAdapter.isConnected()) {
        await this.storageAdapter.savePlates(plates);
      }

      // Save to local file as backup
      const filePath = config.getPlatesDataPath();
      await fs.writeFile(filePath, JSON.stringify(plates, null, 2));

      logInfo(`Saved ${plates.length} plates to storage`);

    } catch (error) {
      logError('Failed to save plates data', { error: error.message });
      throw error;
    }
  }

  /**
   * Save operational report
   */
  async saveReport(reportType, reportData) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${reportType}_${timestamp}.json`;
      
      // Save to storage adapter
      if (this.storageAdapter.isConnected()) {
        await this.storageAdapter.saveReport(reportType, reportData);
      }

      // Save to local file
      const reportsDir = path.join(path.dirname(config.getPlatesDataPath()), 'reports');
      await this.ensureDirectory(reportsDir);
      
      const filePath = path.join(reportsDir, filename);
      await fs.writeFile(filePath, JSON.stringify(reportData, null, 2));

      logInfo('Report saved', { reportType, filename });

    } catch (error) {
      logError('Failed to save report', { error: error.message, reportType });
      throw error;
    }
  }

  /**
   * Load configuration data
   */
  async loadConfig() {
    try {
      const filePath = config.getConfigDataPath();
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);

    } catch (error) {
      if (error.code === 'ENOENT') {
        logInfo('No config data found, using defaults');
        return {};
      }
      throw error;
    }
  }

  /**
   * Save configuration data
   */
  async saveConfig(configData) {
    try {
      const filePath = config.getConfigDataPath();
      await fs.writeFile(filePath, JSON.stringify(configData, null, 2));

      logInfo('Configuration saved');

    } catch (error) {
      logError('Failed to save configuration', { error: error.message });
      throw error;
    }
  }

  /**
   * Create backup of current data
   */
  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(path.dirname(config.getPlatesDataPath()), 'backups');
      await this.ensureDirectory(backupDir);

      // Backup plates data
      const plates = await this.loadPlates();
      const backupFile = path.join(backupDir, `plates_backup_${timestamp}.json`);
      await fs.writeFile(backupFile, JSON.stringify(plates, null, 2));

      logInfo('Backup created', { backupFile });
      return backupFile;

    } catch (error) {
      logError('Failed to create backup', { error: error.message });
      throw error;
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupFile) {
    try {
      const data = await fs.readFile(backupFile, 'utf8');
      const plates = JSON.parse(data);

      await this.savePlates(plates);

      logInfo('Restored from backup', { backupFile, plateCount: plates.length });
      return plates;

    } catch (error) {
      logError('Failed to restore from backup', { error: error.message, backupFile });
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    try {
      const stats = {
        storage: {
          type: config.storage.type,
          connected: this.storageAdapter.isConnected()
        },
        local: {
          platesFile: await this.getFileStats(config.getPlatesDataPath()),
          configFile: await this.getFileStats(config.getConfigDataPath())
        }
      };

      return stats;

    } catch (error) {
      logError('Failed to get storage stats', { error: error.message });
      return null;
    }
  }

  /**
   * Ensure data directories exist
   */
  async ensureDataDirectories() {
    const platesPath = config.getPlatesDataPath();
    const configPath = config.getConfigDataPath();
    
    await this.ensureDirectory(path.dirname(platesPath));
    await this.ensureDirectory(path.dirname(configPath));

    // Ensure templates directory exists
    const templatesDir = config.getTemplatesDir();
    await this.ensureDirectory(templatesDir);
  }

  /**
   * Ensure directory exists
   */
  async ensureDirectory(dirPath) {
    try {
      await fs.access(dirPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(dirPath, { recursive: true });
        logInfo('Created directory', { dirPath });
      } else {
        throw error;
      }
    }
  }

  /**
   * Get file statistics
   */
  async getFileStats(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        exists: true,
        size: stats.size,
        modified: stats.mtime
      };
    } catch (error) {
      return {
        exists: false,
        size: 0,
        modified: null
      };
    }
  }
}

module.exports = DataManager;