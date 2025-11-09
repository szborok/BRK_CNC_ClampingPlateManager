#!/usr/bin/env node
/**
 * Setup script to clone CNC_TestData repository
 * This script ensures the centralized test data repository is available
 * before running tests or development.
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const REPO_URL = "https://github.com/szborok/CNC_TestData.git";
const TARGET_DIR = path.join(__dirname, "..", "..", "CNC_TestData");

function log(message, type = "info") {
  const colors = {
    info: "\x1b[36m", // Cyan
    success: "\x1b[32m", // Green
    warning: "\x1b[33m", // Yellow
    error: "\x1b[31m", // Red
    reset: "\x1b[0m",
  };

  console.log(`${colors[type]}${message}${colors.reset}`);
}

function checkGitInstalled() {
  try {
    execSync("git --version", { stdio: "ignore" });
    return true;
  } catch (error) {
    return false;
  }
}

function setupTestData() {
  log("═══════════════════════════════════════════════════", "info");
  log("  CNC Test Data Setup", "info");
  log("═══════════════════════════════════════════════════", "info");
  log("");

  // Check if git is installed
  if (!checkGitInstalled()) {
    log("✗ Git is not installed or not in PATH", "error");
    log("  Please install Git from https://git-scm.com/", "error");
    process.exit(1);
  }

  // Check if CNC_TestData already exists
  if (fs.existsSync(TARGET_DIR)) {
    log("✓ CNC_TestData repository already exists", "success");

    // Check if it's a git repository
    const gitDir = path.join(TARGET_DIR, ".git");
    if (fs.existsSync(gitDir)) {
      log("  Pulling latest changes...", "info");
      try {
        execSync("git pull", {
          cwd: TARGET_DIR,
          stdio: "inherit",
        });
        log("✓ Test data updated successfully", "success");
      } catch (error) {
        log("⚠ Could not pull latest changes", "warning");
        log("  Repository exists but may need manual update", "warning");
      }
    } else {
      log("⚠ Directory exists but is not a git repository", "warning");
      log("  Please manually remove and run this script again", "warning");
    }
  } else {
    // Clone the repository
    log("Cloning CNC_TestData repository...", "info");
    log(`  Source: ${REPO_URL}`, "info");
    log(`  Target: ${TARGET_DIR}`, "info");
    log("");

    try {
      execSync(`git clone "${REPO_URL}" "${TARGET_DIR}"`, {
        stdio: "inherit",
      });
      log("", "info");
      log("✓ CNC_TestData cloned successfully", "success");
    } catch (error) {
      log("", "error");
      log("✗ Failed to clone CNC_TestData repository", "error");
      log("  Error: " + error.message, "error");
      log("", "error");
      log("  Manual setup instructions:", "info");
      log(`  1. cd ${path.dirname(TARGET_DIR)}`, "info");
      log(`  2. git clone ${REPO_URL}`, "info");
      process.exit(1);
    }
  }

  log("");
  log("═══════════════════════════════════════════════════", "success");
  log("  Setup Complete!", "success");
  log("═══════════════════════════════════════════════════", "success");
  log("");
  log("Test data is ready at:", "info");
  log(`  ${TARGET_DIR}`, "info");
  log("");
  log("You can now run:", "info");
  log("  npm test          - Run tests", "info");
  log("  npm run dev       - Start development mode", "info");
  log("");
}

// Run the setup
setupTestData();
