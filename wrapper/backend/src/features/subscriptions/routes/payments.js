import { PaymentService } from '../services/payment-service.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function paymentRoutes(fastify, options) {
  // Get payment history for current tenant
  fastify.get('/history', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Only admins can view payment history
    if (!request.userContext?.isAdmin && !request.userContext?.isTenantAdmin) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      
      if (!tenantId) {
        return reply.code(400).send({ error: 'Tenant ID required' });
      }

      const { page = 1, limit = 50 } = request.query;
      const paymentHistory = await PaymentService.getPaymentHistory(tenantId, parseInt(limit));
      
      return { 
        payments: paymentHistory,
        pagination: { page: parseInt(page), limit: parseInt(limit) }
      };
    } catch (error) {
      console.error('❌ Failed to get payment history:', error);
      return reply.code(500).send({ error: 'Failed to retrieve payment history' });
    }
  });

  // Get payment statistics for current tenant
  fastify.get('/stats', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    if (!request.userContext?.isAdmin && !request.userContext?.isTenantAdmin) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      
      if (!tenantId) {
        return reply.code(400).send({ error: 'Tenant ID required' });
      }

      const stats = await PaymentService.getPaymentStats(tenantId);
      return { stats };
    } catch (error) {
      console.error('❌ Failed to get payment stats:', error);
      return reply.code(500).send({ error: 'Failed to retrieve payment statistics' });
    }
  });

  // Get payment methods for current tenant
  fastify.get('/methods', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      
      if (!tenantId) {
        return reply.code(400).send({ error: 'Tenant ID required' });
      }

      const methods = await PaymentService.getPaymentMethods(tenantId);
      return { methods };
    } catch (error) {
      console.error('❌ Failed to get payment methods:', error);
      return reply.code(500).send({ error: 'Failed to retrieve payment methods' });
    }
  });

  // Get payment analytics for current tenant (proxy to analytics endpoint)
  fastify.get('/analytics', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    if (!request.userContext?.isAdmin && !request.userContext?.isTenantAdmin) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      
      if (!tenantId) {
        return reply.code(400).send({ error: 'Tenant ID required' });
      }

      // Return basic payment analytics for dashboard
      const stats = await PaymentService.getPaymentStats(tenantId);
      const history = await PaymentService.getPaymentHistory(tenantId, 10);
      
      // Calculate revenue growth
      const currentMonth = new Date();
      const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
      
      const currentMonthPayments = history.filter(p => 
        p.paidAt >= currentMonth && p.status === 'succeeded'
      );
      const lastMonthPayments = history.filter(p => 
        p.paidAt >= lastMonth && p.paidAt < currentMonth && p.status === 'succeeded'
      );
      
      const currentMonthRevenue = currentMonthPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const lastMonthRevenue = lastMonthPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      
      const revenueGrowth = lastMonthRevenue > 0 
        ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0;

      return {
        success: true,
        data: {
          totalRevenue: stats.totalPaid,
          monthlyRevenue: stats.monthlySpend,
          subscriptions: {
            active: 1, // This would come from subscription service
            trial: 0,
            expired: 0
          },
          growth: {
            revenue: revenueGrowth,
            users: 0 // This would come from user service
          },
          percentageChange: revenueGrowth
        }
      };
    } catch (error) {
      console.error('❌ Failed to get payment analytics:', error);
      return reply.code(500).send({ error: 'Failed to retrieve payment analytics' });
    }
  });

  // Comprehensive Stripe Webhook Handler
  fastify.post('/webhook/stripe', {
    schema: {
      headers: {
        type: 'object',
        properties: {
          'stripe-signature': { type: 'string' }
        },
        required: ['stripe-signature']
      }
    }
  }, async (request, reply) => {
    const sig = request.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
      return reply.code(500).send({ error: 'Webhook secret not configured' });
    }

    let event;

    try {
      // Get raw body for webhook verification
      const rawBody = request.rawBody || Buffer.from(JSON.stringify(request.body));
      
      // Verify the webhook signature
      event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
      console.log('✅ Webhook signature verified:', event.type);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return reply.code(400).send({ error: 'Invalid signature' });
    }

    // Handle the event
    try {
      await handleStripeEvent(event);
      return reply.code(200).send({ received: true });
    } catch (error) {
      console.error('❌ Error handling webhook event:', error);
      return reply.code(500).send({ error: 'Webhook handler failed' });
    }
  });
}

