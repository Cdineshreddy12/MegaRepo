/**
 * WebSocket Server for Real-time Notifications
 * Replaces polling with WebSocket connections for better performance
 */

import { WebSocketServer } from 'ws';
import { parse } from 'url';

let wss = null;
const clientConnections = new Map(); // userId -> Set of WebSocket connections

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
  // This would require maintaining a tenant -> users mapping
  // For now, we'll implement user-level broadcasting
  console.log(`📢 Broadcasting to tenant ${tenantId}`);
  // TODO: Implement tenant-level broadcasting
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

export default {
  initWebSocketServer,
  sendNotificationToUser,
  broadcastToTenant,
  getWebSocketServer,
  getConnectionCount
};

