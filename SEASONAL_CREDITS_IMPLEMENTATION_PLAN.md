# Seasonal Credits Implementation Plan

## Overview
This plan outlines the implementation of seasonal credits functionality in the admin dashboard, focusing on campaign creation, expiry management, and notifications.

## Current System Analysis

### Key Findings:
1. **Backend**: Seasonal credits routes are deprecated (returning 501 errors)
2. **Frontend**: SeasonalCreditsManagement component exists but calls non-functional endpoints
3. **Database**: Existing credit system uses unified entities and simplified transaction ledger
4. **Notifications**: System already supports seasonal credits and expiry warning notifications

### Integration Points:
- **Credit System**: Integrate with existing credits table and transaction ledger
- **Notifications**: Use existing notification system with `seasonal_credits` and `credit_expiry_warning` types
- **Entities**: Use unified entities table for tenant/organization context
- **Authentication**: Use existing admin permission system (`admin:credits`)

## Database Schema Design

### New Tables Required:

#### 1. Seasonal Credit Campaigns Table
```javascript
// wrapper/backend/src/db/schema/seasonal-credits.js
export const seasonalCreditCampaigns = pgTable('seasonal_credit_campaigns', {
  campaignId: uuid('campaign_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  
  // Campaign Metadata
  campaignName: varchar('campaign_name', { length: 255 }).notNull(),
  creditType: varchar('credit_type', { length: 50 }).notNull(), // seasonal, bonus, promotional, etc.
  description: text('description'),
  
  // Credit Allocation
  totalCredits: decimal('total_credits', { precision: 15, scale: 4 }).notNull(),
  usedCredits: decimal('used_credits', { precision: 15, scale: 4 }).default('0'),
  
  // Targeting
  targetApplications: jsonb('target_applications').default(['crm', 'hr', 'affiliate', 'system']),
  tenantIds: uuid('tenant_ids').array(), // Specific tenants if not all
  
  // Timing
  startsAt: timestamp('starts_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  
  // Status
  isActive: boolean('is_active').default(true),
  
  // Audit
  createdBy: uuid('created_by').references(() => tenantUsers.userId),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  
  // Additional Configuration
  metadata: jsonb('metadata'),
  sendNotifications: boolean('send_notifications').default(true),
  warningDays: integer('warning_days').default(7),
});
```

#### 2. Seasonal Credit Allocations Table
```javascript
// wrapper/backend/src/db/schema/seasonal-credits.js
export const seasonalCreditAllocations = pgTable('seasonal_credit_allocations', {
  allocationId: uuid('allocation_id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => seasonalCreditCampaigns.campaignId).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  
  // Credit Details
  allocatedCredits: decimal('allocated_credits', { precision: 15, scale: 4 }).notNull(),
  usedCredits: decimal('used_credits', { precision: 15, scale: 4 }).default('0'),
  
  // Status
  isActive: boolean('is_active').default(true),
  isExpired: boolean('is_expired').default(false),
  
  // Timing
  allocatedAt: timestamp('allocated_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  
  // Audit
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

## Backend Implementation

### 1. Database Schema Creation
- Create new schema file: `wrapper/backend/src/db/schema/seasonal-credits.js`
- Add tables to main schema index: `wrapper/backend/src/db/schema/index.js`
- Run database migrations

### 2. Service Layer
Create `SeasonalCreditService` with methods:

```javascript
// wrapper/backend/src/features/admin/services/SeasonalCreditService.js
class SeasonalCreditService {
  // Campaign Management
  static async createCampaign(campaignData)
  static async getCampaigns(tenantId)
  static async getCampaign(campaignId)
  static async updateCampaign(campaignId, updates)
  static async extendCampaignExpiry(campaignId, additionalDays)
  
  // Allocation Management
  static async allocateCreditsToTenants(campaignId, tenantIds, creditAmount)
  static async getTenantAllocations(campaignId)
  static async getExpiringAllocations(daysAhead)
  
  // Expiry Management
  static async processExpiries()
  static async sendExpiryWarnings(daysAhead)
  
