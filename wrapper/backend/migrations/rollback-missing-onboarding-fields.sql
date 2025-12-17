-- ============================================================================
-- Rollback: Remove Missing Onboarding Fields from Tenants Table
-- ============================================================================
-- Description: Removes all onboarding fields added by add-missing-onboarding-fields.sql
-- WARNING: This will permanently delete data in these columns!
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Drop Indexes First
-- ============================================================================
DROP INDEX IF EXISTS idx_tenants_tax_registered;
DROP INDEX IF EXISTS idx_tenants_vat_gst_registered;
DROP INDEX IF EXISTS idx_tenants_organization_size;
DROP INDEX IF EXISTS idx_tenants_billing_email;
DROP INDEX IF EXISTS idx_tenants_support_email;

-- ============================================================================
-- 2. Remove Columns
-- ============================================================================

-- Tax & Registration Fields
ALTER TABLE tenants
  DROP COLUMN IF EXISTS tax_registered,
  DROP COLUMN IF EXISTS vat_gst_registered,
  DROP COLUMN IF EXISTS tax_registration_details;

-- Organization Profile Fields
ALTER TABLE tenants
  DROP COLUMN IF EXISTS organization_size,
  DROP COLUMN IF EXISTS billing_email,
  DROP COLUMN IF EXISTS contact_job_title,
  DROP COLUMN IF EXISTS preferred_contact_method;

-- Mailing Address Fields
ALTER TABLE tenants
  DROP COLUMN IF EXISTS mailing_address_same_as_registered,
  DROP COLUMN IF EXISTS mailing_street,
  DROP COLUMN IF EXISTS mailing_city,
  DROP COLUMN IF EXISTS mailing_state,
  DROP COLUMN IF EXISTS mailing_zip,
  DROP COLUMN IF EXISTS mailing_country;

-- Additional Contact Details
ALTER TABLE tenants
  DROP COLUMN IF EXISTS support_email,
  DROP COLUMN IF EXISTS contact_salutation,
  DROP COLUMN IF EXISTS contact_middle_name,
  DROP COLUMN IF EXISTS contact_department,
  DROP COLUMN IF EXISTS contact_direct_phone,
  DROP COLUMN IF EXISTS contact_mobile_phone,
  DROP COLUMN IF EXISTS contact_preferred_contact_method,
  DROP COLUMN IF EXISTS contact_authority_level;

COMMIT;

-- ============================================================================
-- Rollback Complete
-- ============================================================================


