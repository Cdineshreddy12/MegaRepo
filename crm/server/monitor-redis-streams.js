#!/usr/bin/env node

/**
 * Redis Streams Monitoring CLI Tool
 * 
 * Usage:
 *   node monitor-redis-streams.js                    # Monitor all streams
 *   node monitor-redis-streams.js credit-events      # Monitor specific stream
 *   node monitor-redis-streams.js --json             # Output as JSON
 *   node monitor-redis-streams.js --watch            # Watch mode (refresh every 10s)
 */

import RedisStreamsMonitor from './services/redisStreamsMonitor.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const watchMode = args.includes('--watch');
  const streamNames = args.filter(arg => !arg.startsWith('--'));

  const monitor = new RedisStreamsMonitor();

  try {
    await monitor.initialize();

    const runMonitoring = async () => {
      const streamList = streamNames.length > 0 ? streamNames : null;
      
      if (jsonOutput) {
        const data = await monitor.getComprehensiveMonitoring(streamList);
        console.log(JSON.stringify(data, null, 2));
      } else {
        await monitor.generateReport(streamList);
      }
    };

    if (watchMode) {
      console.log('👀 Watch mode enabled (refreshing every 10 seconds)...\n');
      console.log('Press Ctrl+C to stop\n');
      
      // Clear screen function
      const clearScreen = () => {
        process.stdout.write('\x1B[2J\x1B[0f');
      };

      // Run immediately
      await runMonitoring();

      // Then run every 10 seconds
      const interval = setInterval(async () => {
        clearScreen();
        console.log('🔄 Refreshing...\n');
        await runMonitoring();
      }, 10000);

      // Handle Ctrl+C
      process.on('SIGINT', async () => {
        clearInterval(interval);
        console.log('\n\n👋 Stopping monitor...');
        await monitor.disconnect();
        process.exit(0);
      });
    } else {
      await runMonitoring();
      await monitor.disconnect();
    }
  } catch (error) {
    console.error('❌ Monitoring failed:', error);
    await monitor.disconnect();
    process.exit(1);
  }
}

main().catch(console.error);

