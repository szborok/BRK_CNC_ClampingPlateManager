// convert_excel_to_json.js
/**
 * Convert Excel file to JSON configuration
 * Works in temp, outputs to permanent storage with descriptive filename
 *
 * Usage:
 *   node convert_excel_to_json.js                    # Use default test Excel file
 *   node convert_excel_to_json.js /path/to/file.xlsx # Use specific Excel file
 */

const fs = require("fs").promises;
const path = require("path");
const config = require("../config");
const ExcelProcessor = require("../utils/ExcelProcessor");
const ImageExtractor = require("../utils/ImageExtractor");
const ModelFolderValidator = require("../utils/ModelFolderValidator");
const { logInfo, logError, logWarn } = require("../utils/Logger");

async function convertExcelToJson(inputExcelPath = null, modelsPath = null) {
  const testSourceDataDir = path.join(
    __dirname,
    "..",
    "data",
    "test_source_data"
  );
  const permanentDir = config.getPermanentDataDir();

  try {
    logInfo("Starting Excel to JSON conversion process");

    // 1. Source Excel file - flexible path or default test location
    let excelPath;
    if (inputExcelPath) {
      // Use provided path
      excelPath = path.resolve(inputExcelPath);
      logInfo("Using provided Excel file", { excelPath });
    } else {
      // Default to test source data location for development/testing
      excelPath = path.join(testSourceDataDir, "info", "Készülékek.xlsx");
      logInfo("Using default test Excel file", { excelPath });
    }

    // 2. Process Excel file directly (no temp copy needed in read-only mode)
    logInfo("Processing Excel file", { filePath: excelPath });
    const processor = new ExcelProcessor();
    const excelData = await processor.processExcelFile(excelPath);

    // 3. Extract preview images using ExcelJS
    const imageExtractor = new ImageExtractor();
    const imageMap = await imageExtractor.extractImages(
      excelPath,
      permanentDir
    );
    logInfo("Preview image extraction completed", {
      extractedCount: Object.keys(imageMap).length,
    });

    // 5. Validate model folder structure before processing
    const modelScanPath = modelsPath || path.join(testSourceDataDir, "models");
    const modelsSubPath = path.join(modelScanPath, "models");
    
    try {
      await fs.access(modelsSubPath);
      logInfo("Validating model folder structure", { path: modelsSubPath });
      const validator = new ModelFolderValidator();
      const validationResult = await validator.validateModelFolders(modelsSubPath);
      
      if (!validationResult.valid) {
        const errorMessage = validator.formatIssuesForDisplay(validationResult.issues);
        console.error("\n" + errorMessage);
        logError("Model folder validation failed", {
          invalidFolders: validationResult.invalidFolders,
          issues: validationResult.issues,
        });
        throw new Error("Model folder validation failed - fix folder structure and try again");
      }
      
      logInfo("Model folder validation passed", {
        totalFolders: validationResult.totalFolders,
        validFolders: validationResult.validFolders,
      });
    } catch (error) {
      if (error.code === "ENOENT") {
        logWarn("No models subfolder found, skipping validation", { path: modelsSubPath });
      } else {
        throw error;
      }
    }
    
    // 6. Scan for model files
    const scanResult = await scanModelFiles(modelScanPath);
    
    // Check for validation issues
    if (scanResult.validationIssues && scanResult.validationIssues.length > 0) {
      console.error('\n🛑 Processing stopped due to validation errors.');
      console.error('Fix the issues above and run the conversion again.\n');
      process.exit(1);
    }
    
    const modelFiles = scanResult.modelFiles;

    // 7. Match plates to models
    const plateConfig = await matchPlatesWithModels(
      excelData,
      modelFiles,
      imageMap
    );

    // 8. Generate JSON config
    const jsonConfig = generateJsonConfig(plateConfig);

    // 9. Save with descriptive filename
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    const outputFilename = `clamping_plates_inventory_${timestamp}.json`;
    const outputPath = path.join(permanentDir, outputFilename);
    await fs.writeFile(outputPath, JSON.stringify(jsonConfig, null, 2));
    logInfo("Saved inventory JSON config", {
      outputPath,
      filename: outputFilename,
    });

    console.log("\n🎉 Excel to JSON Conversion Completed!");
    console.log("==========================================");
    console.log(`📊 Plates Processed: ${plateConfig.length}`);
    console.log(
      `🔗 Models Linked: ${plateConfig.filter((p) => p.modelFile).length}`
    );
    console.log(`💾 Output File: ${outputPath}`);
    console.log("\nNext steps:");
    console.log("- Review the generated JSON config");
    console.log("- Use JSON config instead of Excel for initialization");

    return {
      success: true,
      platesProcessed: plateConfig.length,
      modelsLinked: plateConfig.filter((p) => p.currentModelFile).length,
      outputPath,
      jsonConfig,
    };
  } catch (error) {
    logError("Conversion failed", { error: error.message });
    console.error("\n❌ Conversion Failed:", error.message);
    throw error;
  }
}

