import { db } from '../db/index.js';
import { creditAllocations } from '../db/schema/index.js';
import { eq, and, inArray, sql, desc } from 'drizzle-orm';

export default async function seasonalCreditsPublicRoutes(fastify, options) {
  /**
   * GET /api/seasonal-credits/recent-allocations
   * Get recent seasonal credit allocations for the current tenant
   */
  fastify.get('/recent-allocations', async (request, reply) => {
    try {
      // This is a tenant route - get tenant from auth
      const { days = 7, limit = 10 } = request.query;

      // Get current tenant from auth (simplified - would use proper tenant context)
      const tenantId = request.user?.tenantId;
      if (!tenantId) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      // Get recent allocations for this tenant (defensive against missing seasonal columns)
      let recentAllocations = [];
      try {
        recentAllocations = await db
          .select({
            campaignId: sql`${creditAllocations.campaignId}`,
            campaignName: sql`${creditAllocations.campaignName}`,
            creditType: creditAllocations.creditType,
            allocatedCredits: sql`SUM(${creditAllocations.allocatedCredits})`,
            expiresAt: sql`MIN(${creditAllocations.expiresAt})`,
            allocatedAt: sql`MAX(${creditAllocations.allocatedAt})`,
            applications: sql`ARRAY_AGG(DISTINCT ${creditAllocations.targetApplication})`
          })
          .from(creditAllocations)
          .where(and(
            eq(creditAllocations.tenantId, tenantId),
            eq(creditAllocations.isActive, true),
            inArray(creditAllocations.creditType, ['seasonal', 'bonus', 'promotional', 'event', 'partnership', 'trial_extension']),
            sql`${creditAllocations.allocatedAt} >= NOW() - INTERVAL '${days} days'`,
            sql`${creditAllocations.campaignId} IS NOT NULL`
          ))
          .groupBy(
            sql`${creditAllocations.campaignId}`,
            sql`${creditAllocations.campaignName}`,
            creditAllocations.creditType
          )
          .orderBy(desc(sql`MAX(${creditAllocations.allocatedAt})`))
          .limit(parseInt(limit));
      } catch (dbError) {
        console.warn('Seasonal credit columns not available for recent allocations:', dbError.message);
        recentAllocations = [];
      }

      // Format the response
      const formattedAllocations = recentAllocations.map(allocation => ({
        campaignId: allocation.campaignId,
        campaignName: allocation.campaignName,
        creditType: allocation.creditType,
        allocatedCredits: parseFloat(allocation.allocatedCredits),
        expiresAt: allocation.expiresAt,
        allocatedAt: allocation.allocatedAt,
        applications: allocation.applications || []
      }));

      reply.send({
        success: true,
        data: formattedAllocations
      });

    } catch (error) {
      console.error('Error getting recent credit allocations:', error);
      reply.code(500).send({
        success: false,
        error: 'Failed to retrieve recent credit allocations'
      });
    }
  });
}
