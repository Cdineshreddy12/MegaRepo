// Simple test script to check if feature imports work
console.log('Testing feature imports...');

try {
  // Test auth feature
  const { authRoutes, simplifiedAuthRoutes, kindeService } = await import('./src/features/auth/index.js');
  console.log('✅ Auth feature imports OK');

  // Test users feature
  const { usersRoutes, UserSyncService, UserClassificationService } = await import('./src/features/users/index.js');
  console.log('✅ Users feature imports OK');

  // Test organizations feature
  const { organizationsRoutes, OrganizationService } = await import('./src/features/organizations/index.js');
  console.log('✅ Organizations feature imports OK');

  // Test credits feature
  const { creditsRoutes, CreditService, CreditAllocationService } = await import('./src/features/credits/index.js');
  console.log('✅ Credits feature imports OK');

  // Test subscriptions feature
  const { subscriptionsRoutes, SubscriptionService } = await import('./src/features/subscriptions/index.js');
  console.log('✅ Subscriptions feature imports OK');

  // Test roles feature
  const { rolesRoutes, CustomRoleService } = await import('./src/features/roles/index.js');
  console.log('✅ Roles feature imports OK');

  // Test admin feature
  const { adminRoutes, adminDashboardRoutes } = await import('./src/features/admin/index.js');
  console.log('✅ Admin feature imports OK');

  // Test onboarding feature
  const { coreOnboardingRoutes, UnifiedOnboardingService } = await import('./src/features/onboarding/index.js');
  console.log('✅ Onboarding feature imports OK');

  console.log('🎉 All feature imports successful!');

} catch (error) {
  console.error('❌ Import error:', error.message);
  process.exit(1);
}
