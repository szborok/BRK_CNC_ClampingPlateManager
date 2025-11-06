# ClampingPlateManager 🔧

> **CNC Clamping Plate Management Backend Service**  
> Node.js API for comprehensive plate inventory tracking, work order management, and manufacturing workflow integration.

[![Node.js](https://img.shields.io/badge/Node.js-16.x+-green)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.x-green)](https://www.mongodb.com/)
[![API](https://img.shields.io/badge/API-REST-blue)](http://localhost:3002/api/health)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Setup and initialize
npm run setup

# Start web service (default)
npm start

# Or start in different modes
npm run serve         # Web service only
npm run auto          # Continuous background service
npm run manual        # One-time operations

# Test the service
npm test
```

**API Access:** http://localhost:3002  
**Health Check:** http://localhost:3002/api/health

## 📋 Overview

ClampingPlateManager is a **Node.js backend service** that provides comprehensive API endpoints for CNC clamping plate management. It handles inventory tracking, work order coordination, and maintains complete audit trails for manufacturing operations.

### 🎯 Key Features

- **RESTful API** - Complete HTTP API for plate management operations
- **Real-Time Inventory** - Track plate health, occupancy, and location status
- **Work Order Integration** - Coordinate with manufacturing workflows (W5270NS01001A format)
- **Comprehensive History** - Complete audit trail for all plate modifications
- **Dual Storage Support** - Local JSON files + MongoDB for scalability
- **Read-Only Safety** - Organized temp processing like JSONScanner/ToolManager
- **Auto/Manual Modes** - Continuous service or one-time operations

## 🏗️ Architecture

### Backend Service Stack
- **Node.js** - Runtime environment
- **HTTP Server** - Built-in Node.js HTTP server for API endpoints
- **MongoDB** - Optional database for scalable storage
- **JSON Files** - Local storage and backup system

### Component Hierarchy

```
main.js (Entry point)
├── config.js (Configuration management)
├── src/
│   ├── Executor.js (Main orchestrator)
│   ├── WebService.js (HTTP API server)
│   ├── PlateService.js (Core plate operations)
│   ├── WorkOrderService.js (Work order management)
│   └── DataManager.js (Storage abstraction)
└── utils/
    ├── Logger.js (Structured logging)
    ├── StorageAdapter.js (MongoDB/JSON storage)
    ├── SetupService.js (Initialization)
    └── CleanupService.js (Maintenance)
```

### Data Models

```javascript
// Plate Object
{
  id: "plate-001",
  shelf: "A-01",                    // Physical location
  health: "new|used|locked",        // Condition state
  occupancy: "free|in-use",         // Usage state
  lastWorkName: "W5270NS01001A",    // Work order reference
  lastModifiedBy: "user@system",
  lastModifiedDate: "2024-11-06T...",
  history: [                        // Complete audit trail
    {
      id: "hist-001",
      action: "work_started",
      user: "operator",
      date: "2024-11-06T...",
      details: "Work started: W5270NS01001A"
    }
  ]
}

// Work Order Object
{
  id: "W5270NS01001A",
  plateId: "plate-001",
  status: "pending|active|completed",
  startDate: "2024-11-06T...",
  endDate: null,
  createdBy: "system"
}
```

## 🌐 API Endpoints

### Core Endpoints

```http
GET  /api/health              # Health check and status
GET  /api/plates              # Get all plates
GET  /api/plates/:id          # Get specific plate
POST /api/plates/:id          # Update plate
GET  /api/work-orders         # Get all work orders
POST /api/work-orders         # Create work order
GET  /api/stats               # Operational statistics
```

### Example API Usage

**Health Check:**
```bash
curl http://localhost:3002/api/health
```

**Get All Plates:**
```bash
curl http://localhost:3002/api/plates
```

**Update Plate:**
```bash
curl -X POST http://localhost:3002/api/plates/plate-001 \
  -H "Content-Type: application/json" \
  -d '{"health": "used", "modifiedBy": "operator"}'
```

**Start Work on Plate:**
```bash
curl -X POST http://localhost:3002/api/plates/plate-001 \
  -H "Content-Type: application/json" \
  -d '{"occupancy": "in-use", "lastWorkName": "W5270NS01001A", "modifiedBy": "operator"}'
```

## ⚙️ Configuration

### Environment Modes

```javascript
// Test Mode (default)
testMode: true                    // Uses local data directories
platesData: "./data/plates.json" // Local JSON storage

// Production Mode
testMode: false                   // Uses production paths
platesData: "C:\\Production\\PlateData\\plates.json"
```

### Storage Options

```javascript
// Auto Mode (default)
storage.type: "auto"              // Try MongoDB, fallback to local

// MongoDB Mode
storage.type: "mongodb"           // MongoDB required
mongodb.uri: "mongodb://localhost:27017"
mongodb.database: "cnc_plates"

// Local Mode
storage.type: "local"             // JSON files only
```

### Web Service Settings

```javascript
webService: {
  port: 3002,                     // API server port
  enableCors: true,               // CORS for frontend integration
  allowedOrigins: [               // CNCManagementDashboard
    "http://localhost:3000",
    "http://localhost:5173"
  ]
}
```

## 💻 Development

### Available Commands

```bash
# Service Management
npm start                # Start web service (default)
npm run serve            # Web service only
npm run auto             # Continuous background service
npm run manual           # One-time operations

# Setup & Maintenance
npm run setup            # Initialize system and create sample data
npm run cleanup          # Clean temp files and old backups

# Testing & Development
npm test                 # Run quick functionality test
npm run test-readonly    # Test read-only operations
```

### Operation Modes

**Web Service Mode (Default):**
```bash
node main.js --serve     # HTTP API server only
# Ideal for: Frontend integration, API development
```

**Auto Mode:**
```bash
node main.js --auto      # Continuous background service
# Ideal for: Production monitoring, automated workflows
```

**Manual Mode:**
```bash
node main.js --manual    # One-time operations
# Ideal for: Batch updates, maintenance tasks
```

**Custom Working Folder:**
```bash
node main.js --working-folder "D:/CNC_Processing"
# Uses custom temp location instead of system temp
```

## 📊 Data Integration

### Work Order Format

Work orders follow manufacturing standard: `W5270NS01001A`
- Validated via regex pattern: `/^W\d{4}[A-Z]{2}\d{2}\d{3}[A-Z]?$/`
- Integrated with manufacturing workflow systems
- Automatic status tracking and history management

### Storage Strategy

**Dual Storage Approach:**
1. **Primary**: MongoDB (scalable, queryable)
2. **Backup**: Local JSON files (reliability, portability)

**Read-Only Processing:**
- Organized temp structure: `%TEMP%\BRK CNC Management Dashboard\ClampingPlateManager\`
- No modification of original data sources
- Safe concurrent operations

### History Tracking

Complete audit trail for all operations:
- Plate creation, updates, deletions
- Work start/stop/completion events
- Status changes with user attribution
- Automatic timestamp and change description

## � Security & Integration

### API Security

- **CORS enabled** for frontend integration
- **Input validation** for all API endpoints
- **Error handling** with proper HTTP status codes
- **Request logging** for audit and debugging

### Frontend Integration

Designed to work with **CNCManagementDashboard** frontend:
- RESTful API endpoints for React/TypeScript integration
- JSON response format for easy consumption
- Real-time status updates via polling
- Error responses with detailed information

## 🚀 Production Deployment

### System Requirements

- **Node.js 16.0+**
- **MongoDB 6.x** (optional, auto-fallback to local)
- **Windows/Linux/macOS** compatible
- **Minimum 512MB RAM** (depends on data volume)

### Deployment Steps

```bash
# 1. Clone and install
git clone <repository>
npm install

# 2. Configure for production
# Edit config.js: testMode: false
# Set production paths and MongoDB connection

# 3. Initialize system
npm run setup

# 4. Start service
npm start

# 5. Verify deployment
curl http://localhost:3002/api/health
```

### Service Integration

**With CNCManagementDashboard:**
- Frontend calls ClampingPlateManager API endpoints
- Real-time data synchronization
- Unified user interface for all CNC tools

**With Manufacturing Systems:**
- Work order integration via API endpoints
- Status updates from production floor
- Automated workflow triggers

## � Monitoring & Maintenance

### Health Monitoring

```bash
# Check service health
curl http://localhost:3002/api/health

# Get operational statistics
curl http://localhost:3002/api/stats

# View recent logs
node -e "require('./utils/Logger').getRecentLogs(50).then(console.log)"
```

### Maintenance Operations

```bash
# Cleanup temporary files
npm run cleanup

# Create data backup
node -e "require('./src/DataManager').createBackup().then(console.log)"

# Clear old logs (7+ days)
node -e "require('./utils/Logger').clearOldLogs(7)"
```

## 🔧 Troubleshooting

### Common Issues

**Port Already in Use:**
```bash
# Change port in config.js
webService.port: 3003
```

**MongoDB Connection Failed:**
```bash
# Service automatically falls back to local storage
# Check config.mongodb.uri setting
```

**Missing Data Directory:**
```bash
# Run setup to create directories
npm run setup
```

### Debug Information

```bash
# Test all components
npm test

# Check configuration
node -e "console.log(require('./config'))"

# Verify storage
node -e "require('./src/DataManager').getStorageStats().then(console.log)"
```

## 🤝 Contributing

1. Follow Node.js best practices
2. Maintain API compatibility
3. Add comprehensive error handling
4. Update documentation for new endpoints
5. Test both MongoDB and local storage modes

## 📄 License

Private/Internal use - CNC Manufacturing System

---

**Backend service for modern CNC manufacturing environments - now serving ClampingPlateManager data via REST API for CNCManagementDashboard frontend integration.**