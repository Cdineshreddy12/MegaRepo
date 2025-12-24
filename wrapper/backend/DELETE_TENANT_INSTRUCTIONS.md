# 🗑️ Delete Tenant Data Instructions

## Quick Delete

To delete tenant data for `ecf5d0b2-fd18-498a-9c35-d7ba1efda236`:

### Option 1: Using NPM Script (Recommended)
```bash
cd wrapper/backend
npm run delete-tenant ecf5d0b2-fd18-498a-9c35-d7ba1efda236
```

### Option 2: Direct Node Command
```bash
cd wrapper/backend
node src/scripts/delete-tenant-data.js ecf5d0b2-fd18-498a-9c35-d7ba1efda236
```

### Option 3: With Full Path
```bash
node wrapper/backend/src/scripts/delete-tenant-data.js ecf5d0b2-fd18-498a-9c35-d7ba1efda236
```

## ⚠️ Important Warnings

1. **IRREVERSIBLE**: This operation cannot be undone
2. **Backup First**: Always backup your database before deleting tenant data
3. **Test Environment**: Test in a development environment first
4. **Verify Tenant ID**: Double-check the tenant ID before running

## 📋 What Gets Deleted

The script deletes ALL data associated with the tenant in the correct order:

### Core Tables:
- ✅ Tenant record
- ✅ Tenant users
- ✅ Custom roles
- ✅ User role assignments
- ✅ Subscriptions
- ✅ Payments

### Entities & Memberships:
- ✅ Organizations/Locations (entities)
- ✅ Organization memberships
- ✅ Membership invitations
- ✅ Membership history

### Credits:
- ✅ Credit balances
- ✅ Credit transactions
- ✅ Credit purchases
- ✅ Credit usage records
- ✅ Credit configurations

### Responsible Persons:
- ✅ Responsible person assignments
- ✅ Responsibility history
- ✅ Responsibility notifications

### Other Data:
- ✅ Tenant invitations
- ✅ Usage metrics
- ✅ Audit logs
- ✅ Notifications
- ✅ Event tracking
- ✅ User sessions
- ✅ Organization applications
- ✅ User application permissions
- ✅ Webhook logs

## 🔍 Verification Before Deletion

### Check Tenant Exists:
```bash
# Using psql
psql $DATABASE_URL -c "SELECT tenant_id, company_name FROM tenants WHERE tenant_id = 'ecf5d0b2-fd18-498a-9c35-d7ba1efda236';"
```

### Check Related Data:
```bash
# Count related records
psql $DATABASE_URL -c "
SELECT 
  (SELECT COUNT(*) FROM tenant_users WHERE tenant_id = 'ecf5d0b2-fd18-498a-9c35-d7ba1efda236') as users,
  (SELECT COUNT(*) FROM entities WHERE tenant_id = 'ecf5d0b2-fd18-498a-9c35-d7ba1efda236') as entities,
  (SELECT COUNT(*) FROM credits WHERE tenant_id = 'ecf5d0b2-fd18-498a-9c35-d7ba1efda236') as credits;
"
```

## 📊 Script Output

The script will show:
- ✅ Tenant verification
- ✅ Deletion progress for each table
- ✅ Record counts deleted
- ✅ Success/failure status
- ✅ Total deletion summary

## 🔄 Transaction Safety

The script uses a database transaction, so:
- ✅ **All or Nothing**: Either all data is deleted or nothing is deleted
- ✅ **Rollback on Error**: If any step fails, everything rolls back
- ✅ **Atomic Operation**: No partial deletions

## 🐛 Troubleshooting

### Error: "Tenant not found"
**Solution**: Verify the tenant ID is correct:
```bash
psql $DATABASE_URL -c "SELECT tenant_id, company_name FROM tenants WHERE tenant_id = 'ecf5d0b2-fd18-498a-9c35-d7ba1efda236';"
```

### Error: "Permission denied"
**Solution**: Ensure your database user has DELETE permissions on all tables.

### Error: "Foreign key constraint violation"
**Solution**: The script handles foreign keys in the correct order. If this occurs, check for custom constraints.

### Error: "DATABASE_URL not found"
**Solution**: Ensure `.env` file exists and contains `DATABASE_URL`.

## ✅ Post-Deletion Verification

After deletion, verify:

```sql
-- Check tenant is deleted
SELECT COUNT(*) FROM tenants WHERE tenant_id = 'ecf5d0b2-fd18-498a-9c35-d7ba1efda236';
-- Expected: 0

-- Check all related data is deleted
SELECT 
  (SELECT COUNT(*) FROM tenant_users WHERE tenant_id = 'ecf5d0b2-fd18-498a-9c35-d7ba1efda236') as users,
  (SELECT COUNT(*) FROM entities WHERE tenant_id = 'ecf5d0b2-fd18-498a-9c35-d7ba1efda236') as entities,
  (SELECT COUNT(*) FROM credits WHERE tenant_id = 'ecf5d0b2-fd18-498a-9c35-d7ba1efda236') as credits;
-- Expected: All should be 0
```

## 📝 Example Output

```
🗑️  Starting comprehensive deletion for tenant: ecf5d0b2-fd18-498a-9c35-d7ba1efda236

✅ Found tenant: Example Company
📋 Starting deletion process...

🗑️  Deleting webhook logs... ✅ Deleted 0 records
🗑️  Deleting user application permissions... ✅ Deleted 5 records
🗑️  Deleting organization applications... ✅ Deleted 3 records
...
✅ Deletion completed successfully!

📊 Deletion Summary:
   • Total records deleted: 1,234
   • Tables processed: 25
   • Duration: 2.3s
```

## 🚀 Quick Command for Your Tenant

```bash
cd wrapper/backend && npm run delete-tenant ecf5d0b2-fd18-498a-9c35-d7ba1efda236
```

---

**⚠️ Remember**: This is **IRREVERSIBLE**. Always backup first!






