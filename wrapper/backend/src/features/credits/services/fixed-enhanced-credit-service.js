// Fixed Enhanced Credit Service - Works with entity_id and generated entity_key
import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL);

/**
 * Fixed Enhanced Credit Service
 * Works with entity_id in credit_configurations table
 * Handles both direct entity_id queries and generated entity_key for constraints
 */
class FixedEnhancedCreditService {

  /**
   * Get effective cost for an operation with hierarchical resolution
   * Priority: Entity-Specific → Tenant-Wide → Global
   */
  async getEffectiveCost(operationCode, entityId, tenantId) {
    try {
      // 1. Try entity-specific configuration first
      const entityConfig = await sql`
        SELECT credit_cost, unit
        FROM credit_configurations
        WHERE tenant_id = ${tenantId}
        AND entity_id = ${entityId}
        AND operation_code = ${operationCode}
        AND is_active = true
        LIMIT 1
      `;

      if (entityConfig.length > 0) {
        return {
          cost: parseFloat(entityConfig[0].credit_cost),
          unit: entityConfig[0].unit,
          source: 'Entity-Specific',
          hierarchy: 'Entity'
        };
      }

      // 2. Fall back to tenant-wide configuration
      const tenantConfig = await sql`
        SELECT credit_cost, unit
        FROM credit_configurations
        WHERE tenant_id = ${tenantId}
        AND entity_id IS NULL
        AND operation_code = ${operationCode}
        AND is_active = true
        LIMIT 1
      `;

      if (tenantConfig.length > 0) {
        return {
          cost: parseFloat(tenantConfig[0].credit_cost),
          unit: tenantConfig[0].unit,
          source: 'Tenant-Wide Default',
          hierarchy: 'Tenant'
        };
      }

      // 3. Fall back to global configuration
      const globalConfig = await sql`
        SELECT credit_cost, unit
        FROM credit_configurations
        WHERE tenant_id IS NULL
        AND operation_code = ${operationCode}
        AND is_active = true
        LIMIT 1
      `;

      if (globalConfig.length > 0) {
        return {
          cost: parseFloat(globalConfig[0].credit_cost),
          unit: globalConfig[0].unit,
          source: 'Global Default',
          hierarchy: 'Global'
        };
      }

      throw new Error(`No configuration found for operation: ${operationCode}`);

    } catch (error) {
      console.error('Error getting effective cost:', error);
      throw error;
    }
  }

  /**
   * Consume credits with entity-specific pricing
   */
  async consumeCredits(operationCode, entityId, tenantId, userId, quantity = 1) {
    try {
      // Get effective cost
      const costDetails = await this.getEffectiveCost(operationCode, entityId, tenantId);
      const totalCost = costDetails.cost * quantity;

      // Check entity credit balance
      const balanceResult = await sql`
        SELECT available_credits
        FROM credits
        WHERE tenant_id = ${tenantId}
        AND entity_id = ${entityId}
        LIMIT 1
      `;

      if (balanceResult.length === 0) {
        throw new Error('No credit balance found for entity');
      }

      const availableCredits = parseFloat(balanceResult[0].available_credits);

      if (availableCredits < totalCost) {
        throw new Error(`Insufficient credits. Available: ${availableCredits}, Required: ${totalCost}`);
      }

      // Deduct credits
      await sql`
        UPDATE credits
        SET available_credits = available_credits - ${totalCost},
            last_updated_at = now()
        WHERE tenant_id = ${tenantId}
        AND entity_id = ${entityId}
      `;

      // Record transaction
      await sql`
        INSERT INTO credit_transactions (
          tenant_id, entity_id, transaction_type, amount,
          previous_balance, new_balance, operation_code, created_at
        ) VALUES (
          ${tenantId}, ${entityId}, 'consumption', ${totalCost},
          ${availableCredits}, ${availableCredits - totalCost}, ${operationCode}, now()
        )
      `;

      return {
        success: true,
        operationCode,
        quantity,
        costDetails,
        totalCost,
        newBalance: availableCredits - totalCost,
        entitySpecific: costDetails.hierarchy === 'Entity'
      };

    } catch (error) {
      console.error('Error consuming credits:', error);
      return {
        success: false,
        error: error.message,
        operationCode,
        quantity
      };
    }
  }

