import { db } from '../db/index.js';
import { externalApplications } from '../db/schema/external-applications.js';
import { eq, sql, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

/**
 * External Application Service
 * Manages external application registration and API key management
 */
class ExternalAppService {
  /**
   * Create external application
   */
  async createApplication(appData) {
    try {
      const {
        appName,
        appDescription,
        webhookUrl,
        rateLimit = 100,
        allowedTenants = null,
        permissions = [],
        createdBy,
        metadata = {}
      } = appData;

      // Validate createdBy is a valid UUID if provided
      if (createdBy && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(createdBy)) {
        throw new Error(`Invalid createdBy UUID format: ${createdBy}`);
      }

      // Generate API key
      const apiKey = this._generateApiKey();
      const apiSecret = this._generateApiSecret();
      const webhookSecret = webhookUrl ? this._generateWebhookSecret() : null;

      // Hash credentials
      const hashedApiKey = await bcrypt.hash(apiKey, 10);
      const hashedApiSecret = apiSecret ? await bcrypt.hash(apiSecret, 10) : null;
      const hashedWebhookSecret = webhookSecret ? await bcrypt.hash(webhookSecret, 10) : null;

      // Create application
      const [app] = await db
        .insert(externalApplications)
        .values({
          appName,
          appDescription,
          apiKey: hashedApiKey,
          apiSecret: hashedApiSecret,
          webhookUrl,
          webhookSecret: hashedWebhookSecret, // Store hashed secret
          rateLimit,
          allowedTenants: allowedTenants || null, // Drizzle handles JSONB automatically
          permissions: permissions, // Drizzle handles JSONB automatically
          createdBy,
          metadata: metadata, // Drizzle handles JSONB automatically
          isActive: true
        })
        .returning();

      console.log(`✅ Created external application: ${appName}`);

      // Return app with plaintext credentials (only shown once)
      return {
        ...app,
        apiKey, // Plaintext - only returned on creation
        apiSecret, // Plaintext - only returned on creation
        webhookSecret: webhookSecret // Return generated secret (only shown once)
      };
    } catch (error) {
      console.error('Error creating external application:', error);
      throw error;
    }
  }

  /**
   * Get application by API key
   */
  async getApplicationByApiKey(apiKey) {
    try {
      // Get all active applications
      const apps = await db
        .select()
        .from(externalApplications)
        .where(eq(externalApplications.isActive, true));

      // Find matching API key
      for (const app of apps) {
        const match = await bcrypt.compare(apiKey, app.apiKey);
        if (match) {
          // Update last used
          await this._updateLastUsed(app.appId);
          return app;
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting application by API key:', error);
      throw error;
    }
  }

  /**
   * Get application by ID
   */
  async getApplication(appId) {
    try {
      const [app] = await db
        .select()
        .from(externalApplications)
        .where(eq(externalApplications.appId, appId))
        .limit(1);

      return app;
    } catch (error) {
      console.error('Error getting application:', error);
      throw error;
    }
  }

  /**
   * List all applications
   */
  async listApplications(options = {}) {
    try {
      const { isActive = null, createdBy = null } = options;
      const conditions = [];

      if (isActive !== null) {
        conditions.push(eq(externalApplications.isActive, isActive));
      }

      if (createdBy) {
        conditions.push(eq(externalApplications.createdBy, createdBy));
      }

      const apps = await db
        .select({
          appId: externalApplications.appId,
          appName: externalApplications.appName,
          appDescription: externalApplications.appDescription,
          webhookUrl: externalApplications.webhookUrl,
          rateLimit: externalApplications.rateLimit,
          isActive: externalApplications.isActive,
          createdAt: externalApplications.createdAt,
          lastUsedAt: externalApplications.lastUsedAt,
          requestCount: externalApplications.requestCount
        })
        .from(externalApplications)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(externalApplications.createdAt);

      return apps;
    } catch (error) {
      console.error('Error listing applications:', error);
      throw error;
    }
  }

  /**
   * Update application
   */
  async updateApplication(appId, updates) {
    try {
      const updateData = { ...updates };

      // Drizzle handles JSONB fields automatically, no stringification needed

      updateData.updatedAt = new Date();

      const [app] = await db
        .update(externalApplications)
        .set(updateData)
        .where(eq(externalApplications.appId, appId))
        .returning();

      if (app) {
        console.log(`✅ Updated external application: ${appId}`);
      }

      return app;
    } catch (error) {
      console.error('Error updating application:', error);
      throw error;
    }
  }

  /**
   * Rotate API key
   */
  async rotateApiKey(appId) {
    try {
      const newApiKey = this._generateApiKey();
      const hashedApiKey = await bcrypt.hash(newApiKey, 10);

      await db
        .update(externalApplications)
        .set({
          apiKey: hashedApiKey,
          updatedAt: new Date()
        })
        .where(eq(externalApplications.appId, appId));

      console.log(`✅ Rotated API key for application: ${appId}`);

      return {
        apiKey: newApiKey // Return plaintext (only shown once)
      };
    } catch (error) {
      console.error('Error rotating API key:', error);
      throw error;
    }
  }

  /**
   * Revoke application
   */
  async revokeApplication(appId) {
    try {
      const [app] = await db
        .update(externalApplications)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(externalApplications.appId, appId))
        .returning();

      if (app) {
        console.log(`🚫 Revoked external application: ${appId}`);
      }

      return app;
    } catch (error) {
      console.error('Error revoking application:', error);
      throw error;
    }
  }

  /**
   * Track API usage
   */
  async trackUsage(appId) {
    try {
      await db
        .update(externalApplications)
        .set({
          requestCount: sql`${externalApplications.requestCount} + 1`,
          lastRequestAt: new Date(),
          lastUsedAt: new Date()
        })
        .where(eq(externalApplications.appId, appId));
    } catch (error) {
      console.error('Error tracking usage:', error);
      // Don't throw - usage tracking shouldn't break the request
    }
  }

  /**
   * Generate API key
   */
  _generateApiKey() {
    const prefix = 'ntf_';
    const randomPart = randomBytes(32).toString('base64url').substring(0, 40);
    return `${prefix}${randomPart}`;
  }

  /**
   * Generate API secret
   */
  _generateApiSecret() {
    return randomBytes(32).toString('base64url');
  }

  /**
   * Generate webhook secret
   */
  _generateWebhookSecret() {
    return randomBytes(32).toString('base64url');
  }

  /**
   * Update last used timestamp
   */
  async _updateLastUsed(appId) {
    try {
      await db
        .update(externalApplications)
        .set({
          lastUsedAt: new Date(),
          lastRequestAt: new Date()
        })
        .where(eq(externalApplications.appId, appId));
    } catch (error) {
      // Silent fail for last used tracking
    }
  }
}

export const externalAppService = new ExternalAppService();
export default externalAppService;

