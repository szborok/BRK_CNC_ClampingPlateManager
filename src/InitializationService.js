// src/InitializationService.js
/**
 * Initialization service for ClampingPlateManager
 *
 * READ-ONLY INPUT PROCESSING:
 * - Input folders are NEVER modified
 * - All model files are COPIED to permanent storage
 * - Excel files are COPIED for reference
 * - Temp processing uses system temp folders
 * - Permanent data stored in user-specified location
 */

const fs = require("fs").promises;
const path = require("path");
const config = require("../config");
const { logInfo, logError, logWarn } = require("../utils/Logger");
const ExcelProcessor = require("../utils/ExcelProcessor");
const ModelFolderValidator = require("../utils/ModelFolderValidator");

class InitializationService {
  constructor() {
    this.initialized = false;
    this.processedPlates = [];
    this.modelFiles = [];
    this.infoData = null;
  }

  /**
   * Initialize from input folder
   * @param {string} inputFolderPath - Path to folder containing models and info file
   */
  async initializeFromFolder(inputFolderPath) {
    logInfo("Starting initialization from input folder", { inputFolderPath });

    try {
      // Validate input folder
      await this.validateInputFolder(inputFolderPath);

      // Create permanent data structure
      await this.createPermanentDirectories();

      // Process info file (Excel)
      await this.processInfoFile(inputFolderPath);

      // Process model files
      await this.processModelFiles(inputFolderPath);

      // Create plate records
      await this.createPlateRecords();

      // Save permanent data
      await this.savePermanentData();

      this.initialized = true;
      logInfo("Initialization completed successfully", {
        platesCreated: this.processedPlates.length,
        modelsProcessed: this.modelFiles.length,
      });

      return {
        success: true,
        platesCreated: this.processedPlates.length,
        modelsProcessed: this.modelFiles.length,
        permanentDataDir: config.getPermanentDataDir(),
      };
    } catch (error) {
      logError("Initialization failed", {
        error: error.message,
        inputFolderPath,
      });
      throw error;
    }
  }

  /**
   * Validate input folder structure
   */
  async validateInputFolder(inputFolderPath) {
    try {
      const stats = await fs.stat(inputFolderPath);
      if (!stats.isDirectory()) {
        throw new Error(`Input path is not a directory: ${inputFolderPath}`);
      }

      // Check for info file
      const infoFilePath = path.join(
        inputFolderPath,
        config.initialization.infoFileName
      );
      try {
        await fs.access(infoFilePath);
        logInfo("Found info file", { infoFilePath });
      } catch {
        throw new Error(
          `Info file not found: ${config.initialization.infoFileName}`
        );
      }

      // Check for model files
      const files = await this.scanForModelFiles(inputFolderPath);
      if (files.length === 0) {
        logWarn("No model files found in input folder");
      } else {
        logInfo(`Found ${files.length} model files`);
      }
    } catch (error) {
      throw new Error(`Input folder validation failed: ${error.message}`);
    }
  }

  /**
   * Create permanent data directories
   */
  async createPermanentDirectories() {
    const directories = [
      config.getPermanentDataDir(),
      config.getModelsDir(),
      config.getPreviewsDir(),
      config.getBackupDir(),
      path.dirname(config.getPlatesDataPath()),
      path.dirname(config.getConfigDataPath()),
    ];

    for (const dir of directories) {
      try {
        await fs.access(dir);
        logInfo("Directory exists", { dir });
      } catch {
        await fs.mkdir(dir, { recursive: true });
        logInfo("Created directory", { dir });
      }
    }
  }

  /**
   * Process Excel info file
   */
  async processInfoFile(inputFolderPath) {
    const infoFilePath = path.join(
      inputFolderPath,
      config.initialization.infoFileName
    );

    try {
      logInfo("Processing info file", { infoFilePath });

      // Process Excel file to extract plate information
      const excelProcessor = new ExcelProcessor();
      const plateDataFromExcel = await excelProcessor.processExcelFile(
        infoFilePath
      );

      // Extract preview images from Excel
      const ImageExtractor = require("../utils/ImageExtractor");
      const imageExtractor = new ImageExtractor();
      const imageMap = await imageExtractor.extractImages(
        infoFilePath,
        config.getPermanentDataDir()
      );
      logInfo("Preview image extraction completed", {
        extractedCount: Object.keys(imageMap).length,
      });

      // Link extracted images to plate data
      plateDataFromExcel.forEach((plate) => {
        if (imageMap[plate.plateNumber]) {
          plate.previewImage = imageMap[plate.plateNumber];
        }
      });

      this.infoData = {
        source: infoFilePath,
        processed: new Date(),
        plates: plateDataFromExcel,
        stats: excelProcessor.getStats(),
        extractedImages: Object.keys(imageMap).length,
      };

      logInfo("Excel processing completed", {
        platesExtracted: plateDataFromExcel.length,
        stats: this.infoData.stats,
      });

      // Copy info file to permanent storage for reference
      const permanentInfoPath = path.join(
        config.getPermanentDataDir(),
        config.initialization.infoFileName
      );
      await fs.copyFile(infoFilePath, permanentInfoPath);
      logInfo("Copied info file to permanent storage", { permanentInfoPath });
    } catch (error) {
      throw new Error(`Failed to process info file: ${error.message}`);
    }
  }

