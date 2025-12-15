"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Page, { PageHeader } from "@/components/Page";
import { FormulaList } from "@/components/analytics/FormulaList";
import { DashboardList } from "@/components/analytics/DashboardList";
import { BarChart3, Calculator, LayoutDashboard } from "lucide-react";

export default function AnalyticsPage() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();

  return (
    <Page
      header={
        <PageHeader
          title="Analytics & Reports"
          description="Create custom analytics formulas and dashboards"
        />
      }
    >
      <Tabs defaultValue="formulas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="formulas" className="gap-2">
            <Calculator className="h-4 w-4" />
            Formulas
          </TabsTrigger>
          <TabsTrigger value="dashboards" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboards
          </TabsTrigger>
        </TabsList>

        <TabsContent value="formulas" className="space-y-4">
          <FormulaList formTemplateId={selectedTemplateId} />
        </TabsContent>

        <TabsContent value="dashboards" className="space-y-4">
          <DashboardList />
        </TabsContent>
      </Tabs>
    </Page>
  );
}

