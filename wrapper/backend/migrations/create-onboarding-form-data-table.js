/**
 * Migration: Create onboarding_form_data table
 * This table stores form data during onboarding before user/tenant records exist
 */

import { systemDbConnection } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

async function createOnboardingFormDataTable() {
  console.log('🚀 Starting migration: Create onboarding_form_data table');

  try {
    // Create table
    await systemDbConnection.execute(sql`
      CREATE TABLE IF NOT EXISTS onboarding_form_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        kinde_user_id VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        current_step VARCHAR(50),
        flow_type VARCHAR(50),
        form_data JSONB NOT NULL DEFAULT '{}',
        step_data JSONB DEFAULT '{}',
        last_saved TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes
    await systemDbConnection.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_onboarding_form_data_kinde_user_id 
      ON onboarding_form_data(kinde_user_id)
    `);

    await systemDbConnection.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_onboarding_form_data_email 
      ON onboarding_form_data(email)
    `);

    await systemDbConnection.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_onboarding_form_data_kinde_user_email 
      ON onboarding_form_data(kinde_user_id, email)
    `);

    // Add comments
    await systemDbConnection.execute(sql`
      COMMENT ON TABLE onboarding_form_data IS 
      'Stores onboarding form data before user/tenant records are created'
    `);

    await systemDbConnection.execute(sql`
      COMMENT ON COLUMN onboarding_form_data.kinde_user_id IS 
      'Kinde authentication user ID'
    `);

    await systemDbConnection.execute(sql`
      COMMENT ON COLUMN onboarding_form_data.email IS 
      'User email address'
    `);

    await systemDbConnection.execute(sql`
      COMMENT ON COLUMN onboarding_form_data.form_data IS 
      'Complete form data as JSON'
    `);

    await systemDbConnection.execute(sql`
      COMMENT ON COLUMN onboarding_form_data.step_data IS 
      'Step-specific data for progress tracking'
    `);

    console.log('✅ Successfully created onboarding_form_data table and indexes');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createOnboardingFormDataTable()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export default createOnboardingFormDataTable;










