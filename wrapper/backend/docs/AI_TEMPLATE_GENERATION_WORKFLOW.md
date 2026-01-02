# AI Template Generation Workflow - Complete Guide

## Overview

This document explains the complete workflow for generating notification templates using AI in the Admin Dashboard, and how these templates are rendered and sent to tenants with automatic tenant detail filling.

## Architecture Overview

```
Admin Dashboard → Template Generation → Template Storage → Template Rendering → Notification Sending
     ↓                    ↓                    ↓                    ↓                    ↓
  Workflow          AI Service          Database Schema      Variable Substitution   Tenant Delivery
```

## Workflow Steps

### Step 1: Generate or Reuse Template

**Location:** `AdminNotificationManager.tsx` → Templates Tab

**Options:**
1. **Generate New Template with AI**
   - Navigate to "AI Tools" tab
   - Enter description/prompt
   - AI generates title and message
   - Optionally save as template

2. **Reuse Existing Template**
   - Navigate to "Templates" tab
   - Browse/search existing templates
   - Select template to use
   - Template details auto-populate in compose form

**Backend Endpoints:**
- `POST /api/admin/notifications/templates/ai-generate` - Generate template using AI
- `GET /api/admin/notifications/templates` - List all templates
- `GET /api/admin/notifications/templates/:templateId` - Get specific template

**Code Flow:**
```javascript
// Frontend: AdminNotificationManager.tsx
handleTemplateSelect(templateId) {
  const template = templates.find(t => t.templateId === templateId);
  setNotificationData({
    ...notificationData,
    type: template.type,
    priority: template.priority,
    title: template.title,
    message: template.message,
    actionUrl: template.actionUrl,
    actionLabel: template.actionLabel
  });
}
```

### Step 2: Generate Content (AI Generation)

**Location:** `AIContentGenerator.tsx` component

**Process:**
1. User enters prompt/description
2. Selects tone (professional, casual, urgent, friendly)
3. Selects length (short, medium, long)
4. Optionally selects language
5. Clicks "Generate"

**Backend Service:** `content-generation-service.js`

**AI Generation Flow:**
```javascript
// Backend: content-generation-service.js
async generateContent(prompt, options = {}) {
  const {
    tone = 'professional',
    length = 'medium',
    language = 'en',
    variables = {}
  } = options;

  const systemPrompt = this._buildSystemPrompt(tone, length, language);
  const fullPrompt = this._buildSimplePrompt(prompt, variables);

  const result = await aiServiceFactory.generateCompletion(fullPrompt, {
    systemPrompt,
    temperature: 0.7,
    maxTokens: this._getMaxTokens(length)
  });

  return {
    title: this._extractTitle(result.text),
    message: this._extractMessage(result.text),
    provider: result.provider
  };
}
```

