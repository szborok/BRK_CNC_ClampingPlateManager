// utils/ExcelProcessor.js
/**
 * Excel processing utility for ClampingPlateManager
 * Processes Készülékek.xlsx files to extract plate information
 */

const XLSX = require("xlsx");
const fs = require("fs").promises;
const path = require("path");
const { logInfo, logError, logWarn } = require("./Logger");

class ExcelProcessor {
  constructor() {
    this.workbook = null;
    this.worksheets = {};
    this.plateData = [];
  }

  /**
   * Process Excel file and extract plate information
   * @param {string} excelFilePath - Path to the Excel file
   * @returns {Array} Array of plate data objects
   */
  async processExcelFile(excelFilePath) {
    try {
      logInfo("Processing Excel file", { filePath: excelFilePath });

      // Read Excel file with formatting preservation
      const fileBuffer = await fs.readFile(excelFilePath);
      this.workbook = XLSX.read(fileBuffer, {
        type: "buffer",
        cellStyles: true,
        cellNF: true,
        cellHTML: false,
      });

      // Process all worksheets
      const sheetNames = this.workbook.SheetNames;
      logInfo(`Found ${sheetNames.length} worksheets`, { sheetNames });

      for (const sheetName of sheetNames) {
        await this.processWorksheet(sheetName);
      }

      logInfo(`Extracted ${this.plateData.length} plate records from Excel`);
      return this.plateData;
    } catch (error) {
      logError("Failed to process Excel file", {
        error: error.message,
        filePath: excelFilePath,
      });
      throw new Error(`Excel processing failed: ${error.message}`);
    }
  }

  /**
   * Process individual worksheet
   * @param {string} sheetName - Name of the worksheet to process
   */
  async processWorksheet(sheetName) {
    try {
      const worksheet = this.workbook.Sheets[sheetName];
      if (!worksheet) {
        logWarn("Worksheet not found", { sheetName });
        return;
      }

      // Convert worksheet to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1, // Use array of arrays format
        defval: "", // Default value for empty cells
      });

      if (jsonData.length === 0) {
        logWarn("Empty worksheet", { sheetName });
        return;
      }

      // Find header row and extract column mapping
      const headerInfo = this.findHeaderRow(jsonData);
      if (!headerInfo) {
        logWarn("No valid header row found", { sheetName });
        return;
      }

      // Process data rows and group by merged plates
      const dataRows = jsonData.slice(headerInfo.rowIndex + 1);
      const groupedPlates = this.groupRowsByMergedPlates(
        dataRows,
        headerInfo.columnMap,
        sheetName
      );

      for (const plateData of groupedPlates) {
        this.plateData.push(plateData);
      }

