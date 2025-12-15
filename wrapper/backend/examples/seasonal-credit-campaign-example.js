#!/usr/bin/env node

/**
 * Seasonal Credit Campaign Example
 *
 * This script demonstrates how to create and manage seasonal credit campaigns
 * using the new SeasonalCreditService.
 *
 * Usage examples:
 * - Holiday promotions
 * - Product launch bonuses
 * - Loyalty programs
 * - Marketing campaigns
 */

import { SeasonalCreditService } from '../src/services/seasonal-credit-service.js';
import { SeasonalCreditNotificationService } from '../src/services/seasonal-credit-notification-service.js';

async function exampleHolidayCampaign() {
  console.log('🎄 Creating Holiday Season Credit Campaign...');

  const seasonalService = new SeasonalCreditService();
  const notificationService = new SeasonalCreditNotificationService();

  try {
    // Example: Holiday 2024 Campaign
    const campaignId = 'holiday-2024-q4';
    const campaignName = 'Holiday Season Special 2024';
    const totalCredits = 100000; // Total credits to distribute

    // Allocate credits to all tenants
    const allocations = await seasonalService.allocateSeasonalCredits({
      tenantId: null, // Will allocate to all tenants
      sourceEntityId: 'system', // System-wide allocation
      creditAmount: totalCredits,
      creditType: 'seasonal',
      campaignId,
      campaignName,
      expiresAt: new Date('2025-01-31'), // Expires end of January
      metadata: {
        occasion: 'holiday',
        year: 2024,
        quarter: 'Q4',
        marketingBudget: 50000,
        expectedConversion: 0.15
      },
      allocatedBy: 'system-admin',
      targetApplications: ['crm', 'hr'] // Focus on key applications
    });

    console.log(`✅ Allocated ${totalCredits} holiday credits to ${allocations.length} tenants`);

    // Send campaign launch notifications
    const notificationResult = await notificationService.sendCampaignLaunchNotifications(
      campaignId,
      campaignName,
      'seasonal',
      totalCredits
    );

    console.log(`📧 Sent launch notifications to ${notificationResult.emailsSent} tenants`);

  } catch (error) {
    console.error('❌ Failed to create holiday campaign:', error);
  }
}

async function exampleBonusCampaign() {
  console.log('🎁 Creating Customer Loyalty Bonus Campaign...');

  const seasonalService = new SeasonalCreditService();

  try {
    // Example: Loyalty bonus for long-term customers
    const campaignId = 'loyalty-bonus-2024';
    const campaignName = 'Thank You Bonus - 2 Years with Us!';
    const totalCredits = 50000;

    // This would typically target specific tenants based on criteria
    const targetTenantIds = ['tenant-1', 'tenant-2', 'tenant-3']; // Example IDs

    const allocations = await seasonalService.allocateSeasonalCredits({
      tenantId: null, // Would use specific tenant IDs in real scenario
      sourceEntityId: 'system',
      creditAmount: totalCredits,
      creditType: 'bonus',
      campaignId,
      campaignName,
      expiresAt: new Date('2024-12-31'), // 90 days from now
      metadata: {
        occasion: 'loyalty',
        customerTenure: '2_years',
        bonusType: 'retention'
      },
      allocatedBy: 'system-admin',
      targetApplications: ['crm', 'hr', 'affiliate']
    });

    console.log(`✅ Allocated ${totalCredits} bonus credits to ${allocations.length} loyal customers`);

  } catch (error) {
    console.error('❌ Failed to create bonus campaign:', error);
  }
}

async function examplePromotionalCampaign() {
  console.log('📢 Creating Product Launch Promotion...');

  const seasonalService = new SeasonalCreditService();
  const notificationService = new SeasonalCreditNotificationService();

  try {
    // Example: New feature launch promotion
    const campaignId = 'ai-features-launch-2024';
    const campaignName = 'Try Our New AI Features - Free Credits!';
    const totalCredits = 25000;

    const allocations = await seasonalService.allocateSeasonalCredits({
      tenantId: null, // All tenants
      sourceEntityId: 'system',
      creditAmount: totalCredits,
      creditType: 'promotional',
      campaignId,
      campaignName,
      expiresAt: new Date(Date.now() + (14 * 24 * 60 * 60 * 1000)), // 14 days
      metadata: {
        occasion: 'product_launch',
        feature: 'ai_enhancements',
        marketingChannel: 'email_campaign',
        expectedTrialRate: 0.25
      },
      allocatedBy: 'product-team',
      targetApplications: ['crm'] // Focus on CRM for AI features
    });

    console.log(`✅ Allocated ${totalCredits} promotional credits for AI feature trial`);

    // Send campaign notifications
    await notificationService.sendCampaignLaunchNotifications(
      campaignId,
      campaignName,
      'promotional',
      totalCredits
    );

  } catch (error) {
    console.error('❌ Failed to create promotional campaign:', error);
  }
}

async function exampleEventCampaign() {
  console.log('🎉 Creating Anniversary Celebration...');

  const seasonalService = new SeasonalCreditService();

  try {
    // Example: Company anniversary celebration
    const campaignId = 'company-anniversary-2024';
    const campaignName = 'Celebrating 5 Years - Special Anniversary Bonus!';
    const totalCredits = 75000;

    const allocations = await seasonalService.allocateSeasonalCredits({
      tenantId: null,
      sourceEntityId: 'system',
      creditAmount: totalCredits,
      creditType: 'event',
      campaignId,
      campaignName,
      expiresAt: new Date('2024-11-30'), // End of November
      metadata: {
        occasion: 'anniversary',
        milestone: '5_years',
        celebration: true,
        specialEvent: true
      },
      allocatedBy: 'executive-team',
      targetApplications: ['crm', 'hr', 'affiliate', 'system']
    });

    console.log(`✅ Allocated ${totalCredits} anniversary credits to all customers`);

  } catch (error) {
    console.error('❌ Failed to create event campaign:', error);
  }
}

