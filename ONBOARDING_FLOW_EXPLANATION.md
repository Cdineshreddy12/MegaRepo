# Onboarding Flow Explanation

This document explains exactly how three critical processes work during onboarding:
1. Credit Transactions
2. Organization Applications Assignment
3. Responsible Person Assignment

---

## 1. 💰 Credit Transactions During Onboarding

### Flow Overview

**Step 7 in onboarding workflow** (`unified-onboarding-service.js` lines 270-282):

```javascript
// 7. ALLOCATE CREDITS (REQUIRED - onboarding fails if this fails)
const creditResult = await this.allocateTrialCredits({
  tenantId: dbResult.tenant.tenantId,
  organizationId: dbResult.organization.organizationId,
  selectedPlan
});
```

### Detailed Process

#### Step 1: Get Plan Credits
**Location**: `allocateTrialCredits()` method (lines 1013-1045)

```javascript
// Get plan-based credit amount from permission matrix
const { PermissionMatrixUtils } = await import('../../../data/permission-matrix.js');
const planCredits = PermissionMatrixUtils.getPlanCredits(selectedPlan);
const actualCreditAmount = planCredits.free || 1000; // Free plan = 1000 credits
```

**Example**: Free plan gets 1000 credits (from `permission-matrix.js` line 819)

#### Step 2: Call CreditService.addCreditsToEntity()
**Location**: `credit-service.js` lines 1490-1632

**Process**:
1. **Normalize Entity**: Uses `organizationId` (from entities table)
2. **Set RLS Context**: Sets tenant_id, user_id, is_admin on SQL connection
3. **Check Existing Credits**: Queries `credits` table for existing record
4. **Update or Create Credit Record**:
   - If exists: Updates `available_credits` by adding amount
   - If not: Creates new record with initial balance
5. **Create Transaction Record**: Inserts into `credit_transactions` table

**SQL Operations**:

```sql
-- 1. Check existing credits
SELECT * FROM credits
WHERE tenant_id = ? AND entity_id = ?
LIMIT 1

-- 2a. Update existing (if found)
UPDATE credits
SET available_credits = available_credits + ?
WHERE credit_id = ?

-- 2b. Create new (if not found)
INSERT INTO credits (tenant_id, entity_id, available_credits, is_active)
VALUES (?, ?, ?, true)

-- 3. Create transaction record
INSERT INTO credit_transactions (
  tenant_id, entity_id, transaction_type, amount,
  previous_balance, new_balance, operation_code, initiated_by
) VALUES (?, ?, 'purchase', ?, ?, ?, 'onboarding', NULL)
```

**Transaction Record Fields**:
- `transaction_type`: 'purchase'
- `amount`: 1000 (for free plan)
- `previous_balance`: 0 (if new) or existing balance
- `new_balance`: previousBalance + 1000
- `operation_code`: 'onboarding'
- `initiated_by`: NULL (system)

#### Step 3: Publish Events to Redis Streams
**Location**: `credit-service.js` lines 1594-1626

Publishes credit allocation events to CRM sync streams for synchronization.

### Result

**After onboarding**:
- ✅ 1 record in `credits` table: `available_credits = 1000`
- ✅ 1 record in `credit_transactions` table: `amount = 1000`, `transaction_type = 'purchase'`
- ✅ No application-specific credit allocations (removed to fix 166 credits issue)

---

## 2. 📱 Organization Applications Assignment

### Flow Overview

**Step 9 in onboarding workflow** (`unified-onboarding-service.js` lines 292-299):

```javascript
// 9. CONFIGURE APPLICATIONS FOR THE ORGANIZATION WITH MODULES FROM PERMISSION MATRIX
const appConfigResult = await OnboardingOrganizationSetupService.configureApplicationsForNewOrganization(
  dbResult.tenant.tenantId, 
  selectedPlan,
  dbResult.organization.organizationId
);
```

### Detailed Process

