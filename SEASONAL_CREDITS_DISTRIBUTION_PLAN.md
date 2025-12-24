# Seasonal Credits Distribution Implementation Plan

## Overview
This updated plan focuses specifically on enabling admins to run campaigns that distribute free credits to tenants, with automatic allocation to primary organizations and notification display.

## Key Requirements

### Admin Workflow:
1. **Create Distribution Campaign**: Admin creates a campaign to distribute free credits
2. **Select Target Tenants**: Choose specific tenants or distribute to all tenants
3. **Automatic Allocation**: Credits automatically added to tenants' primary organizations
4. **Notification Display**: Tenants receive notifications about the credit distribution
5. **Campaign Monitoring**: Admin can track distribution status and usage

## Updated Database Schema

### Enhanced Seasonal Credit Campaigns Table
```javascript
// wrapper/backend/src/db/schema/seasonal-credits.js
export const seasonalCreditCampaigns = pgTable('seasonal_credit_campaigns', {
  campaignId: uuid('campaign_id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  
  // Campaign Metadata
  campaignName: varchar('campaign_name', { length: 255 }).notNull(),
  creditType: varchar('credit_type', { length: 50 }).notNull(), // 'free_distribution', 'promotional', 'holiday', etc.
  description: text('description'),
  
  // Credit Distribution Settings
  totalCredits: decimal('total_credits', { precision: 15, scale: 4 }).notNull(),
  creditsPerTenant: decimal('credits_per_tenant', { precision: 15, scale: 4 }),
  distributionMethod: varchar('distribution_method', { length: 50 }).default('equal'), // 'equal', 'proportional', 'custom'
  
  // Targeting
  targetAllTenants: boolean('target_all_tenants').default(false),
  targetTenantIds: uuid('target_tenant_ids').array(), // Specific tenants if not all
  targetApplications: jsonb('target_applications').default(['crm', 'hr', 'affiliate', 'system']),
  
  // Distribution Status
  distributionStatus: varchar('distribution_status', { length: 50 }).default('pending'), // 'pending', 'processing', 'completed', 'failed'
  distributedCount: integer('distributed_count').default(0),
  failedCount: integer('failed_count').default(0),
  
  // Timing
  startsAt: timestamp('starts_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  distributedAt: timestamp('distributed_at'),
  
  // Status
  isActive: boolean('is_active').default(true),
  
  // Audit
  createdBy: uuid('created_by').references(() => tenantUsers.userId),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  
  // Additional Configuration
  metadata: jsonb('metadata'),
  sendNotifications: boolean('send_notifications').default(true),
  notificationTemplate: text('notification_template'),
});
```

### Enhanced Seasonal Credit Allocations Table
```javascript
// wrapper/backend/src/db/schema/seasonal-credits.js
export const seasonalCreditAllocations = pgTable('seasonal_credit_allocations', {
  allocationId: uuid('allocation_id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => seasonalCreditCampaigns.campaignId).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.tenantId).notNull(),
  
  // Organization Context (Primary Organization)
  entityId: uuid('entity_id').references(() => entities.entityId).notNull(),
  entityType: varchar('entity_type', { length: 50 }).default('organization'),
  
  // Credit Details
  allocatedCredits: decimal('allocated_credits', { precision: 15, scale: 4 }).notNull(),
  usedCredits: decimal('used_credits', { precision: 15, scale: 4 }).default('0'),
  
  // Distribution Status
  distributionStatus: varchar('distribution_status', { length: 50 }).default('pending'),
  distributionError: text('distribution_error'),
  
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

## Updated Backend Implementation

### 1. Enhanced SeasonalCreditService

```javascript
// wrapper/backend/src/features/admin/services/SeasonalCreditService.js
class SeasonalCreditService {
  
