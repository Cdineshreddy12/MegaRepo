-- ============================================================================
-- Verification Query: Check Onboarding Fields in Tenants Table
-- ============================================================================
-- Description: Verifies that all onboarding fields exist in the tenants table
-- Run this after applying the migration to confirm all fields were added
-- ============================================================================

-- ============================================================================
-- 1. List All Columns in Tenants Table
-- ============================================================================
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_name = 'tenants'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- 2. Check for Required Onboarding Fields
-- ============================================================================
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'tax_registered'
    ) THEN '✅ tax_registered'
    ELSE '❌ tax_registered MISSING'
  END AS tax_registered,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'vat_gst_registered'
    ) THEN '✅ vat_gst_registered'
    ELSE '❌ vat_gst_registered MISSING'
  END AS vat_gst_registered,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'organization_size'
    ) THEN '✅ organization_size'
    ELSE '❌ organization_size MISSING'
  END AS organization_size,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'billing_email'
    ) THEN '✅ billing_email'
    ELSE '❌ billing_email MISSING'
  END AS billing_email,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'contact_job_title'
    ) THEN '✅ contact_job_title'
    ELSE '❌ contact_job_title MISSING'
  END AS contact_job_title,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'preferred_contact_method'
    ) THEN '✅ preferred_contact_method'
    ELSE '❌ preferred_contact_method MISSING'
  END AS preferred_contact_method,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'mailing_address_same_as_registered'
    ) THEN '✅ mailing_address_same_as_registered'
    ELSE '❌ mailing_address_same_as_registered MISSING'
  END AS mailing_address_same_as_registered,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'mailing_street'
    ) THEN '✅ mailing_street'
    ELSE '❌ mailing_street MISSING'
  END AS mailing_street,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'mailing_city'
    ) THEN '✅ mailing_city'
    ELSE '❌ mailing_city MISSING'
  END AS mailing_city,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'mailing_state'
    ) THEN '✅ mailing_state'
    ELSE '❌ mailing_state MISSING'
  END AS mailing_state,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'mailing_zip'
    ) THEN '✅ mailing_zip'
    ELSE '❌ mailing_zip MISSING'
  END AS mailing_zip,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'mailing_country'
    ) THEN '✅ mailing_country'
    ELSE '❌ mailing_country MISSING'
  END AS mailing_country,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'support_email'
    ) THEN '✅ support_email'
    ELSE '❌ support_email MISSING'
  END AS support_email,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'contact_salutation'
    ) THEN '✅ contact_salutation'
    ELSE '❌ contact_salutation MISSING'
  END AS contact_salutation,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'contact_middle_name'
    ) THEN '✅ contact_middle_name'
    ELSE '❌ contact_middle_name MISSING'
  END AS contact_middle_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'contact_department'
    ) THEN '✅ contact_department'
    ELSE '❌ contact_department MISSING'
  END AS contact_department,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'contact_direct_phone'
    ) THEN '✅ contact_direct_phone'
    ELSE '❌ contact_direct_phone MISSING'
  END AS contact_direct_phone,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'contact_mobile_phone'
    ) THEN '✅ contact_mobile_phone'
    ELSE '❌ contact_mobile_phone MISSING'
  END AS contact_mobile_phone,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'contact_preferred_contact_method'
    ) THEN '✅ contact_preferred_contact_method'
    ELSE '❌ contact_preferred_contact_method MISSING'
  END AS contact_preferred_contact_method,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'contact_authority_level'
    ) THEN '✅ contact_authority_level'
    ELSE '❌ contact_authority_level MISSING'
  END AS contact_authority_level,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'tax_registration_details'
    ) THEN '✅ tax_registration_details'
    ELSE '❌ tax_registration_details MISSING'
  END AS tax_registration_details;

-- ============================================================================
-- 3. Count Total Columns (Should be ~50+ after migration)
-- ============================================================================
SELECT 
  COUNT(*) AS total_columns,
  COUNT(CASE WHEN column_name LIKE '%tax%' OR column_name LIKE '%gst%' OR column_name LIKE '%vat%' THEN 1 END) AS tax_related_columns,
  COUNT(CASE WHEN column_name LIKE '%mailing%' THEN 1 END) AS mailing_address_columns,
  COUNT(CASE WHEN column_name LIKE '%contact%' THEN 1 END) AS contact_columns,
  COUNT(CASE WHEN column_name LIKE '%billing%' THEN 1 END) AS billing_columns
FROM information_schema.columns
WHERE table_name = 'tenants' AND table_schema = 'public';

-- ============================================================================
-- 4. Check Indexes
-- ============================================================================
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'tenants'
  AND indexname LIKE 'idx_tenants_%'
ORDER BY indexname;

-- ============================================================================
-- Expected Results After Migration:
-- ============================================================================
-- Total columns: ~50+
-- Tax-related columns: 3 (tax_registered, vat_gst_registered, tax_registration_details)
-- Mailing address columns: 6 (mailing_address_same_as_registered, mailing_street, mailing_city, mailing_state, mailing_zip, mailing_country)
-- Contact columns: 8+ (contact_job_title, contact_salutation, contact_middle_name, contact_department, contact_direct_phone, contact_mobile_phone, contact_preferred_contact_method, contact_authority_level)
-- Billing columns: 1 (billing_email)
-- Indexes: 5 (idx_tenants_tax_registered, idx_tenants_vat_gst_registered, idx_tenants_organization_size, idx_tenants_billing_email, idx_tenants_support_email)
-- ============================================================================


