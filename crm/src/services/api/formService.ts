import { handleApiError } from './errorHandler';
import { api } from './index';

// Type definitions
export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "email"
  | "phone"
  | "url"
  | "password"
  | "select"
  | "multiselect"
  | "radio"
  | "checkbox"
  | "date"
  | "datetime"
  | "time"
  | "file"
  | "image"
  | "boolean"
  | "entity"
  | "user"
  | "organization"
  | "sysConfig"
  | "signature"
  | "rating"
  | "slider"
  | "color"
  | "address"
  | "repeater"
  | "html"
  | "divider"
  | "calculated";

export interface FieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customMessage?: string;
}

export interface ConditionalLogic {
  dependsOn: string;
  condition: "equals" | "notEquals" | "contains" | "notContains" | "greaterThan" | "lessThan" | "isEmpty" | "isNotEmpty";
  value: any;
  show: boolean;
}

export interface FieldMetadata {
  category?: string;
  helpText?: string;
  fieldGroup?: string;
  entityType?: string;
  multiple?: boolean;
  accept?: string;
  maxSize?: number;
  // UI Customization
  hidden?: boolean; // Hide field from form view entirely
  hiddenInTable?: boolean; // Hide field from table view
  showInTable?: boolean; // Explicitly show field in table (overrides defaults)
  width?: "full" | "half" | "third" | "two-thirds" | "quarter" | "three-quarters" | number; // Field width in grid
  align?: "left" | "center" | "right"; // Text alignment
  order?: number; // Display order (lower numbers appear first)
  className?: string; // Custom CSS classes
  labelPosition?: "top" | "left" | "right" | "hidden"; // Label position
  // Field behavior
  readOnly?: boolean;
  autoPopulated?: boolean; // For auto-populated fields
}

export interface FieldCalculation {
  formula: string; // Formula expression (e.g., "field-annualRevenue * field-profitabilityMargin / 100")
  decimalPlaces?: number; // Number of decimal places to display (default: 2)
  format?: "number" | "currency" | "percentage"; // Display format
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  defaultValue?: any;
  options?: string[];
  validation?: FieldValidation;
  conditionalLogic?: ConditionalLogic;
  metadata?: FieldMetadata;
  order?: number;
  readOnly?: boolean; // For read-only fields like createdBy, updatedBy
  category?: string; // For sysConfig type fields
  calculation?: FieldCalculation; // For calculated field type
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  fields: FormField[];
  conditionalLogic?: ConditionalLogic;
  metadata?: {
    hidden?: boolean; // Hide section from form view
    columns?: 1 | 2 | 3 | 4 | 6 | 12; // Grid columns (default: 1, uses 12-column grid)
    spacing?: "compact" | "normal" | "loose"; // Section spacing
    collapsible?: boolean; // Allow section to be collapsed
    collapsedByDefault?: boolean; // Start collapsed
    className?: string; // Custom CSS classes
    order?: number; // Display order (lower numbers appear first)
  };
}

export interface FormSettings {
  submitButtonText?: string;
  allowMultipleSubmissions?: boolean;
  requireAuthentication?: boolean;
  redirectUrl?: string;
  notificationEmails?: string[];
  autoAssignTo?: string;
  successMessage?: string;
  errorMessage?: string;
  allowDraft?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number;
}

export interface FormPermissions {
  canView?: string[];
  canEdit?: string[];
  canSubmit?: string[];
  canDelete?: string[];
}

export interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  tenantId: string;
  orgCode?: string;
  entityType?: "lead" | "account" | "contact" | "opportunity" | "quotation" | "ticket" | "custom" | null;
  isActive: boolean;
  isPublic?: boolean;
  isDefault?: boolean; // Indicates if this is the default template for its entityType
  sections: FormSection[];
  settings: FormSettings;
  permissions: FormPermissions;
  createdBy: string;
  updatedBy?: string;
  version: number;
  tags?: string[];
  autoCreateEntity?: boolean;
  entityMapping?: Record<string, any>;
  workflowTriggers?: Array<{
    event: "onSubmit" | "onStatusChange";
    workflowId: string;
    conditions?: any;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface FormSubmission {
  id: string;
  templateId: string;
  tenantId: string;
  orgCode?: string;
  data: Record<string, any>;
  status: "draft" | "submitted" | "reviewed" | "approved" | "rejected";
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  relatedEntityType?: "lead" | "account" | "contact" | "opportunity" | "quotation" | "ticket" | null;
  relatedEntityId?: string;
  submittedBy?: string;
  ipAddress?: string;
  userAgent?: string;
  attachments?: Array<{
    url: string;
    filename: string;
    size?: number;
    mimeType?: string;
    uploadedAt?: string;
  }>;
  metadata?: Record<string, any>;
  formVersion?: number;
  notificationsSent?: Array<{
    type: "email" | "sms" | "inApp";
    recipient: string;
    sentAt: string;
    status: "sent" | "failed";
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateFilters {
  entityType?: string;
  isActive?: boolean;
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
}

export interface SubmissionFilters {
  templateId?: string;
  status?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  submittedBy?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CreateTemplateData {
  name: string;
  description?: string;
  orgCode?: string;
  entityType?: string;
  isActive?: boolean;
  isPublic?: boolean;
  sections: FormSection[];
  settings?: FormSettings;
  permissions?: FormPermissions;
  tags?: string[];
  autoCreateEntity?: boolean;
  entityMapping?: Record<string, any>;
  workflowTriggers?: FormTemplate["workflowTriggers"];
}

export interface UpdateTemplateData extends Partial<CreateTemplateData> {}

export interface SubmitFormData {
  templateId: string;
  data: Record<string, any>;
  status?: "draft" | "submitted";
  relatedEntityType?: string;
  relatedEntityId?: string;
  orgCode?: string;
}

export interface ValidationResult {
  success: boolean;
  errors: Array<{
    fieldId: string;
    fieldLabel: string;
    message: string;
  }>;
  message: string;
}

export interface FormAnalytics {
  template: {
    id: string;
    name: string;
    createdAt: string;
  };
  statistics: {
    totalSubmissions: number;
    submissionsByStatus: Record<string, number>;
    recentSubmissions: Array<{
      status: string;
      submittedAt: string;
      submittedBy?: string;
    }>;
    submissionsOverTime: Array<{
      _id: string;
      count: number;
    }>;
  };
}

const BASE_URL = '/forms';

export const formService = {
  // Template CRUD operations
  getTemplates: async (filters?: TemplateFilters): Promise<{ data: FormTemplate[]; pagination: any }> => {
    try {
      const params = new URLSearchParams();
      if (filters?.entityType) params.append('entityType', filters.entityType);
      if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
      if (filters?.tags) filters.tags.forEach(tag => params.append('tags', tag));
      if (filters?.search) params.append('search', filters.search);
      if (filters?.page) params.append('page', String(filters.page));
      if (filters?.limit) params.append('limit', String(filters.limit));

      const response = await api.get<{ success: boolean; data: FormTemplate[]; pagination: any }>(
        `${BASE_URL}/templates?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getTemplate: async (id: string | any): Promise<FormTemplate> => {
    try {
      // Ensure id is a string - extract from object if needed
      let templateId: string;
      if (typeof id === "string") {
        templateId = id;
      } else if (typeof id === "object" && id !== null) {
        templateId = id.id || id._id || String(id);
      } else {
        templateId = String(id);
      }
      
      // Validate template ID
      if (!templateId || templateId === "undefined" || templateId === "null" || templateId === "[object Object]") {
        throw new Error("Invalid template ID provided");
      }
      
      const response = await api.get<{ success: boolean; data: FormTemplate }>(`${BASE_URL}/templates/${templateId}`);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  createTemplate: async (data: CreateTemplateData): Promise<FormTemplate> => {
    try {
      const response = await api.post<{ success: boolean; data: FormTemplate }>(`${BASE_URL}/templates`, data);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  updateTemplate: async (id: string, data: UpdateTemplateData): Promise<FormTemplate> => {
    try {
      const response = await api.put<{ success: boolean; data: FormTemplate }>(`${BASE_URL}/templates/${id}`, data);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  deleteTemplate: async (id: string): Promise<void> => {
    try {
      await api.delete(`${BASE_URL}/templates/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Set a template as default for its entity type
   */
  setDefaultTemplate: async (id: string): Promise<FormTemplate> => {
    try {
      const response = await api.put<{ success: boolean; data: FormTemplate; message?: string }>(
        `${BASE_URL}/templates/${id}/set-default`
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  duplicateTemplate: async (id: string): Promise<FormTemplate> => {
    try {
      const response = await api.post<{ success: boolean; data: FormTemplate }>(
        `${BASE_URL}/templates/${id}/duplicate`
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Submission operations
  getSubmissions: async (filters?: SubmissionFilters): Promise<{ data: FormSubmission[]; pagination: any }> => {
    try {
      const params = new URLSearchParams();
      if (filters?.templateId) params.append('templateId', filters.templateId);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.relatedEntityType) params.append('relatedEntityType', filters.relatedEntityType);
      if (filters?.relatedEntityId) params.append('relatedEntityId', filters.relatedEntityId);
      if (filters?.submittedBy) params.append('submittedBy', filters.submittedBy);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.page) params.append('page', String(filters.page));
      if (filters?.limit) params.append('limit', String(filters.limit));

      const response = await api.get<{ success: boolean; data: FormSubmission[]; pagination: any }>(
        `${BASE_URL}/submissions?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getSubmission: async (id: string): Promise<FormSubmission> => {
    try {
      const response = await api.get<{ success: boolean; data: FormSubmission }>(`${BASE_URL}/submissions/${id}`);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  submitForm: async (data: SubmitFormData): Promise<FormSubmission> => {
    try {
      const response = await api.post<{ success: boolean; data: FormSubmission; message?: string }>(
        `${BASE_URL}/submissions`,
        data
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  updateSubmission: async (id: string, data: Partial<FormSubmission>): Promise<FormSubmission> => {
    try {
      const response = await api.put<{ success: boolean; data: FormSubmission }>(
        `${BASE_URL}/submissions/${id}`,
        data
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  deleteSubmission: async (id: string): Promise<void> => {
    try {
      await api.delete(`${BASE_URL}/submissions/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Validation
  validateFormData: async (templateId: string, data: Record<string, any>): Promise<ValidationResult> => {
    try {
      const response = await api.post<{ success: boolean } & ValidationResult>(
        `${BASE_URL}/templates/${templateId}/validate`,
        { templateId, data }
      );
      return {
        success: response.data.success,
        errors: response.data.errors || [],
        message: response.data.message || ''
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Analytics
  getFormAnalytics: async (id: string): Promise<FormAnalytics> => {
    try {
      const response = await api.get<{ success: boolean; data: FormAnalytics }>(`${BASE_URL}/templates/${id}/analytics`);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
};