  /**
   * Process model files
   */
  async processModelFiles(inputFolderPath) {
    try {
      // First, validate model folder structure
      const modelsPath = path.join(inputFolderPath, "models");
      try {
        await fs.access(modelsPath);
        const validator = new ModelFolderValidator();
        const validationResult = await validator.validateModelFolders(modelsPath);

        if (!validationResult.valid) {
          const errorMessage = validator.formatIssuesForDisplay(validationResult.issues);
          logError("Model folder validation failed", {
            invalidFolders: validationResult.invalidFolders,
            issues: validationResult.issues,
          });
          throw new Error(errorMessage);
        }

        logInfo("Model folder validation passed", {
          totalFolders: validationResult.totalFolders,
          validFolders: validationResult.validFolders,
        });
      } catch (error) {
        if (error.code === "ENOENT") {
          logWarn("No models folder found, skipping validation");
        } else {
          throw error;
        }
      }

      this.modelFiles = await this.scanForModelFiles(inputFolderPath);

      // In test mode, also scan the test_source_data/models directory if it's different from input
      if (config.app.testMode) {
        const testSourceDataModelsPath = path.join(
          __dirname,
          "..",
          "data",
          "test_source_data",
          "models"
        );
        if (
          path.resolve(testSourceDataModelsPath) !==
          path.resolve(inputFolderPath)
        ) {
          const testModelFiles = await this.scanForModelFiles(
            testSourceDataModelsPath
          );
          this.modelFiles.push(...testModelFiles);
          logInfo(
            `Added ${testModelFiles.length} model files from test_source_data/models`
          );
        }
      }

      logInfo(`Found ${this.modelFiles.length} model files to process`);

      for (const modelFile of this.modelFiles) {
        await this.processModelFile(inputFolderPath, modelFile);
      }
    } catch (error) {
      throw new Error(`Failed to process model files: ${error.message}`);
    }
  }

  /**
   * Process individual model file
   */
  async processModelFile(inputFolderPath, modelFile) {
    try {
      const sourcePath = path.join(inputFolderPath, modelFile.relativePath);

      // Determine target path based on organization strategy
      let targetDir = config.getModelsDir();
      if (
        config.initialization.organizeFoldersByShelf &&
        modelFile.shelfLocation
      ) {
        targetDir = path.join(config.getModelsDir(), modelFile.shelfLocation);
      }

      // Ensure target directory exists
      await fs.mkdir(targetDir, { recursive: true });

      // Generate target filename
      const targetFileName = this.generateModelFileName(modelFile);
      const targetPath = path.join(targetDir, targetFileName);

      // Copy model file
      await fs.copyFile(sourcePath, targetPath);

      // Update model file info
      modelFile.permanentPath = targetPath;
      modelFile.permanentDir = targetDir;

      logInfo("Processed model file", {
        source: sourcePath,
        target: targetPath,
        shelf: modelFile.shelfLocation,
      });
    } catch (error) {
      logError("Failed to process model file", {
        error: error.message,
        file: modelFile.relativePath,
      });
    }
  }

  /**
   * Scan for model files recursively
   */
  async scanForModelFiles(inputFolderPath) {
    const modelFiles = [];

    async function scanDirectory(dirPath, relativePath = "") {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relPath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          // Skip if it's a directory matching info file name (without extension)
          if (
            entry.name !== path.parse(config.initialization.infoFileName).name
          ) {
            await scanDirectory(fullPath, relPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (config.initialization.supportedModelFormats.includes(ext)) {
            // Extract shelf location from folder structure
            const pathParts = relativePath.split(path.sep);
            let shelfLocation = null;

            // Try to determine shelf from folder name (e.g., "16" -> "A-16")
            for (const part of pathParts) {
              if (/^\d+$/.test(part)) {
                shelfLocation = `A-${part.padStart(2, "0")}`;
                break;
              }
            }

            modelFiles.push({
              name: entry.name,
              extension: ext,
              relativePath: relPath,
              fullPath: fullPath,
              shelfLocation: shelfLocation,
              size: null, // Will be populated when needed
            });
          }
        }
      }
    }

    await scanDirectory(inputFolderPath);
    return modelFiles;
  }

