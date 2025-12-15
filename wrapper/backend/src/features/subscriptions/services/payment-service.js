import { db } from '../../../db/index.js';
import { payments } from '../../../db/schema/subscriptions.js';
import { eq, desc, and } from 'drizzle-orm';

export class PaymentService {
  // Record a comprehensive payment transaction
  static async recordPayment(paymentData) {
    try {
      const [payment] = await db.insert(payments).values({
        tenantId: paymentData.tenantId,
        subscriptionId: paymentData.subscriptionId,
        stripePaymentIntentId: paymentData.stripePaymentIntentId,
        stripeInvoiceId: paymentData.stripeInvoiceId,
        stripeChargeId: paymentData.stripeChargeId,
        stripeCustomerId: paymentData.stripeCustomerId,
        stripeSubscriptionId: paymentData.stripeSubscriptionId,
        amount: paymentData.amount,
        currency: paymentData.currency || 'USD',
        status: paymentData.status,
        paymentMethod: paymentData.paymentMethod,
        paymentMethodDetails: paymentData.paymentMethodDetails || {},
        paymentType: paymentData.paymentType || 'subscription',
        billingReason: paymentData.billingReason,
        invoiceNumber: paymentData.invoiceNumber,
        description: paymentData.description,
        prorationAmount: paymentData.prorationAmount || '0',
        creditAmount: paymentData.creditAmount || '0',
        taxAmount: paymentData.taxAmount || '0',
        taxRate: paymentData.taxRate || '0',
        taxRegion: paymentData.taxRegion,
        processingFees: paymentData.processingFees || '0',
        netAmount: paymentData.netAmount,
        riskLevel: paymentData.riskLevel || 'normal',
        riskScore: paymentData.riskScore,
        fraudDetails: paymentData.fraudDetails || {},
        metadata: paymentData.metadata || {},
        stripeRawData: paymentData.stripeRawData || {},
        paidAt: paymentData.paidAt || new Date(),
      }).returning();

      console.log('✅ Payment recorded:', payment.paymentId);
      return payment;
    } catch (error) {
      console.error('❌ Failed to record payment:', error);
      throw error;
    }
  }

  // Update payment status with comprehensive metadata
  static async updatePaymentStatus(paymentIntentId, status, metadata = {}) {
    try {
      const [updatedPayment] = await db
        .update(payments)
        .set({
          status,
          metadata,
          updatedAt: new Date(),
          ...(status === 'succeeded' && { paidAt: new Date() }),
          ...(status === 'failed' && { failedAt: new Date() }),
          ...(status === 'refunded' && { refundedAt: new Date() }),
          ...(status === 'disputed' && { disputedAt: new Date() })
        })
        .where(eq(payments.stripePaymentIntentId, paymentIntentId))
        .returning();

      return updatedPayment;
    } catch (error) {
      console.error('❌ Failed to update payment status:', error);
      throw error;
    }
  }

  // Get comprehensive payment history for a tenant
  static async getPaymentHistory(tenantId, limit = 50) {
    try {
      const paymentHistory = await db
        .select()
        .from(payments)
        .where(eq(payments.tenantId, tenantId))
        .orderBy(desc(payments.createdAt))
        .limit(limit);

      return paymentHistory;
    } catch (error) {
      console.error('❌ Failed to get payment history:', error);
      throw error;
    }
  }

