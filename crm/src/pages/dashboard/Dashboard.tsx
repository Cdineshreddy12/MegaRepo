
import Chatbot from "@/components/chatbot/Chatbot";
import { DateTimePill } from "@/components/common/DateTimePill";
import { GreetingCard } from "@/components/common/GreetingCard";
import OverviewCard from "@/components/common/OverviewCard";
import IconButton from "@/components/common/IconButton";
// import CreditDisplayCard from "@/components/common/CreditDisplayCard"; // Removed - now in header
import CreditActivityViewer from "@/components/common/CreditActivityViewer";
import LeadsView from "@/pages/leads";
import useRedirect from "@/hooks/useRedirect";
import { cn } from "@/lib/utils";
import { useOrgContacts } from "@/hooks/useOrgAwareQueries";
import { useOrgOpportunities } from "@/hooks/useOrgAwareQueries";
import { formatCurrency, formatName } from "@/utils/format";
import { FileText, Users, IndianRupee, Percent, TrendingUp, BotIcon, UploadCloudIcon, Users2Icon, BarChart3 } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "react-day-picker";
import { useNavigate } from "react-router-dom";
import { stageConfig, statusConfig } from "./config";
import { DealStatusMetricCard, Metric, OpportunityStatusMetricsCard } from "./Cards";
import Typography from "@/components/common/Typography";
import { generateFilteredUrl } from "@/utils/url-filters";
import { ROUTE_PATH } from "@/constants";
import { User } from "@/components/common/UserAvatar";
import { toPrettyString } from "@/utils/common";


