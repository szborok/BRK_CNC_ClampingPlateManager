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
    usePersistentTempFolder: true, // Use organized temp structure for processing
    tempBaseName: "BRK CNC Management Dashboard", // Organized temp folder name
    userDefinedWorkingFolder: null, // User can override temp location

    // Permanent storage settings - USER MUST SPECIFY
    permanentStoragePath: null, // User-specified permanent storage location
    requirePermanentPath: true, // Require user to specify permanent storage
  },

  // Web service settings
  webService: {
    port: 3002, // Different port from other services
    enableAuth: false, // Disable auth for backend service
    enableCors: true,
    allowedOrigins: ["http://localhost:3000", "http://localhost:5173"], // CNCManagementDashboard
  },

  storage: {
    type: "local", // Force local storage only - no MongoDB
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
      // Test/demo mode - use app folder for convenience
      permanentDataDir: path.join(__dirname, "data", "test_processed_data"),
      platesData: path.join(
        __dirname,
        "data",
        "test_processed_data",
        "plates.json"
      ),
      configData: path.join(
        __dirname,
        "data",
        "test_processed_data",
        "config.json"
      ),
      modelsDir: path.join(__dirname, "data", "test_processed_data", "models"),
      previewsDir: path.join(
        __dirname,
        "data",
        "test_processed_data",
        "previews"
      ),
      templatesDir: path.join(__dirname, "data", "templates"),
      testSourceDataDir: path.join(__dirname, "data", "test_source_data"),
      backupDir: path.join(__dirname, "data", "test_processed_data", "backups"),
    },
    production: {
      // Production mode - USER MUST SPECIFY permanent location
      // These will be dynamically set based on user's permanentStoragePath
      permanentDataDir: null, // Will be set to user's chosen path
      platesData: null, // Will be: {userPath}/plates.json
      configData: null, // Will be: {userPath}/config.json
      modelsDir: null, // Will be: {userPath}/models
      previewsDir: null, // Will be: {userPath}/previews
      backupDir: null, // Will be: {userPath}/backups
      templatesDir: null, // Will be: {userPath}/templates
    },
  },

  // Plate management settings
  plates: {
    healthStates: ["new", "used", "locked"],
    occupancyStates: ["free", "in-use"],
    workOrderPattern: /^W\d{4}[A-Z]{2}\d{2}\d{3}[A-Z]?$/, // W5270NS01001A format
    maxHistoryEntries: 100, // Limit history per plate
  },

  // Initialization settings
  initialization: {
    supportedModelFormats: [".x_t", ".step", ".stp", ".iges", ".igs", ".dwg"],
    supportedImageFormats: [".jpg", ".jpeg", ".png", ".bmp", ".tiff"],
    infoFileName: "Készülékek.xlsx", // Expected info file name
    autoGenerateIds: true,
    idPrefix: "PL-",
    organizeFoldersByShelf: true, // Organize model files by shelf location
    createPreviewImages: false, // Future feature for image generation
  },
};

// Helper functions
config.setPermanentStoragePath = function (userPath) {
  if (!userPath) {
    throw new Error("Permanent storage path is required");
  }

  this.app.permanentStoragePath = userPath;

  // Update production paths if not in test mode
  if (!this.app.testMode) {
    this.paths.production.permanentDataDir = userPath;
    this.paths.production.platesData = path.join(userPath, "plates.json");
    this.paths.production.configData = path.join(userPath, "config.json");
    this.paths.production.modelsDir = path.join(userPath, "models");
    this.paths.production.previewsDir = path.join(userPath, "previews");
    this.paths.production.backupDir = path.join(userPath, "backups");
    this.paths.production.templatesDir = path.join(userPath, "templates");
  }
};

config.getPermanentDataDir = function () {
  if (this.app.testMode) {
    return this.paths.test.permanentDataDir;
  }

  if (!this.app.permanentStoragePath) {
    throw new Error(
      "Permanent storage path not set. Use setPermanentStoragePath() first."
    );
  }

  return this.paths.production.permanentDataDir;
};

config.getPlatesDataPath = function () {
  if (this.app.testMode) {
    return this.paths.test.platesData;
  }

  if (!this.app.permanentStoragePath) {
    throw new Error(
      "Permanent storage path not set. Use setPermanentStoragePath() first."
    );
  }

  return this.paths.production.platesData;
};

config.getConfigDataPath = function () {
  if (this.app.testMode) {
    return this.paths.test.configData;
  }

  if (!this.app.permanentStoragePath) {
    throw new Error(
      "Permanent storage path not set. Use setPermanentStoragePath() first."
    );
  }

  return this.paths.production.configData;
};

config.getModelsDir = function () {
  if (this.app.testMode) {
    return this.paths.test.modelsDir;
  }

  if (!this.app.permanentStoragePath) {
    throw new Error(
      "Permanent storage path not set. Use setPermanentStoragePath() first."
    );
  }

  return this.paths.production.modelsDir;
};

config.getPreviewsDir = function () {
  if (this.app.testMode) {
    return this.paths.test.previewsDir;
  }

  if (!this.app.permanentStoragePath) {
    throw new Error(
      "Permanent storage path not set. Use setPermanentStoragePath() first."
    );
  }

  return this.paths.production.previewsDir;
};

config.getTemplatesDir = function () {
  if (this.app.testMode) {
    return this.paths.test.templatesDir;
  }

  if (!this.app.permanentStoragePath) {
    throw new Error(
      "Permanent storage path not set. Use setPermanentStoragePath() first."
    );
  }

  return this.paths.production.templatesDir;
};

config.getBackupDir = function () {
  if (this.app.testMode) {
    return this.paths.test.backupDir;
  }

  if (!this.app.permanentStoragePath) {
    throw new Error(
      "Permanent storage path not set. Use setPermanentStoragePath() first."
    );
  }

  return this.paths.production.backupDir;
};

module.exports = config;
