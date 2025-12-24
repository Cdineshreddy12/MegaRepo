import { db } from '../db/index.js';
import { eq, and, inArray, sql, lt, gte } from 'drizzle-orm';
import { tenants, tenantUsers } from '../db/schema/index.js';
// REMOVED: creditAllocations - Table removed, applications manage their own credits
import EmailService from '../utils/email.js';
import { NotificationService } from './notification-service.js';

/**
 * ⚠️ DEPRECATED: SeasonalCreditNotificationService
 * 
 * This service was built on top of the credit allocation system which has been removed.
 * Applications now manage their own credit consumption and notifications.
 * 
 * This service needs to be refactored to use credit_transactions table instead.
 * For now, methods will throw errors indicating they need refactoring.
 */
class SeasonalCreditNotificationService {

  /**
   * Send expiry warnings for seasonal credits
   * @param {number} daysAhead - Days ahead to warn about (default: 7)
   */
  async sendExpiryWarnings(daysAhead = 7) {
    // REMOVED: creditAllocations table queries
    // TODO: Refactor to use credit_transactions table with expiry metadata
    throw new Error('sendExpiryWarnings method needs refactoring. creditAllocations table has been removed.');
  }

  /**
   * Create expiry warning notification for a specific tenant
   * @param {Object} tenantData - Tenant notification data
   */
  async createTenantExpiryWarningNotification(tenantData) {
    try {
      const { tenantId, credits } = tenantData;
      const totalCredits = credits.reduce((sum, c) => sum + c.availableCredits, 0);
      const earliestExpiry = Math.min(...credits.map(c => c.daysUntilExpiry));

      const notificationService = new NotificationService();

      await notificationService.createExpiryWarningNotification(tenantId, {
        credits,
        daysUntilExpiry: earliestExpiry,
        totalCredits
      });

      console.log(`📧 Created expiry warning notification for tenant ${tenantId} - ${totalCredits} credits expiring in ${earliestExpiry} days`);

    } catch (error) {
      console.error(`Failed to create expiry warning notification for tenant ${tenantData.tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Send expiry warning email to a specific tenant
   * @param {Object} tenantData - Tenant notification data
   */
  async sendTenantExpiryWarningEmail(tenantData) {
    try {
      const { tenantName, userEmail, userName, credits } = tenantData;

      // Group credits by expiry timeframe for better presentation
      const urgentCredits = credits.filter(c => c.daysUntilExpiry <= 3);
      const warningCredits = credits.filter(c => c.daysUntilExpiry > 3);

      const emailHtml = this.generateExpiryWarningEmailHtml({
        userName,
        tenantName,
        urgentCredits,
        warningCredits
      });

      const subject = `⏰ ${tenantName}: Seasonal Credits Expiring Soon`;

      await EmailService.sendEmail({
        to: [{ email: userEmail }],
        subject,
        htmlContent: emailHtml
      });

      console.log(`📧 Sent expiry warning to ${userEmail} (${tenantName}) - ${credits.length} credits expiring`);

    } catch (error) {
      console.error(`Failed to send expiry warning to ${tenantData.userEmail}:`, error);
      throw error;
    }
  }

  /**
   * Generate HTML email content for expiry warnings
   */
  generateExpiryWarningEmailHtml({ userName, tenantName, urgentCredits, warningCredits }) {
    const formatCredits = (credits, title, alertClass) => {
      if (credits.length === 0) return '';

      return `
        <div class="credit-section ${alertClass}">
          <h3>${title}</h3>
          <table class="credits-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Application</th>
                <th>Credits</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              ${credits.map(credit => `
                <tr>
                  <td>${credit.campaignName}</td>
                  <td>${credit.targetApplication}</td>
                  <td>${credit.availableCredits.toLocaleString()}</td>
                  <td>${credit.daysUntilExpiry === 1 ? 'Tomorrow' : `In ${credit.daysUntilExpiry} days`}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Seasonal Credits Expiring</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .urgent { background: #fff5f5; border-left: 4px solid #e53e3e; padding: 20px; margin: 20px 0; }
            .warning { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; }
            .credits-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .credits-table th, .credits-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            .credits-table th { background: #f5f5f5; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .action-button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .total-expiring { font-size: 18px; font-weight: bold; color: #e53e3e; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Seasonal Credits Expiring Soon</h1>
              <p>Hello ${userName}, action needed for ${tenantName}</p>
            </div>

            <div class="content">
              <p>We noticed you have seasonal credits that will expire soon. Don't let them go to waste!</p>

              <div class="total-expiring">
                Total Credits Expiring: ${(urgentCredits.concat(warningCredits)).reduce((sum, c) => sum + c.availableCredits, 0).toLocaleString()}
              </div>

              ${formatCredits(urgentCredits, '🚨 Expires in 3 Days or Less', 'urgent')}
              ${formatCredits(warningCredits, '⚠️ Expires Soon (4-7 Days)', 'warning')}

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'https://app.yourcompany.com'}/credits" class="action-button">
                  View & Use Credits
                </a>
              </div>

              <div style="background: #e6f7ff; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h4>💡 Quick Tips:</h4>
                <ul>
                  <li>Seasonal credits are perfect for trying new features</li>
                  <li>Allocate credits to different applications based on your needs</li>
                  <li>Credits are automatically applied when you use services</li>
                  <li>Contact support if you need help maximizing your credits</li>
                </ul>
              </div>
            </div>

            <div class="footer">
              <p>This is an automated notification from ${process.env.COMPANY_NAME || 'Your Company'} Credit System</p>
              <p>You received this because you're an admin for ${tenantName}</p>
              <p><a href="${process.env.FRONTEND_URL || 'https://app.yourcompany.com'}/settings/notifications">Manage Notifications</a></p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Send campaign launch notifications
   * @param {string} campaignId - Campaign ID
   * @param {string} campaignName - Campaign name
   * @param {string} creditType - Type of credits
   * @param {number} totalCredits - Total credits allocated
   * @param {Array} tenantIds - Optional specific tenants, null for all applicable tenants
   */
  async sendCampaignLaunchNotifications(campaignId, campaignName, creditType, totalCredits, tenantIds = null) {
    // REMOVED: creditAllocations table queries
    // TODO: Refactor to use credit_transactions table with campaign metadata
    throw new Error('sendCampaignLaunchNotifications method needs refactoring. creditAllocations table has been removed.');
  }

  /**
   * Create campaign launch notification for a tenant
   */
  async createCampaignLaunchNotification(tenantData, campaignName, creditType, campaignId = null) {
    try {
      const { tenantId, allocatedCredits } = tenantData;

      const notificationService = new NotificationService();

      await notificationService.createSeasonalCreditNotification(tenantId, {
        campaignId,
        campaignName,
        allocatedCredits: parseFloat(allocatedCredits),
        creditType,
        expiresAt: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(), // Default 30 days
        applications: [] // Will be filled from allocation data
      });

      console.log(`📧 Created campaign launch notification for tenant ${tenantId} - ${campaignName}`);

    } catch (error) {
      console.error(`Failed to create campaign launch notification for tenant ${tenantData.tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Send campaign launch email to a tenant
   */
  async sendCampaignLaunchEmail(tenantData, campaignName, creditType) {
    try {
      const { tenantName, userEmail, userName, allocatedCredits } = tenantData;

      const creditTypeConfig = {
        seasonal: { emoji: '🎄', color: '#22c55e' },
        bonus: { emoji: '🎁', color: '#f59e0b' },
        promotional: { emoji: '📢', color: '#3b82f6' },
        event: { emoji: '🎉', color: '#ec4899' },
        partnership: { emoji: '🤝', color: '#8b5cf6' },
        trial_extension: { emoji: '⏰', color: '#06b6d4' }
      };

      const config = creditTypeConfig[creditType] || { emoji: '💰', color: '#64748b' };

      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>New Credits Available</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, ${config.color} 0%, ${config.color}CC 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .credit-highlight { font-size: 24px; font-weight: bold; color: ${config.color}; text-align: center; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
              .action-button { display: inline-block; background: ${config.color}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${config.emoji} New Credits Available!</h1>
                <p>Hello ${userName}, great news for ${tenantName}</p>
              </div>

              <div class="content">
                <p>We're excited to let you know about our latest credit campaign:</p>

                <div class="credit-highlight">
                  ${config.emoji} ${campaignName}
                </div>

                <p>You've received <strong>${parseFloat(allocatedCredits).toLocaleString()} credits</strong> that you can use across all your applications!</p>

                <div style="background: #e6f7ff; padding: 20px; border-radius: 5px; margin: 20px 0;">
                  <h4>🎯 How to Use Your Credits:</h4>
                  <ul>
                    <li>Credits are automatically applied when using CRM, HR, and other services</li>
                    <li>No action needed - they're ready to use right away</li>
                    <li>Check your credit balance in the dashboard anytime</li>
                  </ul>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.FRONTEND_URL || 'https://app.yourcompany.com'}/credits" class="action-button">
                    View Your Credits
                  </a>
                </div>
              </div>

              <div class="footer">
                <p>This is an automated notification from ${process.env.COMPANY_NAME || 'Your Company'} Credit System</p>
                <p>Questions? Contact our <a href="mailto:support@yourcompany.com">support team</a></p>
              </div>
            </div>
          </body>
        </html>
      `;

      const subject = `${config.emoji} ${tenantName}: New ${campaignName} Credits Available!`;

      await EmailService.sendEmail({
        to: [{ email: userEmail }],
        subject,
        htmlContent: emailHtml
      });

      console.log(`📧 Sent campaign launch email to ${userEmail} (${tenantName}) - ${allocatedCredits} credits`);

    } catch (error) {
      console.error(`Failed to send campaign launch email to ${tenantData.userEmail}:`, error);
      throw error;
    }
  }

  /**
   * Schedule automated expiry warning emails (to be called by cron job)
   */
  async scheduleAutomatedWarnings() {
    try {
      console.log('🔄 Running automated seasonal credit expiry warnings...');

      // Send warnings for credits expiring in 7 days
      const result7Days = await this.sendExpiryWarnings(7);

      // Send urgent warnings for credits expiring in 3 days
      const result3Days = await this.sendExpiryWarnings(3);

      // Send critical warnings for credits expiring in 1 day
      const result1Day = await this.sendExpiryWarnings(1);

      console.log('✅ Completed automated seasonal credit expiry warnings');

      return {
        '7_days': result7Days,
        '3_days': result3Days,
        '1_day': result1Day
      };

    } catch (error) {
      console.error('Error in automated seasonal credit expiry warnings:', error);
      throw error;
    }
  }
}

export { SeasonalCreditNotificationService };
export default SeasonalCreditNotificationService;



