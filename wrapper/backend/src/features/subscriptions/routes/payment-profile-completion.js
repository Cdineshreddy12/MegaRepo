import { db } from '../../../db/index.js';
import { tenants, tenantUsers } from '../../../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function paymentProfileCompletionRoutes(fastify, options) {

  // Get profile completion requirements
  fastify.get('/onboarding/profile-requirements/:tenantId', {
    schema: {
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;

      const organization = await db
        .select({
          tenantId: tenants.tenantId,
          onboardingStatus: tenants.onboardingStatus,
          completedSteps: tenants.completedSteps,
          completionRequired: tenants.completionRequired,
          organizationName: tenants.organizationName,
          gstin: tenants.gstin,
          mobile: tenants.mobile
        })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (organization.length === 0) {
        return reply.code(404).send({
          success: false,
          error: 'Organization not found'
        });
      }

      const org = organization[0];

      // Define required fields for completion
      const profileRequirements = {
        business_details: {
          title: 'Business Information',
          required: true,
          fields: [
            {
              name: 'legalCompanyName',
              label: 'Legal Company Name',
              type: 'text',
              required: true,
              placeholder: 'Enter legal registered company name'
            },
            {
              name: 'industry',
              label: 'Industry',
              type: 'select',
              required: true,
              options: [
                'Technology', 'Healthcare', 'Finance', 'Manufacturing',
                'Retail', 'Education', 'Consulting', 'Real Estate',
                'Transportation', 'Food & Beverage', 'Other'
              ]
            },
            {
              name: 'companySize',
              label: 'Company Size',
              type: 'select',
              required: true,
              options: ['1-10', '11-50', '51-200', '201-1000', '1000+']
            },
            {
              name: 'website',
              label: 'Company Website',
              type: 'url',
              required: false,
              placeholder: 'https://www.company.com'
            }
          ]
        },
        billing_address: {
          title: 'Billing Address',
          required: true,
          fields: [
            {
              name: 'billingStreet',
              label: 'Street Address',
              type: 'text',
              required: true,
              placeholder: '123 Business Street'
            },
            {
              name: 'billingCity',
              label: 'City',
              type: 'text',
              required: true,
              placeholder: 'Mumbai'
            },
            {
              name: 'billingState',
              label: 'State',
              type: 'text',
              required: true,
              placeholder: 'Maharashtra'
            },
            {
              name: 'billingZip',
              label: 'ZIP/Postal Code',
              type: 'text',
              required: true,
              placeholder: '400001'
            },
            {
              name: 'billingCountry',
              label: 'Country',
              type: 'select',
              required: true,
              options: ['India', 'United States', 'United Kingdom', 'Other']
            }
          ]
        },
        contact_details: {
          title: 'Contact Information',
          required: true,
          fields: [
            {
              name: 'phone',
              label: 'Business Phone',
              type: 'tel',
              required: true,
              placeholder: '+91-22-1234-5678'
            },
            {
              name: 'fax',
              label: 'Fax Number',
              type: 'tel',
              required: false,
              placeholder: '+91-22-1234-5679'
            }
          ]
        },
        payment_method: {
          title: 'Payment Method',
          required: true,
          fields: [
            {
              name: 'paymentMethod',
              label: 'Payment Method',
              type: 'select',
              required: true,
              options: ['Credit Card', 'Debit Card', 'Net Banking', 'UPI']
            }
          ]
        }
      };

      // Mark completed requirements
      const requirementsStatus = {};
      Object.keys(profileRequirements).forEach(key => {
        requirementsStatus[key] = {
          ...profileRequirements[key],
          completed: org.completedSteps.includes(key)
        };
      });

      return reply.send({
        success: true,
        data: {
          organization: {
            tenantId: org.tenantId,
            organizationName: org.organizationName,
            gstin: org.gstin,
            mobile: org.mobile,
            onboardingStatus: org.onboardingStatus
          },
          requirements: requirementsStatus,
          completionProgress: {
            completed: org.completedSteps.length,
            total: Object.keys(profileRequirements).length,
            percentage: Math.round((org.completedSteps.length / Object.keys(profileRequirements).length) * 100)
          }
        }
      });

    } catch (error) {
      console.error('❌ Profile requirements fetch failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch requirements',
        message: 'Unable to retrieve profile completion requirements'
      });
    }
  });

  // Complete profile with payment
  fastify.post('/onboarding/complete-profile-with-payment', {
    schema: {
      body: {
        type: 'object',
        required: ['tenantId', 'profileData', 'paymentData'],
        properties: {
          tenantId: { type: 'string' },
          profileData: {
            type: 'object',
            properties: {
              legalCompanyName: { type: 'string' },
              industry: { type: 'string' },
              companySize: { type: 'string' },
              website: { type: 'string' },
              billingStreet: { type: 'string' },
              billingCity: { type: 'string' },
              billingState: { type: 'string' },
              billingZip: { type: 'string' },
              billingCountry: { type: 'string' },
              phone: { type: 'string' },
              fax: { type: 'string' }
            }
          },
          paymentData: {
            type: 'object',
            required: ['paymentMethodId', 'planId'],
            properties: {
              paymentMethodId: { type: 'string' },
              planId: { type: 'string' },
              billingCycle: { type: 'string', enum: ['monthly', 'yearly'] }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { tenantId, profileData, paymentData } = request.body;

    try {
      console.log('💳 Starting profile completion with payment for tenant:', tenantId);

      // Verify organization exists and is in correct state
      const organization = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (organization.length === 0) {
        return reply.code(404).send({
          success: false,
          error: 'Organization not found'
        });
      }

      const org = organization[0];

      if (org.onboardingStatus === 'completed') {
        return reply.code(400).send({
          success: false,
          error: 'Already completed',
          message: 'Organization onboarding is already completed'
        });
      }

      // Step 1: Process payment
      console.log('💳 Processing payment...');
      const paymentResult = await processStripePayment(paymentData);

      if (!paymentResult.success) {
        return reply.code(400).send({
          success: false,
          error: 'Payment failed',
          message: paymentResult.message
        });
      }

      // Step 2: Complete profile
      console.log('📝 Completing profile...');
      await db.update(tenants)
        .set({
          ...profileData,
          stripeCustomerId: paymentResult.customerId,
          onboardingStatus: 'completed',
          completedSteps: ['basic_info', 'business_details', 'billing_info', 'payment_method'],
          completionRequired: [],
          onboardingCompleted: true,
          isVerified: true,
          subscriptionStatus: 'active',
          updatedAt: new Date()
        })
        .where(eq(tenants.tenantId, tenantId));

      // Step 3: Update subscription to paid plan
      await updateSubscriptionToPaid(tenantId, paymentData, paymentResult);

      // Step 4: Send completion confirmation
      await sendCompletionConfirmation(org, profileData);

      console.log('✅ Profile completion with payment successful');

      return reply.send({
        success: true,
        message: 'Profile completed and payment processed successfully',
        data: {
          tenantId,
          subscriptionId: paymentResult.subscriptionId,
          onboardingStatus: 'completed',
          nextStep: 'dashboard'
        }
      });

    } catch (error) {
      console.error('❌ Profile completion with payment failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Completion failed',
        message: 'Failed to complete profile and process payment'
      });
    }
  });

  // Update profile after initial completion
  fastify.put('/onboarding/update-profile/:tenantId', {
    schema: {
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          legalCompanyName: { type: 'string' },
          industry: { type: 'string' },
          companySize: { type: 'string' },
          website: { type: 'string' },
          billingStreet: { type: 'string' },
          billingCity: { type: 'string' },
          billingState: { type: 'string' },
          billingZip: { type: 'string' },
          billingCountry: { type: 'string' },
          phone: { type: 'string' },
          fax: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;
      const updates = request.body;

      // Update organization profile
      await db.update(tenants)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(tenants.tenantId, tenantId));

      return reply.send({
        success: true,
        message: 'Profile updated successfully'
      });

    } catch (error) {
      console.error('❌ Profile update failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Update failed',
        message: 'Failed to update profile'
      });
    }
  });
}

// Helper function to process Stripe payment
async function processStripePayment(paymentData) {
  try {
    const { paymentMethodId, planId, billingCycle = 'monthly' } = paymentData;

    // Create or retrieve customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: paymentData.customerEmail,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: paymentData.customerEmail,
        name: paymentData.customerName,
        payment_method: paymentMethodId,
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{
        price: getPriceId(planId, billingCycle)
      }],
      default_payment_method: paymentMethodId,
      expand: ['latest_invoice.payment_intent']
    });

    return {
      success: true,
      customerId: customer.id,
      subscriptionId: subscription.id,
      invoiceId: subscription.latest_invoice.id
    };

  } catch (error) {
    console.error('❌ Stripe payment processing failed:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Helper function to update subscription
async function updateSubscriptionToPaid(tenantId, paymentData, paymentResult) {
  // Update subscription from trial to paid
  await db.update(subscriptions)
    .set({
      plan: paymentData.planId,
      status: 'active',
      stripeSubscriptionId: paymentResult.subscriptionId,
      stripeCustomerId: paymentResult.customerId,
      billingCycle: paymentData.billingCycle,
      subscriptionStatus: 'active',
      trialStatus: 'upgraded',
      updatedAt: new Date()
    })
    .where(eq(subscriptions.tenantId, tenantId));
}

// Helper function to get Stripe price ID
function getPriceId(planId, billingCycle) {
  const priceIds = {
    starter: {
      monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
      yearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID
    },
    professional: {
      monthly: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID,
      yearly: process.env.STRIPE_PROFESSIONAL_YEARLY_PRICE_ID
    },
    enterprise: {
      monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
      yearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID
    }
  };

  return priceIds[planId]?.[billingCycle] || priceIds.starter.monthly;
}

// Helper function to send completion confirmation
async function sendCompletionConfirmation(organization, profileData) {
  // This would integrate with your email service
  console.log('📧 Sending completion confirmation to:', organization.adminEmail);

  // Implementation would depend on your email service
  // await EmailService.sendCompletionConfirmation({
  //   to: organization.adminEmail,
  //   organization: organization,
  //   profileData: profileData
  // });
}
