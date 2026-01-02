import 'dotenv/config';
import { crmSyncStreams } from './src/utils/redis.js';

async function checkRedisStream() {
  console.log('🔍 Checking Redis Streams...\n');

  try {
    // Connect to Redis
    if (!crmSyncStreams.redis.isConnected) {
      await crmSyncStreams.redis.connect();
    }
    console.log(`✅ Redis connected: ${crmSyncStreams.redis.isConnected}\n`);

    // Check the role deletion stream
    const streamKey = 'crm:sync:role:role_deleted';
    console.log(`📊 Checking stream: ${streamKey}\n`);

    try {
      // Get stream info
      const info = await crmSyncStreams.redis.client.xInfoStream(streamKey);
      console.log('Stream Info:');
      console.log(`  Length: ${info.length}`);
      console.log(`  First Entry ID: ${info['first-entry']?.[0]}`);
      console.log(`  Last Entry ID: ${info['last-entry']?.[0]}\n`);

      // Read last 10 entries
      const entries = await crmSyncStreams.redis.client.xRange(streamKey, '-', '+', {
        COUNT: 10
      });
      
      console.log(`📋 Last ${entries.length} entries in stream:\n`);
      entries.forEach((entry, index) => {
        console.log(`Entry ${index + 1} (ID: ${entry.id}):`);
        Object.entries(entry.message).forEach(([key, value]) => {
          if (key === 'data' || key === 'metadata') {
            try {
              const parsed = JSON.parse(value);
              console.log(`  ${key}:`, JSON.stringify(parsed, null, 2));
            } catch {
              console.log(`  ${key}:`, value);
            }
          } else {
            console.log(`  ${key}:`, value);
          }
        });
        console.log();
      });
    } catch (error) {
      if (error.message.includes('no such key')) {
        console.log('❌ Stream does not exist yet');
      } else {
        console.error('❌ Error reading stream:', error.message);
      }
    }

    // Check for other role-related streams
    console.log('🔍 Checking for other role-related streams...\n');
    const patterns = [
      'crm:sync:role:*',
      'crm:sync:*role*'
    ];

    for (const pattern of patterns) {
      try {
        const keys = await crmSyncStreams.redis.client.keys(pattern);
        if (keys.length > 0) {
          console.log(`Found ${keys.length} streams matching "${pattern}":`);
          keys.forEach(key => {
            console.log(`  - ${key}`);
          });
          console.log();
        }
      } catch (error) {
        console.warn(`⚠️ Error searching for pattern "${pattern}":`, error.message);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await crmSyncStreams.redis.disconnect();
    process.exit(0);
  }
}

checkRedisStream();



