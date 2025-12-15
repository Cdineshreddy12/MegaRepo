require('dotenv').config();
const { createClient } = require('redis');
const mongoose = require('mongoose');

const STREAM_NAME = 'crm:sync:organization:org_created';
const MESSAGE_COUNT = 10;

async function inspectOrgStream() {
  let redisClient = null;
  
  try {
    // Connect to Redis
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.error('❌ REDIS_URL environment variable is required');
      process.exit(1);
    }
    console.log('🔗 Connecting to Redis...');
    redisClient = createClient({ url: redisUrl });
    await redisClient.connect();
    console.log('✅ Redis connected\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI environment variable is required');
      process.exit(1);
    }
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
    });
    console.log('✅ MongoDB connected\n');

    // Read last 10 messages from stream using XREVRANGE
    console.log(`📖 Reading last ${MESSAGE_COUNT} messages from stream: ${STREAM_NAME}\n`);
    const messages = await redisClient.xRevRange(STREAM_NAME, '+', '-', { COUNT: MESSAGE_COUNT });
    
    if (!messages || messages.length === 0) {
      console.log('⚠️ No messages found in stream\n');
    } else {
      console.log(`📋 Found ${messages.length} message(s) in stream:\n`);
      console.log('='.repeat(80));
      
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        console.log(`\n📨 Message ${i + 1} (ID: ${msg.id}):`);
        console.log('-'.repeat(80));
        
        // Parse the message fields
        const messageData = {};
        for (let j = 0; j < msg.message.length; j += 2) {
          const key = msg.message[j];
          const value = msg.message[j + 1];
          messageData[key] = value;
        }
        
        // Try to parse JSON fields
        if (messageData.data) {
          try {
            messageData.data = JSON.parse(messageData.data);
          } catch (e) {
            // Keep as string if not JSON
          }
        }
        
        console.log(JSON.stringify(messageData, null, 2));
        
        // Check database for this organization
        if (messageData.tenantId && messageData.data?.orgCode) {
          const { default: Organization } = await import('./models/Organization.js');
          const orgInDb = await Organization.findOne({
            tenantId: messageData.tenantId,
            orgCode: messageData.data.orgCode
          });
          
          if (orgInDb) {
            console.log('\n📊 Database Record:');
            console.log(JSON.stringify({
              _id: orgInDb._id.toString(),
              tenantId: orgInDb.tenantId,
              orgCode: orgInDb.orgCode,
              orgName: orgInDb.orgName,
              name: orgInDb.name, // Check if this field exists
              status: orgInDb.status,
              parentId: orgInDb.parentId?.toString() || null,
              parentIdString: orgInDb.parentIdString,
              hierarchy: orgInDb.hierarchy,
              metadata: orgInDb.metadata,
              createdAt: orgInDb.createdAt,
              updatedAt: orgInDb.updatedAt
            }, null, 2));
            
            // Compare stream data with DB data
            console.log('\n🔍 Comparison:');
            const streamOrgName = messageData.data.orgName || messageData.data.name;
            if (streamOrgName !== orgInDb.orgName) {
              console.log(`⚠️  orgName mismatch: Stream="${streamOrgName}" vs DB="${orgInDb.orgName}"`);
            }
            if (messageData.data.orgCode !== orgInDb.orgCode) {
              console.log(`⚠️  orgCode mismatch: Stream="${messageData.data.orgCode}" vs DB="${orgInDb.orgCode}"`);
            }
          } else {
            console.log('\n❌ Organization NOT found in database');
          }
        }
        
        console.log('\n' + '='.repeat(80));
      }
    }

    // Also query all organizations from DB to see what's stored
    console.log('\n\n📊 All Organizations in Database:\n');
    const { default: Organization } = await import('./models/Organization.js');
    const allOrgs = await Organization.find({}).sort({ createdAt: -1 }).limit(20);
    
    console.log(`Found ${allOrgs.length} organization(s) in database:\n`);
    for (const org of allOrgs) {
      console.log(JSON.stringify({
        _id: org._id.toString(),
        tenantId: org.tenantId,
        orgCode: org.orgCode,
        orgName: org.orgName,
        name: org.name, // Check if this field exists
        status: org.status,
        parentId: org.parentId?.toString() || null,
        parentIdString: org.parentIdString,
        hierarchy: org.hierarchy,
        metadata: org.metadata,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt
      }, null, 2));
      console.log('-'.repeat(80));
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    if (redisClient) {
      await redisClient.quit();
      console.log('\n✅ Redis disconnected');
    }
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected');
  }
}

inspectOrgStream()
  .then(() => {
    console.log('\n✅ Inspection complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Inspection failed:', error);
    process.exit(1);
  });

