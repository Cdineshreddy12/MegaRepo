import { createClient } from 'redis';

async function resetRedisStreams() {
  console.log('⚠️ WARNING: This will completely reset Redis streams!');
  console.log('⚠️ All pending messages will be lost!');
  console.log('⏳ Waiting 5 seconds before proceeding...\n');

  // Safety delay
  await new Promise(resolve => setTimeout(resolve, 5000));

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error('❌ REDIS_URL environment variable is required');
    process.exit(1);
  }

  let client;
  try {
    // Connect to Redis
    client = createClient({ url: redisUrl });
    await client.connect();
    console.log('✅ Connected to Redis\n');

    const streamName = 'credit-events';
    const consumerGroup = 'crm-consumers';

    console.log(`🗑️ Resetting stream: ${streamName}\n`);

    // Step 1: Delete the consumer group
    try {
      await client.xGroupDestroy(streamName, consumerGroup);
      console.log('✅ Consumer group deleted');
    } catch (error) {
      console.log(`ℹ️ Consumer group deletion failed (might not exist): ${error.message}`);
    }

    // Step 2: Delete the stream entirely
    try {
      await client.del(streamName);
      console.log('✅ Stream deleted');
    } catch (error) {
      console.log(`ℹ️ Stream deletion failed (might not exist): ${error.message}`);
    }

    // Step 3: Verify cleanup
    try {
      const info = await client.xInfo(streamName);
      console.log('⚠️ Stream still exists:', info);
    } catch (error) {
      console.log('✅ Stream successfully deleted');
    }

    console.log('\n🎉 Redis streams reset completed!');
    console.log('💡 The Redis consumer will recreate the stream and consumer group on next run.');

  } catch (error) {
    console.error('❌ Redis reset failed:', error);
  } finally {
    if (client) {
      await client.disconnect();
      console.log('🔌 Disconnected from Redis');
    }
  }
}

// Run the reset (only if explicitly called)
if (process.argv.includes('--reset')) {
  resetRedisStreams().catch(console.error);
} else {
  console.log('🛑 SAFE MODE: Use --reset flag to actually perform the reset');
  console.log('   Command: node reset-redis-streams.js --reset');
  console.log('⚠️  WARNING: This will delete all messages and consumer groups!');
}
