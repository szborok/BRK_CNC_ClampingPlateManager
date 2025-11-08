// src/InteractiveService.js
/**
 * Interactive service for ClampingPlateManager
 * Provides command-line interface for managing plates after initialization
 */

const readline = require("readline");
const config = require("../config");
const { logInfo, logError } = require("../utils/Logger");
const DataManager = require("./DataManager");
const PlateService = require("./PlateService");
const WorkOrderService = require("./WorkOrderService");

class InteractiveService {
  constructor() {
    this.dataManager = new DataManager();
    this.plateService = new PlateService(this.dataManager);
    this.workOrderService = new WorkOrderService(this.dataManager);
    this.rl = null;
    this.running = false;
  }

  /**
   * Start interactive mode
   */
  async start() {
    try {
      console.log("\n🎛️ ClampingPlateManager Interactive Mode");
      console.log("========================================");

      // Initialize services
      await this.dataManager.initialize();
      await this.plateService.initialize();
      await this.workOrderService.initialize();

      // Show current status
      await this.showStatus();

      // Setup readline interface
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: "ClampingPlates> ",
      });

      this.running = true;

      // Show available commands
      this.showHelp();

      // Setup command handlers
      this.rl.on("line", async (input) => {
        await this.handleCommand(input.trim());
        if (this.running) {
          this.rl.prompt();
        }
      });

      this.rl.on("close", () => {
        console.log("\n👋 Goodbye!");
        process.exit(0);
      });

