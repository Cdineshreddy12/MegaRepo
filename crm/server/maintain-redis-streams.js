import { createClient } from 'redis';

async function maintainRedisStreams() {
  console.log('🔧 Starting Redis Streams maintenance...\n');

  const redisUrl = process.env.REDIS_URL || 'redis://default:k9PVaIlCi1uWh5v6bS7zomT6vYJfnbWU@redis-18875.crce182.ap-south-1-1.ec2.redns.redis-cloud.com:18875';

  let client;
  try {
    // Connect to Redis
    client = createClient({ url: redisUrl });
    await client.connect();
    console.log('✅ Connected to Redis\n');

    const streamName = 'credit-events';
    const consumerGroup = 'crm-consumers';

    // Get current memory usage
    try {
      const memoryInfo = await client.info('memory');
      console.log('📊 Redis Memory Info:');
      console.log(`   Used Memory: ${memoryInfo.match(/used_memory_human:(.+)/)?.[1] || 'Unknown'}`);
      console.log(`   Used Memory Peak: ${memoryInfo.match(/used_memory_peak_human:(.+)/)?.[1] || 'Unknown'}`);
      console.log(`   Memory Fragmentation: ${memoryInfo.match(/mem_fragmentation_ratio:(.+)/)?.[1] || 'Unknown'}\n`);
    } catch (error) {
      console.log('⚠️ Could not get memory info\n');
    }

    // Check stream length
    try {
      const streamInfo = await client.xInfo(streamName);
      const streamLength = streamInfo.length;

      console.log(`📈 Stream Status:`);
      console.log(`   Stream Length: ${streamLength}`);
      console.log(`   Consumer Groups: ${streamInfo.groups}\n`);

      // Maintenance based on stream length
      if (streamLength > 5000) {
        console.log('🚨 Stream is very large, performing aggressive cleanup...');

        // Keep only last 1000 messages
        const trimResult = await client.xTrim(streamName, 'MAXLEN', '~', 1000);
        console.log(`✅ Trimmed ${trimResult} messages (kept last 1000)\n`);

      } else if (streamLength > 2000) {
        console.log('⚠️ Stream is getting large, performing moderate cleanup...');

        // Keep only last 2000 messages
        const trimResult = await client.xTrim(streamName, 'MAXLEN', '~', 2000);
        console.log(`✅ Trimmed ${trimResult} messages (kept last 2000)\n`);

      } else if (streamLength > 1000) {
        console.log('ℹ️ Stream is moderate size, performing light cleanup...');

        // Keep only last 5000 messages but trim older than 1 hour
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const trimResult = await client.xTrim(streamName, 'MINID', '~', oneHourAgo);
        console.log(`✅ Trimmed ${trimResult} messages older than 1 hour\n`);

      } else {
        console.log('✅ Stream size is healthy\n');
      }

    } catch (error) {
      console.log(`⚠️ Stream doesn't exist or error getting info: ${error.message}\n`);
    }

    // Clean up idle consumers
    try {
      const consumers = await client.xInfoConsumers(streamName, consumerGroup);
      let idleConsumers = 0;

      for (const consumer of consumers) {
        const idleTime = consumer.idle;
        const maxIdleTime = 2 * 60 * 60 * 1000; // 2 hours

        if (idleTime > maxIdleTime) {
          console.log(`🧹 Removing idle consumer: ${consumer.name} (${Math.round(idleTime / 1000 / 60)} minutes idle)`);
          await client.xGroupDelConsumer(streamName, consumerGroup, consumer.name);
          idleConsumers++;
        }
      }

      if (idleConsumers > 0) {
        console.log(`✅ Cleaned up ${idleConsumers} idle consumers\n`);
      } else {
        console.log('✅ No idle consumers to clean up\n');
      }
    } catch (error) {
      console.log(`⚠️ Error cleaning up consumers: ${error.message}\n`);
    }

    // Force acknowledge very old pending messages
    try {
      const pendingMessages = await client.xPendingRange(
        streamName,
        consumerGroup,
        '-',
        '+',
        50 // Check up to 50 pending messages
      );

      let oldPendingCount = 0;
      const maxAge = 2 * 60 * 60 * 1000; // 2 hours

      for (const msg of pendingMessages) {
        if (msg.elapsed > maxAge) {
          await client.xAck(streamName, consumerGroup, msg.id);
          oldPendingCount++;
        }
      }

      if (oldPendingCount > 0) {
        console.log(`✅ Force acknowledged ${oldPendingCount} very old pending messages\n`);
      } else {
        console.log('✅ No old pending messages to acknowledge\n');
      }
    } catch (error) {
      console.log(`⚠️ Error processing pending messages: ${error.message}\n`);
    }

    console.log('🎉 Redis Streams maintenance completed successfully!');
    console.log('\n💡 Maintenance Recommendations:');
    console.log('   • Run this script daily via cron: 0 2 * * * node maintain-redis-streams.js');
    console.log('   • Monitor Redis memory usage and stream lengths');
    console.log('   • Adjust thresholds based on your Redis memory limits');

  } catch (error) {
    console.error('❌ Redis maintenance failed:', error);
  } finally {
    if (client) {
      await client.disconnect();
      console.log('🔌 Disconnected from Redis');
    }
  }
}

// Run the maintenance
maintainRedisStreams().catch(console.error);
