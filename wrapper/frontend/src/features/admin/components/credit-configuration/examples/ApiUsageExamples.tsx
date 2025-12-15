/**
 * API Usage Examples for Separated Operation Cost Endpoints
 *
 * This file demonstrates how to use the new SOLID-separated APIs
 * instead of the legacy mixed-concern endpoints.
 */

import React, { useState, useEffect } from 'react';
import { operationCostAPI, smartOperationCostAPI, creditConfigurationAPI } from '@/lib/api';

interface OperationCost {
  configId: string;
  operationCode: string;
  creditCost: number;
  unit: string;
  unitMultiplier: number;
  isGlobal: boolean;
  isCustomized: boolean;
  isActive: boolean;
}

interface TenantConfigurations {
  tenantId: string;
  configurations: {
    operations: OperationCost[];
    modules: any[];
    apps: any[];
  };
  globalConfigs: {
    operations: OperationCost[];
    modules: any[];
    apps: any[];
  };
}

const ApiUsageExamples: React.FC = () => {
  const [globalOperations, setGlobalOperations] = useState<OperationCost[]>([]);
  const [tenantOperations, setTenantOperations] = useState<OperationCost[]>([]);
  const [comprehensiveConfigs, setComprehensiveConfigs] = useState<TenantConfigurations | null>(null);
  const [effectiveCost, setEffectiveCost] = useState<OperationCost | null>(null);
  const [loading, setLoading] = useState(false);

  const tenantId = 'b0a6e370-c1e5-43d1-94e0-55ed792274c4'; // Example tenant
  const operationCode = 'crm.leads.create';

  // Example 1: Fetch Global Operations Only
  const fetchGlobalOperations = async () => {
    setLoading(true);
    try {
      const response = await operationCostAPI.getGlobalOperationCosts({
        search: 'crm.leads',
        isActive: true
      });

      console.log('Global Operations Response:', response.data);
      setGlobalOperations(response.data.operations);
    } catch (error) {
      console.error('Error fetching global operations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Example 2: Fetch Tenant-Specific Operations Only
  const fetchTenantOperations = async () => {
    setLoading(true);
    try {
      const response = await operationCostAPI.getTenantOperationCosts(tenantId, {
        search: 'crm.leads',
        isActive: true
      });

      console.log('Tenant Operations Response:', response.data);
      setTenantOperations(response.data.operations);
    } catch (error) {
      console.error('Error fetching tenant operations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Example 3: Fetch Comprehensive Configuration (Both tenant and global)
  const fetchComprehensiveConfigs = async () => {
    setLoading(true);
    try {
      const response = await creditConfigurationAPI.getTenantConfigurations(tenantId);

      console.log('Comprehensive Configs Response:', response.data);
      setComprehensiveConfigs(response.data);
    } catch (error) {
      console.error('Error fetching comprehensive configs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Example 4: Get Effective Cost with Hierarchy (Smart API)
  const getEffectiveOperationCost = async () => {
    setLoading(true);
    try {
      const operation = await smartOperationCostAPI.getEffectiveOperationCost(
        operationCode,
        tenantId
      );

      console.log('Effective Cost Response:', operation);
      setEffectiveCost(operation);
    } catch (error) {
      console.error('Error getting effective cost:', error);
    } finally {
      setLoading(false);
    }
  };

  // Example 5: Smart Auto-Selection API
  const fetchSmartOperations = async () => {
    setLoading(true);
    try {
      const response = await smartOperationCostAPI.getSmartOperationCosts({
        tenantId: tenantId,
        includeGlobal: true,
        params: {
          search: 'crm.leads',
          isActive: true
        }
      });

      console.log('Smart Operations Response:', response.data);
      // This will automatically use the best endpoint based on context
    } catch (error) {
      console.error('Error with smart operations:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">API Usage Examples</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Example 1: Global Operations */}
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">1. Global Operations Only</h3>
          <p className="text-sm text-gray-600 mb-3">
            Use when you only need global configurations
          </p>
          <button
            onClick={fetchGlobalOperations}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Fetch Global Operations
          </button>

          {globalOperations.length > 0 && (
            <div className="mt-3 p-2 bg-gray-50 rounded">
              <p className="text-sm font-medium">Found {globalOperations.length} global operations</p>
              <ul className="text-xs mt-1">
                {globalOperations.slice(0, 3).map(op => (
                  <li key={op.configId}>
                    {op.operationCode}: {op.creditCost} credits
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Example 2: Tenant Operations */}
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">2. Tenant Operations Only</h3>
          <p className="text-sm text-gray-600 mb-3">
            Use when you only need tenant-specific configurations
          </p>
          <button
            onClick={fetchTenantOperations}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Fetch Tenant Operations
          </button>

          {tenantOperations.length > 0 && (
            <div className="mt-3 p-2 bg-gray-50 rounded">
              <p className="text-sm font-medium">Found {tenantOperations.length} tenant operations</p>
              <ul className="text-xs mt-1">
                {tenantOperations.slice(0, 3).map(op => (
                  <li key={op.configId}>
                    {op.operationCode}: {op.creditCost} credits
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Example 3: Comprehensive Configs */}
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">3. Comprehensive Configs</h3>
          <p className="text-sm text-gray-600 mb-3">
            Use when you need both tenant and global with hierarchy
          </p>
          <button
            onClick={fetchComprehensiveConfigs}
            disabled={loading}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Fetch Comprehensive
          </button>

          {comprehensiveConfigs && (
            <div className="mt-3 p-2 bg-gray-50 rounded">
              <p className="text-sm font-medium">Tenant: {comprehensiveConfigs.configurations.operations.length} ops</p>
              <p className="text-sm font-medium">Global: {comprehensiveConfigs.globalConfigs.operations.length} ops</p>
            </div>
          )}
        </div>

        {/* Example 4: Effective Cost */}
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">4. Effective Cost (Smart)</h3>
          <p className="text-sm text-gray-600 mb-3">
            Gets tenant cost, or global fallback automatically
          </p>
          <button
            onClick={getEffectiveOperationCost}
            disabled={loading}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
          >
            Get Effective Cost
          </button>

          {effectiveCost && (
            <div className="mt-3 p-2 bg-gray-50 rounded">
              <p className="text-sm">
                <strong>{effectiveCost.operationCode}</strong>
              </p>
              <p className="text-xs">
                Cost: {effectiveCost.creditCost} credits |
                Type: {effectiveCost.isCustomized ? 'Tenant' : 'Global'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Example 5: Smart API */}
      <div className="p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-2">5. Smart Auto-Selection API</h3>
        <p className="text-sm text-gray-600 mb-3">
          Automatically chooses the best endpoint based on your context
        </p>
        <button
          onClick={fetchSmartOperations}
          disabled={loading}
          className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
        >
          Use Smart API
        </button>
      </div>

      {/* Usage Guide */}
      <div className="p-4 border rounded-lg bg-blue-50">
        <h3 className="text-lg font-semibold mb-3">📋 When to Use Each API</h3>

        <div className="space-y-3 text-sm">
          <div>
            <strong>Global Operations Only:</strong>
            <code className="ml-2 px-2 py-1 bg-white rounded text-xs">
              operationCostAPI.getGlobalOperationCosts()
            </code>
            <p className="text-gray-600 mt-1">When you only need global/system-wide configurations</p>
          </div>

          <div>
            <strong>Tenant Operations Only:</strong>
            <code className="ml-2 px-2 py-1 bg-white rounded text-xs">
              operationCostAPI.getTenantOperationCosts(tenantId)
            </code>
            <p className="text-gray-600 mt-1">When you only need tenant-specific configurations</p>
          </div>

          <div>
            <strong>Smart Auto-Selection:</strong>
            <code className="ml-2 px-2 py-1 bg-white rounded text-xs">
              smartOperationCostAPI.getSmartOperationCosts()
            </code>
            <p className="text-gray-600 mt-1">Automatically chooses the best endpoint based on context</p>
          </div>

          <div>
            <strong>Comprehensive (Management UI):</strong>
            <code className="ml-2 px-2 py-1 bg-white rounded text-xs">
              creditConfigurationAPI.getTenantConfigurations()
            </code>
            <p className="text-gray-600 mt-1">When you need both tenant and global configs with full hierarchy</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiUsageExamples;
