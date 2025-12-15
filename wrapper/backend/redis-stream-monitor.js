#!/usr/bin/env node

/**
 * Redis Stream Monitor for CRM Sync
 * Usage: node redis-stream-monitor.js [stream-key] [count]
 */

import Redis from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const streamKey = process.argv[2] || 'crm:sync:*';
const count = parseInt(process.argv[3]) || 5;

async function monitorStreams() {
  const client = Redis.createClient({ url: redisUrl });

  console.log('🔍 Redis Stream Monitor');
  console.log('=======================');
  console.log(`📡 Redis URL: ${redisUrl}`);
  console.log(`🔗 Stream Pattern: ${streamKey}`);
  console.log(`📊 Messages to show: ${count}\n`);

  try {
    await client.connect();
    console.log('✅ Connected to Redis\n');

    // Get all streams matching pattern
    const keys = streamKey === 'crm:sync:*' ?
      await client.keys('crm:sync:*') :
      [streamKey];

    if (keys.length === 0) {
      console.log('❌ No streams found matching pattern:', streamKey);
      console.log('\n💡 Expected streams:');
      console.log('   • crm:sync:user:user_created');
      console.log('   • crm:sync:user:user_deactivated');
      console.log('   • crm:sync:permissions:role_assigned');
      console.log('   • crm:sync:permissions:role_unassigned');
      console.log('   • crm:sync:organization:org_created');
      console.log('   • crm:sync:credits:credit_allocated');
      console.log('   • crm:sync:credits:credit_config_updated');
      return;
    }

    console.log(`📊 Found ${keys.length} stream(s):\n`);

    for (const key of keys) {
      console.log(`🔗 Stream: ${key}`);
      console.log('─'.repeat(50));

      try {
        // Get stream info
        const info = await client.xInfoStream(key);
        console.log(`📈 Length: ${info.length} messages`);
        console.log(`🔑 Radix Tree: ${info['radix-tree-keys']} keys, ${info['radix-tree-nodes']} nodes`);

        // Get consumer groups
        try {
          const groups = await client.xInfoGroups(key);
          console.log(`👥 Consumer Groups: ${groups.length}`);
          groups.forEach(group => {
            console.log(`   📋 ${group.name}: ${group.consumers} consumers, ${group.pending} pending`);
          });
        } catch (e) {
          console.log('👥 Consumer Groups: 0');
        }

        // Get recent messages
        const messages = await client.xRevRange(key, '+', '-', 'COUNT', count);

        if (messages.length === 0) {
          console.log('📭 No messages in stream');
        } else {
          console.log(`📨 Recent ${Math.min(messages.length, count)} messages:`);

          messages.forEach((msg, i) => {
            console.log(`\n   ${i + 1}. Message ID: ${msg.id}`);
            console.log(`      ⏰ Timestamp: ${msg.message.timestamp}`);
            console.log(`      🎯 Event: ${msg.message.eventType}`);
            console.log(`      🏢 Tenant: ${msg.message.tenantId}`);
            console.log(`      📝 Entity: ${msg.message.entityId}`);

            // Parse and display data
            try {
              const data = JSON.parse(msg.message.data);
              console.log(`      📊 Data:`);

              if (msg.message.eventType.includes('user_')) {
                console.log(`         👤 User: ${data.userId} (${data.email})`);
              } else if (msg.message.eventType.includes('role_')) {
                console.log(`         👥 Role: ${data.roleId} → User: ${data.userId}`);
              } else if (msg.message.eventType.includes('org_') || msg.message.eventType.includes('employee_')) {
                console.log(`         🏢 Org: ${data.orgCode || data.organizationId} (${data.orgName || data.name})`);
              } else if (msg.message.eventType.includes('credit_')) {
                if (msg.message.eventType === 'credit_config_updated') {
                  console.log(`         ⚙️ Config: ${data.operationCode} = ${data.creditCost} credits`);
                } else {
                  console.log(`         💰 Credits: ${data.allocatedCredits} to ${data.entityId}`);
                }
              }

              // Show metadata if available
              if (msg.message.metadata) {
                const metadata = JSON.parse(msg.message.metadata);
                console.log(`      🔍 Correlation: ${metadata.correlationId}`);
              }

            } catch (e) {
              console.log(`      📊 Raw Data: ${msg.message.data.substring(0, 100)}...`);
            }
          });
        }

      } catch (error) {
        console.log(`❌ Error reading stream: ${error.message}`);
      }

      console.log(''); // Empty line between streams
    }

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure Redis is running');
    console.log('2. Check REDIS_URL environment variable');
    console.log('3. Verify Redis connection: redis-cli ping');
  } finally {
    await client.quit();
  }
}

// Real-time monitoring mode
if (process.argv.includes('--watch')) {
  console.log('👀 Real-time monitoring mode (Ctrl+C to exit)\n');

  setInterval(async () => {
    try {
      await monitorStreams();
      console.log('─'.repeat(60));
      console.log('⏳ Waiting 5 seconds...\n');
    } catch (e) {
      console.error('❌ Monitoring error:', e.message);
    }
  }, 5000);
} else {
  monitorStreams();
}