  // Campaign Creation with Distribution
  static async createDistributionCampaign(campaignData) {
    // Validate campaign data
    await this.validateCampaignData(campaignData);
    
    // Create campaign record
    const campaign = await db.insert(seasonalCreditCampaigns)
      .values({
        ...campaignData,
        distributionStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return campaign[0];
  }
  
  // Automatic Credit Distribution to Primary Organizations
  static async distributeCreditsToTenants(campaignId) {
    const campaign = await this.getCampaign(campaignId);
    
    if (campaign.distributionStatus !== 'pending') {
      throw new Error('Campaign already processed or failed');
    }
    
    // Update campaign status
    await db.update(seasonalCreditCampaigns)
      .set({ distributionStatus: 'processing', updatedAt: new Date() })
      .where(eq(seasonalCreditCampaigns.campaignId, campaignId));
    
    // Get target tenants
    const targetTenantIds = campaign.targetAllTenants 
      ? await this.getAllActiveTenantIds()
      : campaign.targetTenantIds || [];
    
    let distributedCount = 0;
    let failedCount = 0;
    
    // Process each tenant
    for (const tenantId of targetTenantIds) {
      try {
        // Get tenant's primary organization entity
        const primaryEntity = await this.getPrimaryOrganizationEntity(tenantId);
        
        if (!primaryEntity) {
          console.warn(`No primary organization found for tenant ${tenantId}`);
          failedCount++;
          continue;
        }
        
        // Calculate credits to allocate
        const creditsToAllocate = campaign.creditsPerTenant || 
          (campaign.distributionMethod === 'equal' 
            ? campaign.totalCredits / targetTenantIds.length
            : campaign.totalCredits);
        
        // Create allocation record
        const allocation = await db.insert(seasonalCreditAllocations)
          .values({
            campaignId,
            tenantId,
            entityId: primaryEntity.entityId,
            entityType: 'organization',
            allocatedCredits: creditsToAllocate,
            expiresAt: campaign.expiresAt,
            distributionStatus: 'completed',
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        // Update main credits table
        await CreditService.addCredits({
          tenantId,
          entityId: primaryEntity.entityId,
          entityType: 'organization',
          creditAmount: creditsToAllocate,
          source: 'seasonal_campaign',
          sourceId: campaignId,
          description: `Seasonal credits from campaign: ${campaign.campaignName}`
        });
        
        // Create notification for tenant
        if (campaign.sendNotifications) {
          await this.createCreditDistributionNotification(campaign, tenantId, creditsToAllocate);
        }
        
        distributedCount++;
        
      } catch (error) {
        console.error(`Failed to distribute credits to tenant ${tenantId}:`, error);
        
        // Record failed allocation
        await db.insert(seasonalCreditAllocations)
          .values({
            campaignId,
            tenantId,
            allocatedCredits: 0,
            expiresAt: campaign.expiresAt,
            distributionStatus: 'failed',
            distributionError: error.message,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        
        failedCount++;
      }
    }
    
    // Update campaign with final status
    const finalStatus = failedCount === 0 ? 'completed' : 'partial_success';
    
    await db.update(seasonalCreditCampaigns)
      .set({
        distributionStatus: finalStatus,
        distributedCount,
        failedCount,
        distributedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(seasonalCreditCampaigns.campaignId, campaignId));
    
    return {
      campaignId,
      distributedCount,
      failedCount,
      status: finalStatus
    };
  }
  
  // Helper: Get primary organization entity for tenant
  static async getPrimaryOrganizationEntity(tenantId) {
    const entities = await db
      .select()
      .from(entities)
      .where(and(
        eq(entities.tenantId, tenantId),
        eq(entities.entityType, 'organization'),
        eq(entities.isActive, true)
      ))
      .orderBy(desc(entities.isDefault));
    
    return entities.length > 0 ? entities[0] : null;
  }
  
  // Notification Creation
  static async createCreditDistributionNotification(campaign, tenantId, creditAmount) {
    const notificationTemplate = campaign.notificationTemplate || 
      `You've received {creditAmount} free credits from the {campaignName} campaign!`;
    
    const message = notificationTemplate
      .replace('{creditAmount}', creditAmount)
      .replace('{campaignName}', campaign.campaignName);
    
    await db.insert(notifications)
      .values({
        tenantId,
        type: NOTIFICATION_TYPES.SEASONAL_CREDITS,
        priority: NOTIFICATION_PRIORITIES.MEDIUM,
        title: `New Credits Available: ${campaign.campaignName}`,
        message,
        actionUrl: `/credits?campaign=${campaign.campaignId}`,
        actionLabel: 'View Credits',
        metadata: {
          campaignId: campaign.campaignId,
          campaignName: campaign.campaignName,
          creditAmount,
          expiresAt: campaign.expiresAt
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
  }
  
  // Campaign Monitoring
  static async getCampaignDistributionStatus(campaignId) {
    const campaign = await this.getCampaign(campaignId);
    
    const allocations = await db
      .select()
      .from(seasonalCreditAllocations)
      .where(eq(seasonalCreditAllocations.campaignId, campaignId));
    
    return {
      campaign,
      allocations,
      summary: {
        totalTargeted: campaign.targetAllTenants ? 'All Tenants' : campaign.targetTenantIds?.length || 0,
        successfullyDistributed: allocations.filter(a => a.distributionStatus === 'completed').length,
        failedDistributions: allocations.filter(a => a.distributionStatus === 'failed').length,
        pendingDistributions: allocations.filter(a => a.distributionStatus === 'pending').length,
        totalCreditsDistributed: allocations.reduce((sum, a) => sum + (a.allocatedCredits || 0), 0)
      }
    };
  }
}
```

### 2. Updated API Endpoints

```javascript
// wrapper/backend/src/features/admin/routes/seasonal-credits.js

// Create distribution campaign
fastify.post('/campaigns', {
  preHandler: [authenticateToken, requirePermission('admin:credits')],
  schema: {
    body: {
      type: 'object',
      required: ['campaignName', 'creditType', 'totalCredits', 'expiresAt'],
      properties: {
        campaignName: { type: 'string', maxLength: 255 },
        creditType: { type: 'string', enum: ['free_distribution', 'promotional', 'holiday', 'bonus', 'event'] },
        totalCredits: { type: 'number', minimum: 1 },
        creditsPerTenant: { type: 'number', minimum: 0.01 },
        distributionMethod: { type: 'string', enum: ['equal', 'proportional', 'custom'], default: 'equal' },
        targetAllTenants: { type: 'boolean', default: false },
        targetTenantIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
        expiresAt: { type: 'string', format: 'date-time' },
        description: { type: 'string' },
        sendNotifications: { type: 'boolean', default: true },
        notificationTemplate: { type: 'string' },
        targetApplications: { type: 'array', items: { type: 'string' } }
      }
    }
  }
}, async (request, reply) => {
  try {
    const campaignData = {
      ...request.body,
      createdBy: request.userContext.userId,
      tenantId: request.userContext.tenantId
    };
    
    const campaign = await SeasonalCreditService.createDistributionCampaign(campaignData);
    
    reply.send({
      success: true,
      data: campaign,
      message: 'Campaign created successfully. Ready for distribution.'
    });
  } catch (error) {
    request.log.error('Error creating campaign:', error);
    reply.code(400).send({
      error: 'Failed to create campaign',
      message: error.message
    });
  }
});

// Distribute credits to tenants
fastify.post('/campaigns/:campaignId/distribute', {
  preHandler: [authenticateToken, requirePermission('admin:credits')]
}, async (request, reply) => {
  try {
    const result = await SeasonalCreditService.distributeCreditsToTenants(
      request.params.campaignId
    );
    
    reply.send({
      success: true,
      data: result,
      message: `Credit distribution ${result.status}. ${result.distributedCount} successful, ${result.failedCount} failed.`
    });
  } catch (error) {
    request.log.error('Error distributing credits:', error);
    reply.code(400).send({
      error: 'Failed to distribute credits',
      message: error.message
    });
  }
});

// Get campaign distribution status
fastify.get('/campaigns/:campaignId/status', {
  preHandler: [authenticateToken, requirePermission('admin:credits')]
}, async (request, reply) => {
  try {
    const status = await SeasonalCreditService.getCampaignDistributionStatus(
      request.params.campaignId
    );
    
    reply.send({
      success: true,
      data: status
    });
  } catch (error) {
    request.log.error('Error getting campaign status:', error);
    reply.code(400).send({
      error: 'Failed to get campaign status',
      message: error.message
    });
  }
});

// Get tenant's seasonal credit allocations
fastify.get('/tenant-allocations', {
  preHandler: authenticateToken
}, async (request, reply) => {
  try {
    const tenantId = request.userContext.tenantId;
    
    const allocations = await db
      .select()
      .from(seasonalCreditAllocations)
      .where(eq(seasonalCreditAllocations.tenantId, tenantId))
      .orderBy(desc(seasonalCreditAllocations.allocatedAt));
    
    reply.send({
      success: true,
      data: allocations
    });
  } catch (error) {
    request.log.error('Error getting tenant allocations:', error);
    reply.code(400).send({
      error: 'Failed to get tenant allocations',
      message: error.message
    });
  }
});
```

## Updated Frontend Implementation

### 1. Enhanced Campaign Creation Form

```jsx
// Updated create campaign dialog in SeasonalCreditsManagement.tsx

<DialogContent className="max-w-3xl">
  <DialogHeader>
    <DialogTitle>Create Credit Distribution Campaign</DialogTitle>
    <DialogDescription>
      Distribute free credits to tenants' primary organizations
    </DialogDescription>
  </DialogHeader>
  
  <div className="grid gap-6 py-4">
    {/* Basic Information */}
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="campaignName">Campaign Name</Label>
        <Input
          id="campaignName"
          placeholder="e.g., Holiday 2024 Free Credits"
          value={newCampaign.campaignName}
          onChange={(e) => setNewCampaign(prev => ({ ...prev, campaignName: e.target.value }))}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="creditType">Credit Type</Label>
        <Select
          value={newCampaign.creditType}
          onValueChange={(value) => setNewCampaign(prev => ({ ...prev, creditType: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select credit type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="free_distribution">Free Distribution</SelectItem>
            <SelectItem value="promotional">Promotional</SelectItem>
            <SelectItem value="holiday">Holiday</SelectItem>
            <SelectItem value="bonus">Bonus</SelectItem>
            <SelectItem value="event">Event</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    
    {/* Credit Distribution Settings */}
    <Card>
      <CardHeader>
        <CardTitle>Credit Distribution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="totalCredits">Total Credits to Distribute</Label>
            <Input
              id="totalCredits"
              type="number"
              placeholder="10000"
              value={newCampaign.totalCredits}
              onChange={(e) => setNewCampaign(prev => ({ ...prev, totalCredits: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="creditsPerTenant">Credits Per Tenant (optional)</Label>
            <Input
              id="creditsPerTenant"
              type="number"
              placeholder="Auto-calculated if empty"
              value={newCampaign.creditsPerTenant}
              onChange={(e) => setNewCampaign(prev => ({ ...prev, creditsPerTenant: e.target.value }))}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Distribution Method</Label>
          <Select
            value={newCampaign.distributionMethod}
            onValueChange={(value) => setNewCampaign(prev => ({ ...prev, distributionMethod: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select distribution method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="equal">Equal Distribution</SelectItem>
              <SelectItem value="proportional">Proportional (by tenant size)</SelectItem>
              <SelectItem value="custom">Custom Amounts</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
    
    {/* Target Tenants */}
    <Card>
      <CardHeader>
        <CardTitle>Target Tenants</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="targetAllTenants"
            checked={newCampaign.targetAllTenants}
            onCheckedChange={(checked) => 
              setNewCampaign(prev => ({ 
                ...prev, 
                targetAllTenants: checked,
                targetTenantIds: checked ? [] : prev.targetTenantIds
              }))
            }
          />
          <Label htmlFor="targetAllTenants">Distribute to ALL tenants</Label>
        </div>
        
        {!newCampaign.targetAllTenants && (
          <div className="space-y-2">
            <Label>Select Specific Tenants</Label>
            <TenantMultiSelect
              selectedTenantIds={newCampaign.targetTenantIds}
              onChange={(tenantIds) => setNewCampaign(prev => ({ ...prev, targetTenantIds: tenantIds }))}
            />
          </div>
        )}
        
        <p className="text-sm text-muted-foreground">
          {newCampaign.targetAllTenants 
            ? 'Credits will be distributed to all active tenants'
            : `Selected: ${newCampaign.targetTenantIds?.length || 0} tenants`}
        </p>
      </CardContent>
    </Card>
    
    {/* Expiry Settings */}
    <Card>
      <CardHeader>
        <CardTitle>Expiry Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expiresAt">Expiry Date</Label>
            <Input
              id="expiresAt"
              type="date"
              value={newCampaign.expiresAt}
              onChange={(e) => {
                setNewCampaign(prev => ({ ...prev, expiresAt: e.target.value }));
                if (!prev.expiresAtTime) {
                  setNewCampaign(prev => ({ ...prev, expiresAtTime: '23:59' }));
                }
              }}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="expiresAtTime">Expiry Time</Label>
            <Input
              id="expiresAtTime"
              type="time"
              value={newCampaign.expiresAtTime}
              onChange={(e) => setNewCampaign(prev => ({ ...prev, expiresAtTime: e.target.value }))}
            />
          </div>
        </div>
        
        {newCampaign.expiresAt && newCampaign.expiresAtTime && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm font-medium">Credits will expire on:</p>
            <p className="text-lg font-bold">
              {new Date(`${newCampaign.expiresAt}T${newCampaign.expiresAtTime}:00`).toLocaleString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
    
    {/* Notification Settings */}
    <Card>
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="sendNotifications"
            checked={newCampaign.sendNotifications}
            onCheckedChange={(checked) => 
              setNewCampaign(prev => ({ ...prev, sendNotifications: checked }))
            }
          />
          <Label htmlFor="sendNotifications">Send notifications to tenants</Label>
        </div>
        
        {newCampaign.sendNotifications && (
          <div className="space-y-2">
            <Label>Notification Template (optional)</Label>
            <Textarea
              placeholder="You've received {creditAmount} free credits from the {campaignName} campaign!"
              value={newCampaign.notificationTemplate}
              onChange={(e) => setNewCampaign(prev => ({ ...prev, notificationTemplate: e.target.value }))}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Use {creditAmount} and {campaignName} as placeholders
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  </div>
  
  <DialogFooter>
    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
      Cancel
    </Button>
    <Button 
      onClick={handleCreateCampaign}
      disabled={!newCampaign.campaignName || !newCampaign.creditType || !newCampaign.totalCredits || !newCampaign.expiresAt}
    >
      Create Campaign
    </Button>
  </DialogFooter>
</DialogContent>
```

### 2. Campaign Distribution Interface

```jsx
// New DistributionPanel component
const DistributionPanel = ({ campaign, onRefresh }) => {
  const [isDistributing, setIsDistributing] = useState(false);
  const [distributionStatus, setDistributionStatus] = useState(null);
  
  const handleDistribute = async () => {
    try {
      setIsDistributing(true);
      
      const response = await api.post(`/admin/seasonal-credits/campaigns/${campaign.campaignId}/distribute`);
      
      if (response.data.success) {
        toast.success(`Distribution started: ${response.data.message}`);
        setDistributionStatus(response.data.data);
        onRefresh();
      }
    } catch (error) {
      console.error('Distribution failed:', error);
      toast.error(error.response?.data?.message || 'Distribution failed');
    } finally {
      setIsDistributing(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Credit Distribution</CardTitle>
        <CardDescription>
          Distribute credits to {campaign.targetAllTenants ? 'all tenants' : `${campaign.targetTenantIds?.length || 0} selected tenants`}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={campaign.distributionStatus === 'completed' ? 'default' : 
                          campaign.distributionStatus === 'processing' ? 'secondary' : 
                          campaign.distributionStatus === 'failed' ? 'destructive' : 'outline'}
            >
              {campaign.distributionStatus}
            </Badge>
          </div>
          
          {campaign.distributionStatus === 'pending' && (
            <Button onClick={handleDistribute} disabled={isDistributing}>
              {isDistributing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Distributing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Distribute Credits Now
                </>
              )}
            </Button>
          )}
        </div>
        
        {distributionStatus && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Distributed</p>
                <p className="text-2xl font-bold text-green-600">{distributionStatus.distributedCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">{distributionStatus.failedCount}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Status: {distributionStatus.status}
            </p>
          </div>
        )}
        
        {campaign.distributionStatus === 'completed' && (
          <Alert variant="success">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Credits successfully distributed to {campaign.distributedCount} tenants on {new Date(campaign.distributedAt).toLocaleString()}
            </AlertDescription>
          </Alert>
        )}
        
        {campaign.distributionStatus === 'failed' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Distribution failed. Please check logs and try again.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
```

### 3. Tenant Notification Display

```jsx
// Enhanced notification display in tenant dashboard
const CreditDistributionNotification = ({ notification }) => {
  const metadata = notification.metadata || {};
  
  return (
    <Card className="mb-4 border-l-4 border-green-500">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Gift className="h-6 w-6 text-green-500 mt-1" />
            <div>
              <h3 className="font-semibold text-green-700">{notification.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {notification.message}
              </p>
              <div className="mt-3 flex items-center gap-4 text-sm">
                <span className="font-medium">
                  +{metadata.creditAmount} Credits
                </span>
                <span className="text-muted-foreground">
                  Expires: {new Date(metadata.expiresAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          {notification.actionUrl && (
            <Button variant="outline" size="sm" asChild>
              <Link href={notification.actionUrl}>
                {notification.actionLabel || 'View'}
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
```

## Updated Workflow

### Admin Workflow:
1. **Create Campaign**: Admin creates a distribution campaign with target tenants and credit amounts
2. **Review Settings**: Admin reviews distribution settings and notification preferences
3. **Start Distribution**: Admin clicks "Distribute Credits Now" to begin automatic allocation
4. **Monitor Progress**: Admin sees real-time distribution status and results
5. **View Reports**: Admin can see detailed distribution reports and tenant allocations

### Tenant Experience:
1. **Automatic Credit Addition**: Credits automatically added to primary organization
2. **Notification Received**: Tenant receives notification about new credits
3. **Credit Visibility**: Credits appear in tenant's credit balance
4. **Expiry Tracking**: Tenant can see when credits will expire

## Updated Testing Plan

### New Test Cases:
1. **Credit Distribution**: Test automatic allocation to primary organizations
2. **Notification Delivery**: Test notification creation and display
3. **Tenant Experience**: Test credit visibility in tenant dashboard
4. **Error Handling**: Test failed distributions and error recovery
5. **Performance**: Test large-scale distribution (1000+ tenants)

### Integration Tests:
1. **End-to-End Distribution**: Create campaign → Distribute → Verify credits → Check notifications
2. **Partial Failure Handling**: Test partial success scenarios
3. **Expiry Processing**: Test credit expiry and notification warnings

## Implementation Timeline Update

### Phase 1: Core Distribution (1-2 days)
- [ ] Update database schema for distribution tracking
- [ ] Implement automatic credit allocation to primary organizations
- [ ] Create distribution service methods
- [ ] Add basic API endpoints

### Phase 2: Admin Interface (1 day)
- [ ] Enhance campaign creation form
- [ ] Add distribution monitoring interface
- [ ] Implement status tracking and reporting

### Phase 3: Tenant Experience (1 day)
- [ ] Update notification display for credit distributions
- [ ] Add credit source tracking in tenant dashboard
- [ ] Implement expiry countdown displays

### Phase 4: Testing & Deployment (1 day)
- [ ] Write distribution-specific tests
- [ ] Perform end-to-end testing
- [ ] Deploy to staging for QA
- [ ] Production deployment

## Success Metrics Update

1. **Distribution Success Rate**: 99%+ successful credit allocations
2. **Notification Delivery**: 100% of tenants receive notifications
3. **Admin Satisfaction**: Positive feedback on distribution workflow
4. **Tenant Engagement**: High notification open rates and credit usage
5. **System Performance**: Distribution completes within acceptable timeframes

## Risk Assessment Update

### New Risks:
1. **Primary Organization Identification**: Tenants without clear primary organizations
2. **Notification Overload**: Too many notifications for large distributions
3. **Credit Double-Counting**: Potential for duplicate credit allocation

### Mitigation Strategies:
1. **Fallback Logic**: Use first organization if no primary is defined
2. **Notification Throttling**: Limit notification frequency
3. **Idempotent Operations**: Ensure safe retry logic for distributions

This updated plan focuses specifically on the admin credit distribution workflow, ensuring that admins can easily distribute free credits to tenants' primary organizations with automatic notification delivery.