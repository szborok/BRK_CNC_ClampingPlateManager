#!/usr/bin/env node

/**
 * ClampingPlateManager - CNC Plate Management Backend Service
 *
 * Production-ready backend service for managing CNC clamping plates with inventory tracking,
 * work order management, and comprehensive audit trails.
 *
 * Usage:
 *   node main.js --init-excel <excel_path> --models <models_path>  # Initialize from Excel + models
 *   node main.js --init-test                                       # Test initialization
 *   node main.js --serve                                           # Start web service
 */

const path = require("path");
const config = require("./config");
const { logInfo, logError } = require("./utils/Logger");

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
    console.log(`Mode: ${config.app.testMode ? "Test" : "Production"}`);
    console.log(`Port: ${config.webService.port}`);
    console.log("");

    // Handle different command modes
    if (hasFlag("--init-excel")) {
      await runExcelInitialization();
    } else if (hasFlag("--init-test")) {
      await runTestInitialization();
    } else if (hasFlag("--serve")) {
      await runWebService();
    } else {
      // Default: show usage and exit
      showUsage();
    }
  } catch (error) {
    logError("Application failed", { error: error.message });
    console.error("❌ Application failed:", error.message);
    process.exit(1);
  }
}

function showUsage() {
  console.log("📖 ClampingPlateManager Usage");
  console.log("=============================\n");

  console.log("Production Commands:");
  console.log(
    "  node main.js --init-excel <excel_path> --models <models_path>"
  );
  console.log("    Initialize from Excel file and model folders\n");

  console.log("  node main.js --serve");
  console.log("    Start web service\n");

  console.log("Development Commands:");
  console.log("  node main.js --init-test");
  console.log("    Test initialization using test_source_data folders\n");

  console.log("Examples:");
  console.log(
    "  node main.js --init-excel './inventory.xlsx' --models './models'"
  );
  console.log("  node main.js --serve");

  process.exit(0);
}

async function runExcelInitialization() {
  const excelPath = getFlagValue("--init-excel");
  const modelsPath = getFlagValue("--models");

  if (!excelPath) {
    console.error("❌ Error: --init-excel requires an Excel file path");
    console.log(
      "Usage: node main.js --init-excel <excel_path> --models <models_path>"
    );
    process.exit(1);
  }

  if (!modelsPath) {
    console.error("❌ Error: --models requires a models folder path");
    console.log(
      "Usage: node main.js --init-excel <excel_path> --models <models_path>"
    );
    process.exit(1);
  }

  console.log("🔧 Production Initialization - Processing Excel and Models...");
  console.log(`📊 Excel file: ${excelPath}`);
  console.log(`📂 Models folder: ${modelsPath}`);

  // Use our proven convert_excel_to_json logic
  const convertExcelToJson = require("./src/convert_excel_to_json");
  const result = await convertExcelToJson(excelPath, modelsPath);

  console.log("\n✅ Production initialization completed!");
  console.log(`📦 Plates processed: ${result.platesProcessed}`);
  console.log(`🔗 Models linked: ${result.modelsLinked}`);
  console.log(`💾 Output file: ${result.outputPath}`);
  console.log("\nNext steps:");
  console.log("- Run 'node main.js --serve' to start the web service");
  console.log(`- Visit http://localhost:${config.webService.port}/api/plates`);
}

async function runTestInitialization() {
  const fs = require("fs");
  const fsp = require("fs").promises;

  console.log(
    "🔧 Test Initialization - Setting up test_processed_data workspace..."
  );

  // Define source paths
  const sourceExcelPath = path.join(
    __dirname,
    "data",
    "test_source_data",
    "info",
    "Készülékek.xlsx"
  );
  const sourceModelsPath = path.join(
    __dirname,
    "data",
    "test_source_data",
    "models"
  );

  // Define test_processed_data paths
  const testProcessedDataBase = path.join(
    __dirname,
    "data",
    "test_processed_data"
  );
  const testProcessedDataInfo = path.join(testProcessedDataBase, "info");
  const testProcessedDataModels = path.join(testProcessedDataBase, "models");
  const testExcelPath = path.join(testProcessedDataInfo, "Készülékek.xlsx");

  try {
    // Clean test_processed_data workspace first
    console.log("🧹 Cleaning test_processed_data workspace...");
    if (fs.existsSync(testProcessedDataBase)) {
      await fsp.rm(testProcessedDataBase, { recursive: true, force: true });
      console.log("✅ Cleaned existing test_processed_data folder");
    }

    // Create fresh test_processed_data directory structure
    await fsp.mkdir(testProcessedDataInfo, { recursive: true });
    await fsp.mkdir(testProcessedDataModels, { recursive: true });

    // Copy Excel file to test_processed_data/info
    console.log("📋 Copying Excel file to test_processed_data workspace...");
    await fsp.copyFile(sourceExcelPath, testExcelPath);

    // Copy model folders to test_processed_data/models
    console.log("📁 Copying model folders to test_processed_data workspace...");
    if (fs.existsSync(sourceModelsPath)) {
      const modelFolders = await fsp.readdir(sourceModelsPath);
      for (const folder of modelFolders) {
        const sourceFolderPath = path.join(sourceModelsPath, folder);
        const destFolderPath = path.join(testProcessedDataModels, folder);

        try {
          const stat = await fsp.stat(sourceFolderPath);
          if (stat.isDirectory()) {
            await fsp.mkdir(destFolderPath, { recursive: true });
            const files = await fsp.readdir(sourceFolderPath);
            for (const file of files) {
              const sourceFile = path.join(sourceFolderPath, file);
              const destFile = path.join(destFolderPath, file);

              try {
                const fileStat = await fsp.stat(sourceFile);
                if (fileStat.isFile()) {
                  await fsp.copyFile(sourceFile, destFile);
                }
              } catch (fileError) {
                console.log(`⚠️  Skipped ${file} (not a regular file)`);
              }
            }
          }
        } catch (folderError) {
          console.log(`⚠️  Skipped folder ${folder} (${folderError.message})`);
        }
      }
    }

    console.log("📊 Test Excel: " + testExcelPath);
    console.log("📂 Test Models: " + testProcessedDataModels);

    // Use our proven convert_excel_to_json logic with test_processed_data paths
    const convertExcelToJson = require("./src/convert_excel_to_json");
    const result = await convertExcelToJson(
      testExcelPath,
      testProcessedDataModels
    );

    console.log("\n✅ Test initialization completed!");
    console.log(`📦 Plates processed: ${result.platesProcessed}`);
    console.log(`🔗 Models linked: ${result.modelsLinked}`);
    console.log(`💾 Output file: ${result.outputPath}`);
  } catch (error) {
    logError("Test initialization failed", { error: error.message });
    throw error;
  }
}

async function runWebService() {
  console.log("🌐 Starting web service...");

  const WebService = require("./src/WebService");
  const service = new WebService();

  await service.start();
}

// Start the application
if (require.main === module) {
  main();
}

module.exports = {
  main,
  runExcelInitialization,
  runTestInitialization,
  runWebService,
};
