/**
 * Migration: Add new onboarding fields to tenants table
 * Based on ZOPKIT_ONBOARDING_FIELD_ANALYSIS.md
 */

import { systemDbConnection } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

async function addOnboardingFields() {
  console.log('🚀 Starting migration: Add onboarding fields to tenants table');

  try {
    // Add new columns to tenants table
    await systemDbConnection.execute(sql`
      ALTER TABLE tenants
      ADD COLUMN IF NOT EXISTS tax_registered BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS vat_gst_registered BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS organization_size VARCHAR(50),
      ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS contact_job_title VARCHAR(150),
      ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR(20),
      ADD COLUMN IF NOT EXISTS mailing_address_same_as_registered BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS mailing_street VARCHAR(255),
      ADD COLUMN IF NOT EXISTS mailing_city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS mailing_state VARCHAR(100),
      ADD COLUMN IF NOT EXISTS mailing_zip VARCHAR(20),
      ADD COLUMN IF NOT EXISTS mailing_country VARCHAR(100),
      ADD COLUMN IF NOT EXISTS support_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS contact_salutation VARCHAR(20),
      ADD COLUMN IF NOT EXISTS contact_middle_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS contact_department VARCHAR(100),
      ADD COLUMN IF NOT EXISTS contact_direct_phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS contact_mobile_phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS contact_preferred_contact_method VARCHAR(20),
      ADD COLUMN IF NOT EXISTS contact_authority_level VARCHAR(50),
      ADD COLUMN IF NOT EXISTS tax_registration_details JSONB DEFAULT '{}'
    `);

    console.log('✅ Successfully added new columns to tenants table');

    // Create indexes for performance
    await systemDbConnection.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_tenants_tax_registered ON tenants(tax_registered);
      CREATE INDEX IF NOT EXISTS idx_tenants_vat_gst_registered ON tenants(vat_gst_registered);
      CREATE INDEX IF NOT EXISTS idx_tenants_organization_size ON tenants(organization_size);
      CREATE INDEX IF NOT EXISTS idx_tenants_billing_email ON tenants(billing_email);
    `);

    console.log('✅ Successfully created indexes for new columns');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addOnboardingFields()
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { addOnboardingFields };