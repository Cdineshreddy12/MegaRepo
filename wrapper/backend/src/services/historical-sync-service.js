/**
 * Historical Sync Service
 * 
 * This service handles backfilling historical data when a tenant opts into an application
 * for the first time. Since Redis streams only send events going forward, we need to
 * sync historical data from the database to ensure the application has complete state.
 * 
 * Architecture:
 * - Redis Streams: Real-time events going forward (optimal for ongoing sync)
 * - Historical Backfill: One-time sync of past data when app is enabled (optimal for initial state)
 * 
 * This hybrid approach ensures:
 * 1. Real-time sync for ongoing operations (via Redis streams)
 * 2. Complete historical state when applications are enabled later
 */

import { db } from '../db/index.js';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { 
  // REMOVED: creditAllocations, creditAllocationTransactions - Tables removed
  entities,
  organizationMemberships
} from '../db/schema/index.js';
import { crmSyncStreams } from '../utils/redis.js';
import { EventTrackingService } from './event-tracking-service.js';

class HistoricalSyncService {
  /**
   * Sync historical data for a tenant when they enable an application
   * @param {string} tenantId - Tenant ID
   * @param {string} appCode - Application code (e.g., 'crm', 'hr', 'affiliate')
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync results
   */
  async syncHistoricalDataForApplication(tenantId, appCode, options = {}) {
    const {
      syncCredits = true,
      syncOrganizations = true,
      syncAssignments = true,
      dryRun = false,
      sinceDate = null // If provided, only sync data after this date
    } = options;

    console.log(`🔄 Starting historical sync for ${appCode} (tenant: ${tenantId}):`, {
      syncCredits,
      syncOrganizations,
      syncAssignments,
      dryRun,
      sinceDate
    });

    const results = {
      tenantId,
      appCode,
      dryRun,
      timestamp: new Date().toISOString(),
      credits: { synced: 0, failed: 0, details: [] },
      organizations: { synced: 0, failed: 0, details: [] },
      assignments: { synced: 0, failed: 0, details: [] },
      summary: {
        totalSynced: 0,
        totalFailed: 0,
        success: false
      }
    };

    try {
      // 1. Sync historical credit allocations
      if (syncCredits) {
        console.log(`💰 Syncing historical credit allocations for ${appCode}...`);
        const creditResults = await this.syncHistoricalCreditAllocations(
          tenantId, 
          appCode, 
          { dryRun, sinceDate }
        );
        results.credits = creditResults;
        results.summary.totalSynced += creditResults.synced;
        results.summary.totalFailed += creditResults.failed;
      }

      // 2. Sync historical organizations
      if (syncOrganizations) {
        console.log(`🏢 Syncing historical organizations for ${appCode}...`);
        const orgResults = await this.syncHistoricalOrganizations(
          tenantId, 
          appCode, 
          { dryRun, sinceDate }
        );
        results.organizations = orgResults;
        results.summary.totalSynced += orgResults.synced;
        results.summary.totalFailed += orgResults.failed;
      }

      // 3. Sync historical organization assignments
      if (syncAssignments) {
        console.log(`👥 Syncing historical organization assignments for ${appCode}...`);
        const assignmentResults = await this.syncHistoricalAssignments(
          tenantId, 
          appCode, 
          { dryRun, sinceDate }
        );
        results.assignments = assignmentResults;
        results.summary.totalSynced += assignmentResults.synced;
        results.summary.totalFailed += assignmentResults.failed;
      }

      results.summary.success = results.summary.totalFailed === 0;

      console.log(`✅ Historical sync completed for ${appCode}:`, {
        totalSynced: results.summary.totalSynced,
        totalFailed: results.summary.totalFailed,
        success: results.summary.success
      });

      return results;

    } catch (error) {
      console.error(`❌ Historical sync failed for ${appCode}:`, error);
      results.summary.success = false;
      results.error = error.message;
      throw error;
    }
  }

