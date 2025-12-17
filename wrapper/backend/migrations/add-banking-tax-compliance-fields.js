/**
 * Migration Script: Add Banking, Tax & Compliance Fields
 * 
 * This script adds banking information, comprehensive tax & compliance fields,
 * and fiscal year settings to the tenants table.
 */

import { dbManager } from '../src/db/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function addBankingTaxComplianceFields() {
  console.log('🚀 Starting migration: Add banking, tax & compliance fields to tenants table');

  try {
    // Initialize database connection
    await dbManager.initialize();
    const systemConnection = dbManager.getSystemConnection();

    // Read the SQL migration file
    const migrationPath = path.join(__dirname, 'add-banking-tax-compliance-fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Read migration file, executing SQL...');

    // Execute the migration SQL
    // Split by semicolons but keep BEGIN/COMMIT blocks together
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('COMMENT'));

    // Execute all statements in a transaction
    await systemConnection.begin();
    
    try {
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.trim() && !statement.startsWith('COMMENT')) {
          console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
          try {
            await systemConnection.unsafe(statement);
          } catch (error) {
            // Skip errors for already existing columns/indexes
            if (error.message.includes('already exists') ||
                error.message.includes('does not exist') ||
                error.code === '42701' || // duplicate column
                error.code === '42P07' || // duplicate table/index
                error.code === '42710') { // duplicate object
              console.log(`⚠️  Skipping existing object: ${error.message.split('\n')[0]}`);
              continue;
            }
            console.error(`❌ Failed to execute statement ${i + 1}:`, error.message);
            throw error;
          }
        }
      }
      
      await systemConnection.commit();
      console.log('✅ Successfully added banking, tax & compliance fields to tenants table');
    } catch (error) {
      await systemConnection.rollback();
      throw error;
    }

    // Verify columns were added
    console.log('🔍 Verifying columns...');
    const verifyColumns = [
      'fiscal_year_start_month',
      'bank_name',
      'tax_residence_country',
      'regulatory_compliance_status'
    ];

    for (const colName of verifyColumns) {
      const result = await systemConnection`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'tenants' AND column_name = ${colName}
      `;
      
      if (result.length > 0) {
        console.log(`✅ Column '${colName}' exists`);
      } else {
        console.log(`⚠️  Column '${colName}' not found`);
      }
    }

    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    // Close connections
    if (dbManager.systemConnection) {
      await dbManager.systemConnection.end();
    }
  }
}

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addBankingTaxComplianceFields()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export default addBankingTaxComplianceFields;


