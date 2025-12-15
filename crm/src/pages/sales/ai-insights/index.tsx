import { useParams } from "react-router-dom";
import AiInsights from "@/components/ai-insights";
import { ENTITY } from "@/constants";
import { useSuspenseSalesOrder } from "@/queries/SalesOrderQueries";
import { Account } from "@/services/api/accountService";

export default function AiInsightsPage() {
  const { salesOrderId } = useParams();
  const { data } = useSuspenseSalesOrder(salesOrderId as string);

  return (
    <AiInsights
      entityId={data._id}
      entityName={typeof data.accountId === "object" && data.accountId !== null ? (data.accountId as Account).companyName : ""}
      entityType={ENTITY.SALES_ORDER}
    />
  );
}
