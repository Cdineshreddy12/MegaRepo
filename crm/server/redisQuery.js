import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

client.connect();

client.on('connect', () => {
  console.log('✅ Redis client connected');
});

client.on('error', (err) => {
  console.error('❌ Redis client error:', err);
});

client.on('end', () => {
  console.log('🔌 Redis client disconnected');
});

client.on('ready', () => {
  console.log('✅ Redis client ready');
});

//fetching all the keys in the redis

// client.keys('*').then(keys => {
//   console.log("keys", keys);
// });

// Wait for connection to be ready before subscribing
client.on('ready', async () => {
  console.log('✅ Redis client ready - setting up subscriptions');

  // List current channels
  try {
    const channels = await client.pubSubChannels();
    console.log('📡 Current Channels:', channels);
  } catch (error) {
    console.error('❌ Error getting channels:', error);
  }

  // Subscribe to your tenant's credit-configs channel
  const channelName = 'crm:b0a6e370-c1e5-43d1-94e0-55ed792274c4:credit-configs';
  console.log(`📡 Subscribing to channel: ${channelName}`);

  try {
    await client.subscribe(channelName, (message, channel) => {
      handleMessage(channel, message);
    });
    console.log(`✅ Successfully subscribed to: ${channelName}`);
  } catch (error) {
    console.error('❌ Error subscribing to channel:', error);
  }
});

// Track processed messages to avoid duplicates
const processedMessages = new Set();

// Handle incoming messages with duplicate detection
function handleMessage(channel, message) {
  // Check if we've already processed this message (use full message content as key)
  const messageContent = typeof message === 'string' ? message : JSON.stringify(message);
  if (processedMessages.has(messageContent)) {
    console.log('🔄 [DUPLICATE MESSAGE IGNORED]');
    return; // Exit early, don't process duplicate
  }

  // Mark as processed
  processedMessages.add(messageContent);

  // Clean up old messages (keep last 1000)
  if (processedMessages.size > 1000) {
    const oldest = processedMessages.values().next().value;
    processedMessages.delete(oldest);
  }

  // Process new message
  try {
    // Parse the message to get unique identifier
    const parsedMessage = JSON.parse(message);
    const messageKey = `${parsedMessage.id || 'no-id'}-${parsedMessage.timestamp || 'no-ts'}`;

    console.log('📨 [NEW MESSAGE RECEIVED]');
    console.log('   📡 Channel:', channel);
    console.log('   📋 Message:', message);
    console.log('   🆔 Message Key:', messageKey);

    console.log('   📄 Parsed Message:');
    console.log('      🆔 ID:', parsedMessage.id || 'N/A');
    console.log('      👤 Name:', parsedMessage.name || 'N/A');
    console.log('      📧 Email:', parsedMessage.email || 'N/A');

    // Handle different message types
    if (parsedMessage.eventType === 'credit-config-changed') {
      console.log('   💰 CREDIT CONFIG CHANGE');
      console.log('      🔧 Operation:', parsedMessage.data?.operationCode || 'N/A');
      console.log('      💵 Cost:', parsedMessage.data?.creditCost || 'N/A');
    }

  } catch (parseError) {
    console.log('📨 [RAW MESSAGE RECEIVED]');
    console.log('   📡 Channel:', channel);
    console.log('   📋 Message:', message);
  }
}

// Listen for subscription confirmations
client.on('subscribe', (channel, count) => {
  console.log(`✅ Subscribed to ${channel} (${count} total subscriptions)`);
});

// Listen for unsubscription confirmations
client.on('unsubscribe', (channel, count) => {
  console.log(`🔌 Unsubscribed from ${channel} (${count} remaining subscriptions)`);
});

export default client;
