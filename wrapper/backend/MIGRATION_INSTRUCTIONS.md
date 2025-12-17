# Database Migration Instructions

## Adding Onboarding Fields to Tenants Table

The migration script `migrations/add-onboarding-fields.js` needs to be run with database owner privileges.

### Option 1: Run with Database Owner Credentials

Update your `.env` file temporarily with database owner credentials:

```bash
# Backup current credentials
cp .env .env.backup

# Update DATABASE_URL with owner credentials
DATABASE_URL=postgresql://owner_user:owner_password@host:port/database
```

Then run:
```bash
node migrations/add-onboarding-fields.js
```

### Option 2: Run SQL Directly

Connect to your database with owner privileges and run:

```sql
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
ADD COLUMN IF NOT EXISTS tax_registration_details JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_tenants_tax_registered ON tenants(tax_registered);
CREATE INDEX IF NOT EXISTS idx_tenants_vat_gst_registered ON tenants(vat_gst_registered);
CREATE INDEX IF NOT EXISTS idx_tenants_organization_size ON tenants(organization_size);
CREATE INDEX IF NOT EXISTS idx_tenants_billing_email ON tenants(billing_email);
```

### Option 3: Use Drizzle Kit

If you're using Drizzle Kit for migrations:

```bash
# Generate migration
npx drizzle-kit generate:pg

# Push to database
npx drizzle-kit push:pg
```

## Verification

After running the migration, verify the columns were added:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tenants'
AND column_name IN (
  'tax_registered',
  'vat_gst_registered',
  'organization_size',
  'billing_email',
  'contact_job_title',
  'preferred_contact_method',
  'mailing_address_same_as_registered',
  'mailing_street',
  'mailing_city',
  'mailing_state',
  'mailing_zip',
  'mailing_country',
  'support_email',
  'contact_salutation',
  'contact_middle_name',
  'contact_department',
  'contact_direct_phone',
  'contact_mobile_phone',
  'contact_preferred_contact_method',
  'contact_authority_level',
  'tax_registration_details'
);
```

## Rollback (if needed)

If you need to rollback the migration:

```sql
ALTER TABLE tenants
DROP COLUMN IF EXISTS tax_registered,
DROP COLUMN IF EXISTS vat_gst_registered,
DROP COLUMN IF EXISTS organization_size,
DROP COLUMN IF EXISTS billing_email,
DROP COLUMN IF EXISTS contact_job_title,
DROP COLUMN IF EXISTS preferred_contact_method,
DROP COLUMN IF EXISTS mailing_address_same_as_registered,
DROP COLUMN IF EXISTS mailing_street,
DROP COLUMN IF EXISTS mailing_city,
DROP COLUMN IF EXISTS mailing_state,
DROP COLUMN IF EXISTS mailing_zip,
DROP COLUMN IF EXISTS mailing_country,
DROP COLUMN IF EXISTS support_email,
DROP COLUMN IF EXISTS contact_salutation,
DROP COLUMN IF EXISTS contact_middle_name,
DROP COLUMN IF EXISTS contact_department,
DROP COLUMN IF EXISTS contact_direct_phone,
DROP COLUMN IF EXISTS contact_mobile_phone,
DROP COLUMN IF EXISTS contact_preferred_contact_method,
DROP COLUMN IF EXISTS contact_authority_level,
DROP COLUMN IF EXISTS tax_registration_details;

DROP INDEX IF EXISTS idx_tenants_tax_registered;
DROP INDEX IF EXISTS idx_tenants_vat_gst_registered;
DROP INDEX IF EXISTS idx_tenants_organization_size;
DROP INDEX IF EXISTS idx_tenants_billing_email;
```