  // Notification Integration
  static async createExpiryNotifications(campaignId, daysAhead)
  
  // Credit Consumption
  static async consumeSeasonalCredits(tenantId, campaignId, creditAmount, operation)
}
```

### 3. API Endpoints Implementation
Update `wrapper/backend/src/features/admin/routes/seasonal-credits.js`:

```javascript
// Campaign Management
fastify.get('/campaigns', async (request, reply) => {
  const campaigns = await SeasonalCreditService.getCampaigns(request.userContext.tenantId);
  reply.send({ success: true, data: campaigns });
});

fastify.post('/campaigns', async (request, reply) => {
  const campaign = await SeasonalCreditService.createCampaign({
    ...request.body,
    createdBy: request.userContext.userId
  });
  reply.send({ success: true, data: campaign });
});

// Expiry Management
fastify.put('/campaigns/:campaignId/extend', async (request, reply) => {
  const result = await SeasonalCreditService.extendCampaignExpiry(
    request.params.campaignId,
    request.body.additionalDays
  );
  reply.send({ success: true, data: result });
});

// Notification Management
fastify.post('/send-warnings', async (request, reply) => {
  const result = await SeasonalCreditService.sendExpiryWarnings(
    request.body.daysAhead || 7
  );
  reply.send({ success: true, data: result });
});

