# ClampingPlateManager - Clamping Plate Inventory & Work Order System

## Overview

ClampingPlateManager is a Node.js-based system for managing CNC clamping plate inventory, work orders, and plate lifecycle tracking. Features both web service (REST API) and interactive CLI modes with Excel integration for inventory management.

## Core Purpose

- **Plate Inventory Management**: Track all clamping plates with health and occupancy status
- **Work Order Tracking**: Assign plates to projects and track usage history
- **Excel Integration**: Import/export plate data from Készülékek.xlsx
- **Web Service**: REST API for dashboard integration
- **Interactive CLI**: Terminal-based management interface

---

## Architecture

### Component Flow

```
WebService / InteractiveService
         ↓
   PlateService ← WorkOrderService
         ↓
   DataManager
         ↓
   JSON Files / Excel Files
```

### Key Components

- **main.js** - Entry point, mode selection (web/interactive)
- **WebService** (`src/WebService.js`) - REST API server for dashboard
- **InteractiveService** (`src/InteractiveService.js`) - CLI interface
- **PlateService** (`src/PlateService.js`) - Core plate management logic
- **WorkOrderService** (`src/WorkOrderService.js`) - Work order operations
- **DataManager** (`src/DataManager.js`) - JSON file persistence
- **ExcelProcessor** (`utils/ExcelProcessor.js`) - Excel import/export
- **InitializationService** (`src/InitializationService.js`) - Setup and validation

### Data Model

```javascript
Plate {
  id: "PLT001",
  shelf: "A-01",                  // Physical location
  health: "new|used|locked",      // Plate condition
  occupancy: "free|in-use",       // Availability status
  lastWorkName?: "W5270NS01001",  // Current/last work order
  lastModifiedBy?: "operator_name",
  lastModifiedDate: Date,
  history: PlateHistoryEntry[],   // Full audit trail
  imageUrl?: "/models/1_alap/image.jpg",
  modelUrl?: "/models/1_alap/model.step"
}

PlateHistoryEntry {
  action: "assigned|completed|status_changed|...",
  workName?: "W5270NS01001",
  performedBy: "operator_name",
  timestamp: Date,
  changes?: { field: "oldValue → newValue" },
  notes?: "Additional context"
}
```

---

## Centralized Test Data Setup

**Important**: ClampingPlateManager uses centralized test data from `CNC_TestData` repository.

### Directory Structure

```
Projects/
├── CNC_TestData/                    ← Centralized test data (auto-cloned)
│   ├── source_data/
│   │   └── clamping_plates/         ← Plate data (READ-ONLY)
│   │       ├── info/
│   │       │   └── Készülékek.xlsx  (Inventory Excel file)
│   │       └── models/              (3D models and images)
│   │           ├── 1_alap/
│   │           ├── 10/, 11/, 12/, ... 25/
│   │           └── [35+ folders]
│   └── working_data/
│       └── BRK CNC Management Dashboard/
│           └── clampingplatemanager/ ← Processing output
│               └── session_demo/
│                   ├── input_files/
│                   ├── processed_files/
│                   └── results/
│                       ├── plates.json
│                       └── work_orders.json
└── ClampingPlateManager/            ← This project
    ├── config.js                    ← Points to ../CNC_TestData
    ├── main.js
    └── scripts/
        └── setup-test-data.js       ← Auto-clones CNC_TestData
```

### Automatic Setup

**First time setup** (happens automatically on `npm install`):

```bash
npm install  # Runs postinstall → setup-test-data.js → clones CNC_TestData
```

**Manual setup** (if needed):

```bash
npm run setup-test-data  # Clones or updates CNC_TestData
```

**Running tests**:

```bash
npm test  # Runs pretest → setup-test-data.js → updates test data → runs tests
```

### Configuration

`config.js` points to centralized test data:

```javascript
permanentDataDir: path.join(__dirname, "..", "CNC_TestData", "working_data", "clampingplatemanager"),
testSourceDataDir: path.join(__dirname, "..", "CNC_TestData", "source_data", "clamping_plates"),
modelsDir: path.join(__dirname, "..", "CNC_TestData", "source_data", "clamping_plates", "models"),
```

