# Zopkit Organization Onboarding Fields Analysis

## Executive Summary
This document analyzes the comprehensive multi-country onboarding fields guide and identifies which fields are **essential**, **recommended**, or **optional** for Zopkit's SaaS business model.

**Zopkit Context:**
- Multi-tenant SaaS platform (CRM, HRMS, Finance, Operations)
- Serves businesses globally with focus on India, US, UK, EU
- Requires minimal friction onboarding for trial conversion
- Needs compliance data for billing, invoicing, and tax calculations
- Supports multiple countries but doesn't need exhaustive country-specific fields upfront

---

## Field Categorization Strategy

### 🟢 **ESSENTIAL (M)** - Must Collect
Fields critical for platform operation, billing, compliance, and user experience.

### 🟡 **RECOMMENDED (R)** - Should Collect  
Fields that enhance functionality, personalization, or compliance but can be collected later.

### ⚪ **OPTIONAL (O)** - Nice to Have
Fields that provide additional value but aren't critical for initial onboarding.

---

## STEP 1: Basic Organization Information

| Field Name | Current Status | Recommendation | Priority | Rationale |
|------------|---------------|----------------|----------|------------|
| **Organization Name** | ✅ Collected | **M** | Critical | Already in schema (`companyName`) - Required for tenant identification |
| **Trading Name/DBA** | ❌ Not Collected | **O** | Low | Nice for display but not critical for SaaS operations |
| **Organization Type** | ✅ Collected | **M** | High | Already in schema (`companyType`) - Affects tax/billing logic |
| **Industry** | ✅ Collected | **M** | High | Already in schema (`industry`) - Critical for product customization & analytics |
| **Sub-Industry** | ❌ Not Collected | **O** | Low | Can be inferred from industry or collected later |
| **Organization Size** | ❌ Not Collected | **R** | Medium | **RECOMMENDED** - Helps with pricing tiers, feature recommendations, support sizing |
| **Annual Revenue** | ❌ Not Collected | **O** | Low | Not needed for SaaS operations - can be collected for enterprise sales |
| **Fiscal Year Start** | ❌ Not Collected | **O** | Low | Only needed for advanced financial reporting - can be added later |
| **Founded Date** | ❌ Not Collected | **O** | Low | Nice for company profiles but not critical |
| **Organization Website** | ✅ Collected | **R** | Medium | Already in schema (`website`) - **RECOMMENDED** for verification & branding |
| **Primary Language** | ✅ Collected | **M** | High | Already in schema (`defaultLanguage`) - Critical for UI localization |
| **Time Zone** | ✅ Collected | **M** | High | Already in schema (`defaultTimeZone`) - Critical for scheduling, reports |
| **Currency** | ✅ Collected | **M** | High | Already in schema (`defaultCurrency`) - Critical for billing & invoicing |
| **Tax Registered** | ❌ Not Collected | **M** | Critical | **NEW - ESSENTIAL** - Controls tax field visibility (affects billing) |
| **VAT/GST Registered** | ✅ Collected (GSTIN) | **M** | Critical | Already partially collected (`gstin`) - **ENHANCE** to support all countries |

---

## STEP 2: Country-Specific Registration Details

### Strategy: Progressive Disclosure Based on Country Selection

**Current State:** Only GSTIN (India-specific) is collected.

**Recommendation:** Implement country-based conditional fields, but keep initial onboarding minimal.

### 2A. UNITED STATES

| Field Name | Recommendation | Priority | When to Collect |
|------------|---------------|----------|-----------------|
| **EIN** | **C** (if Tax Registered) | High | During billing setup or tax configuration |
| **State of Incorporation** | **R** | Medium | During onboarding if US selected |
| **DUNS Number** | **O** | Low | Enterprise feature - collect later |
| **NAICS Code** | **O** | Low | Can be auto-detected or collected later |
| **Sales Tax ID** | **C** (if VAT/GST Registered) | High | During billing/tax setup |
| **SIC Code** | **O** | Low | Not critical for SaaS |
| **Federal Tax Exempt** | **C** (if Tax Registered) | Medium | During tax configuration |
| **Tax Exempt Certificate** | **C** (if Tax Exempt) | Medium | During tax configuration |

### 2B. UNITED KINGDOM