async function demonstrateExpiryHandling() {
  console.log('⏰ Demonstrating Expiry Warning System...');

  const notificationService = new SeasonalCreditNotificationService();

  try {
    // Send warnings for credits expiring in 7 days
    const warningResult = await notificationService.sendExpiryWarnings(7);
    console.log(`📧 Sent 7-day expiry warnings to ${warningResult.emailsSent} tenants`);

    // Send urgent warnings for credits expiring in 3 days
    const urgentResult = await notificationService.sendExpiryWarnings(3);
    console.log(`🚨 Sent 3-day expiry warnings to ${urgentResult.emailsSent} tenants`);

  } catch (error) {
    console.error('❌ Failed to send expiry warnings:', error);
  }
}

async function demonstrateCampaignManagement() {
  console.log('📊 Demonstrating Campaign Management...');

  const seasonalService = new SeasonalCreditService();

  try {
    // Get all active campaigns
    const campaigns = await seasonalService.getActiveSeasonalCampaigns('all-tenants');
    console.log(`📋 Found ${campaigns.length} active seasonal campaigns`);

    // Example: Extend expiry for a campaign
    if (campaigns.length > 0) {
      const campaignToExtend = campaigns[0];
      console.log(`🔄 Extending expiry for campaign: ${campaignToExtend.campaignName}`);

      await seasonalService.extendSeasonalCreditExpiry(
        campaignToExtend.campaignId,
        null, // All tenants
        30 // Add 30 days
      );

      console.log(`✅ Extended expiry by 30 days`);
    }

  } catch (error) {
    console.error('❌ Failed to manage campaigns:', error);
  }
}

// Campaign Ideas for Different Occasions
function displayCampaignIdeas() {
  console.log('\n💡 Seasonal Credit Campaign Ideas:');
  console.log('='.repeat(60));

  const campaignIdeas = [
    {
      occasion: '🎄 Holiday Season',
      creditType: 'seasonal',
      duration: '60 days',
      examples: ['Christmas Bonus', 'New Year Special', 'Winter Promotion']
    },
    {
      occasion: '🎁 Customer Milestones',
      creditType: 'bonus',
      duration: '90 days',
      examples: ['1 Year Anniversary', '1000 Customers', 'Revenue Milestones']
    },
    {
      occasion: '📢 Product Launches',
      creditType: 'promotional',
      duration: '14 days',
      examples: ['New Feature Trial', 'Beta Program', 'Upgrade Incentives']
    },
    {
      occasion: '🎉 Special Events',
      creditType: 'event',
      duration: '7 days',
      examples: ['Company Anniversary', 'Industry Conference', 'Webinar Special']
    },
    {
      occasion: '🤝 Partnerships',
      creditType: 'partnership',
      duration: '60 days',
      examples: ['Reseller Program', 'Integration Bonus', 'Referral Credits']
    },
    {
      occasion: '⏰ Trial Extensions',
      creditType: 'trial_extension',
      duration: '30 days',
      examples: ['Extended Trial', 'Feature Preview', 'Demo Credits']
    }
  ];

  campaignIdeas.forEach(idea => {
    console.log(`\n${idea.occasion} (${idea.creditType})`);
    console.log(`   Duration: ${idea.duration}`);
    console.log(`   Examples: ${idea.examples.join(', ')}`);
  });

  console.log('\n💰 Credit Allocation Strategies:');
  console.log('   • Equal distribution across all tenants');
  console.log('   • Tiered based on subscription level (Starter/Pro/Enterprise)');
  console.log('   • Targeted to specific customer segments');
  console.log('   • Proportional to historical usage');
  console.log('   • Lottery/random selection for special campaigns');
}

// Main execution
async function main() {
  console.log('🚀 Seasonal Credit Campaign Examples\n');

  // Display campaign ideas
  displayCampaignIdeas();

  console.log('\n🎯 Running Example Campaigns...\n');

  // Run examples (commented out to prevent actual allocations in demo)
  /*
  await exampleHolidayCampaign();
  await exampleBonusCampaign();
  await examplePromotionalCampaign();
  await exampleEventCampaign();
  await demonstrateExpiryHandling();
  await demonstrateCampaignManagement();
  */

  console.log('\n✨ Examples completed! Review the code above to see how to implement your campaigns.');
  console.log('💡 Pro tip: Always test campaigns with small amounts first!');

}

// Handle command line arguments
const command = process.argv[2];

switch (command) {
  case 'holiday':
    exampleHolidayCampaign();
    break;
  case 'bonus':
    exampleBonusCampaign();
    break;
  case 'promo':
    examplePromotionalCampaign();
    break;
  case 'event':
    exampleEventCampaign();
    break;
  case 'expiry':
    demonstrateExpiryHandling();
    break;
  case 'manage':
    demonstrateCampaignManagement();
    break;
  case 'ideas':
    displayCampaignIdeas();
    break;
  default:
    main();
}

export {
  exampleHolidayCampaign,
  exampleBonusCampaign,
  examplePromotionalCampaign,
  exampleEventCampaign,
  demonstrateExpiryHandling,
  demonstrateCampaignManagement,
  displayCampaignIdeas
};
