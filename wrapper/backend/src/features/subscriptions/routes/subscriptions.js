import { SubscriptionService } from '../services/subscription-service.js';
import { TenantService } from '../../../services/tenant-service.js';
import { authenticateToken, requirePermission } from '../../../middleware/auth.js';
import { trackUsage } from '../../../middleware/usage.js';
import { getPlanLimits } from '../../../middleware/planRestrictions.js';
import { db } from '../../../db/index.js';
import { tenants, payments, subscriptions } from '../../../db/schema/index.js';
import { eq, and, desc, inArray } from 'drizzle-orm';
import ErrorResponses from '../../../utils/error-responses.js';
import { PLAN_ACCESS_MATRIX } from '../../../data/permission-matrix.js';

export default async function subscriptionRoutes(fastify, options) {
  // Temporary debug endpoint to test authentication
  fastify.get('/debug-auth', async (request, reply) => {
    console.log('🧪 Debug Auth Endpoint Hit');
    console.log('🔍 User Context:', request.userContext);
    console.log('🔍 Is Authenticated:', request.userContext?.isAuthenticated);
    console.log('🔍 User Email:', request.userContext?.email);
    console.log('🔍 Tenant ID:', request.userContext?.tenantId);
    console.log('🔍 Kinde Org ID:', request.userContext?.kindeOrgId);
    console.log('🔍 Needs Onboarding:', request.userContext?.needsOnboarding);
    
    if (!request.userContext?.isAuthenticated) {
      console.log('❌ Debug: User not authenticated');
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Debug: Authentication failed',
        statusCode: 401,
      });
    }

    console.log('✅ Debug: Authentication successful');
    return {
      success: true,
      message: 'Authentication working!',
      user: {
        email: request.userContext.email,
        name: request.userContext.name,
        userId: request.userContext.kindeUserId
      },
      tenantId: request.userContext.tenantId,
      kindeOrgId: request.userContext.kindeOrgId,
      needsOnboarding: request.userContext.needsOnboarding,
      organization: request.userContext.organization
    };
  });

  // Get current subscription
  fastify.get('/current', {
    preHandler: authenticateToken
  }, async (request, reply) => {
    try {
      const { subscriptionCache } = await import('../../../utils/redis-cache.js');
      const userId = request.userContext.userId;
      const tenantId = request.userContext.tenantId;

      console.log('🔍 Subscription /current endpoint called:', {
        userId,
        tenantId,
        hasTenantId: !!tenantId
      });

      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Subscription', 'User is not associated with any organization');
      }

      // Check cache first
      const cacheKey = `subscriptions:current:${tenantId}`;
      const cachedSubscription = await subscriptionCache.get(cacheKey);
      if (cachedSubscription) {
        console.log('✅ Subscription API: Cache hit');
        return {
          success: true,
          data: cachedSubscription,
          cached: true
        };
      }

      const subscription = await SubscriptionService.getCurrentSubscription(tenantId);

      console.log('📋 Subscription lookup result:', {
        tenantId,
        subscriptionFound: !!subscription,
        subscriptionType: subscription ? (subscription.id?.startsWith('credit_') ? 'credit-based' : 'traditional') : 'none',
        plan: subscription?.plan,
        status: subscription?.status,
        availableCredits: subscription?.availableCredits
      });

      if (!subscription) {
        return ErrorResponses.notFound(reply, 'Subscription', 'No active subscription for this organization');
      }

      // Cache for 5 minutes (subscriptions change less frequently)
      await subscriptionCache.set(cacheKey, subscription, 300);

      return {
        success: true,
        data: subscription
      };
    } catch (error) {
      request.log.error('Error fetching current subscription:', error);
      return reply.code(500).send({ error: 'Failed to fetch subscription' });
    }
  });

  // Get available credit packages
  fastify.get('/credit-packages', async (request, reply) => {
    try {
      const packages = await SubscriptionService.getAvailablePlans();

      return {
        success: true,
        data: packages
      };
    } catch (error) {
      request.log.error('Error fetching credit packages:', error);
      return reply.code(500).send({ error: 'Failed to fetch credit packages' });
    }
  });

  // Get configuration status (for debugging)
  fastify.get('/config-status', async (request, reply) => {
    try {
      const isStripeConfigured = SubscriptionService.isStripeConfigured();
      const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;
      
      const priceIdStatus = {
        starter_monthly: !!process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
        starter_yearly: !!process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
        professional_monthly: !!process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID,
        professional_yearly: !!process.env.STRIPE_PROFESSIONAL_YEARLY_PRICE_ID,
        enterprise_monthly: !!process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
        enterprise_yearly: !!process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID
      };
      
      return {
        success: true,
        data: {
          stripeConfigured: isStripeConfigured,
          webhookSecretConfigured: hasWebhookSecret,
          priceIds: priceIdStatus,
          mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'test' : 
                process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? 'live' : 'unknown',
          mockMode: !isStripeConfigured
        }
      };
    } catch (error) {
      request.log.error('Error fetching config status:', error);
      return reply.code(500).send({ error: 'Failed to fetch config status' });
    }
  });

  // Get plan limits and usage
  fastify.get('/plan-limits', {
    preHandler: authenticateToken
  }, async (request, reply) => {
    try {
      const tenantId = request.userContext.tenantId;
      
      if (!tenantId) {
        return reply.code(401).send({ 
          success: false, 
          error: 'No organization found' 
        });
      }

      // Mock req/res objects for the middleware function
      const mockReq = { user: { tenantId } };
      const mockRes = {
        json: (data) => data,
        status: (code) => ({ json: (data) => ({ statusCode: code, ...data }) })
      };

      // Call the getPlanLimits function directly
      const result = await new Promise((resolve, reject) => {
        getPlanLimits(mockReq, {
          json: resolve,
          status: (code) => ({ json: (data) => resolve({ statusCode: code, ...data }) })
        });
      });

      if (result.statusCode && result.statusCode !== 200) {
        return reply.code(result.statusCode).send(result);
      }

      return result;
    } catch (error) {
      request.log.error('Error fetching plan limits:', error);
      return reply.code(500).send({ 
        success: false, 
        error: 'Failed to fetch plan limits' 
      });
    }
  });

  // Create Stripe checkout session for both plans and credit packages
  fastify.post('/checkout', {
    preHandler: authenticateToken,
    schema: {
      body: {
        type: 'object',
        oneOf: [
          // Plan subscription checkout
          {
            required: ['planId', 'billingCycle', 'successUrl', 'cancelUrl'],
            properties: {
              planId: { type: 'string' },
              billingCycle: { type: 'string', enum: ['monthly', 'yearly'] },
              successUrl: { type: 'string' },
              cancelUrl: { type: 'string' }
            }
          },
          // Credit package checkout (legacy)
          {
            required: ['packageId', 'credits', 'successUrl', 'cancelUrl'],
            properties: {
              packageId: { type: 'string' },
              credits: { type: 'number', minimum: 1, maximum: 10000 }, // Dollar amount for credit purchase
              successUrl: { type: 'string' },
              cancelUrl: { type: 'string' }
            }
          }
        ]
      }
    }
  }, async (request, reply) => {
    try {
      const { packageId, credits, planId, billingCycle, successUrl, cancelUrl } = request.body;
      const tenantId = request.userContext.tenantId;
      const userId = request.userContext.userId;

      // Determine if this is a plan subscription or credit package purchase
      const isPlanSubscription = !!(planId && billingCycle);
      const isCreditPurchase = !!(packageId && credits);

      if (!isPlanSubscription && !isCreditPurchase) {
        return reply.code(400).send({
          error: 'Invalid request',
          message: 'Either planId/billingCycle (for plan subscription) or packageId/credits (for credit purchase) must be provided'
        });
      }

      console.log('🔍 Checkout - User context:', {
        tenantId,
        userId,
        email: request.userContext.email,
        organization: request.userContext.organization
      });

      if (!tenantId) {
        console.log('❌ Checkout - No tenantId found, user needs onboarding');
        return reply.code(400).send({ 
          error: 'No organization found',
          message: 'User must be associated with an organization to create a subscription',
          action: 'redirect_to_onboarding',
          redirectUrl: '/onboarding'
        });
    }

      // Get tenant info for customer creation
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);
      
      if (!tenant) {
        console.log('❌ Checkout - Tenant not found in database:', tenantId);
        return ErrorResponses.notFound(reply, 'Organization', 'Organization data not found. Please complete onboarding first.', {
          action: 'redirect_to_onboarding',
          redirectUrl: '/onboarding'
        });
      }

      console.log('✅ Checkout - Found tenant:', tenant.companyName);

      let checkoutParams;
      let itemDescription;

      if (isPlanSubscription) {
        // Validate plan exists
        const plans = await SubscriptionService.getAvailablePlans();
        const selectedPlan = plans.find(p => p.id === planId);

        if (!selectedPlan) {
          return reply.code(400).send({ error: 'Invalid plan selected' });
        }

        // Check if user already has an active subscription
        const currentSubscription = await SubscriptionService.getCurrentSubscription(tenantId);
        if (currentSubscription && currentSubscription.status === 'active') {
          // Allow upgrades from trial to paid plans
          if (currentSubscription.plan === 'trial') {
            console.log('🔄 Allowing upgrade from trial to paid plan:', planId);
          } else if (currentSubscription.plan !== 'free') {
            return reply.code(400).send({
              error: 'Active subscription exists',
              message: 'Use the plan change endpoint for modifying existing subscriptions'
            });
          }
        }

        checkoutParams = {
          tenantId,
          planId,
          billingCycle,
          customerId: tenant.stripeCustomerId || null,
          successUrl,
          cancelUrl
        };

        itemDescription = `Plan subscription: ${selectedPlan.name}`;
        console.log('🎯 Checkout - Creating checkout session for plan subscription:', selectedPlan.name);

      } else if (isCreditPurchase) {
        // Check if credit package is valid
        const { CreditService } = await import('../services/credit-service.js');
        const packages = await CreditService.getAvailablePackages();
        const selectedPackage = packages.find(p => p.id === packageId);

        if (!selectedPackage) {
          return reply.code(400).send({ error: 'Invalid credit package selected' });
        }

        // Validate dollar amount is reasonable
        if (credits < 1 || credits > 10000) {
          return reply.code(400).send({
            error: 'Invalid amount',
            message: `Amount must be between $1 and $10,000`
          });
        }

        checkoutParams = {
          tenantId,
          planId: packageId,
          credits,
          customerId: tenant.stripeCustomerId || null,
          successUrl,
          cancelUrl
        };

        itemDescription = `Credit purchase: $${credits} for ${selectedPackage.name}`;
        console.log('🎯 Checkout - Creating checkout session for credit purchase:', selectedPackage.name, 'for $', credits);
      }

      // Create Stripe checkout session
      const checkoutUrl = await SubscriptionService.createCheckoutSession(checkoutParams);

      console.log('✅ Checkout - Session created successfully');

      // Return appropriate data based on checkout type
      const responseData = {
        checkoutUrl
      };

      if (isPlanSubscription) {
        responseData.planId = planId;
        responseData.billingCycle = billingCycle;
      } else if (isCreditPurchase) {
        responseData.packageId = packageId;
        responseData.amount = credits; // Dollar amount
      }

      return {
        success: true,
        data: responseData
      };
    } catch (error) {
      request.log.error('Error creating checkout session:', error);
      return reply.code(500).send({ 
        error: 'Failed to create checkout session',
        message: error.message
      });
    }
  });

  // Get subscription usage
  fastify.get('/usage', {
    preHandler: authenticateToken
  }, async (request, reply) => {
    try {
      const tenantId = request.userContext.tenantId;

      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Organization', 'User is not associated with any organization');
      }

      const usage = await SubscriptionService.getUsageMetrics(tenantId);
      
      return {
        success: true,
        data: usage
      };
    } catch (error) {
      request.log.error('Error fetching usage metrics:', error);
      return reply.code(500).send({ error: 'Failed to fetch usage metrics' });
    }
  });

  // Get billing history
  fastify.get('/billing-history', {
    preHandler: authenticateToken
  }, async (request, reply) => {
    try {
      const tenantId = request.userContext.tenantId;

      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Organization', 'User is not associated with any organization');
      }

      const billingHistory = await SubscriptionService.getBillingHistory(tenantId);
      
      return {
        success: true,
        data: billingHistory
      };
    } catch (error) {
      request.log.error('Error fetching billing history:', error);
      console.error('❌ Billing history error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack?.substring(0, 300)
      });

      // Check if it's a database table issue
      if (error.message?.includes('relation "credit_purchases" does not exist')) {
        return reply.code(503).send({
          error: 'Billing History Unavailable',
          message: 'Billing history is not yet available. Please contact support if this persists.',
          details: 'Database table not found'
        });
      }

      return reply.code(500).send({
        error: 'Failed to fetch billing history',
        message: 'Unable to retrieve billing history at this time.'
      });
    }
  });


  // Cancel subscription
  fastify.post('/cancel', {
    preHandler: authenticateToken
  }, async (request, reply) => {
    try {
      const tenantId = request.userContext.tenantId;
      const userId = request.userContext.userId;

      if (!tenantId) {
        return reply.code(400).send({ 
          error: 'No organization found',
          message: 'User must be associated with an organization'
        });
      }

      const result = await SubscriptionService.cancelSubscription(tenantId);
      
      return {
        success: true,
        data: result,
        message: 'Subscription cancelled successfully'
      };
    } catch (error) {
      request.log.error('Error cancelling subscription:', error);
      return reply.code(500).send({ 
        error: 'Failed to cancel subscription',
        message: error.message
      });
    }
  });

  // Plan changes disabled - credit-based system uses credit purchases instead
  fastify.post('/change-plan', {
    preHandler: authenticateToken,
    schema: {
      body: {
        type: 'object',
        required: ['planId'],
        properties: {
          planId: { type: 'string' },
          billingCycle: { type: 'string', enum: ['monthly', 'yearly'], default: 'monthly' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { planId, billingCycle = 'monthly' } = request.body;
      const tenantId = request.userContext.tenantId;

      if (!tenantId) {
        return reply.code(400).send({
          error: 'No organization found',
          message: 'User must be associated with an organization'
        });
      }

      console.log('🔄 Plan change requested:', { tenantId, planId, billingCycle });

      const result = await SubscriptionService.changePlan({
        tenantId,
        planId,
        billingCycle
      });

      // If result contains a checkout URL, return it for payment
      if (typeof result === 'string' && result.startsWith('http')) {
        return {
          success: true,
          data: {
            checkoutUrl: result,
            planId,
            billingCycle
          },
          message: 'Redirecting to payment for plan change'
        };
      }

      return {
        success: true,
        data: result,
        message: result.message || 'Plan changed successfully'
      };
    } catch (error) {
      request.log.error('Error changing plan:', error);
      return reply.code(500).send({
        error: 'Failed to change plan',
        message: error.message
      });
    }
  });

  // Debug Stripe configuration (for troubleshooting webhook issues)
  fastify.get('/debug-stripe-config', async (request, reply) => {
    try {
      console.log('🔍 Debugging Stripe configuration...');
      
      const configStatus = SubscriptionService.getStripeConfigStatus();
      
      console.log('📊 Stripe configuration status:', configStatus);
      
      return reply.code(200).send({
        success: true,
        message: 'Stripe configuration status',
        config: configStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error checking Stripe config:', error);
      return reply.code(500).send({ 
        error: 'Failed to check Stripe configuration',
        message: error.message 
      });
    }
  });

  // Test webhook processing (for debugging)
  fastify.post('/test-webhook', async (request, reply) => {
    try {
      console.log('🧪 Testing webhook processing...');
      
      // Create a test webhook payload
      const testPayload = {
        id: 'evt_test_' + Date.now(),
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_' + Date.now(),
            mode: 'subscription',
            metadata: {
              tenantId: 'test-tenant',
              planId: 'test-plan'
            },
            customer: 'cus_test',
            subscription: 'sub_test'
          }
        }
      };
      
      console.log('📝 Test webhook payload:', JSON.stringify(testPayload, null, 2));
      
      return reply.code(200).send({
        success: true,
        message: 'Test webhook endpoint working',
        testPayload,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Test webhook error:', error);
      return reply.code(500).send({ 
        error: 'Test webhook failed',
        message: error.message 
      });
    }
  });

  // Stripe webhook handler for subscription events
  fastify.post('/webhook', {
    // Skip authentication for webhook - no preHandler
    config: {
      // Disable body parsing for webhooks to get raw body
      rawBody: true
    }
  }, async (request, reply) => {
    console.log('🎣 SUBSCRIPTION WEBHOOK ENDPOINT HIT - URL:', request.url);
    console.log('🎣 Request method:', request.method);
    console.log('🎣 Request headers:', Object.keys(request.headers));

    try {
      const sig = request.headers['stripe-signature'];
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!sig || !endpointSecret) {
        console.error('❌ Webhook configuration missing:', { 
          hasSignature: !!sig,
          hasSecret: !!endpointSecret 
        });
        return reply.code(400).send({ error: 'Missing webhook signature or secret' });
      }

      // Get raw body for webhook verification
      let rawBody;
      if (request.rawBody) {
        rawBody = request.rawBody;
      } else if (request.body) {
        rawBody = Buffer.from(JSON.stringify(request.body));
      } else {
        console.error('❌ No raw body found for webhook verification');
        return reply.code(400).send({ error: 'No body content' });
      }
      
      console.log('🎣 Processing Stripe webhook with signature verification');
      console.log('📝 Raw body length:', rawBody.length);
      console.log('🔑 Has signature:', !!sig);
      console.log('🔐 Has secret:', !!endpointSecret);
      console.log('🔍 Debug info:', {
        rawBodyType: typeof rawBody,
        rawBodyIsBuffer: Buffer.isBuffer(rawBody),
        signatureType: typeof sig,
        signatureValue: sig ? sig.substring(0, 20) + '...' : 'none',
        secretType: typeof endpointSecret,
        secretValue: endpointSecret ? endpointSecret.substring(0, 10) + '...' : 'none'
      });

      // Verify webhook signature and process event
      const result = await SubscriptionService.handleWebhook(rawBody, sig, endpointSecret);
      
      console.log('✅ Webhook processed successfully:', result.eventType);
      
      return reply.code(200).send({
        success: true,
        received: true,
        eventType: result.eventType
      });
    } catch (error) {
      console.error('❌ Webhook processing error:', error);
      request.log.error('Webhook processing error:', error);
      
      // Return 200 to prevent Stripe from retrying if it's a non-retryable error
      if (error.message.includes('signature') || error.message.includes('timestamp')) {
        console.log('🔄 Non-retryable error, returning 400');
        return reply.code(400).send({ 
          error: 'Webhook signature verification failed',
          message: error.message
        });
      }
      
      // Check if it's a test webhook or missing metadata (should not retry)
      if (error.message.includes('Missing tenantId or planId') || 
          error.message.includes('test webhook') ||
          error.message.includes('already_processed')) {
        console.log('🔄 Non-critical error, returning 200 to prevent retry');
        return reply.code(200).send({ 
          success: true,
          message: 'Webhook processed (non-critical issue)',
          details: error.message
        });
      }
      
      // Return 500 for retryable errors
      console.log('🔄 Retryable error, returning 500');
      return reply.code(500).send({ 
        error: 'Webhook processing failed',
        message: error.message
      });
    }
  });

  // Create customer portal session
  fastify.post('/portal', {
    preHandler: [authenticateToken, requirePermission('billing:manage'), trackUsage],
    schema: {
      body: {
        type: 'object',
        properties: {
          returnUrl: { type: 'string', format: 'uri' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { returnUrl } = request.body;
      
      const session = await SubscriptionService.createPortalSession(
        request.user.tenantId,
        returnUrl || `${process.env.FRONTEND_URL}/dashboard/billing`
      );
      
      return {
        success: true,
        data: {
          url: session.url
        }
      };
    } catch (error) {
      fastify.log.error('Error creating portal session:', error);
      return reply.code(500).send({ error: 'Failed to create portal session' });
    }
  });

  // Update payment method
  fastify.post('/payment-method', {
    preHandler: [authenticateToken, requirePermission('billing:manage'), trackUsage],
    schema: {
      body: {
        type: 'object',
        required: ['paymentMethodId'],
        properties: {
          paymentMethodId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { paymentMethodId } = request.body;
      
      await SubscriptionService.updatePaymentMethod(
        request.user.tenantId,
        paymentMethodId
      );
      
      return {
        success: true,
        message: 'Payment method updated successfully'
      };
    } catch (error) {
      fastify.log.error('Error updating payment method:', error);
      return reply.code(500).send({ error: 'Failed to update payment method' });
    }
  });

  // Reactivate subscription
  fastify.post('/reactivate', {
    preHandler: [authenticateToken, requirePermission('billing:manage'), trackUsage]
  }, async (request, reply) => {
    try {
      const result = await SubscriptionService.reactivateSubscription(request.user.tenantId);
      
      return {
        success: true,
        data: result,
        message: 'Subscription reactivated successfully'
      };
    } catch (error) {
      fastify.log.error('Error reactivating subscription:', error);
      return reply.code(500).send({ error: 'Failed to reactivate subscription' });
    }
  });

  // Apply coupon
  fastify.post('/coupon', {
    preHandler: [authenticateToken, requirePermission('billing:manage'), trackUsage],
    schema: {
      body: {
        type: 'object',
        required: ['couponCode'],
        properties: {
          couponCode: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { couponCode } = request.body;
      
      const result = await SubscriptionService.applyCoupon(
        request.user.tenantId,
        couponCode
      );
      
      return {
        success: true,
        data: result,
        message: 'Coupon applied successfully'
      };
    } catch (error) {
      fastify.log.error('Error applying coupon:', error);
      if (error.message.includes('Invalid') || error.message.includes('expired')) {
        return reply.code(400).send({ error: error.message });
      }
      return reply.code(500).send({ error: 'Failed to apply coupon' });
    }
  });

  // Get upcoming invoice
  fastify.get('/upcoming-invoice', {
    preHandler: [authenticateToken, requirePermission('billing:read'), trackUsage]
  }, async (request, reply) => {
    try {
      const invoice = await SubscriptionService.getUpcomingInvoice(request.user.tenantId);
      
      return {
        success: true,
        data: invoice
      };
    } catch (error) {
      fastify.log.error('Error fetching upcoming invoice:', error);
      return reply.code(500).send({ error: 'Failed to fetch upcoming invoice' });
    }
  });

  // Download invoice
  fastify.get('/invoice/:invoiceId/download', {
    preHandler: [authenticateToken, requirePermission('billing:read'), trackUsage],
    schema: {
      params: {
        type: 'object',
        required: ['invoiceId'],
        properties: {
          invoiceId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { invoiceId } = request.params;
      
      const invoiceUrl = await SubscriptionService.getInvoiceDownloadUrl(
        request.user.tenantId,
        invoiceId
      );
      
      return reply.redirect(invoiceUrl);
    } catch (error) {
      fastify.log.error('Error downloading invoice:', error);
      return reply.code(500).send({ error: 'Failed to download invoice' });
    }
  });

  // Downgrade disabled - credit-based system uses credit purchases instead
  /*
  fastify.post('/immediate-downgrade', {
    preHandler: authenticateToken,
    schema: {
      body: {
        type: 'object',
        required: ['newPlan'],
        properties: {
          newPlan: { type: 'string' },
          reason: { type: 'string' },
          refundRequested: { type: 'boolean', default: false }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { newPlan, reason = 'customer_request', refundRequested = false } = request.body;
      const tenantId = request.userContext.tenantId;

      if (!tenantId) {
        return reply.code(400).send({ 
          error: 'No organization found',
          message: 'User must be associated with an organization'
        });
      }

      console.log('🔄 Plan change requested:', { tenantId, newPlan, refundRequested });

      // Use changePlan which will automatically schedule downgrades (never immediate)
      const result = await SubscriptionService.changePlan({
        tenantId,
        planId: newPlan,
        billingCycle: 'yearly' // Annual billing only
      });

      return {
        success: true,
        data: result,
        message: 'Plan change scheduled successfully'
      };
    } catch (error) {
      request.log.error('Error processing immediate downgrade:', error);
      return reply.code(500).send({
        error: 'Failed to process downgrade',
        message: error.message
      });
    }
  });
  */

  // Process refund for a specific payment
  fastify.post('/refund', {
    preHandler: authenticateToken,
    schema: {
      body: {
        type: 'object',
        required: ['paymentId'],
        properties: {
          paymentId: { type: 'string' },
          amount: { type: 'number' },
          reason: { type: 'string', default: 'customer_request' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { paymentId, amount, reason = 'customer_request' } = request.body;
      const tenantId = request.userContext.tenantId;

      if (!tenantId) {
        return reply.code(400).send({ 
          error: 'No organization found',
          message: 'User must be associated with an organization'
        });
      }

      console.log('💸 Refund requested:', { tenantId, paymentId, amount, reason });

      const result = await SubscriptionService.processRefund({
        tenantId,
        paymentId,
        amount,
        reason
      });
      
      return {
        success: true,
        data: result,
        message: 'Refund processed successfully'
      };
    } catch (error) {
      request.log.error('Error processing refund:', error);
      return reply.code(500).send({ 
        error: 'Failed to process refund',
        message: error.message
      });
    }
  });

  // Get detailed payment information by paymentId or sessionId
  fastify.get('/payment/:identifier', {
    preHandler: authenticateToken,
    schema: {
      params: {
        type: 'object',
        required: ['identifier'],
        properties: {
          identifier: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { identifier } = request.params;
      const tenantId = request.userContext.tenantId;

      if (!tenantId) {
        return reply.code(400).send({
          error: 'No organization found',
          message: 'User must be associated with an organization'
        });
      }

      let payment;

      try {
        // Check if identifier is a valid UUID (paymentId) or Stripe ID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);

        if (isUUID) {
          // Try to find by paymentId first (if it's a UUID)
          let [paymentById] = await db
            .select()
            .from(payments)
            .where(and(
              eq(payments.paymentId, identifier),
              eq(payments.tenantId, tenantId)
            ))
            .limit(1);

          if (paymentById) {
            payment = paymentById;
          }
        }

        // If not found by paymentId or identifier is not a UUID, try by Stripe payment intent ID
        if (!payment) {
          let [paymentByIntent] = await db
            .select()
            .from(payments)
            .where(and(
              eq(payments.stripePaymentIntentId, identifier),
              eq(payments.tenantId, tenantId)
            ))
            .limit(1);

          if (paymentByIntent) {
            payment = paymentByIntent;
          }
        }

        // Also try by Stripe invoice ID (for invoice-based payments)
        if (!payment && identifier.startsWith('in_')) {
          let [paymentByInvoice] = await db
            .select()
            .from(payments)
            .where(and(
              eq(payments.stripeInvoiceId, identifier),
              eq(payments.tenantId, tenantId)
            ))
            .limit(1);

          if (paymentByInvoice) {
            payment = paymentByInvoice;
          }
        }
      } catch (dbError) {
        console.error('Database error in payment lookup:', dbError);
        return reply.code(500).send({
          error: 'Database error',
          message: 'Failed to query payment records'
        });
      }

      if (!payment) {
        // Check if this is a checkout session that hasn't completed yet
        if (identifier.startsWith('cs_test_') || identifier.startsWith('cs_live_')) {
          return reply.code(404).send({
            error: 'Payment not found',
            message: 'Checkout session found but payment has not been completed yet. Please complete the payment process.',
            code: 'PAYMENT_PENDING'
          });
        }

        return ErrorResponses.notFound(reply, 'Payment', 'Payment not found or does not belong to your organization');
      }

      try {
        // Get plan details from PLAN_ACCESS_MATRIX
        const planAccess = PLAN_ACCESS_MATRIX[payment.planId];
        const planDetails = planAccess ? {
          name: payment.planId.charAt(0).toUpperCase() + payment.planId.slice(1),
          features: [
            ...(planAccess.applications?.includes('crm') ? ['CRM Suite'] : []),
            ...(planAccess.applications?.includes('hr') ? ['HR Management'] : []),
            ...(planAccess.applications?.includes('affiliateConnect') ? ['Affiliate Connect'] : []),
            `${planAccess.credits?.free || 0} Free Credits`,
            ...(planAccess.applications?.includes('crm') && planAccess.modules?.crm?.includes('leads') ? ['Lead Management'] : []),
            ...(planAccess.applications?.includes('hr') && planAccess.modules?.hr?.includes('employees') ? ['Employee Management'] : []),
          ],
          credits: planAccess.credits?.free || 0
        } : null;

        // Get current subscription for this tenant
        let [subscription] = await db
          .select()
          .from(subscriptions)
          .where(and(
            eq(subscriptions.tenantId, tenantId),
            eq(subscriptions.status, 'active')
          ))
          .limit(1);

        // Return data in the format expected by PaymentSuccess component
        return {
          success: true,
          data: {
            sessionId: payment.stripePaymentIntentId,
            transactionId: payment.paymentId,
            amount: parseFloat(payment.amount),
            currency: payment.currency,
            planId: payment.planId,
            planName: planDetails?.name || payment.planId,
            billingCycle: payment.billingCycle || 'yearly',
            paymentMethod: payment.paymentMethod,
            status: payment.status,
            createdAt: payment.createdAt,
            processedAt: payment.completedAt,
            description: `Subscription: ${planDetails?.name || payment.planId}`,
            subscription: subscription ? {
              status: subscription.status,
              currentPeriodStart: subscription.currentPeriodStart,
              currentPeriodEnd: subscription.currentPeriodEnd,
              nextBillingDate: subscription.currentPeriodEnd
            } : null,
            features: planDetails?.features || [],
            credits: planDetails?.credits || 0
          }
        };
        } catch (error) {
          request.log.error('Error fetching payment details:', error);
          return reply.code(500).send({
            error: 'Failed to fetch payment details',
            message: error.message
          });
        }
      } catch (error) {
        request.log.error('Error in payment details route:', error);
        return reply.code(500).send({
          error: 'Internal server error',
          message: 'Failed to process payment details request'
        });
      }
    });

    // Get subscription actions history
    fastify.get('/actions', {}, async (request, reply) => {
      try {
      const tenantId = request.userContext.tenantId;

      if (!tenantId) {
        return reply.code(400).send({ 
          error: 'No organization found',
          message: 'User must be associated with an organization'
        });
      }

      // Get subscription actions
      // Subscription actions are now handled by Stripe webhooks
      // Return empty array for now
      const formattedActions = [];
      
      return {
        success: true,
        data: formattedActions
      };
    } catch (error) {
      request.log.error('Error fetching subscription actions:', error);
      return reply.code(500).send({ 
        error: 'Failed to fetch subscription actions',
        message: error.message
      });
    }
  });

  // Clean up duplicate payment records (admin endpoint)
  fastify.post('/cleanup-duplicate-payments', {
    preHandler: [authenticateToken],
    schema: {
      headers: {
        type: 'object',
        properties: {
          'authorization': { type: 'string' }
        },
        required: ['authorization']
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.userContext;
      
      console.log(`🧹 Starting duplicate payment cleanup for tenant: ${tenantId}`);
      
      // Find duplicate payments (same amount, same date, same tenant)
      const duplicates = await db
        .select({
          paymentId: payments.paymentId,
          amount: payments.amount,
          stripePaymentIntentId: payments.stripePaymentIntentId,
          stripeInvoiceId: payments.stripeInvoiceId,
          paidAt: payments.paidAt,
          description: payments.description
        })
        .from(payments)
        .where(eq(payments.tenantId, tenantId))
        .orderBy(payments.createdAt);

      // Group by unique criteria
      const paymentGroups = new Map();
      
      duplicates.forEach(payment => {
        const key = `${payment.amount}-${payment.stripePaymentIntentId || ''}-${payment.stripeInvoiceId || ''}`;
        if (!paymentGroups.has(key)) {
          paymentGroups.set(key, []);
        }
        paymentGroups.get(key).push(payment);
      });
      
      // Find and remove duplicates (keep the first one)
      let removedCount = 0;
      const duplicatePaymentIds = [];
      
      for (const [key, group] of paymentGroups) {
        if (group.length > 1) {
          // Keep the first payment, mark others for deletion
          const toDelete = group.slice(1);
          toDelete.forEach(payment => {
            duplicatePaymentIds.push(payment.paymentId);
          });
          removedCount += toDelete.length;
          
          console.log(`🗑️ Found ${group.length} duplicates for key ${key}, removing ${toDelete.length}`);
        }
      }
      
      // Delete duplicate payments
      if (duplicatePaymentIds.length > 0) {
        await db
          .delete(payments)
          .where(inArray(payments.paymentId, duplicatePaymentIds));
        
        console.log(`✅ Cleaned up ${removedCount} duplicate payments for tenant: ${tenantId}`);
      } else {
        console.log(`✅ No duplicate payments found for tenant: ${tenantId}`);
      }
      
      return {
        success: true,
        message: `Cleaned up ${removedCount} duplicate payments`,
        data: {
          duplicatesRemoved: removedCount,
          remainingPayments: duplicates.length - removedCount
        }
      };
    } catch (error) {
      console.error('❌ Error cleaning up duplicate payments:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to clean up duplicate payments',
        message: error.message
      });
    }
  });

  // Manually toggle off trial restrictions (for upgraded users)
  fastify.post('/toggle-trial-restrictions', {
    preHandler: [authenticateToken],
    schema: {
      headers: {
        type: 'object',
        properties: {
          'authorization': { type: 'string' }
        },
        required: ['authorization']
      },
      body: {
        type: 'object',
        properties: {
          disable: { type: 'boolean' }
        },
        required: ['disable']
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.userContext;
      const { disable } = request.body;
      
      console.log(`🔧 Toggling trial restrictions for tenant: ${tenantId}, disable: ${disable}`);
      
      // Update subscription - trial restrictions are no longer used
      // This endpoint is deprecated and should not update database fields
      const updatedSubscription = { tenantId };

      if (!updatedSubscription) {
        return ErrorResponses.notFound(reply, 'Subscription', 'Subscription not found');
      }
      
      console.log(`✅ Trial restrictions ${disable ? 'disabled' : 'enabled'} for tenant: ${tenantId}`);
      
      return {
        success: true,
        message: `Trial restrictions ${disable ? 'disabled' : 'enabled'} successfully`,
        data: {
          disabled: disable,
          tenantId: tenantId
        }
      };
    } catch (error) {
      console.error('❌ Error toggling trial restrictions:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to toggle trial restrictions',
        message: error.message
      });
    }
  });
} 