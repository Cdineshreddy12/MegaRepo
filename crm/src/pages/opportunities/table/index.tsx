import { DataTable, DataTableEmptyState } from "@/components/data-grid";
import { columns, useOpportunityColumns } from "./columns";
import { useOrgOpportunities } from "@/hooks/useOrgAwareQueries";
import { Opportunity } from "@/services/api/opportunityService";
import { formatCurrency } from "@/utils/format";
import { useFormTemplate } from "@/hooks/useFormTemplate";
import { useMemo } from "react";

interface OpportunityTableProps {
  onRowDoubleClick?: (row: Opportunity) => void
}

function OpportunityTable(props: OpportunityTableProps) {
  const { data, isPending, isError } = useOrgOpportunities();
  const formattedOpportunities = isPending || isError || !data
    ? []
    : data;

  // Decide upfront: Check if ANY opportunity has formTemplateId
  // This determines whether we need template-based columns or normal columns
  const hasAnyTemplate = useMemo(() => {
    return formattedOpportunities.some(opp => opp.formTemplateId);
  }, [formattedOpportunities]);

  // Find the most common template ID if templates are present
  const templateId = useMemo(() => {
    if (!hasAnyTemplate || formattedOpportunities.length === 0) {
      return null; // Use null to explicitly indicate no template needed
    }
    
    // Find the most common template ID
    const templateIds = formattedOpportunities
      .map(opp => opp.formTemplateId)
      .filter(Boolean) as string[];
    
    if (templateIds.length > 0) {
      // Count occurrences and return the most common one
      const counts = templateIds.reduce((acc, id) => {
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    }
    return null; // Use null to explicitly indicate no template needed
  }, [formattedOpportunities, hasAnyTemplate]);

  // Load template ONLY if we have opportunities with templates
  // Pass null (not undefined) when no template is needed to prevent hook from loading default template
  const { template, loading: templateLoading } = useFormTemplate(
    "opportunity",
    hasAnyTemplate && templateId ? templateId : null
  );

  // Always call the hook to maintain the Rules of Hooks
  // Pass template if we have one and it's loaded, otherwise pass null
  const templateToUse = (hasAnyTemplate && templateId && template) ? template : null;
  const tableColumns = useOpportunityColumns(templateToUse);

  // Show loading while:
  // 1. Opportunities are loading, OR
  // 2. Template is required but still loading
  if (isPending || (hasAnyTemplate && templateId && templateLoading)) {
    return (
      <DataTable
        tableId="opportunity"
        data={[]}
        columns={columns}
        loading={true}
        isLoading={true}
        loadingRows={5}
      />
    );
  }

  return (
    <DataTable
      tableId="opportunity"
      data={formattedOpportunities}
      columns={tableColumns}
      onRowDoubleClick={props?.onRowDoubleClick}
      noDataMessage={
        <DataTableEmptyState
          action={{
            link: "new",
            label: "ADD OPPORTUNITY",
          }}
          title="You don't have any opportunities"
          subTitle="Please add opportunity"
        />
      }
      loading={isPending}
      filterVariant="column"
      isLoading={isPending}
      loadingRows={5}
      enableColumnReordering={false}
      enableExport={false}
      enableRowSelectionSummary
      renderRowSelectionSummary={(selectedRows) => {
        const totalRevenue = selectedRows.reduce((sum, row) => sum + (row.revenue || 0), 0);
        const totalExpectedProfit = selectedRows.reduce((sum, row) => sum + (row.expectedProfit || 0), 0);
        const profitability = totalRevenue > 0 ? (totalExpectedProfit / totalRevenue) * 100 : 0;

        return (
          <div className="flex items-center justify-between p-4 bg-background rounded-md shadow-sm w-full">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Total Revenue</span>
              <span className="text-lg font-semibold">{formatCurrency(totalRevenue)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Total Expected Profit</span>
              <span className="text-lg font-semibold">{formatCurrency(totalExpectedProfit)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Profitability</span>
              <span className="text-lg font-semibold">{profitability.toFixed(2)}%</span>
            </div>
          </div>
        );
      }}
    />
  );
}

export default OpportunityTable;