// Comprehensive Stripe Event Handler
async function handleStripeEvent(event) {
  const eventType = event.type;
  const data = event.data.object;

  console.log(`🔔 Processing Stripe event: ${eventType}`);

  try {
    switch (eventType) {
      // Payment Intent Events
      case 'payment_intent.created':
        await handlePaymentIntentCreated(data);
        break;
      
      case 'payment_intent.processing':
        await handlePaymentIntentProcessing(data);
        break;
      
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(data);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(data);
        break;
      
      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(data);
        break;
      
      case 'payment_intent.requires_action':
        await handlePaymentIntentRequiresAction(data);
        break;

      // Payment Method Events
      case 'payment_method.attached':
        await handlePaymentMethodAttached(data);
        break;
      
      case 'payment_method.detached':
        await handlePaymentMethodDetached(data);
        break;

      // Invoice Events
      case 'invoice.created':
        await handleInvoiceCreated(data);
        break;
      
      case 'invoice.finalized':
        await handleInvoiceFinalized(data);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(data);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(data);
        break;
      
      case 'invoice.payment_action_required':
        await handleInvoicePaymentActionRequired(data);
        break;

      // Subscription Events
      case 'customer.subscription.created':
        await handleSubscriptionCreated(data);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(data);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(data);
        break;

      // Charge Events
      case 'charge.succeeded':
        await handleChargeSucceeded(data);
        break;
      
      case 'charge.failed':
        await handleChargeFailed(data);
        break;
      
      case 'charge.captured':
        await handleChargeCaptured(data);
        break;
      
      case 'charge.refunded':
        await handleChargeRefunded(data);
        break;

      // Dispute Events
      case 'charge.dispute.created':
        await handleDisputeCreated(data);
        break;
      
      case 'charge.dispute.updated':
        await handleDisputeUpdated(data);
        break;
      
      case 'charge.dispute.closed':
        await handleDisputeClosed(data);
        break;

      // Refund Events
      case 'charge.refund.created':
        await handleRefundCreated(data);
        break;
      
      case 'charge.refund.updated':
        await handleRefundUpdated(data);
        break;

      // Customer Events
      case 'customer.created':
        await handleCustomerCreated(data);
        break;
      
      case 'customer.updated':
        await handleCustomerUpdated(data);
        break;
      
      case 'customer.deleted':
        await handleCustomerDeleted(data);
        break;

      // Checkout Events
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(data);
        break;
      
      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(data);
        break;

      default:
        console.log(`⚠️ Unhandled event type: ${eventType}`);
        break;
    }

    console.log(`✅ Successfully processed ${eventType}`);
  } catch (error) {
    console.error(`❌ Error processing ${eventType}:`, error);
    throw error;
  }
}

// Payment Intent Event Handlers
async function handlePaymentIntentCreated(paymentIntent) {
  console.log('💳 Payment Intent Created:', paymentIntent.id);
  
  // Find tenant by customer ID
  const tenantId = await findTenantByCustomer(paymentIntent.customer);
  if (!tenantId) return;

  await PaymentService.recordPayment({
    tenantId,
    stripePaymentIntentId: paymentIntent.id,
    stripeCustomerId: paymentIntent.customer,
    amount: (paymentIntent.amount / 100).toString(),
    currency: paymentIntent.currency.toUpperCase(),
    status: 'processing',
    paymentMethod: paymentIntent.payment_method_types?.[0] || 'unknown',
    paymentType: 'subscription',
    description: paymentIntent.description || 'Subscription payment',
    metadata: paymentIntent.metadata || {},
    stripeRawData: paymentIntent
  });
}

async function handlePaymentIntentProcessing(paymentIntent) {
  console.log('⏳ Payment Intent Processing:', paymentIntent.id);
  
  await PaymentService.updatePaymentStatus(
    paymentIntent.id, 
    'processing',
    { 
      processing_started: new Date().toISOString(),
      payment_method: paymentIntent.payment_method_types?.[0]
    }
  );
}

