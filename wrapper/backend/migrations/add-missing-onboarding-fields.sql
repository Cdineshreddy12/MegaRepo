-- ============================================================================
-- Migration: Add Missing Onboarding Fields to Tenants Table
-- ============================================================================
-- Description: Adds all missing onboarding fields based on schema analysis
-- Date: 2025-01-16
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Tax & Registration Fields
-- ============================================================================
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS tax_registered BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS vat_gst_registered BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_registration_details JSONB DEFAULT '{}';

COMMENT ON COLUMN tenants.tax_registered IS 'Whether organization is tax registered';
COMMENT ON COLUMN tenants.vat_gst_registered IS 'Whether organization has VAT/GST registration';
COMMENT ON COLUMN tenants.tax_registration_details IS 'Country-specific tax IDs and details (PAN, EIN, VAT, CIN, etc.)';

-- ============================================================================
-- 2. Organization Profile Fields
-- ============================================================================
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS organization_size VARCHAR(50),
  ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS contact_job_title VARCHAR(150),
  ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR(20);

COMMENT ON COLUMN tenants.organization_size IS 'Company size (1-10, 11-50, 51-200, 201-500, 501-1000, 1000+)';
COMMENT ON COLUMN tenants.billing_email IS 'Separate billing email address';
COMMENT ON COLUMN tenants.contact_job_title IS 'Primary contact person''s job title';
COMMENT ON COLUMN tenants.preferred_contact_method IS 'Preferred contact method (email, phone, sms)';

-- ============================================================================
-- 3. Mailing Address Fields
-- ============================================================================
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS mailing_address_same_as_registered BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mailing_street VARCHAR(255),
  ADD COLUMN IF NOT EXISTS mailing_city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS mailing_state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS mailing_zip VARCHAR(20),
  ADD COLUMN IF NOT EXISTS mailing_country VARCHAR(100);

COMMENT ON COLUMN tenants.mailing_address_same_as_registered IS 'Whether mailing address is same as registered address';
COMMENT ON COLUMN tenants.mailing_street IS 'Mailing street address';
COMMENT ON COLUMN tenants.mailing_city IS 'Mailing city';
COMMENT ON COLUMN tenants.mailing_state IS 'Mailing state/province';
COMMENT ON COLUMN tenants.mailing_zip IS 'Mailing ZIP/postal code';
COMMENT ON COLUMN tenants.mailing_country IS 'Mailing country';

-- ============================================================================
-- 4. Additional Contact Details
-- ============================================================================
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS support_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS contact_salutation VARCHAR(20),
  ADD COLUMN IF NOT EXISTS contact_middle_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS contact_department VARCHAR(100),
  ADD COLUMN IF NOT EXISTS contact_direct_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS contact_mobile_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS contact_preferred_contact_method VARCHAR(20),
  ADD COLUMN IF NOT EXISTS contact_authority_level VARCHAR(50);

COMMENT ON COLUMN tenants.support_email IS 'Support email address';
COMMENT ON COLUMN tenants.contact_salutation IS 'Contact salutation (Mr., Mrs., Ms., Dr., Prof.)';
COMMENT ON COLUMN tenants.contact_middle_name IS 'Contact middle name';
COMMENT ON COLUMN tenants.contact_department IS 'Contact department';
COMMENT ON COLUMN tenants.contact_direct_phone IS 'Contact direct phone number';
COMMENT ON COLUMN tenants.contact_mobile_phone IS 'Contact mobile phone number';
COMMENT ON COLUMN tenants.contact_preferred_contact_method IS 'Contact''s preferred contact method';
COMMENT ON COLUMN tenants.contact_authority_level IS 'Contact authority level (Owner/Founder, CEO, CFO, CTO, Director, Manager, Administrator, Other)';

-- ============================================================================
-- 5. Create Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_tenants_tax_registered ON tenants(tax_registered);
CREATE INDEX IF NOT EXISTS idx_tenants_vat_gst_registered ON tenants(vat_gst_registered);
CREATE INDEX IF NOT EXISTS idx_tenants_organization_size ON tenants(organization_size);
CREATE INDEX IF NOT EXISTS idx_tenants_billing_email ON tenants(billing_email) WHERE billing_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_support_email ON tenants(support_email) WHERE support_email IS NOT NULL;

-- ============================================================================
-- 6. Verify Migration
-- ============================================================================
-- Run this query to verify all columns were added:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'tenants'
-- ORDER BY ordinal_position;

COMMIT;

-- ============================================================================
-- Migration Summary
-- ============================================================================
-- Total fields added: 21
-- 
-- Tax & Registration: 3 fields
--   - tax_registered
--   - vat_gst_registered
--   - tax_registration_details
--
-- Organization Profile: 4 fields
--   - organization_size
--   - billing_email
--   - contact_job_title
--   - preferred_contact_method
--
-- Mailing Address: 6 fields
--   - mailing_address_same_as_registered
--   - mailing_street
--   - mailing_city
--   - mailing_state
--   - mailing_zip
--   - mailing_country
--
-- Contact Details: 8 fields
--   - support_email
--   - contact_salutation
--   - contact_middle_name
--   - contact_department
--   - contact_direct_phone
--   - contact_mobile_phone
--   - contact_preferred_contact_method
--   - contact_authority_level
--
-- Indexes created: 5
-- ============================================================================


