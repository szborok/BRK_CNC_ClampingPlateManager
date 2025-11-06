// src/Executor.js
/**
 * Main orchestrator for ClampingPlateManager backend operations
 * Handles auto/manual modes and coordinates plate management services
 */

const config = require("../config");
const { logInfo, logError, logWarn } = require("../utils/Logger");
const DataManager = require("./DataManager");
const PlateService = require("./PlateService");
const WorkOrderService = require("./WorkOrderService");

class Executor {
  constructor() {
    this.dataManager = new DataManager();
    this.plateService = new PlateService(this.dataManager);
    this.workOrderService = new WorkOrderService(this.dataManager);
    this.isRunning = false;
  }

  /**
   * Run in auto mode - continuous service
   */
  async runAutoMode() {
    logInfo("Starting ClampingPlateManager in auto mode");
    
    try {
      await this.initialize();
      
      this.isRunning = true;
      
      // Start the monitoring loop
      while (this.isRunning) {
        await this.processCycle();
        await this.sleep(config.app.scanIntervalMs);
      }
      
    } catch (error) {
      logError("Auto mode failed", { error: error.message });
      throw error;
    }
  }

  /**
   * Run in manual mode - one-time operations
   */
  async runManualMode() {
    logInfo("Starting ClampingPlateManager in manual mode");
    
    try {
      await this.initialize();
      await this.processCycle();
      
      logInfo("Manual mode completed successfully");
      
    } catch (error) {
      logError("Manual mode failed", { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize services and data
   */
  async initialize() {
    logInfo("Initializing ClampingPlateManager services");
    
    try {
      // Initialize data manager
      await this.dataManager.initialize();
      
      // Initialize services
      await this.plateService.initialize();
      await this.workOrderService.initialize();
      
      logInfo("All services initialized successfully");
      
    } catch (error) {
      logError("Failed to initialize services", { error: error.message });
      throw error;
    }
  }

  /**
   * Process one cycle of operations
   */
  async processCycle() {
    try {
      logInfo("Starting processing cycle");
      
      // Update plate status based on work orders
      await this.workOrderService.updatePlateStatuses();
      
      // Process any pending operations
      await this.plateService.processPendingOperations();
      
      // Generate reports if needed
      await this.generateReports();
      
      logInfo("Processing cycle completed");
      
    } catch (error) {
      logError("Processing cycle failed", { error: error.message });
      // Don't throw in auto mode, just log and continue
      if (!this.isRunning) {
        throw error;
      }
    }
  }

  /**
   * Generate operational reports
   */
  async generateReports() {
    if (!config.processing.generateReports) {
      return;
    }
    
    try {
      logInfo("Generating operational reports");
      
      const stats = await this.plateService.getOperationalStats();
      const workOrderStats = await this.workOrderService.getWorkOrderStats();
      
      // Save reports
      await this.dataManager.saveReport('operational_stats', {
        timestamp: new Date(),
        plateStats: stats,
        workOrderStats: workOrderStats
      });
      
    } catch (error) {
      logWarn("Failed to generate reports", { error: error.message });
    }
  }

  /**
   * Stop the executor
   */
  stop() {
    logInfo("Stopping ClampingPlateManager executor");
    this.isRunning = false;
  }

  /**
   * Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = Executor;