**Backend Endpoint:**
- `POST /api/admin/notifications/ai/generate`
  ```json
  {
    "prompt": "Announce new feature release",
    "tone": "professional",
    "length": "medium",
    "language": "en",
    "variantCount": 1
  }
  ```

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "New Feature Release",
    "message": "We're excited to announce our latest feature...",
    "provider": "openai"
  }
}
```

### Step 3: Preview Template

**Location:** Compose tab → Preview button

**Process:**
1. User fills in notification details
2. Clicks "Preview" button
3. System renders preview with tenant details (if tenant selected)
4. Shows how notification will appear

**Backend Endpoint:**
- `POST /api/admin/notifications/preview`
  ```json
  {
    "title": "Hello {{tenantName}}",
    "message": "Welcome {{companyName}}!",
    "type": "system_update",
    "priority": "medium"
  }
  ```

**Template Variable Rendering:**
```javascript
// Backend: notification-template-service.js
async renderTemplate(templateId, variables = {}) {
  const template = await this.getTemplate(templateId);
  
  let title = template.title;
  let message = template.message;
  
  // Replace variables like {{tenantName}}, {{companyName}}
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    title = title.replace(regex, variables[key]);
    message = message.replace(regex, variables[key]);
  });
  
  return { title, message, ... };
}
```

### Step 4: Save Template

**Location:** After generating content → "Save as Template" button

**Process:**
1. User reviews generated content
2. Clicks "Save as Template"
3. Enters template name and category
4. Template saved to database

**Backend Endpoint:**
- `POST /api/admin/notifications/templates`
  ```json
  {
    "name": "Feature Announcement Template",
    "category": "announcements",
    "description": "Template for announcing new features",
    "type": "feature_announcement",
    "priority": "medium",
    "title": "New Feature: {{featureName}}",
    "message": "We're excited to announce {{featureName}} for {{companyName}}!",
    "variables": {
      "featureName": "string",
      "companyName": "string"
    }
  }
  ```

**Database Schema:** `notification_templates` table
- Stores template metadata
- Stores template content with variable placeholders
- Tracks usage statistics

### Step 5: Select Tenant(s) - Auto-fill Tenant Details

**Location:** `TenantSelector.tsx` component

**Process:**
1. User selects tenant(s) from dropdown/search
2. **Auto-fill happens automatically:**
   - When tenant selected, system fetches tenant details
   - Template variables are populated with tenant data
   - Preview updates in real-time

**Tenant Details Available:**
```javascript
// Available tenant fields for auto-fill:
{
  tenantId: "uuid",
  companyName: "Acme Corp",
  legalCompanyName: "Acme Corporation Inc.",
  subdomain: "acme",
  industry: "Technology",
  organizationSize: "11-50",
  website: "https://acme.com",
  adminEmail: "admin@acme.com",
  billingEmail: "billing@acme.com",
  supportEmail: "support@acme.com",
  // ... and more
}
```

**Auto-fill Implementation:**
```javascript
// Frontend: When tenant selected
const handleTenantSelect = async (tenantId) => {
  // Fetch tenant details
  const tenantDetails = await api.get(`/admin/tenants/${tenantId}/details`);
  
  // Auto-fill template variables
  const variables = {
    tenantName: tenantDetails.companyName,
    companyName: tenantDetails.companyName,
    legalCompanyName: tenantDetails.legalCompanyName,
    industry: tenantDetails.industry,
    // ... map all available fields
  };
  
  // Render template with tenant variables
  const rendered = await api.post(`/admin/notifications/templates/${templateId}/render`, {
    variables
  });
  
  // Update notification data
  setNotificationData({
    ...notificationData,
    title: rendered.title,
    message: rendered.message
  });
};
```

**Backend Endpoint for Tenant Details:**
- `GET /api/admin/tenants/:tenantId/details`
  ```json
  {
    "tenant": {
      "tenantId": "uuid",
      "companyName": "Acme Corp",
      "legalCompanyName": "Acme Corporation Inc.",
      "subdomain": "acme",
      "industry": "Technology",
      "organizationSize": "11-50",
      "website": "https://acme.com",
      "adminEmail": "admin@acme.com",
      "billingEmail": "billing@acme.com",
      "supportEmail": "support@acme.com"
    },
    "users": [...],
    "entitySummary": {...},
    "creditSummary": {...}
  }
  ```

### Step 6: Send to Tenant(s)

**Location:** Compose tab → Send button

**Options:**
1. **Send to Specific Tenant(s)**
   - Select one or more tenants
   - Each tenant gets personalized notification
   - Variables auto-filled per tenant

2. **Send to All Tenants (Bulk)**
   - Use filters (status, industry, subscription tier, etc.)
   - System fetches matching tenants
   - Each tenant gets personalized notification

**Backend Endpoints:**
- `POST /api/admin/notifications/send` - Single tenant
- `POST /api/admin/notifications/bulk-send` - Multiple tenants

**Bulk Send Flow:**
```javascript
// Backend: admin-notifications.js
async (request, reply) => {
  const { tenantIds, filters, ...notificationData } = request.body;
  
  // Get target tenants
  let targetTenantIds = [];
  if (tenantIds && tenantIds.length > 0) {
    targetTenantIds = tenantIds;
  } else if (filters) {
    // Apply filters to get tenant IDs
    targetTenantIds = await filterService.getFilteredTenants(filters);
  }
  
  // For each tenant, personalize and send
  const notificationsToCreate = await Promise.all(
    targetTenantIds.map(async (tenantId) => {
      // Fetch tenant details
      const tenantDetails = await TenantService.getTenantDetails(tenantId);
      
      // Render template with tenant variables
      const rendered = await templateService.renderTemplate(
        templateId,
        {
          tenantName: tenantDetails.companyName,
          companyName: tenantDetails.companyName,
          // ... all tenant fields
        }
      );
      
      // Create personalized notification
      return {
        tenantId,
        ...rendered,
        metadata: {
          ...notificationData.metadata,
          sentByAdmin: true,
          adminUserId: request.userContext.userId,
          templateId: templateId
        }
      };
    })
  );
  
  // Bulk create notifications
  const createdNotifications = await notificationService.bulkCreateNotifications(
    notificationsToCreate
  );
  
  // Broadcast via WebSocket
  createdNotifications.forEach(notification => {
    broadcastToTenant(notification.tenantId, notification);
  });
}
```

## Template Variable System

### Available Variables

Templates support variables using `{{variableName}}` syntax:

**Standard Variables:**
- `{{tenantName}}` - Company name
- `{{companyName}}` - Company name (alias)
- `{{legalCompanyName}}` - Legal company name
- `{{subdomain}}` - Tenant subdomain
- `{{industry}}` - Industry
- `{{organizationSize}}` - Organization size
- `{{website}}` - Company website
- `{{adminEmail}}` - Admin email
- `{{billingEmail}}` - Billing email
- `{{supportEmail}}` - Support email

**Custom Variables:**
- Can be defined in template `variables` field
- Passed during rendering

### Variable Rendering Example

**Template:**
```
Title: Welcome {{companyName}}!
Message: Hello {{tenantName}}, we're excited to have you on board. Your industry ({{industry}}) is important to us.
```

**With Tenant Data:**
```javascript
variables = {
  companyName: "Acme Corp",
  tenantName: "Acme Corp",
  industry: "Technology"
}
```

**Rendered Output:**
```
Title: Welcome Acme Corp!
Message: Hello Acme Corp, we're excited to have you on board. Your industry (Technology) is important to us.
```

## Complete Example Flow

### Scenario: Send Feature Announcement to All Active Tenants

1. **Generate Template with AI**
   ```
   Prompt: "Announce new dashboard feature"
   Tone: Professional
   Length: Medium
   ```
   → AI generates:
   ```
   Title: Introducing Our New Dashboard Feature
   Message: We're excited to announce a powerful new dashboard feature that will help {{companyName}} streamline operations.
   ```

2. **Save Template**
   - Name: "Dashboard Feature Announcement"
   - Category: "feature_announcement"
   - Variables: `{{companyName}}`

3. **Select Tenants**
   - Filter: Active tenants
   - Result: 50 tenants match

4. **Preview**
   - Shows preview with first tenant's data
   - Title: "Introducing Our New Dashboard Feature"
   - Message: "We're excited to announce a powerful new dashboard feature that will help Acme Corp streamline operations."

5. **Send**
   - System creates 50 personalized notifications
   - Each tenant gets notification with their company name
   - Notifications broadcast via WebSocket

6. **Tenant Receives**
   - Notification appears in tenant's notification center
   - Title: "Introducing Our New Dashboard Feature"
   - Message: "We're excited to announce a powerful new dashboard feature that will help [Their Company Name] streamline operations."

## Database Schema

### notification_templates Table
```sql
CREATE TABLE notification_templates (
  template_id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  type VARCHAR(100),
  priority VARCHAR(20),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  action_label VARCHAR(255),
  variables JSONB, -- Variable definitions
  metadata JSONB,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  version VARCHAR(20),
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP
);
```

## API Reference

### Template Management
- `GET /api/admin/notifications/templates` - List templates
- `POST /api/admin/notifications/templates` - Create template
- `GET /api/admin/notifications/templates/:templateId` - Get template
- `PUT /api/admin/notifications/templates/:templateId` - Update template
- `DELETE /api/admin/notifications/templates/:templateId` - Delete template
- `POST /api/admin/notifications/templates/:templateId/render` - Render template

### AI Generation
- `POST /api/admin/notifications/ai/generate` - Generate content
- `POST /api/admin/notifications/templates/ai-generate` - Generate template
- `POST /api/admin/notifications/ai/personalize` - Personalize content

### Sending
- `POST /api/admin/notifications/send` - Send to single tenant
- `POST /api/admin/notifications/bulk-send` - Send to multiple tenants
- `POST /api/admin/notifications/preview` - Preview notification

## Frontend Components

1. **AdminNotificationManager.tsx** - Main container
2. **NotificationTemplateManager.tsx** - Template management
3. **AIContentGenerator.tsx** - AI content generation
4. **TenantSelector.tsx** - Tenant selection with auto-fill
5. **NotificationAnalytics.tsx** - Analytics dashboard

## Best Practices

1. **Template Variables**
   - Use descriptive variable names
   - Document available variables
   - Provide default values when possible

2. **AI Generation**
   - Provide clear, specific prompts
   - Review generated content before saving
   - Test with multiple tenants before bulk sending

3. **Tenant Selection**
   - Use filters for targeted messaging
   - Preview with different tenant types
   - Test auto-fill with various tenant data

4. **Performance**
   - Cache templates
   - Batch tenant detail fetching
   - Use WebSocket for real-time delivery

## Troubleshooting

### Variables Not Replacing
- Check variable syntax: `{{variableName}}`
- Verify tenant data exists
- Check template variables field

### AI Generation Fails
- Check AI service configuration
- Verify API keys
- Check prompt length limits

### Auto-fill Not Working
- Verify tenant selection
- Check tenant details endpoint
- Verify variable mapping

## Future Enhancements

1. **Advanced AI Features**
   - Multi-language support
   - A/B testing variants
   - Sentiment analysis
   - Smart targeting suggestions

2. **Template Features**
   - Template versioning
   - Template categories
   - Template analytics
   - Template sharing

3. **Personalization**
   - User-level personalization
   - Behavioral targeting
   - Dynamic content
   - Preference-based delivery











