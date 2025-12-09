/**
 * ClampingPlateManager Configuration
 * Loads from central BRK_CNC_CORE/config
 */

const { getServiceConfig } = require('../BRK_CNC_CORE/config');

// Load service-specific config from central system
const config = getServiceConfig('clampingPlateManager');

// Backward compatibility: ClampingPlateManager uses webService instead of webApp
config.webService = config.webApp;

// Export for backward compatibility
module.exports = config;

// Helper methods
config.getDataPath = function() {
  return this.storage.local.dataDirectory;
};

config.getWorkingPath = function() {
  return this.paths.workingData;
};

config.getPlatesDataPath = function() {
  const path = require('path');
  return path.join(this.storage.local.dataDirectory, 'plates.json');
};

config.getPermanentDataDir = function() {
  return this.storage.local.dataDirectory;
};

config.getConfigDataPath = function() {
  const path = require('path');
  return path.join(this.storage.local.dataDirectory, 'config.json');
};

config.getModelsDir = function() {
  const path = require('path');
  return path.join(this.storage.local.dataDirectory, 'models');
};

config.getPreviewsDir = function() {
  const path = require('path');
  return path.join(this.storage.local.dataDirectory, 'previews');
};

config.getTemplatesDir = function() {
  const path = require('path');
  return path.join(this.storage.local.dataDirectory, 'templates');
};

config.getBackupDir = function() {
  const path = require('path');
  return path.join(this.storage.local.dataDirectory, 'backups');
};
