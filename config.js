// config.js
const path = require("path");

const config = {
  app: {
    testMode: true, // true = use test data paths, false = use production paths
    autoMode: true, // Same as JSONScanner's autorun
    scanIntervalMs: 60000, // 60 seconds
    logLevel: "info",
    enableDetailedLogging: true,
    
    // Read-only processing settings (like JSONScanner/ToolManager)
    usePersistentTempFolder: true, // Use organized temp structure
    tempBaseName: "BRK CNC Management Dashboard", // Organized temp folder name
    userDefinedWorkingFolder: null, // User can override temp location
  },
  
  // Web service settings
  webService: {
    port: 3002, // Different port from other services
    enableAuth: false, // Disable auth for backend service
    enableCors: true,
    allowedOrigins: ["http://localhost:3000", "http://localhost:5173"], // CNCManagementDashboard
  },
  
  storage: {
    type: process.env.STORAGE_TYPE || "auto", // 'auto', 'local', 'mongodb'
    local: {
      dataDirectory: path.join(__dirname, "data"),
      backupDirectory: path.join(__dirname, "data", "backups"),
      maxBackups: 10,
    },
    retentionPolicy: {
      backupDays: null, // No auto cleanup for plate data
      cleanupOldData: false, // Don't auto-delete plate history
    },
  },
  
  mongodb: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017",
    database: process.env.MONGODB_DATABASE || "cnc_plates", // ClampingPlateManager database
    options: {
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    },
  },
  
  processing: {
    preventReprocessing: true,
    generateReports: true,
    trackHistory: true, // Enable comprehensive history tracking
  },
  
  files: {
    jsonExtension: ".json",
    fixedSuffix: "BRK_fixed",
    resultSuffix: "BRK_result",
  },
  
  paths: {
    test: {
      // Test data directories
      platesData: path.join(__dirname, "data", "plates.json"),
      configData: path.join(__dirname, "data", "config.json"),
      templatesDir: path.join(__dirname, "data", "templates"),
      testDataDir: path.join(__dirname, "data", "test_data"),
    },
    production: {
      // Production data directories
      platesData: "C:\\Production\\PlateData\\plates.json",
      configData: "C:\\Production\\PlateData\\config.json",
      templatesDir: "C:\\Production\\PlateData\\templates",
      backupDir: "C:\\Production\\PlateData\\backups",
    },
  },
  
  // Plate management settings
  plates: {
    healthStates: ['new', 'used', 'locked'],
    occupancyStates: ['free', 'in-use'],
    workOrderPattern: /^W\d{4}[A-Z]{2}\d{2}\d{3}[A-Z]?$/, // W5270NS01001A format
    maxHistoryEntries: 100, // Limit history per plate
  },
};

// Helper functions
config.getPlatesDataPath = function() {
  return this.app.testMode 
    ? this.paths.test.platesData 
    : this.paths.production.platesData;
};

config.getConfigDataPath = function() {
  return this.app.testMode 
    ? this.paths.test.configData 
    : this.paths.production.configData;
};

config.getTemplatesDir = function() {
  return this.app.testMode 
    ? this.paths.test.templatesDir 
    : this.paths.production.templatesDir;
};

module.exports = config;