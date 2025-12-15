import { useParams } from "react-router-dom";
import { useSuspenseLead } from "@/queries/LeadQueries";
import AiInsights from "@/components/ai-insights";
import { ENTITY } from "@/constants";

export default function AiInsightsPage() {
  const { leadId } = useParams();
  const { data } = useSuspenseLead(leadId as string);

  return (
    <AiInsights entityId={data._id} entityName={data.companyName} entityType={ENTITY.LEAD} />
  );
}
