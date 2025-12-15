import Typography from "@/components/common/Typography";
import useRedirect from "@/hooks/useRedirect";
import { useOpportunities } from "@/queries/OpportunityQueries";
import { toPrettyString } from "@/utils/common";
import { formatCurrency } from "@/utils/format";
import { stageConfig } from "./config";
import { GripHorizontal } from "lucide-react";

export default function RecentDeals({
  onClick,
}: {
  onClick: (stage: string) => void;
}) {
  const redirect = useRedirect();
  const { data: opportunities, isFetching: isOpportunitiesFetching } =
    useOpportunities();
  // Get recent deals from opportunities with creator information
  const getRecentDeals = () => {
    if (!opportunities || isOpportunitiesFetching) return [];

    // Sort by createdAt date (newest first)
    const sorted = [...opportunities].sort((a, b) => {
      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    });

    // Return top 3 most recent deals with creator information
    return sorted.slice(0, 3).map((opp) => {
      // Extract creator name if createdBy is an object
      const creatorName =
        typeof opp.createdBy === "object" && opp.createdBy !== null
          ? opp.createdBy.name || "Unknown"
          : "Unknown";

      return {
        company: opp.name,
        value: formatCurrency(opp.revenue || 0, "INR"),
        stage: opp.stage
          ? stageConfig[opp.stage as keyof typeof stageConfig]?.displayName ||
            opp.stage
          : "",
        probability: opp.profitability || 0,
        id: opp.id || opp._id,
        createdBy: creatorName,
      };
    });
  };

  const recentDeals = getRecentDeals();
  return (
    <div className="bg-card p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm col-span-full h-full">
      <GripHorizontal
                className="drag-handle cursor-move absolute inset-0 mx-auto text-gray-400"
                onClick={(e) => e.stopPropagation()}
              />
      <div className="flex items-center justify-between mb-6">
        <Typography variant="h3">Recent Deals</Typography>
        <button
          className="text-primary text-sm hover:text-blue-700"
          onClick={() => redirect.to("/opportunities")}
        >
          View All
        </button>
      </div>
      <div className="space-y-4">
        {recentDeals.length > 0 ? (
          recentDeals.map((deal, index) => (
            <div
              key={index}
              onClick={() => onClick(deal.stage)}
              className="flex items-center justify-between p-4 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                  {toPrettyString(deal.company || "")}
                </h3>
                <div className="flex flex-col">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {deal.stage}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Created by: {deal.createdBy}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {deal.value}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {deal.probability}%
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-gray-500">
            No recent deals found
          </div>
        )}
      </div>
    </div>
  );
}
