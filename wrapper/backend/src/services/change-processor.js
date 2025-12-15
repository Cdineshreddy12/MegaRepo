import { dbManager } from '../db/connection-manager.js';
import { crmSpecificSync } from './crm-specific-sync.js';
import sql from '../utils/sql-template.js';

class ChangeProcessor {
  constructor() {
    this.appDb = dbManager.getAppDb();
    this.systemDb = dbManager.getSystemDb();
    this.isProcessing = false;
  }

  async processChanges() {
    if (this.isProcessing) {
      console.log('⚠️ Change processing already in progress');
      return;
    }

    this.isProcessing = true;

    try {
      // Get unprocessed changes in batches
      const changes = await this.getUnprocessedChanges();

      if (changes.length === 0) {
        console.log('✅ No changes to process');
        return;
      }

      console.log(`📋 Processing ${changes.length} changes...`);

      // Group changes by entity type
      const groupedChanges = this.groupChangesByTable(changes);

      // Process each type with both reliable sync and application-specific sync
      await this.processCreditConfigChanges(groupedChanges.creditConfigurations);
      await this.processUserChanges(groupedChanges.users);
      await this.processRoleChanges(groupedChanges.roles);
      await this.processHierarchyChanges(groupedChanges.entities);

      // Mark as processed
      await this.markChangesAsProcessed(changes);

      console.log('✅ Change processing completed');

    } catch (error) {
      console.error('❌ Change processing failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async getUnprocessedChanges(limit = 100) {
    const result = await this.systemDb.execute(sql`
      SELECT * FROM change_log
      WHERE processed = false
      ORDER BY changed_at ASC
      LIMIT ${limit}
    `);

    return result.rows;
  }

  groupChangesByTable(changes) {
    return {
      creditConfigurations: changes.filter(c => c.table_name === 'credit_configurations'),
      users: changes.filter(c => c.table_name === 'tenant_users'),
      roles: changes.filter(c => c.table_name === 'custom_roles'),
      entities: changes.filter(c => c.table_name === 'entities')
    };
  }

  async processCreditConfigChanges(changes) {
    if (changes.length === 0) return;

    console.log(`💰 Processing ${changes.length} credit config changes`);

    for (const change of changes) {
      try {
        // 1. Reliable sync (webhooks/database)
        await this.notifyViaWebhook('credit-config-changed', change);

        // 2. Application-specific sync (Redis pub/sub)
        await crmSpecificSync.publishCreditConfigChange(change);

      } catch (error) {
        console.error(`❌ Failed to process credit config change ${change.record_id}:`, error);
      }
    }
  }

  async processRoleChanges(changes) {
    if (changes.length === 0) return;

    console.log(`🔐 Processing ${changes.length} role changes`);

    for (const change of changes) {
      try {
        await this.notifyViaWebhook('role-changed', change);
        await crmSpecificSync.publishRoleChange(change);

      } catch (error) {
        console.error(`❌ Failed to process role change ${change.record_id}:`, error);
      }
    }
  }

  async processUserChanges(changes) {
    if (changes.length === 0) return;

    console.log(`👤 Processing ${changes.length} user changes`);

    for (const change of changes) {
      try {
        await this.notifyViaWebhook('user-changed', change);
        await crmSpecificSync.publishUserChange(change);

      } catch (error) {
        console.error(`❌ Failed to process user change ${change.record_id}:`, error);
      }
    }
  }

  async processHierarchyChanges(changes) {
    if (changes.length === 0) return;

    console.log(`🏢 Processing ${changes.length} hierarchy changes`);

    for (const change of changes) {
      try {
        await this.notifyViaWebhook('hierarchy-changed', change);
        await crmSpecificSync.publishHierarchyChange(change);

      } catch (error) {
        console.error(`❌ Failed to process hierarchy change ${change.record_id}:`, error);
      }
    }
  }

  async notifyViaWebhook(eventType, change) {
    try {
      // This would notify registered webhooks
      // Implementation depends on your webhook system
      console.log(`📡 Webhook notification for ${eventType}: ${change.record_id}`);
    } catch (error) {
      console.error('❌ Webhook notification failed:', error);
    }
  }

  async markChangesAsProcessed(changes) {
    const changeIds = changes.map(c => c.id);

    await this.systemDb.execute(sql`
      UPDATE change_log
      SET processed = true
      WHERE id IN (${changeIds.join(',')})
    `);
  }

  async healthCheck() {
    try {
      const unprocessedCount = await this.systemDb.execute(sql`
        SELECT COUNT(*) as count FROM change_log WHERE processed = false
      `);

      return {
        status: 'healthy',
        unprocessedChanges: unprocessedCount.rows[0].count,
        isProcessing: this.isProcessing,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export const changeProcessor = new ChangeProcessor();
export default ChangeProcessor;
