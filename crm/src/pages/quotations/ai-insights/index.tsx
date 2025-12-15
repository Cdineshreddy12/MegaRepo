import { useParams } from "react-router-dom";
import AiInsights from "@/components/ai-insights";
import { ENTITY } from "@/constants";
import { useSuspenseQuotation } from "@/queries/QuotationQueries";

export default function AiInsightsPage() {
  const { quotationId } = useParams();
  const { data } = useSuspenseQuotation(quotationId as string);

  return (
    <AiInsights entityId={data?._id} entityName={data.quotationNumber} entityType={ENTITY.QUOTATION} />
  );
}
