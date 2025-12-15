"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { analyticsService, DashboardView, AnalyticsFormula } from "@/services/api/analyticsService";
import { AnalyticsWidget } from "./AnalyticsWidget";

interface DashboardViewerProps {
  dashboard: DashboardView;
  onClose?: () => void;
}

export function DashboardViewer({ dashboard, onClose }: DashboardViewerProps) {
  const [formulas, setFormulas] = useState<AnalyticsFormula[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFormulas();
  }, []);

  const loadFormulas = async () => {
    try {
      const data = await analyticsService.getFormulas();
      setFormulas(data);
    } catch (error) {
      console.error("Failed to load formulas:", error);
    } finally {
      setLoading(false);
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{dashboard.name}</h2>
          {dashboard.description && (
            <p className="text-gray-500 mt-1">{dashboard.description}</p>
          )}
        </div>
      </div>

      {dashboard.widgets && dashboard.widgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboard.widgets.map((widget) => {
            const formulaId = widget.config.formulaId;
            const formula = formulaId
              ? formulas.find(
                  (f) => f.id === formulaId || f._id === formulaId
                )
              : null;

            if (!formula) {
              return (
                <Card key={widget.id}>
                  <CardHeader>
                    <CardTitle className="text-sm">{widget.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">
                      Formula not found
                    </p>
                  </CardContent>
                </Card>
              );
            }

            return (
              <AnalyticsWidget
                key={`widget-${widget.id}-formula-${formula.id || formula._id}`}
                formula={formula}
                showTrend={widget.displaySettings?.showTrend}
              />
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">No widgets in this dashboard</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