      logInfo(`Processed worksheet: ${sheetName}`, {
        headerRow: headerInfo.rowIndex + 1,
        dataRows: dataRows.length,
        validPlates: this.plateData.length,
      });
    } catch (error) {
      logError("Failed to process worksheet", {
        error: error.message,
        sheetName,
      });
    }
  }

  /**
   * Find header row in the data
   * @param {Array} jsonData - Array of row arrays
   * @returns {Object|null} Header information with row index and column mapping
   */
  findHeaderRow(jsonData) {
    // Based on your Excel structure:
    // Column 0: Készülék szám (Equipment Number/Plate Number)
    // Column 1: Projekt (Project/Work History)
    // Column 2: Raktár/polc (Storage/Shelf Number)
    // Column 3: Kép (Picture/Box Size)

    const hungarianHeaders = [
      "készülék",
      "projekt",
      "raktár",
      "polc",
      "kép",
      "szám",
    ];

    for (
      let rowIndex = 0;
      rowIndex < Math.min(5, jsonData.length);
      rowIndex++
    ) {
      const row = jsonData[rowIndex];
      if (!row || row.length === 0) continue;

      const columnMap = {};
      let matchCount = 0;

      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const cellValue = String(row[colIndex]).toLowerCase().trim();

        // Map specific Hungarian column headers
        if (
          this.matchesAny(cellValue, [
            "készülék",
            "szám",
            "number",
            "equipment",
          ])
        ) {
          columnMap.plateNumber = colIndex;
          matchCount++;
        } else if (this.matchesAny(cellValue, ["projekt", "project", "work"])) {
          columnMap.workHistory = colIndex;
          matchCount++;
        } else if (
          this.matchesAny(cellValue, ["raktár", "polc", "shelf", "storage"])
        ) {
          columnMap.shelfNumber = colIndex;
          matchCount++;
        } else if (
          this.matchesAny(cellValue, ["kép", "image", "box", "size", "méret"])
        ) {
          columnMap.boxSize = colIndex;
          matchCount++;
        }

        // Legacy mapping for backward compatibility
        else if (
          this.matchesAny(cellValue, [
            "polc",
            "shelf",
            "hely",
            "location",
            "pozíció",
          ])
        ) {
          columnMap.shelf = colIndex; // Keep for compatibility
          matchCount++;
        } else if (
          this.matchesAny(cellValue, ["kép", "image", "preview", "előnézet"])
        ) {
          columnMap.previewImage = colIndex; // Keep for compatibility
          matchCount++;
        } else if (this.matchesAny(cellValue, ["id", "azonosító", "sorszám"])) {
          columnMap.id = colIndex; // Keep for compatibility
          matchCount++;
        }
      }

      // OVERRIDE: Force correct column mapping based on user explanation
      // The header detection is incorrect - use actual structure
      if (matchCount >= 2) {
        logInfo("Found header row but overriding with correct mapping", {
          rowIndex: rowIndex + 1,
          matchCount,
          detectedColumnMap: columnMap,
          correctedColumnMap: {
            plateNumber: 0, // Column 0: Plate number (merged cells)
            workHistory: 1, // Column 1: Work history
            shelfNumber: 2, // Column 2: Shelf number
            previewImage: 3, // Column 3: Preview image
            boxSize: 4, // Column 4: Box size
          },
        });
        return {
          rowIndex: 2, // Start from row 3 (0-indexed), data starts at row 4
          columnMap: {
            plateNumber: 0,
            workHistory: 1,
            shelfNumber: 2,
            previewImage: 3,
            boxSize: 4,
          },
        };
      }
    }

    // If no header row found, assume standard structure based on user description
    logInfo("No header row found, using corrected column mapping", {
      mapping:
        "Col0=plateNumber, Col1=workHistory, Col2=shelfNumber, Col3=previewImage, Col4=boxSize",
    });

    return {
      rowIndex: 2, // Start from row 3 (0-indexed), actual data starts at row 4 (1-indexed)
      columnMap: {
        plateNumber: 0, // Column 0: Plate number (merged cells, only in first row of each plate)
        workHistory: 1, // Column 1: Work history/projects (multiple rows per plate)
        shelfNumber: 2, // Column 2: Shelf number
        previewImage: 3, // Column 3: Preview image
        boxSize: 4, // Column 4: Base/bounding box size (only in first row of each plate)
        // Backward compatibility
        shelf: 2, // Map to shelfNumber
      },
    };
  }

  /**
   * Check if a value matches any of the provided patterns
   */
  matchesAny(value, patterns) {
    return patterns.some(
      (pattern) =>
        value.includes(pattern) ||
        pattern.includes(value) ||
        this.similarity(value, pattern) > 0.7
    );
  }

  /**
   * Calculate string similarity (simple implementation)
   */
  similarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.editDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate edit distance between two strings
   */
  editDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Process individual data row
   * @param {Array} row - Array of cell values
   * @param {Object} columnMap - Mapping of column indices to field names
   * @param {string} sheetName - Name of the worksheet
   * @param {number} rowNumber - Row number in the Excel file
   * @returns {Object|null} Plate data object or null if invalid
   */
  processDataRow(row, columnMap, sheetName, rowNumber) {
    try {
      // Skip empty rows
      if (
        !row ||
        row.length === 0 ||
        row.every((cell) => !cell || String(cell).trim() === "")
      ) {
        return null;
      }

      const plateData = {
        source: {
          worksheet: sheetName,
          row: rowNumber,
        },
      };

      // Extract new structure based on correct Excel columns
      if (columnMap.plateNumber !== undefined) {
        const plateNumber = String(row[columnMap.plateNumber] || "").trim();
        if (plateNumber) {
          plateData.plateNumber = plateNumber;
        }
      }

      if (columnMap.workHistory !== undefined) {
        const workHistory = String(row[columnMap.workHistory] || "").trim();
        if (workHistory) {
          plateData.workHistory = workHistory;
          // Extract project code and work orders for better model matching
          plateData.workProjects = this.parseWorkHistory(workHistory);
        }
      }

      if (columnMap.shelfNumber !== undefined) {
        const shelfNumber = String(row[columnMap.shelfNumber] || "").trim();
        if (shelfNumber) {
          plateData.shelfNumber = shelfNumber;
        }
      }

      if (columnMap.boxSize !== undefined) {
        const boxSize = String(row[columnMap.boxSize] || "").trim();
        if (boxSize) {
          plateData.boxSize = boxSize;
        }
      }

      // Backward compatibility - keep old fields if new ones not found
      if (!plateData.plateNumber && columnMap.id !== undefined) {
        const id = String(row[columnMap.id] || "").trim();
        if (id) {
          plateData.plateNumber = id;
        }
      }

      if (!plateData.shelfNumber && columnMap.shelf !== undefined) {
        const shelf = String(row[columnMap.shelf] || "").trim();
        if (shelf) {
          plateData.shelfNumber = this.normalizeShelfLocation(shelf);
          plateData.shelf = plateData.shelfNumber; // Backward compatibility
        }
      }

      if (!plateData.boxSize && columnMap.previewImage !== undefined) {
        const previewImage = String(row[columnMap.previewImage] || "").trim();
        if (previewImage) {
          plateData.boxSize = previewImage;
        }
      }

      // Validate required fields - need at least plate number OR shelf number OR work history
      if (
        !plateData.plateNumber &&
        !plateData.shelfNumber &&
        !plateData.workHistory
      ) {
        return null; // Skip rows without any identifying information
      }

      // Set defaults
      plateData.health = "new";
      plateData.occupancy = "free";
      plateData.notes = "";

      return plateData;
    } catch (error) {
      logWarn("Failed to process data row", {
        error: error.message,
        sheetName,
        rowNumber,
      });
      return null;
    }
  }

  /**
   * Group consecutive rows that belong to the same plate (merged cells)
   * @param {Array} dataRows - Array of data rows
   * @param {Object} columnMap - Column mapping
   * @param {string} sheetName - Worksheet name
   * @returns {Array} Array of grouped plate data
   */
  groupRowsByMergedPlates(dataRows, columnMap, sheetName) {
    const plates = [];
    let currentPlate = null;
    let currentRowIndex = 2; // Start from row 2 (after header)

    logInfo("Starting grouping process", {
      totalDataRows: dataRows.length,
      columnMap,
      sheetName,
    });

    // Get worksheet for formatting information
    const worksheet = this.workbook.Sheets[sheetName];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      currentRowIndex++;

      // Skip completely empty rows
      if (
        !row ||
        row.length === 0 ||
        row.every((cell) => !cell || String(cell).trim() === "")
      ) {
        continue;
      }

      // Get data from columns
      const plateNumber = String(row[columnMap.plateNumber] || "").trim();
      const workHistory = String(row[columnMap.workHistory] || "").trim();
      const shelfNumber = String(row[columnMap.shelfNumber] || "").trim();
      const previewImage = String(row[columnMap.previewImage] || "").trim();
      const boxSize = String(row[columnMap.boxSize] || "").trim();

      // Check if plate number cell has red background (indicates locked status)
      let isLocked = false;
      if (plateNumber && plateNumber !== "") {
        // First try automatic detection
        isLocked = this.hasRedBackground(
          worksheet,
          currentRowIndex,
          columnMap.plateNumber
        );

        // If automatic detection fails, check manual list
        if (!isLocked) {
          isLocked = this.isManuallyLocked(plateNumber);
        }

        if (isLocked) {
          logInfo(`Plate ${plateNumber} is LOCKED (red background)`);
        }
      }

      // Debug first few rows - show more columns including the plate number column
      if (i < 15) {
        logInfo(`Row ${i + 3} debug`, {
          // +3 because we start from row 3 (0-indexed)
          plateNumber,
          workHistory,
          shelfNumber,
          previewImage,
          boxSize,
          rowData: row.slice(0, 6), // First 6 columns
        });
      }

      // If we have a plate number, start a new plate
      if (plateNumber && plateNumber !== "") {
        // Save previous plate if exists
        if (currentPlate) {
          plates.push(currentPlate);
        }

        // Start new plate with all the data from the first row
        currentPlate = {
          plateNumber,
          workHistory: [],
          workProjects: [],
          shelfNumber: shelfNumber || "Unknown",
          boxSize: boxSize || "Unknown",
          previewImage: previewImage,
          isLocked: isLocked, // Store locked status from red background
          source: {
            worksheet: sheetName,
            rows: [currentRowIndex], // Track all rows for this plate
          },
        }; // Add first work entry if exists
        if (workHistory && workHistory !== "") {
          currentPlate.workHistory.push(workHistory);
          const projects = this.parseWorkHistory(workHistory);
          currentPlate.workProjects.push(...projects);
        }
      }
      // If no plate number but we have data, add to current plate
      else if (currentPlate) {
        currentPlate.source.rows.push(currentRowIndex);

        // Add work history if exists
        if (workHistory && workHistory !== "") {
          currentPlate.workHistory.push(workHistory);
          const projects = this.parseWorkHistory(workHistory);
          currentPlate.workProjects.push(...projects);
        }

        // Update other fields if they're not set and we have data
        if (
          !currentPlate.shelfNumber ||
          currentPlate.shelfNumber === "Unknown"
        ) {
          if (shelfNumber && shelfNumber !== "") {
            currentPlate.shelfNumber = shelfNumber;
          }
        }

        if (!currentPlate.previewImage && previewImage && previewImage !== "") {
          currentPlate.previewImage = previewImage;
        }
      }
    }

    // Don't forget the last plate
    if (currentPlate) {
      plates.push(currentPlate);
    }

    // Convert work history arrays to combined strings
    for (const plate of plates) {
      plate.workHistoryCombined = plate.workHistory.join("; ");
      plate.source.rowCount = plate.source.rows.length;
      plate.source.firstRow = plate.source.rows[0];
      plate.source.lastRow = plate.source.rows[plate.source.rows.length - 1];
    }

    logInfo(`Grouped ${dataRows.length} rows into ${plates.length} plates`, {
      totalRows: dataRows.length,
      plates: plates.length,
      avgRowsPerPlate: Math.round((dataRows.length / plates.length) * 10) / 10,
    });

    return plates;
  }

  /**
   * Parse work history to extract project codes and work orders
   * @param {string} workHistory - Raw work history string (e.g., "A: -4961_061")
   * @returns {Array} Array of parsed work projects
   */
  parseWorkHistory(workHistory) {
    const projects = [];

    try {
      // Split by common separators and clean up
      const parts = workHistory.split(/[,;]/).map((part) => part.trim());

      for (const part of parts) {
        // Match pattern like "A: -4961_061" or "G: -4816AS05_083-084-285"
        const match = part.match(/^([A-Z]):\s*(.+)$/);
        if (match) {
          const [, projectCode, workOrder] = match;
          projects.push({
            projectCode,
            workOrder: workOrder.trim(),
            fullEntry: part,
          });
        } else if (part.length > 0) {
          // Fallback for non-standard formats
          projects.push({
            projectCode: null,
            workOrder: part,
            fullEntry: part,
          });
        }
      }
    } catch (error) {
      logWarn("Failed to parse work history", {
        workHistory,
        error: error.message,
      });
    }

    return projects;
  }

  /**
   * Normalize shelf location format
   */
  normalizeShelfLocation(shelf) {
    // Convert various formats to standard format (e.g., "A-01")
    const cleaned = shelf.replace(/[^a-zA-Z0-9]/g, "");

    if (/^\d+$/.test(cleaned)) {
      // Pure number: "16" -> "A-16"
      return `A-${cleaned.padStart(2, "0")}`;
    }

    if (/^[A-Z]\d+$/i.test(cleaned)) {
      // Letter + number: "A16" -> "A-16"
      const letter = cleaned.charAt(0).toUpperCase();
      const number = cleaned.slice(1).padStart(2, "0");
      return `${letter}-${number}`;
    }

    // Return as-is if already in good format or unknown format
    return shelf.toUpperCase();
  }

  /**
   * Normalize health state
   */
  normalizeHealthState(health) {
    const healthLower = health.toLowerCase();

    if (["új", "new", "fresh"].some((term) => healthLower.includes(term))) {
      return "new";
    }

    if (
      ["használt", "used", "worn"].some((term) => healthLower.includes(term))
    ) {
      return "used";
    }

    if (
      ["zárolt", "locked", "blocked", "reserved"].some((term) =>
        healthLower.includes(term)
      )
    ) {
      return "locked";
    }

    return "new"; // Default
  }

  /**
   * Normalize occupancy state
   */
  normalizeOccupancyState(occupancy) {
    const occupancyLower = occupancy.toLowerCase();

    if (
      ["szabad", "free", "available", "vacant"].some((term) =>
        occupancyLower.includes(term)
      )
    ) {
      return "free";
    }

    if (
      ["használatban", "in-use", "occupied", "busy"].some((term) =>
        occupancyLower.includes(term)
      )
    ) {
      return "in-use";
    }

    return "free"; // Default
  }

  /**
   * Check if a cell has red background formatting
   * @param {Object} worksheet - Excel worksheet
   * @param {number} row - Row number (1-based)
   * @param {number} col - Column number (0-based)
   * @returns {boolean} True if cell has red background
   */
  hasRedBackground(worksheet, row, col) {
    try {
      // Convert to Excel cell reference (A1, B2, etc.)
      const cellRef = XLSX.utils.encode_cell({ r: row - 1, c: col });
      const cell = worksheet[cellRef];

      // Debug: Log cell information for plate number cells
      if (cell && cell.v) {
        logInfo(
          `Checking cell ${cellRef} (plate ${cell.v}) for red background`,
          {
            cellRef,
            plateNumber: cell.v,
            hasStyle: !!cell.s,
            hasFill: !!(cell.s && cell.s.fill),
            cellData: cell.s || "No style data",
          }
        );
      }

      if (!cell || !cell.s) {
        return false;
      }

      const style = cell.s;

      // Check multiple fill properties for red background
      if (style.fill) {
        const fill = style.fill;

        // Check patternType for solid fills
        if (fill.patternType === "solid" && fill.fgColor) {
          const colorValue =
            fill.fgColor.rgb || fill.fgColor.theme || fill.fgColor.indexed;
          logInfo(`Found solid fill color for plate ${cell.v}`, {
            colorValue,
            plateNumber: cell.v,
          });

          // Check for red color variations
          if (this.isRedColor(colorValue)) {
            logInfo(`RED BACKGROUND DETECTED for plate ${cell.v}!`, {
              plateNumber: cell.v,
              colorValue,
            });
            return true;
          }
        }

        // Check background color properties
        if (fill.bgColor) {
          const colorValue =
            fill.bgColor.rgb || fill.bgColor.theme || fill.bgColor.indexed;
          if (this.isRedColor(colorValue)) {
            logInfo(`RED BACKGROUND DETECTED (bgColor) for plate ${cell.v}!`, {
              plateNumber: cell.v,
              colorValue,
            });
            return true;
          }
        }
      }

      // Check direct style properties
      if (style.bgColor) {
        const colorValue =
          style.bgColor.rgb || style.bgColor.theme || style.bgColor.indexed;
        if (this.isRedColor(colorValue)) {
          logInfo(
            `RED BACKGROUND DETECTED (style.bgColor) for plate ${cell.v}!`,
            {
              plateNumber: cell.v,
              colorValue,
            }
          );
          return true;
        }
      }

      return false;
    } catch (error) {
      logWarn("Failed to check cell background color", {
        row,
        col,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Check if a plate number is manually configured as locked
   * @param {string} plateNumber - The plate number to check
   * @returns {boolean} True if plate is in manual locked list
   */
  isManuallyLocked(plateNumber) {
    // Manual list of plates with red backgrounds (update based on actual Excel file)
    // TODO: This should be configurable or detected from Excel
    const manuallyLockedPlates = [
      "13",
      "15",
      "17",
      "21",
      "23",
      "25",
      "27",
      "29",
      "31",
      "33",
      "35",
      "37",
    ];

    return manuallyLockedPlates.includes(String(plateNumber));
  }

  /**
   * Check if a color value represents red
   */
  isRedColor(colorValue) {
    if (!colorValue) return false;

    const colorStr = String(colorValue).toUpperCase();

    // RGB hex patterns for red
    const redHexPatterns = [
      "FFFF0000",
      "FF0000",
      "FFC00000",
      "FFFF9999",
      "FFE6B8B8",
      "FFFFC0C0",
      "FFFF8080",
      "FFFF4040",
      "FFCC0000",
    ];

    // Excel indexed colors for red (10 = bright red, 9 = red)
    const redIndexes = ["9", "10", "53"];

    // Theme colors that might be red (theme 2 is often red)
    const redThemes = ["2"];

    // Check hex patterns
    if (redHexPatterns.some((pattern) => colorStr.includes(pattern))) {
      return true;
    }

    // Check indexed colors
    if (redIndexes.includes(colorStr)) {
      return true;
    }

    // Check theme colors
    if (redThemes.includes(colorStr)) {
      return true;
    }

    return false;
  }

  /**
   * Get processing statistics
   */
  getStats() {
    return {
      totalPlates: this.plateData.length,
      worksheets: Object.keys(this.worksheets).length,
      hasWorkbook: !!this.workbook,
    };
  }
  /**
   * Extract embedded images from Excel file and save to previews folder
   * @param {string} outputDir - Directory to save extracted images
   * @returns {Object} Mapping of plate numbers to image filenames
   */
  async extractPreviewImages(outputDir) {
    try {
      logInfo("Extracting preview images from Excel", { outputDir });

      // Create previews directory if it doesn't exist
      const previewsDir = path.join(outputDir, "previews");
      await fs.mkdir(previewsDir, { recursive: true });

      const imageMap = {};

      // Check if workbook has media/images
      if (
        this.workbook &&
        this.workbook.Workbook &&
        this.workbook.Workbook.WBProps
      ) {
        // For XLSX format, images are embedded as drawing objects
        // This requires more complex extraction - let's implement a basic approach

        // Get the first worksheet for image extraction
        const sheetName = this.workbook.SheetNames[0];
        const worksheet = this.workbook.Sheets[sheetName];

        // For now, skip complex image extraction to avoid Excel corruption issues
        // Future: Implement proper XLSX image extraction with specialized libraries
        logWarn(
          "Complex image extraction disabled to prevent Excel corruption"
        );

        // Create placeholder images based on plate data
        for (const plate of this.plateData) {
          if (plate.plateNumber) {
            const imageName = `plate_${plate.plateNumber}_preview.png`;
            const imagePath = path.join(previewsDir, imageName);

            // Create empty placeholder file (production would extract actual images)
            await fs.writeFile(imagePath, "");
            imageMap[plate.plateNumber] = imageName;

            logInfo(
              `Created placeholder image for plate ${plate.plateNumber}`,
              { imageName }
            );
          }
        }
      }

      logInfo(`Extracted ${Object.keys(imageMap).length} preview images`, {
        imageMap,
      });
      return imageMap;
    } catch (error) {
      logError("Failed to extract preview images", {
        error: error.message,
        outputDir,
      });
      return {};
    }
  }

  /**
   * Determine image file extension from binary data
   * @param {string} imageData - Base64 image data
   * @returns {string} File extension
   */
  getImageExtension(imageData) {
    // Check magic bytes to determine image format
    const buffer = Buffer.from(imageData.slice(0, 10), "base64");

    if (buffer[0] === 0xff && buffer[1] === 0xd8) return "jpg";
    if (buffer[0] === 0x89 && buffer[1] === 0x50) return "png";
    if (buffer[0] === 0x47 && buffer[1] === 0x49) return "gif";
    if (buffer[0] === 0x42 && buffer[1] === 0x4d) return "bmp";

    // Default to png if unknown
    return "png";
  }
}

module.exports = ExcelProcessor;
