-- Migration: Create onboarding_form_data table
-- This table stores form data during onboarding before user/tenant records exist

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
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_onboarding_form_data_kinde_user_id ON onboarding_form_data(kinde_user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_form_data_email ON onboarding_form_data(email);
CREATE INDEX IF NOT EXISTS idx_onboarding_form_data_kinde_user_email ON onboarding_form_data(kinde_user_id, email);

-- Add comment
COMMENT ON TABLE onboarding_form_data IS 'Stores onboarding form data before user/tenant records are created';
COMMENT ON COLUMN onboarding_form_data.kinde_user_id IS 'Kinde authentication user ID';
COMMENT ON COLUMN onboarding_form_data.email IS 'User email address';
COMMENT ON COLUMN onboarding_form_data.form_data IS 'Complete form data as JSON';
COMMENT ON COLUMN onboarding_form_data.step_data IS 'Step-specific data for progress tracking';


















