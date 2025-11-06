// utils/StorageAdapter.js
/**
 * Storage adapter for ClampingPlateManager
 * Handles both local JSON files and MongoDB storage
 */

const fs = require('fs').promises;
const config = require('../config');
const { logInfo, logError, logWarn } = require('./Logger');

class StorageAdapter {
  constructor() {
    this.type = config.storage.type;
    this.mongoClient = null;
    this.database = null;
    this.connected = false;
  }

  /**
   * Initialize storage adapter
   */
  async initialize() {
    logInfo('Initializing StorageAdapter', { type: this.type });

    try {
      if (this.type === 'mongodb' || this.type === 'auto') {
        await this.initializeMongoDB();
      }

      if (!this.connected && this.type === 'auto') {
        logWarn('MongoDB not available, falling back to local storage');
        this.type = 'local';
      }

      logInfo('StorageAdapter initialized', { 
        type: this.type, 
        connected: this.connected 
      });

    } catch (error) {
      if (this.type === 'mongodb') {
        throw error;
      }
      
      logWarn('Failed to initialize MongoDB, using local storage', { error: error.message });
      this.type = 'local';
    }
  }

  /**
   * Initialize MongoDB connection
   */
  async initializeMongoDB() {
    try {
      const { MongoClient } = require('mongodb');
      
      this.mongoClient = new MongoClient(config.mongodb.uri, config.mongodb.options);
      await this.mongoClient.connect();
      
      this.database = this.mongoClient.db(config.mongodb.database);
      this.connected = true;

      logInfo('Connected to MongoDB', { database: config.mongodb.database });

    } catch (error) {
      logError('Failed to connect to MongoDB', { error: error.message });
      throw error;
    }
  }

  /**
   * Check if connected to storage
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Get plates from storage
   */
  async getPlates() {
    if (this.type === 'mongodb' && this.connected) {
      return await this.getPlatesFromMongoDB();
    }
    
    return await this.getPlatesFromFile();
  }

  /**
   * Save plates to storage
   */
  async savePlates(plates) {
    if (this.type === 'mongodb' && this.connected) {
      await this.savePlatesToMongoDB(plates);
    }
    
    // Always save to file as backup
    await this.savePlatesToFile(plates);
  }

  /**
   * Save report to storage
   */
  async saveReport(reportType, reportData) {
    if (this.type === 'mongodb' && this.connected) {
      await this.saveReportToMongoDB(reportType, reportData);
    }
  }

  /**
   * Get plates from MongoDB
   */
  async getPlatesFromMongoDB() {
    try {
      const collection = this.database.collection('plates');
      const plates = await collection.find({}).toArray();
      
      return plates.map(plate => {
        const { _id, ...plateData } = plate;
        return plateData;
      });

    } catch (error) {
      logError('Failed to get plates from MongoDB', { error: error.message });
      throw error;
    }
  }

  /**
   * Save plates to MongoDB
   */
  async savePlatesToMongoDB(plates) {
    try {
      const collection = this.database.collection('plates');
      
      // Clear existing and insert new
      await collection.deleteMany({});
      
      if (plates.length > 0) {
        await collection.insertMany(plates);
      }

      logInfo(`Saved ${plates.length} plates to MongoDB`);

    } catch (error) {
      logError('Failed to save plates to MongoDB', { error: error.message });
      throw error;
    }
  }

  /**
   * Save report to MongoDB
   */
  async saveReportToMongoDB(reportType, reportData) {
    try {
      const collection = this.database.collection('reports');
      
      const document = {
        type: reportType,
        data: reportData,
        timestamp: new Date()
      };

      await collection.insertOne(document);

      logInfo('Report saved to MongoDB', { reportType });

    } catch (error) {
      logError('Failed to save report to MongoDB', { error: error.message });
      throw error;
    }
  }

  /**
   * Get plates from file
   */
  async getPlatesFromFile() {
    try {
      const filePath = config.getPlatesDataPath();
      const data = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(data);
      
      return Array.isArray(parsed) ? parsed : parsed.plates || [];

    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Save plates to file
   */
  async savePlatesToFile(plates) {
    try {
      const filePath = config.getPlatesDataPath();
      await fs.writeFile(filePath, JSON.stringify(plates, null, 2));

    } catch (error) {
      logError('Failed to save plates to file', { error: error.message });
      throw error;
    }
  }

  /**
   * Close connections
   */
  async close() {
    if (this.mongoClient) {
      await this.mongoClient.close();
      this.connected = false;
      logInfo('MongoDB connection closed');
    }
  }
}

module.exports = StorageAdapter;