**Test Mode vs Production Mode**:

- `app.testMode: true` → Uses `../CNC_TestData/` paths
- `app.testMode: false` → Uses production paths (configured in config.js)

---

## Operating Modes

### Web Service Mode (REST API)

```bash
npm start
# or
node main.js --mode web
```

**Default Port**: 3000 (configurable in `config.js`)

**Endpoints**:

- `GET /api/plates` - List all plates
- `GET /api/plates/:id` - Get plate details
- `POST /api/plates` - Create new plate
- `PUT /api/plates/:id` - Update plate
- `DELETE /api/plates/:id` - Delete plate
- `POST /api/plates/:id/assign` - Assign plate to work order
- `POST /api/plates/:id/complete` - Complete work order
- `GET /api/work-orders` - List all work orders
- `GET /api/models/:folder/:file` - Serve 3D models/images

### Interactive CLI Mode

```bash
npm run interactive
# or
node main.js --mode interactive
```

**CLI Menu**:

1. List all plates
2. View plate details
3. Assign plate to work order
4. Complete work order
5. Change plate status
6. Import from Excel
7. Export to Excel
8. Generate reports
9. Exit

---

## Plate Lifecycle

### Health States

- **new**: Unused plate, never assigned to any work
- **used**: Plate has been used for at least one work order
- **locked**: Plate is locked for maintenance/repair, cannot be assigned

### Occupancy States

- **free**: Plate is available for new work orders
- **in-use**: Plate is currently assigned to an active work order

### State Transitions

```
new → used         (when first work order is assigned)
used → locked      (when marked for maintenance)
locked → used      (when returned to service)
free ↔ in-use      (when assigned/completed work order)
```

---

## Excel Integration

### Készülékek.xlsx Structure

Official production Excel file with columns:

- **ID**: Plate identifier (e.g., "PLT001")
- **Polc**: Shelf location (e.g., "A-01")
- **Állapot**: Health status (új/használt/zárolt → new/used/locked)
- **Foglaltság**: Occupancy (szabad/használatban → free/in-use)
- **Utolsó munka**: Last work order name
- **Módosító**: Last modifier
- **Módosítás dátuma**: Last modified date

### Import from Excel

```bash
# Interactive mode
npm run interactive → Option 6 (Import from Excel)

# Programmatic
node src/convert_excel_to_json.js
```

### Export to Excel

```bash
# Interactive mode
npm run interactive → Option 7 (Export to Excel)

# Programmatic (future enhancement)
# Export functionality can be added to ExcelProcessor
```

---

## Read-Only Processing Pattern

ClampingPlateManager follows **read-only processing** on source data:

1. **Source Data**: Excel and models in `../CNC_TestData/source_data/` - READ ONLY
2. **Copy to Temp**: Files copied to `working_data/.../input_files/`
3. **Processing**: Plate operations happen in temp structure
4. **Results**: Written to `working_data/.../results/`

**Temp Structure**:

```
working_data/BRK CNC Management Dashboard/clampingplatemanager/
└── session_demo/          # Or session_xxxxx for timestamped runs
    ├── input_files/       # Copied Excel/model files
    ├── processed_files/   # Processed plate data
    └── results/           # Current inventory state
        ├── plates.json    # All plates with history
        └── work_orders.json  # Active/completed work orders
```

---

## Work Order Management

### Creating a Work Order

```javascript
// Assign plate to work order
POST /api/plates/PLT001/assign
{
  "workName": "W5270NS01001",
  "operator": "john_doe"
}
```

**Effects**:

- Plate `occupancy` changes to `in-use`
- Plate `lastWorkName` set to work order name
- History entry created with `assigned` action
- If plate was `new`, health changes to `used`

### Completing a Work Order

```javascript
// Complete work order
POST /api/plates/PLT001/complete
{
  "operator": "john_doe",
  "notes": "Work completed successfully"
}
```

**Effects**:

- Plate `occupancy` changes to `free`
- `lastWorkName` preserved for reference
- History entry created with `completed` action
- Plate available for new assignments

### Work Order Format

Work order names follow pattern: `W5270NS01001A`

