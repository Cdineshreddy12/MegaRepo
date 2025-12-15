import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Copy } from 'lucide-react';
import { CostTemplate } from './types';

interface TemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: CostTemplate) => void;
  templates: CostTemplate[];
  selectedTemplate: CostTemplate | null;
  onSelectedTemplateChange: (template: CostTemplate | null) => void;
  tenantName?: string;
}

export const TemplateDialog: React.FC<TemplateDialogProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  templates,
  selectedTemplate,
  onSelectedTemplateChange,
  tenantName
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply Configuration Template</DialogTitle>
          <DialogDescription>
            Choose a template to quickly configure credit costs for {tenantName || 'this tenant'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Copy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No templates available</p>
              <p className="text-sm mt-2">Create templates first in the global configurations tab</p>
            </div>
          ) : (
            templates.map((template) => (
              <Card
                key={template.templateId}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedTemplate?.templateId === template.templateId
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                }`}
                onClick={() => onSelectedTemplateChange(template)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{template.templateName}</h4>
                    {template.isDefault && (
                      <Badge variant="default" className="text-xs">Default</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm">Category: {template.category}</span>
                    <span className="text-sm">{template.operations.length} operations</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Usage count: {template.usageCount}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (selectedTemplate) {
                onSelectTemplate(selectedTemplate);
              }
            }}
            disabled={!selectedTemplate}
          >
            Apply Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