async function matchPlatesWithModels(excelData, modelFiles, imageMap = {}) {
  const plateConfig = [];

  for (const plateData of excelData) {
    const plate = {
      id: generatePlateId(),
      plateNumber: plateData.plateNumber || "",
      workHistory: plateData.workHistoryCombined || "", // Combined work history string
      workHistoryEntries: plateData.workHistory || [], // Array of individual work entries
      workProjects: plateData.workProjects || [],
      shelf: plateData.shelfNumber || plateData.shelf || "", // PlateService validation expects 'shelf'
      shelfNumber: plateData.shelfNumber || "",
      boxSize: plateData.boxSize || "",
      isLocked: plateData.isLocked || false, // Preserve locked status from Excel
      currentModelFile: null,
      modelFiles: [],
      health: plateData.isLocked
        ? "locked"
        : plateData.workHistory && plateData.workHistory.length > 0
        ? "used"
        : "new",
      occupancy: "free",
      notes: "",
      specifications: {},
      previewImage: imageMap[plateData.plateNumber] || null, // Link to extracted preview image
      excelSource: plateData.source,
    };

    // Use strict plate number to model folder matching ONLY
    // Only match if exact folder exists: plate 2 → folder 2, plate 5 → folder 5
    // No fallback matching to prevent cross-contamination
    const plateNumber = plateData.plateNumber;
    let matches = modelFiles.filter((m) => m.folder === plateNumber);

    if (matches.length > 0) {
      plate.currentModelFile = matches[0].relativePath;
      plate.modelFiles = matches.map((m) => ({
        fileName: m.fileName,
        relativePath: m.relativePath,
        isPrimary: m === matches[0],
      }));
    } else {
      // No fallback - document that this plate has no model folder
      plate.currentModelFile = null;
      plate.modelFiles = [];
      plate.modelStatus = `No model folder found for plate ${plateNumber}`;
    }

    plateConfig.push(plate);
  }

  logInfo("Matched plates with models", {
    totalPlates: plateConfig.length,
    withModels: plateConfig.filter((p) => p.currentModelFile).length,
    workHistoryMatches: plateConfig.filter((p) => p.workProjects.length > 0)
      .length,
    avgWorkEntriesPerPlate:
      Math.round(
        (plateConfig.reduce(
          (sum, p) => sum + (p.workHistoryEntries?.length || 0),
          0
        ) /
          plateConfig.length) *
          10
      ) / 10,
  });

  return plateConfig;
}

function findModelMatchesByWorkHistory(workProjects, modelFiles) {
  const matches = [];

  for (const project of workProjects) {
    if (!project.projectCode || !project.workOrder) continue;

    // Try to match model files with work order patterns
    for (const model of modelFiles) {
      const fileName = model.fileName.toLowerCase();
      const workOrder = project.workOrder.toLowerCase().replace(/[-_\s]/g, "");

      // Check if filename contains project code and work order
      if (
        fileName.includes(project.projectCode.toLowerCase()) &&
        fileName.includes(workOrder.substring(0, Math.min(8, workOrder.length)))
      ) {
        matches.push(model);
      }
      // Or if work order appears in filename with variations
      else if (
        project.workOrder.length > 4 &&
        fileName.includes(project.workOrder.toLowerCase())
      ) {
        matches.push(model);
      }
    }
  }

  return matches;
}

