# External Notification API Documentation

## Overview

The External Notification API allows external applications to send notifications to tenants through the notification system. This API acts as an intermediary service, handling delivery, WebSocket broadcasting, and webhook callbacks.

## Authentication

All API requests require an API key in the `X-API-Key` header.

```http
X-API-Key: ntf_your_api_key_here
```

### Getting an API Key

API keys are generated when an external application is registered through the admin dashboard. Contact your administrator to register your application.

## Base URL

```
https://your-domain.com/api/v1/notifications
```

## Rate Limiting

- Default rate limit: 100 requests per minute per application
- Bulk sends: 10 requests per minute
- Rate limit headers are included in responses:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

## Endpoints

### Send Notification to Single Tenant

**POST** `/send`

Send a notification to a single tenant.

**Request Body:**
```json
{
  "tenantId": "uuid",
  "title": "Notification Title",
  "message": "Notification message content",
  "type": "system_update",
  "priority": "medium",
  "actionUrl": "/dashboard?tab=settings",
  "actionLabel": "View Details",
  "metadata": {},
  "expiresAt": "2024-12-31T23:59:59Z",
  "scheduledAt": "2024-12-25T10:00:00Z",
  "targetUserId": "uuid",
  "useQueue": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notificationId": "uuid",
    "tenantId": "uuid",
    "title": "Notification Title",
    "createdAt": "2024-12-20T10:00:00Z"
  }
}
```

### Bulk Send Notifications

**POST** `/bulk-send`

Send notifications to multiple tenants.

**Request Body:**
```json
{
  "tenantIds": ["uuid1", "uuid2", "uuid3"],
  "title": "Notification Title",
  "message": "Notification message",
  "type": "system_update",
  "priority": "medium",
  "useQueue": true
}
```

**Response:**
```json
{
  "success": true,
  "queued": true,
  "jobId": "job-uuid",
  "totalTenants": 3,
  "message": "Notifications queued for processing"
}
```

### Send with Template

**POST** `/send-with-template`

Send notification using a pre-configured template.

**Request Body:**
```json
{
  "tenantId": "uuid",
  "templateId": "uuid",
  "variables": {
    "tenantName": "Acme Corp",
    "date": "2024-12-20"
  }
}
```

### Check Notification Status

**GET** `/status/:notificationId`

Get the current status of a notification.

**Response:**
```json
{
  "success": true,
  "data": {
    "notificationId": "uuid",
    "tenantId": "uuid",
    "title": "Notification Title",
    "type": "system_update",
    "priority": "medium",
    "isRead": false,
    "isDismissed": false,
    "createdAt": "2024-12-20T10:00:00Z"
  }
}
```

### Get Notification History

**GET** `/history`

Get history of notifications sent by your application.

**Query Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 50, max: 200)
- `tenantId` (uuid, optional)
- `startDate` (ISO 8601, optional)
- `endDate` (ISO 8601, optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "totalPages": 2
    }
  }
}
```

### Preview Notification

**POST** `/preview`

Preview how a notification will look before sending.

**Request Body:**
```json
{
  "title": "Notification Title",
  "message": "Notification message",
  "type": "system_update",
  "priority": "medium"
}
```

## Webhooks

When webhooks are configured for your application, you'll receive POST requests to your webhook URL for the following events:

### Event Types

- `notification.sent` - Notification was sent successfully
- `notification.failed` - Notification failed to send
- `notification.read` - Notification was read by a user
- `notification.dismissed` - Notification was dismissed

### Webhook Payload

```json
{
  "event": "notification.sent",
  "timestamp": "2024-12-20T10:00:00Z",
  "data": {
    "notificationId": "uuid",
    "tenantId": "uuid",
    "title": "Notification Title",
    "type": "system_update",
    "priority": "medium",
    "createdAt": "2024-12-20T10:00:00Z"
  }
}
```

### Webhook Signature Verification

Webhooks include an `X-Webhook-Signature` header with HMAC-SHA256 signature. Verify signatures using your webhook secret:

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable error message"
}
```

### Common Error Codes

- `401` - Unauthorized (invalid or missing API key)
- `403` - Forbidden (access denied for tenant)
- `404` - Not found (tenant/template not found)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Code Examples

### cURL

```bash
curl -X POST https://your-domain.com/api/v1/notifications/send \
  -H "X-API-Key: ntf_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "uuid",
    "title": "System Maintenance",
    "message": "Scheduled maintenance on Dec 25",
    "priority": "high"
  }'
```

### JavaScript

```javascript
const response = await fetch('https://your-domain.com/api/v1/notifications/send', {
  method: 'POST',
  headers: {
    'X-API-Key': 'ntf_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tenantId: 'uuid',
    title: 'System Maintenance',
    message: 'Scheduled maintenance on Dec 25',
    priority: 'high'
  })
});

const data = await response.json();
```

### Python

```python
import requests

headers = {
    'X-API-Key': 'ntf_your_api_key',
    'Content-Type': 'application/json'
}

data = {
    'tenantId': 'uuid',
    'title': 'System Maintenance',
    'message': 'Scheduled maintenance on Dec 25',
    'priority': 'high'
}

response = requests.post(
    'https://your-domain.com/api/v1/notifications/send',
    headers=headers,
    json=data
)

print(response.json())
```

## Best Practices

1. **Use Queues for Bulk Sends**: Set `useQueue: true` for bulk operations to avoid timeouts
2. **Handle Webhooks**: Implement webhook endpoints to track notification status
3. **Respect Rate Limits**: Implement exponential backoff when hitting rate limits
4. **Validate Tenant IDs**: Ensure tenant IDs exist before sending
5. **Use Templates**: Leverage templates for consistent messaging
6. **Monitor Usage**: Track your API usage through the admin dashboard

## Support

For API support, contact your administrator or refer to the admin dashboard for usage statistics and documentation updates.











