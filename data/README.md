# ClampingPlateManager Data Structure

This folder contains the runtime data and configuration files for the Clamping Plate Manager.

## Files

### Configuration
- **`config.json`** - Application configuration and settings
- **`Készülékek.xlsx`** - Official Excel template/structure file used in production

### Runtime Data  
- **`plates.json`** - Current plate inventory and status data

### Templates
- **`templates/plates.template.json`** - JSON template showing the expected data structure for plates

## Data Flow

1. **Excel Import**: `Készülékek.xlsx` → Application processes → `plates.json`
2. **Runtime**: Application reads/writes `plates.json` for current state
3. **Templates**: Use `templates/plates.template.json` to understand the expected JSON structure

## Excel Structure

The `Készülékek.xlsx` file contains the official structure used in production. When creating new plate data, follow the column structure defined in this Excel file.

## JSON Structure

The `plates.json` file contains an array of plate objects with the following structure:

```json
{
  "id": "string",                    // Unique plate identifier
  "name": "string",                  // Optional plate name/description
  "shelf": "string",                 // Physical location (e.g., "A-01")
  "previewImage": "string",          // Path to preview image
  "xtFile": "string",                // Path to 3D model file (.x_t)
  "health": "new|used|locked",       // Plate condition
  "occupancy": "free|in-use",        // Current usage status
  "notes": "string",                 // Optional notes
  "lastWorkName": "string",          // Last work order (e.g., "W5270NS01001A")
  "lastModifiedBy": "string",        // Username of last modifier
  "lastModifiedDate": "ISO date",    // Last modification timestamp
  "history": [...]                   // Array of history entries
}
```