  /**
   * Sync historical credit allocations for an application
   */
  async syncHistoricalCreditAllocations(tenantId, appCode, options = {}) {
    const { dryRun = false, sinceDate = null } = options;

    try {
      // REMOVED: creditAllocations table queries
      // Applications now manage their own credit consumption
      // Return empty array - applications handle their own credit sync
      const allocations = [];

      console.log(`📊 Found ${allocations.length} historical credit allocations for ${appCode}`);

      const results = {
        synced: 0,
        failed: 0,
        details: []
      };

      for (const allocation of allocations) {
        try {
          if (dryRun) {
            console.log(`[DRY RUN] Would sync credit allocation:`, {
              allocationId: allocation.allocationId,
              amount: allocation.allocatedCredits,
              available: allocation.availableCredits
            });
            results.synced++;
            continue;
          }

          // Publish credit allocation event to Redis stream
          // This mimics what would have been published when the allocation was created
          const publishResult = await crmSyncStreams.publishCreditAllocation(
            tenantId,
            allocation.sourceEntityId,
            parseFloat(allocation.allocatedCredits),
            {
              allocationId: allocation.allocationId,
              reason: allocation.allocationPurpose || 'historical_sync',
              entityType: 'organization',
              targetApplication: appCode,
              allocatedBy: allocation.allocatedBy,
              availableCredits: parseFloat(allocation.availableCredits),
              isHistoricalSync: true, // Flag to indicate this is a backfill
              originalAllocatedAt: allocation.allocatedAt?.toISOString()
            }
          );

          // Track the published event
          if (publishResult) {
            await EventTrackingService.trackPublishedEvent({
              eventId: publishResult.eventId || publishResult.messageId,
              eventType: 'credit.allocated',
              tenantId,
              entityId: allocation.sourceEntityId,
              streamKey: 'credit-events',
              sourceApplication: 'wrapper',
              targetApplication: appCode,
              eventData: {
                allocationId: allocation.allocationId,
                amount: parseFloat(allocation.allocatedCredits),
                targetApplication: appCode,
                availableCredits: parseFloat(allocation.availableCredits),
                isHistoricalSync: true
              },
              publishedBy: 'system',
              metadata: {
                operation: 'historical_credit_allocation_sync',
                originalAllocatedAt: allocation.allocatedAt?.toISOString()
              }
            });
          }

          results.synced++;
          results.details.push({
            allocationId: allocation.allocationId,
            status: 'synced',
            amount: allocation.allocatedCredits
          });

        } catch (allocationError) {
          console.error(`❌ Failed to sync allocation ${allocation.allocationId}:`, allocationError);
          results.failed++;
          results.details.push({
            allocationId: allocation.allocationId,
            status: 'failed',
            error: allocationError.message
          });
        }
      }

      return results;

    } catch (error) {
      console.error(`❌ Error syncing historical credit allocations:`, error);
      throw error;
    }
  }

  /**
   * Sync historical organizations (entities) for an application
   */
  async syncHistoricalOrganizations(tenantId, appCode, options = {}) {
    const { dryRun = false, sinceDate = null } = options;

    try {
      // Get all entities (organizations) for this tenant
      const whereConditions = [
        eq(entities.tenantId, tenantId),
        eq(entities.entityType, 'organization') // Only sync organizations
      ];

      if (sinceDate) {
        whereConditions.push(gte(entities.createdAt, sinceDate));
      }

      const orgs = await db
        .select()
        .from(entities)
        .where(and(...whereConditions))
        .orderBy(desc(entities.createdAt));

      console.log(`📊 Found ${orgs.length} historical organizations for ${appCode}`);

      const results = {
        synced: 0,
        failed: 0,
        details: []
      };

      for (const org of orgs) {
        try {
          if (dryRun) {
            console.log(`[DRY RUN] Would sync organization:`, {
              entityId: org.entityId,
              entityCode: org.entityCode,
              entityName: org.entityName
            });
            results.synced++;
            continue;
          }

          // Publish organization creation event to Redis stream
          const publishResult = await crmSyncStreams.publishOrgEvent(
            tenantId,
            'org_created',
            {
              organizationId: org.entityId,
              orgCode: org.entityCode,
              orgName: org.entityName,
              // Include other relevant org fields
              description: org.description,
              industry: org.industry,
              website: org.website,
              createdAt: org.createdAt?.toISOString()
            },
            {
              isHistoricalSync: true,
              originalCreatedAt: org.createdAt?.toISOString()
            }
          );

          if (publishResult) {
            await EventTrackingService.trackPublishedEvent({
              eventId: publishResult.messageId,
              eventType: 'org.created',
              tenantId,
              entityId: org.entityId,
              streamKey: `crm:sync:organization:org_created`,
              sourceApplication: 'wrapper',
              targetApplication: appCode,
              eventData: {
                organizationId: org.entityId,
                orgCode: org.entityCode,
                orgName: org.entityName,
                isHistoricalSync: true
              },
              publishedBy: 'system',
              metadata: {
                operation: 'historical_organization_sync',
                originalCreatedAt: org.createdAt?.toISOString()
              }
            });
          }

          results.synced++;
          results.details.push({
            organizationId: org.entityId,
            orgCode: org.entityCode,
            status: 'synced'
          });

        } catch (orgError) {
          console.error(`❌ Failed to sync organization ${org.entityId}:`, orgError);
          results.failed++;
          results.details.push({
            organizationId: org.entityId,
            status: 'failed',
            error: orgError.message
          });
        }
      }

      return results;

    } catch (error) {
      console.error(`❌ Error syncing historical organizations:`, error);
      throw error;
    }
  }