// Expiring Credits
fastify.get('/expiring-soon', async (request, reply) => {
  const daysAhead = request.query.daysAhead || 30;
  const expiring = await SeasonalCreditService.getExpiringAllocations(daysAhead);
  reply.send({ success: true, data: expiring });
});
```

### 4. Integration with Credit System
- Modify `CreditService` to handle seasonal credit consumption
- Update credit transaction ledger to track seasonal credit usage
- Add seasonal credit validation to credit consumption endpoints

## Frontend Implementation

### 1. Update SeasonalCreditsManagement Component
- Remove deprecated API calls
- Implement proper error handling
- Add loading states and user feedback

### 2. Enhance Campaign Creation
```jsx
// Add validation and better UX
const handleCreateCampaign = async () => {
  try {
    // Validate form data
    if (!newCampaign.campaignId || !newCampaign.campaignName || !newCampaign.creditType) {
      toast.error('Please fill all required fields');
      return;
    }
    
    // Combine date and time
    const expiresAtDateTime = new Date(`${newCampaign.expiresAt}T${newCampaign.expiresAtTime}:00`).toISOString();
    
    const response = await api.post('/admin/seasonal-credits/campaigns', {
      ...newCampaign,
      totalCredits: parseFloat(newCampaign.totalCredits),
      expiresAt: expiresAtDateTime,
      targetApplications: newCampaign.targetApplications.length > 0 
        ? newCampaign.targetApplications 
        : ['crm', 'hr', 'affiliate', 'system']
    });
    
    if (response.data.success) {
      toast.success('Campaign created successfully!');
      await fetchCampaigns();
      setCreateDialogOpen(false);
    }
  } catch (error) {
    console.error('Failed to create campaign:', error);
    toast.error(error.response?.data?.message || 'Failed to create campaign');
  }
};
```

### 3. Implement Expiry Management Panel
Enhance `ExpiryManagementPanel` component:
- Add batch expiry extension
- Implement bulk notification sending
- Add filtering and sorting options

### 4. Add Real-time Notifications
- Integrate with existing notification system
- Add toast notifications for important events
- Implement notification center integration

## Error Handling and Validation

### Backend Validation:
```javascript
// In SeasonalCreditService
static async validateCampaignData(campaignData) {
  const errors = [];
  
  if (!campaignData.campaignName || campaignData.campaignName.length > 255) {
    errors.push('Campaign name must be between 1-255 characters');
  }
  
  if (!campaignData.creditType || !CREDIT_TYPES[campaignData.creditType]) {
    errors.push('Invalid credit type');
  }
  
  if (!campaignData.totalCredits || campaignData.totalCredits <= 0) {
    errors.push('Total credits must be greater than 0');
  }
  
  if (!campaignData.expiresAt || new Date(campaignData.expiresAt) < new Date()) {
    errors.push('Expiry date must be in the future');
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }
}
```

### Frontend Error Handling:
```jsx
// Enhanced error handling in API calls
const handleApiError = (error, fallbackMessage) => {
  if (error.response) {
    // Server responded with error status
    const errorData = error.response.data;
    toast.error(errorData.message || errorData.error || fallbackMessage);
    console.error('API Error:', errorData);
  } else if (error.request) {
    // Request was made but no response
    toast.error('Network error. Please check your connection.');
    console.error('Network Error:', error.request);
  } else {
    // Something else went wrong
    toast.error(fallbackMessage);
    console.error('Error:', error.message);
  }
};
```

## Testing Plan

### Unit Tests:
1. **SeasonalCreditService**: Test all service methods
2. **API Endpoints**: Test route handlers and validation
3. **Database Operations**: Test schema and queries

### Integration Tests:
1. **Campaign Lifecycle**: Create → Allocate → Use → Expire
2. **Expiry Management**: Test expiry processing and warnings
3. **Notification Integration**: Test notification creation and delivery

### End-to-End Tests:
1. **Admin Workflow**: Full campaign creation and management
2. **User Experience**: Test UI interactions and feedback
3. **Error Scenarios**: Test validation and error handling

### Test Cases:
```javascript
// Example test case for campaign creation
describe('SeasonalCreditService.createCampaign', () => {
  it('should create a valid campaign', async () => {
    const campaignData = {
      campaignName: 'Test Campaign',
      creditType: 'seasonal',
      totalCredits: 1000,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'user-123'
    };
    
    const result = await SeasonalCreditService.createCampaign(campaignData);
    
    expect(result).toHaveProperty('campaignId');
    expect(result.campaignName).toBe(campaignData.campaignName);
    expect(result.totalCredits).toBe(campaignData.totalCredits);
  });
  
  it('should reject invalid campaign data', async () => {
    const invalidData = {
      campaignName: '', // Empty name
      creditType: 'invalid', // Invalid type
      totalCredits: -100 // Negative credits
    };
    
    await expect(SeasonalCreditService.createCampaign(invalidData))
      .rejects
      .toThrow('Campaign name must be between 1-255 characters');
  });
});
```

## Implementation Timeline

### Phase 1: Database & Backend (2-3 days)
- [ ] Create database schema
- [ ] Implement SeasonalCreditService
- [ ] Update API endpoints
- [ ] Add integration with credit system

### Phase 2: Frontend Integration (2 days)
- [ ] Update SeasonalCreditsManagement component
- [ ] Enhance ExpiryManagementPanel
- [ ] Add notification integration
- [ ] Implement error handling

### Phase 3: Testing & Deployment (1-2 days)
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Perform end-to-end testing
- [ ] Deploy to staging for QA
- [ ] Production deployment

## Success Metrics

1. **Functionality**: All seasonal credit features working as expected
2. **Performance**: API responses under 500ms for all endpoints
3. **Reliability**: 99.9% uptime for seasonal credit services
4. **User Satisfaction**: Positive feedback from admin users
5. **Adoption**: Active use of seasonal credit campaigns

## Risk Assessment

### Potential Risks:
1. **Database Migration Issues**: Complex schema changes
2. **Integration Problems**: Conflicts with existing credit system
3. **Performance Bottlenecks**: Large-scale campaign processing
4. **Notification Overload**: Too many expiry warnings

### Mitigation Strategies:
1. **Phased Rollout**: Deploy to staging first, then production
2. **Comprehensive Testing**: Thorough unit and integration testing
3. **Monitoring**: Real-time performance monitoring
4. **Rate Limiting**: Control notification frequency

## Next Steps

1. **Approve this plan** and provide any feedback
2. **Begin implementation** with database schema creation
3. **Set up development environment** for testing
4. **Schedule regular progress reviews**

This plan provides a comprehensive approach to implementing seasonal credits with a focus on campaign creation, expiry management, and notifications while integrating seamlessly with the existing system architecture.