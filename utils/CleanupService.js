// utils/CleanupService.js
/**
 * Cleanup service for ClampingPlateManager
 * Handles temporary file cleanup and maintenance operations
 */

const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const { logInfo, logError, logWarn } = require('./Logger');

class CleanupService {
  constructor() {
    this.tempBasePath = path.join(require('os').tmpdir(), config.app.tempBaseName || "BRK CNC Management Dashboard");
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles() {
    console.log('🧹 Cleaning up temporary files...');

    try {
      const clampingPlateTempPath = path.join(this.tempBasePath, 'ClampingPlateManager');
      
      await this.removeDirectory(clampingPlateTempPath);
      
      logInfo('Temporary files cleaned up');
      console.log('✅ Temporary files cleaned');

    } catch (error) {
      logError('Failed to cleanup temp files', { error: error.message });
      console.log('❌ Failed to cleanup temp files:', error.message);
    }
  }

  /**
   * Clean up old backup files
   */
  async cleanupOldBackups() {
    console.log('🧹 Cleaning up old backup files...');

    try {
      const backupDir = path.join(path.dirname(config.getPlatesDataPath()), 'backups');
      
      try {
        await fs.access(backupDir);
      } catch {
        console.log('📁 No backup directory found');
        return;
      }

      const files = await fs.readdir(backupDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - (config.storage.local.maxBackups || 10));

      let deletedCount = 0;
      for (const file of files) {
        if (file.endsWith('.json') && file.includes('backup')) {
          const filePath = path.join(backupDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
            deletedCount++;
          }
        }
      }

      console.log(`✅ Deleted ${deletedCount} old backup files`);
      logInfo('Old backup files cleaned up', { deletedCount });

    } catch (error) {
      logError('Failed to cleanup backup files', { error: error.message });
      console.log('❌ Failed to cleanup backup files:', error.message);
    }
  }

  /**
   * Clean up old log files
   */
  async cleanupOldLogs() {
    console.log('🧹 Cleaning up old log files...');

    try {
      const { clearOldLogs } = require('./Logger');
      await clearOldLogs(7); // Keep 7 days of logs

      console.log('✅ Old log files cleaned');

    } catch (error) {
      logError('Failed to cleanup log files', { error: error.message });
      console.log('❌ Failed to cleanup log files:', error.message);
    }
  }

  /**
   * Remove directory recursively
   */
  async removeDirectory(dirPath) {
    try {
      await fs.access(dirPath);
      
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
          await this.removeDirectory(fullPath);
        } else {
          await fs.unlink(fullPath);
        }
      }
      
      await fs.rmdir(dirPath);
      logInfo('Removed directory', { dirPath });
      
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats() {
    const stats = {
      tempFiles: 0,
      backupFiles: 0,
      logFiles: 0,
      totalSize: 0
    };

    try {
      // Check temp files
      const tempPath = path.join(this.tempBasePath, 'ClampingPlateManager');
      try {
        const tempStats = await this.getDirectoryStats(tempPath);
        stats.tempFiles = tempStats.fileCount;
        stats.totalSize += tempStats.totalSize;
      } catch (error) {
        // Directory doesn't exist, which is fine
      }

      // Check backup files
      const backupDir = path.join(path.dirname(config.getPlatesDataPath()), 'backups');
      try {
        const backupStats = await this.getDirectoryStats(backupDir);
        stats.backupFiles = backupStats.fileCount;
        stats.totalSize += backupStats.totalSize;
      } catch (error) {
        // Directory doesn't exist, which is fine
      }

      // Check log files
      const logDir = path.join(__dirname, '..', 'logs');
      try {
        const logStats = await this.getDirectoryStats(logDir);
        stats.logFiles = logStats.fileCount;
        stats.totalSize += logStats.totalSize;
      } catch (error) {
        // Directory doesn't exist, which is fine
      }

    } catch (error) {
      logError('Failed to get cleanup stats', { error: error.message });
    }

    return stats;
  }

  /**
   * Get directory statistics
   */
  async getDirectoryStats(dirPath) {
    let fileCount = 0;
    let totalSize = 0;

    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stats = await fs.stat(fullPath);
        
        if (stats.isFile()) {
          fileCount++;
          totalSize += stats.size;
        } else if (stats.isDirectory()) {
          const subStats = await this.getDirectoryStats(fullPath);
          fileCount += subStats.fileCount;
          totalSize += subStats.totalSize;
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return { fileCount, totalSize };
  }
}

module.exports = CleanupService;