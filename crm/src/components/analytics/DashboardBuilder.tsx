"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { analyticsService, DashboardView, AnalyticsFormula } from "@/services/api/analyticsService";
import { AnalyticsWidget } from "./AnalyticsWidget";
import { NaturalLanguageFormulaGenerator } from "./NaturalLanguageFormulaGenerator";

interface DashboardBuilderProps {
  dashboardId?: string;
  onSave?: (dashboard: DashboardView) => void;
}

export function DashboardBuilder({ dashboardId, onSave }: DashboardBuilderProps) {
  const [dashboard, setDashboard] = useState<Partial<DashboardView>>({
    name: "",
    description: "",
    widgets: [],
  });
  const [formulas, setFormulas] = useState<AnalyticsFormula[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadFormulas();
    if (dashboardId) {
      loadDashboard();
    }
  }, [dashboardId]);

  const loadFormulas = async () => {
    try {
      const data = await analyticsService.getFormulas();
      setFormulas(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load formulas",
        variant: "destructive",
      });
    }
  };

  const loadDashboard = async () => {
    if (!dashboardId) return;
    
    try {
      setLoading(true);
      const views = await analyticsService.getDashboardViews();
      const view = views.find((v) => v.id === dashboardId || v._id === dashboardId);
      if (view) {
        setDashboard(view);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddWidget = () => {
    const newWidget = {
      id: `widget_${Date.now()}`,
      type: "metric" as const,
      title: "New Metric",
      position: {
        x: (dashboard.widgets?.length || 0) % 3,
        y: Math.floor((dashboard.widgets?.length || 0) / 3),
        w: 3,
        h: 2,
      },
      config: {
        dataSource: "formSubmissions" as const,
        chartType: "number" as const,
      },
      order: dashboard.widgets?.length || 0,
    };

    setDashboard({
      ...dashboard,
      widgets: [...(dashboard.widgets || []), newWidget],
    });
  };

  const handleRemoveWidget = (widgetId: string) => {
    setDashboard({
      ...dashboard,
      widgets: dashboard.widgets?.filter((w) => w.id !== widgetId),
    });
  };

  const handleUpdateWidget = (widgetId: string, updates: any) => {
    setDashboard({
      ...dashboard,
      widgets: dashboard.widgets?.map((w) =>
        w.id === widgetId ? { ...w, ...updates } : w
      ),
    });
  };

  const handleSave = async () => {
    if (!dashboard.name) {
      toast({
        title: "Error",
        description: "Please enter a dashboard name",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      let saved: DashboardView;

      if (dashboardId) {
        saved = await analyticsService.updateDashboardView(dashboardId, dashboard);
      } else {
        saved = await analyticsService.createDashboardView(dashboard);
      }

      toast({
        title: "Success",
        description: "Dashboard saved successfully",
      });

      if (onSave) {
        onSave(saved);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save dashboard",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFormulaGenerated = (result: any) => {
    loadFormulas();
    // Auto-add widget with generated formula
    const newWidget = {
      id: `widget_${Date.now()}`,
      type: "metric" as const,
      title: result.formula.name,
      position: {
        x: (dashboard.widgets?.length || 0) % 3,
        y: Math.floor((dashboard.widgets?.length || 0) / 3),
        w: 3,
        h: 2,
      },
      config: {
        dataSource: "formSubmissions" as const,
        formulaId: result.formula.id || result.formula._id,
        chartType: "number" as const,
      },
      order: dashboard.widgets?.length || 0,
    };

    setDashboard({
      ...dashboard,
      widgets: [...(dashboard.widgets || []), newWidget],
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Dashboard Name *</Label>
            <Input
              id="name"
              value={dashboard.name || ""}
              onChange={(e) => setDashboard({ ...dashboard, name: e.target.value })}
              placeholder="e.g., Sales Dashboard"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={dashboard.description || ""}
              onChange={(e) => setDashboard({ ...dashboard, description: e.target.value })}
              placeholder="Describe this dashboard"
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <NaturalLanguageFormulaGenerator onFormulaGenerated={handleFormulaGenerated} />
            <Button variant="outline" onClick={handleAddWidget}>
              <Plus className="mr-2 h-4 w-4" />
              Add Widget
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dashboard.widgets?.map((widget) => {
          const formulaId = widget.config.formulaId;
          const formula = formulaId
            ? formulas.find(
                (f) => f.id === formulaId || f._id === formulaId
              )
            : null;

          return (
            <Card key={widget.id} className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => handleRemoveWidget(widget.id)}
              >
                <X className="h-4 w-4" />
              </Button>

              <CardHeader>
                <CardTitle className="text-sm">
                  <Input
                    value={widget.title}
                    onChange={(e) =>
                      handleUpdateWidget(widget.id, { title: e.target.value })
                    }
                    className="font-semibold border-none p-0 h-auto"
                  />
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-2">
                <div className="space-y-2">
                  <Label className="text-xs">Formula</Label>
                  <Select
                    value={formulaId || ""}
                    onValueChange={(value) =>
                      handleUpdateWidget(widget.id, {
                        config: { ...widget.config, formulaId: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select formula" />
                    </SelectTrigger>
                    <SelectContent>
                      {formulas.map((f) => (
                        <SelectItem key={f.id || f._id} value={f.id || f._id || ""}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formula && (
                  <AnalyticsWidget
                    key={`widget-${widget.id}-formula-${formula.id || formula._id}`}
                    formula={formula}
                    showTrend={widget.displaySettings?.showTrend}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Dashboard
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

