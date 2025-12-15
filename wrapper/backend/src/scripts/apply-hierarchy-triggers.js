/**
 * Apply Hierarchy Triggers Script
 * This script applies the database triggers for maintaining entity hierarchy paths
 */

import { dbManager } from '../db/index.js';
import fs from 'fs';
import path from 'path';

async function applyHierarchyTriggers() {
  console.log('🔧 Applying hierarchy triggers to database...');

  try {
    // Get the system database connection (bypasses RLS for DDL operations)
    const systemConnection = dbManager.getSystemConnection();

    // Read the triggers SQL file
    const triggersPath = path.join(process.cwd(), 'src/db/migrations/hierarchy_triggers.sql');
    const triggersSQL = fs.readFileSync(triggersPath, 'utf8');

    console.log('📄 Read triggers file, executing SQL...');

    // Split SQL into individual statements and execute them
    const statements = triggersSQL
      .split('--> statement-breakpoint')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        try {
          await systemConnection.unsafe(statement);
        } catch (error) {
          // Skip errors for already existing triggers/functions
          if (error.message.includes('already exists') ||
              error.message.includes('does not exist') ||
              error.code === '42P07' || // duplicate table
              error.code === '42710') { // duplicate function
            console.log(`⚠️  Skipping existing object: ${error.message.split('\n')[0]}`);
            continue;
          }
          console.error(`❌ Failed to execute statement ${i + 1}:`, error.message);
          throw error;
        }
      }
    }

    console.log('✅ Hierarchy triggers applied successfully!');

    // Verify triggers were created
    console.log('🔍 Verifying triggers...');
    const triggerResult = await systemConnection.unsafe(`
      SELECT tgname, tgtype, tgenabled
      FROM pg_trigger
      WHERE tgname LIKE '%entity_hierarchy%'
      ORDER BY tgname;
    `);

    console.log('📋 Active hierarchy triggers:');
    triggerResult.forEach(trigger => {
      console.log(`  - ${trigger.tgname} (${trigger.tgenabled === 'O' ? 'ENABLED' : 'DISABLED'})`);
    });

    // Verify functions were created
    const functionResult = await systemConnection.unsafe(`
      SELECT proname
      FROM pg_proc
      WHERE proname LIKE '%hierarchy%'
      ORDER BY proname;
    `);

    console.log('📋 Active hierarchy functions:');
    functionResult.forEach(func => {
      console.log(`  - ${func.proname}()`);
    });

    console.log('🎉 Hierarchy system setup complete!');

  } catch (error) {
    console.error('❌ Failed to apply hierarchy triggers:', error);
    throw error;
  }
}

// Run the script
applyHierarchyTriggers()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
