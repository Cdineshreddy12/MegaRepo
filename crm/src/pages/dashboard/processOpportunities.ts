import { Opportunity } from "@/services/api/opportunityService";
import { formatCurrency } from "@/utils/format";
import { groupBy } from "lodash";
import { getRecentDeals } from "./utils";
import { stageConfig, statusConfig } from "./config";
import { FileText } from "lucide-react";

/**
 * Processes an array of opportunities and returns structured metrics and summaries.
 *
 * @param opportunities - An array of `Opportunity` objects to process.
 * @returns An object containing the following metrics and summaries:
 * - `opportunitiesByStageMetrics`: An array of metrics grouped by opportunity stage, 
 *    including stage name, count, total value, and formatted value as currency.
 * - `opportunitiesByStatusMetrics`: An array of metrics grouped by opportunity status, 
 *    including status name, count, total value, and formatted value as currency.
 * - `totalExpectedProfit`: The total expected profit calculated from all opportunities.
 * - `totalExpectedProfitAsCurrency`: The total expected profit formatted as currency.
 * - `totalClosedWonRevenue`: The total revenue from opportunities in the "closed_won" stage.
 * - `totalClosedWonRevenueAsCurrency`: The total revenue from "closed_won" opportunities formatted as currency.
 */
export const processOpportunities = (opportunities: Opportunity[]) => {
  const totalOpportunities = opportunities.length;
  // This function processes opportunities data and returns a structured object
  const opportunitiesByStage = groupBy(opportunities, "stage");
  const opportunitiesByStatus = groupBy(opportunities, "status");

 
  const opportunitiesByStageMetrics = Object.entries(opportunitiesByStage).map(
    ([stage, opportunities]) => {
     
      const totalValue = opportunities.reduce(
        (sum, opportunity) => sum + (opportunity.revenue || 0),
        0
      );

      const totalExpectedProfit = opportunities.reduce(
        (sum, opportunity) => sum + (opportunity.expectedProfit || 0),
        0
      );
      const totalExpectedProfitAsCurrency = formatCurrency(totalExpectedProfit);
      const config = stageConfig[stage as keyof typeof stageConfig] || {
        icon: FileText,
        color: "muted-foreground",
        description: "Opportunities with this stage",
      }
        
    
      return {
        stage,
        count: opportunities.length,
        value: totalValue,
        valueAsCurrency: formatCurrency(totalValue),
        expectedProfit: totalExpectedProfit,
        expectedProfitAsCurrency: totalExpectedProfitAsCurrency,
        icon: config.icon,
        color: config.color,
        description: config.description,
        stageKey: stage,
        displayName: config.displayName,
      };
    }
  );

  const opportunitiesByStatusMetrics = Object.entries(
    opportunitiesByStatus
  ).map(([status, opportunities]) => {
    const totalValue = opportunities.reduce(
      (sum, opportunity) => sum + (opportunity.revenue || 0),
      0
    );
    return {
      status,
      count: opportunities.length,
      value: totalValue,
      valueAsCurrency: formatCurrency(totalValue),
      ...(statusConfig[status as keyof typeof statusConfig] || {})
    };
  });

  const totalExpectedProfit = opportunities.reduce(
    (sum, opportunity) => sum + (opportunity.expectedProfit || 0),
    0
  );

  const totalExpectedProfitAsCurrency = formatCurrency(totalExpectedProfit);

  const closedWonOpportunities = opportunitiesByStage["closed_won"] || [];

  const totalClosedWonRevenue = closedWonOpportunities.reduce(
    (sum, opportunity) => sum + (opportunity.revenue || 0),
    0
  );


  const closedRevenuesByMonth = opportunitiesByStage['Proposal']?.map(stage => ({updatedAt: stage.updatedAt, revenue: (stage.revenue + Math.random(2400))}))

  const totalClosedWonRevenueAsCurrency = formatCurrency(totalClosedWonRevenue);
  const recentOpportunities = getRecentDeals(
    opportunities as Opportunity[])

  console.log({closedRevenuesByMonth})

  return {
    totalOpportunities,
    opportunitiesByStageMetrics,
    opportunitiesByStatusMetrics,
    totalExpectedProfit,
    totalExpectedProfitAsCurrency,
    totalClosedWonRevenue,
    totalClosedWonRevenueAsCurrency,
    recentOpportunities,
    closedRevenuesByMonth
  };
};
