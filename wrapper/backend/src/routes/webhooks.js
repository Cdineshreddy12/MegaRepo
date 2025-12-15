export default async function webhookRoutes(fastify, options) {
  // Stripe webhook (already handled in subscriptions, but keeping for reference)
  fastify.post('/stripe', async (request, reply) => {
    return reply.redirect(307, '/api/subscriptions/webhook');
  });

  // Generic webhook handler for external services
  fastify.post('/external/:service', async (request, reply) => {
    const { service } = request.params;
    const signature = request.headers['x-webhook-signature'];
    
    try {
      // Log webhook receipt
      fastify.log.info(`Received webhook from ${service}`, {
        headers: request.headers,
        body: request.body,
      });

      // Basic webhook verification would go here
      // For demo purposes, just acknowledge receipt
      
      return {
        success: true,
        service,
        received: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      fastify.log.error(`Error processing ${service} webhook:`, error);
      return reply.code(500).send({ error: 'Webhook processing failed' });
    }
  });

  // Health check webhook
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      service: 'webhook-handler',
      timestamp: new Date().toISOString(),
    };
  });
} 