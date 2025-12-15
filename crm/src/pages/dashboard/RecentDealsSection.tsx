import Typography from "@/components/common/Typography";
import useRedirect from "@/hooks/useRedirect";
import { Opportunity } from "@/services/api/opportunityService";
import DealCard from "@/components/common/DealCard";

export default function RecentDealsSection({
 recentOpportunities, 
}: {
  recentOpportunities: Opportunity[];
}) {
  const redirect = useRedirect();

  return (
    <div className="bg-background p-6 rounded-xl border border-border shadow-sm col-span-full">
      <div className="flex items-center justify-between mb-6">
        <Typography variant="h3">Recent Deals</Typography>
        <button
          className="text-primary text-sm hover:text-primary-hover"
          onClick={() => redirect.to("/opportunities")}
        >
          View All
        </button>
      </div>
      <div className="space-y-4">
        {recentOpportunities.length > 0 ? (
          recentOpportunities.map((deal, index) => <DealCard key={index} deal={deal} />)
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            No recent deals found
          </div>
        )}
      </div>
    </div>
  );
}
