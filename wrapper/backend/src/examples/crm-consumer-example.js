import { CRMConsumer } from '../services/crm-consumer.js';

/**
 * Example: How to use CRM Consumer in a CRM Application
 */
class CRMApplication {
  constructor(tenantId) {
    this.tenantId = tenantId;
    this.crmConsumer = new CRMConsumer(tenantId);
    this.isRunning = false;
  }

  /**
   * Initialize the CRM application
   */
  async initialize() {
    try {
      console.log(`🚀 Starting CRM Application for tenant ${this.tenantId}`);

      // Initialize CRM consumer
      await this.crmConsumer.initialize();

      // Set up API endpoints
      await this.setupAPIEndpoints();

      // Set up UI event listeners
      await this.setupUIListeners();

      this.isRunning = true;
      console.log('✅ CRM Application initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize CRM Application:', error);
      throw error;
    }
  }

  /**
   * Set up API endpoints
   */
  async setupAPIEndpoints() {
    // Example: Check credits before creating a lead
    this.apiEndpoint('/api/leads/create', async (request, response) => {
      const { operationCode, leadData } = request.body;

      // Check if we have enough credits
      const creditCheck = await this.crmConsumer.checkCreditsForOperation(operationCode);

      if (!creditCheck.available) {
        return response.status(402).json({
          error: 'Insufficient credits',
          creditCost: creditCheck.creditCost,
          availableCredits: creditCheck.availableCredits
        });
      }

      // Proceed with lead creation
      const lead = await this.createLead(leadData);

      // Deduct credits
      await this.crmConsumer.deductCreditsForOperation(operationCode);

      return response.json({ lead, creditsDeducted: creditCheck.creditCost });
    });

    // Example: Get credit configuration
    this.apiEndpoint('/api/credit-configs', async (request, response) => {
      const operationCode = request.query.operationCode;
      const creditCost = this.crmConsumer.getCreditConfig(operationCode);

      if (!creditCost) {
        return response.status(404).json({
          error: 'Credit configuration not found',
          operationCode
        });
      }

      return response.json({
        operationCode,
        creditCost,
        available: true
      });
    });

    console.log('✅ API endpoints configured');
  }

  /**
   * Set up UI event listeners
   */
  async setupUIListeners() {
    // Example: Real-time credit display updates
    if (typeof window !== 'undefined') {
      window.addEventListener('credit-config-updated', async (event) => {
        console.log('📡 Credit configuration updated, refreshing UI');
        await this.refreshCreditDisplay();
      });

      // Example: User profile updates
      window.addEventListener('user-updated', async (event) => {
        console.log('👤 User updated, refreshing user list');
        await this.refreshUserList();
      });
    }
  }

  /**
   * Create a lead (example implementation)
   */
  async createLead(leadData) {
    // This would integrate with your CRM's lead creation logic
    console.log(`📋 Creating lead: ${leadData.name} - ${leadData.company}`);

    // Simulate lead creation
    const lead = {
      id: generateLeadId(),
      name: leadData.name,
      company: leadData.company,
      email: leadData.email,
      phone: leadData.phone,
      status: 'new',
      createdAt: new Date().toISOString()
    };

    // Store in local database
    await this.storeLead(lead);

    return lead;
  }

  /**
   * Refresh credit display in UI
   */
  async refreshCreditDisplay() {
    try {
      // Get current credit configurations
      const creditConfigs = await this.getCreditConfigs();

      // Update UI elements
      this.updateCreditDisplay(creditConfigs);

      console.log('✅ Credit display refreshed');
    } catch (error) {
      console.error('❌ Failed to refresh credit display:', error);
    }
  }

  /**
   * Refresh user list in UI
   */
  async refreshUserList() {
    try {
      // Get current users
      const users = await this.getUsers();

      // Update UI elements
      this.updateUserList(users);

      console.log('✅ User list refreshed');
    } catch (error) {
      console.error('❌ Failed to refresh user list:', error);
    }
  }

  /**
   * Get credit configurations
   */
  async getCreditConfigs() {
    // This would query your local database
    return [
      { operationCode: 'crm.leads.create', creditCost: 2.5 },
      { operationCode: 'crm.contacts.import', creditCost: 1.0 },
      { operationCode: 'crm.reports.generate', creditCost: 0.5 }
    ];
  }

  /**
   * Get users
   */
  async getUsers() {
    // This would query your local database
    return [
      { id: 'user-1', name: 'John Doe', email: 'john@company.com' },
      { id: 'user-2', name: 'Jane Smith', email: 'jane@company.com' }
    ];
  }

  /**
   * Update credit display in UI
   */
  updateCreditDisplay(creditConfigs) {
    console.log('💰 Updating credit display with:', creditConfigs);

    // Update DOM elements
    const creditContainer = document.getElementById('credit-configs');
    if (creditContainer) {
      creditContainer.innerHTML = creditConfigs.map(config => `
        <div class="credit-config-item">
          <span>${config.operationCode}</span>
          <span>${config.creditCost} credits</span>
        </div>
      `).join('');
    }
  }

  /**
   * Update user list in UI
   */
  updateUserList(users) {
    console.log('👤 Updating user list with:', users);

    // Update DOM elements
    const userContainer = document.getElementById('user-list');
    if (userContainer) {
      userContainer.innerHTML = users.map(user => `
        <div class="user-item">
          <span>${user.name}</span>
          <span>${user.email}</span>
        </div>
      `).join('');
    }
  }

  /**
   * Store lead in local database
   */
  async storeLead(lead) {
    console.log('💾 Storing lead in local database:', lead);

    // This would integrate with your CRM's database
    // Example: await this.localDB.insert('leads', lead);
  }

  /**
   * Health check
   */
  async healthCheck() {
    const crmHealth = await this.crmConsumer.healthCheck();

    return {
      status: this.isRunning ? 'healthy' : 'stopped',
      tenantId: this.tenantId,
      crmConsumer: crmHealth,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Shutdown application
   */
  async shutdown() {
    try {
      await this.crmConsumer.shutdown();
      this.isRunning = false;
      console.log('🛑 CRM Application shutdown successfully');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }

  // Mock API endpoint setup
  apiEndpoint(path, handler) {
    console.log(`📡 API endpoint registered: ${path}`);
    // This would register with your web framework (Fastify, Express, etc.)
  }
}

// Example usage
async function startCRMApplication(tenantId) {
  const crmApp = new CRMApplication(tenantId);

  try {
    await crmApp.initialize();

    // Example: Check credits before operation
    const creditCheck = await crmApp.crmConsumer.checkCreditsForOperation('crm.leads.create');
    console.log('Credit check result:', creditCheck);

    return crmApp;

  } catch (error) {
    console.error('Failed to start CRM application:', error);
    throw error;
  }
}

// Export for use in your application
export { CRMApplication, startCRMApplication };
export default CRMApplication;
