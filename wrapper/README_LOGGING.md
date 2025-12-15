# Centralized Logging with Elasticsearch & Kibana

This project uses Elasticsearch and Kibana for centralized log management across all applications.

## Quick Start

### 1. Start Elasticsearch & Kibana

```bash
docker compose up -d
```

This starts:
- **Elasticsearch** on http://localhost:9200
- **Kibana** on http://localhost:5601

### 2. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
SERVICE_NAME=wrapper-backend
ELASTICSEARCH_URL=http://localhost:9200
NODE_ENV=local
LOG_LEVEL=info
```

### 3. Install Dependencies

```bash
cd backend
npm install
```

### 4. Use the Logger

```javascript
import Logger from './utils/logger-enhanced.js';

const requestId = Logger.generateRequestId();
Logger.onboarding.start(requestId, { tenantId: '123' });
Logger.onboarding.success(requestId, 'Completed', { userId: '456' });
```

## Architecture

```
┌─────────────────────────────────┐
│   Elasticsearch + Kibana        │
│   (docker-compose.yml)           │
│   Ports: 9200, 5601             │
└──────────────┬──────────────────┘
               │
               │ HTTP Logs
               │
    ┌──────────┼──────────┐
    │          │          │
App A       App B      App C
(Backend)  (Auth)    (Orders)
```

All applications log to the same Elasticsearch instance. Filter logs in Kibana by:
- `service` - Service name (e.g., "wrapper-backend")
- `tenantId` - Tenant ID
- `category` - Log category (onboarding, billing, database, etc.)
- `level` - Log level (error, warn, info, debug)

## Logger Options

### Option 1: Enhanced Logger (Recommended)

Maintains backward compatibility with existing code:

```javascript
import Logger from './utils/logger-enhanced.js';

// Onboarding logs
Logger.onboarding.start(requestId, data);
Logger.onboarding.success(requestId, message, data);

// Database logs
Logger.database.transaction.start(requestId, description);
Logger.database.transaction.success(requestId, description, duration, data);

// Billing logs
Logger.billing.start(requestId, operation, data);
Logger.billing.stripe.request(requestId, method, endpoint, data);
```

### Option 2: Direct Elasticsearch Logger

Simple Winston-based logger:

```javascript
import logger from './utils/elasticsearch-logger.js';

logger.info('User logged in', { userId: '123', tenantId: 'tenant-1' });
logger.logRequest('req-123', 'POST', '/api/users', 200, 150, { userId: '123' });
logger.logError('req-123', error, { tenantId: 'tenant-1' });
```

## Viewing Logs in Kibana

1. Open http://localhost:5601
2. Go to **Stack Management** → **Index Patterns**
3. Create index pattern: `app-logs-*`
4. Go to **Discover** to view logs
5. Filter by:
   - `service: "wrapper-backend"`
   - `tenantId: "tenant-123"`
   - `category: "onboarding"`
   - `level: "error"`

## Multiple Applications

Each application should:

1. Use the same `ELASTICSEARCH_URL`
2. Have a unique `SERVICE_NAME`
3. Copy `elasticsearch-logger.js` or use as shared package

Example:

```bash
# Backend
SERVICE_NAME=wrapper-backend ELASTICSEARCH_URL=http://localhost:9200 npm start

# Auth Service
SERVICE_NAME=auth-service ELASTICSEARCH_URL=http://localhost:9200 npm start

# Orders Service
SERVICE_NAME=orders-service ELASTICSEARCH_URL=http://localhost:9200 npm start
```

All logs appear in the same Kibana instance, filterable by `service` field.

## Documentation

- [KIBANA_SETUP.md](./KIBANA_SETUP.md) - Detailed setup guide
- [backend/src/examples/logger-usage-example.js](./backend/src/examples/logger-usage-example.js) - Usage examples

## Troubleshooting

### Elasticsearch not accessible

```bash
# Check if running
docker compose ps

# Check logs
docker compose logs elasticsearch

# Restart
docker compose restart elasticsearch
```

### Logs not appearing

1. Verify Elasticsearch is running: `curl http://localhost:9200`
2. Check index exists: `curl http://localhost:9200/app-logs-*/_search?pretty`
3. Verify time range in Kibana (top right corner)
4. Check application logs for connection errors

### Connection errors

- Ensure Elasticsearch is running
- Verify `ELASTICSEARCH_URL` environment variable
- Check network connectivity: `curl http://localhost:9200`

## Stopping Services

```bash
# Stop services
docker compose down

# Stop and remove volumes (clears logs)
docker compose down -v
```



