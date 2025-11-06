#!/usr/bin/env node

/**
 * ClampingPlateManager - CNC Plate Management Backend Service
 * 
 * Backend service for managing CNC clamping plates with inventory tracking,
 * work order management, and comprehensive audit trails.
 * 
 * Usage:
 *   node main.js --auto          # Auto mode (continuous service)
 *   node main.js --manual        # Manual mode (one-time operations)
 *   node main.js --setup         # Setup and configuration
 *   node main.js --cleanup       # Cleanup operations
 *   node main.js --serve         # Start web service only
 *   node main.js --working-folder <path>  # Use custom working folder
 */

const path = require("path");
const config = require("./config");
const { logInfo, logError, logWarn } = require("./utils/Logger");

// Parse command line arguments
const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const getFlagValue = (flag) => {
  const index = args.indexOf(flag);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : null;
};

async function main() {
  try {
    // Handle user-defined working folder
    if (hasFlag("--working-folder")) {
      const customFolder = getFlagValue("--working-folder");
      if (customFolder) {
        config.app.userDefinedWorkingFolder = customFolder;
        logInfo("Using custom working folder", { folder: customFolder });
      }
    }

    // Display banner
    console.log("🔧 ClampingPlateManager - Backend Service");
    console.log("========================================");
    console.log(`Mode: ${config.app.testMode ? 'Test' : 'Production'}`);
    console.log(`Port: ${config.webService.port}`);
    console.log("");

    // Handle different command modes
    if (hasFlag("--setup")) {
      await runSetup();
    } else if (hasFlag("--cleanup")) {
      await runCleanup();
    } else if (hasFlag("--auto")) {
      await runAutoMode();
    } else if (hasFlag("--manual")) {
      await runManualMode();
    } else if (hasFlag("--serve")) {
      await runWebService();
    } else if (hasFlag("--test-readonly")) {
      await runTestReadOnly();
    } else {
      // Default to web service mode
      await runWebService();
    }

  } catch (error) {
    logError("Application failed", { error: error.message });
    console.error("❌ Application failed:", error.message);
    process.exit(1);
  }
}

async function runSetup() {
  console.log("🔧 Setting up ClampingPlateManager...");
  
  const SetupService = require("./utils/SetupService");
  const setup = new SetupService();
  
  await setup.initialize();
  console.log("✅ Setup completed successfully");
  process.exit(0);
}

async function runCleanup() {
  console.log("🧹 Running cleanup operations...");
  
  const CleanupService = require("./utils/CleanupService");
  const cleanup = new CleanupService();
  
  await cleanup.cleanupTempFiles();
  await cleanup.cleanupOldBackups();
  
  console.log("✅ Cleanup completed successfully");
  process.exit(0);
}

async function runAutoMode() {
  console.log("🔄 Starting auto mode (continuous service)...");
  
  const Executor = require("./src/Executor");
  const executor = new Executor();
  
  await executor.runAutoMode();
}

async function runManualMode() {
  console.log("🖱️ Running in manual mode...");
  
  const Executor = require("./src/Executor");
  const executor = new Executor();
  
  await executor.runManualMode();
  process.exit(0);
}

async function runWebService() {
  console.log("🌐 Starting web service...");
  
  const WebService = require("./src/WebService");
  const service = new WebService();
  
  await service.start();
}

async function runTestReadOnly() {
  console.log("🧪 Running read-only test...");
  
  const TestRunner = require("./utils/TestRunner");
  const test = new TestRunner();
  
  await test.runReadOnlyTest();
  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the application
if (require.main === module) {
  main().catch(error => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
}

module.exports = { main };