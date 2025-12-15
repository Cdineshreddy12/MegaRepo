import { changeProcessor } from './change-processor.js';
import { crmSpecificSync } from './crm-specific-sync.js';

class SyncRunner {
  constructor() {
    this.isRunning = false;
    this.syncIntervals = {
      critical: 2 * 60 * 1000,   // 2 minutes (users, roles)
      normal: 5 * 60 * 1000,     // 5 minutes (hierarchy)
      low: 15 * 60 * 1000        // 15 minutes (credit configs)
    };
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️ Sync runner already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting sync runner...');

    // Critical sync (frequent)
    setInterval(() => {
      this.runSync('critical');
    }, this.syncIntervals.critical);

    // Normal sync
    setInterval(() => {
      this.runSync('normal');
    }, this.syncIntervals.normal);

    // Low priority sync
    setInterval(() => {
      this.runSync('low');
    }, this.syncIntervals.low);
  }

  async runSync(priority = 'normal') {
    try {
      console.log(`🔄 Running ${priority} priority sync...`);

      const startTime = Date.now();
      await changeProcessor.processChanges();
      const duration = Date.now() - startTime;

      console.log(`✅ ${priority} sync completed in ${duration}ms`);

    } catch (error) {
      console.error(`❌ ${priority} sync failed:`, error);
    }
  }

  stop() {
    this.isRunning = false;
    console.log('🛑 Sync runner stopped');
  }

  async healthCheck() {
    return {
      isRunning: this.isRunning,
      intervals: this.syncIntervals,
      changeProcessorHealth: await changeProcessor.healthCheck(),
      crmSyncHealth: await crmSpecificSync.healthCheck()
    };
  }
}

export const syncRunner = new SyncRunner();
export default SyncRunner;
