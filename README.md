# ClampingPlateManager 🔧

> **Enterprise CNC Clamping Plate Management System**  
> React/TypeScript web application for comprehensive plate inventory tracking, work order management, and manufacturing workflow optimization.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.x-blue)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-purple)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-cyan)](https://tailwindcss.com/)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

**Access:** http://localhost:5173
**Login:** Use any username/password (Demo mode)
**Admin Access:** Username: `admin` + any password

## 📋 Overview

ClampingPlateManager is a comprehensive React/TypeScript web application designed for CNC manufacturing environments. It provides real-time inventory tracking, work order management, and complete plate lifecycle monitoring with enterprise-grade user interfaces.

### 🎯 Key Features

- **Real-Time Inventory Tracking** - Monitor plate status, health, and occupancy
- **Work Order Management** - Track ongoing work with W5270NS01001A format integration
- **Role-Based Access Control** - Admin/user permissions with secure authentication
- **Comprehensive History Tracking** - Complete audit trail for all plate modifications
- **Modern UI/UX** - Radix UI components with Tailwind CSS styling
- **Accessibility Support** - Theme system, font scaling, high contrast mode
- **Mobile Responsive** - Optimized for desktop and mobile manufacturing environments

## 🏗️ Architecture

### Component Hierarchy

```
App.tsx (Main orchestrator)
├── LoginPage (Authentication)
├── Dashboard (Overview & summary)
├── PlatesTable (Main inventory interface)
├── Sidebar (Navigation & filtering)
└── Modal Components
    ├── PlateDetailModal (Full plate information)
    ├── FinishWorkModal (Complete work orders)
    ├── StopWorkModal (Pause/cancel work)
    └── AdminEditModal (Administrative modifications)
```

### State Management Pattern

Global state managed in `App.tsx` with prop drilling:
- **User State**: Authentication and role-based permissions
- **View Navigation**: AppView enum for sidebar filtering
- **Accessibility**: Theme, font size, high contrast settings
- **Persistence**: localStorage for user preferences

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

interface User {
  id: string;
  name: string;
  username: string;
  isAdmin: boolean;
  avatar?: string;
}
```

## 🗂️ Project Structure

```
ClampingPlateManager/
├── src/
│   ├── App.tsx              # Main application with routing & state
│   ├── main.tsx             # React 18 entry point
│   ├── components/
│   │   ├── Dashboard.tsx    # Overview with summary cards
│   │   ├── LoginPage.tsx    # Authentication interface
│   │   ├── PlatesTable.tsx  # Main inventory interface
│   │   ├── Sidebar.tsx      # Navigation & view filtering
│   │   ├── Settings.tsx     # User preferences
│   │   ├── *Modal.tsx       # Modal components for workflows
│   │   └── ui/              # Radix UI component library
│   └── styles/
│       └── globals.css      # Tailwind base & custom styles
├── data/
│   ├── plates.json          # Current inventory state
│   ├── config.json          # Application settings
│   ├── Készülékek.xlsx      # Official production structure
│   └── templates/           # JSON structure templates
├── index.html               # Vite HTML template
├── vite.config.ts           # Vite configuration
└── package.json             # Dependencies & scripts
```

## 💻 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run dev:plates   # Alternative dev command
npm run start:plates # Production-like start
npm run build        # Create production build
```

### View Navigation System

The application uses an `AppView` enum for navigation:

**Status-Based Views:**
- `free-plates` - Available plates
- `in-use-plates` - Plates currently in use
- `locked-plates` - Locked/restricted plates

**Health-Based Views:**
- `new-plates` - New condition plates
- `used-plates` - Used condition plates

**Workflow Views:**
- `ongoing-work` - Active work orders
- `history` - Historical data and audit trail

### Modal Workflows

**PlateDetailModal** - Complete plate information with history timeline
```typescript
// Shows comprehensive plate data, modification history, work tracking
// Available to all users for viewing
```

**FinishWorkModal** - Complete work orders with automatic status updates
```typescript
// Handles work completion, status transitions, history tracking
// Updates plate occupancy from 'in-use' to 'free'
```

**StopWorkModal** - Pause/cancel work with reason tracking
```typescript
// Manages work interruption, reason documentation
// Maintains audit trail for work stoppages
```

**AdminEditModal** - Administrative plate modifications (admin-only)
```typescript
// Full administrative control over plate properties
// Restricted to users with isAdmin: true
```

## 🎨 UI/UX System

### Technology Stack

- **UI Framework**: React 18 + TypeScript
- **Component Library**: Radix UI primitives with shadcn/ui styling
- **Styling**: Tailwind CSS with class-variance-authority
- **Icons**: Lucide React icon system
- **Forms**: React Hook Form for complex input handling
- **Notifications**: Sonner toast system

### Accessibility Features

**Theme System**: Auto/light/dark themes with system preference detection
```typescript
// Automatic theme switching based on system preference
// Manual override with localStorage persistence
```

**Font Scaling**: Small/normal/large font sizes
```typescript
// CSS custom properties for consistent scaling
// Accessibility compliance for various user needs
```

**High Contrast Mode**: Enhanced contrast for visual accessibility
```typescript
// CSS custom properties for improved visibility
// Toggle-based activation with localStorage persistence
```

## 📊 Data Integration

### Excel Integration

`data/Készülékek.xlsx` defines the official production structure:
- Column compatibility maintained for production systems
- Template-based JSON structure generation
- Import/export workflows for manufacturing data

### JSON Data Structure

```typescript
// Current inventory state in plates.json
{
  "plates": [
    {
      "id": "plate-001",
      "shelf": "A-01",
      "health": "new",
      "occupancy": "free",
      "lastModifiedDate": "2024-11-06T00:00:00.000Z",
      "history": []
    }
  ]
}
```

### Work Order Integration

Work names follow the pattern: `W5270NS01001A`
- Integrated with manufacturing workflow systems
- Automatic status tracking and history management
- Real-time occupancy updates based on work status

## 🔒 Security & Authentication

### Mock Authentication System

```typescript
// Demo mode authentication - replace with real auth in production
const handleLogin = (username: string, password: string) => {
  // Admin access: username === 'admin'
  // Regular user: any other username
  // Password: any value (demo mode)
};
```

### Role-Based Access Control

**Admin Users** (`isAdmin: true`):
- Full access to AdminEditModal
- Administrative plate modifications
- System configuration access

**Regular Users** (`isAdmin: false`):
- Read-only access to plate information
- Work order completion workflows
- Personal preference settings

## 🚀 Production Deployment

### Build Process

```bash
# Create optimized production build
npm run build

# Generated files in dist/ directory
# Static assets ready for web server deployment
```

### Environment Configuration

```typescript
// Update authentication system for production
// Configure real backend API endpoints
// Set up proper user management system
// Configure production data sources
```

## 🛠️ Development Guidelines

### Component Creation Pattern

```typescript
// Use TypeScript interfaces for type safety
// Functional components with React hooks
// Radix UI primitives for accessibility
// Tailwind CSS for consistent styling

interface ComponentProps {
  user: User;
  onAction: (data: ActionData) => void;
}

const Component: React.FC<ComponentProps> = ({ user, onAction }) => {
  // Component implementation
};
```

### State Management

```typescript
// Immutable updates with proper type safety
// localStorage persistence for user preferences
// Prop drilling for component communication
// Context for complex shared state (if needed)
```

### Form Handling

```typescript
// React Hook Form for complex inputs
// TypeScript validation schemas
// Proper error handling and user feedback
// Accessibility compliance for form elements
```

## 📈 Performance Considerations

- **React 18** - Concurrent features and improved rendering
- **Vite** - Fast development server and optimized builds
- **Code Splitting** - Automatic chunking for optimal loading
- **Lazy Loading** - Component-level lazy loading where appropriate

## 🤝 Contributing

1. Follow TypeScript best practices
2. Use Radix UI components for accessibility
3. Maintain Tailwind CSS consistency
4. Add proper TypeScript interfaces
5. Test modal workflows thoroughly
6. Ensure responsive design compliance

## 📄 License

Private/Internal use - CNC Manufacturing System

---

**Built with enterprise-grade React/TypeScript architecture for modern CNC manufacturing environments.**