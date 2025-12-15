import { DateTimePill } from "@/components/common/DateTimePill";
import { GreetingCard } from "@/components/common/GreetingCard";
import IconButton from "@/components/common/IconButton";
import Page, { PageHeader } from "@/components/Page";
import useRedirect from "@/hooks/useRedirect";
import { CalendarIcon, UploadCloudIcon, Users2Icon } from "lucide-react";
import OverviewStatsSection, {
  ClosedRevenueCard,
  ContactStaticsCard,
  ExpectedProfitCard,
  OpportunityStaticsCard,
} from "./OverviewStatsSection";
import ChatbotWidget from "@/components/chatbot/Chatbot";
import RecentDealsSection from "./RecentDealsSection";
import DealStageOverview from "./DealStageOverview";
import OpportunitiesByStatusSection from "./OpportunitiesByStatusSection";
import SalesPerformanceCard from "@/components/common/SalesPerformanceCard";
import { Link } from "react-router-dom";
import { useSuspenseContacts } from "@/queries/ContactQueries";
import { useSuspenseOpportunities } from "@/queries/OpportunityQueries";
import { processContacts } from "./processContacts";
import { processOpportunities } from "./processOpportunities";
import { Opportunity } from "@/services/api/opportunityService";
import DashboardGrid from "./DragAndDropGrid";
import { Layout } from "react-grid-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Contact } from "@/services/api/contactService";
import { AreaChartComponent } from "@/components/common/AreaChart";
import { useSidebar } from "@/components/ui/sidebar";
import { BentoCard } from "@/components/common/BentoGrid";
import DashboardCard from "@/components/common/DashboardCard";
import { groupBy } from "lodash";
import RecentDeals from "./RecentDeals";
import { generateFilteredUrl } from "@/utils/url-filters";
import { ROUTE_PATH } from "@/constants";
import { DealStatusMetricCard } from "./Cards";

const demoCard = {
  Icon: CalendarIcon,
  name: "Calendar",
  description: "Use the calendar to filter your files by date.",
  href: "/",
  cta: "Learn more",
  background: <img className="absolute -right-20 -top-20 opacity-60" />,
  className: "lg:col-start-3 lg:col-end-3 lg:row-start-1 lg:row-end-2",
};

export default function DashboardNew() {
  const redirect = useRedirect();
  const {
    data: contacts,
    dataUpdatedAt: contactsUpdatedAt,
    refetch: refetchContacts,
  } = useSuspenseContacts();

  const {
    data: opportunities,
    dataUpdatedAt: opportunitiesUpdatedAt,
    refetch: refetchOpportuniries,
  } = useSuspenseOpportunities();

  const {
    recentOpportunities,
    opportunitiesByStatusMetrics,
    opportunitiesByStageMetrics,
    totalClosedWonRevenue,
    totalExpectedProfit,
    totalOpportunities,
    closedRevenuesByMonth,
  } = processOpportunities(opportunities as Opportunity[]);

  const groupByCreatedAt = groupBy(contacts, "createdAt");
  const contactsChartData = Object.keys(groupByCreatedAt).map((key) => ({
    value: groupByCreatedAt[key]?.length,
    createdAt: key,
  }));

  const handleCardClick = (stage: string) => {
    // Use searchParams to add the stage filter
    const searchParams = new URLSearchParams();
    searchParams.set("stage", stage);

    const url = generateFilteredUrl(
      ROUTE_PATH.OPPORTUNITY,
      "opportunity",
      "stage",
      [stage]
    );

    // Navigate to opportunities with filter
    redirect.to(`${url}&activeMode=2`);
  };

  // Dynamically determine which cards to render and their keys
  // Flatten all cards so each is an individual draggable card
  const cardsToRender = [
    {
      key: "contact",
      x: 0,
      y: 0,
      w: 3,
      h: 2,
      element: <ContactStaticsCard contacts={contacts as Contact[]} key="contact" />,
    },
    {
      key: "opportunity",
      x: 3,
      y: 0,
      w: 3,
      h: 2,
      element: <OpportunityStaticsCard totalOpportunities={totalOpportunities} key="opportunity" />,
    },
    {
      key: "closedWonRevenue",
      x: 0,
      y: 2,
      w: 3,
      h: 2,
      element: <ClosedRevenueCard totalClosedWonRevenue={totalClosedWonRevenue} key="closedWonRevenue" />,
    },
    {
      key: "expectedProfit",
      x: 3,
      y: 0,
      w: 3,
      h: 2,
      element: <ExpectedProfitCard key="expectedProfit" totalExpectedProfit={totalExpectedProfit} />,
    },
    {
      key: "recentDeals",
      x: 0,
      y: 2,
      w: 6,
      h: 4,
      element: <RecentDeals onClick={handleCardClick} key="recentDeals" />,
    },
    // Each DealStatusMetricCard is now its own draggable card
    ...opportunitiesByStageMetrics.map((metric, idx) => ({
      key: `dealStageOverview-${metric.stage}`,
      x: 6 + (idx % 2) * 3,
      y: 2 + Math.floor(idx / 2) * 2,
      w: 6,
      h: 2,
      element: (
        <DealStatusMetricCard
          key={`dealStageOverview-${metric.stageKey}`}
          onClick={() => metric?.stageKey ? handleCardClick(metric?.stageKey) : () => {}}
          metric={metric}
        />
      ),
    })),
    // Add/remove cards as needed based on your data
  ];

  // Generate layout dynamically based on cardsToRender
  const generateLayout = (
    cards: { key: string; x?: number; y?: number; w?: number; h?: number }[]
  ): Layout[] =>
    cards.map((card, idx) => ({
      i: card.key,
      x: card.x !== undefined ? card.x : (idx * 3) % 12,
      y: card.y !== undefined ? card.y : Math.floor((idx * 3) / 12) * 2,
      w: card.w !== undefined ? card.w : 3,
      h: card.h !== undefined ? card.h : 2,
    }));

  const layout: Layout[] = generateLayout(cardsToRender);

  return (
    <Page
      className="relative"
      removeBackground
      header={
        <PageHeader
          hideBackButton
          title={
            <div className="flex gap-4 items-center flex-wrap">
              <DateTimePill />
              <GreetingCard />
            </div>
          }
          actions={[
            <IconButton
              variant="outline"
              onClick={() => {}}
              icon={UploadCloudIcon}
            >
              Export
            </IconButton>,
            <IconButton
              icon={Users2Icon}
              onClick={() => redirect.to("/contacts")}
            >
              New Contact
            </IconButton>,
          ]}
        />
      }
    >
      {/* <Link to="/dashboard">Switch to old</Link> */}
      <DashboardGrid layout={layout}>
        {cardsToRender.map(card => card.element)}
      </DashboardGrid>

      <div className="absolute">
        <ChatbotWidget />
      </div>
    </Page>
  );
}
