-- ============================================================================
-- Migration: Add Banking, Tax & Compliance Fields to Tenants Table
-- ============================================================================
-- Description: Adds banking information, comprehensive tax & compliance fields,
--              fiscal year, and enhanced localization settings
-- Date: 2025-01-16
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Banking & Financial Information Fields
-- ============================================================================
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(255),
  ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS account_number VARCHAR(50), -- Will be encrypted in application layer
  ADD COLUMN IF NOT EXISTS account_type VARCHAR(50), -- Checking, Savings, Current
  ADD COLUMN IF NOT EXISTS bank_account_currency VARCHAR(3), -- ISO 4217
  ADD COLUMN IF NOT EXISTS swift_bic_code VARCHAR(11),
  ADD COLUMN IF NOT EXISTS iban VARCHAR(34),
  ADD COLUMN IF NOT EXISTS routing_number_us VARCHAR(9), -- ABA routing number
  ADD COLUMN IF NOT EXISTS sort_code_uk VARCHAR(6), -- UK sort code
  ADD COLUMN IF NOT EXISTS ifsc_code_india VARCHAR(11), -- Indian Financial System Code
  ADD COLUMN IF NOT EXISTS bsb_number_australia VARCHAR(6), -- Bank-State-Branch
  ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50), -- Net 15, Net 30, Net 45, Net 60
  ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS preferred_payment_method VARCHAR(50); -- Wire Transfer, ACH, Check, Card

COMMENT ON COLUMN tenants.bank_name IS 'Name of banking institution';
COMMENT ON COLUMN tenants.bank_branch IS 'Branch name/location';
COMMENT ON COLUMN tenants.account_holder_name IS 'Name on bank account (must match org name)';
COMMENT ON COLUMN tenants.account_number IS 'Bank account number (encrypted in application)';
COMMENT ON COLUMN tenants.account_type IS 'Account type: Checking, Savings, Current';
COMMENT ON COLUMN tenants.bank_account_currency IS 'Account currency (ISO 4217)';
COMMENT ON COLUMN tenants.swift_bic_code IS 'SWIFT/BIC code for international transfers';
COMMENT ON COLUMN tenants.iban IS 'International Bank Account Number';
COMMENT ON COLUMN tenants.routing_number_us IS 'ABA routing number (US)';
COMMENT ON COLUMN tenants.sort_code_uk IS 'UK bank sort code (XX-XX-XX format)';
COMMENT ON COLUMN tenants.ifsc_code_india IS 'Indian Financial System Code';
COMMENT ON COLUMN tenants.bsb_number_australia IS 'Bank-State-Branch number (Australia)';
COMMENT ON COLUMN tenants.payment_terms IS 'Payment terms: Net 15, Net 30, Net 45, Net 60';
COMMENT ON COLUMN tenants.credit_limit IS 'Approved credit limit';
COMMENT ON COLUMN tenants.preferred_payment_method IS 'Preferred payment method: Wire Transfer, ACH, Check, Card';

-- ============================================================================
-- 2. Enhanced Tax & Compliance Fields
-- ============================================================================
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS tax_residence_country VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tax_exempt_status BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_exemption_certificate_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS tax_exemption_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS withholding_tax_applicable BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS withholding_tax_rate DECIMAL(5, 2), -- 0-100%
  ADD COLUMN IF NOT EXISTS tax_treaty_country VARCHAR(100),
  ADD COLUMN IF NOT EXISTS w9_status_us VARCHAR(50), -- Submitted, Pending, Not Required
  ADD COLUMN IF NOT EXISTS w8_form_type_us VARCHAR(50), -- W-8BEN, W-8BEN-E, W-8ECI
  ADD COLUMN IF NOT EXISTS reverse_charge_mechanism BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS vat_gst_rate_applicable VARCHAR(50), -- Standard, Reduced, Zero-rated, Exempt
  ADD COLUMN IF NOT EXISTS regulatory_compliance_status VARCHAR(50) DEFAULT 'Pending', -- Compliant, Pending, Non-Compliant
  ADD COLUMN IF NOT EXISTS industry_specific_licenses TEXT,
  ADD COLUMN IF NOT EXISTS data_protection_registration VARCHAR(50), -- GDPR/DPA registration
  ADD COLUMN IF NOT EXISTS professional_indemnity_insurance BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS insurance_policy_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE;

