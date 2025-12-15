# Kibana & Elasticsearch Setup Guide

This guide explains how to set up centralized logging using Elasticsearch and Kibana for all your applications.

## Architecture Overview

```
┌─────────────────┐
│  Elasticsearch  │ (Port 9200)
│  + Kibana       │ (Port 5601)
└────────┬────────┘
         │
         │ HTTP Logs
         │
    ┌────┴────┐
    │         │
App A      App B      App C
(Service)  (Service)  (Service)
```
rrere3r
All applications log to the same Elasticsearch instance, and you can view/filter logs in Kibana by service name, tenant34e343r34e3 ID, etc.

## Quick Start

### 1. Start Elasticsearch & Kibana

```bash
# Start the services (runs in background)
docker compose up -d

# Check if services are running
docker compose ps

# View logs
docker compose logs -f elasticsearch
docker compose logs -f kibana
```

### 2. Verify Services

- **Elasticsearch**: http://localhost:9200
  - Should return cluster health info
- **Kibana**: http://localhost:5601
  - Open in browser to access Kibana UI

### 3. Configure Your Applications

Each application needs to:

1. Set the `SERVICE_NAME` environment variable
2. Point to the Elasticsearch URL (default: `http://localhost:9200`)

#### Example: Backend Application

```bash
# .env file or environment variables
SERVICE_NAME=wrapper-backend
ELASTICSEARCH_URL=http://localhost:9200
NODE_ENV=local
LOG_LEVEL=info
```

#### Example: Auth Service

```bash
SERVICE_NAME=auth-service
ELASTICSEARCH_URL=http://localhost:9200
NODE_ENV=local
LOG_LEVEL=info
```

#### Example: Orders Service

```bash
SERVICE_NAME=orders-service
ELASTICSEARCH_URL=http://localhost:9200
NODE_ENV=local
LOG_LEVEL=info
```

### 4. Use the Logger in Your Code

#### Option A: Use the Enhanced Logger (Recommended)

```javascript
import Logger from './utils/logger-enhanced.js';

const requestId = Logger.generateRequestId();

// Log onboarding
Logger.onboarding.start(requestId, { tenantId: '123' });
Logger.onboarding.success(requestId, 'Onboarding completed', { userId: '456' });

// Log errors
Logger.onboarding.error(requestId, 'Failed to create tenant', error, startTime);

// Log database operations
Logger.database.transaction.start(requestId, 'Create user');
Logger.database.transaction.success(requestId, 'Create user', '150ms', { userId: '789' });

// Log billing
Logger.billing.start(requestId, 'create_subscription', { tenantId: '123' });
Logger.billing.stripe.request(requestId, 'POST', '/customers', { email: 'user@example.com' });
```

#### Option B: Use the Elasticsearch Logger Directly

```javascript
import logger from './utils/elasticsearch-logger.js';

// Simple logging
logger.info('User logged in', { userId: '123', tenantId: 'tenant-1' });
logger.error('Failed to process payment', { error: error.message, tenantId: 'tenant-1' });

// Helper methods
logger.logRequest('req-123', 'POST', '/api/users', 200, 150, { userId: '123' });
logger.logError('req-123', error, { tenantId: 'tenant-1' });
logger.logDatabase('req-123', 'INSERT', 'users', 50, { userId: '123' });
logger.logActivity('req-123', 'create', 'user', 'user-123', { tenantId: 'tenant-1' });
logger.logAuth('req-123', 'login', 'user-123', 'tenant-1');
logger.logBilling('req-123', 'create_subscription', 'tenant-1', 29.99);
```

## Using Kibana

### 1. Access Kibana

Open http://localhost:5601 in your browser.

### 2. Create Index Pattern

1. Go to **Stack Management** → **Index Patterns**
2. Click **Create index pattern**
3. Enter pattern: `app-logs-*`
4. Click **Next step**
5. Select `@timestamp` as the time field
6. Click **Create index pattern**

