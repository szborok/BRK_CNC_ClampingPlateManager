// utils/ImageExtractor.js
/**
 * Excel image extraction utility using ExcelJS
 * Extracts embedded images from Excel files and saves them as preview images
 */

const ExcelJS = require("exceljs");
const fs = require("fs").promises;
const path = require("path");
const { logInfo, logError, logWarn } = require("./Logger");

class ImageExtractor {
  constructor() {
    this.workbook = null;
  }

  /**
   * Extract preview images from Excel file
   * @param {string} excelFilePath - Path to Excel file
   * @param {string} outputDir - Directory to save images
   * @returns {Object} Mapping of plate numbers to image filenames
   */
  async extractImages(excelFilePath, outputDir) {
    try {
      logInfo("Starting image extraction with ExcelJS", {
        excelFilePath,
        outputDir,
      });

      // Create previews directory
      const previewsDir = path.join(outputDir, "previews");
      await fs.mkdir(previewsDir, { recursive: true });

      // Load workbook with ExcelJS
      this.workbook = new ExcelJS.Workbook();
      await this.workbook.xlsx.readFile(excelFilePath);

      const imageMap = {};
      let imageCounter = 0;

      // Process first worksheet (should be 'Munka1')
      const worksheet = this.workbook.getWorksheet(1);

      if (!worksheet) {
        logWarn("No worksheet found in Excel file");
        return imageMap;
      }

      logInfo(`Processing worksheet: ${worksheet.name}`);

      // Look for images in the worksheet
      if (worksheet.getImages && worksheet.getImages().length > 0) {
        const images = worksheet.getImages();
        logInfo(`Found ${images.length} images in worksheet`);

        // Process each image
        for (const imageInfo of images) {
          try {
            imageCounter++;

            // Get image buffer from workbook media
            const imageId = imageInfo.imageId;
            const image = this.workbook.model.media.find(
              (m) => m.index === imageId
            );

            if (image && image.buffer) {
              // Determine file extension based on image type
              const extension = this.getImageExtension(
                image.extension || "png"
              );
              const imageName = `plate_${imageCounter}_preview.${extension}`;
              const imagePath = path.join(previewsDir, imageName);

              // Save image to file
              await fs.writeFile(imagePath, image.buffer);

              // Try to map to plate number based on image position/order
              const plateNumber = this.determinePlateNumber(
                imageInfo,
                imageCounter
              );
              imageMap[plateNumber] = imageName;

              logInfo(`Extracted image ${imageCounter}`, {
                plateNumber,
                imageName,
                size: image.buffer.length,
              });
            }
          } catch (imageError) {
            logError(`Failed to extract image ${imageCounter}`, {
              error: imageError.message,
            });
          }
        }
      } else {
        logWarn("No images found in worksheet - creating placeholders");

        // Create placeholder images for plates 1-38
        for (let i = 1; i <= 38; i++) {
          const imageName = `plate_${i}_preview_placeholder.png`;
          const imagePath = path.join(previewsDir, imageName);

          // Create empty placeholder file
          await fs.writeFile(imagePath, "");
          imageMap[i] = imageName;
        }
      }

      logInfo(`Image extraction completed`, {
        totalExtracted: Object.keys(imageMap).length,
        outputDir: previewsDir,
      });

      return imageMap;
    } catch (error) {
      logError("Image extraction failed", {
        error: error.message,
        excelFilePath,
        outputDir,
      });
      return {};
    }
  }

  /**
   * Determine plate number from image information
   * @param {Object} imageInfo - ExcelJS image information
   * @param {number} imageCounter - Sequential counter
   * @returns {number} Plate number
   */
  determinePlateNumber(imageInfo, imageCounter) {
    // Try to extract plate number from image position or cell reference
    if (imageInfo.range) {
      // If image has cell range, try to extract row number
      const row = imageInfo.range.tl.row; // Top-left row
      // Assuming each plate starts around row 3, 18, 33, etc.
      // This is a rough estimate - may need adjustment based on actual Excel structure
      const plateNumber = Math.ceil((row - 2) / 15); // Rough calculation
      return Math.max(1, Math.min(38, plateNumber));
    }

    // Fallback: use sequential counter
    return Math.min(imageCounter, 38);
  }

  /**
   * Get proper image file extension
   * @param {string} extension - Raw extension from Excel
   * @returns {string} Clean extension
   */
  getImageExtension(extension) {
    const ext = (extension || "").toLowerCase().replace(".", "");

    switch (ext) {
      case "jpg":
      case "jpeg":
        return "jpg";
      case "png":
        return "png";
      case "gif":
        return "gif";
      case "bmp":
        return "bmp";
      default:
        return "png"; // Default fallback
    }
  }
}

module.exports = ImageExtractor;