| Field Name | Recommendation | Priority | When to Collect |
|------------|---------------|----------|-----------------|
| **Company Registration Number** | **R** | Medium | During onboarding if UK selected |
| **VAT Number** | **C** (if VAT Registered) | High | During billing setup |
| **VAT Registration Date** | **C** (if VAT Registered) | Medium | During VAT setup |
| **VAT Scheme** | **C** (if VAT Registered) | Medium | During VAT configuration |
| **UTR** | **C** (if Tax Registered) | Medium | During tax configuration |
| **PAYE Reference** | **O** | Low | Only if HRMS module used - collect later |
| **Company Type** | **R** | Medium | During onboarding if UK selected |
| **SIC Code (UK)** | **O** | Low | Not critical |
| **Charity Number** | **C** (if Non-Profit) | Low | During tax configuration |
| **MTD Enabled** | **C** (if VAT Registered) | Medium | During VAT configuration |

### 2C. EUROPEAN UNION

| Field Name | Recommendation | Priority | When to Collect |
|------------|---------------|----------|-----------------|
| **VAT Number** | **C** (if VAT Registered) | High | During billing setup |
| **VAT Registration Country** | **C** (if VAT Registered) | High | During VAT setup |
| **Intra-Community VAT** | **C** (if VAT Registered) | Medium | During VAT configuration |
| **EORI Number** | **O** | Low | Only if import/export features used |
| **LEI Code** | **O** | Low | Enterprise feature |
| **Company Registration Number** | **R** | Medium | During onboarding if EU selected |
| **Trade Register** | **R** | Medium | During onboarding if EU selected |
| **National Tax ID** | **C** (if Tax Registered) | Medium | During tax configuration |
| **D-U-N-S Number** | **O** | Low | Enterprise feature |
| **Fiscal Representative** | **C** (if non-EU with EU VAT) | Medium | During VAT setup |

### 2D. INDIA (Current Focus)

| Field Name | Current Status | Recommendation | Priority | Notes |
|------------|---------------|----------------|----------|-------|
| **CIN** | ❌ Not Collected | **C** (if Corporation) | Medium | **RECOMMENDED** - Add for Indian corporations |
| **GSTIN** | ✅ Collected | **M** | Critical | Already collected - **ENHANCE** validation |
| **GST Registration Date** | ❌ Not Collected | **R** | Medium | **RECOMMENDED** - Add for compliance tracking |
| **GST Registration Type** | ❌ Not Collected | **R** | Medium | **RECOMMENDED** - Regular/Composition affects invoicing |
| **PAN** | ❌ Not Collected | **C** (if Tax Registered) | High | **RECOMMENDED** - Critical for Indian tax compliance |
| **TAN** | ❌ Not Collected | **O** | Low | Only needed if HRMS module used for TDS |
| **IEC Code** | ❌ Not Collected | **O** | Low | Only if import/export features used |
| **MSME Registration** | ❌ Not Collected | **O** | Low | Can be collected later for benefits |
| **State of Registration** | ✅ Collected | **M** | High | Already collected (`incorporationState`) |
| **ROC** | ❌ Not Collected | **O** | Low | Not critical for SaaS operations |
| **SEZ Unit** | ❌ Not Collected | **O** | Low | Special case - collect if needed |
| **LUT/Bond Reference** | ❌ Not Collected | **O** | Low | Only for export businesses |

### 2E. AUSTRALIA

| Field Name | Recommendation | Priority | When to Collect |
|------------|---------------|----------|-----------------|
| **ACN** | **R** | Medium | During onboarding if Australia selected |
| **ABN** | **R** | Medium | During onboarding if Australia selected |
| **TFN** | **C** (if Tax Registered) | Medium | During tax configuration |
| **GST Registration Status** | **C** (if GST Registered) | High | Maps to VAT/GST Registered field |
| **GST Registration Date** | **C** (if GST Registered) | Medium | During GST setup |
| **GST Turnover Threshold Met** | **O** | Low | Can be calculated |
| **ARBN** | **C** (if Foreign Company) | Low | Special case |
| **State/Territory** | **R** | Medium | During onboarding if Australia selected |

### 2F. CANADA