async function scanModelFiles(modelsDir) {
  // modelsDir is already the full path to the models directory
  const modelFiles = [];
  const validationIssues = [];

  try {
    const folders = await fs.readdir(modelsDir);

    for (const folder of folders) {
      const folderPath = path.join(modelsDir, folder);
      const stat = await fs.stat(folderPath);

      if (stat.isDirectory()) {
        const files = await fs.readdir(folderPath);
        const modelFormats = [".x_t", ".step", ".stp", ".iges", ".igs", ".dwg"];
        const imageFormats = [".jpg", ".jpeg", ".png", ".bmp", ".gif"];

        const models = [];
        const images = [];

        for (const file of files) {
          const ext = path.extname(file).toLowerCase();
          if (modelFormats.includes(ext)) {
            models.push(file);
            modelFiles.push({
              folder,
              fileName: file,
              relativePath: `${folder}/${file}`,
              fullPath: path.join(folderPath, file),
            });
          } else if (imageFormats.includes(ext)) {
            images.push(file);
          }
        }

        // Validate: each folder should have exactly 1 model and 1 image
        if (models.length === 0) {
          validationIssues.push({
            type: 'MISSING_MODEL',
            folder,
            message: `No 3D model file found in folder "${folder}"`
          });
        } else if (models.length > 1) {
          validationIssues.push({
            type: 'MULTIPLE_MODELS',
            folder,
            models,
            message: `Multiple model files (${models.length}) found in folder "${folder}": ${models.join(', ')}`
          });
        }

        if (images.length === 0) {
          validationIssues.push({
            type: 'MISSING_IMAGE',
            folder,
            message: `No preview image found in folder "${folder}"`
          });
        } else if (images.length > 1) {
          validationIssues.push({
            type: 'MULTIPLE_IMAGES',
            folder,
            images,
            message: `Multiple images (${images.length}) found in folder "${folder}": ${images.join(', ')}`
          });
        }
      }
    }

    logInfo("Scanned model files", { filesFound: modelFiles.length, issues: validationIssues.length });
    
    if (validationIssues.length > 0) {
      console.error('\n⚠️  VALIDATION ISSUES FOUND:\n');
      for (const issue of validationIssues) {
        console.error(`  ❌ [${issue.type}] ${issue.message}`);
      }
      console.error('\n📋 Summary:');
      console.error(`  • Missing models: ${validationIssues.filter(i => i.type === 'MISSING_MODEL').length}`);
      console.error(`  • Multiple models: ${validationIssues.filter(i => i.type === 'MULTIPLE_MODELS').length}`);
      console.error(`  • Missing images: ${validationIssues.filter(i => i.type === 'MISSING_IMAGE').length}`);
      console.error(`  • Multiple images: ${validationIssues.filter(i => i.type === 'MULTIPLE_IMAGES').length}`);
      console.error('\n💡 Please fix these issues and reprocess.\n');
      
      // Return issues for caller to handle
      return { modelFiles, validationIssues };
    }
    
    return { modelFiles, validationIssues: [] };
  } catch (error) {
    logWarn("Failed to scan model files", { error: error.message });
    return { modelFiles: [], validationIssues: [] };
  }
}

function findModelMatches(shelf, modelFiles) {
  const matches = [];
  const shelfNumber = shelf.replace(/[^0-9]/g, "");

  for (const model of modelFiles) {
    if (model.folder === shelfNumber) {
      matches.push(model);
    } else if (
      model.fileName.includes(shelfNumber) ||
      model.fileName.includes(shelf)
    ) {
      matches.push(model);
    }
  }

  return matches;
}

function generateJsonConfig(plateConfig) {
  return {
    metadata: {
      generatedDate: new Date().toISOString(),
      source: "Excel conversion",
      totalPlates: plateConfig.length,
      platesWithModels: plateConfig.filter((p) => p.currentModelFile).length,
      platesWithWorkHistory: plateConfig.filter((p) => p.workHistory).length,
    },
    plates: plateConfig,
    modelIndex: generateModelIndex(plateConfig),
    workHistoryIndex: generateWorkHistoryIndex(plateConfig),
  };
}

function generateModelIndex(plateConfig) {
  const index = {};

  for (const plate of plateConfig) {
    if (plate.modelFiles) {
      for (const model of plate.modelFiles) {
        if (!index[model.relativePath]) {
          index[model.relativePath] = {
            fileName: model.fileName,
            relativePath: model.relativePath,
            usedByPlates: [],
          };
        }
        index[model.relativePath].usedByPlates.push({
          plateId: plate.id,
          plateNumber: plate.plateNumber,
          shelfNumber: plate.shelfNumber,
          isPrimary: model.isPrimary,
        });
      }
    }
  }

  return index;
}

function generateWorkHistoryIndex(plateConfig) {
  const index = {};

  for (const plate of plateConfig) {
    if (plate.workProjects && plate.workProjects.length > 0) {
      for (const project of plate.workProjects) {
        const key = project.fullEntry;
        if (!index[key]) {
          index[key] = {
            projectCode: project.projectCode,
            workOrder: project.workOrder,
            fullEntry: project.fullEntry,
            usedByPlates: [],
          };
        }
        index[key].usedByPlates.push({
          plateId: plate.id,
          plateNumber: plate.plateNumber,
          shelfNumber: plate.shelfNumber,
        });
      }
    }
  }

  return index;
}

function generatePlateId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `PL-${timestamp.toString().slice(-6)}-${random}`;
}

// Run if called directly
if (require.main === module) {
  // Check for command line arguments
  const inputExcelPath = process.argv[2];
  const modelsPath = process.argv[3];

  if (inputExcelPath && inputExcelPath.startsWith("--")) {
    console.log(
      "Usage: node convert_excel_to_json.js [path/to/excel/file.xlsx] [path/to/models/folder]"
    );
    console.log("If no paths provided, uses default test data locations");
    process.exit(1);
  }

  convertExcelToJson(inputExcelPath, modelsPath);
}

module.exports = convertExcelToJson;
