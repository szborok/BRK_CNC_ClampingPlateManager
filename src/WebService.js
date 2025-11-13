// src/WebService.js
/**
 * Web service for ClampingPlateManager API endpoints
 * Provides REST API for plate management operations
 */

const http = require('http');
const url = require('url');
const config = require('../config');
const { logInfo, logError, logWarn } = require('../utils/Logger');
const DataManager = require('./DataManager');
const PlateService = require('./PlateService');
const WorkOrderService = require('./WorkOrderService');

class WebService {
  constructor() {
    this.dataManager = new DataManager();
    this.plateService = new PlateService(this.dataManager);
    this.workOrderService = new WorkOrderService(this.dataManager);
    this.server = null;
  }

  /**
   * Start the web service
   */
  async start() {
    try {
      // Initialize services
      await this.dataManager.initialize();
      await this.plateService.initialize();
      await this.workOrderService.initialize();

      // Create HTTP server
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      // Start listening
      this.server.listen(config.webService.port, () => {
        logInfo(`ClampingPlateManager API server listening on port ${config.webService.port}`);
        console.log(`🌐 API server running at http://localhost:${config.webService.port}`);
        console.log(`📚 API endpoints:`);
        console.log(`   GET  /api/plates          - Get all plates`);
        console.log(`   GET  /api/plates/:id      - Get specific plate`);
        console.log(`   POST /api/plates/:id      - Update plate`);
        console.log(`   GET  /api/work-orders     - Get work orders`);
        console.log(`   POST /api/work-orders     - Create work order`);
        console.log(`   GET  /api/stats           - Get operational stats`);
        console.log(`   GET  /api/health          - Health check`);
      });

    } catch (error) {
      logError('Failed to start web service', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle incoming HTTP requests
   */
  async handleRequest(req, res) {
    try {
      // Enable CORS
      this.setCorsHeaders(res);

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      const parsedUrl = url.parse(req.url, true);
      const path = parsedUrl.pathname;
      const method = req.method;

      logInfo(`${method} ${path}`, { 
        userAgent: req.headers['user-agent'],
        ip: req.connection.remoteAddress 
      });

      // Route requests
      if (path === '/api/health') {
        await this.handleHealth(req, res);
      } else if (path === '/api/config' && method === 'POST') {
        await this.handleConfig(req, res);
      } else if (path === '/api/plates') {
        await this.handlePlates(req, res);
      } else if (path.startsWith('/api/plates/')) {
        await this.handlePlateById(req, res);
      } else if (path === '/api/work-orders') {
        await this.handleWorkOrders(req, res);
      } else if (path === '/api/stats') {
        await this.handleStats(req, res);
      } else {
        this.sendError(res, 404, 'Not Found');
      }

    } catch (error) {
      logError('Request handling failed', { 
        error: error.message, 
        url: req.url, 
        method: req.method 
      });
      this.sendError(res, 500, 'Internal Server Error');
    }
  }

  /**
   * Handle health check endpoint
   */
  async handleHealth(req, res) {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      mode: config.app.testMode ? 'test' : 'production'
    };
    
    this.sendJson(res, health);
  }

  /**
   * Handle config endpoint - receive configuration from Dashboard
   */
  async handleConfig(req, res) {
    try {
      const body = await this.readRequestBody(req);
      const { testMode, platesPath, workingFolder } = body;

      if (typeof testMode !== 'boolean') {
        this.sendError(res, 400, 'testMode (boolean) is required');
        return;
      }

      // Update configuration
      config.app.testMode = testMode;
      config.app.autoMode = true; // Activate if needed

      if (workingFolder) {
        config.app.userDefinedWorkingFolder = workingFolder;
      }

      if (platesPath) {
        config.app.permanentStoragePath = platesPath;
      }

      logInfo('Configuration updated from Dashboard', {
        testMode,
        autoMode: config.app.autoMode,
        workingFolder,
        platesPath,
      });

      this.sendJson(res, {
        success: true,
        message: 'Configuration applied successfully',
        config: {
          testMode: config.app.testMode,
          autoMode: config.app.autoMode,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logError('Failed to apply configuration', { error: error.message });
      this.sendError(res, 500, 'Failed to apply configuration');
    }
  }

  /**
   * Handle plates endpoints
   */
  async handlePlates(req, res) {
    if (req.method === 'GET') {
      const plates = await this.plateService.getAllPlates();
      this.sendJson(res, plates);
    } else {
      this.sendError(res, 405, 'Method Not Allowed');
    }
  }

  /**
   * Handle individual plate endpoints
   */
  async handlePlateById(req, res) {
    const plateId = req.url.split('/')[3];
    
    if (req.method === 'GET') {
      const plate = await this.plateService.getPlateById(plateId);
      if (plate) {
        this.sendJson(res, plate);
      } else {
        this.sendError(res, 404, 'Plate not found');
      }
    } else if (req.method === 'POST') {
      const body = await this.readRequestBody(req);
      const updatedPlate = await this.plateService.updatePlate(plateId, body);
      this.sendJson(res, updatedPlate);
    } else {
      this.sendError(res, 405, 'Method Not Allowed');
    }
  }

  /**
   * Handle work orders endpoints
   */
  async handleWorkOrders(req, res) {
    if (req.method === 'GET') {
      const workOrders = await this.workOrderService.getAllWorkOrders();
      this.sendJson(res, workOrders);
    } else if (req.method === 'POST') {
      const body = await this.readRequestBody(req);
      const workOrder = await this.workOrderService.createWorkOrder(body);
      this.sendJson(res, workOrder);
    } else {
      this.sendError(res, 405, 'Method Not Allowed');
    }
  }

  /**
   * Handle stats endpoint
   */
  async handleStats(req, res) {
    const stats = {
      plates: await this.plateService.getOperationalStats(),
      workOrders: await this.workOrderService.getWorkOrderStats(),
      timestamp: new Date().toISOString()
    };
    
    this.sendJson(res, stats);
  }

  /**
   * Set CORS headers
   */
  setCorsHeaders(res) {
    if (config.webService.enableCors) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
  }

  /**
   * Send JSON response
   */
  sendJson(res, data) {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify(data, null, 2));
  }

  /**
   * Send error response
   */
  sendError(res, status, message) {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(status);
    res.end(JSON.stringify({ error: message, status }));
  }

  /**
   * Read request body
   */
  async readRequestBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (error) {
          reject(new Error('Invalid JSON'));
        }
      });
    });
  }

  /**
   * Stop the web service
   */
  stop() {
    if (this.server) {
      this.server.close();
      logInfo('Web service stopped');
    }
  }
}

module.exports = WebService;