| Field Name | Recommendation | Priority | When to Collect |
|------------|---------------|----------|-----------------|
| **Business Number (BN)** | **R** | Medium | During onboarding if Canada selected |
| **Provincial Registration** | **R** | Medium | During onboarding if Canada selected |
| **GST/HST Number** | **C** (if VAT/GST Registered) | High | During billing setup |
| **GST/HST Registration Date** | **C** (if VAT/GST Registered) | Medium | During GST setup |
| **QST Number** | **C** (if Quebec & VAT Registered) | Medium | During GST setup if Quebec |
| **QST Registration Date** | **C** (if QST Number) | Medium | During QST setup |
| **Province of Incorporation** | **R** | Medium | During onboarding if Canada selected |
| **Corporation Type** | **R** | Medium | During onboarding if Canada selected |
| **Small Supplier Status** | **O** | Low | Can be calculated |

### 2G. SINGAPORE

| Field Name | Recommendation | Priority | When to Collect |
|------------|---------------|----------|-----------------|
| **UEN** | **R** | Medium | During onboarding if Singapore selected |
| **ACRA Registration Number** | **R** | Medium | During onboarding if Singapore selected |
| **GST Registration Number** | **C** (if VAT/GST Registered) | High | During billing setup |
| **GST Registration Date** | **C** (if VAT/GST Registered) | Medium | During GST setup |
| **GST Filing Frequency** | **C** (if VAT/GST Registered) | Medium | During GST configuration |
| **Taxable Turnover** | **C** (if VAT/GST Registered) | Medium | During GST setup |
| **Entity Type** | **R** | Medium | During onboarding if Singapore selected |
| **Primary SSIC Code** | **R** | Medium | During onboarding if Singapore selected |

### 2H. MIDDLE EAST (UAE Focus)

| Field Name | Recommendation | Priority | When to Collect |
|------------|---------------|----------|-----------------|
| **Trade License Number** | **R** | Medium | During onboarding if UAE selected |
| **License Issuing Authority** | **R** | Medium | During onboarding if UAE selected |
| **License Issue Date** | **R** | Medium | During onboarding if UAE selected |
| **License Expiry Date** | **R** | High | **IMPORTANT** - For compliance monitoring |
| **Commercial Registration** | **R** | Medium | During onboarding if UAE selected |
| **TRN** | **C** (if VAT/GST Registered) | High | During billing setup |
| **VAT Registration Date** | **C** (if VAT/GST Registered) | Medium | During VAT setup |
| **Emirate** | **R** | Medium | During onboarding if UAE selected |
| **Free Zone** | **C** (if Free Zone) | Medium | During onboarding if UAE selected |
| **Free Zone Benefits** | **O** | Low | Can be collected later |
| **License Type** | **R** | Medium | During onboarding if UAE selected |

---

## STEP 3: Primary Contact & Address Information

| Field Name | Current Status | Recommendation | Priority | Rationale |
|------------|---------------|----------------|----------|------------|
| **Registered Address Line 1** | ✅ Collected | **M** | Critical | Already in schema (`billingStreet`) - Required for invoicing |
| **Registered Address Line 2** | ❌ Not Collected | **O** | Low | Can be added to `billingStreet` or separate field |
| **City** | ✅ Collected | **M** | Critical | Already in schema (`billingCity`) |
| **State/Province/Region** | ✅ Collected | **M** | Critical | Already in schema (`billingState`) |
| **Postal/ZIP Code** | ✅ Collected | **M** | Critical | Already in schema (`billingZip`) |
| **Country** | ✅ Collected | **M** | Critical | Already in schema (`billingCountry`) |
| **Mailing Address Same as Registered** | ❌ Not Collected | **R** | Medium | **RECOMMENDED** - Many businesses have different addresses |
| **Mailing Address Fields** | ❌ Not Collected | **C** (if different) | Medium | **RECOMMENDED** - Collect if mailing differs |
| **Primary Phone Number** | ✅ Collected | **M** | Critical | Already in schema (`phone`) |
| **Alternate Phone Number** | ❌ Not Collected | **O** | Low | Nice to have but not critical |
| **Primary Email** | ✅ Collected | **M** | Critical | Already in schema (`adminEmail`) |
| **Support Email** | ❌ Not Collected | **O** | Low | Can be added later in settings |
| **Billing Email** | ❌ Not Collected | **R** | Medium | **RECOMMENDED** - Often different from admin email |