  /**
   * Generate standardized model file name
   */
  generateModelFileName(modelFile) {
    const baseName = path.parse(modelFile.name).name;
    const extension = modelFile.extension;

    if (modelFile.shelfLocation) {
      return `${modelFile.shelfLocation}_${baseName}${extension}`;
    }

    return `${baseName}${extension}`;
  }

  /**
   * Create plate records from processed data
   */
  async createPlateRecords() {
    logInfo("Creating plate records");

    // Create a map to correlate Excel data with model files
    const excelPlatesMap = new Map();
    if (this.infoData && this.infoData.plates) {
      this.infoData.plates.forEach((plateData) => {
        // Use shelf location or ID as key for matching
        const key = plateData.shelf || plateData.id || plateData.name;
        if (key) {
          excelPlatesMap.set(key.toLowerCase(), plateData);
        }
      });
    }

    // If we have Excel data but no model files, create plates from Excel data
    if (this.infoData && this.infoData.plates && this.modelFiles.length === 0) {
      logInfo(
        "No model files found - creating plates directly from Excel data",
        {
          excelPlates: this.infoData.plates.length,
        }
      );

      for (const plateData of this.infoData.plates) {
        const plate = {
          id: this.generatePlateIdFromExcel(plateData),
          name: plateData.name || `Plate ${plateData.plateNumber}`,
          shelf: plateData.shelf || plateData.shelfNumber || "UNKNOWN",
          plateNumber: plateData.plateNumber,
          modelFile: null, // No model file available
          previewImage: plateData.previewImage || null,
          health: plateData.isLocked
            ? "locked"
            : plateData.workHistory && plateData.workHistory.length > 0
            ? "used"
            : "new",
          occupancy: "free",
          workHistory: plateData.workHistory || [],
          workHistoryEntries: plateData.workHistoryEntries || [],
          workProjects: plateData.workProjects || [],
          isLocked: plateData.isLocked || false,
          notes: plateData.workHistoryCombined || "",
          lastModifiedBy: "excel_initialization",
          lastModifiedDate: new Date(),
          excelSource: plateData.source || null,
          history: [
            {
              id: this.generateHistoryId(),
              action: "created",
              user: "excel_initialization",
              timestamp: new Date(),
              changes: {
                status: "Initialized from Excel data",
                health: plateData.isLocked
                  ? "locked"
                  : plateData.workHistory && plateData.workHistory.length > 0
                  ? "used"
                  : "new",
              },
            },
          ],
        };

        this.processedPlates.push(plate);
        logInfo("Created plate from Excel data", {
          plateId: plate.id,
          plateNumber: plate.plateNumber,
          health: plate.health,
          workHistoryEntries: plate.workHistoryEntries.length,
        });
      }

      logInfo("Created plate records from Excel", {
        totalCreated: this.processedPlates.length,
      });
      return;
    }

    // Process model files and create plates (existing logic for when model files exist)
    for (const modelFile of this.modelFiles) {
      const plateId = this.generatePlateId(modelFile);

      // Try to find matching Excel data
      let excelData = null;
      if (modelFile.shelfLocation) {
        excelData =
          excelPlatesMap.get(modelFile.shelfLocation.toLowerCase()) ||
          excelPlatesMap.get(
            modelFile.shelfLocation.replace("-", "").toLowerCase()
          );
      }

      const plate = {
        id: plateId,
        name: excelData?.name || path.parse(modelFile.name).name,
        shelf: excelData?.shelf || modelFile.shelfLocation || "UNKNOWN",
        modelFile: modelFile.permanentPath,
        previewImage: excelData?.previewImage || null,
        health: excelData?.health || "new",
        occupancy: excelData?.occupancy || "free",
        notes: excelData?.notes || `Initialized from ${modelFile.relativePath}`,
        lastModifiedBy: "initialization",
        lastModifiedDate: new Date(),
        excelSource: excelData
          ? {
              worksheet: excelData.source.worksheet,
              row: excelData.source.row,
            }
          : null,
        history: [
          {
            id: this.generateHistoryId(),
            action: "created",
            user: "initialization",
            date: new Date(),
            details: `Plate created during initialization${
              excelData ? " (with Excel data)" : " (model file only)"
            } from ${modelFile.relativePath}`,
          },
        ],
      };

      this.processedPlates.push(plate);
    }

    // Create plates from Excel data that don't have corresponding model files
    for (const [key, excelData] of excelPlatesMap) {
      // Check if this Excel entry was already used
      const alreadyUsed = this.processedPlates.some(
        (plate) =>
          plate.excelSource &&
          plate.excelSource.worksheet === excelData.source.worksheet &&
          plate.excelSource.row === excelData.source.row
      );

      if (!alreadyUsed && excelData.shelf) {
        const plateId = this.generatePlateIdFromExcel(excelData);

        const plate = {
          id: plateId,
          name: excelData.name || excelData.id || `Plate ${excelData.shelf}`,
          shelf: excelData.shelf,
          modelFile: null, // No model file found
          previewImage: excelData.previewImage || null,
          health: excelData.health || "new",
          occupancy: excelData.occupancy || "free",
          notes: excelData.notes || "Created from Excel data only",
          lastModifiedBy: "initialization",
          lastModifiedDate: new Date(),
          excelSource: {
            worksheet: excelData.source.worksheet,
            row: excelData.source.row,
          },
          history: [
            {
              id: this.generateHistoryId(),
              action: "created",
              user: "initialization",
              date: new Date(),
              details: `Plate created from Excel data (no model file found)`,
            },
          ],
        };

        this.processedPlates.push(plate);
      }
    }

    logInfo(`Created ${this.processedPlates.length} plate records`, {
      withModelFiles: this.processedPlates.filter((p) => p.modelFile).length,
      withExcelData: this.processedPlates.filter((p) => p.excelSource).length,
      excelOnlyPlates: this.processedPlates.filter(
        (p) => !p.modelFile && p.excelSource
      ).length,
    });
  }