#### Step 1: Get Plan Configuration from Permission Matrix
**Location**: `onboarding-organization-setup.js` lines 79-89

```javascript
// Import permission matrix
const { PLAN_ACCESS_MATRIX } = await import('../../../data/permission-matrix.js');
const planAccess = PLAN_ACCESS_MATRIX[creditPackage]; // e.g., 'free'

// Extract applications and modules
const appCodes = planAccess.applications || []; // ['crm'] for free plan
const modulesByApp = planAccess.modules || {};  // { crm: ['leads', 'contacts', 'dashboard'] }
```

**Example for Free Plan** (`permission-matrix.js` lines 806-823):
```javascript
free: {
  applications: ['crm'],
  modules: {
    crm: ['leads', 'contacts', 'dashboard']
  }
}
```

#### Step 2: Get Application IDs from Database
**Location**: `onboarding-organization-setup.js` lines 107-116

```javascript
// Query applications table to get appId for each appCode
const appRecords = await systemDbConnection
  .select({ appId: applications.appId, appCode: applications.appCode })
  .from(applications)
  .where(eq(applications.status, 'active'));

// Create mapping: appCode -> appId
const appCodeToIdMap = {};
appRecords.forEach(app => {
  appCodeToIdMap[app.appCode] = app.appId;
});
```

#### Step 3: Process Each Application
**Location**: `onboarding-organization-setup.js` lines 123-159

For each application in the plan:

1. **Normalize App Code**: Handle case variations (e.g., 'affiliateConnect' vs 'affiliate')
2. **Get Enabled Modules**: From permission matrix
   - If `modules[appCode] === '*'`: Fetch all modules from `application_modules` table
   - Otherwise: Use array from permission matrix
3. **Calculate Expiry Date**: 1 year for free plan, 2 years for enterprise
4. **Prepare Insert Data**:

```javascript
{
  id: uuidv4(),
  tenantId: tenantId,
  appId: appId, // From applications table
  subscriptionTier: creditPackage, // 'free'
  isEnabled: true,
  enabledModules: ['leads', 'contacts', 'dashboard'], // From permission matrix
  customPermissions: {},
  expiresAt: expiryDate
}
```

#### Step 4: Insert into organization_applications Table
**Location**: `onboarding-organization-setup.js` lines 161-164

```javascript
await systemDbConnection
  .insert(organizationApplications)
  .values(applicationsToInsert);
```

**SQL Equivalent**:
```sql
INSERT INTO organization_applications (
  id, tenant_id, app_id, subscription_tier, 
  is_enabled, enabled_modules, custom_permissions, expires_at
) VALUES 
  (?, ?, ?, 'free', true, '["leads","contacts","dashboard"]', '{}', ?)
```

### Result

**After onboarding**:
- ✅ Records in `organization_applications` table:
  - `tenant_id`: Tenant ID
  - `app_id`: Application ID (e.g., CRM app ID)
  - `subscription_tier`: 'free'
  - `is_enabled`: true
  - `enabled_modules`: `['leads', 'contacts', 'dashboard']` (from permission matrix)
  - `expires_at`: 1 year from now

**Example for Free Plan**:
- 1 application (CRM)
- 3 enabled modules: leads, contacts, dashboard

---

## 3. 👤 Responsible Person Assignment

### Flow Overview

**Step 8 in database creation** (`unified-onboarding-service.js` lines 948-980):

```javascript
// 8. Assign admin as responsible person for the organization
const [responsiblePerson] = await tx
  .insert(responsiblePersons)
  .values({...})
  .returning();

// 9. Update organization entity with responsible person reference
await tx
  .update(entities)
  .set({
    responsiblePersonId: adminUser.userId
  })
  .where(eq(entities.entityId, organization.organizationId));
```

### Detailed Process

#### Step 1: Create Responsible Person Assignment
**Location**: `unified-onboarding-service.js` lines 948-980

