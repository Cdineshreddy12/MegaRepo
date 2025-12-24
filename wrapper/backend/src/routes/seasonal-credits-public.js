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

      // REMOVED: creditAllocations table queries
      // Applications now manage their own credit consumption
      // Return empty array - seasonal credits are managed by applications
      const recentAllocations = [];

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
