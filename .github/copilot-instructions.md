# ClampingPlateManager AI Assistant Instructions

## Project Overview

ClampingPlateManager is a Node.js-based CNC clamping plate management system with real-time inventory tracking, work order management, and comprehensive plate lifecycle tracking. Features **web service mode** with organized temp file structure for data safety. Operates in **AUTO mode by default** with REST API service.

## Architecture & Core Components

### Component Hierarchy
- **WebService** (`src/WebService.js`) - Express REST API server and web interface
- **PlateService** (`src/PlateService.js`) - Core plate management logic
- **WorkOrderService** (`src/WorkOrderService.js`) - Work order tracking
- **DataManager** (`src/DataManager.js`) - Local JSON file persistence with permanent storage
- **InitializationService** (`src/InitializationService.js`) - Excel-to-JSON conversion
- **InteractiveService** (`src/InteractiveService.js`) - CLI interactive mode

### Data Flow Pattern
1. Excel file → 2. InitializationService converts → 3. DataManager stores → 4. PlateService manages → 5. WebService serves via API

### Data Models
```javascript
interface Plate {
  id: string;
  shelf: string;           // Physical location (e.g., "A-01")
  health: 'new' | 'used' | 'locked';
  occupancy: 'free' | 'in-use';
  lastWorkName?: string;   // Work order format: "W5270NS01001A"
  lastModifiedBy?: string;
  lastModifiedDate: Date;
  history: PlateHistoryEntry[];
}
```

## Critical Configuration

**PRODUCTION MODE (Default)**:
- `config.js` has `app.testMode: false` - Use production CNC data paths
- `app.autoMode: true` - Continuous operation
- `webService.port: 3003` - REST API port (fixed from 3002)
- `app.permanentStoragePath: path.join(__dirname, "data")` - Local data directory
- **Test mode only via**: `node main.js --test` flag

**Data Structure**: 
- `data/plates.json` - Current inventory state (permanent storage)
- `data/config.json` - App settings
- `data/Készülékek.xlsx` - Official production Excel structure

**API Server**:
- Port: 3003 (fixed from 3002 to avoid conflict)
- Endpoints: `/api/health`, `/api/plates`, `/api/plates/:id`, `/api/work-orders`, `/api/plates/:id/status`
- CORS enabled for localhost:5173 (Dashboard) and localhost:3000
- Uses DataManager reading from permanent storage (data/plates.json)

**Execution Modes**:
- Auto mode: `npm run serve` (web service on port 3003)
- Manual mode: `npm run manual` (CLI interactive mode)
- Initialize: `npm run init` (Excel to JSON conversion)

## REST API Integration (Nov 11, 2025)

**Express Server** (`src/WebService.js`):
```javascript
GET /api/health - Server health check (different from /api/status)
GET /api/plates - All clamping plates
GET /api/plates/:id - Specific plate details
POST /api/plates/:id/status - Update plate status
GET /api/work-orders - Work order tracking
```

**DataManager Permanent Storage**:
- Uses `permanentStoragePath` from config (data/plates.json)
- Reads/writes directly to permanent file
- No temp structure - all data in local data/ directory
- History tracking for all plate modifications

## Development Workflows

**Entry Point**: `main.js` - Handles mode selection (auto/manual/init)

**Web Service**: `npm run serve` - Starts web server on port 3003 (production ready)

**CLI Commands**:
- `npm run serve` - **Production mode**: Web service + REST API (port 3003)
- `npm run manual` - Interactive CLI for plate management
- `npm run init` - Convert Excel file to JSON format
- `node main.js --test` - Enable test mode temporarily

## Plate Operations

### Work Order Tracking
Work names follow pattern: "W5270NS01001A" - integrated with manufacturing workflow systems

### History Management
All plate modifications create PlateHistoryEntry objects with user attribution and timestamp tracking.

### Status Management
- Health: new → used → locked (lifecycle tracking)
- Occupancy: free ↔ in-use (availability tracking)

## Storage

All data stored in local JSON files in `data/` directory (permanent storage). No temp structure used - ClampingPlateManager manages its own permanent data files directly.

## Logging Conventions

Use structured logging with context:
```javascript
const { logInfo, logError } = require("../utils/Logger");
logInfo("Plate updated", {
  plateId: plate.id,
  operation: "status_change",
  newStatus: status,
});
```

## Key File Paths

- Entry point: `main.js` (mode selection and initialization)
- Web service: `src/WebService.js` (Express server on port 3003)
- Config: `config.js` (settings, paths, **testMode: false**, **autoMode: true**, **port: 3003**)
- Data: `data/plates.json` (permanent storage)
- Excel source: `data/Készülékek.xlsx` (production structure template)
- Templates: `data/templates/plates.template.json` (JSON structure reference)

## Common Debugging

1. **Port conflict**: ClampingPlateManager uses port 3003 (not 3002)
2. **Missing data**: Check data/plates.json exists and contains plate data
3. **Excel parsing**: Verify Készülékek.xlsx column structure matches expected format
4. **API not responding**: Check port 3003, verify `npm run serve` running
5. **Permanent storage errors**: Ensure permanentStoragePath is set in config
6. **Different health endpoint**: Uses `/api/health` instead of `/api/status`

