/**
 * WebSocket Server for Real-time Notifications
 * Replaces polling with WebSocket connections for better performance
 */

import { WebSocketServer } from 'ws';
import { parse } from 'url';

let wss = null;
const clientConnections = new Map(); // userId -> Set of WebSocket connections
const tenantUserMap = new Map(); // tenantId -> Set of userIds
const userTenantMap = new Map(); // userId -> tenantId

/**
 * Initialize WebSocket server
 */
export function initWebSocketServer(server) {
  if (wss) {
    return wss;
  }

  wss = new WebSocketServer({ 
    server,
    path: '/ws',
    perMessageDeflate: false // Disable compression for lower latency
  });

  wss.on('connection', (ws, request) => {
    const url = parse(request.url, true);
    const userId = url.query.userId;
    const tenantId = url.query.tenantId;
    const token = url.query.token;

    if (!userId || !tenantId || !token) {
      console.warn('⚠️ WebSocket connection rejected: missing parameters');
      ws.close(1008, 'Missing required parameters');
      return;
    }

    // TODO: Validate token here
    // For now, accept connection

    console.log(`✅ WebSocket connected: ${userId} (tenant: ${tenantId})`);

    // Store connection
    if (!clientConnections.has(userId)) {
      clientConnections.set(userId, new Set());
    }
    clientConnections.get(userId).add(ws);

    // Maintain tenant-to-users mapping
    if (!tenantUserMap.has(tenantId)) {
      tenantUserMap.set(tenantId, new Set());
    }
    tenantUserMap.get(tenantId).add(userId);
    userTenantMap.set(userId, tenantId);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'WebSocket connection established',
      timestamp: new Date().toISOString()
    }));

    // Handle messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        handleWebSocketMessage(ws, userId, tenantId, data);
      } catch (error) {
        console.error('❌ WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      console.log(`🔌 WebSocket disconnected: ${userId}`);
      const connections = clientConnections.get(userId);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          clientConnections.delete(userId);
          
          // Clean up tenant mapping
          const userTenant = userTenantMap.get(userId);
          if (userTenant) {
            const tenantUsers = tenantUserMap.get(userTenant);
            if (tenantUsers) {
              tenantUsers.delete(userId);
              if (tenantUsers.size === 0) {
                tenantUserMap.delete(userTenant);
              }
            }
            userTenantMap.delete(userId);
          }
        }
      }
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for ${userId}:`, error);
    });

    // Send ping every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);

    ws.on('close', () => {
      clearInterval(pingInterval);
    });
  });

  console.log('✅ WebSocket server initialized');
  return wss;
}

/**
 * Handle incoming WebSocket messages
 */
function handleWebSocketMessage(ws, userId, tenantId, data) {
  switch (data.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      break;
    
    case 'subscribe':
      // Subscribe to specific notification types
      console.log(`📡 User ${userId} subscribed to:`, data.channels);
      break;
    
    default:
      console.log(`📨 Unknown message type: ${data.type}`);
  }
}

/**
 * Broadcast notification to user
 */
export function sendNotificationToUser(userId, notification) {
  const connections = clientConnections.get(userId);
  if (!connections || connections.size === 0) {
    return false;
  }

  const message = JSON.stringify({
    type: 'notification',
    data: notification,
    timestamp: new Date().toISOString()
  });

  let sent = false;
  connections.forEach(ws => {
    if (ws.readyState === ws.OPEN) {
      try {
        ws.send(message);
        sent = true;
      } catch (error) {
        console.error(`❌ Failed to send notification to ${userId}:`, error);
      }
    }
  });

  return sent;
}

/**
 * Broadcast notification to all users in a tenant
 */
export function broadcastToTenant(tenantId, notification) {
  const userIds = tenantUserMap.get(tenantId);
  if (!userIds || userIds.size === 0) {
    console.log(`⚠️ No active connections for tenant ${tenantId}`);
    return { sent: 0, total: 0 };
  }

  const message = JSON.stringify({
    type: 'notification',
    data: notification,
    timestamp: new Date().toISOString()
  });

  let sentCount = 0;
  const totalUsers = userIds.size;

  userIds.forEach(userId => {
    const connections = clientConnections.get(userId);
    if (connections && connections.size > 0) {
      connections.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
          try {
            ws.send(message);
            sentCount++;
          } catch (error) {
            console.error(`❌ Failed to send notification to ${userId}:`, error);
          }
        }
      });
    }
  });

  console.log(`📢 Broadcasted to ${sentCount} connections across ${totalUsers} users in tenant ${tenantId}`);
  return { sent: sentCount, total: totalUsers };
}

/**
 * Broadcast notification to multiple tenants
 */
export function broadcastToTenants(tenantIds, notification) {
  const results = tenantIds.map(tenantId => ({
    tenantId,
    ...broadcastToTenant(tenantId, notification)
  }));

  const totalSent = results.reduce((sum, r) => sum + r.sent, 0);
  const totalUsers = results.reduce((sum, r) => sum + r.total, 0);

  console.log(`📢 Bulk broadcasted to ${totalSent} connections across ${totalUsers} users in ${tenantIds.length} tenants`);
  return {
    results,
    summary: {
      totalSent,
      totalUsers,
      totalTenants: tenantIds.length
    }
  };
}

/**
 * Get WebSocket server instance
 */
export function getWebSocketServer() {
  return wss;
}

/**
 * Get active connection count
 */
export function getConnectionCount() {
  return clientConnections.size;
}

/**
 * Get tenant user count
 */
export function getTenantUserCount(tenantId) {
  const userIds = tenantUserMap.get(tenantId);
  return userIds ? userIds.size : 0;
}

/**
 * Get all active tenants
 */
export function getActiveTenants() {
  return Array.from(tenantUserMap.keys());
}

export default {
  initWebSocketServer,
  sendNotificationToUser,
  broadcastToTenant,
  broadcastToTenants,
  getWebSocketServer,
  getConnectionCount,
  getTenantUserCount,
  getActiveTenants
};

