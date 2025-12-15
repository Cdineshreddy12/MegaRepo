# Onboarding Dependency Analysis - `/onboard-frontend` Endpoint

## 📋 Complete Dependency Chain

### **Entry Point:**
```
POST /onboarding/onboard-frontend
└── backend/src/routes/onboarding/core-onboarding.js (line 108)
```

### **Direct Dependencies:**

#### **1. Route Handler (`core-onboarding.js`)**
- **File:** `backend/src/routes/onboarding/core-onboarding.js`
- **Uses:** `UnifiedOnboardingService.completeOnboardingWorkflow()`
- **Status:** ✅ ACTIVE - Required

#### **2. Main Service (`unified-onboarding-service.js`)**
- **File:** `backend/src/services/unified-onboarding-service.js`
- **Methods Used:**
  - `completeOnboardingWorkflow()` - Main workflow
  - `extractAndValidateAuthentication()` - Auth extraction
  - `setupKindeIntegration()` - Kinde setup
  - `createDatabaseRecords()` - DB operations
  - `createTrialSubscription()` - Subscription creation
  - `allocateTrialCredits()` - Credit allocation
  - `configureSubdomainSystem()` - Subdomain config
  - `trackOnboardingCompletion()` - Tracking
- **Status:** ✅ ACTIVE - Required

### **Service Dependencies (from unified-onboarding-service.js):**

#### **3. Validation Service**
- **File:** `backend/src/services/onboarding-validation-service.js`
- **Methods Used:**
  - `validateCompleteOnboarding()` - Validates input data
  - `generateUniqueSubdomain()` - Generates subdomain
- **Status:** ✅ ACTIVE - Required

#### **4. Kinde Service**
- **File:** `backend/src/services/kinde-service.js`
- **Methods Used:**
  - `validateToken()` - Validates auth token
  - `createOrganization()` - Creates Kinde org
  - `addUserToOrganization()` - Adds user to org
  - `createUser()` - Creates Kinde user
- **Status:** ✅ ACTIVE - Required

#### **5. Subscription Service**
- **File:** `backend/src/services/subscription-service.js`
- **Methods Used:**
  - `createFreeSubscription()` - Creates free tier subscription
- **Status:** ✅ ACTIVE - Required

#### **6. Credit Service**
- **File:** `backend/src/services/credit-service.js`
- **Methods Used:**
  - `addCreditsToEntity()` - Allocates credits to organization
- **Status:** ✅ ACTIVE - Required

#### **7. Organization Setup Service**
- **File:** `backend/src/services/onboarding-organization-setup.js`
- **Methods Used:**
  - `configureApplicationsForNewOrganization()` - Sets up default apps
- **Status:** ✅ ACTIVE - Required

#### **8. Tracking Service**
- **File:** `backend/src/services/onboarding-tracking-service.js`
- **Methods Used:**
  - `trackOnboardingPhase()` - Tracks completion
- **Status:** ✅ ACTIVE - Required

#### **9. Tenant Service**
- **File:** `backend/src/services/tenant-service.js`
- **Methods Used:**
  - None directly (imported but not used)
- **Status:** ⚠️ UNUSED IMPORT - Can be removed

#### **10. Credit Allocation Service**
- **File:** `backend/src/services/credit-allocation-service.js`
- **Methods Used:**
  - None directly (imported but not used)
- **Status:** ⚠️ UNUSED IMPORT - Can be removed

### **Database Schema Dependencies:**
- `tenants` - Tenant records
- `tenantUsers` - User records
- `customRoles` - Role definitions
- `userRoleAssignments` - Role assignments
- `subscriptions` - Subscription records
- `entities` - Organization entities
- `onboardingEvents` - Tracking events (via tracking service)

### **Database Connection:**
- `systemDbConnection` - System-level DB connection (bypasses RLS)

## 🗑️ Files That Can Be Deleted

### **1. Enhanced Onboarding Service (REDUNDANT)**
- **File:** `backend/src/services/onboarding-service.js`
- **Size:** ~380 lines
- **Reason:** 
  - Not used by `/onboard-frontend` or `/onboard-enhanced`
  - Only imported by `payment-profile-completion.js` (check if actually used)
  - All functionality replaced by `UnifiedOnboardingService`
- **Action:** ⚠️ **CHECK FIRST** - Verify `payment-profile-completion.js` usage

### **2. Unused Imports in UnifiedOnboardingService**
- **File:** `backend/src/services/unified-onboarding-service.js`
- **Unused Imports:**
  - `creditAllocationService` (line 15) - Never used
  - `TenantService` (line 18) - Never used
- **Action:** ✅ **REMOVE** - Clean up unused imports

## 📊 Dependency Tree Visualization

```
/onboard-frontend
│
├── core-onboarding.js (Route Handler)
│   └── UnifiedOnboardingService.completeOnboardingWorkflow()
│       │
│       ├── OnboardingValidationService
│       │   ├── validateCompleteOnboarding()
│       │   └── generateUniqueSubdomain()
│       │
│       ├── kindeService
│       │   ├── validateToken()
│       │   ├── createOrganization()
│       │   ├── addUserToOrganization()
│       │   └── createUser()
│       │
│       ├── SubscriptionService
│       │   └── createFreeSubscription()
│       │
│       ├── CreditService
│       │   └── addCreditsToEntity()
│       │
│       ├── OnboardingOrganizationSetupService
│       │   └── configureApplicationsForNewOrganization()
│       │
│       └── OnboardingTrackingService
│           └── trackOnboardingPhase()
│
└── Database (via systemDbConnection)
    ├── tenants
    ├── tenantUsers
    ├── customRoles
    ├── userRoleAssignments
    ├── subscriptions
    ├── entities
    └── onboardingEvents
```

## 🔍 Files to Check Before Deleting

### **1. payment-profile-completion.js**
- **File:** `backend/src/routes/payment-profile-completion.js`
- **Import:** `EnhancedOnboardingService` from `onboarding-service.js`
- **Action:** Check if actually uses `EnhancedOnboardingService` methods
- **If Not Used:** Can delete `onboarding-service.js`
- **If Used:** Need to migrate to `UnifiedOnboardingService`

## ✅ Cleanup Actions

### **Immediate (Safe):**
1. **Remove unused imports from unified-onboarding-service.js:**
   ```javascript
   // REMOVE these lines:
   import creditAllocationService from './credit-allocation-service.js';  // Line 15
   import { TenantService } from './tenant-service.js';  // Line 18
   ```

### **After Verification:**
2. **Check payment-profile-completion.js:**
   - If `EnhancedOnboardingService` is not used → Delete `onboarding-service.js`
   - If `EnhancedOnboardingService` is used → Migrate to `UnifiedOnboardingService`

3. **Extract error handling:**
   - Create shared error handler utility
   - Update all 3 onboarding routes to use it

## 📝 Summary

### **Files Required for `/onboard-frontend`:**
1. ✅ `core-onboarding.js` - Route handler
2. ✅ `unified-onboarding-service.js` - Main service
3. ✅ `onboarding-validation-service.js` - Validation
4. ✅ `kinde-service.js` - Auth integration
5. ✅ `subscription-service.js` - Subscriptions
6. ✅ `credit-service.js` - Credits
7. ✅ `onboarding-organization-setup.js` - App setup
8. ✅ `onboarding-tracking-service.js` - Tracking

### **Files That Can Be Deleted:**
1. ⚠️ `onboarding-service.js` - **IF** not used by `payment-profile-completion.js`
2. ✅ Unused imports in `unified-onboarding-service.js`

### **Files to Refactor:**
1. Extract error handling from `core-onboarding.js` (3 endpoints)

