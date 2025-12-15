"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { formLayoutAiService } from "@/services/api/formLayoutAiService";
import { FormTemplate } from "@/services/api/formService";

interface TemplateGeneratorProps {
  onTemplateGenerated: (template: FormTemplate) => void;
  onClose?: () => void;
}

export function TemplateGenerator({ onTemplateGenerated, onClose }: TemplateGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entityType, setEntityType] = useState("account");
  const [industry, setIndustry] = useState("");
  const [useCase, setUseCase] = useState("");
  const [businessRequirements, setBusinessRequirements] = useState("");
  const { toast } = useToast();

  const industries = [
    "Manufacturing",
    "Healthcare",
    "Finance",
    "Retail",
    "Technology",
    "Education",
    "Real Estate",
    "Hospitality",
    "Transportation",
    "Energy",
    "Construction",
    "Agriculture",
    "Media & Entertainment",
    "Consulting",
    "Other",
  ];

  const useCases = [
    "Lead Qualification",
    "Account Management",
    "Contact Management",
    "Order Processing",
    "Customer Onboarding",
    "Support Ticket Creation",
    "Quote Generation",
    "Invoice Management",
    "Product Catalog",
    "Custom",
  ];

  const handleGenerate = async () => {
    if (!entityType) {
      toast({
        title: "Validation Error",
        description: "Please select an entity type",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const template = await formLayoutAiService.generateTemplate({
        entityType,
        industry: industry || undefined,
        useCase: useCase || undefined,
        businessRequirements: businessRequirements.trim() || undefined,
      });

      toast({
        title: "Template Generated!",
        description: `Successfully generated "${template.name}" template with ${template.sections?.length || 0} sections`,
      });

      onTemplateGenerated(template);
      setOpen(false);
      
      // Reset form
      setEntityType("account");
      setIndustry("");
      setUseCase("");
      setBusinessRequirements("");
      
      onClose?.();
    } catch (error: any) {
      console.error("Template generation error:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Generate Template with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Generate Complete Template with AI
          </DialogTitle>
          <DialogDescription>
            Let AI create a complete, production-ready form template based on your industry and use case.
            The AI will generate all sections, fields, layouts, and configurations automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Entity Type */}
          <div className="space-y-2">
            <Label htmlFor="entityType">
              Entity Type <span className="text-red-500">*</span>
            </Label>
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger id="entityType">
                <SelectValue placeholder="Select entity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="account">Account</SelectItem>
                <SelectItem value="contact">Contact</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="opportunity">Opportunity</SelectItem>
                <SelectItem value="quotation">Quotation</SelectItem>
                <SelectItem value="salesOrder">Sales Order</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="ticket">Ticket</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The type of CRM entity this form will manage
            </p>
          </div>

          {/* Industry */}
          <div className="space-y-2">
            <Label htmlFor="industry">Industry (Optional)</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger id="industry">
                <SelectValue placeholder="Select your industry" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((ind) => (
                  <SelectItem key={ind} value={ind.toLowerCase()}>
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Your industry helps AI suggest industry-specific fields
            </p>
          </div>

          {/* Use Case */}
          <div className="space-y-2">
            <Label htmlFor="useCase">Use Case (Optional)</Label>
            <Select value={useCase} onValueChange={setUseCase}>
              <SelectTrigger id="useCase">
                <SelectValue placeholder="Select use case" />
              </SelectTrigger>
              <SelectContent>
                {useCases.map((uc) => (
                  <SelectItem key={uc} value={uc.toLowerCase()}>
                    {uc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The primary purpose of this form
            </p>
          </div>

          {/* Business Requirements */}
          <div className="space-y-2">
            <Label htmlFor="businessRequirements">
              Business Requirements (Optional but Recommended)
            </Label>
            <Textarea
              id="businessRequirements"
              value={businessRequirements}
              onChange={(e) => setBusinessRequirements(e.target.value)}
              placeholder="Describe your specific business needs, workflows, data collection requirements, user roles, integration needs, etc.

Example: We're a B2B manufacturing company. Our sales team needs to track product specifications, delivery timelines, and payment terms. We work with distributors across multiple zones and need to track credit limits, payment history, and order preferences. Our field reps enter data on mobile devices..."
              rows={8}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Detailed requirements help AI generate a more tailored template
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                onClose?.();
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={loading || !entityType}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Template
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

