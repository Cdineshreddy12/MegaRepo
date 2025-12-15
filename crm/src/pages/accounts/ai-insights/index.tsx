import { useParams } from "react-router-dom";
import AiInsights from "@/components/ai-insights";
import { ENTITY } from "@/constants";
import { useSuspenseAccount } from "@/queries/AccountQueries";

export default function AiInsightsPage() {
  const { accountId } = useParams();
  const { data } = useSuspenseAccount(accountId as string);

  return (
    <AiInsights entityId={data?._id} entityName={data.companyName} entityType={ENTITY.ACCOUNT} />
  );
}