  /**
   * Sync historical organization memberships (assignments) for an application
   */
  async syncHistoricalAssignments(tenantId, appCode, options = {}) {
    const { dryRun = false, sinceDate = null } = options;

    try {
      // Get all active organization memberships for this tenant
      const whereConditions = [
        eq(organizationMemberships.tenantId, tenantId),
        eq(organizationMemberships.isActive, true)
      ];

      if (sinceDate) {
        whereConditions.push(gte(organizationMemberships.createdAt, sinceDate));
      }

      const assignments = await db
        .select()
        .from(organizationMemberships)
        .where(and(...whereConditions))
        .orderBy(desc(organizationMemberships.createdAt));

      console.log(`📊 Found ${assignments.length} historical organization memberships for ${appCode}`);

      const results = {
        synced: 0,
        failed: 0,
        details: []
      };

      for (const assignment of assignments) {
        try {
          if (dryRun) {
            console.log(`[DRY RUN] Would sync membership:`, {
              membershipId: assignment.membershipId,
              userId: assignment.userId,
              entityId: assignment.entityId
            });
            results.synced++;
            continue;
          }

          // Publish organization membership event to Redis stream
          const publishResult = await crmSyncStreams.publishOrgEvent(
            tenantId,
            'org_assignment_created',
            {
              assignmentId: assignment.membershipId,
              userId: assignment.userId,
              organizationId: assignment.entityId,
              roleId: assignment.roleId,
              isPrimary: assignment.isPrimary,
              createdAt: assignment.createdAt?.toISOString()
            },
            {
              isHistoricalSync: true,
              originalCreatedAt: assignment.createdAt?.toISOString()
            }
          );

          if (publishResult) {
            await EventTrackingService.trackPublishedEvent({
              eventId: publishResult.messageId,
              eventType: 'org.assignment.created',
              tenantId,
              entityId: assignment.membershipId,
              streamKey: 'crm:organization-assignments',
              sourceApplication: 'wrapper',
              targetApplication: appCode,
              eventData: {
                assignmentId: assignment.membershipId,
                userId: assignment.userId,
                organizationId: assignment.entityId,
                isHistoricalSync: true
              },
              publishedBy: 'system',
              metadata: {
                operation: 'historical_assignment_sync',
                originalCreatedAt: assignment.createdAt?.toISOString()
              }
            });
          }

          results.synced++;
          results.details.push({
            membershipId: assignment.membershipId,
            status: 'synced'
          });

        } catch (assignmentError) {
          console.error(`❌ Failed to sync membership ${assignment.membershipId}:`, assignmentError);
          results.failed++;
          results.details.push({
            membershipId: assignment.membershipId,
            status: 'failed',
            error: assignmentError.message
          });
        }
      }

      return results;

    } catch (error) {
      console.error(`❌ Error syncing historical memberships:`, error);
      throw error;
    }
  }

  /**
   * Get sync status for a tenant and application
   */
  async getSyncStatus(tenantId, appCode) {
    try {
      // REMOVED: creditAllocations table query
      // Applications now manage their own credit consumption
      const allocationCount = [{ count: 0 }];

      // Get organization count
      const orgCount = await db
        .select({ count: sql`count(*)` })
        .from(entities)
        .where(and(
          eq(entities.tenantId, tenantId),
          eq(entities.entityType, 'organization')
        ));

      // Get membership count
      const membershipCount = await db
        .select({ count: sql`count(*)` })
        .from(organizationMemberships)
        .where(and(
          eq(organizationMemberships.tenantId, tenantId),
          eq(organizationMemberships.isActive, true)
        ));

      return {
        tenantId,
        appCode,
        activeAllocations: parseInt(allocationCount[0]?.count || '0'),
        totalOrganizations: parseInt(orgCount[0]?.count || '0'),
        totalMemberships: parseInt(membershipCount[0]?.count || '0'),
        needsSync: parseInt(allocationCount[0]?.count || '0') > 0 || 
                   parseInt(orgCount[0]?.count || '0') > 0 ||
                   parseInt(membershipCount[0]?.count || '0') > 0
      };

    } catch (error) {
      console.error(`❌ Error getting sync status:`, error);
      throw error;
    }
  }
}

export { HistoricalSyncService };
export default new HistoricalSyncService();

