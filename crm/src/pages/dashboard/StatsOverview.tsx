import { Users, Percent, TrendingUp } from "lucide-react";
import OverviewCard from "@/components/common/OverviewCard";
import CurrencySymbol from "@/components/currency-symbol";

interface Stat {
  icon: string | JSX.Element;
  label: string;
  value: number | string;
  change: number | string;
  positive: boolean;
  target?: string;
}

const StatsOverview = ({ stats }: { stats: Stat[] }) => {
  // Map icon strings to actual icon components
interface IconMap {
    [key: string]: JSX.Element | null;
}

const getIcon = (iconName: string): JSX.Element | null => {
    const icons: IconMap = {
        Users: <Users className="w-6 h-6 text-primary" />,
        IndianRupee: <CurrencySymbol className="w-6 h-6 text-green-600" />,
        Percent: <Percent className="w-6 h-6 text-purple-600" />,
        TrendingUp: <TrendingUp className="w-6 h-6 text-blue-600" />
    };

    return icons[iconName] || null;
};

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <OverviewCard
          key={index}
          icon={typeof stat.icon === 'string' ? getIcon(stat.icon) || <div /> : stat.icon}
          label={stat.label}
          value={stat.value}
          change={String(stat.change)}
          isPositive={stat.positive}
          target={stat.target}
        />
      ))}
    </div>
  );
};

export default StatsOverview;