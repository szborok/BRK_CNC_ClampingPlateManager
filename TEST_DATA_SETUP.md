# Test Data Setup

This project uses the centralized [CNC_TestData](https://github.com/szborok/CNC_TestData) repository for all test data.

## Automatic Setup

The test data repository is automatically cloned when you:

```bash
npm install    # Runs postinstall script
npm test       # Runs pretest script
```

## Manual Setup

If you need to manually set up or update the test data:

```bash
npm run setup-test-data
```

This script will:
- Clone the CNC_TestData repository as a sibling folder (if not exists)
- Pull the latest changes (if already exists)
- Verify the test data structure

## Directory Structure

After setup, your project structure should look like:

```
Projects/
├── JSONScanner/           # This repository
│   ├── config.js          # Points to ../CNC_TestData
│   ├── src/
│   └── ...
├── ToolManager/
├── ClampingPlateManager/
└── CNC_TestData/          # Centralized test data (auto-cloned)
    ├── source_data/       # Read-only source files
    │   ├── json_files/    # For JSONScanner
    │   ├── matrix_excel_files/  # For ToolManager
    │   └── clamping_plates/     # For ClampingPlateManager
    └── working_data/      # Generated test results
        ├── jsonscanner/
        ├── toolmanager/
        └── clampingplatemanager/
```

## Troubleshooting

### CNC_TestData not found

If you see errors about missing test data paths:

1. Ensure git is installed: `git --version`
2. Run the setup script: `npm run setup-test-data`
3. Verify the CNC_TestData folder exists as a sibling to this project

### Permission Issues

If the clone fails due to permissions:

```bash
# Clone manually
cd ..
git clone https://github.com/szborok/CNC_TestData.git
```

### Need to update test data

```bash
cd ../CNC_TestData
git pull
```

## Benefits

✅ **No Duplicate Data** - Single source of truth for test files  
✅ **Easy Updates** - Pull latest test data with git  
✅ **Consistent Testing** - All projects use same test cases  
✅ **Smaller Repos** - Backend repos don't store large test files  
✅ **Automatic Setup** - Zero-config setup on npm install
