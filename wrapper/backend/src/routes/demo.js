import { authenticateToken } from '../middleware/auth.js';

export default async function demoRoutes(fastify, options) {
  // Schedule a demo
  fastify.post('/schedule', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'email', 'company', 'jobTitle'],
        properties: {
          name: { type: 'string', minLength: 1 },
          email: { type: 'string', format: 'email' },
          company: { type: 'string', minLength: 1 },
          phone: { type: 'string' },
          jobTitle: { type: 'string', minLength: 1 },
          companySize: { type: 'string' },
          preferredTime: { type: 'string' },
          comments: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const {
        name,
        email,
        company,
        phone,
        jobTitle,
        companySize,
        preferredTime,
        comments
      } = request.body

      console.log('🎯 Demo Request Received:', {
        name,
        email,
        company,
        phone,
        jobTitle,
        companySize,
        preferredTime,
        comments,
        timestamp: new Date().toISOString(),
        ip: request.ip,
        userAgent: request.headers['user-agent']
      })

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500))

      // In production, you would:
      // 1. Save to database
      // 2. Send confirmation email to user
      // 3. Send notification email to sales team
      // 4. Integrate with CRM (HubSpot, Salesforce, etc.)
      // 5. Schedule calendar event

      reply.send({
        success: true,
        message: 'Demo scheduled successfully! Our team will contact you within 24 hours.',
        data: {
          scheduled: true,
          estimatedContact: '24 hours'
        }
      })

    } catch (error) {
      console.error('Demo scheduling error:', error)
      reply.code(500).send({
        success: false,
        message: 'Failed to schedule demo. Please try again.'
      })
    }
  })

  // Get demo statistics (admin only)
  fastify.get('/stats', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      // In production, you would query your database for demo stats
      // For now, return mock data
      reply.send({
        success: true,
        data: {
          totalDemos: 0,
          pendingDemos: 0,
          completedDemos: 0,
          conversionRate: 0
        }
      })
    } catch (error) {
      console.error('Demo stats error:', error)
      reply.code(500).send({
        success: false,
        message: 'Failed to fetch demo statistics'
      })
    }
  })
}