## CRITICAL Rules for AI Agents

1. **NEVER create mock data** - All data from real Excel/JSON CNC files
2. **Production mode is default** - `testMode: false`, `autoMode: true` in config.js
3. **Test mode requires flag** - Use `--test` CLI argument, not config change
4. **Port 3003 reserved** - REST API server, different from other modules
5. **Permanent storage required** - Must set permanentStoragePath in config
6. **Health endpoint is /api/health** - Not /api/status like other modules
7. **AUTO mode for production** - Web service mode, not manual interactive

---

**Last Updated**: November 11, 2025
**Status**: Production Ready - REST API Integrated
**Architecture**: AUTO Mode + Express API (port 3003) + Permanent Storage

## Architecture & Core Components

### Component Hierarchy
- **App.tsx** - Main application orchestrator with routing, authentication, and global state
- **LoginPage** - User authentication with role-based access (admin/user)
- **Dashboard** - Overview with summary cards, recent activity, and quick actions
- **PlatesTable** - Main inventory interface with filtering, search, and bulk operations
- **Sidebar** - Navigation with view filtering (all plates, by status, by health)
- **Modal Components** - PlateDetailModal, FinishWorkModal, StopWorkModal, AdminEditModal

### State Management Pattern
Global state managed in App.tsx with prop drilling:
- `user`: Authentication and permissions
- `currentView`: AppView type for navigation ('dashboard' | 'all-plates' | 'new-plates' | etc.)
- `theme`, `fontSize`, `highContrast`: Accessibility settings persisted to localStorage

### Data Models
```typescript
interface Plate {
  id: string;
  shelf: string;           // Physical location (e.g., "A-01")
  health: 'new' | 'used' | 'locked';
  occupancy: 'free' | 'in-use';
  lastWorkName?: string;   // Work order format: "W5270NS01001A"
  lastModifiedBy?: string;
  lastModifiedDate: Date;
  history: PlateHistoryEntry[];
}
```

## Critical Configuration

**Data Structure**: `data/plates.json` contains current inventory state, `data/config.json` for app settings

**Excel Integration**: `data/Készülékek.xlsx` defines official production structure - maintain column compatibility

**Template System**: `data/templates/plates.template.json` shows expected JSON structure for new plates

## Development Workflows

**Development Server**: `npm run dev` (Vite dev server)
**Available Tasks**: VS Code tasks for "Start ClampingPlateManager Dev Server" and "Build ClampingPlateManager"

**Component Pattern**: Functional components with hooks, TypeScript interfaces, Radix UI primitives
**Styling**: Tailwind CSS with shadcn/ui component library
**Icons**: Lucide React icon system

## UI/UX Patterns

### View Navigation
AppView enum drives sidebar filtering:
- Status-based: 'free-plates', 'in-use-plates', 'locked-plates'  
- Health-based: 'new-plates', 'used-plates'
- Workflow: 'ongoing-work', 'history'

### Modal Workflows
- **PlateDetailModal**: Full plate information with history timeline
- **FinishWorkModal**: Complete work orders with automatic status updates
- **StopWorkModal**: Pause/cancel work with reason tracking
- **AdminEditModal**: Administrative plate modifications (admin-only)

### Accessibility Features
Built-in theme system (auto/light/dark), font scaling (small/normal/large), and high contrast mode with localStorage persistence.

## Data Flow Patterns

### Plate Operations
1. User selects plate → 2. Modal opens with current state → 3. User makes changes → 4. State updates → 5. History entry added → 6. localStorage/backend sync

### Work Order Tracking
Work names follow pattern: "W5270NS01001A" - integrated with manufacturing workflow systems

### History Management
All plate modifications create PlateHistoryEntry objects with user attribution and timestamp tracking.

## Key Dependencies

**UI Framework**: React 18 + TypeScript + Vite
**Component Library**: Radix UI primitives with shadcn/ui styling
**Styling**: Tailwind CSS with class-variance-authority for component variants
**Icons**: Lucide React
**Forms**: React Hook Form for complex form handling
**Notifications**: Sonner toast system

## File Organization

- **Entry point**: `src/main.tsx` (React 18 StrictMode setup)
- **App root**: `src/App.tsx` (routing and global state)
- **Components**: `src/components/` (feature components and UI primitives)
- **Data**: `data/` (JSON files, Excel templates, configuration)
- **Styles**: `src/styles/globals.css` (Tailwind base and custom styles)
- **Assets**: Component-specific images and 3D model references

## Common Development Patterns

1. **Component Creation**: Use TypeScript interfaces, functional components with hooks
2. **State Updates**: Immutable updates with proper type safety
3. **Modal Management**: Boolean state flags with cleanup on unmount
4. **Form Handling**: React Hook Form with validation for complex inputs
5. **Theme Integration**: CSS custom properties with Tailwind dark mode classes