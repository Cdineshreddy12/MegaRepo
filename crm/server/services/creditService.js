import mongoose from 'mongoose';
import CrmEntityCredit from '../models/CrmEntityCredit.js';
import CreditTransaction from '../models/CreditTransaction.js';

class CreditService {
  constructor() {
    this.eventHandlers = {};
  }

  // Generate unique transaction ID
  generateTransactionId() {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Allocate credits with transaction logging
  async allocateCredits(tenantId, entityId, amount, source = 'wrapper', metadata = {}) {
    if (amount <= 0) {
      throw new Error('Allocation amount must be positive');
    }

    // Check for idempotency using sourceEventId to prevent duplicate allocations
    if (metadata.sourceEventId) {
      const existingTransaction = await CreditTransaction.findOne({
        tenantId,
        'metadata.sourceEventId': metadata.sourceEventId,
        type: 'allocation'
      });

      if (existingTransaction) {
        console.log(`⏭️ Credit allocation already exists for event ${metadata.sourceEventId}, skipping duplicate allocation`);

        // If it's processed, return the existing result
        if (existingTransaction.status === 'processed') {
          const creditRecord = await CrmEntityCredit.findOne({ tenantId, entityIdString: entityId });
          return {
            success: true,
            creditRecord,
            transaction: existingTransaction,
            wasIdempotent: true
          };
        } else {
          // If it's still pending/failed, don't process again to avoid duplicates
          throw new Error(`Event ${metadata.sourceEventId} is already being processed`);
        }
      }
    }

    // Create transaction record
    const transactionId = this.generateTransactionId();
    const transaction = await CreditTransaction.create({
      transactionId,
      tenantId,
      entityId,
      type: 'allocation',
      amount,
      source,
      metadata,
      status: 'pending'
    });

    try {
      // Update core credit record atomically
      let creditRecord = await CrmEntityCredit.findOne({ tenantId, entityIdString: entityId });

      if (!creditRecord) {
        // Create new record
        creditRecord = await CrmEntityCredit.create({
          tenantId,
          entityIdString: entityId,
          allocatedCredits: amount,
          usedCredits: 0,
          availableCredits: amount,
          transactionIds: [transactionId],
          lastTransactionId: transactionId,
          version: 1,
          reconciliationStatus: 'synced'
        });
      } else {
        // Update existing record with retry logic for concurrent modifications
        let updateSuccess = false;
        let attempts = 0;
        const maxAttempts = 5;

        while (!updateSuccess && attempts < maxAttempts) {
          try {
            // Always re-fetch the current record to get the latest version
            const currentRecord = await CrmEntityCredit.findOne({ tenantId, entityIdString: entityId });
            if (!currentRecord) {
              // Record was deleted during retry, create a new one
              console.log(`Record disappeared during retry, creating new record for entity ${entityId}`);
              creditRecord = await CrmEntityCredit.create({
                tenantId,
                entityIdString: entityId,
                allocatedCredits: amount,
                usedCredits: 0,
                availableCredits: amount,
                transactionIds: [transactionId],
                lastTransactionId: transactionId,
                version: 1,
                reconciliationStatus: 'synced'
              });
              updateSuccess = true;
              break;
            }

            // Use optimistic locking to prevent concurrent modifications
            const updatedRecord = await CrmEntityCredit.findOneAndUpdate(
              { _id: currentRecord._id, version: currentRecord.version }, // Optimistic locking
              {
                $inc: {
                  allocatedCredits: amount,
                  version: 1
                },
                $set: {
                  availableCredits: currentRecord.allocatedCredits + amount - currentRecord.usedCredits,
                  lastTransactionId: transactionId,
                  lastSyncAt: new Date(),
                  reconciliationStatus: 'synced'
                },
                $push: { transactionIds: transactionId }
              },
              { new: true, runValidators: true }
            );

            if (!updatedRecord) {
              attempts++;
              if (attempts < maxAttempts) {
                // Wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, 50 * attempts));
                continue;
              }
              throw new Error('Concurrent modification during credit allocation - max retries exceeded');
            }

            creditRecord = updatedRecord; // Update the reference
            updateSuccess = true;

          } catch (error) {
            if ((error.message.includes('Concurrent modification') ||
                 error.message.includes('Credit record no longer exists') ||
                 error.message.includes('Credit record reference lost')) &&
                attempts < maxAttempts - 1) {
              attempts++;
              // Re-fetch the record for the next attempt
              const freshRecord = await CrmEntityCredit.findOne({ tenantId, entityIdString: entityId });
              if (freshRecord) {
                creditRecord = freshRecord;
              } else {
                // Record was deleted, create a new one
                creditRecord = await CrmEntityCredit.create({
                  tenantId,
                  entityId,
                  allocatedCredits: amount,
                  usedCredits: 0,
                  availableCredits: amount,
                  transactionIds: [transactionId],
                  lastTransactionId: transactionId,
                  version: 1,
                  reconciliationStatus: 'synced'
                });
                updateSuccess = true;
                break;
              }
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, 50 * attempts));
              continue;
            }
            throw error;
          }
        }

        if (!updateSuccess) {
          throw new Error('Failed to update credit record after multiple attempts');
        }
      }

      // Mark transaction as processed
      await transaction.updateOne({
        status: 'processed',
        processedAt: new Date(),
        creditRecordId: creditRecord._id
      });

      // Publish to Redis streams for cross-system sync
      if (source === 'wrapper') {
        // Wrapper allocation - CRM needs to know
        try {
          const redisStreamsService = await import('./redisStreamsService.js');
          await redisStreamsService.default.publishCreditAllocation(
            tenantId,
            entityId,
            amount,
            metadata
          );
        } catch (redisError) {
          console.warn('⚠️ Failed to publish credit allocation to Redis:', redisError.message);
          // Don't fail the entire allocation if Redis publishing fails
        }
      }

      // Emit local event
      await this.emitEvent('credit.allocated', {
        transactionId,
        tenantId,
        entityId,
        amount,
        source,
        finalAllocated: creditRecord.allocatedCredits,
        finalAvailable: creditRecord.availableCredits,
        metadata
      });

      return {
        success: true,
        creditRecord,
        transaction
      };

    } catch (error) {
      // Mark transaction as failed
      await transaction.updateOne({
        status: 'failed',
        errorMessage: error.message,
        processedAt: new Date()
      });
      throw error;
    }
  }

  // Consume credits with transaction logging
  async consumeCredits(tenantId, entityId, amount, operationType, operationId, source = 'crm', userId = null, metadata = {}) {
    if (amount <= 0) {
      throw new Error('Consumption amount must be positive');
    }

    // Create transaction record
    const transactionId = this.generateTransactionId();
    const transaction = await CreditTransaction.create({
      transactionId,
      tenantId,
      entityId,
      type: 'consumption',
      amount,
      operationType,
      operationId,
      source,
      metadata,
      status: 'pending'
    });

    try {
      // Get current record for validation
      const currentRecord = await CrmEntityCredit.findOne({
        tenantId,
        entityIdString: entityId,
        isActive: true
      });

      if (!currentRecord || currentRecord.availableCredits < amount) {
        throw new Error('Insufficient credits available');
      }

      // Update core record atomically with validation and retry logic
      let creditRecord = null;
      let updateSuccess = false;
      let attempts = 0;
      const maxAttempts = 5;

      while (!updateSuccess && attempts < maxAttempts) {
        try {
          // Re-fetch the current record to get the latest version
          const freshRecord = await CrmEntityCredit.findOne({
            tenantId,
            entityIdString: entityId,
            isActive: true
          });

          if (!freshRecord || freshRecord.availableCredits < amount) {
            throw new Error('Insufficient credits available');
          }

          creditRecord = await CrmEntityCredit.findOneAndUpdate(
            {
              _id: freshRecord._id,
              version: freshRecord.version, // Optimistic locking
              availableCredits: { $gte: amount }, // Double-check sufficient credits
              isActive: true
            },
            {
              $inc: {
                usedCredits: amount,
                version: 1
              },
              $set: {
                availableCredits: freshRecord.allocatedCredits - (freshRecord.usedCredits + amount),
                lastTransactionId: transactionId,
                lastSyncAt: new Date(),
                reconciliationStatus: 'synced'
              },
              $push: { transactionIds: transactionId }
            },
            { new: true }
          );

          if (!creditRecord) {
            attempts++;
            if (attempts < maxAttempts) {
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, 50 * attempts));
              continue;
            }
            throw new Error('Failed to consume credits - concurrent modifications exceeded max retries');
          }

          updateSuccess = true;

        } catch (error) {
          if ((error.message.includes('Insufficient credits') || error.message.includes('version')) && attempts < maxAttempts - 1) {
            attempts++;
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 50 * attempts));
            continue;
          }
          throw error;
        }
      }

      if (!updateSuccess || !creditRecord) {
        throw new Error('Failed to consume credits after multiple attempts');
      }

      // Mark transaction as processed
      await transaction.updateOne({
        status: 'processed',
        processedAt: new Date(),
        creditRecordId: creditRecord._id
      });

      // NOTE: Credit consumption/transaction events are NOT published to Redis streams
      // Only credit allocation events (from wrapper) are consumed from credit-events stream
      // Credit deductions/transactions are internal CRM operations and don't need to be synced

      // Emit local consumption event
      await this.emitEvent('credit.consumed', {
        transactionId,
        tenantId,
        entityId,
        amount,
        operationType,
        operationId,
        source,
        remainingCredits: creditRecord.availableCredits,
        metadata
      });

      return {
        success: true,
        creditRecord,
        transaction
      };

    } catch (error) {
      // Mark transaction as failed
      await transaction.updateOne({
        status: 'failed',
        errorMessage: error.message,
        processedAt: new Date()
      });
      throw error;
    }
  }

  // Refund credits (rollback a previous consumption)
  async refundCredits(tenantId, entityId, amount, originalTransactionId, reason = 'operation_failed', metadata = {}) {
    if (amount <= 0) {
      throw new Error('Refund amount must be positive');
    }

    // Create refund transaction record
    const refundTransactionId = this.generateTransactionId();
    const refundTransaction = await CreditTransaction.create({
      transactionId: refundTransactionId,
      tenantId,
      entityId,
      type: 'refund',
      amount,
      operationType: 'refund',
      operationId: originalTransactionId,
      source: 'crm',
      metadata: {
        ...metadata,
        originalTransactionId,
        reason,
        refundedAt: new Date()
      },
      status: 'pending'
    });

    try {
      // Get current record for validation
      const currentRecord = await CrmEntityCredit.findOne({
        tenantId,
        entityIdString: entityId,
        isActive: true
      });

      if (!currentRecord) {
        throw new Error('Credit record not found for refund');
      }

      // Update core record atomically to refund credits
      let creditRecord = null;
      let updateSuccess = false;
      let attempts = 0;
      const maxAttempts = 5;

      while (!updateSuccess && attempts < maxAttempts) {
        try {
          // Re-fetch the current record to get the latest version
          const freshRecord = await CrmEntityCredit.findOne({
            tenantId,
            entityIdString: entityId,
            isActive: true
          });

          if (!freshRecord) {
            throw new Error('Credit record not found during refund');
          }

          creditRecord = await CrmEntityCredit.findOneAndUpdate(
            {
              _id: freshRecord._id,
              version: freshRecord.version, // Optimistic locking
              isActive: true
            },
            {
              $inc: {
                usedCredits: -amount, // Decrease used credits (refund)
                version: 1
              },
              $set: {
                availableCredits: freshRecord.allocatedCredits - (freshRecord.usedCredits - amount),
                lastTransactionId: refundTransactionId,
                lastSyncAt: new Date(),
                reconciliationStatus: 'synced'
              },
              $push: { transactionIds: refundTransactionId }
            },
            { new: true }
          );

          if (!creditRecord) {
            attempts++;
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 50 * attempts));
              continue;
            }
            throw new Error('Failed to refund credits - concurrent modifications exceeded max retries');
          }

          updateSuccess = true;

        } catch (error) {
          if (error.message.includes('version') && attempts < maxAttempts - 1) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 50 * attempts));
            continue;
          }
          throw error;
        }
      }

      if (!updateSuccess || !creditRecord) {
        throw new Error('Failed to refund credits after multiple attempts');
      }

      // Mark refund transaction as processed
      await refundTransaction.updateOne({
        status: 'processed',
        processedAt: new Date(),
        creditRecordId: creditRecord._id
      });

      console.log(`✅ Credits refunded: ${amount} to entity ${entityId} (original tx: ${originalTransactionId})`);

      return {
        success: true,
        creditRecord,
        transaction: refundTransaction
      };

    } catch (error) {
      // Mark refund transaction as failed
      await refundTransaction.updateOne({
        status: 'failed',
        errorMessage: error.message,
        processedAt: new Date()
      });
      throw error;
    }
  }

  // Get available credits (fast lookup from core record)
  async getAvailableCredits(tenantId, entityId) {
    const creditRecord = await CrmEntityCredit.findOne(
      { tenantId, entityIdString: entityId, isActive: true },
      { availableCredits: 1, allocatedCredits: 1, usedCredits: 1 }
    );

    return creditRecord || { availableCredits: 0, allocatedCredits: 0, usedCredits: 0 };
  }

  // Verify credits by recalculating from transaction log
  async verifyCredits(tenantId, entityId) {
    // Get from core record
    const coreCredits = await this.getAvailableCredits(tenantId, entityId);

    // Recalculate from transactions
    const calculatedCredits = await CreditTransaction.getEntityBalance(tenantId, entityId);

    // Check consistency
    const isConsistent = Math.abs(coreCredits.availableCredits - calculatedCredits.availableCredits) < 0.01;

    if (!isConsistent) {
      console.warn(`Credit inconsistency detected for ${tenantId}/${entityId}`);
      console.log(`Core record: ${coreCredits.availableCredits}, Calculated: ${calculatedCredits.availableCredits}`);

      // Trigger reconciliation
      await this.reconcileCredits(tenantId, entityId);

      return {
        ...coreCredits,
        isConsistent: false,
        wasReconciled: true
      };
    }

    return {
      ...coreCredits,
      isConsistent: true
    };
  }

  // Reconcile credits from transaction log
  async reconcileCredits(tenantId, entityId) {
    try {
      // Get all processed transactions
      const transactions = await CreditTransaction.find({
        tenantId,
        entityId,
        status: 'processed'
      }).sort({ createdAt: 1 });

      // Recalculate totals
      let totalAllocated = 0;
      let totalUsed = 0;
      const transactionIds = [];

      for (const tx of transactions) {
        transactionIds.push(tx.transactionId);

        if (tx.type === 'allocation') {
          totalAllocated += tx.amount;
        } else if (tx.type === 'consumption') {
          totalUsed += tx.amount;
        }
      }

      const correctAvailable = totalAllocated - totalUsed;

      // Update core record
      await CrmEntityCredit.findOneAndUpdate(
        { tenantId, entityIdString: entityId },
        {
          allocatedCredits: totalAllocated,
          usedCredits: totalUsed,
          availableCredits: correctAvailable,
          transactionIds: transactionIds.slice(-1000), // Keep last 1000 for reference
          lastReconciledAt: new Date(),
          reconciliationStatus: 'synced',
          version: { $inc: 1 }
        },
        { upsert: true, new: true }
      );

      console.log(`Reconciled credits for ${tenantId}/${entityId}: ${correctAvailable} available`);
      return true;

    } catch (error) {
      console.error(`Reconciliation failed for ${tenantId}/${entityId}:`, error);

      // Mark as failed
      await CrmEntityCredit.findOneAndUpdate(
        { tenantId, entityIdString: entityId },
        { reconciliationStatus: 'failed' }
      );

      return false;
    }
  }

  // Get transaction history
  async getTransactionHistory(tenantId, entityId, limit = 50, offset = 0) {
    return await CreditTransaction.find({ tenantId, entityId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset);
  }

  // Event system (simple implementation)
  on(event, handler) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  async emitEvent(event, data) {
    const handlers = this.eventHandlers[event] || [];
    for (const handler of handlers) {
      try {
        await handler(data);
      } catch (error) {
        console.error(`Event handler error for ${event}:`, error);
      }
    }
  }

  // Reservation system (for future use)
  async createReservation(tenantId, entityId, amount, ttlSeconds = 300) {
    const reservationId = `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const transaction = await CreditTransaction.create({
      transactionId: this.generateTransactionId(),
      tenantId,
      entityId,
      type: 'reservation',
      amount,
      source: 'crm',
      reservationId,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      status: 'processed'
    });

    return { reservationId, transaction };
  }

  async commitReservation(reservationId) {
    const transaction = await CreditTransaction.findOneAndUpdate(
      { reservationId, status: 'processed' },
      { type: 'commit' },
      { new: true }
    );

    if (!transaction) {
      throw new Error('Reservation not found or already processed');
    }

    return transaction;
  }

  async releaseReservation(reservationId) {
    const transaction = await CreditTransaction.findOneAndUpdate(
      { reservationId, status: 'processed' },
      { type: 'release' },
      { new: true }
    );

    return transaction;
  }
}

export default new CreditService();
