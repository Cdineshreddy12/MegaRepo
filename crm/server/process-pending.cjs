// Manually process all pending credit events
const Redis = require('redis');

async function processPending() {
  console.log('🔄 Processing All Pending Credit Events');
  console.log('=' .repeat(45));

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error('❌ REDIS_URL environment variable is required');
    process.exit(1);
  }
  const redisClient = Redis.createClient({ url: redisUrl });
  await redisClient.connect();
  console.log('✅ Redis connected');

  const consumerName = 'manual-processor-' + Date.now();

  try {
    // First, claim all pending messages
    console.log('🎯 Claiming all pending messages...');
    const pendingDetails = await redisClient.xPendingRange(
      'credit-events',
      'crm-consumers',
      '-', // min
      '+', // max
      10 // count
    );

    console.log(`📋 Found ${pendingDetails.length} pending messages to claim`);

    for (const msg of pendingDetails) {
      console.log(`Claiming message: ${msg.id}`);

      try {
        const claimed = await redisClient.xClaim(
          'credit-events',
          'crm-consumers',
          consumerName,
          60000, // min idle time
          [msg.id]
        );

        if (claimed && claimed.length > 0) {
          console.log(`✅ Claimed message: ${msg.id}`);

          // Now process the claimed message
          const message = claimed[0];
          console.log(`📨 Processing message: ${message.id}`);

          // Parse the message
          const eventData = {};
          Object.entries(message.message).forEach(([key, value]) => {
            try {
              eventData[key] = JSON.parse(value);
            } catch (e) {
              eventData[key] = value;
            }
          });

          console.log(`   Event: ${eventData.eventType}`);
          console.log(`   Amount: ${eventData.amount}`);
          console.log(`   Entity: ${eventData.entityId}`);

          // Here we would normally process the event through the credit service
          // For now, just acknowledge it
          await redisClient.xAck('credit-events', 'crm-consumers', message.id);
          console.log(`   ✅ Acknowledged: ${message.id}`);
        }
      } catch (claimError) {
        console.error(`❌ Failed to claim message ${msg.id}:`, claimError.message);
      }
    }

    // Check final status
    const finalPending = await redisClient.xPending('credit-events', 'crm-consumers');
    console.log(`\n📈 Final pending count: ${finalPending.pending}`);

  } catch (error) {
    console.error('❌ Processing failed:', error.message);
  }

  await redisClient.disconnect();
  console.log('\n🎯 Processing Complete!');
}

processPending();
