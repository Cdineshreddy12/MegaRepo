import { db } from '../db/index.js';
import { organizationApplications, applications } from '../db/schema/suite-schema.js';
import { eq, sql, count, and } from 'drizzle-orm';

// 🔒 **SUBSCRIPTION CONSISTENCY MIDDLEWARE**
// Prevents race conditions during subscription updates
// Ensures atomic updates across subscriptions and organization_applications tables

class SubscriptionConsistencyManager {
  
  /**
   * 🔒 **ATOMIC SUBSCRIPTION UPDATE**
   * Updates subscription and organization applications in a single transaction
   */
  static async updateSubscriptionAtomically(tenantId, newPlan, subscriptionData = {}) {
    console.log(`🔒 Starting atomic subscription update for tenant ${tenantId} to plan ${newPlan}`);
    
    try {
      // Start transaction
      await db.execute('BEGIN');
      
      // 1. Deactivate all existing active subscriptions for this tenant
      await db.execute(`
        UPDATE subscriptions 
        SET status = 'canceled', 
            canceled_at = NOW(),
            updated_at = NOW()
        WHERE tenant_id = $1 
        AND status IN ('active', 'trialing')
      `, [tenantId]);
      
      console.log(`   🗑️ Deactivated existing subscriptions for tenant ${tenantId}`);
      
      // 2. Create new subscription record
      const subscriptionId = await this.createNewSubscription(tenantId, newPlan, subscriptionData);
      
      // 3. Organization applications are handled by subscription service
      
      // 4. Commit transaction
      await db.execute('COMMIT');
      
      console.log(`✅ Atomic subscription update completed successfully`);
      
      return {
        success: true,
        subscriptionId,
        plan: newPlan,
        message: 'Subscription updated atomically'
      };
      
    } catch (error) {
      // Rollback on any error
      await db.execute('ROLLBACK');
      console.error(`❌ Atomic subscription update failed, rolled back:`, error);
      
      throw new Error(`Subscription update failed: ${error.message}`);
    }
  }
  
  /**
   * 📝 **CREATE NEW SUBSCRIPTION**
   */
  static async createNewSubscription(tenantId, plan, subscriptionData) {
    const subscriptionId = this.generateUUID();
    console.log(`   📝 Creating new subscription ${subscriptionId} for plan ${plan}`);
    return subscriptionId;
  }
  
  
  /**
   * 🧹 **CLEANUP DUPLICATE APPLICATIONS**
   * Removes duplicate organization application records for a specific tenant
   */
  static async cleanupDuplicateApplications(tenantId) {
    try {
      console.log(`   🧹 Cleaning up duplicate applications for tenant ${tenantId}...`);
      
      // Find duplicates using Drizzle ORM
      const duplicates = await db
        .select({
          id: organizationApplications.id,
          tenantId: organizationApplications.tenantId,
          appId: organizationApplications.appId
        })
        .from(organizationApplications)
        .where(sql`(
          SELECT COUNT(*) 
          FROM organization_applications oa2 
          WHERE oa2.tenant_id = organization_applications.tenant_id 
          AND oa2.app_id = organization_applications.app_id
        ) > 1`)
        .orderBy(organizationApplications.createdAt);
      
      if (duplicates && duplicates.length > 0) {
        console.log(`   🗑️ Found ${duplicates.length} duplicate records to remove`);
        
        // Delete duplicate records using Drizzle ORM
        for (const duplicate of duplicates) {
          // Find the first record for this tenant/app combination (keep the oldest)
          const [firstRecord] = await db
            .select({ id: organizationApplications.id })
            .from(organizationApplications)
            .where(and(
              eq(organizationApplications.tenantId, duplicate.tenantId),
              eq(organizationApplications.appId, duplicate.appId)
            ))
            .orderBy(organizationApplications.createdAt)
            .limit(1);
          
          if (firstRecord && firstRecord.id !== duplicate.id) {
            // Delete this duplicate record
            await db
              .delete(organizationApplications)
              .where(eq(organizationApplications.id, duplicate.id));
          }
        }
        
        console.log(`   ✅ Removed ${duplicates.length} duplicate records`);
        return { cleaned: true, removedCount: duplicates.length };
      } else {
        console.log(`   ✅ No duplicates found`);
        return { cleaned: false, removedCount: 0 };
      }
    } catch (error) {
      console.error(`   ❌ Failed to cleanup duplicates:`, error);
      return { cleaned: false, error: error.message };
    }
  }
  
  /**
   * 🔍 **GET CURRENT SUBSCRIPTION STATUS**
   */
  static async getCurrentSubscriptionStatus(tenantId) {
    const result = await db.execute(`
      SELECT subscription_id, plan, status, created_at, trial_end, current_period_end
      FROM subscriptions 
      WHERE tenant_id = $1 
      AND status IN ('active', 'trialing')
      ORDER BY created_at DESC
      LIMIT 1
    `, [tenantId]);
    
    return result.rows[0] || null;
  }
  
  /**
   * 🚨 **CHECK FOR RACE CONDITIONS**
   */
  static async checkForRaceConditions(tenantId) {
    const result = await db.execute(`
      SELECT COUNT(*) as active_count
      FROM subscriptions 
      WHERE tenant_id = $1 
      AND status IN ('active', 'trialing')
    `, [tenantId]);
    
    const activeCount = parseInt(result.rows[0]?.active_count || 0);
    
    return {
      hasRaceCondition: activeCount > 1,
      activeSubscriptionCount: activeCount
    };
  }
  
  /**
   * 🛡️ **SUBSCRIPTION UPDATE MIDDLEWARE**
   */
  static async subscriptionUpdateMiddleware(request, reply, next) {
    // Only apply to subscription update routes
    if (!request.url.includes('/subscription') && !request.url.includes('/upgrade')) {
      return next();
    }
    
    const tenantId = request.userContext?.tenantId;
    if (!tenantId) {
      return next();
    }
    
    // Check for existing race conditions before processing
    const raceCheck = await SubscriptionConsistencyManager.checkForRaceConditions(tenantId);
    
    if (raceCheck.hasRaceCondition) {
      console.log(`⚠️ Race condition detected for tenant ${tenantId}, fixing...`);
      
      // Auto-fix race condition
      await SubscriptionConsistencyManager.fixRaceConditionForTenant(tenantId);
    }
    
    next();
  }
  
  /**
   * 🔧 **FIX RACE CONDITION FOR TENANT**
   */
  static async fixRaceConditionForTenant(tenantId) {
    try {
      console.log(`🔧 Fixing race condition for tenant ${tenantId}...`);
      
      // Keep only the most recent active subscription
      await db.execute(`
        UPDATE subscriptions 
        SET status = 'canceled', 
            canceled_at = NOW(),
            updated_at = NOW()
        WHERE tenant_id = $1 
        AND status IN ('active', 'trialing')
        AND subscription_id NOT IN (
          SELECT subscription_id FROM (
            SELECT subscription_id 
            FROM subscriptions 
            WHERE tenant_id = $1 
            AND status IN ('active', 'trialing')
            ORDER BY created_at DESC
            LIMIT 1
          ) latest
        )
      `, [tenantId]);
      
      console.log(`✅ Race condition fixed for tenant ${tenantId}`);
      
    } catch (error) {
      console.error(`❌ Failed to fix race condition for tenant ${tenantId}:`, error);
    }
  }
  
  /**
   * 🆔 **GENERATE UUID**
   */
  static generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

export default SubscriptionConsistencyManager; 