      // Start the prompt
      this.rl.prompt();
    } catch (error) {
      logError("Failed to start interactive mode", { error: error.message });
      console.error("❌ Failed to start interactive mode:", error.message);
      process.exit(1);
    }
  }

  /**
   * Show current system status
   */
  async showStatus() {
    try {
      const stats = await this.plateService.getOperationalStats();
      const permanentDir = config.getPermanentDataDir();

      console.log(`📁 Data Location: ${permanentDir}`);
      console.log(`📦 Total Plates: ${stats.total}`);
      console.log(
        `🆕 New: ${stats.byHealth.new} | 🔧 Used: ${stats.byHealth.used} | 🔒 Locked: ${stats.byHealth.locked}`
      );
      console.log(
        `🆓 Free: ${stats.byOccupancy.free} | 🔄 In-use: ${stats.byOccupancy["in-use"]}`
      );
      console.log(`⚡ Active Work Orders: ${stats.activeWorkOrders}`);
      console.log("");
    } catch (error) {
      console.log("⚠️ Could not load status");
    }
  }

  /**
   * Show available commands
   */
  showHelp() {
    console.log("Available commands:");
    console.log("  📋 list                    - List all plates");
    console.log("  🔍 show <plate-id>         - Show plate details");
    console.log("  🆕 create <shelf> [name]   - Create new plate");
    console.log("  ✏️  edit <plate-id>        - Edit plate details");
    console.log("  🗑️  delete <plate-id>     - Delete plate");
    console.log("  ▶️  start <plate-id> <work-order> - Start work on plate");
    console.log("  ⏹️  finish <plate-id>     - Finish work on plate");
    console.log("  📊 stats                   - Show operational statistics");
    console.log("  🔄 reload                  - Reload data from storage");
    console.log("  💾 backup                  - Create data backup");
    console.log("  🌐 serve                   - Start web service");
    console.log("  ❓ help                    - Show this help");
    console.log("  🚪 exit                    - Exit interactive mode");
    console.log("");
  }

  /**
   * Handle user commands
   */
  async handleCommand(input) {
    const parts = input.split(" ");
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    try {
      switch (command) {
        case "list":
        case "ls":
          await this.listPlates(args);
          break;

        case "show":
        case "get":
          await this.showPlate(args);
          break;

        case "create":
        case "new":
          await this.createPlate(args);
          break;

        case "edit":
        case "update":
          await this.editPlate(args);
          break;

        case "delete":
        case "del":
        case "rm":
          await this.deletePlate(args);
          break;

        case "start":
          await this.startWork(args);
          break;

        case "finish":
        case "complete":
          await this.finishWork(args);
          break;

        case "stats":
        case "status":
          await this.showStats();
          break;

        case "reload":
        case "refresh":
          await this.reloadData();
          break;

        case "backup":
          await this.createBackup();
          break;

        case "serve":
        case "web":
          await this.startWebService();
          break;

        case "help":
        case "?":
          this.showHelp();
          break;

        case "exit":
        case "quit":
        case "q":
          this.running = false;
          this.rl.close();
          break;

        case "":
          // Empty command, just show prompt again
          break;

        default:
          console.log(`❌ Unknown command: ${command}`);
          console.log("Type 'help' for available commands");
          break;
      }
    } catch (error) {
      console.error(`❌ Error executing command: ${error.message}`);
      logError("Command execution failed", { command, error: error.message });
    }
  }

  /**
   * List all plates
   */
  async listPlates(args) {
    const plates = await this.plateService.getAllPlates();

    if (plates.length === 0) {
      console.log("📭 No plates found");
      return;
    }

    console.log(`📋 Found ${plates.length} plates:`);
    console.log("");

    // Table header
    console.log(
      "ID".padEnd(20) +
        "Shelf".padEnd(10) +
        "Health".padEnd(10) +
        "Status".padEnd(12) +
        "Work Order"
    );
    console.log("-".repeat(70));

    // Show plates
    plates.forEach((plate) => {
      const id = plate.id.padEnd(20);
      const shelf = plate.shelf.padEnd(10);
      const health = this.getHealthEmoji(plate.health).padEnd(10);
      const status = this.getStatusEmoji(plate.occupancy).padEnd(12);
      const workOrder = plate.lastWorkName || "-";

      console.log(`${id}${shelf}${health}${status}${workOrder}`);
    });

    console.log("");
  }

  /**
   * Show detailed plate information
   */
  async showPlate(args) {
    if (args.length === 0) {
      console.log("❌ Usage: show <plate-id>");
      return;
    }

    const plateId = args[0];
    const plate = await this.plateService.getPlateById(plateId);

    if (!plate) {
      console.log(`❌ Plate not found: ${plateId}`);
      return;
    }

    console.log(`📦 Plate Details: ${plate.id}`);
    console.log("-".repeat(40));
    console.log(`Name: ${plate.name || "N/A"}`);
    console.log(`Shelf: ${plate.shelf}`);
    console.log(`Health: ${this.getHealthEmoji(plate.health)} ${plate.health}`);
    console.log(
      `Status: ${this.getStatusEmoji(plate.occupancy)} ${plate.occupancy}`
    );
    console.log(`Model File: ${plate.modelFile || "N/A"}`);
    console.log(`Last Work: ${plate.lastWorkName || "N/A"}`);
    console.log(`Modified By: ${plate.lastModifiedBy}`);
    console.log(
      `Modified Date: ${new Date(plate.lastModifiedDate).toLocaleString()}`
    );
    console.log(`Notes: ${plate.notes || "N/A"}`);

    if (plate.history && plate.history.length > 0) {
      console.log("\n📝 Recent History:");
      plate.history.slice(-3).forEach((entry) => {
        const date = new Date(entry.date).toLocaleString();
        console.log(
          `  ${date} - ${entry.action} by ${entry.user}: ${entry.details}`
        );
      });
    }

    console.log("");
  }

  /**
   * Create new plate
   */
  async createPlate(args) {
    if (args.length === 0) {
      console.log("❌ Usage: create <shelf> [name]");
      return;
    }

    const shelf = args[0];
    const name = args.slice(1).join(" ") || undefined;

    try {
      const plate = await this.plateService.createPlate({
        shelf: shelf,
        name: name,
        modifiedBy: "interactive",
      });

      console.log(`✅ Created plate: ${plate.id} at shelf ${plate.shelf}`);
    } catch (error) {
      console.log(`❌ Failed to create plate: ${error.message}`);
    }
  }

  /**
   * Start work on plate
   */
  async startWork(args) {
    if (args.length < 2) {
      console.log("❌ Usage: start <plate-id> <work-order>");
      return;
    }

    const plateId = args[0];
    const workOrder = args[1];

    try {
      const plate = await this.plateService.startWork(
        plateId,
        workOrder,
        "interactive"
      );
      console.log(`✅ Started work ${workOrder} on plate ${plateId}`);
    } catch (error) {
      console.log(`❌ Failed to start work: ${error.message}`);
    }
  }

  /**
   * Finish work on plate
   */
  async finishWork(args) {
    if (args.length === 0) {
      console.log("❌ Usage: finish <plate-id>");
      return;
    }

    const plateId = args[0];

    try {
      const plate = await this.plateService.finishWork(plateId, "interactive");
      console.log(`✅ Finished work on plate ${plateId}`);
    } catch (error) {
      console.log(`❌ Failed to finish work: ${error.message}`);
    }
  }

  /**
   * Show operational statistics
   */
  async showStats() {
    const stats = await this.plateService.getOperationalStats();
    const workStats = await this.workOrderService.getWorkOrderStats();

    console.log("📊 Operational Statistics");
    console.log("-".repeat(30));
    console.log(`Total Plates: ${stats.total}`);
    console.log(
      `By Health - New: ${stats.byHealth.new}, Used: ${stats.byHealth.used}, Locked: ${stats.byHealth.locked}`
    );
    console.log(
      `By Status - Free: ${stats.byOccupancy.free}, In-use: ${stats.byOccupancy["in-use"]}`
    );
    console.log(`Active Work Orders: ${stats.activeWorkOrders}`);
    console.log("");
  }

  /**
   * Reload data from storage
   */
  async reloadData() {
    try {
      await this.plateService.initialize();
      console.log("✅ Data reloaded from storage");
    } catch (error) {
      console.log(`❌ Failed to reload data: ${error.message}`);
    }
  }

  /**
   * Create backup
   */
  async createBackup() {
    try {
      const backupFile = await this.dataManager.createBackup();
      console.log(`✅ Backup created: ${backupFile}`);
    } catch (error) {
      console.log(`❌ Failed to create backup: ${error.message}`);
    }
  }

  /**
   * Start web service
   */
  async startWebService() {
    console.log("🌐 Starting web service in background...");
    console.log(
      "💡 You can continue using interactive mode while web service runs"
    );
    console.log(
      `🔗 API will be available at: http://localhost:${config.webService.port}`
    );

    try {
      const { spawn } = require("child_process");
      const webProcess = spawn("node", ["main.js", "--serve"], {
        detached: true,
        stdio: "ignore",
      });
      webProcess.unref();

      console.log("✅ Web service started in background");
    } catch (error) {
      console.log(`❌ Failed to start web service: ${error.message}`);
    }
  }

  /**
   * Get emoji for health state
   */
  getHealthEmoji(health) {
    switch (health) {
      case "new":
        return "🆕 new";
      case "used":
        return "🔧 used";
      case "locked":
        return "🔒 locked";
      default:
        return "❓ unknown";
    }
  }

  /**
   * Get emoji for occupancy status
   */
  getStatusEmoji(occupancy) {
    switch (occupancy) {
      case "free":
        return "🆓 free";
      case "in-use":
        return "🔄 in-use";
      default:
        return "❓ unknown";
    }
  }
}

module.exports = InteractiveService;
