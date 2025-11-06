# ClampingPlateManager AI Assistant Instructions

## Project Overview

ClampingPlateManager is a React/TypeScript web application for managing CNC clamping plates with real-time inventory tracking, work order management, and comprehensive plate lifecycle tracking. Built with Vite, Radix UI components, and Tailwind CSS for modern manufacturing workflow management.

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