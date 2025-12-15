import { db } from '../db/index.js';
import { eventTracking } from '../db/schema/index.js';
import { eq, and, sql } from 'drizzle-orm';
import { crmSyncStreams } from '../utils/redis.js';

/**
 * Inter-Application Event Service
 * Handles event communication between all business suite applications
 */
export class InterAppEventService {

  /**
   * Publish an event from any app to any other app
   */
  static async publishEvent({
    eventType,
    sourceApplication,
    targetApplication,
    tenantId,
    entityId,
    eventData = {},
    publishedBy = 'system'
  }) {
    try {
      // Publish to Redis stream
      const publishResult = await crmSyncStreams.publishInterAppEvent(
        eventType,
        sourceApplication,
        targetApplication,
        tenantId,
        entityId,
        eventData,
        publishedBy
      );

      if (publishResult) {
        // Track the event in our event tracking table
        await this.trackPublishedEvent({
          eventId: publishResult.eventId,
          eventType,
          tenantId,
          entityId,
          streamKey: 'inter-app-events',
          sourceApplication,
          targetApplication,
          eventData,
          publishedBy
        });

        console.log(`✅ Inter-app event published: ${sourceApplication} → ${targetApplication} (${eventType})`);
        return publishResult;
      }
    } catch (error) {
      console.error(`❌ Failed to publish inter-app event ${sourceApplication} → ${targetApplication}:`, error);
      throw error;
    }
  }

  /**
   * Track a published inter-app event
   */
  static async trackPublishedEvent({
    eventId,
    eventType,
    tenantId,
    entityId,
    streamKey,
    sourceApplication,
    targetApplication,
    eventData,
    publishedBy,
    metadata = {}
  }) {
    try {
      const trackingRecord = {
        eventId,
        eventType,
        tenantId,
        entityId,
        streamKey,
        sourceApplication,
        targetApplication,
        eventData,
        publishedBy,
        metadata: {
          ...metadata,
          interApp: true,
          direction: `${sourceApplication}_to_${targetApplication}`
        }
      };

      const [record] = await db
        .insert(eventTracking)
        .values(trackingRecord)
        .returning();

      console.log(`📝 Inter-app event tracked: ${sourceApplication} → ${targetApplication} (${eventType})`);
      return record;
    } catch (error) {
      console.error('❌ Failed to track inter-app event:', error);
      throw error;
    }
  }

  /**
   * Acknowledge processing of an inter-app event
   */
  static async acknowledgeInterAppEvent(eventId, acknowledgmentData = {}) {
    // Use EventTrackingService with deleteAfterAck=true for storage optimization
    const { EventTrackingService } = await import('./event-tracking-service.js');
    return await EventTrackingService.acknowledgeEvent(eventId, acknowledgmentData, true);
  }

