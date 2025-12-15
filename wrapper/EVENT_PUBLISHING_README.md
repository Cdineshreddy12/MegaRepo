# Event Publishing Documentation

This document describes how the Wrapper API publishes events to Redis Streams for real-time synchronization with the CRM system and other applications.

## Overview

The Wrapper API uses Redis Streams to publish events when important actions occur in the system. All events follow a consistent structure and are published to streams with the naming convention: `crm:sync:{entityType}:{eventType}`.

## Event Publishing Utility

All events are published through the `CrmSyncStreams` class located in `/backend/src/utils/redis.js`. This class provides methods for publishing different types of events:

- `publishUserEvent()` - For user lifecycle events
- `publishRoleEvent()` - For role and permission events

## Event Structure

All events follow this standard structure:

```json
{
  "streamId": "crm:sync:user:user_created",
  "messageId": "unique-message-id",
  "timestamp": "2025-12-04T10:00:00.000Z",
  "sourceApp": "wrapper-api",
  "eventType": "user_created",
  "entityType": "user",
  "entityId": "user-uuid",
  "tenantId": "tenant-uuid",
  "action": "created",
  "data": "{...event-specific-data-as-json-string...}",
  "metadata": "{...metadata-as-json-string...}"
}
```

**Important Notes:**
- The `data` field is a **JSON string**, not an object
- The `metadata` field is a **JSON string**, not an object
- All timestamps are in ISO 8601 format
- All IDs are UUIDs (36-character strings with hyphens)

---

## User Events

### 1. User Created Event

**Stream:** `crm:sync:user:user_created`  
**Event Type:** `user_created`  
**When Published:** When a user accepts an invitation and their account is created

**Data Structure:**
```json
{
  "userId": "c8e9f140-be15-4656-9046-bfee3eae7a38",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "name": "John Doe",
  "isActive": true,
  "createdAt": "2025-12-04T10:00:00.000Z"
}
```

**Required Fields:**
- `userId` (string, UUID)
- `email` (string)
- `createdAt` (string, ISO 8601)

**Optional Fields:**
- `firstName` (string)
- `lastName` (string)
- `name` (string)
- `isActive` (boolean, default: true)

**Published From:**
- `/backend/src/services/tenant-service.js` - `acceptInvitation()` method (line 622)
- `/backend/src/routes/invitations.js` - `/accept-by-token` endpoint (line 2108)

**Example Code:**
```javascript
await crmSyncStreams.publishUserEvent(tenantId, 'user_created', {
  userId: user.userId,
  email: user.email,
  firstName: firstName,
  lastName: lastName,
  name: user.name || `${firstName} ${lastName}`.trim(),
  isActive: user.isActive !== undefined ? user.isActive : true,
  createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString()
});
```

---

### 2. User Deactivated Event

**Stream:** `crm:sync:user:user_deactivated`  
**Event Type:** `user_deactivated`  
**When Published:** When a user is soft-deactivated (isActive set to false, but user record remains)

**Data Structure:**
```json
{
  "userId": "c8e9f140-be15-4656-9046-bfee3eae7a38",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "name": "John Doe",
  "deactivatedAt": "2025-12-04T10:00:00.000Z",
  "deactivatedBy": "admin-user-id",
  "reason": "manual_deactivation"
}
```

**Required Fields:**
- `userId` (string, UUID)
- `deactivatedAt` (string, ISO 8601)

**Optional Fields:**
- `email` (string)
- `firstName` (string)
- `lastName` (string)
- `name` (string)
- `deactivatedBy` (string, UUID) - ID of user/admin who deactivated
- `reason` (string) - Reason for deactivation

**Reason Values:**
- `"manual_deactivation"` - User deactivated via UI
- `"user_deactivated"` - System-initiated deactivation

**Published From:**
- `/backend/src/routes/tenants.js` - POST `/current/users/:userId/deactivate` (line 746)
- `/backend/src/services/tenant-service.js` - `removeActiveUser()` method (line 1588)

**Example Code:**
```javascript
await crmSyncStreams.publishUserEvent(tenantId, 'user_deactivated', {
  userId: updatedUser.userId,
  email: updatedUser.email,
  firstName: firstName,
  lastName: lastName,
  name: updatedUser.name || `${firstName} ${lastName}`.trim(),
  deactivatedAt: new Date().toISOString(),
  deactivatedBy: request.userContext.internalUserId,
  reason: 'manual_deactivation'
});
```

---

### 3. User Deleted Event

**Stream:** `crm:sync:user:user_deleted`  
**Event Type:** `user_deleted`  
**When Published:** When a user is permanently deleted from the database

**Data Structure:**
```json
{
  "userId": "c8e9f140-be15-4656-9046-bfee3eae7a38",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "name": "John Doe",
  "deletedAt": "2025-12-04T10:00:00.000Z",
  "deletedBy": "admin-user-id",
  "reason": "user_deleted_permanently"
}
```

**Required Fields:**
- `userId` (string, UUID)
- `deletedAt` (string, ISO 8601)

**Optional Fields:**
- `email` (string)
- `firstName` (string)
- `lastName` (string)
- `name` (string)
- `deletedBy` (string, UUID) - ID of user/admin who deleted
- `reason` (string) - Reason for deletion

**Reason Values:**
- `"user_deleted_permanently"` - User deleted via admin endpoint
- `"user_removed_from_tenant"` - User removed via tenant service

**Published From:**
- `/backend/src/routes/admin.js` - DELETE `/users/:userId` (line 1022)
- `/backend/src/services/tenant-service.js` - `removeUser()` method (line 1485)