COMMENT ON COLUMN tenants.tax_residence_country IS 'Primary tax residence country';
COMMENT ON COLUMN tenants.tax_exempt_status IS 'Tax exempt organization status';
COMMENT ON COLUMN tenants.tax_exemption_certificate_number IS 'Tax exemption certificate number';
COMMENT ON COLUMN tenants.tax_exemption_expiry_date IS 'Tax exemption certificate expiration date';
COMMENT ON COLUMN tenants.withholding_tax_applicable IS 'Subject to withholding tax';
COMMENT ON COLUMN tenants.withholding_tax_rate IS 'Applicable withholding tax rate (0-100%)';
COMMENT ON COLUMN tenants.tax_treaty_country IS 'Tax treaty country if applicable';
COMMENT ON COLUMN tenants.w9_status_us IS 'W-9 form status (US entities only)';
COMMENT ON COLUMN tenants.w8_form_type_us IS 'W-8 form type (non-US entities doing US business)';
COMMENT ON COLUMN tenants.reverse_charge_mechanism IS 'Reverse charge mechanism for B2B transactions';
COMMENT ON COLUMN tenants.vat_gst_rate_applicable IS 'VAT/GST rate: Standard, Reduced, Zero-rated, Exempt';
COMMENT ON COLUMN tenants.regulatory_compliance_status IS 'Regulatory compliance status';
COMMENT ON COLUMN tenants.industry_specific_licenses IS 'List of industry-specific licenses';
COMMENT ON COLUMN tenants.data_protection_registration IS 'GDPR/DPA registration number';
COMMENT ON COLUMN tenants.professional_indemnity_insurance IS 'Has professional indemnity insurance';
COMMENT ON COLUMN tenants.insurance_policy_number IS 'PI insurance policy number';
COMMENT ON COLUMN tenants.insurance_expiry_date IS 'PI insurance policy expiration date';

-- ============================================================================
-- 3. Fiscal Year & Enhanced Localization
-- ============================================================================
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS fiscal_year_start_month INTEGER DEFAULT 1, -- 1-12 (January = 1)
  ADD COLUMN IF NOT EXISTS fiscal_year_end_month INTEGER DEFAULT 12, -- 1-12 (December = 12)
  ADD COLUMN IF NOT EXISTS fiscal_year_start_day INTEGER DEFAULT 1, -- 1-31
  ADD COLUMN IF NOT EXISTS fiscal_year_end_day INTEGER DEFAULT 31; -- 1-31

COMMENT ON COLUMN tenants.fiscal_year_start_month IS 'Fiscal year start month (1-12)';
COMMENT ON COLUMN tenants.fiscal_year_end_month IS 'Fiscal year end month (1-12)';
COMMENT ON COLUMN tenants.fiscal_year_start_day IS 'Fiscal year start day (1-31)';
COMMENT ON COLUMN tenants.fiscal_year_end_day IS 'Fiscal year end day (1-31)';

-- ============================================================================
-- 4. Create Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_tenants_bank_name ON tenants(bank_name) WHERE bank_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_tax_residence_country ON tenants(tax_residence_country) WHERE tax_residence_country IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_regulatory_compliance_status ON tenants(regulatory_compliance_status);
CREATE INDEX IF NOT EXISTS idx_tenants_tax_exempt_status ON tenants(tax_exempt_status) WHERE tax_exempt_status = true;

-- ============================================================================
-- 5. Update tax_registration_details JSONB to include new tax fields
-- ============================================================================
-- Note: Some tax fields are stored in JSONB for flexibility, others as columns for querying
-- The application layer will handle syncing between JSONB and columns

COMMIT;

-- ============================================================================
-- Migration Summary
-- ============================================================================
-- Banking Fields Added: 15
--   - bank_name, bank_branch, account_holder_name, account_number
--   - account_type, bank_account_currency, swift_bic_code, iban
--   - routing_number_us, sort_code_uk, ifsc_code_india, bsb_number_australia
--   - payment_terms, credit_limit, preferred_payment_method
--
-- Tax & Compliance Fields Added: 15
--   - tax_residence_country, tax_exempt_status, tax_exemption_certificate_number
--   - tax_exemption_expiry_date, withholding_tax_applicable, withholding_tax_rate
--   - tax_treaty_country, w9_status_us, w8_form_type_us
--   - reverse_charge_mechanism, vat_gst_rate_applicable, regulatory_compliance_status
--   - industry_specific_licenses, data_protection_registration
--   - professional_indemnity_insurance, insurance_policy_number, insurance_expiry_date
--
-- Fiscal Year Fields Added: 4
--   - fiscal_year_start_month, fiscal_year_end_month
--   - fiscal_year_start_day, fiscal_year_end_day
--
-- Indexes Created: 4
-- ============================================================================