async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log('✅ Payment Intent Succeeded:', paymentIntent.id);

  const tenantId = await findTenantByCustomer(paymentIntent.customer);
  if (!tenantId) {
    console.warn('⚠️ Payment intent succeeded but no tenant found for customer:', paymentIntent.customer);
    return;
  }

  // Check if payment record already exists
  const existingPayment = await PaymentService.getPaymentByIntentId(paymentIntent.id);

  if (existingPayment) {
    // Update existing payment
    await PaymentService.updatePaymentStatus(
      paymentIntent.id,
      'succeeded',
      {
        succeeded_at: new Date().toISOString(),
        latest_charge: paymentIntent.latest_charge,
        processing_fees: paymentIntent.application_fee_amount || 0,
        net_amount: paymentIntent.amount - (paymentIntent.application_fee_amount || 0)
      }
    );
  } else {
    // Create new payment record
    await PaymentService.recordPayment({
      tenantId,
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: paymentIntent.customer,
      stripeChargeId: paymentIntent.latest_charge,
      amount: (paymentIntent.amount / 100).toString(),
      currency: paymentIntent.currency.toUpperCase(),
      status: 'succeeded',
      paymentMethod: paymentIntent.payment_method_types?.[0] || 'card',
      paymentType: 'subscription',
      description: paymentIntent.description || 'Subscription payment',
      processingFees: paymentIntent.application_fee_amount ? (paymentIntent.application_fee_amount / 100).toString() : '0',
      netAmount: ((paymentIntent.amount - (paymentIntent.application_fee_amount || 0)) / 100).toString(),
      metadata: paymentIntent.metadata || {},
      stripeRawData: paymentIntent,
      paidAt: new Date()
    });
  }
}

async function handlePaymentIntentFailed(paymentIntent) {
  console.log('❌ Payment Intent Failed:', paymentIntent.id);
  
  await PaymentService.updatePaymentStatus(
    paymentIntent.id, 
    'failed',
    { 
      failed_at: new Date().toISOString(),
      failure_code: paymentIntent.last_payment_error?.code,
      failure_message: paymentIntent.last_payment_error?.message,
      decline_code: paymentIntent.last_payment_error?.decline_code
    }
  );
}

async function handlePaymentIntentCanceled(paymentIntent) {
  console.log('🚫 Payment Intent Canceled:', paymentIntent.id);
  
  await PaymentService.updatePaymentStatus(
    paymentIntent.id, 
    'canceled',
    { 
      canceled_at: new Date().toISOString(),
      cancellation_reason: paymentIntent.cancellation_reason
    }
  );
}

async function handlePaymentIntentRequiresAction(paymentIntent) {
  console.log('⚠️ Payment Intent Requires Action:', paymentIntent.id);
  
  await PaymentService.updatePaymentStatus(
    paymentIntent.id, 
    'requires_action',
    { 
      action_required_at: new Date().toISOString(),
      next_action: paymentIntent.next_action
    }
  );
}

// Invoice Event Handlers
async function handleInvoicePaymentSucceeded(invoice) {
  console.log('📄 Invoice Payment Succeeded:', invoice.id);
  
  const tenantId = await findTenantByCustomer(invoice.customer);
  if (!tenantId) return;

  await PaymentService.recordPayment({
    tenantId,
    stripeInvoiceId: invoice.id,
    stripePaymentIntentId: invoice.payment_intent,
    stripeSubscriptionId: invoice.subscription,
    stripeCustomerId: invoice.customer,
    amount: (invoice.amount_paid / 100).toString(),
    currency: invoice.currency.toUpperCase(),
    status: 'succeeded',
    paymentType: 'subscription',
    billingReason: invoice.billing_reason,
    invoiceNumber: invoice.number,
    description: `Invoice ${invoice.number} payment`,
    taxAmount: (invoice.tax / 100).toString(),
    metadata: invoice.metadata || {},
    stripeRawData: invoice,
    paidAt: new Date(invoice.status_transitions.paid_at * 1000)
  });
}

async function handleInvoicePaymentFailed(invoice) {
  console.log('❌ Invoice Payment Failed:', invoice.id);
  
  const tenantId = await findTenantByCustomer(invoice.customer);
  if (!tenantId) return;

  await PaymentService.recordPayment({
    tenantId,
    stripeInvoiceId: invoice.id,
    stripePaymentIntentId: invoice.payment_intent,
    stripeSubscriptionId: invoice.subscription,
    stripeCustomerId: invoice.customer,
    amount: (invoice.amount_due / 100).toString(),
    currency: invoice.currency.toUpperCase(),
    status: 'failed',
    paymentType: 'subscription',
    billingReason: invoice.billing_reason,
    invoiceNumber: invoice.number,
    description: `Invoice ${invoice.number} payment failed`,
    metadata: invoice.metadata || {},
    stripeRawData: invoice,
    failedAt: new Date()
  });
}