- `W`: Work order prefix
- `5270`: Project code
- `NS01001`: Sub-project identifier
- `A`: Variant (optional)

---

## 3D Model Integration

### Model Storage

3D models and images stored in `source_data/clamping_plates/models/`:

```
models/
├── 1_alap/              # Base model
│   ├── image.jpg
│   └── model.step
├── 10/                  # Variant 10
│   ├── image.jpg
│   └── model.step
├── 11/, 12/, 13/, ...   # More variants
└── 25/                  # Variant 25
```

### Image Extraction

Extract images from 3D models (if needed):

```bash
node utils/ImageExtractor.js --model models/1_alap/model.step --output models/1_alap/image.jpg
```

### Web Service

Models/images served via web service:

```
GET /api/models/1_alap/image.jpg
GET /api/models/1_alap/model.step
```

---

## Configuration Reference

### Test/Production Paths

```javascript
app: {
  testMode: true,                  // Toggle test/production
  usePersistentTempFolder: true,   // Use organized temp structure
  tempBaseName: "BRK CNC Management Dashboard",
  userDefinedWorkingFolder: null   // Override temp location
}
```

### Web Service Settings

```javascript
web: {
  port: 3000,                      // Default web service port
  host: 'localhost',
  apiPrefix: '/api'
}
```

### Data Paths

```javascript
permanentDataDir: path.join(__dirname, "..", "CNC_TestData", "working_data", "clampingplatemanager"),
testSourceDataDir: path.join(__dirname, "..", "CNC_TestData", "source_data", "clamping_plates"),
modelsDir: path.join(__dirname, "..", "CNC_TestData", "source_data", "clamping_plates", "models"),
```

---

## Development Workflow

### Adding a New Plate Status

1. **Update data model**: Define new status constant
2. **Update PlateService**: Add status validation
3. **Update WorkOrderService**: Handle status transitions
4. **Update Excel mapping**: Map to Hungarian Excel values
5. **Test**: Create test cases for new status

### Adding a New API Endpoint

1. **Update WebService**: Add route handler

   ```javascript
   app.get("/api/new-endpoint", (req, res) => {
     // Implementation
   });
   ```

2. **Update PlateService**: Add business logic
3. **Test**: Use curl or Postman to test endpoint
4. **Document**: Update API documentation

### Testing Changes

```bash
# Start web service
npm start

# Test API endpoints (separate terminal)
curl http://localhost:3000/api/plates

# Or use interactive mode
npm run interactive
```

---

## Common Tasks

### List All Plates

```bash
# Web service (in separate terminal after npm start)
curl http://localhost:3000/api/plates

# Interactive mode
npm run interactive → Option 1
```

### Assign Plate to Work Order

```bash
# Web service
curl -X POST http://localhost:3000/api/plates/PLT001/assign \
  -H "Content-Type: application/json" \
  -d '{"workName":"W5270NS01001","operator":"john_doe"}'

# Interactive mode
npm run interactive → Option 3
```

### View Plate History

```bash
# Web service
curl http://localhost:3000/api/plates/PLT001

# Interactive mode
npm run interactive → Option 2 → Enter plate ID
```

### Import Latest Excel Data

```bash
# Interactive mode
npm run interactive → Option 6

# Programmatic
node src/convert_excel_to_json.js
```

### Update Test Data

```bash
npm run setup-test-data  # Pulls latest from CNC_TestData repo
```

---

## Troubleshooting

### Issue: "CNC_TestData not found"

**Solution**: Run `npm run setup-test-data`

### Issue: "Port 3000 already in use"

**Solution**:

1. Change port in `config.js`
2. Or kill process using port: `lsof -ti:3000 | xargs kill`

### Issue: "Excel file not found"

**Solution**:

1. Verify `CNC_TestData` is sibling folder
2. Check Excel file exists in `source_data/clamping_plates/info/Készülékek.xlsx`
3. Run `npm run setup-test-data`

### Issue: "Model files not loading"

**Solution**:

1. Check models exist in `source_data/clamping_plates/models/`
2. Verify web service is running
3. Check model paths in plates.json

### Issue: "Original files modified"

**Solution**:

