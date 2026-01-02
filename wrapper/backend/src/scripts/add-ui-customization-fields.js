#!/usr/bin/env node

/**
 * 🔄 **ADD UI CUSTOMIZATION FIELDS MIGRATION SCRIPT**
 * Adds UI customization support to notification templates
 * 
 * Usage:
 *   node src/scripts/add-ui-customization-fields.js
 *   npm run migrate:add-ui-customization
 */

import postgres from 'postgres';
import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function addUICustomizationFields() {
  console.log('🚀 Starting UI Customization Fields Migration');
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
    // Read migration file
    const migrationPath = join(__dirname, '../db/migrations/add_ui_customization_fields.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    console.log('📄 Read migration file:', migrationPath);

    // Execute migration
    console.log('\n🔄 Executing migration...\n');
    await sql.unsafe(migrationSQL);

    console.log('✅ Migration completed successfully\n');

    // Verify changes
    console.log('🔍 Verifying changes...\n');
    
    const hasUIConfig = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'notification_templates'
        AND column_name = 'ui_config'
      ) as exists;
    `;

    const hasCustomizationsTable = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'tenant_template_customizations'
      ) as exists;
    `;

    if (hasUIConfig[0]?.exists) {
      console.log('✅ ui_config column added to notification_templates');
    }

    if (hasCustomizationsTable[0]?.exists) {
      console.log('✅ tenant_template_customizations table created');
    }

    await sql.end();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Migration completed successfully');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    await sql.end();
    process.exit(1);
  }
}

addUICustomizationFields().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});











