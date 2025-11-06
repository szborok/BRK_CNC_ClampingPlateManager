#!/usr/bin/env node

/**
 * Quick test script for ClampingPlateManager backend
 * Tests basic functionality without affecting production data
 */

const config = require('./config');
const { logInfo, logError } = require('./utils/Logger');

async function runQuickTest() {
  console.log('🧪 ClampingPlateManager Backend Quick Test');
  console.log('=========================================\n');

  try {
    // Test 1: Configuration
    console.log('1. Testing configuration...');
    console.log(`   Test mode: ${config.app.testMode}`);
    console.log(`   Web service port: ${config.webService.port}`);
    console.log(`   Plates data path: ${config.getPlatesDataPath()}`);
    console.log('   ✅ Configuration test passed\n');

    // Test 2: Data Manager
    console.log('2. Testing DataManager...');
    const DataManager = require('./src/DataManager');
    const dataManager = new DataManager();
    await dataManager.initialize();
    
    // Try loading plates
    const plates = await dataManager.loadPlates();
    console.log(`   Loaded ${plates.length} plates from storage`);
    console.log('   ✅ DataManager test passed\n');

    // Test 3: Plate Service
    console.log('3. Testing PlateService...');
    const PlateService = require('./src/PlateService');
    const plateService = new PlateService(dataManager);
    await plateService.initialize();
    
    const allPlates = await plateService.getAllPlates();
    console.log(`   Retrieved ${allPlates.length} plates via service`);
    
    const stats = await plateService.getOperationalStats();
    console.log(`   Operational stats: ${JSON.stringify(stats)}`);
    console.log('   ✅ PlateService test passed\n');

    // Test 4: Work Order Service
    console.log('4. Testing WorkOrderService...');
    const WorkOrderService = require('./src/WorkOrderService');
    const workOrderService = new WorkOrderService(dataManager);
    await workOrderService.initialize();
    
    const workOrders = await workOrderService.getAllWorkOrders();
    console.log(`   Retrieved ${workOrders.length} work orders`);
    
    const workStats = await workOrderService.getWorkOrderStats();
    console.log(`   Work order stats: ${JSON.stringify(workStats)}`);
    console.log('   ✅ WorkOrderService test passed\n');

    // Test 5: Logger
    console.log('5. Testing Logger...');
    await logInfo('Test log entry from quick test');
    console.log('   ✅ Logger test passed\n');

    console.log('🎉 All tests passed successfully!');
    console.log('\nNext steps:');
    console.log('- Run "node main.js --setup" to initialize the system');
    console.log('- Run "node main.js --serve" to start the web service');
    console.log('- Visit http://localhost:3002/api/health to check API status');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await logError('Quick test failed', { error: error.message });
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runQuickTest().catch(error => {
    console.error('💥 Fatal test error:', error);
    process.exit(1);
  });
}

module.exports = { runQuickTest };