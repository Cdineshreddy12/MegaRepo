import React, { Suspense } from "react";
import { Metric, OpportunityStatusMetricsCard } from "./Cards";
import useRedirect from "@/hooks/useRedirect";
import { useSuspenseOpportunities } from "@/queries/OpportunityQueries";
import { groupBy } from "lodash";
import { statusConfig } from "./config";
import { formatCurrency } from "@/utils/format";
import { FileText } from "lucide-react";
import { generateFilteredUrl } from "@/utils/url-filters";
import { ROUTE_PATH } from "@/constants";

export default function OpportunitiesByStatusSection() {
  const redirect = useRedirect();
  const { data: opportunities } = useSuspenseOpportunities();
  const oppByStatus = groupBy(opportunities, "status");
  const opportunityStatusMetrics = Object.entries(oppByStatus).map(
    ([status, opps]) => {
      const statusKey = status as keyof typeof statusConfig;
      const config = statusConfig[statusKey] || {
        icon: FileText,
        color: "muted-foreground",
        description: "Opportunities with this status",
        displayName: status.charAt(0).toUpperCase() + status.slice(1),
      };

      const totalValue = opps.reduce((sum, opp) => sum + (opp.revenue || 0), 0);

      const totalExpectedProfit = opps.reduce((sum, opp) => {
        const revenue = Number(opp.revenue) || 0;
        const profitability = Number(opp.profitability) || 0;
        return sum + (revenue * profitability) / 100;
      }, 0);

      return {
        status: config.displayName,
        count: opps.length,
        value: formatCurrency(totalValue),
        expectedProfit: totalExpectedProfit,
        icon: config.icon,
        color: config.color,
        description: config.description,
        statusKey: status,
      };
    }
  );
  const handleStatusCardClick = (status: string) => {
    const url = generateFilteredUrl(
      ROUTE_PATH.OPPORTUNITY,
      "opportunity",
      "status",
      [status]
    );
    redirect.to(url);
  };
  return (
    <Suspense fallback={<div>Loading Opportunities...</div>}>
      <h2 className="text-lg font-semibold  mb-4">Opportunities by Status</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {opportunityStatusMetrics.length > 0 ? (
          opportunityStatusMetrics
            .filter((metric) =>
              ["prospect", "upside", "commit"].includes(
                metric.statusKey.toLowerCase()
              )
            )
            .map((metric) => (
              <OpportunityStatusMetricsCard
                key={metric?.status || "unknown"}
                onClick={
                  metric?.statusKey
                    ? () => handleStatusCardClick(metric.statusKey)
                    : () => {}
                }
                metric={{
                  ...metric,
                } as Metric & { expectedProfit: number }}
              />
            ))
        ) : (
          <div className="col-span-3 py-10 text-center text-muted-foreground">
            No opportunity data available
          </div>
        )}
      </div>
    </Suspense>
  );
}