// Charge Event Handlers
async function handleChargeSucceeded(charge) {
  console.log('💰 Charge Succeeded:', charge.id);
  
  if (charge.payment_intent) {
    await PaymentService.updatePaymentStatus(
      charge.payment_intent,
      'succeeded',
      {
        charge_id: charge.id,
        receipt_url: charge.receipt_url,
        payment_method_details: charge.payment_method_details,
        outcome: charge.outcome,
        risk_level: charge.outcome?.risk_level,
        risk_score: charge.outcome?.risk_score
      }
    );
  }
}

async function handleChargeFailed(charge) {
  console.log('💸 Charge Failed:', charge.id);
  
  if (charge.payment_intent) {
    await PaymentService.updatePaymentStatus(
      charge.payment_intent,
      'failed',
      {
        charge_id: charge.id,
        failure_code: charge.failure_code,
        failure_message: charge.failure_message,
        outcome: charge.outcome
      }
    );
  }
}

async function handleChargeRefunded(charge) {
  console.log('💸 Charge Refunded:', charge.id);
  
  if (charge.payment_intent) {
    await PaymentService.updatePaymentStatus(
      charge.payment_intent,
      charge.amount_refunded === charge.amount ? 'refunded' : 'partially_refunded',
      {
        refunded_at: new Date().toISOString(),
        amount_refunded: charge.amount_refunded / 100,
        refunds: charge.refunds
      }
    );
  }
}

// Dispute Event Handlers
async function handleDisputeCreated(dispute) {
  console.log('⚖️ Dispute Created:', dispute.id);
  
  const charge = await stripe.charges.retrieve(dispute.charge);
  if (charge.payment_intent) {
    await PaymentService.recordDispute(charge.payment_intent, {
      disputeId: dispute.id,
      amount: dispute.amount / 100,
      reason: dispute.reason,
      status: dispute.status,
      currency: dispute.currency,
      evidenceDueBy: new Date(dispute.evidence_details.due_by * 1000),
      hasEvidence: dispute.evidence_details.has_evidence
    });
  }
}

// Utility function to find tenant by Stripe customer ID
async function findTenantByCustomer(customerId) {
  if (!customerId) return null;

  try {
    const { db } = await import('../db/index.js');
    const { tenants } = await import('../db/schema/index.js');
    const { eq } = await import('drizzle-orm');

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(eq(tenants.stripeCustomerId, customerId))
      .limit(1);

    return tenant?.tenantId || null;
  } catch (error) {
    console.error('Error finding tenant by customer:', error);
    return null;
  }
}

// Placeholder handlers for other events
async function handlePaymentMethodAttached(paymentMethod) {
  console.log('🔗 Payment Method Attached:', paymentMethod.id);

  try {
    const tenantId = await findTenantByCustomer(paymentMethod.customer);
    if (!tenantId) return;

    // Update payment method status in our database
    await PaymentService.recordPayment({
      tenantId,
      paymentMethod: paymentMethod.type,
      paymentMethodDetails: paymentMethod.card || paymentMethod,
      status: 'active',
      description: `Payment method ${paymentMethod.id} attached`
    });
  } catch (error) {
    console.error('❌ Error handling payment method attachment:', error);
  }
}

async function handlePaymentMethodDetached(paymentMethod) {
  console.log('🔓 Payment Method Detached:', paymentMethod.id);

  try {
    const tenantId = await findTenantByCustomer(paymentMethod.customer);
    if (!tenantId) return;

    // Mark payment method as inactive in our database
    await PaymentService.recordPayment({
      tenantId,
      paymentMethod: paymentMethod.type,
      paymentMethodDetails: paymentMethod.card || paymentMethod,
      status: 'inactive',
      description: `Payment method ${paymentMethod.id} detached`
    });
  } catch (error) {
    console.error('❌ Error handling payment method detachment:', error);
  }
}

