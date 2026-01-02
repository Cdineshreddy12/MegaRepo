#!/usr/bin/env node

/**
 * 🔄 **CREDIT ALLOCATION TABLES MIGRATION SCRIPT**
 * Drops credit_allocations and credit_allocation_transactions tables
 * 
 * This script removes the deprecated credit allocation tables that are no longer needed.
 * Applications now manage their own credit consumption.
 * 
 * Usage:
 *   node src/scripts/run-credit-allocation-migration.js
 *   npm run migrate:drop-credit-allocation-tables
 */

import postgres from 'postgres';
import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runCreditAllocationMigration() {
  console.log('🚀 Starting Credit Allocation Tables Migration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, {
    prepare: false,
    connection: {
      search_path: 'public'
    }
  });

  try {
    // Check if tables exist before dropping
    console.log('🔍 Checking if credit allocation tables exist...\n');

    const checkAllocationsTable = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'credit_allocations'
      ) as exists;
    `;

    const checkTransactionsTable = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'credit_allocation_transactions'
      ) as exists;
    `;

    const allocationsExists = checkAllocationsTable[0]?.exists || false;
    const transactionsExists = checkTransactionsTable[0]?.exists || false;

    console.log(`📊 Table Status:`);
    console.log(`   credit_allocations: ${allocationsExists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log(`   credit_allocation_transactions: ${transactionsExists ? '✅ EXISTS' : '❌ NOT FOUND'}\n`);

    if (!allocationsExists && !transactionsExists) {
      console.log('✅ Both tables already removed. Migration not needed.\n');
      await sql.end();
      return;
    }

    // Check for foreign key dependencies
    console.log('🔍 Checking for foreign key dependencies...\n');

    const foreignKeys = await sql`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND (
          tc.table_name = 'credit_allocations' 
          OR tc.table_name = 'credit_allocation_transactions'
          OR ccu.table_name = 'credit_allocations'
          OR ccu.table_name = 'credit_allocation_transactions'
        )
      ORDER BY tc.table_name, kcu.column_name;
    `;

    if (foreignKeys.length > 0) {
      console.log('⚠️  Found foreign key dependencies:');
      foreignKeys.forEach(fk => {
        console.log(`   ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
      console.log('   (CASCADE will handle these automatically)\n');
    } else {
      console.log('✅ No foreign key dependencies found\n');
    }

    // Read migration SQL file
    const migrationPath = join(__dirname, '../db/migrations/drop_credit_allocation_tables.sql');
    let migrationSQL;
    
    try {
      migrationSQL = readFileSync(migrationPath, 'utf8');
      console.log('📄 Read migration file:', migrationPath);
    } catch (fileError) {
      console.error('❌ Failed to read migration file:', fileError.message);
      console.log('📝 Using inline SQL instead...\n');
      migrationSQL = `
-- Drop credit_allocation_transactions table first (has foreign key to credit_allocations)
DROP TABLE IF EXISTS "credit_allocation_transactions" CASCADE;

-- Drop credit_allocations table
DROP TABLE IF EXISTS "credit_allocations" CASCADE;
      `.trim();
    }

    // Execute migration
    console.log('\n🔄 Executing migration...\n');

    // Split SQL into statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('COMMENT'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length === 0) continue;

      try {
        console.log(`   [${i + 1}/${statements.length}] Executing: ${statement.substring(0, 60)}...`);
        await sql.unsafe(statement);
        console.log(`   ✅ Statement ${i + 1} executed successfully\n`);
      } catch (stmtError) {
        // If table doesn't exist, that's okay (IF EXISTS handles it)
        if (stmtError.message?.includes('does not exist')) {
          console.log(`   ⚠️  Table already removed (non-critical)\n`);
        } else {
          throw stmtError;
        }
      }
    }

    // Verify tables were dropped
    console.log('🔍 Verifying migration...\n');

    const verifyAllocations = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'credit_allocations'
      ) as exists;
    `;

    const verifyTransactions = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'credit_allocation_transactions'
      ) as exists;
    `;

    const allocationsStillExists = verifyAllocations[0]?.exists || false;
    const transactionsStillExists = verifyTransactions[0]?.exists || false;

    if (!allocationsStillExists && !transactionsStillExists) {
      console.log('✅ Migration completed successfully!');
      console.log('   ✓ credit_allocations table dropped');
      console.log('   ✓ credit_allocation_transactions table dropped\n');
    } else {
      console.log('⚠️  Migration completed with warnings:');
      if (allocationsStillExists) {
        console.log('   ⚠️  credit_allocations table still exists');
      }
      if (transactionsStillExists) {
        console.log('   ⚠️  credit_allocation_transactions table still exists');
      }
      console.log('');
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Migration Summary:');
    console.log('   • Removed credit_allocation_transactions table');
    console.log('   • Removed credit_allocations table');
    console.log('   • Applications now manage their own credit consumption');
    console.log('   • Wrapper maintains only credits and credit_transactions tables');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('   Error details:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run migration
runCreditAllocationMigration()
  .then(() => {
    console.log('✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });














