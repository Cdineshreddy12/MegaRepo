# Onboarding Fields Analysis

## Overview
This document provides a comprehensive analysis of:
1. **Database Fields** - Fields present in the `tenants` table
2. **Frontend Fields** - Fields present in the onboarding form
3. **Mandatory Fields** - Fields that are required (database constraints + frontend validation)
4. **Field Mapping** - How frontend fields map to database fields

---

## 1. Database Schema Fields (tenants table)

### Mandatory Fields (`.notNull()`)
| Database Field | Type | Description |
|---------------|------|-------------|
| `tenant_id` | uuid | Primary key (auto-generated) |
| `company_name` | varchar(255) | **REQUIRED** - Company name |
| `subdomain` | varchar(100) | **REQUIRED** - Unique subdomain |
| `kinde_org_id` | varchar(255) | **REQUIRED** - Kinde organization ID |
| `admin_email` | varchar(255) | **REQUIRED** - Admin email address |

### Optional Fields (with defaults)
| Database Field | Type | Default | Description |
|---------------|------|---------|-------------|
| `tax_registered` | boolean | false | Tax registration status |
| `vat_gst_registered` | boolean | false | VAT/GST registration status |
| `mailing_address_same_as_registered` | boolean | true | Mailing address same as registered |
| `is_active` | boolean | true | Tenant active status |
| `is_verified` | boolean | false | Verification status |
| `onboarding_completed` | boolean | false | Onboarding completion status |
| `default_language` | varchar(10) | 'en' | Default language |
| `default_locale` | varchar(20) | 'en-US' | Default locale |
| `default_currency` | varchar(3) | 'USD' | Default currency |
| `default_timezone` | varchar(50) | 'UTC' | Default timezone |
| `primary_color` | varchar(7) | '#2563eb' | Primary brand color |
| `tax_registration_details` | jsonb | '{}' | Tax registration details (JSON) |
| `settings` | jsonb | '{}' | Tenant settings (JSON) |
| `branding_config` | jsonb | '{}' | Branding configuration (JSON) |

### Optional Fields (nullable)
| Database Field | Type | Description |
|---------------|------|-------------|
| `legal_company_name` | varchar(255) | Legal company name |
| `gstin` | varchar(15) | GST Identification Number (India) |
| `company_type` | varchar(100) | Company type (Private Limited, LLP, etc.) |
| `industry` | varchar(100) | Industry classification |
| `website` | varchar(500) | Company website URL |
| `organization_size` | varchar(50) | Organization size (1-10, 11-50, etc.) |
| `billing_email` | varchar(255) | Billing email address |
| `contact_job_title` | varchar(150) | Contact person's job title |
| `preferred_contact_method` | varchar(20) | Preferred contact method |
| `mailing_street` | varchar(255) | Mailing street address |
| `mailing_city` | varchar(100) | Mailing city |
| `mailing_state` | varchar(100) | Mailing state |
| `mailing_zip` | varchar(20) | Mailing ZIP code |
| `mailing_country` | varchar(100) | Mailing country |
| `support_email` | varchar(255) | Support email address |
| `contact_salutation` | varchar(20) | Contact salutation (Mr./Mrs./Ms.) |
| `contact_middle_name` | varchar(100) | Contact middle name |
| `contact_department` | varchar(100) | Contact department |
| `contact_direct_phone` | varchar(50) | Contact direct phone |
| `contact_mobile_phone` | varchar(50) | Contact mobile phone |
| `contact_preferred_contact_method` | varchar(20) | Contact's preferred method |
| `contact_authority_level` | varchar(50) | Contact authority level |
| `billing_street` | varchar(255) | Billing street address |
| `billing_city` | varchar(100) | Billing city |
| `billing_state` | varchar(100) | Billing state |
| `billing_zip` | varchar(20) | Billing ZIP code |
| `billing_country` | varchar(100) | Billing country |
| `phone` | varchar(50) | Phone number |
| `logo_url` | varchar(500) | Logo URL |
| `custom_domain` | varchar(255) | Custom domain |
| `stripe_customer_id` | varchar(255) | Stripe customer ID |
| `onboarded_at` | timestamp | Onboarding completion timestamp |
| `onboarding_started_at` | timestamp | Onboarding start timestamp |
| `trial_ends_at` | timestamp | Trial end timestamp |
| `trial_started_at` | timestamp | Trial start timestamp |
| `first_login_at` | timestamp | First login timestamp |
| `last_activity_at` | timestamp | Last activity timestamp |

---

## 2. Frontend Form Fields

### Step 1: Business Details
| Frontend Field | Type | Mandatory | Maps to DB Field |
|---------------|------|-----------|------------------|
| `companyType` | select | ✅ Yes | `company_type` |
| `businessDetails.companyName` | text | ✅ Yes | `company_name` |
| `businessDetails.businessType` | select | ✅ Yes | `industry` or `business_type` |
| `businessDetails.country` | select | ✅ Yes | `billing_country` |
| `businessDetails.organizationSize` | select | ❌ Optional | `organization_size` |
| `industry` | select | ❌ Optional | `industry` |
| `businessDetails.description` | textarea | ❌ Optional | (stored in `initialSetupData` JSONB) |
| `website` | url | ❌ Optional | `website` |

### Step 2: Tax & Compliance / Address
| Frontend Field | Type | Mandatory | Maps to DB Field |
|---------------|------|-----------|------------------|
| `billingStreet` | text | ✅ Yes | `billing_street` |
| `billingCity` | text | ✅ Yes | `billing_city` |
| `billingZip` | text | ✅ Yes | `billing_zip` |
| `billingState` | text | ❌ Optional | `billing_state` |
| `billingCountry` | select | ❌ Optional | `billing_country` |
| `gstin` | text | ❌ Optional | `gstin` |
| `panNumber` | text | ❌ Optional | `tax_registration_details.pan` |
| `vatNumber` | text | ❌ Optional | `tax_registration_details.vat` |
| `einNumber` | text | ❌ Optional | `tax_registration_details.ein` |
| `cinNumber` | text | ❌ Optional | `tax_registration_details.cin` |
| `taxRegistered` | boolean | ❌ Optional | `tax_registered` |
| `vatGstRegistered` | boolean | ❌ Optional | `vat_gst_registered` |

### Step 3: Admin Details
| Frontend Field | Type | Mandatory | Maps to DB Field |
|---------------|------|-----------|------------------|
| `firstName` | text | ✅ Yes | (stored in `tenant_users.first_name`) |
| `lastName` | text | ✅ Yes | (stored in `tenant_users.last_name`) |
| `adminEmail` | email | ✅ Yes | `admin_email` |
| `adminMobile` | phone | ❌ Optional | `phone` or `contact_mobile_phone` |
| `contactJobTitle` | text | ❌ Optional | `contact_job_title` |
| `website` | url | ❌ Optional | `website` |
| `contactDepartment` | text | ❌ Optional | `contact_department` |
| `contactAuthorityLevel` | select | ❌ Optional | `contact_authority_level` |

### Step 4: Team Setup
| Frontend Field | Type | Mandatory | Maps to DB Field |
|---------------|------|-----------|------------------|
| `teamMembers` | array | ❌ Optional | (stored separately in `tenant_users` table) |

### Step 5: Review & Terms
| Frontend Field | Type | Mandatory | Maps to DB Field |
|---------------|------|-----------|------------------|
| `termsAccepted` | boolean | ✅ Yes | (validated but not stored in DB) |

### Additional Frontend Fields (not in steps)
| Frontend Field | Type | Mandatory | Maps to DB Field |
|---------------|------|-----------|------------------|
| `mailingAddressSameAsRegistered` | boolean | ❌ Optional | `mailing_address_same_as_registered` |
| `mailingStreet` | text | ❌ Optional | `mailing_street` |
| `mailingCity` | text | ❌ Optional | `mailing_city` |
| `mailingState` | text | ❌ Optional | `mailing_state` |
| `mailingZip` | text | ❌ Optional | `mailing_zip` |
| `mailingCountry` | text | ❌ Optional | `mailing_country` |
| `billingEmail` | email | ❌ Optional | `billing_email` |
| `supportEmail` | email | ❌ Optional | `support_email` |
| `contactSalutation` | select | ❌ Optional | `contact_salutation` |
| `contactMiddleName` | text | ❌ Optional | `contact_middle_name` |
| `contactDirectPhone` | phone | ❌ Optional | `contact_direct_phone` |
| `contactMobilePhone` | phone | ❌ Optional | `contact_mobile_phone` |
| `contactPreferredContactMethod` | select | ❌ Optional | `contact_preferred_contact_method` |
| `defaultLanguage` | select | ❌ Optional | `default_language` |
| `defaultLocale` | select | ❌ Optional | `default_locale` |
| `defaultCurrency` | select | ❌ Optional | `default_currency` |
| `defaultTimeZone` | select | ❌ Optional | `default_timezone` |

---

## 3. Mandatory Fields Summary

### Database Level (`.notNull()`)
1. ✅ `company_name` - Company name
2. ✅ `subdomain` - Unique subdomain (auto-generated)
3. ✅ `kinde_org_id` - Kinde organization ID (auto-generated)
4. ✅ `admin_email` - Admin email address

### Frontend Validation Level (Required in Form)
**Step 1: Business Details**
1. ✅ `companyType` → `company_type`
2. ✅ `businessDetails.companyName` → `company_name`
3. ✅ `businessDetails.businessType` → `industry`/`business_type`
4. ✅ `businessDetails.country` → `billing_country`

**Step 2: Tax & Compliance**
1. ✅ `billingStreet` → `billing_street`
2. ✅ `billingCity` → `billing_city`
3. ✅ `billingZip` → `billing_zip`