---

## STEP 4: Primary Contact Person Details

| Field Name | Current Status | Recommendation | Priority | Rationale |
|------------|---------------|----------------|----------|------------|
| **Contact Salutation** | ❌ Not Collected | **O** | Low | Not critical for SaaS |
| **First Name** | ✅ Collected | **M** | Critical | Already collected in onboarding |
| **Middle Name** | ❌ Not Collected | **O** | Low | Not critical |
| **Last Name** | ✅ Collected | **M** | Critical | Already collected in onboarding |
| **Job Title** | ❌ Not Collected | **R** | Medium | **RECOMMENDED** - Helps with support prioritization |
| **Department** | ❌ Not Collected | **O** | Low | Can be added later |
| **Direct Phone** | ✅ Collected | **M** | Critical | Already collected (`phone`) |
| **Mobile Phone** | ❌ Not Collected | **O** | Low | Can use primary phone |
| **Email Address** | ✅ Collected | **M** | Critical | Already collected (`adminEmail`) |
| **Preferred Contact Method** | ❌ Not Collected | **R** | Medium | **RECOMMENDED** - Improves support experience |
| **Authority Level** | ❌ Not Collected | **R** | Medium | **RECOMMENDED** - Helps identify decision makers |

---

## IMPLEMENTATION RECOMMENDATIONS

### Phase 1: Essential Fields (Immediate)
**Goal:** Minimal viable onboarding with critical fields only.

**New Fields to Add:**
1. `taxRegistered` (Boolean) - **MANDATORY**
2. `vatGstRegistered` (Boolean) - **MANDATORY** (enhance existing GSTIN)
3. `organizationSize` (Picklist) - **RECOMMENDED**
4. `billingEmail` (Email) - **RECOMMENDED**
5. `contactJobTitle` (String) - **RECOMMENDED**
6. `preferredContactMethod` (Picklist) - **RECOMMENDED**

**Enhancements:**
- Make GSTIN collection conditional on `vatGstRegistered = true`
- Add country-based conditional fields for VAT/Tax numbers
- Add validation for country-specific tax IDs

### Phase 2: Country-Specific Fields (Short-term)
**Goal:** Support top 5 markets (India, US, UK, EU, Australia).

**Country-Specific Fields:**
- **India:** PAN, CIN (if corporation), GST Registration Date, GST Type
- **US:** EIN (if tax registered), State of Incorporation, Sales Tax ID (if VAT registered)
- **UK:** Company Registration Number, VAT Number (if VAT registered), UTR (if tax registered)
- **EU:** VAT Number (if VAT registered), Company Registration Number, Trade Register
- **Australia:** ACN, ABN, GST Registration Number (if GST registered)

**Implementation Strategy:**
- Show country-specific fields based on `billingCountry` selection
- Use progressive disclosure - show only relevant fields
- Collect during onboarding but make non-critical ones optional

### Phase 3: Advanced Fields (Long-term)
**Goal:** Enterprise features and compliance.

**Fields to Add Later:**
- Mailing address (if different from registered)
- Additional tax identifiers (DUNS, LEI, etc.)
- Fiscal year settings
- Advanced compliance fields

---

## DATABASE SCHEMA UPDATES NEEDED

### Immediate Additions to `tenants` Table:

```sql
-- Essential fields
ALTER TABLE tenants ADD COLUMN tax_registered BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN vat_gst_registered BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN organization_size VARCHAR(50); -- '1-10', '11-50', etc.
ALTER TABLE tenants ADD COLUMN billing_email VARCHAR(255);
ALTER TABLE tenants ADD COLUMN contact_job_title VARCHAR(150);
ALTER TABLE tenants ADD COLUMN preferred_contact_method VARCHAR(20); -- 'email', 'phone', 'sms'

-- Country-specific tax fields (store in JSONB for flexibility)
ALTER TABLE tenants ADD COLUMN tax_registration_details JSONB DEFAULT '{}';
-- Structure: { country: 'IN', taxId: 'PAN123456', vatId: 'GSTIN123', registrationDate: '2024-01-01', ... }

-- Mailing address (if different)
ALTER TABLE tenants ADD COLUMN mailing_address_same_as_registered BOOLEAN DEFAULT true;
ALTER TABLE tenants ADD COLUMN mailing_street VARCHAR(255);
ALTER TABLE tenants ADD COLUMN mailing_city VARCHAR(100);
ALTER TABLE tenants ADD COLUMN mailing_state VARCHAR(100);
ALTER TABLE tenants ADD COLUMN mailing_zip VARCHAR(20);
ALTER TABLE tenants ADD COLUMN mailing_country VARCHAR(100);
```