**Example Code:**
```javascript
await crmSyncStreams.publishUserEvent(tenantId, 'user_deleted', {
  userId: userToDelete.userId,
  email: userToDelete.email,
  firstName: firstName,
  lastName: lastName,
  name: userToDelete.name || `${firstName} ${lastName}`.trim(),
  deletedAt: new Date().toISOString(),
  deletedBy: request.userContext.internalUserId,
  reason: 'user_deleted_permanently'
});
```

---

## Role Events

### 4. Role Updated Event

**Stream:** `crm:sync:permissions:role_updated`  
**Event Type:** `role_updated`  
**When Published:** When a role's permissions, name, description, or other properties are updated

**Data Structure:**
```json
{
  "roleId": "135ab564-542b-412a-8fa1-9a7d02ec92cf",
  "roleName": "Updated Role Name",
  "description": "Role description",
  "permissions": {
    "crm": {
      "leads": ["read", "create", "update"],
      "accounts": ["read", "read_all"]
    }
  },
  "restrictions": {},
  "updatedBy": "admin-user-id",
  "updatedAt": "2025-12-04T10:00:00.000Z"
}
```

**Required Fields:**
- `roleId` (string, UUID)
- `updatedAt` (string, ISO 8601)

**Optional Fields:**
- `roleName` (string)
- `description` (string)
- `permissions` (object) - Hierarchical permission structure
- `restrictions` (object) - Role restrictions
- `updatedBy` (string, UUID) - ID of user/admin who updated
- `isSystemRole` (boolean)

**Published From:**
- `/backend/src/routes/custom-roles.js` - PUT `/update-from-builder/:roleId` (line 174)
- `/backend/src/services/custom-role-service.js` - `updateRoleFromAppsAndModules()` (line 475)
- `/backend/src/services/permissionService.js` - `updateRole()` (line 380)
- `/backend/src/services/permissionService.js` - `updateAdvancedRole()` (line 2005)
- `/backend/src/routes/admin.js` - PUT `/roles/:roleId` (line 1383)

**Example Code:**
```javascript
await crmSyncStreams.publishRoleEvent(tenantId, 'role_updated', {
  roleId: updatedRole.roleId,
  roleName: updatedRole.roleName,
  description: updatedRole.description,
  permissions: typeof updatedRole.permissions === 'string'
    ? JSON.parse(updatedRole.permissions)
    : updatedRole.permissions,
  restrictions: typeof updatedRole.restrictions === 'string'
    ? JSON.parse(updatedRole.restrictions)
    : updatedRole.restrictions,
  updatedBy: request.userContext.internalUserId,
  updatedAt: updatedRole.updatedAt || new Date().toISOString()
});
```

---

## Implementation Details

### Error Handling

All event publishing is wrapped in try-catch blocks to ensure that failures in event publishing don't break the main operation:

```javascript
try {
  await crmSyncStreams.publishUserEvent(tenantId, 'user_created', userData);
  console.log('📡 Published user_created event to Redis streams');
} catch (publishError) {
  console.warn('⚠️ Failed to publish user_created event:', publishError.message);
  // Don't fail the operation if event publishing fails
}
```

### Name Parsing

For user events, names are automatically split into `firstName` and `lastName`:

```javascript
const nameParts = (user.name || '').split(' ');
const firstName = nameParts[0] || '';
const lastName = nameParts.slice(1).join(' ') || '';
```

### Permission Format

Role permissions are stored as JSON strings in the database but are parsed to objects before publishing:

```javascript
permissions: typeof role.permissions === 'string'
  ? JSON.parse(role.permissions)
  : role.permissions
```

---

## Event Flow Summary

### User Lifecycle Events

1. **User Invitation** → No event published (invitation is pending)
2. **User Accepts Invitation** → `user_created` event published
3. **User Deactivated** → `user_deactivated` event published
4. **User Deleted** → `user_deleted` event published

### Role Lifecycle Events

1. **Role Created** → No event published (roles are created but not synced until updated)
2. **Role Updated** → `role_updated` event published
3. **Role Assigned** → `role_assigned` event published (separate event)
4. **Role Unassigned** → `role_unassigned` event published (separate event)

---

## Testing Events

To test event publishing, you can:

1. **Monitor Redis Streams:**
   ```bash
   redis-cli XREAD STREAMS crm:sync:user:user_created 0
   ```

2. **Check Event Logs:**
   Look for console logs with `📡 Published` prefix in the application logs

3. **Verify Event Structure:**
   Events should match the structure defined above with proper JSON stringification

---

## Notes

- **User Invited Event:** Currently, there is no `user_invited` event published when invitations are created. Only `user_created` is published when the invitation is accepted.

- **Event Ordering:** Events are published synchronously before the main operation completes to ensure they're sent even if the operation fails afterward.

- **Idempotency:** The CRM system handles duplicate events gracefully. If an event is processed multiple times, it will be treated as idempotent.

- **Tenant Isolation:** All events include `tenantId` to ensure proper data isolation in multi-tenant environments.

---

## Related Files

- `/backend/src/utils/redis.js` - Event publishing utilities
- `/backend/src/services/tenant-service.js` - User lifecycle management
- `/backend/src/routes/admin.js` - Admin endpoints
- `/backend/src/routes/tenants.js` - Tenant management endpoints
- `/backend/src/services/permissionService.js` - Role management
- `/backend/src/services/custom-role-service.js` - Custom role management

