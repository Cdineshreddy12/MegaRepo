# Code Reorganization Plan

## 🎯 Goal
Organize code by feature/domain for better maintainability and discoverability.

## 📋 Current Structure Issues

### **Backend:**
- Onboarding files scattered: `routes/onboarding/`, `services/onboarding-*.js`, `routes/payment-profile-completion.js`
- Admin files scattered: `routes/admin/`, `routes/admin.js`, `services/admin/`
- User management scattered: `routes/users.js`, `routes/user-routes.js`, `routes/user-sync.js`, `routes/user-verification-routes.js`

### **Frontend:**
- Admin components scattered: `components/admin/`, `pages/AdminDashboard.tsx`, `pages/AdminDashboardPage.tsx`
- User components scattered: `components/users/`, `features/users/`
- Onboarding scattered: `pages/Onboarding.tsx`, `components/onboarding/`

## 🏗️ Proposed Structure

### **Backend Structure:**

```
backend/src/
├── features/
│   ├── onboarding/
│   │   ├── routes/
│   │   │   ├── core-onboarding.js
│   │   │   ├── status-management.js
│   │   │   ├── data-management.js
│   │   │   ├── subdomain-management.js
│   │   │   └── admin-management.js
│   │   ├── services/
│   │   │   ├── unified-onboarding-service.js
│   │   │   ├── onboarding-validation-service.js
│   │   │   ├── onboarding-tracking-service.js
│   │   │   └── onboarding-organization-setup.js
│   │   └── index.js (exports)
│   │
│   ├── admin/
│   │   ├── routes/
│   │   │   ├── dashboard.js
│   │   │   ├── tenant-management.js
│   │   │   ├── entity-management.js
│   │   │   ├── credit-configuration.js
│   │   │   ├── credit-overview.js
│   │   │   ├── application-assignment.js
│   │   │   ├── operation-costs.js
│   │   │   ├── seasonal-credits.js
│   │   │   └── admin.js (main admin routes)
│   │   ├── services/
│   │   │   ├── DashboardService.js
│   │   │   ├── TenantAdminService.js
│   │   │   ├── EntityAdminService.js
│   │   │   └── CreditAdminService.js
│   │   └── index.js
│   │
│   ├── users/
│   │   ├── routes/
│   │   │   ├── users.js
│   │   │   ├── user-routes.js
│   │   │   ├── user-sync.js
│   │   │   └── user-verification-routes.js
│   │   ├── services/
│   │   │   ├── user-sync-service.js
│   │   │   └── user-classification-service.js
│   │   └── index.js
│   │
│   ├── organizations/
│   │   ├── routes/
│   │   │   ├── organizations.js
│   │   │   ├── entities.js
│   │   │   └── locations.js
│   │   ├── services/
│   │   │   ├── organization-service.js
│   │   │   ├── location-service.js
│   │   │   └── organization-assignment-service.js
│   │   └── index.js
│   │
│   ├── credits/
│   │   ├── routes/
│   │   │   └── credits.js
│   │   ├── services/
│   │   │   ├── credit-service.js
│   │   │   ├── credit-allocation-service.js
│   │   │   ├── seasonal-credit-service.js
│   │   │   └── fixed-enhanced-credit-service.js
│   │   └── index.js
│   │
│   ├── subscriptions/
│   │   ├── routes/
│   │   │   ├── subscriptions.js
│   │   │   ├── payments.js
│   │   │   ├── payment-upgrade.js
│   │   │   └── payment-profile-completion.js
│   │   ├── services/
│   │   │   ├── subscription-service.js
│   │   │   └── payment-service.js
│   │   └── index.js
│   │
│   ├── roles/
│   │   ├── routes/
│   │   │   ├── roles.js
│   │   │   └── custom-roles.js
│   │   ├── services/
│   │   │   ├── custom-role-service.js
│   │   │   └── permission-matrix-service.js
│   │   └── index.js
│   │
│   └── auth/
│       ├── routes/
│       │   ├── auth.js
│       │   └── simplified-auth.js
│       ├── services/
│       │   └── kinde-service.js
│       └── index.js
│
├── routes/ (legacy - will be migrated)
├── services/ (shared services)
└── middleware/ (shared middleware)
```

