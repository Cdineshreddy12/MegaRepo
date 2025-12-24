import { db, systemDbConnection } from '../../../db/index.js';
import { credits, creditTransactions, creditPurchases, creditConfigurations, applications as applicationsTable, applicationModules } from '../../../db/schema/index.js';
import { eq, and, desc, gte, lte, sql, or, isNull, inArray, isNotNull } from 'drizzle-orm';
// REMOVED: CreditAllocationService - Application-specific allocations removed completely
import Stripe from 'stripe';
import { randomUUID } from 'crypto';
import { crmSyncStreams } from '../../../utils/redis.js';

// Supported applications (for operation code extraction)
const SUPPORTED_APPLICATIONS = ['crm', 'hr', 'affiliate', 'system'];

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export class CreditService {
  /**
   * Generate operation codes for permissions
   * Format: {appCode}.{moduleCode}.{permissionCode}
   */
  static generatePermissionOperationCodes(appCode, moduleCode, permissions) {
    const operationCodes = [];

    if (Array.isArray(permissions)) {
      permissions.forEach(permission => {
        const permissionCode = typeof permission === 'string' ? permission : permission.code;
        operationCodes.push(`${appCode}.${moduleCode}.${permissionCode}`);
      });
    }

    return operationCodes;
  }

  /**
   * Get permission-based operation code
   */
  static getPermissionOperationCode(appCode, moduleCode, permissionCode) {
    return `${appCode}.${moduleCode}.${permissionCode}`;
  }

  /**
   * Extract application code from operation code
   * Operation codes follow the pattern: {appCode}.{moduleCode}.{permissionCode}
   * e.g., 'crm.leads.create', 'hr.payroll.process'
   */
  static extractApplicationFromOperationCode(operationCode) {
    if (!operationCode || typeof operationCode !== 'string') {
      return null;
    }

    const parts = operationCode.split('.');
    if (parts.length >= 2 && SUPPORTED_APPLICATIONS.includes(parts[0])) {
      return parts[0];
    }

    return null;
  }
  /**
   * Initialize credit record for an entity if it doesn't exist
   */
  static async ensureCreditRecord(tenantId, entityType = 'organization', entityId = null, initialCredits = 0) {
    try {
      const searchEntityId = entityId || tenantId;

      // First, validate that the entity exists in the entities table
      const { entities } = await import('../db/schema/index.js');
      const [existingEntity] = await db
        .select()
        .from(entities)
        .where(and(
          eq(entities.entityId, searchEntityId),
          eq(entities.tenantId, tenantId),
          eq(entities.isActive, true)
        ))
        .limit(1);

      if (!existingEntity) {
        // If entity doesn't exist, we cannot create a credit record
        console.warn(`Cannot create credit record: Entity ${searchEntityId} does not exist in entities table`);
        return false;
      }

      // Check if credit record exists
      const [existingRecord] = await db
        .select()
        .from(credits)
        .where(and(
          eq(credits.tenantId, tenantId),
          eq(credits.entityId, searchEntityId)
        ))
        .limit(1);

      if (!existingRecord) {
        // Create new credit record
        await db
          .insert(credits)
          .values({
            tenantId,
            entityId: searchEntityId,
            availableCredits: initialCredits.toString(),
            reservedCredits: '0',
            isActive: true,
            lastUpdatedAt: new Date(),
            createdAt: new Date()
          });

        return true; // Record created
      }

      return false; // Record already existed
    } catch (error) {
      console.error('Error ensuring credit record:', error);
      throw error;
    }
  }

  /**
   * Initialize credits for a tenant (temporary method for testing)
   */
  static async initializeTenantCredits(tenantId, initialCredits = 1000) {
    try {
      console.log(`🎯 Initializing ${initialCredits} credits for tenant: ${tenantId}`);

      // Find root organization for the tenant
      const rootOrgId = await this.findRootOrganization(tenantId);
      if (!rootOrgId) {
        throw new Error(`Cannot initialize credits: Root organization not found for tenant ${tenantId}`);
      }

      // Use the existing addCreditsToEntity method
      const result = await this.addCreditsToEntity({
        tenantId,
        entityType: 'organization',
        entityId: rootOrgId, // Use root organization entityId
        creditAmount: initialCredits,
        source: 'initialization',
        sourceId: 'system_setup',
        description: 'Initial credit allocation for testing',
        initiatedBy: 'system'
      });

      console.log('✅ Credits initialized successfully');
      return result;
    } catch (error) {
      console.error('❌ Failed to initialize credits:', error);
      throw error;
    }
  }

  /**
   * Get current credit balance for a tenant or specific entity
   */
  static async getCurrentBalance(tenantId, entityType = 'organization', entityId = null) {
    try {
      // Normalize entity parameters to match addCreditsToEntity method
      const normalizedEntityType = entityType || 'organization';
      const searchEntityId = entityId || tenantId;

      console.log('🔍 Getting current balance with normalized parameters:', {
        tenantId,
        originalEntityType: entityType,
        normalizedEntityType,
        originalEntityId: entityId,
        searchEntityId
      });

      const [creditBalance] = await db
        .select()
        .from(credits)
        .where(and(
          eq(credits.tenantId, tenantId),
          eq(credits.entityId, searchEntityId)
        ))
        .limit(1);

      if (!creditBalance) {
        // Return default structure for entities without credit records
        return {
          tenantId: tenantId,
          entityId: searchEntityId,
          availableCredits: 0,
          reservedCredits: 0,
          lowBalanceThreshold: 100,
          criticalBalanceThreshold: 10,
          lastPurchase: null,
          creditExpiry: null,
          plan: 'credit_based',
          status: 'no_credits',
          usageThisPeriod: 0,
          periodLimit: 0,
          periodType: 'month',
          alerts: [{
            id: 'no_credit_record',
            type: 'no_credit_record',
            severity: 'info',
            title: 'No Credit Record',
            message: 'This entity does not have a credit record yet',
            threshold: 0,
            currentValue: 0,
            actionRequired: 'initialize_credits'
          }]
        };
      }

      // Calculate alerts based on current balance
      const alerts = [];

      if (creditBalance.availableCredits <= creditBalance.criticalBalanceThreshold) {
        alerts.push({
          id: 'critical_balance',
          type: 'critical_balance',
          severity: 'critical',
          title: 'Critical Credit Balance',
          message: `You have only ${creditBalance.availableCredits} credits remaining`,
          threshold: creditBalance.criticalBalanceThreshold,
          currentValue: creditBalance.availableCredits,
          actionRequired: 'purchase_credits'
        });
      } else if (creditBalance.availableCredits <= creditBalance.lowBalanceThreshold) {
        alerts.push({
          id: 'low_balance',
          type: 'low_balance',
          severity: 'warning',
          title: 'Low Credit Balance',
          message: `You have ${creditBalance.availableCredits} credits remaining`,
          threshold: creditBalance.lowBalanceThreshold,
          currentValue: creditBalance.availableCredits,
          actionRequired: 'purchase_credits'
        });
      }

      // Check for expiring credits
      if (creditBalance.creditExpiry) {
        const daysUntilExpiry = Math.floor(
          (new Date(creditBalance.creditExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
          alerts.push({
            id: 'expiry_warning',
            type: 'expiry_warning',
            severity: daysUntilExpiry <= 7 ? 'critical' : 'warning',
            title: 'Credits Expiring Soon',
            message: `${creditBalance.availableCredits} credits expire in ${daysUntilExpiry} days`,
            threshold: daysUntilExpiry,
            currentValue: creditBalance.availableCredits,
            actionRequired: 'purchase_credits'
          });
        }
      }

      // REMOVED: Application credit allocations check - applications manage their own credits
      // Applications consume directly from organization balance in credits table

      // Categorize credits by analyzing transactions and allocations
      let freeCredits = 0;
      let paidCredits = 0;
      let seasonalCredits = 0;
      let freeCreditsExpiry = null;
      let paidCreditsExpiry = null;
      let seasonalCreditsExpiry = null;
      
      // Get subscription expiry date (for free credits from subscription)
      let subscriptionExpiry = null;
      try {
        const { subscriptions } = await import('../../../db/schema/subscriptions.js');
        const [subscription] = await db
          .select({
            currentPeriodEnd: subscriptions.currentPeriodEnd,
            plan: subscriptions.plan
          })
          .from(subscriptions)
          .where(and(
            eq(subscriptions.tenantId, tenantId),
            eq(subscriptions.status, 'active')
          ))
          .limit(1);
        
        if (subscription?.currentPeriodEnd) {
          subscriptionExpiry = new Date(subscription.currentPeriodEnd).toISOString();
          // Free credits from subscription expire with subscription
          freeCreditsExpiry = subscriptionExpiry;
        }
      } catch (subError) {
        console.warn('⚠️ Error fetching subscription expiry:', subError.message);
      }

      // Analyze credit transactions to categorize credits
      try {
        // Get all purchase transactions for this entity
        const purchaseTransactions = await db
          .select()
          .from(creditTransactions)
          .where(and(
            eq(creditTransactions.tenantId, tenantId),
            eq(creditTransactions.entityId, searchEntityId),
            eq(creditTransactions.transactionType, 'purchase')
          ))
          .orderBy(desc(creditTransactions.createdAt));

        // Categorize credits based on operation_code and source
        for (const transaction of purchaseTransactions) {
          const amount = parseFloat(transaction.amount || 0);
          const operationCode = transaction.operationCode || '';
          
          // Free credits: from onboarding, subscription, or system allocations
          if (operationCode === 'onboarding' || 
              operationCode === 'subscription' || 
              operationCode === 'trial' ||
              operationCode === 'system') {
            freeCredits += amount;
            // Free credits expire with subscription if available
            if (!freeCreditsExpiry && subscriptionExpiry) {
              freeCreditsExpiry = subscriptionExpiry;
            }
          }
          // Paid credits: from purchases (stripe, manual purchase)
          else if (operationCode === 'purchase' || 
                   operationCode === 'stripe' ||
                   operationCode === 'manual_purchase') {
            paidCredits += amount;
            // Paid credits never expire (null expiry)
            paidCreditsExpiry = null;
          }
        }
      } catch (txError) {
        console.warn('⚠️ Error analyzing credit transactions:', txError.message);
        // Fallback: assume all credits are free if we can't analyze
        freeCredits = parseFloat(creditBalance.availableCredits || 0);
      }

      // Get seasonal credit allocations with expiry dates
      let earliestExpiry = null;
      let applicationExpiryDates = {};
      
      try {
        const { seasonalCreditAllocations } = await import('../../../db/schema/seasonal-credits.js');
        
        // Get all active, non-expired allocations for this entity
        const activeAllocations = await db
          .select({
            allocatedCredits: seasonalCreditAllocations.allocatedCredits,
            usedCredits: seasonalCreditAllocations.usedCredits,
            expiresAt: seasonalCreditAllocations.expiresAt,
            targetApplication: seasonalCreditAllocations.targetApplication
          })
          .from(seasonalCreditAllocations)
          .where(and(
            eq(seasonalCreditAllocations.tenantId, tenantId),
            eq(seasonalCreditAllocations.entityId, searchEntityId),
            eq(seasonalCreditAllocations.isActive, true),
            eq(seasonalCreditAllocations.isExpired, false),
            isNotNull(seasonalCreditAllocations.expiresAt),
            gte(seasonalCreditAllocations.expiresAt, new Date())
          ))
          .orderBy(seasonalCreditAllocations.expiresAt);

        // Calculate seasonal credits and find earliest expiry
        for (const allocation of activeAllocations) {
          const allocated = parseFloat(allocation.allocatedCredits || 0);
          const used = parseFloat(allocation.usedCredits || 0);
          const available = allocated - used;
          seasonalCredits += available;
          
          const expiryDate = new Date(allocation.expiresAt);
          if (!seasonalCreditsExpiry || expiryDate < new Date(seasonalCreditsExpiry)) {
            seasonalCreditsExpiry = expiryDate.toISOString();
          }
          
          if (!earliestExpiry || expiryDate < new Date(earliestExpiry)) {
            earliestExpiry = expiryDate.toISOString();
          }

          // Group by application
          const appKey = allocation.targetApplication || 'primary_org';
          if (!applicationExpiryDates[appKey] || expiryDate < new Date(applicationExpiryDates[appKey])) {
            applicationExpiryDates[appKey] = expiryDate.toISOString();
          }
        }
        
      } catch (expiryError) {
        console.warn('⚠️ Error fetching seasonal credit expiry:', expiryError.message);
      }

      // If we couldn't categorize from transactions, use total as free credits (onboarding scenario)
      const totalAvailable = parseFloat(creditBalance.availableCredits || 0);
      if (freeCredits === 0 && paidCredits === 0 && seasonalCredits === 0 && totalAvailable > 0) {
        // Likely onboarding credits - categorize as free
        freeCredits = totalAvailable;
        if (subscriptionExpiry) {
          freeCreditsExpiry = subscriptionExpiry;
        }
      }

      return {
        tenantId: creditBalance.tenantId,
        entityId: creditBalance.entityId,
        availableCredits: totalAvailable,
        freeCredits: freeCredits,
        paidCredits: paidCredits,
        seasonalCredits: seasonalCredits,
        reservedCredits: parseFloat(creditBalance.reservedCredits || 0),
        lowBalanceThreshold: 100,
        criticalBalanceThreshold: 10,
        lastPurchase: creditBalance.lastUpdatedAt,
        creditExpiry: earliestExpiry || freeCreditsExpiry, // Overall earliest expiry
        freeCreditsExpiry: freeCreditsExpiry, // Free credits expiry (subscription expiry)
        paidCreditsExpiry: paidCreditsExpiry, // Paid credits expiry (null = never expires)
        seasonalCreditsExpiry: seasonalCreditsExpiry, // Seasonal credits expiry
        subscriptionExpiry: subscriptionExpiry, // Subscription plan expiry
        applicationExpiryDates: applicationExpiryDates,
        plan: 'credit_based',
        status: totalAvailable > 0 ? 'active' : 'insufficient_credits',
        usageThisPeriod: 0,
        periodLimit: 0,
        periodType: 'month',
        alerts
      };
    } catch (error) {
      console.error('Error fetching current credit balance:', error);
      throw error;
    }
  }

  /**
   * Get the entity/organization ID for a user
   */
  static async getUserEntityId(tenantId, userId) {
    try {
      // Find the user in tenantUsers to get their organization
      const [userRecord] = await db
        .select({
          entityId: tenantUsers.entityId,
          organizationId: tenantUsers.organizationId
        })
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.kindeUserId, userId),
          eq(tenantUsers.isActive, true)
        ))
        .limit(1);

      // Return entityId if available, otherwise organizationId as fallback
      return userRecord?.entityId || userRecord?.organizationId || null;
    } catch (error) {
      console.error('Error getting user entity ID:', error);
      return null;
    }
  }

  /**
   * Get transaction history for a tenant
   */
  static async getTransactionHistory(tenantId, filters = {}) {
    try {
      const { page = 1, limit = 50, type, startDate, endDate } = filters;

      let query = db
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.tenantId, tenantId));

      if (type) {
        query = query.where(eq(creditTransactions.transactionType, type));
      }

      if (startDate) {
        query = query.where(gte(creditTransactions.createdAt, new Date(startDate)));
      }

      if (endDate) {
        query = query.where(lte(creditTransactions.createdAt, new Date(endDate)));
      }

      const transactions = await query
        .orderBy(desc(creditTransactions.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      const totalCount = await db
        .select({ count: sql`count(*)` })
        .from(creditTransactions)
        .where(eq(creditTransactions.tenantId, tenantId));

      return {
        transactions: transactions.map(t => ({
          id: t.transactionId,
          type: t.transactionType,
          amount: parseFloat(t.amount),
          previousBalance: parseFloat(t.previousBalance || 0),
          newBalance: parseFloat(t.newBalance || 0),
          description: t.description,
          operationCode: t.operationCode,
          createdAt: t.createdAt
        })),
        pagination: {
          page,
          limit,
          total: parseInt(totalCount[0].count),
          pages: Math.ceil(parseInt(totalCount[0].count) / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  }

  // REMOVED: getActiveAlerts - Alert system removed for MVP simplicity

  /**
   * Purchase credits for a tenant
   */
  static async purchaseCredits({
    tenantId,
    userId,
    creditAmount,
    paymentMethod,
    currency = 'USD',
    notes,
    entityType = 'organization', // New parameter for hierarchical support
    entityId = null, // New parameter for hierarchical support
    isWebhookCompletion = false, // Flag for webhook completion
    sessionId = null // Stripe session ID for webhook completion
  }) {
    try {
      // If entityId is not provided, find the root organization for the tenant
      let finalEntityId = entityId;
      if (!finalEntityId) {
        console.log('🔍 No entityId provided for credit purchase, finding root organization...');
        const rootOrgId = await this.findRootOrganization(tenantId);
        if (rootOrgId) {
          finalEntityId = rootOrgId;
          console.log(`✅ Using root organization for credit purchase: ${finalEntityId}`);
        } else {
          console.warn('⚠️ Root organization not found, will use tenantId as fallback');
          finalEntityId = tenantId;
        }
      }

      console.log('💰 Processing credit purchase:', {
        tenantId,
        creditAmount,
        paymentMethod,
        isWebhookCompletion,
        sessionId,
        entityId: finalEntityId
      });

      // Calculate unit price (example pricing)
      const unitPrice = 0.10; // $0.10 per credit
      const totalAmount = creditAmount * unitPrice;

      let purchase;

      // For webhook completion, find existing purchase by session ID
      if (isWebhookCompletion && sessionId) {
        console.log('🔍 Finding existing purchase for webhook completion...');
        const [existingPurchase] = await db
          .select()
          .from(creditPurchases)
          .where(eq(creditPurchases.stripePaymentIntentId, sessionId))
          .limit(1);

        if (existingPurchase) {
          console.log('✅ Found existing purchase:', existingPurchase.purchaseId);

          // Update purchase status to completed
          await db
            .update(creditPurchases)
            .set({
              status: 'completed',
              paymentStatus: 'completed',
              completedAt: new Date(),
              processedBy: userId || '00000000-0000-0000-0000-000000000001'
            })
            .where(eq(creditPurchases.purchaseId, existingPurchase.purchaseId));

          // Create updated purchase object with correct status
          purchase = {
            ...existingPurchase,
            status: 'completed',
            paymentStatus: 'completed',
            completedAt: new Date(),
            processedBy: userId || '00000000-0000-0000-0000-000000000001'
          };
        } else {
          console.log('⚠️ No existing purchase found, creating new one for webhook completion');
          // Fall through to create new purchase
        }
      }

      // Create new purchase record if not found or not webhook completion
      if (!purchase) {
        console.log('📝 Creating new purchase record...');
        const [newPurchase] = await db
          .insert(creditPurchases)
          .values({
            tenantId,
            entityType,
            entityId: finalEntityId,
            creditAmount: creditAmount.toString(),
            currency,
            unitPrice: unitPrice.toString(),
            totalAmount: totalAmount.toString(),
            finalAmount: totalAmount.toString(), // Required field
            batchId: randomUUID(), // Required UUID field
            paymentMethod,
            status: isWebhookCompletion ? 'completed' : 'pending',
            paymentStatus: isWebhookCompletion ? 'completed' : 'pending',
            requestedBy: userId || '00000000-0000-0000-0000-000000000001', // System user UUID fallback
            processedBy: isWebhookCompletion ? (userId || '00000000-0000-0000-0000-000000000001') : null,
            completedAt: isWebhookCompletion ? new Date() : null,
            notes
          })
          .returning();

        purchase = newPurchase;

        // Update with Stripe session ID if provided
        if (sessionId) {
          await db
            .update(creditPurchases)
            .set({
              stripePaymentIntentId: sessionId
            })
            .where(eq(creditPurchases.purchaseId, purchase.purchaseId));
        }
      }

      // Add credits to the appropriate entity balance (always do this for completed purchases)
      console.log('🔍 Checking purchase status for credit allocation:', {
        purchaseId: purchase.purchaseId,
        status: purchase.status,
        paymentStatus: purchase.paymentStatus,
        isWebhookCompletion
      });

      if (purchase.status === 'completed') {
        console.log('💰 Adding credits to entity balance - CALLING addCreditsToEntity...');
        console.log('📋 Purchase details for credit allocation:', {
          purchaseId: purchase.purchaseId,
          stripePaymentIntentId: purchase.stripePaymentIntentId,
          sourceId: purchase.stripePaymentIntentId || purchase.purchaseId
        });
        try {
          await this.addCreditsToEntity({
            tenantId,
            entityType,
            entityId: finalEntityId,
            creditAmount,
            source: 'purchase',
            sourceId: purchase.stripePaymentIntentId || purchase.purchaseId,
            description: `Credit purchase: ${creditAmount} credits`,
            initiatedBy: userId || '00000000-0000-0000-0000-000000000001'
          });
          console.log('✅ addCreditsToEntity completed successfully');
        } catch (creditError) {
          console.error('❌ addCreditsToEntity failed:', creditError.message);
          throw creditError;
        }
      } else {
        console.log('⚠️ Purchase status is not completed, skipping credit allocation');
      }

      // If using Stripe and not webhook completion, create checkout session
      if (paymentMethod === 'stripe' && !isWebhookCompletion) {
        console.log('💳 Creating Stripe checkout session...');
        const checkoutSession = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: `${creditAmount} Credits`,
                description: `Purchase ${creditAmount} credits for your account`
              },
              unit_amount: Math.round(totalAmount * 100) // Convert to cents
            },
            quantity: 1
          }],
          mode: 'payment',
          success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.FRONTEND_URL}/billing/cancel`,
          metadata: {
            tenantId,
            userId,
            purchaseId: purchase.purchaseId,
            creditAmount: creditAmount.toString(),
            entityType,
            entityId: finalEntityId, // Use root organization, not tenantId
            unitPrice: unitPrice.toString(),
            totalAmount: totalAmount.toString()
          }
        });

        // Update purchase with Stripe session ID
        await db
          .update(creditPurchases)
          .set({
            stripePaymentIntentId: checkoutSession.id
          })
          .where(eq(creditPurchases.purchaseId, purchase.purchaseId));

        return {
          purchaseId: purchase.purchaseId,
          checkoutUrl: checkoutSession.url,
          amount: totalAmount,
          credits: creditAmount
        };
      }

      return {
        purchaseId: purchase.purchaseId,
        amount: totalAmount,
        credits: creditAmount,
        status: purchase.status
      };
    } catch (error) {
      console.error('Error processing credit purchase:', error);
      throw error;
    }
  }

  /**
   * Get all credit configurations for a tenant (tenant-specific + global fallback)
   */
  static async getTenantConfigurations(tenantId) {
    try {
      console.log('🔍 Getting tenant configurations for:', tenantId);

      // Get tenant-specific configurations with error handling
      const [tenantOperations, tenantModules, tenantApps] = await Promise.all([
        this.getTenantOperationConfigs(tenantId).catch(() => []),
        Promise.resolve([]), // Module configs removed for MVP simplicity
        Promise.resolve([])  // App configs removed for MVP simplicity
      ]);

      // Get global configurations as fallback with error handling
      const [globalOperations, globalModules, globalApps] = await Promise.all([
        this.getGlobalOperationConfigs().catch(() => []),
        this.getGlobalModuleConfigs().catch(() => []),
        this.getGlobalAppConfigs().catch(() => [])
      ]);

      return {
        tenantId,
        configurations: {
          operations: tenantOperations,
          modules: tenantModules,
          apps: tenantApps
        },
        globalConfigs: {
          operations: globalOperations,
          modules: globalModules,
          apps: globalApps
        }
      };
    } catch (error) {
      console.error('Error getting tenant configurations:', error);
      // Return empty configuration structure if tables don't exist
      return {
        tenantId,
        configurations: {
          operations: [],
          modules: [],
          apps: []
        },
        globalConfigs: {
          operations: [],
          modules: [],
          apps: []
        }
      };
    }
  }

  /**
   * Get tenant-specific operation configurations
   */
  static async getTenantOperationConfigs(tenantId) {
    try {
      // Use system database connection for admin operations (bypasses RLS)
      const configs = await systemDbConnection
        .select()
        .from(creditConfigurations)
        .where(and(
          eq(creditConfigurations.tenantId, tenantId),
          eq(creditConfigurations.isGlobal, false)
        ))
        .orderBy(creditConfigurations.operationCode);

      return configs.map(config => ({
        configId: config.configId,
        operationCode: config.operationCode,
        creditCost: parseFloat(config.creditCost),
        unit: config.unit,
        unitMultiplier: parseFloat(config.unitMultiplier),
        freeAllowance: config.freeAllowance,
        freeAllowancePeriod: config.freeAllowancePeriod,
        volumeTiers: config.volumeTiers || [],
        allowOverage: config.allowOverage,
        overageLimit: config.overageLimit,
        overagePeriod: config.overagePeriod,
        overageCost: config.overageCost ? parseFloat(config.overageCost) : null,
        isActive: config.isActive,
        isCustomized: config.isCustomized,
        priority: config.priority,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      }));
    } catch (error) {
      // If table doesn't exist, return empty array
      if (error.message.includes('does not exist') || error.code === '42P01') {
        return [];
      }
      console.error('Error getting tenant operation configs:', error);
      throw error;
    }
  }

  // REMOVED: getTenantModuleConfigs - Module-level configs removed for MVP simplicity

  // REMOVED: getTenantAppConfigs - App-level configs removed for MVP simplicity

  /**
   * Get global operation configurations
   */
  static async getGlobalOperationConfigs() {
    try {
      // Use system database connection for admin operations (bypasses RLS)
      const configs = await systemDbConnection
        .select()
        .from(creditConfigurations)
        .where(eq(creditConfigurations.isGlobal, true))
        .orderBy(creditConfigurations.operationCode);

      return configs.map(config => ({
        configId: config.configId,
        operationCode: config.operationCode,
        creditCost: parseFloat(config.creditCost),
        unit: config.unit,
        unitMultiplier: parseFloat(config.unitMultiplier),
        freeAllowance: config.freeAllowance,
        freeAllowancePeriod: config.freeAllowancePeriod,
        volumeTiers: config.volumeTiers || [],
        allowOverage: config.allowOverage,
        overageLimit: config.overageLimit,
        overagePeriod: config.overagePeriod,
        overageCost: config.overageCost ? parseFloat(config.overageCost) : null,
        isActive: config.isActive,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      }));
    } catch (error) {
      // If table doesn't exist, return empty array
      if (error.message.includes('does not exist') || error.code === '42P01') {
        return [];
      }
      console.error('Error getting global operation configs:', error);
      throw error;
    }
  }

  /**
   * Get global module configurations
   */
  static async getGlobalModuleConfigs() {
    try {
      // Use system database connection for admin operations (bypasses RLS)
      const configs = await systemDbConnection
        .select()
        .from(creditConfigurations)
        .where(eq(creditConfigurations.isGlobal, true))
        .orderBy(creditConfigurations.operationCode);

      // Group by module and aggregate
      const moduleConfigs = {};
      configs.forEach(config => {
        const moduleCode = config.operationCode.split('.')[1];
        if (!moduleConfigs[moduleCode]) {
          moduleConfigs[moduleCode] = {
            moduleConfigId: config.configId,
            moduleCode,
            appCode: config.operationCode.split('.')[0],
            defaultCreditCost: parseFloat(config.creditCost),
            defaultUnit: config.unit,
            maxOperationsPerPeriod: parseInt(config.freeAllowance) || 1000,
            periodType: config.freeAllowancePeriod || 'monthly',
            creditBudget: null,
            operationOverrides: {},
            isActive: config.isActive,
            isCustomized: false,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt,
            operationCount: 1
          };
        } else {
          // Average the costs and sum operation count
          const existing = moduleConfigs[moduleCode];
          existing.defaultCreditCost = (existing.defaultCreditCost + parseFloat(config.creditCost)) / 2;
          existing.operationCount += 1;
        }
      });

      return Object.values(moduleConfigs);
    } catch (error) {
      console.error('Error getting global module configs:', error);
      return [];
    }
  }

  /**
   * Get global app configurations
   */
  static async getGlobalAppConfigs() {
    try {
      // Use system database connection for admin operations (bypasses RLS)
      const configs = await systemDbConnection
        .select()
        .from(creditConfigurations)
        .where(eq(creditConfigurations.isGlobal, true))
        .orderBy(creditConfigurations.operationCode);

      // Group by app and aggregate
      const appConfigs = {};
      configs.forEach(config => {
        const appCode = config.operationCode.split('.')[0];
        if (!appConfigs[appCode]) {
          appConfigs[appCode] = {
            appConfigId: config.configId,
            appCode,
            billingModel: 'subscription',
            defaultCreditCost: parseFloat(config.creditCost),
            defaultUnit: config.unit,
            maxDailyOperations: null,
            maxMonthlyOperations: parseInt(config.freeAllowance) || 5000,
            creditBudget: null,
            premiumFeatures: {},
            moduleDefaults: {},
            isActive: config.isActive,
            isCustomized: false,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt,
            operationCount: 1
          };
        } else {
          // Average the costs and sum operation count
          const existing = appConfigs[appCode];
          existing.defaultCreditCost = (existing.defaultCreditCost + parseFloat(config.creditCost)) / 2;
          existing.operationCount += 1;
        }
      });

      return Object.values(appConfigs);
    } catch (error) {
      console.error('Error getting global app configs:', error);
      return [];
    }
  }

  /**
   * Set tenant-specific operation configuration
   */
  static async setTenantOperationConfig(operationCode, configData, userId, tenantId) {
    try {
      console.log('⚙️ Setting tenant operation config:', { operationCode, tenantId });

      // Validate required fields
      if (!operationCode || !configData) {
        throw new Error('Operation code and configuration data are required');
      }

      // Validate creditCost is provided and valid
      if (!configData.creditCost || isNaN(parseFloat(configData.creditCost))) {
        throw new Error('Valid credit cost is required');
      }

      // Check if configuration already exists
      const existing = await db
        .select()
        .from(creditConfigurations)
        .where(and(
          eq(creditConfigurations.operationCode, operationCode),
          eq(creditConfigurations.tenantId, tenantId),
          eq(creditConfigurations.isGlobal, false)
        ));

      const configPayload = {
        operationCode,
        tenantId,
        isGlobal: false,
        creditCost: configData.creditCost ? configData.creditCost.toString() : '1.0000',
        unit: configData.unit || 'operation',
        unitMultiplier: configData.unitMultiplier ? configData.unitMultiplier.toString() : '1.0000',
        freeAllowance: configData.freeAllowance || null,
        freeAllowancePeriod: configData.freeAllowancePeriod || null,
        volumeTiers: configData.volumeTiers ? JSON.stringify(configData.volumeTiers) : null,
        allowOverage: configData.allowOverage ?? false,
        overageLimit: configData.overageLimit || null,
        overagePeriod: configData.overagePeriod || null,
        overageCost: configData.overageCost ? configData.overageCost.toString() : null,
        scope: 'tenant',
        priority: 100,
        isActive: configData.isActive ?? true,
        updatedBy: userId,
        updatedAt: new Date()
      };


      let result;
      if (existing.length > 0) {
        // Update existing

        // For updates, remove fields that shouldn't be updated
        const updatePayload = { ...configPayload };
        delete updatePayload.operationCode; // Don't update operation code (part of unique constraint)
        delete updatePayload.tenantId; // Don't update tenant ID (part of unique constraint)
        delete updatePayload.isGlobal; // Don't update global flag (part of unique constraint)
        delete updatePayload.createdBy; // Don't update created by
        delete updatePayload.createdAt; // Don't update created at
        delete updatePayload.scope; // Don't update scope (should remain as set)
        delete updatePayload.priority; // Don't update priority (should remain as set)


        result = await db
          .update(creditConfigurations)
          .set(updatePayload)
          .where(eq(creditConfigurations.configId, existing[0].configId))
          .returning();
      } else {
        // Create new

        configPayload.createdBy = userId;
        configPayload.createdAt = new Date();


        result = await db
          .insert(creditConfigurations)
          .values(configPayload)
          .returning();
      }

      // Log configuration change
      await this.logConfigurationChange({
        configType: 'operation',
        configId: result[0].configId,
        operationCode,
        entityType: 'tenant',
        entityId: tenantId,
        changeType: existing.length > 0 ? 'update' : 'create',
        oldValues: existing.length > 0 ? existing[0] : null,
        newValues: result[0],
        changedBy: userId
      });

      // Publish credit configuration change event to Redis streams
      try {
        await crmSyncStreams.publishCreditEvent(tenantId, 'credit_config_updated', {
          configId: result[0].configId,
          operationCode: result[0].operationCode,
          creditCost: parseFloat(result[0].creditCost),
          unit: result[0].unit,
          unitMultiplier: parseFloat(result[0].unitMultiplier),
          freeAllowance: result[0].freeAllowance,
          freeAllowancePeriod: result[0].freeAllowancePeriod,
          volumeTiers: result[0].volumeTiers,
          allowOverage: result[0].allowOverage,
          overageLimit: result[0].overageLimit,
          overagePeriod: result[0].overagePeriod,
          overageCost: result[0].overageCost ? parseFloat(result[0].overageCost) : null,
          isActive: result[0].isActive,
          updatedBy: result[0].updatedBy,
          updatedAt: result[0].updatedAt,
          changeType: existing.length > 0 ? 'updated' : 'created',
          previousConfig: existing.length > 0 ? {
            creditCost: parseFloat(existing[0].creditCost),
            unit: existing[0].unit,
            isActive: existing[0].isActive
          } : null
        });
      } catch (streamError) {
        console.warn('⚠️ Failed to publish credit config change event:', streamError.message);
      }

      return {
        success: true,
        config: result[0],
        action: existing.length > 0 ? 'updated' : 'created'
      };
    } catch (error) {
      console.error('Error setting tenant operation config:', error);
      throw error;
    }
  }

  /**
   * Set tenant-specific module configuration
   */
  static async setTenantModuleConfig(moduleCode, configData, userId, tenantId) {
    try {
      console.log('⚙️ Setting tenant module config:', { moduleCode, tenantId });

      // Get real permissions from the application modules table
      const moduleOperations = await this.getModulePermissions(moduleCode);

      const results = [];

      // Create or update configurations for each operation in the module
      for (const operationCode of moduleOperations) {
        try {
          // Check if configuration already exists
          const existing = await systemDbConnection
            .select()
            .from(creditConfigurations)
            .where(and(
              eq(creditConfigurations.operationCode, operationCode),
              eq(creditConfigurations.tenantId, tenantId),
              eq(creditConfigurations.isGlobal, false)
            ));

          const configPayload = {
            operationCode,
            tenantId,
            isGlobal: false,
            creditCost: configData.defaultCreditCost?.toString() || '1.0',
            unit: configData.defaultUnit || 'operation',
            unitMultiplier: '1',
            freeAllowance: configData.maxOperationsPerPeriod || 1000,
            freeAllowancePeriod: configData.periodType || 'monthly',
            volumeTiers: [],
            allowOverage: configData.allowOverBudget || false,
            overageLimit: null,
            overagePeriod: null,
            overageCost: null,
            isActive: configData.isActive ?? true,
            updatedBy: userId,
            updatedAt: new Date()
          };

          let result;
          if (existing.length > 0) {
            // Update existing
            result = await systemDbConnection
              .update(creditConfigurations)
              .set(configPayload)
              .where(eq(creditConfigurations.configId, existing[0].configId))
              .returning();
          } else {
            // Create new
            configPayload.createdBy = userId;
            configPayload.createdAt = new Date();
            result = await systemDbConnection
              .insert(creditConfigurations)
              .values(configPayload)
              .returning();
          }

          results.push(result[0]);
        } catch (opError) {
          console.warn(`Failed to set config for operation ${operationCode}:`, opError);
          // Continue with other operations
        }
      }

      console.log('✅ Tenant module config set successfully for', results.length, 'operations');
      return {
        success: true,
        configs: results,
        operationsConfigured: results.length,
        action: 'bulk_created_updated'
      };
    } catch (error) {
      console.error('Error setting tenant module config:', error);
      throw error;
    }
  }

  /**
   * Set tenant-specific app configuration
   */
  static async setTenantAppConfig(appCode, configData, userId, tenantId) {
    try {
      console.log('⚙️ Setting tenant app config:', { appCode, tenantId });

      // Create system-level operations for the app
      const appOperations = [
        `${appCode}.system.access`,
        `${appCode}.system.admin`,
        `${appCode}.system.configure`,
        `${appCode}.system.integrate`,
        `${appCode}.system.report`,
        `${appCode}.system.export`
      ];

      const results = [];

      // Create or update configurations for each operation in the app
      for (const operationCode of appOperations) {
        try {
          // Check if configuration already exists
          const existing = await systemDbConnection
            .select()
            .from(creditConfigurations)
            .where(and(
              eq(creditConfigurations.operationCode, operationCode),
              eq(creditConfigurations.tenantId, tenantId),
              eq(creditConfigurations.isGlobal, false)
            ));

          const configPayload = {
            operationCode,
            tenantId,
            isGlobal: false,
            creditCost: configData.defaultCreditCost?.toString() || '2.0',
            unit: configData.defaultUnit || 'operation',
            unitMultiplier: '1',
            freeAllowance: configData.maxMonthlyOperations || 5000,
            freeAllowancePeriod: 'monthly',
            volumeTiers: [],
            allowOverage: configData.allowOverBudget || true,
            overageLimit: configData.maxMonthlyOperations ? configData.maxMonthlyOperations * 2 : null,
            overagePeriod: 'monthly',
            overageCost: (parseFloat(configData.defaultCreditCost?.toString() || '2.0') * 1.5).toString(),
            isActive: configData.isActive ?? true,
            updatedBy: userId,
            updatedAt: new Date()
          };

          let result;
          if (existing.length > 0) {
            // Update existing
            result = await systemDbConnection
              .update(creditConfigurations)
              .set(configPayload)
              .where(eq(creditConfigurations.configId, existing[0].configId))
              .returning();
          } else {
            // Create new
            configPayload.createdBy = userId;
            configPayload.createdAt = new Date();
            result = await systemDbConnection
              .insert(creditConfigurations)
              .values(configPayload)
              .returning();
          }

          results.push(result[0]);
        } catch (opError) {
          console.warn(`Failed to set config for operation ${operationCode}:`, opError);
          // Continue with other operations
        }
      }

      console.log('✅ Tenant app config set successfully for', results.length, 'operations');
      return {
        success: true,
        configs: results,
        operationsConfigured: results.length,
        action: 'bulk_created_updated'
      };
    } catch (error) {
      console.error('Error setting tenant app config:', error);
      throw error;
    }
  }

  /**
   * Reset tenant configuration to global default
   */
  static async resetTenantConfiguration(tenantId, configType, configCode, userId) {
    try {
      console.log('🔄 Resetting tenant config:', { tenantId, configType, configCode });

      let result;

      if (configType === 'operation') {
        // For operations, delete the specific operation configuration
        const existing = await systemDbConnection
          .select()
          .from(creditConfigurations)
          .where(and(
            eq(creditConfigurations.operationCode, configCode),
            eq(creditConfigurations.tenantId, tenantId),
            eq(creditConfigurations.isGlobal, false)
          ));

        if (existing.length > 0) {
          result = await systemDbConnection
            .delete(creditConfigurations)
            .where(eq(creditConfigurations.configId, existing[0].configId))
            .returning();
        }
      } else if (configType === 'module') {
        // For modules, delete all operation configurations within this module
        const moduleOperations = [
          `${configCode}.create`,
          `${configCode}.read`,
          `${configCode}.read_all`,
          `${configCode}.update`,
          `${configCode}.delete`,
          `${configCode}.export`,
          `${configCode}.import`
        ];

        const deletePromises = moduleOperations.map(operationCode =>
          systemDbConnection
            .delete(creditConfigurations)
            .where(and(
              eq(creditConfigurations.operationCode, operationCode),
              eq(creditConfigurations.tenantId, tenantId),
              eq(creditConfigurations.isGlobal, false)
            ))
            .returning()
        );

        const results = await Promise.all(deletePromises);
        result = results.flat();
      } else if (configType === 'app') {
        // For apps, delete all operation configurations within this app
        const appOperations = [
          `${configCode}.system.create`,
          `${configCode}.system.read`,
          `${configCode}.system.update`,
          `${configCode}.system.delete`,
          `${configCode}.system.export`,
          `${configCode}.system.import`,
          `${configCode}.system.admin`
        ];

        const deletePromises = appOperations.map(operationCode =>
          systemDbConnection
            .delete(creditConfigurations)
            .where(and(
              eq(creditConfigurations.operationCode, operationCode),
              eq(creditConfigurations.tenantId, tenantId),
              eq(creditConfigurations.isGlobal, false),
            ))
            .returning()
        );

        const results = await Promise.all(deletePromises);
        result = results.flat();
      } else {
        throw new Error(`Invalid config type: ${configType}`);
      }

      if (result && result.length > 0) {

        // Log configuration change for each deleted config
        for (const deletedConfig of result) {
          await this.logConfigurationChange({
            configType,
            configId: deletedConfig.configId,
            operationCode: deletedConfig.operationCode,
            entityType: 'tenant',
            entityId: tenantId,
            changeType: 'delete',
            oldValues: deletedConfig,
            newValues: null,
            changedBy: userId
          });
        }

        return {
          success: true,
          message: `${configType} configuration reset to global default`,
          deletedCount: result.length,
          deleted: result
        };
      } else {
        return {
          success: true,
          message: `No tenant-specific ${configType} configuration found to reset`
        };
      }
    } catch (error) {
      console.error('Error resetting tenant configuration:', error);
      throw error;
    }
  }

  /**
   * Bulk update multiple tenant configurations
   */
  static async bulkUpdateTenantConfigurations(tenantId, updates, userId) {
    try {
      console.log('📦 Bulk updating tenant configurations:', { tenantId, updateCount: updates.length });

      const results = [];

      for (const update of updates) {
        const { configType, configCode, configData } = update;

        try {
          let result;
          switch (configType) {
            case 'operation':
              result = await this.setTenantOperationConfig(configCode, configData, userId, tenantId);
              break;
            case 'module':
              result = await this.setTenantModuleConfig(configCode, configData, userId, tenantId);
              break;
            case 'app':
              result = await this.setTenantAppConfig(configCode, configData, userId, tenantId);
              break;
            default:
              throw new Error(`Invalid config type: ${configType}`);
          }

          results.push({
            configType,
            configCode,
            success: true,
            result
          });
        } catch (error) {
          console.error(`Error updating ${configType} ${configCode}:`, error);
          results.push({
            configType,
            configCode,
            success: false,
            error: error.message
          });
        }
      }

      return {
        success: true,
        totalUpdates: updates.length,
        successfulUpdates: results.filter(r => r.success).length,
        failedUpdates: results.filter(r => !r.success).length,
        results
      };
    } catch (error) {
      console.error('Error in bulk update:', error);
      throw error;
    }
  }

  /**
   * Get configuration templates
   */
  static async getConfigurationTemplates() {
    try {
      // Use system database connection for admin operations (bypasses RLS)
      const templates = await systemDbConnection
        .select()
        .from(creditConfigurationTemplates)
        .where(eq(creditConfigurationTemplates.isActive, true))
        .orderBy(creditConfigurationTemplates.templateName);

      return templates.map(template => ({
        templateId: template.templateId,
        templateName: template.templateName,
        templateCode: template.templateCode,
        description: template.description,
        category: template.category,
        isDefault: template.isDefault,
        version: template.version,
        usageCount: template.usageCount,
        lastUsed: template.lastUsed,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      }));
    } catch (error) {
      console.error('Error getting configuration templates:', error);
      throw error;
    }
  }

  /**
   * Apply configuration template to tenant
   */
  static async applyConfigurationTemplate(tenantId, templateId, userId) {
    try {
      console.log('📋 Applying configuration template:', { tenantId, templateId });

      // Get template (use system connection for admin operations)
      const [template] = await systemDbConnection
        .select()
        .from(creditConfigurationTemplates)
        .where(eq(creditConfigurationTemplates.templateId, templateId));

      if (!template) {
        throw new Error('Configuration template not found');
      }

      const results = [];

      // Apply app configurations
      if (template.appConfigurations) {
        for (const [appCode, config] of Object.entries(template.appConfigurations)) {
          try {
            const result = await this.setTenantAppConfig(appCode, config, userId, tenantId);
            results.push({ type: 'app', code: appCode, success: true, result });
          } catch (error) {
            results.push({ type: 'app', code: appCode, success: false, error: error.message });
          }
        }
      }

      // Apply module configurations
      if (template.moduleConfigurations) {
        for (const [moduleCode, config] of Object.entries(template.moduleConfigurations)) {
          try {
            const result = await this.setTenantModuleConfig(moduleCode, config, userId, tenantId);
            results.push({ type: 'module', code: moduleCode, success: true, result });
          } catch (error) {
            results.push({ type: 'module', code: moduleCode, success: false, error: error.message });
          }
        }
      }

      // Apply operation configurations
      if (template.operationConfigurations) {
        for (const [operationCode, config] of Object.entries(template.operationConfigurations)) {
          try {
            const result = await this.setTenantOperationConfig(operationCode, config, userId, tenantId);
            results.push({ type: 'operation', code: operationCode, success: true, result });
          } catch (error) {
            results.push({ type: 'operation', code: operationCode, success: false, error: error.message });
          }
        }
      }

      // Update template usage count (use system connection for admin operations)
      await systemDbConnection
        .update(creditConfigurationTemplates)
        .set({
          usageCount: template.usageCount + 1,
          lastUsed: new Date(),
          updatedAt: new Date()
        })
        .where(eq(creditConfigurationTemplates.templateId, templateId));

      return {
        success: true,
        templateName: template.templateName,
        appliedConfigurations: results.length,
        successfulApplications: results.filter(r => r.success).length,
        failedApplications: results.filter(r => !r.success).length,
        results
      };
    } catch (error) {
      console.error('Error applying configuration template:', error);
      throw error;
    }
  }

  /**
   * Log configuration changes for audit trail
   */
  static async logConfigurationChange(changeData) {
    try {
      // Use system database connection for admin operations (bypasses RLS)
      await systemDbConnection.insert(configurationChangeHistory).values({
        configType: changeData.configType,
        configId: changeData.configId,
        operationCode: changeData.operationCode,
        entityType: changeData.entityType,
        entityId: changeData.entityId,
        changeType: changeData.changeType,
        oldValues: changeData.oldValues,
        newValues: changeData.newValues,
        changedBy: changeData.changedBy,
        changedAt: new Date()
      });
    } catch (error) {
      console.error('Error logging configuration change:', error);
      // Don't throw - logging failure shouldn't break the main operation
    }
  }

  /**
   * Add credits to a specific entity (tenant, organization, or location)
   */
  /**
   * Find the root organization entity for a tenant
   */
  /**
   * Find the primary/root organization for a tenant
   * Prioritizes: isPrimary=true (from organizationMemberships) > isDefault=true > first created root org
   */
  static async findRootOrganization(tenantId) {
    try {
      const { entities } = await import('../../../db/schema/index.js');
      const { organizationMemberships } = await import('../../../db/schema/organization_memberships.js');
      const { eq, and, isNull, desc } = await import('drizzle-orm');
      
      // First, try to find organization with isPrimary=true membership
      const primaryOrgMembership = await db
        .select({
          entityId: organizationMemberships.entityId
        })
        .from(organizationMemberships)
        .where(and(
          eq(organizationMemberships.tenantId, tenantId),
          eq(organizationMemberships.entityType, 'organization'),
          eq(organizationMemberships.membershipStatus, 'active'),
          eq(organizationMemberships.isPrimary, true)
        ))
        .limit(1);

      if (primaryOrgMembership.length > 0) {
        const primaryEntityId = primaryOrgMembership[0].entityId;
        const [primaryOrg] = await db
          .select()
          .from(entities)
          .where(and(
            eq(entities.entityId, primaryEntityId),
            eq(entities.isActive, true)
          ))
          .limit(1);
        
        if (primaryOrg) {
          console.log(`✅ Found primary organization via membership: ${primaryOrg.entityId} (${primaryOrg.entityName})`);
          return primaryOrg.entityId;
        }
      }

      // Second, try to find organization with isDefault=true
      const [defaultOrg] = await db
        .select()
        .from(entities)
        .where(and(
          eq(entities.tenantId, tenantId),
          eq(entities.entityType, 'organization'),
          isNull(entities.parentEntityId), // Root organization has no parent
          eq(entities.isActive, true),
          eq(entities.isDefault, true)
        ))
        .limit(1);

      if (defaultOrg) {
        console.log(`✅ Found default organization: ${defaultOrg.entityId} (${defaultOrg.entityName})`);
        return defaultOrg.entityId;
      }

      // Third, fallback to first created root organization
      const [rootOrg] = await db
        .select()
        .from(entities)
        .where(and(
          eq(entities.tenantId, tenantId),
          eq(entities.entityType, 'organization'),
          isNull(entities.parentEntityId), // Root organization has no parent
          eq(entities.isActive, true)
        ))
        .orderBy(entities.createdAt) // Get the first created (should be the onboarding org)
        .limit(1);

      if (!rootOrg) {
        console.warn(`⚠️ No root organization found for tenant ${tenantId}, using tenantId as fallback`);
        return null;
      }

      console.log(`✅ Found root organization (fallback): ${rootOrg.entityId} (${rootOrg.entityName})`);
      return rootOrg.entityId;
    } catch (error) {
      console.error('❌ Error finding root organization:', error);
      return null;
    }
  }

  static async addCreditsToEntity({ tenantId, entityType, entityId, creditAmount, source, sourceId, description, initiatedBy }) {
    try {
      // Normalize entity parameters
      const normalizedEntityType = entityType || 'organization';
      
      // If entityId is not provided, find the root organization for the tenant
      let normalizedEntityId = entityId;
      if (!normalizedEntityId) {
        console.log('🔍 No entityId provided, finding root organization...');
        const rootOrgId = await this.findRootOrganization(tenantId);
        if (rootOrgId) {
          normalizedEntityId = rootOrgId;
          console.log(`✅ Using root organization: ${normalizedEntityId}`);
        } else {
          // Fallback to tenantId only if root org not found (shouldn't happen in normal flow)
          console.warn('⚠️ Root organization not found, falling back to tenantId');
          normalizedEntityId = tenantId;
        }
      }

      console.log('💰 Adding credits to entity:', {
        tenantId,
        originalEntityType: entityType,
        originalEntityId: entityId,
        normalizedEntityType,
        normalizedEntityId,
        creditAmount,
        source,
        sourceId
      });

      // Use direct SQL connection with RLS context
      const { default: postgres } = await import('postgres');
      const sqlConn = postgres(process.env.DATABASE_URL);

      try {
        // Set RLS context on this connection
        console.log('🔐 Setting RLS context on direct connection...');
        await sqlConn`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
        await sqlConn`SELECT set_config('app.user_id', ${initiatedBy}, false)`;
        await sqlConn`SELECT set_config('app.is_admin', 'true', false)`;
        console.log('✅ RLS context set on direct connection');

        // Check if credit record exists using direct connection with normalized parameters
        const existingCredits = await sqlConn`
          SELECT * FROM credits
          WHERE tenant_id = ${tenantId}
          AND entity_id = ${normalizedEntityId}
          LIMIT 1
        `;

        console.log('📊 Existing credits check result:', existingCredits.length);

        const previousBalance = existingCredits.length > 0 ? parseFloat(existingCredits[0].available_credits) : 0;
        const newBalance = previousBalance + creditAmount;

        if (existingCredits.length > 0) {
          console.log('📝 Updating existing credit record...');
          await sqlConn`
            UPDATE credits
            SET available_credits = available_credits + ${creditAmount},
                last_updated_at = NOW()
            WHERE credit_id = ${existingCredits[0].credit_id}
          `;
          console.log('✅ Updated existing credit balance:', { previousBalance, newBalance });
        } else {
          console.log('📝 Creating new credit record...');
          const newCredit = await sqlConn`
            INSERT INTO credits (
              tenant_id, entity_id, available_credits, is_active
            ) VALUES (
              ${tenantId}, ${normalizedEntityId}, ${creditAmount.toString()}, true
            )
            RETURNING credit_id
          `;
          console.log('✅ Created new credit balance:', { creditId: newCredit[0].credit_id, newBalance: creditAmount });
        }

        // Create transaction record
        console.log('📝 Creating transaction record...');

        // Generate a proper UUID for operation_id, use sourceId for stripe_payment_intent_id only
        const { randomUUID } = await import('crypto');
        const operationId = randomUUID();

        await sqlConn`
          INSERT INTO credit_transactions (
            tenant_id, entity_id, transaction_type, amount,
            previous_balance, new_balance, operation_code,
            initiated_by
          ) VALUES (
            ${tenantId}, ${normalizedEntityId}, 'purchase', ${creditAmount.toString()},
            ${previousBalance.toString()}, ${newBalance.toString()}, ${source},
            ${initiatedBy === 'system' ? null : initiatedBy}
          )
        `;
        console.log('✅ Transaction record created successfully');

      } finally {
        await sqlConn.end();
      }

      console.log(`✅ Added ${creditAmount} credits to ${normalizedEntityType}${normalizedEntityId ? ` (${normalizedEntityId})` : ''} for tenant ${tenantId}`);

      // Publish credit allocation event to Redis streams (for CRM sync)
      try {
        await crmSyncStreams.publishCreditAllocation(tenantId, normalizedEntityId, creditAmount, {
          allocationId: `alloc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          reason: source,
          entityType: normalizedEntityType,
          previousBalance: previousBalance,
          newBalance: newBalance,
          sourceId: sourceId,
          description: description,
          allocatedBy: initiatedBy
        });
      } catch (streamError) {
        console.warn('⚠️ Failed to publish credit allocation event to CRM:', streamError.message);
      }

      // Also publish to existing CRM sync streams (backward compatibility)
      try {
        await crmSyncStreams.publishCreditEvent(tenantId, 'credit_allocated', {
          entityId: normalizedEntityId,
          entityType: normalizedEntityType,
          allocatedCredits: creditAmount,
          previousBalance: previousBalance,
          newBalance: newBalance,
          source: source,
          sourceId: sourceId,
          description: description,
          allocatedBy: initiatedBy,
          allocatedAt: new Date().toISOString()
        });
      } catch (streamError) {
        console.warn('⚠️ Failed to publish credit allocation event (legacy):', streamError.message);
      }

    } catch (error) {
      console.error('Error adding credits to entity:', error);
      throw error;
    }
  }

  /**
   * Record credit consumption from CRM (called by CRM consumer)
   */
  static async recordCreditConsumption(tenantId, entityId, userId, amount, operationType, operationId, metadata = {}) {
    try {
      console.log(`📊 Recording credit consumption: ${amount} credits by ${userId} for ${operationType}`);

      // Publish credit consumption event to Redis streams
      try {
        await crmSyncStreams.publishCreditConsumption(
          tenantId,
          entityId,
          userId,
          amount,
          operationType,
          operationId,
          metadata
        );
      } catch (streamError) {
        console.warn('⚠️ Failed to publish credit consumption event:', streamError.message);
      }

      // Here you could also update consumption tracking in wrapper database
      // For now, we just publish the event

      return {
        success: true,
        message: 'Credit consumption recorded and published',
        data: {
          tenantId,
          entityId,
          userId,
          amount,
          operationType,
          operationId,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Error recording credit consumption:', error);
      throw error;
    }
  }

  /**
   * Get balance for a specific entity
   */
  static async getEntityBalance(tenantId, entityType, entityId) {
    try {
      const [creditBalance] = await db
        .select()
        .from(credits)
        .where(and(
          eq(credits.tenantId, tenantId),
          entityId ? eq(credits.entityId, entityId) : sql`${credits.entityId} IS NULL`
        ))
        .limit(1);

      if (!creditBalance) {
        return null;
      }

      return {
        tenantId: creditBalance.tenantId,
        entityType: entityType, // Derived from parameter since not stored in table
        entityId: creditBalance.entityId,
        availableCredits: parseFloat(creditBalance.availableCredits),
        reservedCredits: parseFloat(creditBalance.reservedCredits),
        lowBalanceThreshold: 100,
        criticalBalanceThreshold: 10,
        lastPurchase: creditBalance.lastUpdatedAt,
        creditExpiry: null,
        plan: 'credit_based',
        status: creditBalance.availableCredits > 0 ? 'active' : 'insufficient_credits'
      };
    } catch (error) {
      console.error('Error fetching entity balance:', error);
      throw error;
    }
  }

  /**
   * Consume credits for an operation
   * 
   * NOTE: Applications handle their own credit consumption.
   * This method is for organization-level credit consumption only.
   * Applications should consume credits directly from their own systems.
   * 
   * Credit auto-replenishment is not required - applications manage their own credits.
   */
  static async consumeCredits({
    tenantId,
    userId,
    operationCode,
    creditCost,
    operationId,
    description,
    metadata,
    entityType = 'organization', // New parameter for hierarchical support
    entityId = null // New parameter for hierarchical support
  }) {
    try {
      // REMOVED: Application-specific credit allocation logic
      // REMOVED: Auto-replenishment logic
      // Applications now manage their own credit consumption directly
      // They consume from organization balance using their own logic
      // This method only handles organization-level credit consumption

      // Get current balance for the specific entity (fallback or direct consumption)
      const currentBalance = await this.getEntityBalance(tenantId, entityType, entityId);

      if (!currentBalance || currentBalance.availableCredits < creditCost) {
        return {
          success: false,
          message: 'Insufficient credits',
          data: {
            availableCredits: currentBalance?.availableCredits || 0,
            requiredCredits: creditCost,
            entityType,
            entityId
          }
        };
      }

      // Start transaction
      const result = await db.transaction(async (tx) => {
        // Update credit balance for specific entity (get the most recent record)
        const [updatedCredit] = await tx
          .update(credits)
          .set({
            availableCredits: sql`${credits.availableCredits} - ${creditCost}`,
            lastUpdatedAt: new Date()
          })
          .where(and(
            eq(credits.tenantId, tenantId),
            entityId ? eq(credits.entityId, entityId) : sql`${credits.entityId} IS NULL`,
            eq(credits.isActive, true)
          ))
          .orderBy(desc(credits.lastUpdatedAt))
          .limit(1)
          .returning();

        // Create transaction record
        const [transaction] = await tx
          .insert(creditTransactions)
          .values({
            tenantId,
            entityId,
            transactionType: 'consumption',
            amount: (-creditCost).toString(),
            previousBalance: currentBalance.availableCredits.toString(),
            newBalance: (currentBalance.availableCredits - creditCost).toString(),
            operationCode,
            description,
            initiatedBy: userId
          })
          .returning();

        return {
          creditBalance: updatedCredit,
          transaction
        };
      });

      return {
        success: true,
        data: {
          transactionId: result.transaction.transactionId,
          creditsConsumed: creditCost,
          remainingCredits: currentBalance.availableCredits - creditCost
        }
      };
    } catch (error) {
      console.error('Error consuming credits:', error);
      throw error;
    }
  }

  /**
   * Get usage summary for a tenant
   */
  static async getUsageSummary(tenantId, filters = {}) {
    try {
      const { period = 'month', startDate, endDate } = filters;

      let dateFilter = {};
      if (startDate && endDate) {
        dateFilter = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      } else {
        // Default to current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        dateFilter = {
          gte: startOfMonth,
          lte: endOfMonth
        };
      }

      const transactions = await db
        .select({
          type: creditTransactions.transactionType,
          amount: creditTransactions.amount,
          createdAt: creditTransactions.createdAt
        })
        .from(creditTransactions)
        .where(and(
          eq(creditTransactions.tenantId, tenantId),
          gte(creditTransactions.createdAt, dateFilter.gte),
          lte(creditTransactions.createdAt, dateFilter.lte)
        ));

      const summary = {
        period,
        totalConsumed: 0,
        totalPurchased: 0,
        totalExpired: 0,
        netCredits: 0,
        transactionsByType: {}
      };

      transactions.forEach(t => {
        const amount = parseFloat(t.amount);

        switch (t.transactionType) {
          case 'consumption':
            summary.totalConsumed += Math.abs(amount);
            break;
          case 'purchase':
            summary.totalPurchased += amount;
            break;
          case 'expiry':
            summary.totalExpired += Math.abs(amount);
            break;
        }

        if (!summary.transactionsByType[t.transactionType]) {
          summary.transactionsByType[t.transactionType] = 0;
        }
        summary.transactionsByType[t.transactionType] += Math.abs(amount);
      });

      summary.netCredits = summary.totalPurchased - summary.totalConsumed - summary.totalExpired;

      return summary;
    } catch (error) {
      console.error('Error fetching usage summary:', error);
      throw error;
    }
  }

  /**
   * Transfer credits between entities
   */
  static async transferCredits({ fromTenantId, toEntityType, toEntityId, creditAmount, initiatedBy, reason }) {
    try {
      // fromTenantId could be either a tenantId or an entityId depending on how it's called
      // We need to determine the actual tenant and source entity

      let tenantId, fromEntityId;

      // First, try to find the entity to determine the tenant
      const { entities } = await import('../db/schema/index.js');
      const [sourceEntity] = await db
        .select()
        .from(entities)
        .where(and(
          eq(entities.entityId, fromTenantId),
          eq(entities.isActive, true)
        ))
        .limit(1);

      if (sourceEntity) {
        // fromTenantId is actually an entityId
        tenantId = sourceEntity.tenantId;
        fromEntityId = fromTenantId;
      } else {
        // fromTenantId is actually a tenantId, use it as the source entity ID
        tenantId = fromTenantId;
        fromEntityId = fromTenantId;
      }

      // Ensure source credit record exists
      await this.ensureCreditRecord(tenantId, 'organization', fromEntityId, 0); // Don't add default credits

      // Get source balance
      const sourceBalance = await this.getCurrentBalance(tenantId, 'organization', fromEntityId);

      if (!sourceBalance || sourceBalance.availableCredits < creditAmount) {
        return {
          success: false,
          message: `Insufficient credits for transfer. Available: ${sourceBalance?.availableCredits || 0}, Required: ${creditAmount}`
        };
      }

      // Validate that the target entity exists in the entities table
      const [targetEntity] = await db
        .select()
        .from(entities)
        .where(and(
          eq(entities.entityId, toEntityId),
          eq(entities.tenantId, tenantId),
          eq(entities.isActive, true)
        ))
        .limit(1);

      if (!targetEntity) {
        return {
          success: false,
          message: `Target entity ${toEntityId} does not exist or is not active. Cannot transfer credits to a non-existent entity.`
        };
      }

      // Start transaction
      const result = await db.transaction(async (tx) => {
        // Deduct from source
        await tx
          .update(credits)
          .set({
            availableCredits: sql`${credits.availableCredits} - ${creditAmount}`,
            lastUpdatedAt: new Date()
          })
          .where(and(
            eq(credits.tenantId, tenantId),
            eq(credits.entityId, fromEntityId)
          ));

        // Add to destination (create or update credit record)
        const [existingCredit] = await tx
          .select()
          .from(credits)
          .where(and(
            eq(credits.tenantId, tenantId), // Same tenant, different entity
            eq(credits.entityId, toEntityId)
          ))
          .limit(1);

        if (existingCredit) {
          // Update existing credit record
          await tx
            .update(credits)
            .set({
              availableCredits: sql`${credits.availableCredits} + ${creditAmount}`,
              lastUpdatedAt: new Date()
            })
            .where(eq(credits.creditId, existingCredit.creditId));
        } else {
          // Create new credit record for the destination entity
          await tx
            .insert(credits)
            .values({
              tenantId: tenantId, // Same tenant, different entity
              entityId: toEntityId,
              availableCredits: creditAmount.toString(),
              reservedCredits: '0',
              isActive: true,
              lastUpdatedAt: new Date(),
              createdAt: new Date()
            });
        }

        // Create transfer transaction records
        await tx
          .insert(creditTransactions)
          .values({
            tenantId: tenantId,
            entityId: fromEntityId,
            transactionType: 'transfer_out',
            amount: (-creditAmount).toString(),
            description: `Transfer to ${toEntityType}: ${targetEntity.entityName} (${toEntityId})`,
            metadata: { reason, toEntityType, toEntityId, toEntityName: targetEntity.entityName },
            initiatedBy
          });

        await tx
          .insert(creditTransactions)
          .values({
            tenantId: tenantId, // Keep same tenant for audit trail
            entityId: toEntityId,
            transactionType: 'transfer_in',
            amount: creditAmount.toString(),
            description: `Transfer from ${fromEntityId}`,
            metadata: { reason, fromEntityId },
            initiatedBy
          });

        return { success: true };
      });

      return {
        success: true,
        message: 'Credits transferred successfully'
      };
    } catch (error) {
      console.error('Error transferring credits:', error);
      throw error;
    }
  }

  /**
   * Get credit configuration for an operation with inheritance (tenant-specific → global → default)
   */
  static async getOperationConfig(operationCode, tenantId = null) {
    try {
      let config = null;

      // Step 1: Try tenant-specific configuration first
      if (tenantId) {
        [config] = await db
          .select()
          .from(creditConfigurations)
          .where(and(
            eq(creditConfigurations.operationCode, operationCode),
            eq(creditConfigurations.tenantId, tenantId),
            eq(creditConfigurations.isGlobal, false)
          ))
          .limit(1);
      }

      // Step 2: If no tenant-specific config, try global configuration
      if (!config) {
        [config] = await db
          .select()
          .from(creditConfigurations)
          .where(and(
            eq(creditConfigurations.operationCode, operationCode),
            eq(creditConfigurations.isGlobal, true)
          ))
          .limit(1);
      }

      // Step 3: If no configuration found, return defaults
      if (!config) {
        return {
          operationCode,
          creditCost: 1.0,
          unit: 'operation',
          unitMultiplier: 1,
          freeAllowance: 0,
          allowOverage: true,
          isDefault: true,
          configSource: 'default',
          tenantId: tenantId,
          isGlobal: false
        };
      }

      return {
        operationCode: config.operationCode,
        moduleCode: config.moduleCode,
        appCode: config.appCode,
        creditCost: parseFloat(config.creditCost),
        unit: config.unit,
        unitMultiplier: parseFloat(config.unitMultiplier),
        freeAllowance: config.freeAllowance,
        freeAllowancePeriod: config.freeAllowancePeriod,
        volumeTiers: config.volumeTiers,
        allowOverage: config.allowOverage,
        overageLimit: config.overageLimit,
        overagePeriod: config.overagePeriod,
        overageCost: config.overageCost ? parseFloat(config.overageCost) : null,
        isInherited: config.isInherited,
        isActive: config.isActive,
        isCustomized: config.isCustomized,
        priority: config.priority,
        isDefault: false,
        configSource: config.isGlobal ? 'global' : 'tenant',
        tenantId: config.tenantId,
        isGlobal: config.isGlobal
      };
    } catch (error) {
      console.error('Error fetching operation config:', error);
      throw error;
    }
  }

  /**
   * Get module credit configuration with inheritance (tenant-specific → global → default)
   */
  static async getModuleConfig(moduleCode, tenantId = null) {
    try {
      let configs = [];

      // Step 1: Try tenant-specific configurations first
      if (tenantId) {
        configs = await db
          .select()
          .from(creditConfigurations)
          .where(and(
            eq(creditConfigurations.operationCode, sql`${moduleCode}.%`),
            eq(creditConfigurations.tenantId, tenantId),
            eq(creditConfigurations.isGlobal, false)
          ));
      }

      // Step 2: If no tenant-specific configs, try global configurations
      if (configs.length === 0) {
        configs = await db
          .select()
          .from(creditConfigurations)
          .where(and(
            eq(creditConfigurations.operationCode, sql`${moduleCode}.%`),
            eq(creditConfigurations.isGlobal, true)
          ));
      }

      // Step 3: If no configurations found, return defaults
      if (configs.length === 0) {
        return {
          moduleCode,
          appCode: null,
          defaultCreditCost: 1.0,
          defaultUnit: 'operation',
          maxOperationsPerPeriod: null,
          periodType: 'month',
          creditBudget: null,
          operationOverrides: {},
          isActive: true,
          isCustomized: false,
          isDefault: true,
          configSource: 'default',
          tenantId: tenantId,
          isGlobal: false,
          operationCount: 0
        };
      }

      // Aggregate the operation configs into module-level config
      const avgCost = configs.reduce((sum, config) => sum + parseFloat(config.creditCost), 0) / configs.length;
      const totalAllowance = configs.reduce((sum, config) => sum + parseInt(config.freeAllowance || '0'), 0);

      return {
        moduleConfigId: configs[0].configId, // Use first config ID as representative
        moduleCode,
        appCode: configs[0].operationCode.split('.')[0],
        defaultCreditCost: avgCost,
        defaultUnit: configs[0].unit,
        maxOperationsPerPeriod: totalAllowance || 1000,
        periodType: configs[0].freeAllowancePeriod || 'monthly',
        creditBudget: null,
        operationOverrides: {},
        isActive: configs[0].isActive,
        isCustomized: !configs[0].isGlobal,
        isDefault: false,
        configSource: configs[0].isGlobal ? 'global' : 'tenant',
        tenantId: tenantId,
        isGlobal: configs[0].isGlobal,
        operationCount: configs.length
      };
    } catch (error) {
      console.error('Error fetching module config:', error);
      throw error;
    }
  }

  /**
   * Get application credit configuration with inheritance (tenant-specific → global → default)
   */
  static async getAppConfig(appCode, tenantId = null) {
    try {
      let configs = [];

      // Step 1: Try tenant-specific configurations first
      if (tenantId) {
        configs = await db
          .select()
          .from(creditConfigurations)
          .where(and(
            eq(creditConfigurations.operationCode, sql`${appCode}.%`),
            eq(creditConfigurations.tenantId, tenantId),
            eq(creditConfigurations.isGlobal, false),
          ));
      }

      // Step 2: If no tenant-specific configs, try global configurations
      if (configs.length === 0) {
        configs = await db
          .select()
          .from(creditConfigurations)
          .where(and(
            eq(creditConfigurations.operationCode, sql`${appCode}.%`),
            eq(creditConfigurations.isGlobal, true),
          ));
      }

      // Step 3: If no configurations found, return defaults
      if (configs.length === 0) {
        return {
          appCode,
          billingModel: 'bulk_then_per_usage',
          defaultCreditCost: 1.0,
          defaultUnit: 'operation',
          maxDailyOperations: null,
          maxMonthlyOperations: null,
          creditBudget: null,
          premiumFeatures: {},
          moduleDefaults: {},
          isActive: true,
          isCustomized: false,
          isDefault: true,
          configSource: 'default',
          tenantId: tenantId,
          isGlobal: false,
          operationCount: 0
        };
      }

      // Aggregate the operation configs into app-level config
      const avgCost = configs.reduce((sum, config) => sum + parseFloat(config.creditCost), 0) / configs.length;
      const totalAllowance = configs.reduce((sum, config) => sum + parseInt(config.freeAllowance || '0'), 0);

      return {
        appConfigId: configs[0].configId, // Use first config ID as representative
        appCode,
        billingModel: 'bulk_then_per_usage',
        defaultCreditCost: avgCost,
        defaultUnit: configs[0].unit,
        maxDailyOperations: null,
        maxMonthlyOperations: totalAllowance || 5000,
        creditBudget: null,
        premiumFeatures: {},
        moduleDefaults: {},
        isActive: configs[0].isActive,
        isCustomized: !configs[0].isGlobal,
        isDefault: false,
        configSource: configs[0].isGlobal ? 'global' : 'tenant',
        tenantId: tenantId,
        isGlobal: configs[0].isGlobal,
        operationCount: configs.length
      };
    } catch (error) {
      console.error('Error fetching app config:', error);
      throw error;
    }
  }

  /**
   * Get all global credit configurations (company-maintained)
   */
  static async getAllConfigurations(filters = {}) {
    try {
      const { isActive = true } = filters;

      const results = {
        operations: [],
        modules: [],
        applications: []
      };

      // Get all operation configurations
      let operationQuery = db
        .select()
        .from(creditConfigurations);

      if (isActive !== undefined) {
        operationQuery = operationQuery.where(eq(creditConfigurations.isActive, isActive));
      }

      const operations = await operationQuery.orderBy(creditConfigurations.operationCode);
      results.operations = operations.map(config => ({
        configId: config.configId,
        operationCode: config.operationCode,
        moduleCode: config.moduleCode,
        appCode: config.appCode,
        creditCost: parseFloat(config.creditCost),
        unit: config.unit,
        unitMultiplier: parseFloat(config.unitMultiplier),
        freeAllowance: config.freeAllowance,
        freeAllowancePeriod: config.freeAllowancePeriod,
        volumeTiers: config.volumeTiers,
        allowOverage: config.allowOverage,
        overageLimit: config.overageLimit,
        overagePeriod: config.overagePeriod,
        overageCost: config.overageCost ? parseFloat(config.overageCost) : null,
        isInherited: config.isInherited,
        isActive: config.isActive,
        isCustomized: config.isCustomized,
        priority: config.priority
      }));

      // Get all module configurations (aggregated from operation-level configs)
      const moduleConfigs = await db
        .select()
        .from(creditConfigurations)
        .where(and(
          eq(creditConfigurations.isGlobal, true),
          ...(isActive !== undefined ? [eq(creditConfigurations.isActive, isActive)] : [])
        ));

      // Group by module
      const moduleGroups = {};
      moduleConfigs.forEach(config => {
        const moduleCode = config.operationCode.split('.')[1];
        if (!moduleGroups[moduleCode]) {
          moduleGroups[moduleCode] = [];
        }
        moduleGroups[moduleCode].push(config);
      });

      results.modules = Object.entries(moduleGroups).map(([moduleCode, configs]) => {
        const avgCost = configs.reduce((sum, config) => sum + parseFloat(config.creditCost), 0) / configs.length;
        const totalAllowance = configs.reduce((sum, config) => sum + parseInt(config.freeAllowance || '0'), 0);

        return {
          moduleConfigId: configs[0].configId,
          moduleCode,
          appCode: configs[0].operationCode.split('.')[0],
          defaultCreditCost: avgCost,
          defaultUnit: configs[0].unit,
          maxOperationsPerPeriod: totalAllowance || 1000,
          periodType: configs[0].freeAllowancePeriod || 'monthly',
          creditBudget: null,
          operationOverrides: {},
          isActive: configs[0].isActive,
          isCustomized: false,
          operationCount: configs.length
        };
      });

      // Get all application configurations (aggregated from operation-level configs)
      const appConfigs = await db
        .select()
        .from(creditConfigurations)
        .where(and(
          eq(creditConfigurations.isGlobal, true),
          ...(isActive !== undefined ? [eq(creditConfigurations.isActive, isActive)] : [])
        ));

      // Group by app
      const appGroups = {};
      appConfigs.forEach(config => {
        const appCode = config.operationCode.split('.')[0];
        if (!appGroups[appCode]) {
          appGroups[appCode] = [];
        }
        appGroups[appCode].push(config);
      });

      results.applications = Object.entries(appGroups).map(([appCode, configs]) => {
        const avgCost = configs.reduce((sum, config) => sum + parseFloat(config.creditCost), 0) / configs.length;
        const totalAllowance = configs.reduce((sum, config) => sum + parseInt(config.freeAllowance || '0'), 0);

        return {
          appConfigId: configs[0].configId,
          appCode,
          billingModel: 'bulk_then_per_usage',
          defaultCreditCost: avgCost,
          defaultUnit: configs[0].unit,
          maxDailyOperations: null,
          maxMonthlyOperations: totalAllowance || 5000,
          creditBudget: null,
          premiumFeatures: {},
          moduleDefaults: {},
          isActive: configs[0].isActive,
          isCustomized: false,
          operationCount: configs.length
        };
      });

      return results;
    } catch (error) {
      console.error('Error fetching all configurations:', error);
      throw error;
    }
  }

  /**
   * Create or update operation configuration (global or tenant-specific, company admin only)
   */
  static async setOperationConfig(operationCode, configData, adminUserId, tenantId = null) {
    try {
      // Determine if this is a global or tenant-specific configuration
      const isGlobal = tenantId === null;

      const existing = await db
        .select()
        .from(creditConfigurations)
        .where(and(
          eq(creditConfigurations.operationCode, operationCode),
          tenantId ? eq(creditConfigurations.tenantId, tenantId) : sql`${creditConfigurations.tenantId} IS NULL`
        ))
        .limit(1);

      const configPayload = {
        operationCode,
        tenantId: tenantId, // NULL for global, set for tenant-specific
        moduleCode: configData.moduleCode || null,
        appCode: configData.appCode || null,
        creditCost: configData.creditCost.toString(),
        unit: configData.unit || 'operation',
        unitMultiplier: (configData.unitMultiplier || 1).toString(),
        freeAllowance: configData.freeAllowance || 0,
        freeAllowancePeriod: configData.freeAllowancePeriod || 'month',
        volumeTiers: configData.volumeTiers || [],
        allowOverage: configData.allowOverage !== undefined ? configData.allowOverage : true,
        overageLimit: configData.overageLimit || null,
        overagePeriod: configData.overagePeriod || 'day',
        overageCost: configData.overageCost ? configData.overageCost.toString() : null,
        isInherited: configData.isInherited || false,
        isGlobal: isGlobal,
        isActive: configData.isActive !== undefined ? configData.isActive : true,
        isCustomized: true,
        priority: configData.priority || 0,
        updatedBy: adminUserId,
        updatedAt: new Date()
      };

      let result;
      if (existing.length > 0) {
        [result] = await db
          .update(creditConfigurations)
          .set(configPayload)
          .where(eq(creditConfigurations.configId, existing[0].configId))
          .returning();
      } else {
        [result] = await db
          .insert(creditConfigurations)
          .values({
            ...configPayload,
            createdBy: adminUserId,
            createdAt: new Date()
          })
          .returning();
      }

      return result;
    } catch (error) {
      console.error('Error setting operation config:', error);
      throw error;
    }
  }

  /**
   * Get application modules and their permissions from database
   */
  static async getApplicationModules() {
    try {
      const modules = await db
        .select({
          moduleId: applicationModules.moduleId,
          moduleCode: applicationModules.moduleCode,
          moduleName: applicationModules.moduleName,
          appCode: applicationsTable.appCode,
          appName: applicationsTable.appName,
          permissions: applicationModules.permissions,
          isCore: applicationModules.isCore
        })
        .from(applicationModules)
        .leftJoin(applicationsTable, eq(applicationModules.appId, applicationsTable.appId))
        .where(eq(applicationsTable.status, 'active'));

      return modules;
    } catch (error) {
      console.error('Error fetching application modules:', error);
      return [];
    }
  }

  /**
   * Get all application credit configurations (global)
   */
  static async getApplicationCreditConfigurations() {
    try {
      console.log('📊 Getting application credit configurations');

      // Get all applications
      const applications = await db
        .select({
          appId: applicationsTable.appId,
          appCode: applicationsTable.appCode,
          appName: applicationsTable.appName,
          description: applicationsTable.description
        })
        .from(applicationsTable)
        .where(eq(applicationsTable.status, 'active'));

      // Get modules for each application with credit configurations
      const applicationsWithConfigs = await Promise.all(
        applications.map(async (app) => {
          // Get modules for this application
          const modules = await db
            .select({
              moduleId: applicationModules.moduleId,
              moduleCode: applicationModules.moduleCode,
              moduleName: applicationModules.moduleName,
              isCore: applicationModules.isCore
            })
            .from(applicationModules)
            .where(eq(applicationModules.appId, app.appId));

          // Get credit configurations for this application's modules
          const moduleConfigs = await Promise.all(
            modules.map(async (module) => {
              // Get operation codes for this module
              const operationCodes = await this.getModulePermissions(module.moduleCode);

              // Get credit configurations for these operations
              const configs = await db
                .select({
                  operationCode: creditConfigurations.operationCode,
                  creditCost: creditConfigurations.creditCost,
                  unit: creditConfigurations.unit,
                  unitMultiplier: creditConfigurations.unitMultiplier,
                  isGlobal: creditConfigurations.isGlobal,
                  isActive: creditConfigurations.isActive
                })
                .from(creditConfigurations)
                .where(and(
                  inArray(creditConfigurations.operationCode, operationCodes),
                  eq(creditConfigurations.isGlobal, true), // Only global configs for this endpoint
                  eq(creditConfigurations.isActive, true)
                ));

              // Calculate average cost for the module
              const avgCost = configs.length > 0
                ? configs.reduce((sum, config) => sum + parseFloat(config.creditCost), 0) / configs.length
                : 0;

              return {
                moduleId: module.moduleId,
                moduleCode: module.moduleCode,
                moduleName: module.moduleName,
                isCore: module.isCore,
                operationCount: operationCodes.length,
                configuredOperations: configs.length,
                averageCreditCost: avgCost,
                creditConfigurations: configs
              };
            })
          );

          // Calculate app-level statistics
          const totalOperations = moduleConfigs.reduce((sum, mod) => sum + mod.operationCount, 0);
          const configuredOperations = moduleConfigs.reduce((sum, mod) => sum + mod.configuredOperations, 0);
          const avgCreditCost = moduleConfigs.length > 0
            ? moduleConfigs.reduce((sum, mod) => sum + mod.averageCreditCost, 0) / moduleConfigs.length
            : 0;

          return {
            appId: app.appId,
            appCode: app.appCode,
            appName: app.appName,
            description: app.description,
            defaultCreditCost: avgCreditCost,
            defaultUnit: 'operation',
            totalModules: modules.length,
            totalOperations: totalOperations,
            configuredOperations: configuredOperations,
            modules: moduleConfigs
          };
        })
      );

      return applicationsWithConfigs;
    } catch (error) {
      console.error('Error getting application credit configurations:', error);
      throw error;
    }
  }

  /**
   * Get global credit configurations filtered by application code or name
   * @param {string|null} appIdentifier - Application code (e.g., 'crm') or name (e.g., 'B2B CRM'). If null, returns all apps.
   * @returns {Promise<Object>} Global credit configurations for the specified application(s)
   */
  static async getGlobalCreditConfigurationsByApp(appIdentifier = null) {
    try {
      console.log('🔍 Getting global credit configurations for app:', appIdentifier || 'ALL');

      // Build query for applications
      let appQuery = db
        .select({
          appId: applicationsTable.appId,
          appCode: applicationsTable.appCode,
          appName: applicationsTable.appName,
          description: applicationsTable.description
        })
        .from(applicationsTable)
        .where(eq(applicationsTable.status, 'active'));

      // Filter by app identifier if provided
      if (appIdentifier) {
        appQuery = appQuery.where(
          or(
            eq(applicationsTable.appCode, appIdentifier),
            eq(applicationsTable.appName, appIdentifier)
          )
        );
      }

      const applications = await appQuery;

      if (applications.length === 0) {
        return {
          success: false,
          message: appIdentifier
            ? `No application found with code or name: ${appIdentifier}`
            : 'No active applications found',
          data: null
        };
      }

      // Get configurations for each application
      const configurationsWithDetails = await Promise.all(
        applications.map(async (app) => {
          // Get all global credit configurations for this app
          const globalConfigs = await systemDbConnection
            .select({
              configId: creditConfigurations.configId,
              operationCode: creditConfigurations.operationCode,
              creditCost: creditConfigurations.creditCost,
              unit: creditConfigurations.unit,
              unitMultiplier: creditConfigurations.unitMultiplier,
              freeAllowance: creditConfigurations.freeAllowance,
              freeAllowancePeriod: creditConfigurations.freeAllowancePeriod,
              volumeTiers: creditConfigurations.volumeTiers,
              allowOverage: creditConfigurations.allowOverage,
              overageLimit: creditConfigurations.overageLimit,
              overagePeriod: creditConfigurations.overagePeriod,
              overageCost: creditConfigurations.overageCost,
              isActive: creditConfigurations.isActive,
              createdAt: creditConfigurations.createdAt,
              updatedAt: creditConfigurations.updatedAt
            })
            .from(creditConfigurations)
            .where(and(
              eq(creditConfigurations.isGlobal, true),
              eq(creditConfigurations.isActive, true),
              sql`${creditConfigurations.operationCode} LIKE ${app.appCode + '.%'}`
            ))
            .orderBy(creditConfigurations.operationCode);

          // Group configurations by module
          const moduleGroups = {};
          globalConfigs.forEach(config => {
            const parts = config.operationCode.split('.');
            const moduleCode = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : 'unknown';

            if (!moduleGroups[moduleCode]) {
              moduleGroups[moduleCode] = {
                moduleCode,
                moduleName: parts[1] || 'unknown',
                operations: []
              };
            }

            moduleGroups[moduleCode].operations.push({
              operationCode: config.operationCode,
              operationName: parts.slice(2).join('.') || 'unknown',
              creditCost: parseFloat(config.creditCost),
              unit: config.unit,
              unitMultiplier: parseFloat(config.unitMultiplier),
              freeAllowance: config.freeAllowance,
              freeAllowancePeriod: config.freeAllowancePeriod,
              volumeTiers: config.volumeTiers || [],
              allowOverage: config.allowOverage,
              overageLimit: config.overageLimit,
              overagePeriod: config.overagePeriod,
              overageCost: config.overageCost ? parseFloat(config.overageCost) : null,
              isActive: config.isActive
            });
          });

          // Calculate statistics
          const modules = Object.values(moduleGroups);
          const totalOperations = globalConfigs.length;
          const avgCreditCost = totalOperations > 0
            ? globalConfigs.reduce((sum, config) => sum + parseFloat(config.creditCost), 0) / totalOperations
            : 0;

          return {
            appId: app.appId,
            appCode: app.appCode,
            appName: app.appName,
            description: app.description,
            statistics: {
              totalModules: modules.length,
              totalOperations,
              averageCreditCost: parseFloat(avgCreditCost.toFixed(2))
            },
            modules,
            allOperations: globalConfigs.map(config => ({
              operationCode: config.operationCode,
              creditCost: parseFloat(config.creditCost),
              unit: config.unit,
              isActive: config.isActive
            }))
          };
        })
      );

      return {
        success: true,
        message: appIdentifier
          ? `Global configurations for ${appIdentifier}`
          : `Global configurations for all applications`,
        data: {
          requestedApp: appIdentifier,
          applicationsCount: configurationsWithDetails.length,
          applications: configurationsWithDetails
        }
      };
    } catch (error) {
      console.error('Error getting global credit configurations by app:', error);
      throw error;
    }
  }


  /**
   * Create tenant-specific operation cost configuration
   */
  static async createTenantOperationCost(tenantId, configData, userId) {
    try {
      console.log('⚙️ Creating tenant-specific operation cost:', { tenantId, operationCode: configData.operationCode });

      const {
        operationCode,
        operationName,
        creditCost,
        unit = 'operation',
        unitMultiplier = 1,
        category,
        freeAllowance,
        freeAllowancePeriod,
        volumeTiers,
        allowOverage,
        overageLimit,
        overagePeriod,
        overageCost,
        scope = 'tenant',
        priority = 100,
        isActive = true
      } = configData;

      // Validate operation code format
      if (!operationCode || typeof operationCode !== 'string') {
        throw new Error('Invalid operation code: must be a non-empty string');
      }

      if (!operationCode.includes('.') || operationCode.split('.').length < 3) {
        throw new Error('Invalid operation code format: must be in format "app.module.operation" (e.g., "crm.leads.create")');
      }

      // Validate credit cost
      if (typeof creditCost !== 'number' || creditCost < 0) {
        throw new Error('Invalid credit cost: must be a positive number');
      }

      // Check if tenant-specific configuration already exists for this operation
      const existing = await db
        .select()
        .from(creditConfigurations)
        .where(and(
          eq(creditConfigurations.operationCode, operationCode),
          eq(creditConfigurations.tenantId, tenantId),
          eq(creditConfigurations.isGlobal, false)
        ))
        .limit(1);

      // If configuration exists, update it instead of throwing error
      if (existing.length > 0) {
        console.log('⚙️ Updating existing tenant-specific operation cost configuration');

        const updateData = {
          creditCost: creditCost.toString(),
          unit,
          unitMultiplier: unitMultiplier.toString(),
          isActive,
          updatedBy: userId,
          updatedAt: new Date()
        };

        // Add optional fields if they exist in configData
        if (configData.operationName !== undefined) updateData.operationName = configData.operationName;
        if (configData.category !== undefined) updateData.category = configData.category;
        if (configData.freeAllowance !== undefined) updateData.freeAllowance = configData.freeAllowance;
        if (configData.freeAllowancePeriod !== undefined) updateData.freeAllowancePeriod = configData.freeAllowancePeriod;
        if (configData.volumeTiers !== undefined) updateData.volumeTiers = JSON.stringify(configData.volumeTiers);
        if (configData.allowOverage !== undefined) updateData.allowOverage = configData.allowOverage;
        if (configData.overageLimit !== undefined) updateData.overageLimit = configData.overageLimit;
        if (configData.overagePeriod !== undefined) updateData.overagePeriod = configData.overagePeriod;
        if (configData.overageCost !== undefined) updateData.overageCost = configData.overageCost.toString();
        if (configData.scope !== undefined) updateData.scope = configData.scope;
        if (configData.priority !== undefined) updateData.priority = configData.priority;

        await db
          .update(creditConfigurations)
          .set(updateData)
          .where(eq(creditConfigurations.configId, existing[0].configId));

        console.log('✅ Updated tenant-specific operation cost configuration');
        return { success: true, message: 'Tenant operation cost configuration updated successfully', configId: existing[0].configId };
      }

      // Validate user exists
      const { tenantUsers } = await import('../db/schema/index.js');
      const userExists = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, userId))
        .limit(1);

      if (userExists.length === 0) {
        throw new Error('Invalid user ID');
      }

      // Create tenant-specific configuration
      const insertData = {
        operationCode,
        tenantId,
        isGlobal: false,
        creditCost: creditCost.toString(),
        unit,
        unitMultiplier: unitMultiplier.toString(),
        isActive,
        scope,
        priority,
        createdBy: userId,
        updatedBy: userId
      };

      // Add optional fields if they exist
      if (operationName !== undefined) insertData.operationName = operationName;
      if (category !== undefined) insertData.category = category;
      if (freeAllowance !== undefined) insertData.freeAllowance = freeAllowance;
      if (freeAllowancePeriod !== undefined) insertData.freeAllowancePeriod = freeAllowancePeriod;
      if (volumeTiers !== undefined) insertData.volumeTiers = JSON.stringify(volumeTiers);
      if (allowOverage !== undefined) insertData.allowOverage = allowOverage;
      if (overageLimit !== undefined) insertData.overageLimit = overageLimit;
      if (overagePeriod !== undefined) insertData.overagePeriod = overagePeriod;
      if (overageCost !== undefined) insertData.overageCost = overageCost.toString();

      console.log('📝 Inserting tenant configuration data:', insertData);

      const newConfig = await db
        .insert(creditConfigurations)
        .values(insertData)
        .returning();

      console.log('✅ Tenant-specific operation cost created:', newConfig[0]);

      return {
        success: true,
        config: newConfig[0],
        action: 'created'
      };
    } catch (error) {
      console.error('❌ Error creating tenant operation cost:', error);

      // Provide more specific error messages
      if (error.code === '23505') {
        // This should no longer happen since we check for existing configs first
        console.warn('⚠️ Unexpected unique constraint violation in createTenantOperationCost:', error);
        throw new Error('Tenant operation cost configuration already exists. Please try updating instead.');
      } else if (error.code === '23503') {
        throw new Error('Invalid tenant ID or user ID');
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Failed to create tenant operation cost');
      }
    }
  }

  /**
   * Get permissions for a specific module
   */
  static async getModulePermissions(moduleCode) {
    try {
      const [module] = await db
        .select({
          permissions: applicationModules.permissions,
          appCode: applicationsTable.appCode
        })
        .from(applicationModules)
        .leftJoin(applicationsTable, eq(applicationModules.appId, applicationsTable.appId))
        .where(and(
          eq(applicationModules.moduleCode, moduleCode),
          eq(applicationsTable.status, 'active')
        ))
        .limit(1);

      if (!module || !module.permissions) {
        // Fallback to standard permissions if not found in database
        const appCode = module?.appCode || 'system';
        return [
          `${appCode}.${moduleCode}.view`,
          `${appCode}.${moduleCode}.create`,
          `${appCode}.${moduleCode}.edit`,
          `${appCode}.${moduleCode}.delete`,
          `${appCode}.${moduleCode}.export`,
          `${appCode}.${moduleCode}.import`
        ];
      }

      // Return permissions from database, formatted with app and module prefix
      const appCode = module.appCode;
      if (Array.isArray(module.permissions)) {
        if (module.permissions.length > 0 && typeof module.permissions[0] === 'object') {
          // Permissions are objects with code property
          return module.permissions.map(permission => `${appCode}.${moduleCode}.${permission.code || permission}`);
        } else {
          // Permissions are simple strings
          return module.permissions.map(permission => `${appCode}.${moduleCode}.${permission}`);
        }
      }
      return [];
    } catch (error) {
      console.error('Error fetching module permissions:', error);
      // Fallback to standard permissions
      return [
        `system.${moduleCode}.view`,
        `system.${moduleCode}.create`,
        `system.${moduleCode}.edit`,
        `system.${moduleCode}.delete`,
        `system.${moduleCode}.export`,
        `system.${moduleCode}.import`
      ];
    }
  }

  /**
   * Create or update module configuration (global or tenant-specific, company admin only)
   */
  static async setModuleConfig(moduleCode, configData, adminUserId, tenantId = null) {
    try {
      console.log('⚙️ Setting module config:', { moduleCode, tenantId });

      // Get real permissions from the application modules table
      const moduleOperations = await this.getModulePermissions(moduleCode);

      const isGlobal = tenantId === null;
      const results = [];

      // Create or update configurations for each operation in the module
      for (const operationCode of moduleOperations) {
        try {
          const existing = await db
            .select()
            .from(creditConfigurations)
            .where(and(
              eq(creditConfigurations.operationCode, operationCode),
              tenantId ? eq(creditConfigurations.tenantId, tenantId) : eq(creditConfigurations.isGlobal, true)
            ));

          const configPayload = {
            operationCode,
            tenantId: tenantId,
            isGlobal: isGlobal,
            creditCost: configData.defaultCreditCost?.toString() || '1.0',
            unit: configData.defaultUnit || 'operation',
            unitMultiplier: '1',
            freeAllowance: configData.maxOperationsPerPeriod?.toString() || '1000',
            freeAllowancePeriod: configData.periodType || 'monthly',
            volumeTiers: [],
            allowOverage: true,
            overageLimit: null,
            overagePeriod: null,
            overageCost: null,
            isActive: configData.isActive ?? true,
            updatedBy: adminUserId,
            updatedAt: new Date()
          };

          let result;
          if (existing.length > 0) {
            result = await db
              .update(creditConfigurations)
              .set(configPayload)
              .where(eq(creditConfigurations.configId, existing[0].configId))
              .returning();
          } else {
            configPayload.createdBy = adminUserId;
            configPayload.createdAt = new Date();
            result = await db
              .insert(creditConfigurations)
              .values(configPayload)
              .returning();
          }

          results.push(result[0]);
        } catch (opError) {
          console.warn(`Failed to set config for operation ${operationCode}:`, opError);
        }
      }

      console.log('✅ Module config set successfully for', results.length, 'operations');
      return results;
    } catch (error) {
      console.error('Error setting module config:', error);
      throw error;
    }
  }

  /**
   * Create or update application configuration (global or tenant-specific, company admin only)
   */
  static async setAppConfig(appCode, configData, adminUserId, tenantId = null) {
    try {
      console.log('⚙️ Setting app config:', { appCode, tenantId });

      // Create system-level operations for the app
      const appOperations = [
        `${appCode}.system.access`,
        `${appCode}.system.admin`,
        `${appCode}.system.configure`,
        `${appCode}.system.integrate`,
        `${appCode}.system.report`,
        `${appCode}.system.export`
      ];

      const isGlobal = tenantId === null;
      const results = [];

      // Create or update configurations for each operation in the app
      for (const operationCode of appOperations) {
        try {
          const existing = await db
            .select()
            .from(creditConfigurations)
            .where(and(
              eq(creditConfigurations.operationCode, operationCode),
              tenantId ? eq(creditConfigurations.tenantId, tenantId) : eq(creditConfigurations.isGlobal, true)
            ));

          const configPayload = {
            operationCode,
            tenantId: tenantId,
            isGlobal: isGlobal,
            creditCost: configData.defaultCreditCost?.toString() || '2.0',
            unit: configData.defaultUnit || 'operation',
            unitMultiplier: '1',
            freeAllowance: configData.maxMonthlyOperations?.toString() || '5000',
            freeAllowancePeriod: 'monthly',
            volumeTiers: [],
            allowOverage: true,
            overageLimit: configData.maxMonthlyOperations ? (configData.maxMonthlyOperations * 2).toString() : null,
            overagePeriod: 'monthly',
            overageCost: (parseFloat(configData.defaultCreditCost?.toString() || '2.0') * 1.5).toString(),
            isActive: configData.isActive ?? true,
            updatedBy: adminUserId,
            updatedAt: new Date()
          };

          let result;
          if (existing.length > 0) {
            result = await db
              .update(creditConfigurations)
              .set(configPayload)
              .where(eq(creditConfigurations.configId, existing[0].configId))
              .returning();
          } else {
            configPayload.createdBy = adminUserId;
            configPayload.createdAt = new Date();
            result = await db
              .insert(creditConfigurations)
              .values(configPayload)
              .returning();
          }

          results.push(result[0]);
        } catch (opError) {
          console.warn(`Failed to set config for operation ${operationCode}:`, opError);
        }
      }

      console.log('✅ App config set successfully for', results.length, 'operations');
      return results;
    } catch (error) {
      console.error('Error setting app config:', error);
      throw error;
    }
  }

  // REMOVED: markAlertAsRead - Alert system removed for MVP simplicity

  /**
   * Get available credit packages
   */
  static async getAvailablePackages() {
    // Return static packages for now - in production, this could be dynamic
    return [
      {
        id: 'starter',
        name: 'Starter Package',
        credits: 1000,
        price: 49,
        currency: 'USD',
        description: 'Perfect for small businesses getting started',
        features: [
          '1,000 credits',
          'Basic operations support',
          'Email support',
          '1 month validity'
        ],
        recommended: false
      },
      {
        id: 'professional',
        name: 'Professional Package',
        credits: 5000,
        price: 199,
        currency: 'USD',
        description: 'Ideal for growing businesses with regular operations',
        features: [
          '5,000 credits',
          'Advanced operations support',
          'Priority email support',
          '3 months validity',
          'Basic reporting'
        ],
        recommended: true
      },
      {
        id: 'enterprise',
        name: 'Enterprise Package',
        credits: 15000,
        price: 499,
        currency: 'USD',
        description: 'For large organizations with high-volume operations',
        features: [
          '15,000 credits',
          'Full operations support',
          'Phone & email support',
          '6 months validity',
          'Advanced reporting',
          'Custom integrations'
        ],
        recommended: false
      }
    ];
  }

  /**
   * Get credit statistics for dashboard
   */
  static async getCreditStats(tenantId) {
    try {
      const balance = await this.getCurrentBalance(tenantId);
      const usageSummary = await this.getUsageSummary(tenantId);

      const [transactionStats] = await db
        .select({
          totalTransactions: sql`count(*)`,
          totalAmount: sql`sum(abs(${creditTransactions.amount}))`
        })
        .from(creditTransactions)
        .where(eq(creditTransactions.tenantId, tenantId));

      return {
        balance,
        usage: usageSummary,
        transactions: {
          total: parseInt(transactionStats.totalTransactions || 0),
          totalAmount: parseFloat(transactionStats.totalAmount || 0)
        }
      };
    } catch (error) {
      console.error('Error fetching credit statistics:', error);
      throw error;
    }
  }
}
