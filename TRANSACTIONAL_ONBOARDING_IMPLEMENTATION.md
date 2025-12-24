# ✅ Transactional Onboarding Implementation

## Overview
The onboarding flow has been completely refactored to wrap ALL database operations in a single transaction, ensuring atomicity - either everything succeeds or everything rolls back.

## 🔄 Transaction Flow

### Pre-Transaction Steps (External APIs)
These steps happen BEFORE the transaction because they're external API calls:
1. **Validation** - Validates form data (no DB writes)
2. **Subdomain Generation** - Generates unique subdomain (no DB writes)
3. **Authentication** - Extracts user from token (no DB writes)
4. **Kinde Integration** - Creates Kinde organization (external API)

### Transaction Steps (All Database Operations)
ALL database operations happen in a SINGLE transaction:

```javascript
await systemDbConnection.transaction(async (tx) => {
  // Step 1: Create Tenant
  // Step 2: Create Primary Organization
  // Step 3: Create Admin User
  // Step 4: Create Super Admin Role
  // Step 5: Assign Role to Admin
  // Step 6: Create Organization Membership
  // Step 7: Assign Responsible Person
  // Step 8: Create Subscription
  // Step 9: Allocate Credits (1000 credits)
  // Step 10: Configure Applications with Modules
});
```

**If ANY step fails, the entire transaction rolls back automatically.**

## 📋 Complete Transaction Steps

### Step 1: Create Tenant ✅
- Creates tenant record with ALL form data
- Stores company info, tax details, contact info, preferences
- Sets `onboardingCompleted: false` (will be set to `true` after verification)

### Step 2: Create Primary Organization ✅
- Creates root organization entity (`parentEntityId: null`)
- Sets `isDefault: true`, `isHeadquarters: true`
- Links to tenant

### Step 3: Create Admin User ✅
- Creates admin user with super admin flags
- Stores form data in user preferences
- Links to tenant and Kinde user

### Step 4: Create Super Admin Role ✅
- Creates role with plan-based permissions from `PLAN_ACCESS_MATRIX`
- Uses `createSuperAdminRoleConfig()` utility
- Links to tenant

### Step 5: Assign Role to Admin ✅
- Creates `userRoleAssignments` record
- Links admin user to super admin role

### Step 6: Create Organization Membership ✅
- Creates `organizationMemberships` record
- Sets `isPrimary: true` (marks as primary organization)
- Updates `tenantUsers.primaryOrganizationId`

### Step 7: Assign Responsible Person ✅
- Creates `responsiblePersons` record
- Sets admin as responsible person for organization
- Updates `entities.responsiblePersonId`

### Step 8: Create Subscription ✅
- Creates subscription record based on selected plan
- Free plan: Creates active subscription
- Trial/Paid: Creates trialing subscription with trial dates

### Step 9: Allocate Credits ✅
- Allocates **1000 credits** to primary organization
- Creates/updates `credits` table record
- Creates `credit_transactions` record for audit

### Step 10: Configure Applications ✅
- Reads `PLAN_ACCESS_MATRIX[selectedPlan]`
- Gets applications and modules from permission matrix
- Creates `organizationApplications` records with `enabledModules` array

## 🔄 Retry Mechanism

### Form Data Storage
If onboarding fails at ANY point, form data is automatically stored in `onboardingFormData` table:
- Stores complete form data
- Stores error information
- Stores timestamp of failure

### Endpoints for Retry

#### 1. Get Stored Form Data
```
GET /onboard-frontend/retry-data?email=user@example.com
```
- Requires authentication
- Returns stored form data if exists
- Returns 404 if no saved data found

#### 2. Retry Onboarding
```
POST /onboard-frontend/retry
Body: {
  email: "user@example.com",
  useStoredData: true,
  formData: { ... } // Optional: override stored data
}
```
- Requires authentication
- Retrieves stored form data
- Retries onboarding with stored data
- Deletes stored data after successful retry

## 🛡️ Error Handling

### Transaction Failure
If transaction fails:
1. **Automatic Rollback**: All database changes are rolled back
2. **Form Data Storage**: Form data is stored for retry (if past validation)
3. **Error Logging**: Error is logged with full details
4. **User Notification**: User receives error with `canRetry: true` flag

### Kinde Organization Cleanup
**Note**: If Kinde organization is created but DB transaction fails:
- Kinde organization remains (doesn't cause issues)
- User can retry onboarding
- On retry, existing Kinde org will be reused

## ✅ Success Flow

1. **Validation** ✅
2. **Subdomain Generation** ✅
3. **Authentication** ✅
4. **Kinde Integration** ✅
5. **Transaction** ✅ (All DB operations)
   - Tenant created
   - Organization created
   - Admin user created
   - Role created and assigned
   - Membership created
   - Responsible person assigned
   - Subscription created
   - Credits allocated
   - Applications configured
6. **Verification** ✅
7. **Mark Complete** ✅
8. **Delete Stored Data** ✅ (if exists)
9. **Track Completion** ✅

## 🔍 Verification

After transaction commits:
- Verifies all components created successfully
- Auto-fixes any missing components
- Re-verifies after fixes
- Marks onboarding as complete only after verification passes

## 📊 Benefits

### 1. Atomicity ✅
- All or nothing - no partial data
- Database consistency guaranteed
- No orphaned records

### 2. Retry Support ✅
- Form data automatically saved on failure
- User can retry without re-entering data
- Seamless retry experience

### 3. Data Integrity ✅
- No inconsistent states
- All relationships created together
- Proper foreign key constraints

### 4. Scalability ✅
- Single transaction reduces lock time
- Better performance than multiple transactions
- Easier to debug and maintain

## 🚀 Usage

### Normal Onboarding
```javascript
POST /onboard-frontend
Body: { /* form data */ }
```

### Retry Onboarding
```javascript
// 1. Get stored data
GET /onboard-frontend/retry-data?email=user@example.com

// 2. Retry with stored data
POST /onboard-frontend/retry
Body: {
  email: "user@example.com",
  useStoredData: true
}
```

## 📝 Implementation Details

### Transaction Method
**Location**: `wrapper/backend/src/features/onboarding/services/unified-onboarding-service.js`
**Method**: `createCompleteOnboardingInTransaction()`

### Form Data Storage
**Table**: `onboardingFormData`
**Schema**: `wrapper/backend/src/db/schema/onboarding-form-data.js`

### Retry Endpoints
**Location**: `wrapper/backend/src/features/onboarding/routes/core-onboarding.js`
**Endpoints**:
- `GET /onboard-frontend/retry-data`
- `POST /onboard-frontend/retry`

## ✅ Testing Checklist

- [x] Transaction wraps all DB operations
- [x] Rollback works on any failure
- [x] Form data stored on failure
- [x] Retry endpoints work correctly
- [x] Stored data deleted after success
- [x] All relationships created correctly
- [x] Credits allocated correctly
- [x] Applications configured correctly
- [x] Verification works after transaction
- [x] Error handling comprehensive

## 🎯 Result

The onboarding flow is now:
- ✅ **Atomic**: All operations in single transaction
- ✅ **Reliable**: Automatic rollback on failure
- ✅ **User-Friendly**: Automatic retry support
- ✅ **Scalable**: Efficient transaction usage
- ✅ **Maintainable**: Clear error handling






