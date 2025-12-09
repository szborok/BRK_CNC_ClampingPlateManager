// src/PlateService.js
/**
 * Core service for managing clamping plates
 * Handles plate CRUD operations, status management, and history tracking
 */

const config = require('../config');
const { logInfo, logError, logWarn } = require('../utils/Logger');

class PlateService {
  constructor(dataManager) {
    this.dataManager = dataManager;
    this.plates = new Map();
    this.pendingOperations = [];
  }

  /**
   * Initialize the service
   */
  async initialize() {
    logInfo('Initializing PlateService');
    console.log('🔧 [PlateService] Initializing...');
    
    try {
      // Load existing plates data
      await this.loadPlates();
      
      logInfo(`Loaded ${this.plates.size} plates from storage`);
      console.log(`✅ [PlateService] Loaded ${this.plates.size} plates from storage`);
      
      if (this.plates.size === 0) {
        console.warn('⚠️  [PlateService] No plates loaded! Check if plates.json has data.');
      }
      
    } catch (error) {
      logError('Failed to initialize PlateService', { error: error.message });
      console.error('❌ [PlateService] Failed to initialize:', error.message);
      throw error;
    }
  }

  /**
   * Load plates from storage
   */
  async loadPlates() {
    try {
      console.log('🔍 [PlateService] Loading plates from DataManager...');
      const platesData = await this.dataManager.loadPlates();
      console.log(`🔍 [PlateService] DataManager returned:`, {
        hasData: !!platesData,
        isArray: Array.isArray(platesData),
        length: Array.isArray(platesData) ? platesData.length : 'N/A'
      });
      
      if (platesData && Array.isArray(platesData)) {
        this.plates.clear();
        platesData.forEach(plate => {
          this.plates.set(plate.id, this.validatePlate(plate));
        });
        console.log(`✅ [PlateService] Stored ${this.plates.size} plates in memory`);
      } else {
        console.warn('⚠️  [PlateService] No valid plates data from DataManager');
      }
      
    } catch (error) {
      logWarn('Could not load plates data, starting with empty set', { error: error.message });
      console.error('❌ [PlateService] Error loading plates:', error.message);
      this.plates.clear();
    }
  }

  /**
   * Get all plates
   */
  async getAllPlates() {
    return Array.from(this.plates.values());
  }

  /**
   * Get plate by ID
   */
  async getPlateById(plateId) {
    return this.plates.get(plateId) || null;
  }

  /**
   * Create new plate
   */
  async createPlate(plateData) {
    try {
      const plate = this.validatePlate({
        id: plateData.id || this.generatePlateId(),
        shelf: plateData.shelf,
        health: plateData.health || 'new',
        occupancy: plateData.occupancy || 'free',
        notes: plateData.notes || '',
        lastModifiedBy: plateData.modifiedBy || 'system',
        lastModifiedDate: new Date(),
        history: []
      });

      // Add creation history entry
      this.addHistoryEntry(plate, 'created', plateData.modifiedBy || 'system', 'Plate created');

      this.plates.set(plate.id, plate);
      await this.savePlates();

      logInfo('Plate created', { plateId: plate.id, shelf: plate.shelf });
      return plate;

    } catch (error) {
      logError('Failed to create plate', { error: error.message, plateData });
      throw error;
    }
  }

  /**
   * Update existing plate
   */
  async updatePlate(plateId, updateData) {
    try {
      const existingPlate = this.plates.get(plateId);
      if (!existingPlate) {
        throw new Error(`Plate ${plateId} not found`);
      }

      const updatedPlate = {
        ...existingPlate,
        ...updateData,
        id: plateId, // Ensure ID doesn't change
        lastModifiedBy: updateData.modifiedBy || 'system',
        lastModifiedDate: new Date()
      };

      // Validate the updated plate
      const validatedPlate = this.validatePlate(updatedPlate);

      // Add history entry for significant changes
      if (this.hasSignificantChanges(existingPlate, validatedPlate)) {
        this.addHistoryEntry(
          validatedPlate, 
          'updated', 
          updateData.modifiedBy || 'system',
          this.getChangeDescription(existingPlate, validatedPlate)
        );
      }

      this.plates.set(plateId, validatedPlate);
      await this.savePlates();

      logInfo('Plate updated', { plateId, changes: Object.keys(updateData) });
      return validatedPlate;

    } catch (error) {
      logError('Failed to update plate', { error: error.message, plateId, updateData });
      throw error;
    }
  }