1. Check file operations in PlateService
2. Verify read-only processing pattern
3. Report bug - should NEVER modify source data

---

## Dependencies

### Core

- **Node.js**: 18+ required
- **Express**: Web service framework (if using web mode)

### Utilities

- **xlsx**: Excel file processing (⚠️ Known vulnerabilities, acceptable for internal use)
- **ExcelProcessor**: Custom Excel handling utilities

### Development

- **Scripts**: Custom setup and utility scripts
- **Testing**: Built-in test runner

---

## File Organization

```
ClampingPlateManager/
├── main.js                      # Entry point, mode selection
├── config.js                    # All settings (test/prod paths)
├── package.json
├── README.md
├── PROJECT_OVERVIEW.md          # This file
├── TEST_DATA_SETUP.md           # Centralized test data docs
├── src/
│   ├── WebService.js            # REST API server
│   ├── InteractiveService.js    # CLI interface
│   ├── PlateService.js          # Core plate logic
│   ├── WorkOrderService.js      # Work order operations
│   ├── DataManager.js           # JSON file persistence
│   ├── InitializationService.js # Setup and validation
│   └── convert_excel_to_json.js # Excel import utility
├── utils/
│   ├── ExcelProcessor.js        # Excel file handling
│   ├── ImageExtractor.js        # Extract images from 3D models
│   ├── Logger.js                # Structured logging
│   └── FileUtils.js             # File operations
├── scripts/
│   └── setup-test-data.js       # Auto-clone CNC_TestData
├── logs/                        # Daily log files
└── data/
    ├── config.json              # Runtime configuration
    ├── plates.json              # Current plate inventory (test mode uses temp)
    ├── README.md
    └── templates/
        └── clamping_plates.template.json  # Plate data structure template
```

---

## Integration with Dashboard

ClampingPlateManager is designed to integrate with CNCManagementDashboard:

1. **REST API**: Dashboard consumes plate data via web service endpoints
2. **Real-time Updates**: Dashboard polls for plate status changes
3. **3D Model Viewer**: Dashboard displays models/images from model service
4. **Work Order Sync**: Work orders coordinated across all backend services
5. **Unified View**: All plate operations visible in dashboard interface

---

## Best Practices

### Plate Management

- ✅ Always update history on status changes
- ✅ Use descriptive work order names
- ✅ Include operator information in modifications
- ✅ Validate plate status before operations
- ❌ Don't skip history entries (breaks audit trail)

### Excel Integration

- ✅ Always backup Excel before import
- ✅ Validate Excel structure before processing
- ✅ Handle missing/invalid data gracefully
- ❌ Don't modify original Excel files

### Work Order Operations

- ✅ Check plate availability before assignment
- ✅ Validate work order name format
- ✅ Include completion notes when finishing work
- ❌ Don't assign locked plates

### Web Service

- ✅ Validate request parameters
- ✅ Return proper HTTP status codes
- ✅ Handle errors gracefully with meaningful messages
- ❌ Don't expose internal errors to API clients

---

## Future Enhancements

### Planned Features

- [ ] Advanced search and filtering
- [ ] Automated status reports
- [ ] Plate maintenance scheduling
- [ ] QR code generation for plates
- [ ] Mobile app integration
- [ ] Real-time dashboard sync (WebSockets)

### Technical Improvements

- [ ] TypeScript migration
- [ ] Comprehensive API documentation (Swagger)
- [ ] Unit and integration tests
- [ ] GraphQL API option
- [ ] Database migration (PostgreSQL)

---

## Related Documentation

- **Setup Guide**: `TEST_DATA_SETUP.md`
- **Data Templates**: `data/templates/clamping_plates.template.json`
- **AI Assistant Context**: `.github/copilot-instructions.md`
- **Ecosystem Context**: `../CNC_TestData/AI_AGENT_CONTEXT.md`

---

## Support

For issues or questions:

1. Check troubleshooting section above
2. Review `data/README.md` for data structure
3. Check recent logs in `logs/`
4. Refer to ecosystem context in `../CNC_TestData/AI_AGENT_CONTEXT.md`

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0  
**Maintainer**: szborok
