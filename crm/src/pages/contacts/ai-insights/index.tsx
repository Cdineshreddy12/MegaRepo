import { useParams } from "react-router-dom";
import AiInsights from "@/components/ai-insights";
import { ENTITY } from "@/constants";
import { useSuspenseContact } from "@/queries/ContactQueries";
import { formatName } from "@/utils/format";

export default function AiInsightsPage() {
  const { contactId } = useParams();
  const { data } = useSuspenseContact(contactId as string);

  return (
    <AiInsights entityId={data?._id} entityName={formatName(data)} entityType={ENTITY.CONTACT} />
  );
}
