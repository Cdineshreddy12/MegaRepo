import { handleApiError } from './errorHandler';
import { api } from './index';

// Type definitions
export interface VariableMapping {
  variableName: string;
  fieldId: string;
  fieldType: 'number' | 'date' | 'text' | 'boolean' | 'select' | 'multiselect';
  aggregation?: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX' | 'DISTINCT' | 'NONE';
  description?: string;
}

export interface Filter {
  fieldId: string;
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'greaterThanOrEqual' | 
           'lessThanOrEqual' | 'contains' | 'notContains' | 'in' | 'notIn' | 'isEmpty' | 'isNotEmpty';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface PipelineStage {
  stage: 'match' | 'group' | 'project' | 'sort' | 'limit' | 'aggregate';
  filters?: Filter[];
  by?: string;
  groupBy?: string;
  field?: string;
  aggregations?: Record<string, {
    type: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX' | 'DISTINCT';
    field: string;
    fieldId?: string;
  }>;
  fields?: string[] | Array<{ field: string; as?: string }>;
  order?: 'asc' | 'desc';
  limit?: number;
  count?: number;
}

export interface PreviewResult {
  value: number;
  formatted: string;
  submissionCount?: number;
  message?: string;
  error?: string;
}

export interface AnalyticsFormula {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  formula: string;
  formulaType?: 'simple' | 'aggregated' | 'pipelined' | 'conditional';
  variableMappings?: VariableMapping[];
  filters?: Filter[];
  outputType?: 'number' | 'percentage' | 'currency' | 'date' | 'text';
  displayFormat?: string;
  formTemplateId: string;
  industry?: string;
  pipeline?: PipelineStage[];
  validation?: {
    syntaxValid: boolean;
    fieldsValid: boolean;
    lastValidated?: string;
    errorMessage?: string;
  };
  usageCount?: number;
  lastUsed?: string;
  isActive?: boolean;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  preview?: PreviewResult;
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'custom';
  title: string;
  description?: string;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  config: {
    dataSource?: 'formSubmissions' | 'entities' | 'custom';
    entityType?: string;
    formTemplateId?: string;
    formulaId?: string;
    filters?: Record<string, any>;
    aggregation?: Record<string, any>;
    chartType?: 'line' | 'bar' | 'pie' | 'area' | 'table' | 'number';
    dateRange?: {
      type: 'custom' | 'today' | 'yesterday' | 'last7days' | 'last30days' | 'last90days' | 'thisMonth' | 'lastMonth' | 'thisYear';
      startDate?: string;
      endDate?: string;
    };
    outputType?: string;
  };
  displaySettings?: {
    showTrend?: boolean;
    showComparison?: boolean;
    comparisonPeriod?: string;
    color?: string;
    format?: string;
  };
  order?: number;
}

export interface DashboardView {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  industry?: string;
  isDefault?: boolean;
  isPublic?: boolean;
  userId?: string;
  roleId?: string;
  isActive?: boolean;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CalculationResult {
  value: number | any;
  formatted: string;
  rawValue: number | any;
  submissionCount: number;
  formula?: string;
  pipeline?: PipelineStage[];
  explanation?: string;
  breakdown?: Array<{
    field: string;
    sum?: number;
    average?: number;
    count?: number;
    values?: any[];
  }>;
  metadata: {
    formulaId: string;
    formulaName: string;
    calculatedAt: string;
  };
}

export interface FormulaGenerationResult {
  formula: AnalyticsFormula;
  preview: {
    value: number;
    formatted: string;
    submissionCount?: number;
    message?: string;
    error?: string;
  };
}

export interface FieldMappingResult {
  mappings: Array<{
    variableName: string;
    fieldId: string;
    fieldType: string;
    aggregation?: string;
    confidence: number;
    reason: string;
  }>;
  unmappedVariables: string[];
}

export interface MetricSuggestion {
  name: string;
  formula: string;
  description: string;
  relevance?: string;
}

export interface SuggestMetricsResult {
  industry: string;
  aiSuggestions: MetricSuggestion[];
  industryMetrics: MetricSuggestion[];
  recommendedFields: string[];
}

export interface InsightsResult {
  findings: string[];
  trends: string[];
  anomalies: string[];
  recommendations: string[];
  nextSteps: string[];
}

export const analyticsService = {
  /**
   * Generate formula from natural language description
   */
  generateFormula: async (data: {
    description: string;
    formTemplateId: string;
    industry?: string;
  }): Promise<FormulaGenerationResult> => {
    try {
      const response = await api.post<{ success: boolean; data: FormulaGenerationResult }>(
        '/analytics/generate-formula',
        data
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Calculate analytics using formula
   */
  calculate: async (data: {
    formulaId: string;
    filters?: Record<string, any>;
    dateRange?: {
      type: string;
      startDate?: string;
      endDate?: string;
    };
  }): Promise<CalculationResult> => {
    try {
      const response = await api.post<{ success: boolean; data: CalculationResult }>(
        '/analytics/calculate',
        data
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Get all formulas
   */
  getFormulas: async (params?: {
    formTemplateId?: string;
    industry?: string;
    includePreview?: boolean;
  }): Promise<AnalyticsFormula[]> => {
    try {
      const requestParams = {
        ...params,
        includePreview: params?.includePreview !== false ? 'true' : undefined, // Include preview by default
      };
      const response = await api.get<{ success: boolean; data: AnalyticsFormula[] }>(
        '/analytics/formulas',
        { params: requestParams }
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Get single formula
   */
  getFormula: async (id: string): Promise<AnalyticsFormula> => {
    try {
      const response = await api.get<{ success: boolean; data: AnalyticsFormula }>(
        `/analytics/formulas/${id}`
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Create formula
   */
  createFormula: async (formula: Partial<AnalyticsFormula>): Promise<AnalyticsFormula> => {
    try {
      const response = await api.post<{ success: boolean; data: AnalyticsFormula }>(
        '/analytics/formulas',
        formula
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Update formula
   */
  updateFormula: async (id: string, formula: Partial<AnalyticsFormula>): Promise<AnalyticsFormula> => {
    try {
      const response = await api.put<{ success: boolean; data: AnalyticsFormula }>(
        `/analytics/formulas/${id}`,
        formula
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Delete formula
   */
  deleteFormula: async (id: string): Promise<void> => {
    try {
      await api.delete(`/analytics/formulas/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Validate formula syntax
   */
  validateFormula: async (data: {
    formula: string;
    formTemplateId?: string;
  }): Promise<{
    syntaxValid: boolean;
    error?: string;
    aiValidation?: {
      valid: boolean;
      formula: string;
      errors?: string[];
      fixes?: string[];
    };
  }> => {
    try {
      const response = await api.post<{ success: boolean; data: any }>(
        '/analytics/formulas/validate',
        data
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Map formula variables to fields using AI
   */
  mapFields: async (data: {
    formula: string;
    formTemplateId: string;
  }): Promise<FieldMappingResult> => {
    try {
      const response = await api.post<{ success: boolean; data: FieldMappingResult }>(
        '/analytics/map-fields',
        data
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Suggest metrics for form template
   */
  suggestMetrics: async (data: {
    formTemplateId: string;
    industry?: string;
  }): Promise<SuggestMetricsResult> => {
    try {
      const response = await api.post<{ success: boolean; data: SuggestMetricsResult }>(
        '/analytics/suggest-metrics',
        data
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Generate pipeline aggregation
   */
  generatePipeline: async (data: {
    description: string;
    formTemplateId: string;
  }): Promise<{ pipeline: PipelineStage[]; description: string }> => {
    try {
      const response = await api.post<{ success: boolean; data: any }>(
        '/analytics/generate-pipeline',
        data
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Generate insights from analytics results
   */
  generateInsights: async (data: {
    analyticsResults: any;
    historicalData?: any;
  }): Promise<InsightsResult> => {
    try {
      const response = await api.post<{ success: boolean; data: InsightsResult }>(
        '/analytics/generate-insights',
        data
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Dashboard Views
   */
  getDashboardViews: async (params?: {
    userId?: string;
    roleId?: string;
  }): Promise<DashboardView[]> => {
    try {
      const response = await api.get<{ success: boolean; data: DashboardView[] }>(
        '/analytics/dashboard-views',
        { params }
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  createDashboardView: async (view: Partial<DashboardView>): Promise<DashboardView> => {
    try {
      const response = await api.post<{ success: boolean; data: DashboardView }>(
        '/analytics/dashboard-views',
        view
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  updateDashboardView: async (id: string, view: Partial<DashboardView>): Promise<DashboardView> => {
    try {
      const response = await api.put<{ success: boolean; data: DashboardView }>(
        `/analytics/dashboard-views/${id}`,
        view
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  deleteDashboardView: async (id: string): Promise<void> => {
    try {
      await api.delete(`/analytics/dashboard-views/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }
};

