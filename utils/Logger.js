// utils/Logger.js
/**
 * Logging utility for ClampingPlateManager
 * Provides structured logging with rotation and levels
 */

const fs = require('fs').promises;
const path = require('path');
const config = require('../config');

class Logger {
  constructor() {
    this.logLevel = config.app.logLevel || 'info';
    this.enableDetailedLogging = config.app.enableDetailedLogging || false;
    this.logLevels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
  }

  /**
   * Get current log file path
   */
  getLogFilePath() {
    const today = new Date().toISOString().split('T')[0];
    return path.join(__dirname, '..', 'logs', `clamping-plate-manager_${today}.log`);
  }

  /**
   * Check if level should be logged
   */
  shouldLog(level) {
    return this.logLevels[level] >= this.logLevels[this.logLevel];
  }

  /**
   * Write log entry
   */
  async writeLog(level, message, context = {}) {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(this.enableDetailedLogging && Object.keys(context).length > 0 ? { context } : {})
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    try {
      // Ensure logs directory exists
      const logDir = path.dirname(this.getLogFilePath());
      await fs.mkdir(logDir, { recursive: true });

      // Write to file
      await fs.appendFile(this.getLogFilePath(), logLine);

      // Also log to console in development
      if (config.app.testMode) {
        const consoleMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        console.log(consoleMessage);
        if (Object.keys(context).length > 0) {
          console.log('Context:', context);
        }
      }

    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  /**
   * Log debug message
   */
  async debug(message, context = {}) {
    await this.writeLog('debug', message, context);
  }

  /**
   * Log info message
   */
  async info(message, context = {}) {
    await this.writeLog('info', message, context);
  }

  /**
   * Log warning message
   */
  async warn(message, context = {}) {
    await this.writeLog('warn', message, context);
  }

  /**
   * Log error message
   */
  async error(message, context = {}) {
    await this.writeLog('error', message, context);
  }

  /**
   * Get recent log entries
   */
  async getRecentLogs(lines = 100) {
    try {
      const logFile = this.getLogFilePath();
      const data = await fs.readFile(logFile, 'utf8');
      const logLines = data.trim().split('\n');
      
      return logLines
        .slice(-lines)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return { message: line, level: 'UNKNOWN' };
          }
        });

    } catch (error) {
      return [];
    }
  }

  /**
   * Clear old log files
   */
  async clearOldLogs(daysToKeep = 7) {
    try {
      const logDir = path.dirname(this.getLogFilePath());
      const files = await fs.readdir(logDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = path.join(logDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
            console.log(`Deleted old log file: ${file}`);
          }
        }
      }

    } catch (error) {
      console.error('Failed to clear old logs:', error);
    }
  }
}

// Create singleton instance
const logger = new Logger();

// Export convenience functions
module.exports = {
  logDebug: (message, context) => logger.debug(message, context),
  logInfo: (message, context) => logger.info(message, context),
  logWarn: (message, context) => logger.warn(message, context),
  logError: (message, context) => logger.error(message, context),
  getRecentLogs: (lines) => logger.getRecentLogs(lines),
  clearOldLogs: (days) => logger.clearOldLogs(days),
  Logger
};