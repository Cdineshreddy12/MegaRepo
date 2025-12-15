import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formService, FormTemplate } from "@/services/api/formService";
import { Loader2 } from "lucide-react";

interface TemplateSelectorModalProps {
  open: boolean;
  onClose: () => void;
  entityType?: string; // "account", "lead", "contact", etc.
  onSelectTemplate: (templateId: string) => void;
}

export function TemplateSelectorModal({
  open,
  onClose,
  entityType,
  onSelectTemplate,
}: TemplateSelectorModalProps) {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open, entityType]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await formService.getTemplates({
        isActive: true,
        ...(entityType && { entityType }),
      });
      setTemplates(response.data || []);
    } catch (error) {
      console.error("Error loading templates:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Form Template</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            No templates available. Create one in the Form Builder.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((template) => (
              <Card
                key={template.id || template._id || `template-${template.name}`}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  onSelectTemplate(template.id || template._id || "");
                  onClose();
                }}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  {template.description && (
                    <p className="text-sm text-gray-600">{template.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-500">
                    {template.sections.length} sections,{" "}
                    {template.sections.reduce((total, s) => total + s.fields.length, 0)} fields
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

