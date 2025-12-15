import { api, handleApiError } from './index';
import { FormTemplate } from './formService';

export interface LayoutSuggestion {
  fieldId: string;
  suggestions: {
    width?: "full" | "half" | "third" | "two-thirds" | "quarter" | "three-quarters" | number;
    labelPosition?: "top" | "left" | "right" | "hidden";
    order?: number;
    className?: string;
    helpText?: string;
  };
  reasoning?: string;
}

export interface SectionLayoutSuggestion {
  sectionId: string;
  suggestions: {
    columns?: 1 | 2 | 3 | 4 | 6 | 12;
    spacing?: "compact" | "normal" | "loose";
    order?: number;
    className?: string;
  };
  reasoning?: string;
}

export interface MissingField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  sectionId: string;
  suggestions: {
    width?: "full" | "half" | "third" | "two-thirds" | "quarter" | "three-quarters" | number;
    labelPosition?: "top" | "left" | "right" | "hidden";
    order?: number;
  };
  reasoning?: string;
}

export interface FormLayoutAnalysis {
  missingFields?: MissingField[];
  fieldSuggestions: LayoutSuggestion[];
  sectionSuggestions: SectionLayoutSuggestion[];
  overallRecommendations: string[];
  confidence: number; // 0-1
  rawResponse?: string;
}

const BASE_URL = '/forms';

/**
 * AI-powered form layout suggestion service
 * Uses Claude AI to analyze form fields and suggest optimal layouts
 */
export const formLayoutAiService = {
  /**
   * Analyze form template and suggest optimal layouts
   * @param template - The form template to analyze
   * @param businessRequirements - Optional business requirements description
   * @returns Promise with layout analysis and suggestions
   */
  async suggestLayout(template: FormTemplate, businessRequirements?: string): Promise<FormLayoutAnalysis> {
    try {
      const response = await api.post<{ success: boolean; data: FormLayoutAnalysis }>(
        `${BASE_URL}/templates/analyze-layout`,
        { template, businessRequirements }
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Analyze form layout by template ID
   * @param templateId - The ID of the template to analyze
   * @returns Promise with layout analysis and suggestions
   */
  async suggestLayoutById(templateId: string): Promise<FormLayoutAnalysis> {
    try {
      const response = await api.post<{ success: boolean; data: FormLayoutAnalysis }>(
        `${BASE_URL}/templates/${templateId}/analyze-layout`
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Apply suggestions to a template (returns updated template)
   * @param templateId - The ID of the template
   * @param analysis - The layout analysis to apply
   * @returns Promise with updated template
   */
  async applySuggestions(templateId: string, analysis: FormLayoutAnalysis): Promise<FormTemplate> {
    try {
      const response = await api.post<{ success: boolean; data: FormTemplate }>(
        `${BASE_URL}/templates/${templateId}/apply-layout-suggestions`,
        { analysis }
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Generate a complete form template from scratch using AI
   * @param params - Generation parameters
   */
  async generateTemplate(params: {
    entityType: string;
    industry?: string;
    useCase?: string;
    businessRequirements?: string;
  }): Promise<FormTemplate> {
    try {
      const response = await api.post<{ success: boolean; data: FormTemplate; message?: string }>(
        `${BASE_URL}/templates/generate`,
        params
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Suggest alignment for selected fields
   * @param params - Alignment parameters
   * @returns Promise with alignment suggestions
   */
  async suggestAlignment(params: {
    fields: Array<{
      id: string;
      label: string;
      type: string;
      currentWidth?: "full" | "half" | "third" | "two-thirds" | "quarter" | "three-quarters" | number;
      currentAlign?: "left" | "center" | "right";
    }>;
    context?: {
      sectionColumns?: number;
    };
  }): Promise<Array<{ width: "full" | "half" | "third" | "two-thirds" | "quarter" | "three-quarters" | number; align: "left" | "center" | "right" }>> {
    try {
      const response = await api.post<{ success: boolean; data: Array<{ width: any; align: any }> }>(
        `${BASE_URL}/templates/suggest-alignment`,
        params
      );
      return response.data.data;
    } catch (error) {
      // Fallback to client-side logic if API fails
      return this.suggestAlignmentLocally(params);
    }
  },

  /**
   * Client-side alignment suggestion (fallback)
   */
  suggestAlignmentLocally(params: {
    fields: Array<{
      id: string;
      label: string;
      type: string;
      currentWidth?: "full" | "half" | "third" | "two-thirds" | "quarter" | "three-quarters" | number;
      currentAlign?: "left" | "center" | "right";
    }>;
    context?: {
      sectionColumns?: number;
    };
  }): Array<{ width: "full" | "half" | "third" | "two-thirds" | "quarter" | "three-quarters" | number; align: "left" | "center" | "right" }> {
    const { fields, context } = params;
    const columns = context?.sectionColumns ?? 2;
    const fieldsPerRow = Math.ceil(fields.length / columns);
    const colSpan = Math.floor(12 / columns);
    
    return fields.map((field, index) => {
      // Determine width based on field type and context
      let width: "full" | "half" | "third" | "two-thirds" | "quarter" | "three-quarters" | number = colSpan as any;
      
      // Adjust width based on field type
      if (field.type === "textarea" || field.type === "address") {
        width = "full";
      } else if (field.type === "number" || field.type === "date") {
        width = "half";
      }
      
      // Determine alignment
      let align: "left" | "center" | "right" = "left";
      if (field.type === "number" || field.type === "calculated") {
        align = "right";
      } else if (field.type === "checkbox" || field.type === "radio") {
        align = "left";
      }
      
      return { width, align };
    });
  },

  /**
   * Apply suggestions locally (client-side)
   * @param template - The template to update
   * @param analysis - The layout analysis to apply
   * @returns Updated template with suggestions applied
   */
  applySuggestionsLocally(template: FormTemplate, analysis: FormLayoutAnalysis): FormTemplate {
    const updatedTemplate = JSON.parse(JSON.stringify(template)) as FormTemplate;

    // Apply field suggestions
    analysis.fieldSuggestions?.forEach(fieldSuggestion => {
      updatedTemplate.sections?.forEach(section => {
        const field = section.fields?.find(f => f.id === fieldSuggestion.fieldId);
        if (field) {
          if (!field.metadata) {
            field.metadata = {};
          }
          Object.assign(field.metadata, fieldSuggestion.suggestions);
        }
      });
    });

    // Apply section suggestions
    analysis.sectionSuggestions?.forEach(sectionSuggestion => {
      const section = updatedTemplate.sections?.find(s => s.id === sectionSuggestion.sectionId);
      if (section) {
        if (!section.metadata) {
          section.metadata = {};
        }
        Object.assign(section.metadata, sectionSuggestion.suggestions);
      }
    });

    return updatedTemplate;
  },
};

