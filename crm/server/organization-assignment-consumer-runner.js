#!/usr/bin/env node

/**
 * Organization Assignment Consumer Runner
 * Starts the Redis streams consumer for organization assignment events
 */

import mongoose from 'mongoose';
import { getOrganizationAssignmentConsumer } from './services/organizationAssignmentConsumer.js';

// Initialize database connection
async function connectToDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI environment variable is required');
      process.exit(1);
    }
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 60000
    });

    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  console.log(`🛑 Received ${signal}. Starting graceful shutdown...`);

  try {
    // Close database connection
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected');

    // Disconnect Redis consumer
    const consumer = getOrganizationAssignmentConsumer();
    await consumer.disconnect();
    console.log('✅ Organization Assignment Consumer disconnected');

    console.log('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Main execution function
async function main() {
  try {
    // Set up graceful shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart

    // Connect to database
    await connectToDatabase();

    // Get and start the consumer
    const consumer = getOrganizationAssignmentConsumer();

    console.log('🚀 Starting Organization Assignment Consumer...');
    console.log('📊 Stream: crm:organization-assignments');
    console.log('👥 Consumer Group: org-assignment-consumers');

    // Start consuming messages
    await consumer.startConsuming();

  } catch (error) {
    console.error('❌ Fatal error in Organization Assignment Consumer:', error);

    // Ensure graceful shutdown even on fatal errors
    try {
      await mongoose.disconnect();
      const consumer = getOrganizationAssignmentConsumer();
      await consumer.disconnect();
    } catch (shutdownError) {
      console.error('❌ Error during emergency shutdown:', shutdownError);
    }

    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection at:', promise, 'reason:', reason);
  // Don't exit immediately, let graceful shutdown handle it
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit immediately, let graceful shutdown handle it
});

// Start the application
main().catch((error) => {
  console.error('❌ Failed to start Organization Assignment Consumer:', error);
  process.exit(1);
});
