import { db } from '../db/index.js';
import { webhookLogs } from '../db/schema/webhook-logs.js';
import { eq, sql, gte, lt } from 'drizzle-orm';

/**
 * 🏗️ ENTERPRISE WEBHOOK PROCESSOR
 * Handles webhook processing with proper error handling, retries, and monitoring
 */
export class WebhookProcessor {
  
  /**
   * Process webhook with enterprise-level reliability
   */
  static async processWithReliability(eventId, eventType, processor) {
    const startTime = Date.now();
    let attempt = 1;
    const maxAttempts = 3;
    
    while (attempt <= maxAttempts) {
      try {
        console.log(`🔄 Processing webhook ${eventId} (attempt ${attempt}/${maxAttempts})`);
        
        // Execute the processor function
        const result = await processor();
        
        // Log successful processing
        const duration = Date.now() - startTime;
        console.log(`✅ Webhook ${eventId} processed successfully in ${duration}ms`);
        
        return result;
        
      } catch (error) {
        console.error(`❌ Webhook ${eventId} failed on attempt ${attempt}:`, error.message);
        
        // If this was the last attempt, mark as failed and throw
        if (attempt === maxAttempts) {
          await this.markWebhookFailed(eventId, error.message);
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.log(`⏳ Retrying webhook ${eventId} in ${delay}ms...`);
        await this.sleep(delay);
        
        attempt++;
      }
    }
  }
  
  /**
   * Mark webhook as failed in the database
   */
  static async markWebhookFailed(eventId, errorMessage) {
    try {
      await db.update(webhookLogs)
        .set({ 
          status: 'failed',
          errorMessage: errorMessage.substring(0, 1000), // Limit error message length
          updatedAt: new Date()
        })
        .where(eq(webhookLogs.eventId, eventId));
    } catch (logError) {
      console.error('Failed to log webhook failure:', logError);
    }
  }
  
  /**
   * Sleep utility for retries
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get webhook processing statistics
   */
  static async getWebhookStats(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const stats = await db
      .select({
        status: webhookLogs.status,
        count: sql`count(*)::int`,
      })
      .from(webhookLogs)
      .where(gte(webhookLogs.createdAt, since))
      .groupBy(webhookLogs.status);
      
    return stats.reduce((acc, stat) => {
      acc[stat.status] = stat.count;
      return acc;
    }, { processing: 0, completed: 0, failed: 0 });
  }
  
  /**
   * Clean up old webhook logs (retention policy)
   */
  static async cleanupOldLogs(retentionDays = 30) {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    
    const result = await db
      .delete(webhookLogs)
      .where(lt(webhookLogs.createdAt, cutoffDate))
      .returning({ id: webhookLogs.id });
      
    console.log(`🧹 Cleaned up ${result.length} old webhook logs`);
    return result.length;
  }
}


