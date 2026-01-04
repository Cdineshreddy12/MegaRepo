#!/usr/bin/env node
/**
 * 📋 **ONBOARDING LOG VIEWER**
 * 
 * Utility script to view and analyze onboarding logs
 * 
 * Usage:
 *   node scripts/view-onboarding-logs.js                    # List all log files
 *   node scripts/view-onboarding-logs.js --latest           # View latest log
 *   node scripts/view-onboarding-logs.js --file <path>      # View specific log file
 *   node scripts/view-onboarding-logs.js --session <id>      # View logs by session ID
 *   node scripts/view-onboarding-logs.js --errors            # Show only errors
 *   node scripts/view-onboarding-logs.js --summary          # Show summary only
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseLogFile, listLogFiles, getLatestLogFile } from '../utils/onboarding-file-logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString();
}

function formatDuration(ms) {
  if (!ms) return 'N/A';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

async function displayLogFile(logFilePath, options = {}) {
  try {
    const parsed = await parseLogFile(logFilePath);
    
    if (options.summary) {
      displaySummary(parsed);
      return;
    }

    if (options.errors) {
      displayErrors(parsed);
      return;
    }

    displayFullLog(parsed);
  } catch (error) {
    console.error(colorize(`❌ Error reading log file: ${error.message}`, 'red'));
    process.exit(1);
  }
}

function displaySummary(parsed) {
  const { header, footer, summary } = parsed;
  
  console.log('\n' + colorize('═══════════════════════════════════════════════════════', 'cyan'));
  console.log(colorize('📊 ONBOARDING LOG SUMMARY', 'bright'));
  console.log(colorize('═══════════════════════════════════════════════════════', 'cyan'));
  
  if (header) {
    console.log(`\n${colorize('Session ID:', 'yellow')} ${header.sessionId}`);
    console.log(`${colorize('Started:', 'yellow')} ${formatTimestamp(header.timestamp)}`);
    if (header.metadata) {
      console.log(`${colorize('Company:', 'yellow')} ${header.metadata.companyName || 'N/A'}`);
      console.log(`${colorize('Email:', 'yellow')} ${header.metadata.adminEmail || 'N/A'}`);
      console.log(`${colorize('Plan:', 'yellow')} ${header.metadata.selectedPlan || 'N/A'}`);
    }
  }
  
  if (footer) {
    console.log(`\n${colorize('Ended:', 'yellow')} ${formatTimestamp(footer.endTime)}`);
    console.log(`${colorize('Duration:', 'yellow')} ${formatDuration(footer.duration)}`);
    console.log(`${colorize('Result:', 'yellow')} ${footer.result.success ? colorize('✅ Success', 'green') : colorize('❌ Failed', 'red')}`);
    if (!footer.result.success && footer.result.error) {
      console.log(`${colorize('Error:', 'red')} ${footer.result.error.message || 'Unknown error'}`);
    }
  }
  
  console.log(`\n${colorize('Total Logs:', 'yellow')} ${summary.totalLogs}`);
  console.log(`${colorize('Errors:', 'yellow')} ${colorize(summary.errors.toString(), summary.errors > 0 ? 'red' : 'green')}`);
  console.log(`${colorize('Warnings:', 'yellow')} ${colorize(summary.warnings.toString(), summary.warnings > 0 ? 'yellow' : 'green')}`);
  console.log(`${colorize('Successes:', 'yellow')} ${colorize(summary.successes.toString(), 'green')}`);
  
  console.log(colorize('\n═══════════════════════════════════════════════════════\n', 'cyan'));
}

function displayErrors(parsed) {
  const { logs, header } = parsed;
  const errors = logs.filter(log => log.level === 'ERROR');
  
  if (errors.length === 0) {
    console.log(colorize('\n✅ No errors found in this log file!\n', 'green'));
    return;
  }
  
  console.log('\n' + colorize('═══════════════════════════════════════════════════════', 'red'));
  console.log(colorize(`❌ ERRORS (${errors.length} total)`, 'bright'));
  console.log(colorize('═══════════════════════════════════════════════════════', 'red'));
  
  if (header) {
    console.log(`\n${colorize('Session:', 'yellow')} ${header.sessionId}`);
  }
  
  errors.forEach((error, index) => {
    console.log(`\n${colorize(`Error #${index + 1}`, 'bright')}`);
    console.log(`${colorize('Time:', 'yellow')} ${formatTimestamp(error.timestamp)}`);
    console.log(`${colorize('Category:', 'yellow')} ${error.category}`);
    console.log(`${colorize('Message:', 'yellow')} ${error.message}`);
    
    if (error.error) {
      console.log(`${colorize('Error Type:', 'yellow')} ${error.error.name || 'Unknown'}`);
      console.log(`${colorize('Error Message:', 'yellow')} ${error.error.message}`);
      if (error.error.response) {
        console.log(`${colorize('HTTP Status:', 'yellow')} ${error.error.response.status}`);
        if (error.error.response.data) {
          console.log(`${colorize('Response Data:', 'yellow')}`, JSON.stringify(error.error.response.data, null, 2));
        }
      }
      if (error.error.stack && process.env.DEBUG) {
        console.log(`${colorize('Stack:', 'yellow')}\n${error.error.stack}`);
      }
    }
    
    if (error.data && Object.keys(error.data).length > 0) {
      console.log(`${colorize('Context:', 'yellow')}`, JSON.stringify(error.data, null, 2));
    }
  });
  
  console.log(colorize('\n═══════════════════════════════════════════════════════\n', 'red'));
}

function displayFullLog(parsed) {
  const { header, logs, footer, summary } = parsed;
  
  // Display header
  if (header) {
    console.log('\n' + colorize('═══════════════════════════════════════════════════════', 'cyan'));
    console.log(colorize('📋 ONBOARDING LOG FILE', 'bright'));
    console.log(colorize('═══════════════════════════════════════════════════════', 'cyan'));
    console.log(`\n${colorize('Session ID:', 'yellow')} ${header.sessionId}`);
    console.log(`${colorize('Started:', 'yellow')} ${formatTimestamp(header.timestamp)}`);
    if (header.metadata) {
      console.log(`${colorize('Company:', 'yellow')} ${header.metadata.companyName || 'N/A'}`);
      console.log(`${colorize('Email:', 'yellow')} ${header.metadata.adminEmail || 'N/A'}`);
      console.log(`${colorize('Plan:', 'yellow')} ${header.metadata.selectedPlan || 'N/A'}`);
    }
    console.log(colorize('\n───────────────────────────────────────────────────────\n', 'cyan'));
  }
  
  // Display logs grouped by category
  const logsByCategory = {};
  logs.forEach(log => {
    if (!logsByCategory[log.category]) {
      logsByCategory[log.category] = [];
    }
    logsByCategory[log.category].push(log);
  });
  
  Object.keys(logsByCategory).forEach(category => {
    const categoryLogs = logsByCategory[category];
    console.log(colorize(`\n📁 ${category.toUpperCase()} (${categoryLogs.length} entries)`, 'bright'));
    console.log(colorize('───────────────────────────────────────────────────────', 'cyan'));
    
    categoryLogs.forEach(log => {
      const levelColor = {
        'INFO': 'blue',
        'SUCCESS': 'green',
        'WARNING': 'yellow',
        'ERROR': 'red',
        'DEBUG': 'magenta'
      }[log.level] || 'white';
      
      const time = formatTimestamp(log.timestamp);
      const level = colorize(`[${log.level}]`, levelColor);
      const message = log.message;
      
      console.log(`${time} ${level} ${message}`);
      
      if (log.data && Object.keys(log.data).length > 0 && process.env.VERBOSE) {
        console.log('  Data:', JSON.stringify(log.data, null, 2));
      }
      
      if (log.error && log.level === 'ERROR') {
        console.log(`  ${colorize('Error:', 'red')} ${log.error.message || 'Unknown error'}`);
        if (log.error.response) {
          console.log(`  ${colorize('HTTP Status:', 'red')} ${log.error.response.status}`);
        }
      }
    });
  });
  
  // Display footer
  if (footer) {
    console.log(colorize('\n───────────────────────────────────────────────────────', 'cyan'));
    console.log(`\n${colorize('Ended:', 'yellow')} ${formatTimestamp(footer.endTime)}`);
    console.log(`${colorize('Duration:', 'yellow')} ${formatDuration(footer.duration)}`);
    console.log(`${colorize('Result:', 'yellow')} ${footer.result.success ? colorize('✅ Success', 'green') : colorize('❌ Failed', 'red')}`);
  }
  
  // Display summary
  console.log(colorize('\n═══════════════════════════════════════════════════════', 'cyan'));
  console.log(colorize('📊 SUMMARY', 'bright'));
  console.log(colorize('═══════════════════════════════════════════════════════', 'cyan'));
  console.log(`Total Logs: ${summary.totalLogs}`);
  console.log(`Errors: ${colorize(summary.errors.toString(), summary.errors > 0 ? 'red' : 'green')}`);
  console.log(`Warnings: ${colorize(summary.warnings.toString(), summary.warnings > 0 ? 'yellow' : 'green')}`);
  console.log(`Successes: ${colorize(summary.successes.toString(), 'green')}`);
  console.log(colorize('═══════════════════════════════════════════════════════\n', 'cyan'));
}

async function listAllLogs() {
  const files = await listLogFiles(50);
  
  if (files.length === 0) {
    console.log(colorize('\n📭 No log files found.\n', 'yellow'));
    return;
  }
  
  console.log('\n' + colorize('═══════════════════════════════════════════════════════', 'cyan'));
  console.log(colorize(`📋 ONBOARDING LOG FILES (${files.length} files)`, 'bright'));
  console.log(colorize('═══════════════════════════════════════════════════════', 'cyan'));
  
  for (const file of files) {
    try {
      const stats = await fs.stat(file.path);
      const parsed = await parseLogFile(file.path);
      const { header, footer, summary } = parsed;
      
      const status = footer?.result?.success ? colorize('✅', 'green') : colorize('❌', 'red');
      const sessionId = header?.sessionId || 'N/A';
      const companyName = header?.metadata?.companyName || 'N/A';
      const date = formatTimestamp(header?.timestamp || stats.mtime);
      
      console.log(`\n${status} ${colorize(file.filename, 'bright')}`);
      console.log(`   Session: ${sessionId}`);
      console.log(`   Company: ${companyName}`);
      console.log(`   Date: ${date}`);
      console.log(`   Logs: ${summary.totalLogs} | Errors: ${colorize(summary.errors.toString(), summary.errors > 0 ? 'red' : 'green')}`);
    } catch (error) {
      console.log(`\n⚠️  ${file.filename} (error reading: ${error.message})`);
    }
  }
  
  console.log(colorize('\n═══════════════════════════════════════════════════════\n', 'cyan'));
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const options = {
    latest: args.includes('--latest'),
    file: args.find(arg => arg.startsWith('--file='))?.split('=')[1],
    session: args.find(arg => arg.startsWith('--session='))?.split('=')[1],
    errors: args.includes('--errors'),
    summary: args.includes('--summary'),
    verbose: args.includes('--verbose') || process.env.VERBOSE === 'true'
  };
  
  if (options.verbose) {
    process.env.VERBOSE = 'true';
  }
  
  if (options.file) {
    await displayLogFile(options.file, options);
  } else if (options.session) {
    const files = await listLogFiles(100);
    const matchingFile = files.find(file => file.filename.includes(options.session));
    if (matchingFile) {
      await displayLogFile(matchingFile.path, options);
    } else {
      console.error(colorize(`❌ No log file found for session: ${options.session}`, 'red'));
      process.exit(1);
    }
  } else if (options.latest) {
    const latest = await getLatestLogFile();
    if (latest) {
      await displayLogFile(latest.path, options);
    } else {
      console.error(colorize('❌ No log files found.', 'red'));
      process.exit(1);
    }
  } else {
    await listAllLogs();
  }
}

main().catch(error => {
  console.error(colorize(`❌ Error: ${error.message}`, 'red'));
  process.exit(1);
});




