  /**
   * Delete plate
   */
  async deletePlate(plateId, deletedBy = 'system') {
    try {
      const plate = this.plates.get(plateId);
      if (!plate) {
        throw new Error(`Plate ${plateId} not found`);
      }

      // Check if plate can be deleted (not in use)
      if (plate.occupancy === 'in-use') {
        throw new Error(`Cannot delete plate ${plateId} - currently in use`);
      }

      this.plates.delete(plateId);
      await this.savePlates();

      logInfo('Plate deleted', { plateId, deletedBy });
      return true;

    } catch (error) {
      logError('Failed to delete plate', { error: error.message, plateId });
      throw error;
    }
  }

  /**
   * Start work on plate
   */
  async startWork(plateId, workOrderName, startedBy = 'system') {
    try {
      const plate = this.plates.get(plateId);
      if (!plate) {
        throw new Error(`Plate ${plateId} not found`);
      }

      if (plate.occupancy === 'in-use') {
        throw new Error(`Plate ${plateId} is already in use`);
      }

      if (plate.health === 'locked') {
        throw new Error(`Plate ${plateId} is locked and cannot be used`);
      }

      // Validate work order format
      const workOrderPattern = config.plates?.workOrderPattern || /^[A-Z0-9-_]+$/i;
      if (!workOrderPattern.test(workOrderName)) {
        throw new Error(`Invalid work order format: ${workOrderName}`);
      }

      const updatedPlate = {
        ...plate,
        occupancy: 'in-use',
        lastWorkName: workOrderName,
        lastModifiedBy: startedBy,
        lastModifiedDate: new Date()
      };

      this.addHistoryEntry(updatedPlate, 'work_started', startedBy, `Work started: ${workOrderName}`);

      this.plates.set(plateId, updatedPlate);
      await this.savePlates();

      logInfo('Work started on plate', { plateId, workOrderName, startedBy });
      return updatedPlate;

    } catch (error) {
      logError('Failed to start work on plate', { error: error.message, plateId, workOrderName });
      throw error;
    }
  }

  /**
   * Finish work on plate
   */
  async finishWork(plateId, finishedBy = 'system', notes = '') {
    try {
      const plate = this.plates.get(plateId);
      if (!plate) {
        throw new Error(`Plate ${plateId} not found`);
      }

      if (plate.occupancy !== 'in-use') {
        throw new Error(`Plate ${plateId} is not currently in use`);
      }

      const updatedPlate = {
        ...plate,
        occupancy: 'free',
        health: 'used', // Mark as used after work completion
        lastModifiedBy: finishedBy,
        lastModifiedDate: new Date(),
        notes: notes || plate.notes
      };

      this.addHistoryEntry(
        updatedPlate, 
        'work_finished', 
        finishedBy, 
        `Work finished: ${plate.lastWorkName}${notes ? ` - ${notes}` : ''}`
      );

      this.plates.set(plateId, updatedPlate);
      await this.savePlates();

      logInfo('Work finished on plate', { plateId, finishedBy, workOrder: plate.lastWorkName });
      return updatedPlate;

    } catch (error) {
      logError('Failed to finish work on plate', { error: error.message, plateId });
      throw error;
    }
  }

