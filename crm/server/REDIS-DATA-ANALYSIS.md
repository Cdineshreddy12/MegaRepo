# Redis Stream Data Analysis (via MCP)

## Summary

This document shows the data fetched from Redis streams using MCP (Model Context Protocol) tools and what's being consumed by the CRM system.

## Redis Server Info

- **Redis Version**: 7.4.7
- **Total Keys**: 8
- **Used Memory**: 2.67M
- **Connected Clients**: 4
- **Uptime**: 12 hours

## Streams Found

The following Redis streams were discovered:

1. `crm:sync:role:role_created` - CRM role creation events
2. `affiliateConnect:sync:role:role_created` - AffiliateConnect role creation events
3. `hr:sync:role:role_created` - HR application role creation events
4. `project_management:sync:role:role_created` - Project Management role creation events
5. `affiliateConnect:sync:role:role_deleted` - AffiliateConnect role deletion events

## Data Analysis

### 1. CRM Role Creation Event

**Stream**: `crm:sync:role:role_created`  
**Message ID**: `1767290905749-0`  
**Timestamp**: `2026-01-01T18:08:25.747Z`

**Event Details**:
- **Event Type**: `role.created`
- **Tenant ID**: `62fd1ba9-0ed1-46c9-882a-b4783c8fdfa8`
- **Entity ID**: `e2064fd3-533d-4b51-a25e-95500ef01eab`
- **Role Name**: "all apps"
- **Created By**: `4f015f05-d42d-446c-a6e6-4d4322e3afdd`
- **Created At**: `2026-01-01T18:08:25.000Z`

**Permissions (CRM)**:
- `form_builder`: read, read_all, create, update, delete, export, import, publish, duplicate, view_analytics, manage_layout
- `leads`: read, read_all, create, update, delete, export, import, assign, convert
- `analytics`: read, read_all, create, update, delete, export, calculate, generate_formula, validate_formula, suggest_metrics, generate_insights, manage_dashboards, view_dashboards

### 2. AffiliateConnect Role Creation Event

**Stream**: `affiliateConnect:sync:role:role_created`  
**Message ID**: `1767290905757-0`  
**Same Role ID**: `e2064fd3-533d-4b51-a25e-95500ef01eab`

**Permissions (AffiliateConnect)**:
- `dashboard`: view, customize, export
- `analytics`: read, read_all, create, update, delete, export, calculate, generate_formula, validate_formula, suggest_metrics, generate_insights, manage_dashboards, view_dashboards
- `communications`: read, read_all, create, update, delete, export, send, schedule

### 3. HR Role Creation Event

**Stream**: `hr:sync:role:role_created`  
**Message ID**: `1767290905757-0`  
**Same Role ID**: `e2064fd3-533d-4b51-a25e-95500ef01eab`

**Permissions (HR)**:
- `employees`: read, read_all, create, update, delete, view_salary, export
- `payroll`: read, process, approve, export, generate_reports
- `leave`: read, create, approve, reject, cancel, export

### 4. Project Management Role Creation Event

**Stream**: `project_management:sync:role:role_created`  
**Message ID**: `1767290905758-0`  
**Same Role ID**: `e2064fd3-533d-4b51-a25e-95500ef01eab`

**Permissions (Project Management)**:
- `sprints`: read, read_all, create, update, delete, export, start, complete, cancel, manage_capacity, assign_tasks, view_burndown
- `team`: read, read_all, create, update, delete, export, import, assign_roles, manage_permissions, view_performance, manage_availability
- `documents`: read, read_all, create, update, delete, export, download, share, version_control, add_comments, approve, manage_permissions

### 5. AffiliateConnect Role Deletion Event

**Stream**: `affiliateConnect:sync:role:role_deleted`  
**Message ID**: `1767289704734-0`  
**Timestamp**: `2026-01-01T17:48:24.732Z`

**Event Details**:
- **Event Type**: `role.deleted`
- **Tenant ID**: `62fd1ba9-0ed1-46c9-882a-b4783c8fdfa8`
- **Entity ID**: `711f157d-078f-4cea-971d-a55acd921f40`
- **Role Name**: "Affiliate "
- **Deleted By**: `554f15c5-adfb-44e7-99f6-a0529088b026`
- **Deleted At**: `2026-01-01T17:48:24.732Z`
- **Affected Users Count**: 2

## Key Observations

1. **Multi-Application Sync**: The same role ID (`e2064fd3-533d-4b51-a25e-95500ef01eab`) appears in multiple application streams (CRM, AffiliateConnect, HR, Project Management), indicating cross-application role synchronization.

2. **Event Structure**: All events follow a consistent structure:
   - `eventId`: Unique event identifier
   - `timestamp`: ISO 8601 timestamp
   - `eventType`: Type of event (role.created, role.deleted)
   - `tenantId`: Tenant identifier
   - `entityType`: Type of entity (role)
   - `entityId`: Entity identifier
   - `data`: JSON string containing detailed event data
   - `publishedBy`: User ID who published the event

3. **Role Data Structure**: Role data includes:
   - `roleId`: Unique role identifier
   - `roleName`: Human-readable role name
   - `description`: Role description
   - `permissions`: Object with application-specific permissions
   - `restrictions`: JSON string with time, IP, data, and feature restrictions
   - `metadata`: Additional metadata
   - `createdBy`/`deletedBy`: User who performed the action
   - `createdAt`/`deletedAt`: Timestamp of the action

4. **Consumption Pattern**: 
   - Multiple applications are consuming role events
   - Events are synchronized across applications
   - Role deletions track affected users count

## Validation Recommendations

To validate this data against the CRM database, check:

1. **Role Records**: Verify that role with ID `e2064fd3-533d-4b51-a25e-95500ef01eab` exists in CRM database
2. **Role Permissions**: Verify permissions match what's stored in CRM
3. **User Assignments**: For deleted roles, verify that 2 users were affected (as indicated by `affectedUsersCount`)
4. **Tenant Consistency**: Ensure all events belong to tenant `62fd1ba9-0ed1-46c9-882a-b4783c8fdfa8`
5. **Timestamps**: Verify creation/deletion timestamps match database records

## Next Steps

1. Check if there are more streams (credit-events, user events, organization events)
2. Validate role data against CRM MongoDB database
3. Check consumer groups and pending messages
4. Monitor stream health and consumption rates