### 3. View Logs

1. Go to **Discover** in the left sidebar
2. You'll see all logs from all services
3. Use filters to narrow down:
   - `service: "wrapper-backend"` - Filter by service name
   - `tenantId: "tenant-123"` - Filter by tenant
   - `category: "onboarding"` - Filter by category
   - `level: "error"` - Filter by log level

### 4. Common Queries

#### Filter by Service
```
service: "wrapper-backend"
```

#### Filter by Tenant
```
tenantId: "tenant-123"
```

#### Filter by Category
```
category: "onboarding"
```

#### Filter by Log Level
```
level: "error"
```

#### Combine Filters
```
service: "wrapper-backend" AND tenantId: "tenant-123" AND level: "error"
```

#### Search by Request ID
```
requestId: "req-1234567890"
```

### 5. Create Visualizations

1. Go to **Visualize** → **Create visualization**
2. Choose visualization type (e.g., Line chart, Pie chart)
3. Select your index pattern (`app-logs-*`)
4. Configure metrics and buckets
5. Save visualization

### 6. Create Dashboards

1. Go to **Dashboard** → **Create dashboard**
2. Add visualizations
3. Save dashboard

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVICE_NAME` | Name of your service | `wrapper-backend` |
| `ELASTICSEARCH_URL` | Elasticsearch endpoint | `http://localhost:9200` |
| `NODE_ENV` | Environment (local, staging, production) | `local` |
| `LOG_LEVEL` | Log level (error, warn, info, debug) | `info` |

## Stopping Services

```bash
# Stop services
docker compose down

# Stop and remove volumes (clears all logs)
docker compose down -v
```

## Troubleshooting

### Elasticsearch not accessible

```bash
# Check if Elasticsearch is running
curl http://localhost:9200

# Check Elasticsearch logs
docker compose logs elasticsearch

# Restart Elasticsearch
docker compose restart elasticsearch
```

### Kibana not accessible

```bash
# Check if Kibana is running
curl http://localhost:5601/api/status

# Check Kibana logs
docker compose logs kibana

# Restart Kibana
docker compose restart kibana
```

### Logs not appearing in Kibana

1. Verify Elasticsearch is receiving logs:
   ```bash
   curl http://localhost:9200/app-logs-*/_search?pretty
   ```

2. Check if index pattern is created correctly in Kibana

3. Verify time range in Kibana Discover (top right corner)

4. Check application logs for Elasticsearch connection errors

### Elasticsearch connection errors in application

- Ensure Elasticsearch is running: `docker compose ps`
- Check ELASTICSEARCH_URL environment variable
- Verify network connectivity: `curl http://localhost:9200`
- Check application logs for detailed error messages

## Production Considerations

For production environments:

1. **Enable Security**: Update `docker-compose.yml` to enable Elasticsearch security
2. **Persistent Storage**: Ensure volumes are properly configured
3. **Resource Limits**: Adjust memory settings based on log volume
4. **Index Lifecycle**: Set up index lifecycle management for log rotation
5. **Monitoring**: Monitor Elasticsearch cluster health
6. **Backup**: Set up regular backups of Elasticsearch data

## Multiple Applications

Each application should:

1. Use the same `ELASTICSEARCH_URL`
2. Have a unique `SERVICE_NAME`
3. Use the same logger utility (copy `elasticsearch-logger.js` or publish as npm package)

Example setup for multiple apps:

```bash
# App A
cd app-a
SERVICE_NAME=auth-service ELASTICSEARCH_URL=http://localhost:9200 npm start

# App B
cd app-b
SERVICE_NAME=orders-service ELASTICSEARCH_URL=http://localhost:9200 npm start

# App C
cd app-c
SERVICE_NAME=payments-service ELASTICSEARCH_URL=http://localhost:9200 npm start
```

All logs will appear in the same Kibana instance, filterable by `service` field.



