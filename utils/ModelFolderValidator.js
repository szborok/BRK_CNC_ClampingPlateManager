// utils/ModelFolderValidator.js
/**
 * Validates model folder structure for ClampingPlateManager
 * Each plate folder MUST contain exactly 1 model file and 1 preview image
 */

const fs = require("fs").promises;
const path = require("path");
const { logInfo, logError, logWarn } = require("./Logger");

class ModelFolderValidator {
  constructor() {
    this.modelExtensions = [".x_t", ".step", ".stp", ".iges", ".igs", ".dwg", ".psmodel"];
    this.imageExtensions = [".png", ".jpg", ".jpeg"];
  }

  /**
   * Validate all model folders in the given path
   * @param {string} modelsRootPath - Root path containing plate folders
   * @returns {Promise<Object>} Validation result with issues array
   */
  async validateModelFolders(modelsRootPath) {
    logInfo("Starting model folder validation", { modelsRootPath });

    try {
      const entries = await fs.readdir(modelsRootPath, { withFileTypes: true });
      const folders = entries.filter((entry) => entry.isDirectory());

      const issues = [];
      let validCount = 0;

      for (const folder of folders) {
        const folderPath = path.join(modelsRootPath, folder.name);
        const result = await this.validateSingleFolder(folderPath, folder.name);

        if (!result.valid) {
          issues.push({
            folder: folder.name,
            path: folderPath,
            modelCount: result.modelCount,
            imageCount: result.imageCount,
            problems: result.problems,
          });
        } else {
          validCount++;
        }
      }

      const totalFolders = folders.length;
      const hasIssues = issues.length > 0;

      const validationResult = {
        valid: !hasIssues,
        totalFolders,
        validFolders: validCount,
        invalidFolders: issues.length,
        issues,
      };

      if (hasIssues) {
        logWarn("Model folder validation found issues", {
          totalFolders,
          validFolders: validCount,
          invalidFolders: issues.length,
        });
      } else {
        logInfo("Model folder validation passed", {
          totalFolders,
          validFolders: validCount,
        });
      }

      return validationResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logError("Model folder validation failed", { error: errorMessage });
      throw new Error(`Validation failed: ${errorMessage}`);
    }
  }

  /**
   * Validate a single plate folder
   * @param {string} folderPath - Path to plate folder
   * @param {string} folderName - Name of folder (for reporting)
   * @returns {Promise<Object>} Validation result for this folder
   */
  async validateSingleFolder(folderPath, folderName) {
    const files = await fs.readdir(folderPath);

    let modelCount = 0;
    let imageCount = 0;
    const modelFiles = [];
    const imageFiles = [];

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();

      if (this.modelExtensions.includes(ext)) {
        modelCount++;
        modelFiles.push(file);
      }

      if (this.imageExtensions.includes(ext)) {
        imageCount++;
        imageFiles.push(file);
      }
    }

    const problems = [];

    if (modelCount === 0) {
      problems.push("No model file found");
    } else if (modelCount > 1) {
      problems.push(`Multiple model files found: ${modelFiles.join(", ")}`);
    }

    if (imageCount === 0) {
      problems.push("No preview image found");
    } else if (imageCount > 1) {
      problems.push(`Multiple images found: ${imageFiles.join(", ")}`);
    }

    return {
      valid: modelCount === 1 && imageCount === 1,
      modelCount,
      imageCount,
      modelFiles,
      imageFiles,
      problems,
    };
  }

  /**
   * Format validation issues for display
   * @param {Array} issues - Array of issue objects
   * @returns {string} Formatted error message
   */
  formatIssuesForDisplay(issues) {
    const lines = ["Model folder validation failed:\n"];

    for (const issue of issues) {
      lines.push(`❌ ${issue.folder}:`);
      lines.push(`   Models: ${issue.modelCount} | Images: ${issue.imageCount}`);
      for (const problem of issue.problems) {
        lines.push(`   → ${problem}`);
      }
      lines.push("");
    }

    lines.push("Each plate folder must contain exactly:");
    lines.push("  • 1 model file (.x_t, .step, .stp, .psmodel, etc.)");
    lines.push("  • 1 preview image (.png, .jpg, .jpeg)");

    return lines.join("\n");
  }
}

module.exports = ModelFolderValidator;
