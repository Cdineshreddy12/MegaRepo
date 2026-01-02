/**
 * Health Check API Tests
 * 
 * These tests verify that the health check endpoints work correctly.
 * This is a critical endpoint for monitoring and deployment verification.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import healthRoutes from '../routes/health.js';

// Create a test Fastify instance
let app;

beforeAll(async () => {
  app = Fastify();
  
  // Register health routes
  await app.register(healthRoutes);
  
  // Mock database and Redis for testing
  app.decorate('db', {
    execute: async (query) => {
      // Mock successful database query
      return { rows: [{ count: 1 }] };
    }
  });
  
  app.decorate('redis', {
    ping: async () => 'PONG'
  });
  
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('Health Check Endpoints', () => {
  describe('GET /health', () => {
    it('should return 200 with healthy status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      
      expect(body).toHaveProperty('status', 'healthy');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('uptime');
      expect(body).toHaveProperty('environment');
      expect(body).toHaveProperty('version');
      expect(body).toHaveProperty('memory');
    });

    it('should include database connection status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      const body = response.json();
      expect(body).toHaveProperty('database', 'connected');
    });

    it('should include Redis connection status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      const body = response.json();
      expect(body).toHaveProperty('redis', 'connected');
    });

    it('should return 503 if database is disconnected', async () => {
      // Temporarily mock database failure
      app.db.execute = async () => {
        throw new Error('Database connection failed');
      };

      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(503);
      const body = response.json();
      expect(body).toHaveProperty('status', 'unhealthy');
      expect(body).toHaveProperty('database', 'disconnected');

      // Restore mock
      app.db.execute = async () => ({ rows: [{ count: 1 }] });
    });
  });

  describe('GET /health/detailed', () => {
    it('should return detailed health information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/detailed'
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('services');
      expect(body.services).toHaveProperty('database');
      expect(body.services).toHaveProperty('redis');
      expect(body.services.database).toHaveProperty('status', 'healthy');
      expect(body.services.database).toHaveProperty('responseTime');
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 when all services are ready', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready'
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      
      expect(body).toHaveProperty('ready', true);
      expect(body).toHaveProperty('checks');
      expect(body.checks).toHaveProperty('database', 'ready');
      expect(body.checks).toHaveProperty('redis', 'ready');
    });

    it('should return 503 when services are not ready', async () => {
      // Mock database failure
      app.db.execute = async () => {
        throw new Error('Database not ready');
      };

      const response = await app.inject({
        method: 'GET',
        url: '/health/ready'
      });

      expect(response.statusCode).toBe(503);
      const body = response.json();
      expect(body).toHaveProperty('ready', false);
      expect(body.checks).toHaveProperty('database', 'not_ready');

      // Restore mock
      app.db.execute = async () => ({ rows: [{ count: 1 }] });
    });
  });

  describe('GET /health/live', () => {
    it('should return 200 indicating the app is alive', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/live'
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      
      expect(body).toHaveProperty('alive', true);
      expect(body).toHaveProperty('pid');
      expect(body).toHaveProperty('uptime');
    });
  });

  describe('GET /health/deployment', () => {
    it('should return deployment information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/deployment'
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('environment');
      expect(body).toHaveProperty('version');
      expect(body).toHaveProperty('nodeVersion');
      expect(body).toHaveProperty('platform');
      expect(body).toHaveProperty('memory');
      expect(body).toHaveProperty('uptime');
      expect(body).toHaveProperty('pid');
    });
  });
});