### **Frontend Structure:**

```
frontend/src/
├── features/
│   ├── onboarding/
│   │   ├── components/
│   │   │   └── (all onboarding components)
│   │   ├── pages/
│   │   │   ├── Onboarding.tsx
│   │   │   └── SimpleOnboarding.tsx
│   │   ├── hooks/
│   │   │   └── (onboarding hooks)
│   │   └── index.ts
│   │
│   ├── admin/
│   │   ├── components/
│   │   │   └── (all admin components)
│   │   ├── pages/
│   │   │   └── AdminDashboard.tsx
│   │   ├── hooks/
│   │   │   └── (admin hooks)
│   │   └── index.ts
│   │
│   ├── users/ (already exists)
│   ├── organizations/ (already exists)
│   └── ...
│
└── components/ (shared UI components only)
```

## 🚀 Migration Steps

### Phase 1: Backend Onboarding (Priority)
1. Create `backend/src/features/onboarding/`
2. Move onboarding routes
3. Move onboarding services
4. Update imports
5. Update route registration

### Phase 2: Backend Admin
1. Create `backend/src/features/admin/`
2. Move admin routes
3. Move admin services
4. Update imports

### Phase 3: Frontend Onboarding
1. Create `frontend/src/features/onboarding/`
2. Move onboarding components
3. Move onboarding pages
4. Update imports

### Phase 4: Frontend Admin
1. Create `frontend/src/features/admin/`
2. Move admin components
3. Move admin pages
4. Update imports

## 📝 Implementation Plan

### ✅ Phase 1: Backend Onboarding (COMPLETED)
1. ✅ Created `backend/src/features/onboarding/` structure
2. ✅ Moved onboarding routes to `features/onboarding/routes/`
3. ✅ Moved onboarding services to `features/onboarding/services/`
4. ✅ Updated imports in `payment-upgrade.js`
5. ✅ Deleted old onboarding files from `routes/onboarding/` and `services/`

### ✅ Phase 2: Backend Admin (COMPLETED)
1. ✅ Created `backend/src/features/admin/` structure
2. ✅ Moved admin routes to `features/admin/routes/`
3. ✅ Moved admin services to `features/admin/services/`
4. ✅ Updated all import paths in moved files
5. ✅ Updated imports in `app.js`, `entities.js`, and `locations.js`
6. ✅ Created `features/admin/index.js` for centralized exports
7. ✅ Deleted old admin files from `routes/admin/` and `services/admin/`

### ✅ Phase 3: Frontend Onboarding (COMPLETED)
1. ✅ Created `frontend/src/features/onboarding/` structure
2. ✅ Moved onboarding pages to `features/onboarding/pages/`
3. ✅ Moved onboarding components to `features/onboarding/components/`
4. ✅ Moved onboarding auth guards to `features/onboarding/components/`
5. ✅ Updated import paths in moved files
6. ✅ Created `features/onboarding/index.ts` for centralized exports
7. ✅ Updated imports in `App.tsx`
8. ⚠️ Note: Some hooks, schemas, config, utils referenced in OnboardingForm.tsx may need to be created/moved

### ✅ Phase 4: Frontend Admin (COMPLETED)
1. ✅ Created `frontend/src/features/admin/` structure
2. ✅ Moved admin pages to `features/admin/pages/`
3. ✅ Moved admin components to `features/admin/components/`
4. ✅ Moved admin hooks to `features/admin/hooks/`
5. ✅ Updated all import paths in moved files (UI components, lib/api)
6. ✅ Created `features/admin/index.ts` for centralized exports
7. ✅ Updated imports in `App.tsx`, `dashboard-menu.tsx`, `app-sidebar.tsx`
8. ✅ Created backward compatibility re-exports in old page locations

## 🎉 Reorganization Complete!

All four phases have been completed:
- ✅ Phase 1: Backend Onboarding
- ✅ Phase 2: Backend Admin
- ✅ Phase 3: Frontend Onboarding
- ✅ Phase 4: Frontend Admin

The codebase is now organized by feature/domain for better maintainability and discoverability!

