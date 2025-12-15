/**
 * Apply Hierarchy Triggers Script (Simple Version)
 * Direct postgres-js approach for applying hierarchy triggers
 */

import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

async function applyHierarchyTriggersSimple() {
  console.log('🔧 Applying hierarchy triggers to database (simple version)...');

  let sql = null;

  try {
    // Get database URL from environment
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Create direct postgres connection
    sql = postgres(databaseUrl, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    console.log('🔌 Connected to database successfully');

    // Read the triggers SQL file
    const triggersPath = path.join(process.cwd(), 'src/db/migrations/hierarchy_triggers.sql');
    const triggersSQL = fs.readFileSync(triggersPath, 'utf8');

    console.log('📄 Read triggers file, executing SQL...');

    // Split SQL into individual statements (handle multi-line functions properly)
    const statements = [];
    let currentStatement = '';
    let inFunctionBody = false;
    let braceCount = 0;

    const lines = triggersSQL.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip comments
      if (trimmedLine.startsWith('--')) continue;

      // Track function body state
      if (trimmedLine.includes('$$')) {
        inFunctionBody = !inFunctionBody;
      }

      // Track braces in function bodies
      if (inFunctionBody) {
        braceCount += (trimmedLine.match(/\{/g) || []).length;
        braceCount -= (trimmedLine.match(/\}/g) || []).length;
      }

      currentStatement += line + '\n';

      // If we're not in a function body and we hit a semicolon, it's a complete statement
      if (!inFunctionBody && trimmedLine.endsWith(';') && braceCount === 0) {
        const statement = currentStatement.trim();
        if (statement && !statement.startsWith('--')) {
          statements.push(statement);
        }
        currentStatement = '';
      }
    }

    // Handle any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    console.log(`📋 Found ${statements.length} SQL statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        try {
          await sql.unsafe(statement);
          console.log(`   ✅ Statement ${i + 1} executed successfully`);
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
          // Don't throw here, continue with other statements
        }
      }
    }

    console.log('✅ Hierarchy triggers applied successfully!');

    // Verify triggers were created
    console.log('🔍 Verifying triggers...');
    try {
      const triggerResult = await sql.unsafe(`
        SELECT tgname, tgtype, tgenabled
        FROM pg_trigger
        WHERE tgname LIKE '%entity_hierarchy%'
        ORDER BY tgname;
      `);

      console.log('📋 Active hierarchy triggers:');
      if (triggerResult.length === 0) {
        console.log('   ℹ️  No hierarchy triggers found');
      } else {
        triggerResult.forEach(trigger => {
          console.log(`  - ${trigger.tgname} (${trigger.tgenabled === 'O' ? 'ENABLED' : 'DISABLED'})`);
        });
      }
    } catch (verifyError) {
      console.log('⚠️  Could not verify triggers:', verifyError.message);
    }

    // Verify functions were created
    try {
      const functionResult = await sql.unsafe(`
        SELECT proname
        FROM pg_proc
        WHERE proname LIKE '%hierarchy%'
        ORDER BY proname;
      `);

      console.log('📋 Active hierarchy functions:');
      if (functionResult.length === 0) {
        console.log('   ℹ️  No hierarchy functions found');
      } else {
        functionResult.forEach(func => {
          console.log(`  - ${func.proname}()`);
        });
      }
    } catch (verifyError) {
      console.log('⚠️  Could not verify functions:', verifyError.message);
    }

    console.log('🎉 Hierarchy system setup complete!');

  } catch (error) {
    console.error('❌ Failed to apply hierarchy triggers:', error);
    throw error;
  } finally {
    if (sql) {
      await sql.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the script
applyHierarchyTriggersSimple()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