function Dashboard() {
  const navigation = useNavigate();
  const redirect = useRedirect();
  const [selectedView, setSelectedView] = useState<string | null>(null);
  const [selectedStage] = useState<string | null>(null);

  // Fetching the contacts and opportunities
  const { data: contacts, isFetching: isContactsFetching, error: contactsError } = useOrgContacts();
  const { data: opportunities, isFetching: isOpportunitiesFetching, error: opportunitiesError } =
    useOrgOpportunities();

  const [openChat, setOpenChat] = useState(false);
  const [dealStatusMetrics, setDealStatusMetrics] = useState<Metric[]>([]);
  const [opportunityStatusMetrics, setOpportunityStatusMetrics] = useState<unknown[]>([]);
  const [closedWonRevenue, setClosedWonRevenue] = useState(0);
  const [totalExpectedProfit, setTotalExpectedProfit] = useState(0);

  // Helper function to safely convert Decimal128 or number values
  const safeNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    // Handle MongoDB Decimal128 format: {$numberDecimal: "123.45"}
    if (typeof value === 'object' && value.$numberDecimal !== undefined) {
      return parseFloat(value.$numberDecimal) || 0;
    }
    // Handle regular Decimal128 objects (if they have toString method)
    if (typeof value === 'object' && typeof value.toString === 'function') {
      return parseFloat(value.toString()) || 0;
    }
    // Already a number or string
    return typeof value === 'number' ? value : parseFloat(value) || 0;
  };

  // Calculate revenue metrics and deal statistics from opportunity data
  useEffect(() => {
    if (!isOpportunitiesFetching && !opportunitiesError && Array.isArray(opportunities) && opportunities.length > 0) {
      // Group opportunities by stage
      const oppByStage = opportunities.reduce((acc, opp) => {
        const stage = opp.stage as keyof typeof stageConfig;
        if (!acc[stage]) {
          acc[stage] = [];
        }
        acc[stage].push(opp);
        return acc;
      }, {} as Record<string, unknown[]>);

      // Group opportunities by status
      const oppByStatus = opportunities.reduce((acc, opp) => {
        const status = opp.status || "unknown";
        if (!acc[status]) {
          acc[status] = [];
        }
        acc[status].push(opp);
        return acc;
      }, {} as Record<string, unknown[]>);

      // Calculate closed won total revenue
      const closedWonOpps = oppByStage["closed_won"] || [];
      const totalClosedWonRevenue = closedWonOpps.reduce(
        (sum, opp) => sum + safeNumber(opp.revenue),
        0
      );
      setClosedWonRevenue(totalClosedWonRevenue);

      // Calculate total expected profit across all opportunities
      // Expected profit = (Revenue * Profitability) / 100
      const calculatedTotalExpectedProfit = opportunities.reduce((sum, opp) => {
        const revenue = safeNumber(opp.revenue);
        const profitability = safeNumber(opp.profitability);
        const expectedProfit = (revenue * profitability) / 100;
        return sum + expectedProfit;
      }, 0);
      setTotalExpectedProfit(calculatedTotalExpectedProfit);

      // Create metrics for each stage
      const stageMetrics = Object.entries(oppByStage).map(([stage, opps]) => {
        const stageKey = stage as keyof typeof stageConfig;
        const config = stageConfig[stageKey] || {
          icon: <FileText className="h-5 w-5 text-gray-500" />,
          color: "gray",
          description: "Opportunities in this stage",
          displayName: stage,
        };

        // Calculate total revenue for this stage
        const totalValue = opps.reduce(
          (sum, opp) => sum + safeNumber(opp.revenue),
          0
        );

        return {
          status: config.displayName,
          count: opps.length,
          value: formatCurrency(totalValue, "INR"),
          icon: config.icon,
          color: config.color,
          description: config.description,
          stageKey: stage,
        };
      });

      // Create metrics for each status
      const statusMetrics = Object.entries(oppByStatus).map(
        ([status, opps]) => {
          const statusKey = status as keyof typeof statusConfig;
          const config = statusConfig[statusKey] || {
            icon: <FileText className="h-5 w-5 text-gray-500" />,
            color: "gray",
            description: "Opportunities with this status",
            displayName: status.charAt(0).toUpperCase() + status.slice(1),
          };

          // Calculate total revenue for this status
          const totalValue = opps.reduce(
            (sum, opp) => sum + safeNumber(opp.revenue),
            0
          );

          // Calculate expected profit for this status
          const totalExpectedProfit = opps.reduce((sum, opp) => {
            const revenue = safeNumber(opp.revenue);
            const profitability = safeNumber(opp.profitability);
            return sum + (revenue * profitability) / 100;
          }, 0);

          return {
            status: config.displayName,
            count: opps.length,
            value: formatCurrency(totalValue, "INR"),
            expectedProfit: formatCurrency(totalExpectedProfit, "INR"),
            icon: config.icon,
            color: config.color,
            description: config.description,
            statusKey: status,
          };
        }
      );

      setDealStatusMetrics(stageMetrics);
      setOpportunityStatusMetrics(statusMetrics);
    }
  }, [opportunities, isOpportunitiesFetching]);

  // Updated stats array with closed won revenue and expected profit
  const stats = [
    {
      icon: <Users className="w-6 h-6 text-primary" />,
      label: "Total Contacts",
      value: isContactsFetching ? "--" : contactsError ? "Error" : (Array.isArray(contacts) ? contacts.length : 0),
      change: "",
      positive: true,
      target: "/contacts",
      bgIcon: Users,
      enableAvatarList: true,
    },
    {
      icon: <IndianRupee className="w-6 h-6 text-green-600" />,
      label: "Closed Revenue",
      value: isOpportunitiesFetching
        ? "--"
        : formatCurrency(closedWonRevenue, "INR"),
      change: "",
      positive: true,
      target: "/opportunities",
    },
    {
      icon: <Percent className="w-6 h-6 text-purple-600" />,
      label: "Expected Profit",
      value: isOpportunitiesFetching
        ? "--"
        : formatCurrency(totalExpectedProfit, "INR"),
      change: "",
      positive: true,
      target: "/opportunities",
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-blue-600" />,
      label: "Opportunities",
      value: isOpportunitiesFetching ? "--" : opportunitiesError ? "Error" : (Array.isArray(opportunities) ? opportunities.length : 0),
      change: "",
      positive: true,
      target: "/opportunities",
    },
  ];

  const genders = ['boy', 'girl']

  // Get recent deals from opportunities with creator information
  const recentDeals = useMemo(() => {
    if (!Array.isArray(opportunities) || isOpportunitiesFetching || opportunitiesError) return [];

    // Sort by createdAt date (newest first)
    const sorted = [...opportunities].sort((a, b) => {
      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    });

    // Return top 3 most recent deals with creator information
    return sorted.slice(0, 3).map((opp) => {
      // Extract creator name if createdBy is an object
      const creatorName =
        typeof opp.createdBy === "object" && opp.createdBy !== null
          ? opp.createdBy.name || "Unknown"
          : "Unknown";

      return {
        company: opp.name,
        value: formatCurrency(safeNumber(opp.revenue), "INR"),
        stage: opp.stage
          ? stageConfig[opp.stage as keyof typeof stageConfig]?.displayName ||
            opp.stage
          : "",
        probability: safeNumber(opp.profitability),
        id: opp.id || opp._id,
        createdBy: creatorName,
      };
    });
  }, [opportunities, isOpportunitiesFetching, opportunitiesError]);

  const handleCardClick = (stage: string) => {
    // Use searchParams to add the stage filter
    const searchParams = new URLSearchParams();
    searchParams.set("stage", stage);

    const url = generateFilteredUrl(ROUTE_PATH.OPPORTUNITY, 'opportunity', "stage", [stage])

    // Navigate to opportunities with filter
    redirect.to(`${url}&activeMode=2`);
  };

  const handleStatusCardClick = (status: string) => {
    // Use searchParams to add the status filter
    const searchParams = new URLSearchParams();
    searchParams.set("status", status);

    const url = generateFilteredUrl(ROUTE_PATH.OPPORTUNITY, 'opportunity', "status", [status])
    // Navigate to opportunities with filter
    redirect.to(`${url}&activeMode=2`);
  };

  if (selectedView === "leads") {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button onClick={() => setSelectedView(null)} variant="ghost">
            Back to Dashboard
          </Button>
          <h2 className="text-xl font-semibold text-gray-900">
            Leads in {selectedStage} Stage
          </h2>
        </div>
        <LeadsView />
      </div>
    );
  }

   return (
    <div className="p-4 relative">
      <div className="absolute">
      {openChat && (
        <div
        className={cn(
          "fixed bottom-8 right-8 h-[80vh] w-[400px] shadow-md"
        )}
        >
        <Chatbot />
        </div>
      )}
      <div
        className="flex justify-center items-center h-16 w-16 md:h-20 md:w-20 rounded-full bg-primary text-white fixed bottom-4 right-4"
        onClick={() => setOpenChat((prev) => !prev)}
      >
        <BotIcon className="h-10 w-10 md:h-12 md:w-12" />
      </div>
      </div>

      <div className="flex items-center justify-between w-full mb-8 flex-wrap gap-4">
      <div className="flex gap-4 items-center flex-wrap">
        <DateTimePill />
        <GreetingCard />
      </div>
      <div className="flex space-x-4 w-full sm:w-fit justify-between md:justify-end">
        <IconButton
        variant="outline"
        onClick={() => {}}
        icon={UploadCloudIcon}
        >
        Export
        </IconButton>
        <IconButton icon={Users2Icon} onClick={() => navigation("/contacts")}>
        New Contact
        </IconButton>
      </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8 place-content-start">
        {stats.map((stat, index) => (
        <OverviewCard
          key={index}
          icon={stat.icon}
          label={stat.label}
          value={stat.value}
          change={stat.change}
          isPositive={stat.positive}
          target={stat.target}
          enableAvatarList={stat.enableAvatarList}
          contacts={(stat.enableAvatarList && !contactsError && Array.isArray(contacts) && contacts.length > 0 ? contacts.filter(contact => contact && contact.email).slice(0, 5) : []).map(user => ({...user, avatarUrl: `https://avatar.iran.liara.run/public/${genders[Math.floor(Math.random()*genders.length)]}?username=${formatName(user)}`})) as unknown as User[]}
        />
        ))}
        {/* CreditDisplayCard removed - now shown in header for always-visible access */}
        <div className="bg-card p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm col-span-full lg:col-span-1">
        <div className="flex items-center justify-between mb-6">
          <Typography variant="h3">
          Recent Deals
          </Typography>
          <button
          className="text-primary text-sm hover:text-blue-700"
          onClick={() => redirect.to("/opportunities")}
          >
          View All
          </button>
        </div>
        <div className="space-y-4">
          {recentDeals.length > 0 ? (
          recentDeals.map((deal, index) => (
            <div
              key={index}
              onClick={() => handleCardClick(deal.stage)}
              className="flex items-center justify-between p-4 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                  {toPrettyString(deal.company || '')}
                </h3>
                <div className="flex flex-col">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{deal.stage}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Created by: {deal.createdBy}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900 dark:text-gray-100">{deal.value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{deal.probability}%</p>
              </div>
            </div>
          ))
          ) : (
          <div className="text-center py-6 text-gray-500">
            No recent deals found
          </div>
          )}
        </div>
        </div>
      </div>
      <div className="mb-8">
        <h2 className="text-lg font-semibold  mb-4">
        Deal Stage Overview
        </h2>
        <div className="grid grid-cols-1 gap-4">
        {dealStatusMetrics.length > 0 ? (
          dealStatusMetrics.map((metric) => (
          <DealStatusMetricCard
            key={metric.status}
            onClick={() => metric?.stageKey ? handleCardClick(metric?.stageKey): () => {}}
            metric={metric} />
          ))
        ) : isOpportunitiesFetching ? (
          <div className="col-span-3 py-10 text-center text-gray-500">
          Loading opportunity data...
          </div>
        ) : (
          <div className="col-span-3 py-10 text-center text-gray-500">
          No opportunity data available
          </div>
        )}
        </div>
      </div>
      </div>

      <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4">
        Opportunities by Status
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {opportunityStatusMetrics.length > 0 ? (
        opportunityStatusMetrics
          .filter((metric) =>
          ["prospect", "upside", "commit"].includes(
            metric.statusKey.toLowerCase()
          )
          )
          .map((metric) => (
          <OpportunityStatusMetricsCard
            key={metric?.status || "unknown"}
            onClick={metric?.statusKey ? () => handleStatusCardClick(metric.statusKey) : () => {}}
            metric={metric as Metric & { expectedProfit: number } }
          />
          ))
        ) : isOpportunitiesFetching ? (
        <div className="col-span-3 py-10 text-center text-gray-500">
          Loading opportunity data...
        </div>
        ) : (
        <div className="col-span-3 py-10 text-center text-gray-500">
          No opportunity data available
        </div>
        )}
      </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      <CreditActivityViewer />
      <div className="bg-card p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold ">
          Sales Performance
        </h2>
        <select className="text-sm border-gray-300 dark:border-gray-700 rounded-lg text-primary bg-card">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
        </select>
        </div>
        <div className="h-64 flex items-center justify-center">
        <BarChart3 className="w-full h-full text-gray-300 dark:text-gray-600" />
        </div>
      </div>
      </div>
    </div>
    );
}

export default Dashboard;