async function handleInvoiceCreated(invoice) {
  console.log('📝 Invoice Created:', invoice.id);

  try {
    const tenantId = await findTenantByCustomer(invoice.customer);
    if (!tenantId) return;

    // Record invoice creation
    await PaymentService.recordPayment({
      tenantId,
      stripeInvoiceId: invoice.id,
      amount: (invoice.amount_due / 100).toString(),
      currency: invoice.currency.toUpperCase(),
      status: 'pending',
      paymentType: 'subscription',
      billingReason: invoice.billing_reason,
      invoiceNumber: invoice.number,
      description: `Invoice ${invoice.number} created`,
      metadata: {
        invoice_status: invoice.status,
        subscription_id: invoice.subscription
      }
    });
  } catch (error) {
    console.error('❌ Error handling invoice creation:', error);
  }
}

async function handleInvoiceFinalized(invoice) {
  console.log('✅ Invoice Finalized:', invoice.id);

  try {
    const tenantId = await findTenantByCustomer(invoice.customer);
    if (!tenantId) return;

    // Update invoice status to finalized
    await PaymentService.updatePaymentStatus(
      invoice.payment_intent,
      'pending',
      {
        invoice_finalized: true,
        invoice_number: invoice.number,
        finalized_at: new Date().toISOString()
      }
    );
  } catch (error) {
    console.error('❌ Error handling invoice finalization:', error);
  }
}

async function handleInvoicePaymentActionRequired(invoice) {
  console.log('⚠️ Invoice Payment Action Required:', invoice.id);

  try {
    const tenantId = await findTenantByCustomer(invoice.customer);
    if (!tenantId) return;

    // Update payment status to requires_action
    await PaymentService.updatePaymentStatus(
      invoice.payment_intent,
      'requires_action',
      {
        action_required: true,
        invoice_id: invoice.id,
        next_action: invoice.payment_intent?.next_action,
        action_required_at: new Date().toISOString()
      }
    );
  } catch (error) {
    console.error('❌ Error handling invoice payment action required:', error);
  }
}

async function handleSubscriptionCreated(subscription) {
  console.log('🔄 Subscription Created:', subscription.id);

  try {
    let tenantId = await findTenantByCustomer(subscription.customer);

    // If tenant not found by customer ID, try to find by subscription ID first
    if (!tenantId) {
      const { db } = await import('../db/index.js');
      const { subscriptions } = await import('../db/schema/index.js');
      const { eq } = await import('drizzle-orm');

      const [existingSubscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
        .limit(1);

      if (existingSubscription) {
        tenantId = existingSubscription.tenantId;
        console.log(`✅ Found tenant ${tenantId} by existing subscription ${subscription.id}`);
      }
    }

    if (!tenantId) {
      console.warn(`⚠️ No tenant found for subscription ${subscription.id} with customer ${subscription.customer}`);
      return;
    }

    // Update tenant with customer ID if not already set
    const { db } = await import('../db/index.js');
    const { tenants, subscriptions } = await import('../db/schema/index.js');
    const { eq } = await import('drizzle-orm');

    // Check if tenant already has customer ID
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.tenantId, tenantId))
      .limit(1);

    if (tenant && !tenant.stripeCustomerId) {
      await db
        .update(tenants)
        .set({
          stripeCustomerId: subscription.customer,
          updatedAt: new Date()
        })
        .where(eq(tenants.tenantId, tenantId));

      console.log(`✅ Updated tenant ${tenantId} with Stripe customer ID: ${subscription.customer}`);
    }

    // Update subscription status in our database
    await db
      .update(subscriptions)
      .set({
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer,
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start ? new Date(subscription.current_period_start * 1000) : null,
        currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
        updatedAt: new Date()
      })
      .where(eq(subscriptions.tenantId, tenantId));

    console.log(`✅ Updated subscription for tenant ${tenantId} with Stripe IDs`);
  } catch (error) {
    console.error('❌ Error handling subscription creation:', error);
  }
}

async function handleSubscriptionUpdated(subscription) {
  console.log('🔄 Subscription Updated:', subscription.id);

  try {
    const tenantId = await findTenantByCustomer(subscription.customer);
    if (!tenantId) return;

    // Update subscription details in our database
    const { db } = await import('../db/index.js');
    const { subscriptions } = await import('../db/schema/index.js');
    const { eq } = await import('drizzle-orm');

    await db
      .update(subscriptions)
      .set({
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start ? new Date(subscription.current_period_start * 1000) : null,
        currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
        cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        updatedAt: new Date()
      })
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
  } catch (error) {
    console.error('❌ Error handling subscription update:', error);
  }
}

