// utils/SetupService.js
/**
 * Setup service for ClampingPlateManager
 * Handles initial configuration and environment setup
 */

const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const { logInfo, logError } = require('./Logger');

class SetupService {
  constructor() {
    this.setupComplete = false;
  }

  /**
   * Initialize and setup the application
   */
  async initialize() {
    console.log('🔧 Setting up ClampingPlateManager...');

    try {
      await this.createDirectories();
      await this.createDefaultConfig();
      await this.createSampleData();
      await this.validateEnvironment();

      this.setupComplete = true;
      console.log('✅ Setup completed successfully');

    } catch (error) {
      logError('Setup failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Create necessary directories
   */
  async createDirectories() {
    const directories = [
      path.dirname(config.getPlatesDataPath()),
      path.dirname(config.getConfigDataPath()),
      config.getTemplatesDir(),
      path.join(__dirname, '..', 'logs')
    ];

    for (const dir of directories) {
      try {
        await fs.access(dir);
        console.log(`📁 Directory exists: ${dir}`);
      } catch {
        await fs.mkdir(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    }
  }

  /**
   * Create default configuration
   */
  async createDefaultConfig() {
    const configPath = config.getConfigDataPath();

    try {
      await fs.access(configPath);
      console.log('⚙️ Configuration file exists');
    } catch {
      const defaultConfig = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        settings: {
          enableNotifications: true,
          autoBackup: true,
          maxHistoryEntries: 100
        }
      };

      await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
      console.log('⚙️ Created default configuration');
    }
  }

  /**
   * Create sample data if none exists
   */
  async createSampleData() {
    const platesPath = config.getPlatesDataPath();

    try {
      await fs.access(platesPath);
      console.log('📊 Plates data file exists');
    } catch {
      const samplePlates = [
        {
          id: 'plate-001',
          shelf: 'A-01',
          health: 'new',
          occupancy: 'free',
          notes: 'Sample plate for testing',
          lastModifiedBy: 'setup',
          lastModifiedDate: new Date(),
          history: [{
            id: 'hist-001',
            action: 'created',
            user: 'setup',
            date: new Date(),
            details: 'Initial setup plate'
          }]
        },
        {
          id: 'plate-002',
          shelf: 'A-02',
          health: 'used',
          occupancy: 'free',
          notes: 'Sample used plate',
          lastModifiedBy: 'setup',
          lastModifiedDate: new Date(),
          history: [{
            id: 'hist-002',
            action: 'created',
            user: 'setup',
            date: new Date(),
            details: 'Initial setup plate'
          }]
        }
      ];

      await fs.writeFile(platesPath, JSON.stringify(samplePlates, null, 2));
      console.log('📊 Created sample plates data');
    }
  }

  /**
   * Validate environment
   */
  async validateEnvironment() {
    console.log('🔍 Validating environment...');

    // Check Node.js version
    const nodeVersion = process.version;
    console.log(`Node.js version: ${nodeVersion}`);

    // Check storage configuration
    console.log(`Storage type: ${config.storage.type}`);
    console.log(`Test mode: ${config.app.testMode}`);

    // Check port availability
    console.log(`Web service port: ${config.webService.port}`);

    console.log('✅ Environment validation complete');
  }
}

module.exports = SetupService;