**Process**:
1. **Insert into responsible_persons table**:
   - `tenantId`: Tenant ID
   - `entityType`: 'organization'
   - `entityId`: Organization ID (from entities table)
   - `userId`: Admin user ID
   - `responsibilityLevel`: 'primary'
   - `scope`: Full permissions (creditManagement, userManagement, auditAccess, etc.)
   - `autoPermissions`: All permissions enabled
   - `notificationPreferences`: All notifications enabled
   - `assignedBy`: Admin user ID (self-assigned)
   - `assignmentReason`: 'Initial assignment during onboarding - admin user is responsible for primary organization'
   - `isActive`: true
   - `isConfirmed`: true (auto-confirmed during onboarding)
   - `canDelegate`: true (can delegate responsibilities)

**SQL Operation**:
```sql
INSERT INTO responsible_persons (
  tenant_id, entity_type, entity_id, user_id,
  responsibility_level, scope, auto_permissions,
  notification_preferences, assigned_by, assigned_at,
  assignment_reason, is_active, is_confirmed, confirmed_at,
  can_delegate
) VALUES (
  ?, 'organization', ?, ?,
  'primary', 
  '{"creditManagement":true,"userManagement":true,"auditAccess":true,"configurationManagement":true,"reportingAccess":true}',
  '{"canApproveTransfers":true,"canPurchaseCredits":true,"canManageUsers":true,"canViewAllAuditLogs":true,"canConfigureEntity":true,"canGenerateReports":true}',
  '{"creditAlerts":true,"userActivities":true,"systemAlerts":true,"weeklyReports":true,"monthlyReports":true}',
  ?, NOW(),
  'Initial assignment during onboarding - admin user is responsible for primary organization',
  true, true, NOW(),
  true
)
```

#### Step 2: Update Organization Entity
**Location**: `unified-onboarding-service.js` lines 975-980

Updates the `entities` table to reference the responsible person:

```sql
UPDATE entities
SET responsible_person_id = ?
WHERE entity_id = ?
```

This allows quick lookup of the responsible person directly from the organization entity.

### Result

**After onboarding**:
- ✅ 1 record in `responsible_persons` table:
  - Admin user assigned as primary responsible person
  - Full scope and permissions enabled
  - Auto-confirmed and active
- ✅ `entities.responsiblePersonId` updated with admin user ID
- ✅ Organization can quickly identify its responsible person

### Permissions Granted

The admin user gets these responsibilities:

**Scope**:
- ✅ Credit Management
- ✅ User Management
- ✅ Audit Access
- ✅ Configuration Management
- ✅ Reporting Access

**Auto Permissions**:
- ✅ Can approve transfers
- ✅ Can purchase credits
- ✅ Can manage users
- ✅ Can view all audit logs
- ✅ Can configure entity
- ✅ Can generate reports

**Notifications**:
- ✅ Credit alerts
- ✅ User activities
- ✅ System alerts
- ✅ Weekly reports
- ✅ Monthly reports

---

## Summary Table

| Process | Step | Table(s) | Records Created | Status |
|---------|------|----------|----------------|--------|
| **Credit Transactions** | Step 7 | `credits`, `credit_transactions` | 1 credit record, 1 transaction | ✅ Working |
| **Application Assignment** | Step 9 | `organization_applications` | 1+ records (based on plan) | ✅ Working |
| **Responsible Person** | Step 8 | `responsible_persons`, `entities` | 1 assignment record, entity updated | ✅ Implemented |

---

## Summary

All three processes are now fully implemented:

1. ✅ **Credit Transactions**: Working correctly - creates 1 credit record and 1 transaction (1000 credits for free plan)
2. ✅ **Application Assignment**: Working correctly - assigns applications with enabled modules from permission matrix
3. ✅ **Responsible Person**: **NOW IMPLEMENTED** - Admin user is assigned as primary responsible person with full permissions