async function handleSubscriptionDeleted(subscription) {
  console.log('🗑️ Subscription Deleted:', subscription.id);

  try {
    const tenantId = await findTenantByCustomer(subscription.customer);
    if (!tenantId) return;

    // Mark subscription as canceled in our database
    const { db } = await import('../db/index.js');
    const { subscriptions } = await import('../db/schema/index.js');
    const { eq } = await import('drizzle-orm');

    await db
      .update(subscriptions)
      .set({
        status: 'canceled',
        canceledAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
  } catch (error) {
    console.error('❌ Error handling subscription deletion:', error);
  }
}

async function handleChargeCaptured(charge) {
  console.log('💳 Charge Captured:', charge.id);
}

async function handleDisputeUpdated(dispute) {
  console.log('⚖️ Dispute Updated:', dispute.id);
}

async function handleDisputeClosed(dispute) {
  console.log('⚖️ Dispute Closed:', dispute.id);
}

async function handleRefundCreated(refund) {
  console.log('💸 Refund Created:', refund.id);
}

async function handleRefundUpdated(refund) {
  console.log('💸 Refund Updated:', refund.id);
}

async function handleCustomerCreated(customer) {
  console.log('👤 Customer Created:', customer.id);
}

async function handleCustomerUpdated(customer) {
  console.log('👤 Customer Updated:', customer.id);
}

async function handleCustomerDeleted(customer) {
  console.log('👤 Customer Deleted:', customer.id);
}

async function handleCheckoutSessionCompleted(session) {
  console.log('🛒 Checkout Session Completed:', session.id);

  try {
    const tenantId = session.metadata?.tenantId;
    if (!tenantId) {
      console.warn('⚠️ No tenantId in checkout session metadata');
      return;
    }

    // Get plan details from metadata
    const planId = session.metadata?.planId || session.metadata?.packageId;
    const billingCycle = session.metadata?.billingCycle || 'yearly';
    if (!planId) {
      console.warn('⚠️ No planId in checkout session metadata');
      return;
    }

    // Import SubscriptionService for processing
    const { SubscriptionService } = await import('../services/subscription-service.js');

    // Get plan configuration from available plans
    const availablePlans = await SubscriptionService.getAvailablePlans();
    const planDetails = availablePlans.find(p => p.id === planId);
    if (!planDetails) {
      console.warn(`⚠️ Could not find plan details for planId: ${planId}`);
      return;
    }

    // Create compatible planConfig object for processApplicationPlanSubscription
    const planConfig = {
      id: planDetails.id,
      amount: billingCycle === 'yearly' ? planDetails.yearlyPrice * 100 : planDetails.monthlyPrice * 100, // Convert dollars to cents
      credits: planDetails.freeCredits || 0,
      billingCycle: billingCycle
    };

    // Update tenant with customer ID if available
    if (session.customer) {
      const { db } = await import('../db/index.js');
      const { tenants } = await import('../db/schema/index.js');
      const { eq } = await import('drizzle-orm');

      await db
        .update(tenants)
        .set({
          stripeCustomerId: session.customer,
          updatedAt: new Date()
        })
        .where(eq(tenants.tenantId, tenantId));

      console.log(`✅ Updated tenant ${tenantId} with Stripe customer ID: ${session.customer}`);
    }

    // Create or update subscription record
    if (session.mode === 'subscription') {
      // For subscription mode, create/update subscription record
      await SubscriptionService.processApplicationPlanSubscription(
        tenantId,
        planConfig,
        session.subscription,
        session.customer
      );

      console.log(`✅ Subscription record created/updated for tenant ${tenantId}, plan ${planId}`);
    } else if (session.mode === 'payment') {
      // For payment mode (credit purchases), the credit processing happens via invoice payment webhook
      console.log(`💳 Credit purchase session completed for tenant ${tenantId}, plan ${planId}`);
    }

  } catch (error) {
    console.error('❌ Error handling checkout session completion:', error);
    throw error;
  }
}

async function handleCheckoutSessionExpired(session) {
  console.log('🛒 Checkout Session Expired:', session.id);
} 