  /**
   * Save permanent data
   */
  async savePermanentData() {
    try {
      // Save plates data
      const platesPath = config.getPlatesDataPath();
      await fs.writeFile(
        platesPath,
        JSON.stringify(this.processedPlates, null, 2)
      );
      logInfo("Saved plates data", {
        count: this.processedPlates.length,
        path: platesPath,
      });

      // Save initialization metadata
      const initMetadata = {
        initializationDate: new Date(),
        source: this.infoData?.source || "unknown",
        platesCreated: this.processedPlates.length,
        modelsProcessed: this.modelFiles.length,
        config: {
          organizeFoldersByShelf: config.initialization.organizeFoldersByShelf,
          supportedFormats: config.initialization.supportedModelFormats,
        },
      };

      const metadataPath = path.join(
        config.getPermanentDataDir(),
        "initialization_metadata.json"
      );
      await fs.writeFile(metadataPath, JSON.stringify(initMetadata, null, 2));
      logInfo("Saved initialization metadata", { path: metadataPath });
    } catch (error) {
      throw new Error(`Failed to save permanent data: ${error.message}`);
    }
  }

  /**
   * Generate unique plate ID
   */
  generatePlateId(modelFile) {
    if (config.initialization.autoGenerateIds) {
      const prefix = config.initialization.idPrefix;
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.random().toString(36).substr(2, 4);
      return `${prefix}${timestamp}-${random}`;
    }

    // Use model file name as base
    const baseName = path
      .parse(modelFile.name)
      .name.replace(/[^a-zA-Z0-9]/g, "-");
    return `${config.initialization.idPrefix}${baseName}`;
  }

  /**
   * Generate unique plate ID from Excel data
   */
  generatePlateIdFromExcel(excelData) {
    if (excelData.id) {
      return `${config.initialization.idPrefix}${excelData.id}`;
    }

    if (config.initialization.autoGenerateIds) {
      const prefix = config.initialization.idPrefix;
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.random().toString(36).substr(2, 4);
      return `${prefix}${timestamp}-${random}`;
    }

    // Use shelf as base
    const baseName = excelData.shelf.replace(/[^a-zA-Z0-9]/g, "-");
    return `${config.initialization.idPrefix}${baseName}`;
  }

  /**
   * Generate unique history ID
   */
  generateHistoryId() {
    return `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get initialization status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      platesProcessed: this.processedPlates.length,
      modelsProcessed: this.modelFiles.length,
      permanentDataDir: config.getPermanentDataDir(),
    };
  }
}

module.exports = InitializationService;
