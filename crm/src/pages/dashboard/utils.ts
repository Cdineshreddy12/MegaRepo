import { Opportunity } from "@/services/api/opportunityService";
import { formatCurrency, formatName, validateUser } from "@/utils/format";
import { stageConfig } from "./config";

export const getRecentDeals = (opportunities: Opportunity[], top = 3) => {

    const sorted = [...opportunities].sort((a, b) => {
      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    });

    return sorted.slice(0, top).map((opp) => {
      const creatorName = formatName(validateUser(opp.createdBy));
      return {
        company: opp.name,
        value: formatCurrency(opp.revenue || 0),
        stage: opp.stage
          ? stageConfig[opp.stage as keyof typeof stageConfig]?.displayName ||
            opp.stage
          : "",
        probability: opp.profitability || 0,
        id: opp.id || opp._id,
        createdBy: creatorName,
      };
    });
  };