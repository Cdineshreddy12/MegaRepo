
import { generateFilteredUrl } from "@/utils/url-filters";
import { ROUTE_PATH } from "@/constants";
import useRedirect from "@/hooks/useRedirect";
import { Suspense } from "react";
import { DealStatusMetricCard, Metric, StatusCard } from "./Cards";


function DealStageOverview({
  metrics
}: {
  metrics: Metric[];
}) {
  const redirect = useRedirect();
  
  const handleCardClick = (stage: string) => {
    const url = generateFilteredUrl(
      ROUTE_PATH.OPPORTUNITY,
      "opportunity",
      "stage",
      [stage]
    );
    redirect.to(url);
  };
  return (
    <Suspense fallback={<div>Loading Opportunities...</div>}>
      <h2 className="text-lg font-semibold mb-4">Deal Stage Overview</h2>
      <div className="grid grid-cols-1 gap-4">
        {metrics.length > 0 ? (
          metrics.map((metric) => (
            <StatusCard
              key={metric.displayName}
              title={metric.displayName}
              icon={<metric.icon />}
              amountLabel={metric.displayName}
              amountValue={metric.value}
              total={metric.count}
              description={metric.description}

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

export default DealStageOverview;
