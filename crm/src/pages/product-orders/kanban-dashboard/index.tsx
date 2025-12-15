import { ConfigurableChart } from "@/components/common/ConfigurableChart";
import KanbanBoard from "@/components/kanban-board";
import Page from "@/components/Page";
import { ENTITY } from "@/constants";
import { CONTENT } from "@/constants/content";
import { useDropdownOptionsByCategory } from "@/queries/DropdownQueries";
import { useOrgLeads } from "@/hooks/useOrgAwareQueries";
import { useUpdateLeadStatus } from "@/queries/LeadQueries";
import { Lead } from "@/services/api/leadService";
import { useLeadKanbanStore } from "@/store/kanban-store";
import LeadRecordCard from "./lead-record-card";

const getDataSources = async () => {
  return Object.keys(ENTITY)
    .filter(
      (entity): entity is keyof typeof CONTENT.FORM =>
        !["ACTIVITY_LOG", "AI_INSIGHTS"].includes(entity) &&
        entity in CONTENT.FORM
    )
    .map((entity) => ({ id: entity, name: CONTENT.FORM[entity]?.VIEW.title }));
};

export default function KanbanBoardPage() {
  const { activeRecord, setActiveRecord } = useLeadKanbanStore();

  const { data: leadsByStatus = [], isLoading: isLoadingStages } =
    useDropdownOptionsByCategory("lead_status");

  const columns = leadsByStatus.map((stage, index) => ({
    id: stage.value,
    name: stage.label,
    order: index,
  }));

  const { data: leads = [] as Lead[], isPending: isLoadingLeads } = useOrgLeads();

  const updatedLeadStatusMutation = useUpdateLeadStatus();

  return (
    <Page removeBackground className="px-4">
      <ConfigurableChart
        getDataSources={getDataSources}
        config={{
          chartType: "bar",
          dataSourceId: "LEAD",
          xKey: "status",
          yKey: "score",
        }}
      />

      <KanbanBoard<Lead>
        title="Leads Pipeline"
        columnKey="status"
        columns={columns}
        isLoading={isLoadingStages || isLoadingLeads}
        records={leads}
        activeRecord={activeRecord}
        setActiveRecord={setActiveRecord}
        onColumnChange={(change) =>
          updatedLeadStatusMutation.mutate({
            id: change.startId,
            status: change.endId,
            previousStatus: change.previousColumn,
          })
        }
        sortFn={(a, b, sortOption) => {
          switch (sortOption) {
            case "name-asc":
              return a.product.localeCompare(b.product);
            case "name-desc":
              return b.product.localeCompare(a.product);
            case "value-asc":
              return (a.score ?? 0) - (b.score ?? 0);
            case "value-desc":
              return (b.score ?? 0) - (a.score ?? 0);
            case "newest":
              return (
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
              );
            case "oldest":
              return (
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
              );
            default:
              return 0;
          }
        }}
        renderColumnSummary={(columnData) => {
          return (
            columnData.length > 0 && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <span>Total Leads Score:</span>
                <span className="font-medium">
                  {columnData.reduce(
                    (sum, record) => sum + (record.score ?? 0),
                    0
                  )}
                </span>
              </div>
            )
          );
        }}
        renderColumnRecord={(record) => (
          <LeadRecordCard lead={record} key={record?.id || record?._id} />
        )}
      />
    </Page>
  );
}
