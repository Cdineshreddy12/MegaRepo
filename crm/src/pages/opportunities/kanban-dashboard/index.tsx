import { ConfigurableChart } from "@/components/common/ConfigurableChart";
import KanbanBoard from "@/components/kanban-board";
import OpportunityCard from "@/pages/opportunities/kanban-dashboard/opportunity-card";
import Page from "@/components/Page";
import { ENTITY } from "@/constants";
import { CONTENT } from "@/constants/content";
import { useDropdownOptionsByCategory } from "@/queries/DropdownQueries";
import {
  useOpportunities,
  useUpdateOpportunityStage,
} from "@/queries/OpportunityQueries";
import { Opportunity } from "@/services/api/opportunityService";
import { useOpportunityKanbanStore } from "@/store/kanban-store";
import { formatCurrency } from "@/utils/format";

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
  const { activeRecord, setActiveRecord } = useOpportunityKanbanStore();
  const { data: stagesData = [], isLoading: isLoadingStages } =
    useDropdownOptionsByCategory("opportunity_stages");
  const columns = stagesData.map((stage, index) => ({
    id: stage.value,
    name: stage.label,
    order: index,
  }));

  const {
    data: opportunities = [] as Opportunity[],
    isLoading: isLoadingOpportunities,
  } = useOpportunities();
  const updateOpportunityStageMutation = useUpdateOpportunityStage();

  return (
    <Page removeBackground className="px-4">
      <ConfigurableChart
        getDataSources={getDataSources}
        config={{
          chartType: "bar",
          dataSourceId: "OPPORTUNITY",
          xKey: "stage",
          yKey: "revenue",
        }}
      />

      <KanbanBoard<Opportunity>
        title="Opportunity Pipeline"
        columnKey="stage"
        columns={columns}
        isLoading={isLoadingStages || isLoadingOpportunities}
        records={opportunities}
        activeRecord={activeRecord}
        setActiveRecord={setActiveRecord}
        onColumnChange={(change) =>
          updateOpportunityStageMutation.mutate({
            id: change.startId,
            stage: change.endId,
            previousStage: change.previousColumn,
          })
        }
        renderColumnSummary={(columnData) => {
          return (
            columnData.length > 0 && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <span>Total value:</span>
                <span className="font-medium">
                  {formatCurrency(
                    columnData.reduce((sum, record) => sum + record.revenue, 0)
                  )}
                </span>
              </div>
            )
          );
        }}
        renderColumnRecord={(record) => (
          <OpportunityCard opportunity={record} />
        )}
        sortFn={(a, b, sortOption) => {
          switch (sortOption) {
            case "name-asc":
              return a.name.localeCompare(b.name);
            case "name-desc":
              return b.name.localeCompare(a.name);
            case "value-asc":
              return a.revenue - b.revenue;
            case "value-desc":
              return b.revenue - a.revenue;
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
      />
    </Page>
  );
}
