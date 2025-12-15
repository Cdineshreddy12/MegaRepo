/**
/**
 * Form Template IDs for different CRM sections
 * 
 * To get template IDs:
 * 1. Go to Form Builder
 * 2. Create/save a template
 * 3. Copy the template ID from the saved template
 * 4. Add it here
 */
export const FORM_TEMPLATE_IDS = {
  account: "", // Add your account template ID here
  lead: "", // Add your lead template ID here
  contact: "", // Add your contact template ID here
  opportunity: "", // Add your opportunity template ID here
  quotation: "", // Add your quotation template ID here
  salesOrder: "", // Add your sales order template ID here
  invoice: "", // Add your invoice template ID here
  ticket: "", // Add your ticket template ID here
} as const;

export type FormTemplateType = keyof typeof FORM_TEMPLATE_IDS;

/**
 * Get template ID for a given entity type
 */
export function getTemplateId(entityType: FormTemplateType): string | undefined {
  return FORM_TEMPLATE_IDS[entityType] || undefined;
}

/**
 * Check if a template exists for an entity type
 */
export function hasTemplate(entityType: FormTemplateType): boolean {
  return !!FORM_TEMPLATE_IDS[entityType];
}

