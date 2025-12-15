import { useState, useEffect } from "react";
import { formService, FormTemplate } from "@/services/api/formService";
import { useToast } from "@/hooks/useToast";

/**
 * Hook to fetch form template for a specific entity type
 * @param entityType - The entity type (e.g., "account", "lead")
 * @param templateId - Optional specific template ID to load. If provided, loads that template instead of the first one.
 */
export function useFormTemplate(entityType: string, templateId?: string) {
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!entityType) {
      setLoading(false);
      return;
    }

    const loadTemplate = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // If templateId is explicitly null, don't load any template
        // This allows components to opt-out of template loading
        if (templateId === null) {
          setTemplate(null);
          setLoading(false);
          return;
        }
        
        // If a specific templateId is provided, load that template
        if (templateId) {
          try {
            const specificTemplate = await formService.getTemplate(templateId);
            setTemplate(specificTemplate);
            setLoading(false);
            return;
          } catch (err: any) {
            console.warn("Failed to load specific template:", err);
            setTemplate(null);
            setLoading(false);
            return; // Don't fall back if specific template fails
          }
        }
        
        // If templateId is undefined (not provided), load default template for entity type
        // This is for cases where we want to auto-load the default template
        const response = await formService.getTemplates({
          entityType: entityType.toLowerCase(),
          isActive: true,
        });

        // Use default template if available, otherwise first active template
        if (response.data && response.data.length > 0) {
          const defaultTemplate = response.data.find(t => t.isDefault);
          setTemplate(defaultTemplate || response.data[0]);
        } else {
          setTemplate(null);
        }
      } catch (err: any) {
        console.error("Error loading form template:", err);
        setError(err.message || "Failed to load template");
        setTemplate(null);
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [entityType, templateId]);

  return { template, loading, error };
}

/**
 * Hook to fetch all templates for an entity type (for selection)
 */
export function useFormTemplates(entityType?: string) {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true);
        const response = await formService.getTemplates({
          ...(entityType && { entityType: entityType.toLowerCase() }),
          isActive: true,
        });
        setTemplates(response.data || []);
      } catch (err: any) {
        console.error("Error loading templates:", err);
        toast({
          title: "Error",
          description: "Failed to load form templates",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [entityType, toast]);

  return { templates, loading };
}


