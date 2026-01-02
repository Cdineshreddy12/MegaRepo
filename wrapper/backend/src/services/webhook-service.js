import axios from 'axios';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { externalApplications } from '../db/schema/external-applications.js';
import { eq } from 'drizzle-orm';

/**
 * Webhook Service
 * Handles sending webhooks to external applications
 */
class WebhookService {
  constructor() {
    this.timeout = parseInt(process.env.WEBHOOK_TIMEOUT || '5000');
    this.maxRetries = parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS || '3');
  }

  /**
   * Send webhook to external application
   */
  async sendWebhook(appId, eventType, payload) {
    try {
      // Get application
      const [app] = await db
        .select()
        .from(externalApplications)
        .where(eq(externalApplications.appId, appId))
        .limit(1);

      if (!app || !app.webhookUrl) {
        throw new Error('Application not found or webhook URL not configured');
      }

      // Prepare webhook payload
      const webhookPayload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        data: payload
      };

      // Generate signature
      const signature = this._generateSignature(
        JSON.stringify(webhookPayload),
        app.webhookSecret
      );

      // Send webhook with retries
      return await this._sendWithRetry(
        app.webhookUrl,
        webhookPayload,
        signature,
        app.appId
      );
    } catch (error) {
      console.error(`Error sending webhook to app ${appId}:`, error);
      throw error;
    }
  }

  /**
   * Send webhook with retry logic
   */
  async _sendWithRetry(url, payload, signature, appId, attempt = 1) {
    try {
      const response = await axios.post(url, payload, {
        headers: {
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': payload.event,
          'Content-Type': 'application/json'
        },
        timeout: this.timeout,
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
      });

      // Log webhook event
      await this._logWebhookEvent(appId, payload.event, 'success', attempt);

      return {
        success: true,
        status: response.status,
        attempt
      };
    } catch (error) {
      console.error(`Webhook attempt ${attempt} failed:`, error.message);

      // Log failure
      await this._logWebhookEvent(appId, payload.event, 'failed', attempt, error.message);

      // Retry if attempts remaining
      if (attempt < this.maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return await this._sendWithRetry(url, payload, signature, appId, attempt + 1);
      }

      // Max retries exceeded
      await this._logWebhookEvent(appId, payload.event, 'failed', attempt, 'Max retries exceeded');

      throw new Error(`Webhook delivery failed after ${this.maxRetries} attempts: ${error.message}`);
    }
  }

  /**
   * Generate HMAC signature for webhook
   */
  _generateSignature(payload, secret) {
    if (!secret) {
      return null; // No signature if secret not configured
    }

    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload, signature, secret) {
    if (!secret || !signature) {
      return false;
    }

    const expectedSignature = this._generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Log webhook event (simplified - could be enhanced with a webhook_events table)
   */
  async _logWebhookEvent(appId, eventType, status, attempt, error = null) {
    try {
      // Store in application metadata (simplified approach)
      // In production, consider a separate webhook_events table
      const [app] = await db
        .select({ metadata: externalApplications.metadata })
        .from(externalApplications)
        .where(eq(externalApplications.appId, appId))
        .limit(1);

      if (app) {
        const metadata = typeof app.metadata === 'string' 
          ? JSON.parse(app.metadata) 
          : (app.metadata || {});
        const webhookHistory = metadata.webhookHistory || [];
        
        webhookHistory.push({
          eventType,
          status,
          attempt,
          error,
          timestamp: new Date().toISOString()
        });

        // Keep only last 100 events
        if (webhookHistory.length > 100) {
          webhookHistory.shift();
        }

        await db
          .update(externalApplications)
          .set({
            metadata: {
              ...metadata,
              webhookHistory
            }
          })
          .where(eq(externalApplications.appId, appId));
      }
    } catch (error) {
      console.error('Error logging webhook event:', error);
      // Don't throw - logging shouldn't break webhook delivery
    }
  }

  /**
   * Send notification sent webhook
   */
  async notifyNotificationSent(appId, notification) {
    return await this.sendWebhook(appId, 'notification.sent', {
      notificationId: notification.notificationId,
      tenantId: notification.tenantId,
      title: notification.title,
      type: notification.type,
      priority: notification.priority,
      createdAt: notification.createdAt
    });
  }

  /**
   * Send notification failed webhook
   */
  async notifyNotificationFailed(appId, notificationId, error) {
    return await this.sendWebhook(appId, 'notification.failed', {
      notificationId,
      error: error.message || error
    });
  }

  /**
   * Send notification read webhook
   */
  async notifyNotificationRead(appId, notificationId, tenantId, userId) {
    return await this.sendWebhook(appId, 'notification.read', {
      notificationId,
      tenantId,
      userId,
      readAt: new Date().toISOString()
    });
  }

  /**
   * Send notification dismissed webhook
   */
  async notifyNotificationDismissed(appId, notificationId, tenantId, userId) {
    return await this.sendWebhook(appId, 'notification.dismissed', {
      notificationId,
      tenantId,
      userId,
      dismissedAt: new Date().toISOString()
    });
  }
}

export const webhookService = new WebhookService();
export default webhookService;

