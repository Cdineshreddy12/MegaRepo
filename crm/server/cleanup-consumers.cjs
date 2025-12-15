// Clean up dead consumers from Redis Streams consumer group
const Redis = require('redis');

async function cleanupConsumers() {
  console.log('🧹 Cleaning up dead consumers from Redis Streams');
  console.log('=' .repeat(55));

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error('❌ REDIS_URL environment variable is required');
    process.exit(1);
  }
  const redisClient = Redis.createClient({ url: redisUrl });
  await redisClient.connect();
  console.log('✅ Redis connected');

  try {
    // Get consumer group info
    const groups = await redisClient.xInfoGroups('credit-events');
    console.log('Consumer groups found:', groups.length);

    for (const group of groups) {
      console.log(`\n📋 Processing group: ${group.name}`);
      console.log(`   Pending: ${group.pending}, Consumers: ${group.consumers}`);

      if (group.pending > 0) {
        // Get consumers in this group
        const consumers = await redisClient.xInfoConsumers('credit-events', group.name);
        console.log(`   Active consumers: ${consumers.length}`);

        // Check each consumer
        for (const consumer of consumers) {
          console.log(`     - ${consumer.name}: pending=${consumer.pending}, idle=${consumer.idle}ms`);

          // If consumer has been idle for more than 5 minutes (300000ms), consider it dead
          if (consumer.idle > 300000) {
            console.log(`       🚨 Consumer ${consumer.name} appears dead (idle > 5min)`);

            // Try to claim its pending messages
            try {
              const pendingMessages = await redisClient.xPendingRange(
                'credit-events',
                group.name,
                '-', // min
                '+', // max
                10 // count
              );

              const consumerPending = pendingMessages.filter(msg => msg.consumer === consumer.name);
              console.log(`       Has ${consumerPending.length} pending messages`);

              if (consumerPending.length > 0) {
                console.log(`       🔄 Claiming ${consumerPending.length} messages from dead consumer...`);

                for (const msg of consumerPending) {
                  try {
                    await redisClient.xClaim(
                      'credit-events',
                      group.name,
                      'cleanup-consumer', // Temporary consumer to claim messages
                      60000,
                      [msg.id]
                    );
                    console.log(`         ✅ Claimed message ${msg.id}`);
                  } catch (claimError) {
                    console.log(`         ❌ Failed to claim ${msg.id}: ${claimError.message}`);
                  }
                }
              }

              // Delete the dead consumer
              try {
                await redisClient.xGroupDelConsumer('credit-events', group.name, consumer.name);
                console.log(`       🗑️ Deleted dead consumer: ${consumer.name}`);
              } catch (delError) {
                console.log(`       ❌ Failed to delete consumer ${consumer.name}: ${delError.message}`);
              }

            } catch (pendingError) {
              console.log(`       ❌ Error processing pending messages: ${pendingError.message}`);
            }
          }
        }
      }
    }

    // Final status
    console.log('\n📊 Final status:');
    const finalGroups = await redisClient.xInfoGroups('credit-events');
    finalGroups.forEach(g => {
      console.log(`  - ${g.name}: ${g.pending} pending, ${g.consumers} consumers`);
    });

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }

  await redisClient.disconnect();
  console.log('\n🎯 Consumer cleanup complete!');
}

cleanupConsumers();
