import { handleApiError } from './errorHandler';
import { api } from './index';
import { FormTemplate, CreateTemplateData } from './formService';

// Type definitions
export interface EntityType {
  value: string;
  label: string;
}

export interface SchemaFieldMetadata {
  name: string;
  type: string;
  required: boolean;
  default?: any;
  validation: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  ref?: string | null;
  enum?: string[] | null;
  nested?: SchemaFieldMetadata[] | null;
  isArray?: boolean;
  isNested?: boolean;
}

export interface SchemaMetadata {
  entityType: string;
  modelName: string;
  fields: SchemaFieldMetadata[];
  requiredFields: string[];
  optionalFields: string[];
}

export interface GenerateFormOptions {
  entityType: string;
  templateName?: string;
  templateDescription?: string;
  includeFields?: string[];
  excludeFields?: string[];
  fieldOverrides?: Record<string, Partial<any>>;
  groupingStrategy?: 'auto' | 'none';
  addCustomFields?: any[];
  saveTemplate?: boolean;
  orgCode?: string;
}

export interface ValidationResult {
  success: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
  message: string;
}

const BASE_URL = '/schemas';

export const schemaService = {
  /**
   * Get all available entity types
   */
  getEntityTypes: async (): Promise<EntityType[]> => {
    try {
      const response = await api.get<{ success: boolean; data: EntityType[] }>(
        `${BASE_URL}/entity-types`
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Get schema metadata for an entity type
   */
  getSchemaMetadata: async (
    entityType: string,
    options?: {
      excludeFields?: string[];
      includeFields?: string[];
      excludeSystemFields?: boolean;
    }
  ): Promise<SchemaMetadata> => {
    try {
      const params = new URLSearchParams();
      if (options?.excludeFields) {
        params.append('excludeFields', options.excludeFields.join(','));
      }
      if (options?.includeFields) {
        params.append('includeFields', options.includeFields.join(','));
      }
      if (options?.excludeSystemFields !== undefined) {
        params.append('excludeSystemFields', String(options.excludeSystemFields));
      }

      const response = await api.get<{ success: boolean; data: SchemaMetadata }>(
        `${BASE_URL}/metadata/${entityType}?${params.toString()}`
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Generate form template from schema
   */
  generateFormFromSchema: async (
    options: GenerateFormOptions
  ): Promise<FormTemplate> => {
    try {
      const response = await api.post<{ success: boolean; data: FormTemplate; message?: string }>(
        `${BASE_URL}/generate-form`,
        options
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Validate form data against schema
   */
  validateFormDataAgainstSchema: async (
    entityType: string,
    formData: Record<string, any>
  ): Promise<ValidationResult> => {
    try {
      const response = await api.post<ValidationResult>(`${BASE_URL}/validate`, {
        entityType,
        formData,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Map form data to model structure
   */
  mapFormDataToModel: async (
    entityType: string,
    formData: Record<string, any>
  ): Promise<Record<string, any>> => {
    try {
      const response = await api.post<{ success: boolean; data: Record<string, any> }>(
        `${BASE_URL}/map-data`,
        {
          entityType,
          formData,
        }
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Clear schema cache
   */
  clearSchemaCache: async (entityType?: string): Promise<void> => {
    try {
      const url = entityType
        ? `${BASE_URL}/cache/${entityType}`
        : `${BASE_URL}/cache`;
      await api.delete(url);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