---

## ONBOARDING FLOW RECOMMENDATIONS

### Current Flow (Keep):
1. ✅ Personal Details
2. ✅ Business Details (Company Name, Type, Industry)
3. ✅ Tax Details (GSTIN for India)
4. ✅ Team Invites

### Enhanced Flow (Recommended):
1. **Personal Details** (Keep as-is)
2. **Business Details** (Enhanced):
   - Company Name ✅
   - Organization Type ✅
   - Industry ✅
   - **Organization Size** ⭐ NEW
   - Website ✅
   - **Trading Name/DBA** (Optional)
3. **Address & Contact** (New Step):
   - Registered Address ✅
   - **Mailing Address** (if different) ⭐ NEW
   - Primary Phone ✅
   - **Billing Email** ⭐ NEW
   - **Support Email** (Optional)
4. **Tax & Compliance** (Enhanced):
   - **Tax Registered?** ⭐ NEW (Yes/No)
   - **VAT/GST Registered?** ⭐ NEW (Yes/No)
   - **Country Selection** ⭐ NEW
   - **Country-Specific Tax Fields** (Conditional) ⭐ NEW
   - GSTIN (India) ✅
   - PAN (India, if tax registered) ⭐ NEW
   - VAT Number (EU/UK, if VAT registered) ⭐ NEW
   - EIN (US, if tax registered) ⭐ NEW
5. **Localization** (Keep):
   - Language ✅
   - Timezone ✅
   - Currency ✅
6. **Team Invites** (Keep as-is)

---

## PRIORITY SUMMARY

### 🟢 **Must Implement Now:**
1. `taxRegistered` (Boolean)
2. `vatGstRegistered` (Boolean)
3. `organizationSize` (Picklist)
4. `billingEmail` (Email)
5. Country-based conditional tax fields

### 🟡 **Should Implement Soon:**
1. Mailing address (if different)
2. Contact job title
3. Preferred contact method
4. Country-specific tax IDs (PAN, VAT, EIN, etc.)
5. GST Registration Date & Type (India)

### ⚪ **Can Wait:**
1. Trading Name/DBA
2. Sub-industry
3. Annual Revenue
4. Fiscal Year Start
5. Advanced compliance fields (DUNS, LEI, etc.)
6. Multiple contact methods

---

## KEY INSIGHTS

1. **Keep It Simple:** Don't overwhelm users with too many fields upfront. Use progressive disclosure.

2. **Country-First Approach:** Show country-specific fields only when relevant country is selected.

3. **Conditional Logic:** Tax/VAT fields should only appear if `taxRegistered` or `vatGstRegistered` is true.

4. **Flexible Storage:** Use JSONB for country-specific tax details to avoid schema bloat.

5. **Progressive Enhancement:** Collect essential fields during onboarding, allow users to complete profile later.

6. **Validation:** Implement country-specific validation for tax IDs (GSTIN, VAT, EIN, PAN, etc.).

7. **User Experience:** Group related fields together and use clear labels with help text.

---

## CONCLUSION

**For Zopkit's SaaS business model, focus on:**
- ✅ Essential business identification (Name, Type, Industry, Size)
- ✅ Contact & address information (for billing & support)
- ✅ Tax/VAT registration status (for billing compliance)
- ✅ Country-specific tax IDs (conditional, progressive disclosure)
- ✅ Localization settings (Language, Timezone, Currency)

**Defer to later:**
- Advanced compliance fields
- Multiple addresses (unless needed for billing)
- Detailed tax configuration (can be done in settings)
- Enterprise-specific identifiers

This approach balances **compliance needs** with **onboarding conversion rates** - critical for a SaaS platform.