  /**
   * Create or update entity-specific credit configuration
   * Fixed to work with the new unique constraint using entity_key
   */
  async setEntityCreditConfig(operationCode, entityId, tenantId, creditCost, userId) {
    try {
      const result = await sql`
        INSERT INTO credit_configurations (
          tenant_id, entity_id, operation_code, is_global,
          credit_cost, unit, is_active, created_by, updated_by
        ) VALUES (
          ${tenantId}, ${entityId}, ${operationCode}, false,
          ${creditCost}, 'operation', true, ${userId}, ${userId}
        )
        ON CONFLICT (tenant_id, entity_key, operation_code)
        DO UPDATE SET
          credit_cost = EXCLUDED.credit_cost,
          updated_at = now(),
          updated_by = EXCLUDED.updated_by
        RETURNING *
      `;

      return {
        success: true,
        config: result[0],
        created: result[0].created_at === result[0].updated_at
      };

    } catch (error) {
      console.error('Error setting entity credit config:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all credit configurations for a tenant with entity information
   */
  async getTenantCreditConfigurations(tenantId) {
    try {
      const configs = await sql`
        SELECT
          cc.operation_code,
          cc.credit_cost,
          cc.unit,
          cc.entity_id,
          e.entity_name,
          e.entity_type,
          cc.created_at
        FROM credit_configurations cc
        LEFT JOIN entities e ON cc.entity_id = e.entity_id
        WHERE cc.tenant_id = ${tenantId}
        AND cc.is_active = true
        ORDER BY cc.operation_code, cc.entity_id
      `;

      // Group by operation
      const grouped = {};
      configs.forEach(config => {
        if (!grouped[config.operation_code]) {
          grouped[config.operation_code] = [];
        }
        grouped[config.operation_code].push(config);
      });

      return grouped;

    } catch (error) {
      console.error('Error getting tenant configurations:', error);
      return {};
    }
  }

  /**
   * Get pricing comparison between entities for a specific operation
   */
  async getPricingComparison(tenantId, operationCode) {
    try {
      const comparison = await sql`
        SELECT
          e.entity_name,
          cc.credit_cost,
          cc.unit
        FROM entities e
        LEFT JOIN credit_configurations cc ON
          cc.entity_id = e.entity_id
          AND cc.operation_code = ${operationCode}
          AND cc.is_active = true
        WHERE e.tenant_id = ${tenantId}
        AND e.entity_type = 'branch'
        ORDER BY e.entity_name
      `;

      // Get tenant default
      const tenantDefault = await sql`
        SELECT credit_cost, unit
        FROM credit_configurations
        WHERE tenant_id = ${tenantId}
        AND entity_id IS NULL
        AND operation_code = ${operationCode}
        AND is_active = true
        LIMIT 1
      `;

      return {
        operationCode,
        tenantDefault: tenantDefault.length > 0 ? tenantDefault[0] : null,
        entityPricing: comparison.map(c => ({
          entityName: c.entity_name,
          cost: c.credit_cost ? parseFloat(c.credit_cost) : null,
          unit: c.unit
        }))
      };

    } catch (error) {
      console.error('Error getting pricing comparison:', error);
      return { error: error.message };
    }
  }

  /**
   * Bulk create entity-specific configurations
   * Useful for setting up multiple operations for a branch at once
   */
  async bulkCreateEntityConfigs(entityId, tenantId, userId, configurations) {
    try {
      const results = [];

      for (const config of configurations) {
        const result = await this.setEntityCreditConfig(
          config.operationCode,
          entityId,
          tenantId,
          config.creditCost,
          userId
        );

        results.push({
          operationCode: config.operationCode,
          creditCost: config.creditCost,
          success: result.success,
          created: result.created
        });
      }

      const successful = results.filter(r => r.success).length;
      const total = results.length;

      return {
        success: successful === total,
        total,
        successful,
        failed: total - successful,
        results
      };

    } catch (error) {
      console.error('Error in bulk create:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get credit consumption summary for entities
   */
  async getConsumptionSummary(tenantId, entityIds = null) {
    try {
      let query = `
        SELECT
          e.entity_name,
          e.entity_type,
          SUM(ct.amount) as total_consumed,
          COUNT(ct.transaction_id) as transaction_count,
          MAX(ct.created_at) as last_transaction
        FROM entities e
        LEFT JOIN credit_transactions ct ON
          ct.entity_id = e.entity_id
          AND ct.transaction_type = 'consumption'
        WHERE e.tenant_id = $1
      `;

      const params = [tenantId];

      if (entityIds && entityIds.length > 0) {
        query += ` AND e.entity_id = ANY($2)`;
        params.push(entityIds);
      }

      query += ` GROUP BY e.entity_id, e.entity_name, e.entity_type ORDER BY e.entity_name`;

      const results = await sql.unsafe(query, params);

      return results.map(row => ({
        entityName: row.entity_name,
        entityType: row.entity_type,
        totalConsumed: parseFloat(row.total_consumed || 0),
        transactionCount: parseInt(row.transaction_count || 0),
        lastTransaction: row.last_transaction
      }));

    } catch (error) {
      console.error('Error getting consumption summary:', error);
      return [];
    }
  }
}

// Export singleton instance
const fixedEnhancedCreditService = new FixedEnhancedCreditService();

export default fixedEnhancedCreditService;

// Usage examples:
/*
// Get effective cost for Mumbai branch
const costDetails = await fixedEnhancedCreditService.getEffectiveCost(
  'crm.leads.create',
  'mumbai-branch-uuid',
  'tenant-uuid'
);
// Result: { cost: 3.75, unit: 'operation', source: 'Entity-Specific', hierarchy: 'Entity' }

// Consume credits with entity-specific pricing
const result = await fixedEnhancedCreditService.consumeCredits(
  'crm.leads.create',
  'mumbai-branch-uuid',
  'tenant-uuid',
  'user-uuid',
  1
);
// Result: { success: true, totalCost: 3.75, entitySpecific: true }

// Set custom pricing for Delhi office
const configResult = await fixedEnhancedCreditService.setEntityCreditConfig(
  'crm.leads.create',
  'delhi-office-uuid',
  'tenant-uuid',
  2.0,
  'admin-uuid'
);

// Bulk create configurations for a branch
const bulkResult = await fixedEnhancedCreditService.bulkCreateEntityConfigs(
  'mumbai-branch-uuid',
  'tenant-uuid',
  'admin-uuid',
  [
    { operationCode: 'crm.leads.create', creditCost: 3.75 },
    { operationCode: 'hr.employees.create', creditCost: 4.5 },
    { operationCode: 'affiliate.partners.create', creditCost: 7.5 }
  ]
);

// Get consumption summary
const summary = await fixedEnhancedCreditService.getConsumptionSummary('tenant-uuid');
*/
