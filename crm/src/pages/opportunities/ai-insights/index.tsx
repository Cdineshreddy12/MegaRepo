import { useParams } from "react-router-dom";
import AiInsights from "@/components/ai-insights";
import { ENTITY } from "@/constants";
import { useSuspenseOpportunity } from "@/queries/OpportunityQueries";

export default function AiInsightsPage() {
  const { opportunityId } = useParams();
  const { data } = useSuspenseOpportunity(opportunityId as string);

  return (
    <AiInsights entityId={data?._id} entityName={data.name} entityType={ENTITY.OPPORTUNITY} />
  );
}