**Step 3: Admin Details**
1. ✅ `firstName` → `tenant_users.first_name`
2. ✅ `lastName` → `tenant_users.last_name`
3. ✅ `adminEmail` → `admin_email`

**Step 5: Review**
1. ✅ `termsAccepted` → (validated only, not stored)

---

## 4. Field Mapping Issues & Gaps

### Fields in Frontend but NOT in Database
| Frontend Field | Status | Recommendation |
|---------------|--------|----------------|
| `businessDetails.description` | ❌ Not stored | Store in `initialSetupData` JSONB or add `description` column |
| `state` | ⚠️ Partial | Maps to `billing_state` or `incorporation_state` (not in DB) |
| `incorporationState` | ❌ Not stored | Add `incorporation_state` column if needed |

### Fields in Database but NOT in Frontend Form
| Database Field | Status | Recommendation |
|---------------|--------|----------------|
| `legal_company_name` | ⚠️ Not collected | Consider adding if different from `company_name` |
| `logo_url` | ⚠️ Not collected | Add logo upload in branding step |
| `custom_domain` | ⚠️ Not collected | Add custom domain option |
| `primary_color` | ⚠️ Not collected | Add branding customization |
| `branding_config` | ⚠️ Not collected | Add branding step |

### Mapping Inconsistencies
1. **Business Type vs Industry**: Frontend has both `businessDetails.businessType` and `industry`, but database only has `industry`. Need to clarify which one to use.
2. **Country Field**: Frontend uses `businessDetails.country` but database uses `billing_country`. Should be consistent.
3. **Tax IDs**: Frontend has separate fields (`panNumber`, `vatNumber`, `einNumber`, `cinNumber`) but database stores them in `tax_registration_details` JSONB. This is correct but needs proper mapping.
4. **Name Fields**: `firstName` and `lastName` are stored in `tenant_users` table, not `tenants` table. This is correct but needs to be documented.

---

## 5. Recommendations

### High Priority
1. ✅ **Add `description` field to database** or store in `initialSetupData` JSONB
2. ✅ **Clarify `businessType` vs `industry`** - decide which field to use
3. ✅ **Standardize country field** - use consistent naming (`country` vs `billing_country`)
4. ✅ **Document `tenant_users` mapping** - firstName/lastName are stored in users table

### Medium Priority
1. ⚠️ **Add `incorporation_state` field** if needed for legal compliance
2. ⚠️ **Consider adding `legal_company_name`** if different from display name
3. ⚠️ **Add branding fields** (logo, colors) in a separate step

### Low Priority
1. 💡 **Add custom domain option** for enterprise plans
2. 💡 **Add more contact detail fields** if needed for compliance

---

## 6. Current Submission Flow

### Frontend → Backend Mapping (`OnboardingForm.tsx`)
```javascript
{
  companyName: businessDetails.companyName || businessName,
  businessType: businessDetails.businessType,
  organizationSize: businessDetails.organizationSize,
  country: businessDetails.country,
  companyType: companyType,
  // ... tax fields
  billingStreet, billingCity, billingZip,
  // ... admin fields
  firstName, lastName, adminEmail,
  // ... localization
  defaultLanguage, defaultLocale, defaultCurrency, defaultTimeZone,
  termsAccepted
}
```

### Backend → Database Mapping (`unified-onboarding-service.js`)
```javascript
{
  company_name: companyName,
  admin_email: adminEmail,
  company_type: companyType,
  industry: businessType, // ⚠️ Note: businessType mapped to industry
  organization_size: organizationSize,
  billing_country: country,
  billing_street: billingStreet,
  billing_city: billingCity,
  billing_zip: billingZip,
  // ... tax fields stored in tax_registration_details JSONB
  // ... localization fields
  default_language: defaultLanguage,
  default_locale: defaultLocale,
  default_currency: defaultCurrency,
  default_timezone: defaultTimeZone
}
```

---

## 7. AI Chatbot Field Configuration

### Current AI Configuration (Step-based)
**Step 1 Mandatory:**
- `companyType`
- `businessDetails.companyName`
- `businessDetails.businessType`
- `businessDetails.country`

**Step 2 Mandatory:**
- `billingStreet`
- `billingCity`
- `billingZip`

**Step 3 Mandatory:**
- `firstName`
- `lastName`
- `adminEmail`

**Step 5 Mandatory:**
- `termsAccepted`

### Recommendation
✅ Current configuration matches frontend validation requirements. All mandatory fields are correctly identified.

---

## Summary

- **Database Mandatory Fields**: 4 (company_name, subdomain, kinde_org_id, admin_email)
- **Frontend Mandatory Fields**: 11 (4 in Step 1, 3 in Step 2, 3 in Step 3, 1 in Step 5)
- **Total Database Fields**: ~50+ fields
- **Total Frontend Fields**: ~40+ fields
- **Mapping Issues**: 4 minor inconsistencies to resolve
- **Missing Fields**: 1 (description) needs storage solution

**Overall Status**: ✅ Good alignment between frontend and database, with minor mapping clarifications needed.

