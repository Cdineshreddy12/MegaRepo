#!/usr/bin/env node

/**
 * Package Manager Enforcement Script
 * Ensures developers use pnpm instead of npm or yarn
 */

const fs = require('fs');
const path = require('path');

// Check if pnpm is being used
function checkPackageManager() {
  const userAgent = process.env.npm_config_user_agent;
  
  if (!userAgent) {
    console.error('❌ Unable to determine package manager');
    process.exit(1);
  }

  if (userAgent.startsWith('pnpm/')) {
    console.log('✅ Using pnpm - good!');
    return true;
  }

  if (userAgent.startsWith('npm/')) {
    console.error('❌ Please use pnpm instead of npm');
    console.error('   Install pnpm: npm install -g pnpm');
    console.error('   Then run: pnpm install');
    process.exit(1);
  }

  if (userAgent.startsWith('yarn/')) {
    console.error('❌ Please use pnpm instead of yarn');
    console.error('   Install pnpm: npm install -g pnpm');
    console.error('   Then run: pnpm install');
    process.exit(1);
  }

  console.error('❌ Unknown package manager detected');
  process.exit(1);
}

// Check if pnpm is installed globally
function checkPnpmInstalled() {
  try {
    require('child_process').execSync('pnpm --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
function main() {
  console.log('🔍 Checking package manager...');
  
  if (!checkPnpmInstalled()) {
    console.error('❌ pnpm is not installed globally');
    console.error('   Please install pnpm: npm install -g pnpm');
    process.exit(1);
  }

  checkPackageManager();
  console.log('🎉 Package manager check passed!');
}

// Only run if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { checkPackageManager, checkPnpmInstalled };