  // Record a comprehensive refund
  static async recordRefund(originalPaymentId, refundAmount, reason) {
    try {
      // Get the original payment
      const [originalPayment] = await db
        .select()
        .from(payments)
        .where(eq(payments.paymentId, originalPaymentId))
        .limit(1);

      if (!originalPayment) {
        throw new Error('Original payment not found');
      }

      const isPartialRefund = parseFloat(refundAmount) < parseFloat(originalPayment.amount);

      // Update original payment record
      const [updatedPayment] = await db
        .update(payments)
        .set({
          amountRefunded: refundAmount.toString(),
          status: isPartialRefund ? 'partially_refunded' : 'refunded',
          refundReason: reason,
          isPartialRefund,
          refundedAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            ...originalPayment.metadata,
            refund: {
              amount: refundAmount,
              reason: reason,
              processed_at: new Date().toISOString(),
              is_partial: isPartialRefund
            }
          }
        })
        .where(eq(payments.paymentId, originalPaymentId))
        .returning();

      // Create separate refund record
      const [refundRecord] = await db.insert(payments).values({
        tenantId: originalPayment.tenantId,
        subscriptionId: originalPayment.subscriptionId,
        stripeChargeId: originalPayment.stripeChargeId,
        amount: (-parseFloat(refundAmount)).toString(), // Negative for refund
        currency: originalPayment.currency,
        status: 'succeeded',
        paymentType: 'refund',
        billingReason: 'refund',
        description: `Refund for ${reason || 'customer request'}`,
        refundReason: reason,
        metadata: {
          originalPaymentId: originalPaymentId,
          refundReason: reason,
          isPartialRefund
        },
        paidAt: new Date()
      }).returning();

      return { updatedPayment, refundRecord };
    } catch (error) {
      console.error('❌ Failed to record refund:', error);
      throw error;
    }
  }

  // Get payment statistics for a tenant
  static async getPaymentStats(tenantId) {
    try {
      const paymentHistory = await this.getPaymentHistory(tenantId);
      
      const stats = {
        totalPaid: 0,
        totalRefunded: 0,
        successfulPayments: 0,
        failedPayments: 0,
        lastPayment: null,
        monthlySpend: 0,
        averageTransactionValue: 0,
        disputeCount: 0,
        processingFees: 0
      };

      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      paymentHistory.forEach(payment => {
        const amount = parseFloat(payment.amount);
        
        if (payment.status === 'succeeded' && payment.paymentType !== 'refund') {
          stats.totalPaid += amount;
          stats.successfulPayments++;
          
          if (!stats.lastPayment || payment.paidAt > stats.lastPayment.paidAt) {
            stats.lastPayment = payment;
          }

          // Calculate monthly spend
          if (payment.paidAt >= currentMonth) {
            stats.monthlySpend += amount;
          }

          // Add processing fees
          if (payment.processingFees) {
            stats.processingFees += parseFloat(payment.processingFees);
          }
        } else if (payment.status === 'failed') {
          stats.failedPayments++;
        }

        // Count refunds
        if (payment.amountRefunded && parseFloat(payment.amountRefunded) > 0) {
          stats.totalRefunded += parseFloat(payment.amountRefunded);
        }

        // Count disputes
        if (payment.status === 'disputed' || payment.stripeDisputeId) {
          stats.disputeCount++;
        }
      });

      // Calculate average transaction value
      if (stats.successfulPayments > 0) {
        stats.averageTransactionValue = stats.totalPaid / stats.successfulPayments;
      }

      return stats;
    } catch (error) {
      console.error('❌ Failed to get payment stats:', error);
      throw error;
    }
  }

  // Get payment methods from payment history (since we removed the separate table)
  static async getPaymentMethods(tenantId) {
    try {
      // Get unique payment methods from successful payments
      const uniquePaymentMethods = await db
        .select({
          paymentMethod: payments.paymentMethod,
          paymentMethodDetails: payments.paymentMethodDetails,
          lastUsed: payments.paidAt,
          count: payments.paymentId
        })
        .from(payments)
        .where(and(
          eq(payments.tenantId, tenantId),
          eq(payments.status, 'succeeded')
        ))
        .orderBy(desc(payments.paidAt));

      // Group by payment method and get the most recent details
      const methodsMap = new Map();
      
      uniquePaymentMethods.forEach(payment => {
        const method = payment.paymentMethod;
        if (!methodsMap.has(method) || payment.lastUsed > methodsMap.get(method).lastUsed) {
          methodsMap.set(method, {
            type: method,
            details: payment.paymentMethodDetails,
            lastUsed: payment.lastUsed,
            isActive: true
          });
        }
      });

      return Array.from(methodsMap.values());
    } catch (error) {
      console.error('❌ Failed to get payment methods:', error);
      throw error;
    }
  }

  // Record dispute information
  static async recordDispute(paymentId, disputeData) {
    try {
      const [updatedPayment] = await db
        .update(payments)
        .set({
          status: 'disputed',
          stripeDisputeId: disputeData.disputeId,
          amountDisputed: disputeData.amount.toString(),
          disputeReason: disputeData.reason,
          disputeStatus: disputeData.status,
          disputedAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            dispute: {
              id: disputeData.disputeId,
              reason: disputeData.reason,
              status: disputeData.status,
              amount: disputeData.amount,
              currency: disputeData.currency,
              evidence_due_by: disputeData.evidenceDueBy,
              has_evidence: disputeData.hasEvidence || false
            }
          }
        })
        .where(eq(payments.paymentId, paymentId))
        .returning();

      return updatedPayment;
    } catch (error) {
      console.error('❌ Failed to record dispute:', error);
      throw error;
    }
  }

  // Get payments by subscription
  static async getPaymentsBySubscription(subscriptionId) {
    try {
      const subscriptionPayments = await db
        .select()
        .from(payments)
        .where(eq(payments.subscriptionId, subscriptionId))
        .orderBy(desc(payments.createdAt));

      return subscriptionPayments;
    } catch (error) {
      console.error('❌ Failed to get subscription payments:', error);
      throw error;
    }
  }

  // Get failed payments for retry
  static async getFailedPayments(tenantId, limit = 10) {
    try {
      const failedPayments = await db
        .select()
        .from(payments)
        .where(and(
          eq(payments.tenantId, tenantId),
          eq(payments.status, 'failed')
        ))
        .orderBy(desc(payments.failedAt))
        .limit(limit);

      return failedPayments;
    } catch (error) {
      console.error('❌ Failed to get failed payments:', error);
      throw error;
    }
  }
} 