  /**
   * Get operational statistics
   */
  async getOperationalStats() {
    const stats = {
      total: this.plates.size,
      byHealth: { new: 0, used: 0, locked: 0 },
      byOccupancy: { free: 0, 'in-use': 0 },
      activeWorkOrders: 0
    };

    this.plates.forEach(plate => {
      stats.byHealth[plate.health]++;
      stats.byOccupancy[plate.occupancy]++;
      if (plate.occupancy === 'in-use' && plate.lastWorkName) {
        stats.activeWorkOrders++;
      }
    });

    return stats;
  }

  /**
   * Process pending operations
   */
  async processPendingOperations() {
    if (this.pendingOperations.length === 0) {
      return;
    }

    logInfo(`Processing ${this.pendingOperations.length} pending operations`);

    for (const operation of this.pendingOperations) {
      try {
        await this.executeOperation(operation);
      } catch (error) {
        logError('Failed to execute pending operation', { error: error.message, operation });
      }
    }

    this.pendingOperations = [];
  }

  /**
   * Validate plate data
   */
  validatePlate(plate) {
    if (!plate.id) {
      throw new Error('Plate ID is required');
    }

    if (!plate.shelf) {
      throw new Error('Plate shelf location is required');
    }

    // Validate health state with safe fallback
    const validHealthStates = config.plates?.healthStates || ['new', 'used', 'locked', 'damaged'];
    if (!validHealthStates.includes(plate.health)) {
      throw new Error(`Invalid health state: ${plate.health}`);
    }

    // Validate occupancy state with safe fallback
    const validOccupancyStates = config.plates?.occupancyStates || ['free', 'in-use', 'reserved'];
    if (!validOccupancyStates.includes(plate.occupancy)) {
      throw new Error(`Invalid occupancy state: ${plate.occupancy}`);
    }

    // Ensure history array exists
    if (!Array.isArray(plate.history)) {
      plate.history = [];
    }

    // Limit history entries
    const maxHistoryEntries = config.plates?.maxHistoryEntries || 50;
    if (plate.history.length > maxHistoryEntries) {
      plate.history = plate.history.slice(-maxHistoryEntries);
    }

    return plate;
  }

  /**
   * Add history entry to plate
   */
  addHistoryEntry(plate, action, user, details) {
    const entry = {
      id: this.generateHistoryId(),
      action,
      user,
      date: new Date(),
      details
    };

    plate.history.push(entry);

    // Limit history size
    const maxHistoryEntries = config.plates?.maxHistoryEntries || 50;
    if (plate.history.length > maxHistoryEntries) {
      plate.history.shift(); // Remove oldest entry
    }
  }

  /**
   * Check if changes are significant enough to log
   */
  hasSignificantChanges(oldPlate, newPlate) {
    const significantFields = ['health', 'occupancy', 'shelf', 'lastWorkName'];
    return significantFields.some(field => oldPlate[field] !== newPlate[field]);
  }

  /**
   * Get description of changes
   */
  getChangeDescription(oldPlate, newPlate) {
    const changes = [];
    
    if (oldPlate.health !== newPlate.health) {
      changes.push(`health: ${oldPlate.health} → ${newPlate.health}`);
    }
    if (oldPlate.occupancy !== newPlate.occupancy) {
      changes.push(`occupancy: ${oldPlate.occupancy} → ${newPlate.occupancy}`);
    }
    if (oldPlate.shelf !== newPlate.shelf) {
      changes.push(`shelf: ${oldPlate.shelf} → ${newPlate.shelf}`);
    }

    return changes.join(', ');
  }

  /**
   * Save plates to storage
   */
  async savePlates() {
    const platesArray = Array.from(this.plates.values());
    await this.dataManager.savePlates(platesArray);
  }

  /**
   * Generate unique plate ID
   */
  generatePlateId() {
    return `plate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique history ID
   */
  generateHistoryId() {
    return `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Execute pending operation
   */
  async executeOperation(operation) {
    // Implementation for pending operations
    logInfo('Executing pending operation', { operation });
  }
}

module.exports = PlateService;