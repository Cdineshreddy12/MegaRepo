# 🔄 Migration Guide: Drop Credit Allocation Tables

## Overview
This guide explains how to run migrations to drop the deprecated `credit_allocations` and `credit_allocation_transactions` tables.

## 📋 Prerequisites

1. **Database Access**: Ensure you have database access with appropriate permissions
2. **Environment Variables**: Set `DATABASE_URL` in your `.env` file
3. **Backup**: **IMPORTANT** - Backup your database before running migrations

## 🚀 Quick Start

### Option 1: Run All Migrations (Recommended)
```bash
cd wrapper/backend
npm run migrate:all
```

### Option 2: Run Individual Steps

#### Step 1: Cleanup Check (Optional)
```bash
npm run migrate:cleanup-tenant-data
```
This checks for any data that might need cleanup before migration.

#### Step 2: Drop Credit Allocation Tables
```bash
npm run migrate:drop-credit-allocation-tables
```

## 📝 Detailed Steps

### 1. Check Current State
```bash
# Check if tables exist
psql $DATABASE_URL -c "\dt credit_allocations credit_allocation_transactions"
```

### 2. Run Cleanup Check (Optional)
```bash
cd wrapper/backend
npm run migrate:cleanup-tenant-data
```

**Output Example:**
```
🧹 Cleaning up tenant data for migration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Current Data Status:
   credit_allocation_transactions: 0 records
   credit_allocations: 0 records

🔍 Checking for foreign key references...
✅ No foreign key references found

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Cleanup Summary:
   • No data cleanup needed - tables will be dropped with CASCADE
   • Foreign key references will be automatically removed
   • Safe to proceed with migration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 3. Run Migration
```bash
npm run migrate:drop-credit-allocation-tables
```

**Output Example:**
```
🚀 Starting Credit Allocation Tables Migration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Checking if credit allocation tables exist...

📊 Table Status:
   credit_allocations: ✅ EXISTS
   credit_allocation_transactions: ✅ EXISTS

🔍 Checking for foreign key dependencies...
✅ No foreign key dependencies found

📄 Read migration file: src/db/migrations/drop_credit_allocation_tables.sql

🔄 Executing migration...

   [1/2] Executing: DROP TABLE IF EXISTS "credit_allocation_transactions" CASCADE...
   ✅ Statement 1 executed successfully

   [2/2] Executing: DROP TABLE IF EXISTS "credit_allocations" CASCADE...
   ✅ Statement 2 executed successfully

🔍 Verifying migration...

✅ Migration completed successfully!
   ✓ credit_allocations table dropped
   ✓ credit_allocation_transactions table dropped

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Migration Summary:
   • Removed credit_allocation_transactions table
   • Removed credit_allocations table
   • Applications now manage their own credit consumption
   • Wrapper maintains only credits and credit_transactions tables
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4. Verify Migration
```bash
# Verify tables are dropped
psql $DATABASE_URL -c "\dt credit_allocations credit_allocation_transactions"
```

Expected output: Tables should not exist.

## 🔧 Manual SQL Execution

If you prefer to run SQL directly:

```sql
-- Connect to your database
psql $DATABASE_URL

-- Drop tables
DROP TABLE IF EXISTS "credit_allocation_transactions" CASCADE;
DROP TABLE IF EXISTS "credit_allocations" CASCADE;

-- Verify
\dt credit_allocations credit_allocation_transactions
```

## 📊 What Gets Dropped

### Tables Removed:
1. **credit_allocation_transactions** - Transaction history for application-specific credit allocations
2. **credit_allocations** - Application-specific credit allocation records

### What Remains:
- ✅ **credits** - Core credit balance table (organization-level)
- ✅ **credit_transactions** - Core transaction ledger (organization-level)
- ✅ **credit_purchases** - Purchase records
- ✅ **credit_usage** - Usage tracking
- ✅ **credit_configurations** - Configuration settings

## ⚠️ Important Notes

### Before Migration:
1. **Backup Database**: Always backup before running migrations
2. **Check Dependencies**: Ensure no application code references these tables
3. **Test Environment**: Run in test environment first

### After Migration:
1. **Verify Application Code**: Ensure no code references dropped tables
2. **Test Onboarding**: Test the onboarding flow to ensure it works
3. **Monitor Logs**: Check application logs for any errors

### Rollback:
If you need to rollback, you'll need to recreate the tables. However, **data cannot be recovered** once tables are dropped.

## 🐛 Troubleshooting

### Error: "Table does not exist"
**Solution**: This is expected if tables were already dropped. Migration uses `IF EXISTS` so it's safe.

### Error: "Permission denied"
**Solution**: Ensure your database user has DROP TABLE permissions.

### Error: "Foreign key constraint violation"
**Solution**: Migration uses `CASCADE` which should handle this automatically. If issues persist, check for custom constraints.

### Error: "DATABASE_URL not found"
**Solution**: Ensure `.env` file exists and contains `DATABASE_URL`.

## 📚 Related Scripts

### Available NPM Scripts:
- `npm run migrate:drop-credit-allocation-tables` - Drop credit allocation tables
- `npm run migrate:cleanup-tenant-data` - Check cleanup status
- `npm run migrate:all` - Run all migrations

### Script Locations:
- `src/scripts/run-credit-allocation-migration.js` - Main migration script
- `src/scripts/cleanup-tenant-data-for-migration.js` - Cleanup check script
- `src/scripts/run-all-migrations.sh` - All migrations runner
- `src/db/migrations/drop_credit_allocation_tables.sql` - SQL migration file

## ✅ Verification Checklist

After running migration, verify:

- [ ] Tables `credit_allocations` and `credit_allocation_transactions` are dropped
- [ ] No foreign key errors in application logs
- [ ] Onboarding flow works correctly
- [ ] Credit allocation works at organization level
- [ ] No references to dropped tables in code

## 🎯 Next Steps

After successful migration:

1. **Code Cleanup**: Remove any references to `creditAllocations` or `creditAllocationTransactions` from code
2. **Update Documentation**: Update any documentation referencing these tables
3. **Monitor**: Monitor application logs for any issues
4. **Test**: Thoroughly test credit-related functionality

## 📞 Support

If you encounter issues:
1. Check application logs
2. Verify database permissions
3. Ensure `DATABASE_URL` is correct
4. Review migration output for errors

---

**Last Updated**: 2024
**Migration Version**: 1.0.0






