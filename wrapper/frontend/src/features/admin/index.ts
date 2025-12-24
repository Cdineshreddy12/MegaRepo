/**
 * 🚀 **ADMIN FEATURE**
 * Centralized admin feature module
 * Exports all admin pages, components, and hooks
 */

// Pages
export { default as AdminDashboardPage } from './pages/AdminDashboardPage';
export { default as AdminDashboard } from './pages/AdminDashboard';

// Main Components
export { default as AdminDashboardComponent } from './components/AdminDashboard';
export { TenantManagement } from './components/TenantManagement';
export { EntityManagement } from './components/EntityManagement';
export { CreditManagement } from './components/CreditManagement';
export { default as ApplicationAssignmentManager } from './components/ApplicationAssignmentManager';
export { AdminPromotionManager } from './components/AdminPromotionManager';
export { default as CampaignDetailsModal } from './components/CampaignDetailsModal';
export { default as ExpiryManagementPanel } from './components/ExpiryManagementPanel';
export { InvitationManager } from './components/InvitationManager';
export { default as SeasonalCreditsManagement } from './components/SeasonalCreditsManagement';
export { TrialSystemMonitor } from './components/TrialSystemMonitor';

// Credit Configuration
export * from './components/credit-configuration';

// Hooks
export * from './hooks';

