// src/WorkOrderService.js
/**
 * Work order management service
 * Handles work order operations and plate status coordination
 */

const config = require('../config');
const { logInfo, logError, logWarn } = require('../utils/Logger');

class WorkOrderService {
  constructor(dataManager) {
    this.dataManager = dataManager;
    this.workOrders = new Map();
  }

  /**
   * Initialize the service
   */
  async initialize() {
    logInfo('Initializing WorkOrderService');
    
    try {
      // Load existing work orders if any
      await this.loadWorkOrders();
      
      logInfo(`Loaded ${this.workOrders.size} work orders from storage`);
      
    } catch (error) {
      logError('Failed to initialize WorkOrderService', { error: error.message });
      throw error;
    }
  }

  /**
   * Load work orders from storage
   */
  async loadWorkOrders() {
    try {
      // For now, we derive work orders from plate data
      // In future, this could be a separate collection
      const plates = await this.dataManager.loadPlates();
      
      this.workOrders.clear();
      
      plates.forEach(plate => {
        if (plate.occupancy === 'in-use' && plate.lastWorkName) {
          this.workOrders.set(plate.lastWorkName, {
            id: plate.lastWorkName,
            plateId: plate.id,
            status: 'active',
            startDate: this.findWorkStartDate(plate),
            lastModified: plate.lastModifiedDate
          });
        }
      });
      
    } catch (error) {
      logWarn('Could not load work orders, starting fresh', { error: error.message });
      this.workOrders.clear();
    }
  }

  /**
   * Get all work orders
   */
  async getAllWorkOrders() {
    return Array.from(this.workOrders.values());
  }

  /**
   * Create new work order
   */
  async createWorkOrder(workOrderData) {
    try {
      // Validate work order format
      const workOrderPattern = config.plates?.workOrderPattern || /^[A-Z0-9-_]+$/i;
      if (!workOrderPattern.test(workOrderData.id)) {
        throw new Error(`Invalid work order ID format: ${workOrderData.id}`);
      }

      const workOrder = {
        id: workOrderData.id,
        plateId: workOrderData.plateId,
        status: 'pending',
        createdDate: new Date(),
        startDate: null,
        endDate: null,
        createdBy: workOrderData.createdBy || 'system'
      };

      this.workOrders.set(workOrder.id, workOrder);

      logInfo('Work order created', { workOrderId: workOrder.id, plateId: workOrder.plateId });
      return workOrder;

    } catch (error) {
      logError('Failed to create work order', { error: error.message, workOrderData });
      throw error;
    }
  }

  /**
   * Start work order
   */
  async startWorkOrder(workOrderId, plateId) {
    try {
      const workOrder = this.workOrders.get(workOrderId);
      if (!workOrder) {
        throw new Error(`Work order ${workOrderId} not found`);
      }

      if (workOrder.status !== 'pending') {
        throw new Error(`Work order ${workOrderId} is not in pending status`);
      }

      workOrder.status = 'active';
      workOrder.startDate = new Date();
      workOrder.plateId = plateId;

      this.workOrders.set(workOrderId, workOrder);

      logInfo('Work order started', { workOrderId, plateId });
      return workOrder;

    } catch (error) {
      logError('Failed to start work order', { error: error.message, workOrderId, plateId });
      throw error;
    }
  }

  /**
   * Complete work order
   */
  async completeWorkOrder(workOrderId, completedBy = 'system') {
    try {
      const workOrder = this.workOrders.get(workOrderId);
      if (!workOrder) {
        throw new Error(`Work order ${workOrderId} not found`);
      }

      if (workOrder.status !== 'active') {
        throw new Error(`Work order ${workOrderId} is not active`);
      }

      workOrder.status = 'completed';
      workOrder.endDate = new Date();
      workOrder.completedBy = completedBy;

      this.workOrders.set(workOrderId, workOrder);

      logInfo('Work order completed', { workOrderId, completedBy });
      return workOrder;

    } catch (error) {
      logError('Failed to complete work order', { error: error.message, workOrderId });
      throw error;
    }
  }

  /**
   * Update plate statuses based on work orders
   */
  async updatePlateStatuses() {
    try {
      // This method would coordinate with PlateService
      // to ensure plate statuses match work order statuses
      logInfo('Updating plate statuses based on work orders');

      let updatedCount = 0;
      for (const workOrder of this.workOrders.values()) {
        if (workOrder.status === 'completed' && workOrder.plateId) {
          // Work order is complete, ensure plate is marked as free
          // This would call PlateService.finishWork() if needed
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        logInfo(`Updated ${updatedCount} plate statuses`);
      }

    } catch (error) {
      logError('Failed to update plate statuses', { error: error.message });
    }
  }

  /**
   * Get work order statistics
   */
  async getWorkOrderStats() {
    const stats = {
      total: this.workOrders.size,
      byStatus: { pending: 0, active: 0, completed: 0 },
      averageDuration: 0,
      activeWorkOrders: []
    };

    let totalDuration = 0;
    let completedCount = 0;

    this.workOrders.forEach(workOrder => {
      stats.byStatus[workOrder.status]++;

      if (workOrder.status === 'active') {
        stats.activeWorkOrders.push({
          id: workOrder.id,
          plateId: workOrder.plateId,
          startDate: workOrder.startDate
        });
      }

      if (workOrder.status === 'completed' && workOrder.startDate && workOrder.endDate) {
        const duration = workOrder.endDate - workOrder.startDate;
        totalDuration += duration;
        completedCount++;
      }
    });

    if (completedCount > 0) {
      stats.averageDuration = totalDuration / completedCount;
    }

    return stats;
  }

  /**
   * Find work start date from plate history
   */
  findWorkStartDate(plate) {
    if (!plate.history || plate.history.length === 0) {
      return null;
    }

    // Find the most recent work_started entry
    for (let i = plate.history.length - 1; i >= 0; i--) {
      const entry = plate.history[i];
      if (entry.action === 'work_started') {
        return new Date(entry.date);
      }
    }

    return null;
  }
}

module.exports = WorkOrderService;