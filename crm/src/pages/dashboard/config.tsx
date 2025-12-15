import CurrencySymbol from "@/components/currency-symbol";
import {
  Clock,
  FileText,
  TrendingUp,
  CheckCircle,
  XCircle,
  Filter,
  Activity,
  Users,
} from "lucide-react";
// import { format } from "path";

const stageConfig = {
  qualification: {
    icon: Clock,
    color: "blue",
    description: "Leads in initial qualification stage",
    displayName: "Qualification",
  },
  discovery: {
    icon: FileText,
    color: "yellow",
    description: "Leads in discovery and needs analysis",
    displayName: "Discovery",
  },
  meeting_booked: {
    icon: FileText,
    color: "blue",
    description: "Leads for which meeting are scheduled",
    displayName: "Meeting Booked",
  },
  proposal: {
    icon: TrendingUp,
    color: "purple",
    description: "Leads with proposals in progress",
    displayName: "Proposal",
  },
  negotiation: {
    icon: CurrencySymbol,
    color: "orange",
    description: "Leads in active negotiation",
    displayName: "Negotiation",
  },
  closed_won: {
    icon: CheckCircle,
    color: "green",
    description: "Successfully closed deals",
    displayName: "Closed Won",
  },
  closed_lost: {
    icon: XCircle,
    color: "red",
    description: "Lost opportunities",
    displayName: "Closed Lost",
  },
};

// Status display configuration
const statusConfig = {
  prospect: {
    icon: Filter,
    color: "gray",
    description: "Prospecting opportunities",
    displayName: "Prospect",
  },
  upside: {
    icon: TrendingUp,
    color: "blue",
    description: "Potential upside opportunities",
    displayName: "Upside",
  },
  commit: {
    icon: CheckCircle,
    color: "green",
    description: "Committed opportunities",
    displayName: "Commit",
  },
  active: {
    icon: Activity,
    color: "green",
    description: "Active opportunities",
    displayName: "Active",
  },
  inactive: {
    icon: XCircle,
    color: "gray",
    description: "Inactive opportunities",
    displayName: "Inactive",
  },
  onhold: {
    icon: Clock,
    color: "yellow",
    description: "On-hold opportunities",
    displayName: "On Hold",
  },
};

const overviewCardStatisticConfig = {
  contact: {
    icon: Users,
    label: "Total Contacts",
    value: "--",
    target: "/contacts",
    enableAvatarList: true,
  },
  opportunities: {
    icon: TrendingUp,
    label: "Opportunities",
    value: "--",
    target: "/opportunities",
  },
  closedRevenue: {
    icon: CurrencySymbol,
    label: "Closed Revenue",
    value: "--",
    target: "/opportunities",
  },
  expectedProfit: {
    icon: CurrencySymbol,
    label: "Expected Profit",
    value: "--",
    target: "/opportunities",
  },
};
export { stageConfig, statusConfig, overviewCardStatisticConfig };
