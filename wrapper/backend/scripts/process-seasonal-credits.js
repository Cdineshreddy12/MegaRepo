#!/usr/bin/env node

/**
 * Process Seasonal Credits Job
 *
 * This script handles:
 * 1. Processing expired seasonal credits
 * 2. Sending expiry warning notifications
 * 3. Cleaning up old expired credit records
 *
 * Run this script periodically (e.g., daily) via cron:
 * 0 2 * * * /usr/bin/node /path/to/backend/scripts/process-seasonal-credits.js
 */

import { SeasonalCreditService } from '../src/services/seasonal-credit-service.js';
import { SeasonalCreditNotificationService } from '../src/services/seasonal-credit-notification-service.js';
import { db } from '../src/db/index.js';
import { eq, and, lt, sql } from 'drizzle-orm';
import { creditAllocations } from '../src/db/schema/index.js';

async function main() {
  console.log('🎄 Starting seasonal credits processing job...');

  const startTime = Date.now();

  try {
    const seasonalService = new SeasonalCreditService();
    const notificationService = new SeasonalCreditNotificationService();

    // Step 1: Process expired seasonal credits
    console.log('\n📅 Processing expired seasonal credits...');
    const expiryResult = await seasonalService.processSeasonalCreditExpiries();

    // Step 2: Send expiry warnings
    console.log('\n📧 Sending expiry warning notifications...');
    const warningResults = await notificationService.scheduleAutomatedWarnings();

    // Step 3: Clean up old expired records (older than 90 days)
    console.log('\n🧹 Cleaning up old expired credit records...');
    const ninetyDaysAgo = new Date(Date.now() - (90 * 24 * 60 * 60 * 1000));

    const cleanupResult = await db
      .delete(creditAllocations)
      .where(and(
        eq(creditAllocations.isActive, false),
        lt(creditAllocations.expiresAt, ninetyDaysAgo)
      ));

    console.log(`🗑️ Cleaned up ${cleanupResult.rowCount} old expired credit records`);

    // Step 4: Generate summary report
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log('\n📊 Seasonal Credits Processing Summary:');
    console.log('='.repeat(50));
    console.log(`⏱️  Processing Time: ${duration.toFixed(2)} seconds`);
    console.log(`💰 Credits Expired: ${expiryResult.totalExpired}`);
    console.log(`📧 Warning Emails Sent:`);
    console.log(`   - 7 days: ${warningResults['7_days'].emailsSent} emails`);
    console.log(`   - 3 days: ${warningResults['3_days'].emailsSent} emails`);
    console.log(`   - 1 day: ${warningResults['1_day'].emailsSent} emails`);
    console.log(`🧹 Records Cleaned: ${cleanupResult.rowCount}`);
    console.log('='.repeat(50));

    // Optional: Send admin notification for significant events
    const totalEmailsSent = Object.values(warningResults).reduce((sum, result) => sum + result.emailsSent, 0);

    if (expiryResult.totalExpired > 0 || totalEmailsSent > 0) {
      console.log('✅ Job completed successfully with activity');
    } else {
      console.log('✅ Job completed - no action needed');
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Error in seasonal credits processing job:', error);

    // Optional: Send alert to admins about job failure
    console.log('🚨 Consider setting up alerts for job failures');

    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️ Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️ Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the job
main().catch((error) => {
  console.error('💥 Unhandled error in seasonal credits job:', error);
  process.exit(1);
});