  /**
   * Get inter-application communication matrix for a tenant
   */
  static async getCommunicationMatrix(tenantId) {
    try {
      const [matrix] = await db
        .select({
          totalEvents: sql`count(*)`,
          // All possible app-to-app combinations
          crmToHr: sql`count(case when source_application = 'crm' and target_application = 'hr' then 1 end)`,
          crmToAffiliate: sql`count(case when source_application = 'crm' and target_application = 'affiliate' then 1 end)`,
          crmToSystem: sql`count(case when source_application = 'crm' and target_application = 'system' then 1 end)`,
          hrToCrm: sql`count(case when source_application = 'hr' and target_application = 'crm' then 1 end)`,
          hrToAffiliate: sql`count(case when source_application = 'hr' and target_application = 'affiliate' then 1 end)`,
          hrToSystem: sql`count(case when source_application = 'hr' and target_application = 'system' then 1 end)`,
          affiliateToCrm: sql`count(case when source_application = 'affiliate' and target_application = 'crm' then 1 end)`,
          affiliateToHr: sql`count(case when source_application = 'affiliate' and target_application = 'hr' then 1 end)`,
          affiliateToSystem: sql`count(case when source_application = 'affiliate' and target_application = 'system' then 1 end)`,
          systemToCrm: sql`count(case when source_application = 'system' and target_application = 'crm' then 1 end)`,
          systemToHr: sql`count(case when source_application = 'system' and target_application = 'hr' then 1 end)`,
          systemToAffiliate: sql`count(case when source_application = 'system' and target_application = 'affiliate' then 1 end)`,

          // Acknowledgment counts
          acknowledged: sql`count(case when acknowledged = true then 1 end)`,
          crmToHrAck: sql`count(case when source_application = 'crm' and target_application = 'hr' and acknowledged = true then 1 end)`,
          crmToAffiliateAck: sql`count(case when source_application = 'crm' and target_application = 'affiliate' and acknowledged = true then 1 end)`,
          crmToSystemAck: sql`count(case when source_application = 'crm' and target_application = 'system' and acknowledged = true then 1 end)`,
          hrToCrmAck: sql`count(case when source_application = 'hr' and target_application = 'crm' and acknowledged = true then 1 end)`,
          hrToAffiliateAck: sql`count(case when source_application = 'hr' and target_application = 'affiliate' and acknowledged = true then 1 end)`,
          hrToSystemAck: sql`count(case when source_application = 'hr' and target_application = 'system' and acknowledged = true then 1 end)`,
          affiliateToCrmAck: sql`count(case when source_application = 'affiliate' and target_application = 'crm' and acknowledged = true then 1 end)`,
          affiliateToHrAck: sql`count(case when source_application = 'affiliate' and target_application = 'hr' and acknowledged = true then 1 end)`,
          affiliateToSystemAck: sql`count(case when source_application = 'affiliate' and target_application = 'system' and acknowledged = true then 1 end)`,
          systemToCrmAck: sql`count(case when source_application = 'system' and target_application = 'crm' and acknowledged = true then 1 end)`,
          systemToHrAck: sql`count(case when source_application = 'system' and target_application = 'hr' and acknowledged = true then 1 end)`,
          systemToAffiliateAck: sql`count(case when source_application = 'system' and target_application = 'affiliate' and acknowledged = true then 1 end)`
        })
        .from(eventTracking)
        .where(and(
          eq(eventTracking.tenantId, tenantId),
          sql`${eventTracking.streamKey} = 'inter-app-events'` // Only inter-app events
        ));

      // Transform into readable matrix
      const communicationMatrix = {
        tenantId,
        totalInterAppEvents: parseInt(matrix.totalEvents) || 0,
        communicationFlows: {
          'CRM → HR': {
            events: parseInt(matrix.crmToHr) || 0,
            acknowledged: parseInt(matrix.crmToHrAck) || 0,
            successRate: parseInt(matrix.crmToHr) > 0 ?
              ((parseInt(matrix.crmToHrAck) / parseInt(matrix.crmToHr)) * 100).toFixed(2) : '0.00'
          },
          'CRM → Affiliate': {
            events: parseInt(matrix.crmToAffiliate) || 0,
            acknowledged: parseInt(matrix.crmToAffiliateAck) || 0,
            successRate: parseInt(matrix.crmToAffiliate) > 0 ?
              ((parseInt(matrix.crmToAffiliateAck) / parseInt(matrix.crmToAffiliate)) * 100).toFixed(2) : '0.00'
          },
          'CRM → System': {
            events: parseInt(matrix.crmToSystem) || 0,
            acknowledged: parseInt(matrix.crmToSystemAck) || 0,
            successRate: parseInt(matrix.crmToSystem) > 0 ?
              ((parseInt(matrix.crmToSystemAck) / parseInt(matrix.crmToSystem)) * 100).toFixed(2) : '0.00'
          },
          'HR → CRM': {
            events: parseInt(matrix.hrToCrm) || 0,
            acknowledged: parseInt(matrix.hrToCrmAck) || 0,
            successRate: parseInt(matrix.hrToCrm) > 0 ?
              ((parseInt(matrix.hrToCrmAck) / parseInt(matrix.hrToCrm)) * 100).toFixed(2) : '0.00'
          },
          'HR → Affiliate': {
            events: parseInt(matrix.hrToAffiliate) || 0,
            acknowledged: parseInt(matrix.hrToAffiliateAck) || 0,
            successRate: parseInt(matrix.hrToAffiliate) > 0 ?
              ((parseInt(matrix.hrToAffiliateAck) / parseInt(matrix.hrToAffiliate)) * 100).toFixed(2) : '0.00'
          },
          'HR → System': {
            events: parseInt(matrix.hrToSystem) || 0,
            acknowledged: parseInt(matrix.hrToSystemAck) || 0,
            successRate: parseInt(matrix.hrToSystem) > 0 ?
              ((parseInt(matrix.hrToSystemAck) / parseInt(matrix.hrToSystem)) * 100).toFixed(2) : '0.00'
          },
          'Affiliate → CRM': {
            events: parseInt(matrix.affiliateToCrm) || 0,
            acknowledged: parseInt(matrix.affiliateToCrmAck) || 0,
            successRate: parseInt(matrix.affiliateToCrm) > 0 ?
              ((parseInt(matrix.affiliateToCrmAck) / parseInt(matrix.affiliateToCrm)) * 100).toFixed(2) : '0.00'
          },
          'Affiliate → HR': {
            events: parseInt(matrix.affiliateToHr) || 0,
            acknowledged: parseInt(matrix.affiliateToHrAck) || 0,
            successRate: parseInt(matrix.affiliateToHr) > 0 ?
              ((parseInt(matrix.affiliateToHrAck) / parseInt(matrix.affiliateToHr)) * 100).toFixed(2) : '0.00'
          },
          'Affiliate → System': {
            events: parseInt(matrix.affiliateToSystem) || 0,
            acknowledged: parseInt(matrix.affiliateToSystemAck) || 0,
            successRate: parseInt(matrix.affiliateToSystem) > 0 ?
              ((parseInt(matrix.affiliateToSystemAck) / parseInt(matrix.affiliateToSystem)) * 100).toFixed(2) : '0.00'
          },
          'System → CRM': {
            events: parseInt(matrix.systemToCrm) || 0,
            acknowledged: parseInt(matrix.systemToCrmAck) || 0,
            successRate: parseInt(matrix.systemToCrm) > 0 ?
              ((parseInt(matrix.systemToCrmAck) / parseInt(matrix.systemToCrm)) * 100).toFixed(2) : '0.00'
          },
          'System → HR': {
            events: parseInt(matrix.systemToHr) || 0,
            acknowledged: parseInt(matrix.systemToHrAck) || 0,
            successRate: parseInt(matrix.systemToHr) > 0 ?
              ((parseInt(matrix.systemToHrAck) / parseInt(matrix.systemToHr)) * 100).toFixed(2) : '0.00'
          },
          'System → Affiliate': {
            events: parseInt(matrix.systemToAffiliate) || 0,
            acknowledged: parseInt(matrix.systemToAffiliateAck) || 0,
            successRate: parseInt(matrix.systemToAffiliate) > 0 ?
              ((parseInt(matrix.systemToAffiliateAck) / parseInt(matrix.systemToAffiliate)) * 100).toFixed(2) : '0.00'
          }
        },
        overallSuccessRate: parseInt(matrix.totalEvents) > 0 ?
          ((parseInt(matrix.acknowledged) / parseInt(matrix.totalEvents)) * 100).toFixed(2) : '0.00'
      };

      return communicationMatrix;
    } catch (error) {
      console.error(`❌ Failed to get communication matrix for tenant ${tenantId}:`, error);
      throw error;
    }
  }
}
