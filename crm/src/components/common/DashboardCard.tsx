import React, { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  DollarSign,
  Target,
  Activity,
  ArrowRightIcon,
} from "lucide-react";
import { ResponsiveContainer, Area, AreaChart } from "recharts";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import Typography from "./Typography";

type Variant = "users" | "revenue" | "deals" | "activity" | "default";

type ChartDataItem = {
  value: number;
  [key: string]: number | string;
};

type DashboardCardProps = {
  title: ReactNode;
  value: ReactNode;
  subtitle?: ReactNode;
  icon: "users" | "revenue" | "deals" | "activity";
  variant?: Variant;
  chartData?: ChartDataItem[];
  className?: string;
  cta?: string;
  href?: string;
};

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = "default",
  chartData = [],
  className = "",
  cta,
  href = "#",
}) => {
  // Icon mapping
  const iconMap = {
    users: Users,
    revenue: DollarSign,
    deals: Target,
    activity: Activity,
  };

  const IconComponent = iconMap[icon] || DollarSign;

  // Get colors based on variant
  const getColors = () => {
    switch (variant) {
      case "users":
        return {
          iconBg: "bg-blue-50",
          iconColor: "text-blue-600",
          chartColor: "#3b82f6",
        };
      case "revenue":
        return {
          iconBg: "bg-green-50",
          iconColor: "text-green-600",
          chartColor: "#10b981",
        };
      case "deals":
        return {
          iconBg: "bg-purple-50",
          iconColor: "text-purple-600",
          chartColor: "#8b5cf6",
        };
      case "activity":
        return {
          iconBg: "bg-orange-50",
          iconColor: "text-orange-600",
          chartColor: "#f59e0b",
        };
      default:
        return {
          iconBg: "bg-green-50",
          iconColor: "text-green-600",
          chartColor: "#10b981",
        };
    }
  };

  const colors = getColors();

  return (
    <Card
      className={`group h-full relative border border-gray-200 bg-white hover:shadow-sm transition-shadow duration-200 ${className} flex flex-col justify-center`}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          {/* Left side - Icon, Title, Value */}
          <div className="flex-1">
            {/* Icon */}
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.iconBg} mb-4`}
            >
              <IconComponent
                className={`h-5 w-5 ${colors.iconColor}`}
                strokeWidth={2}
              />
            </div>

            {/* Title */}
            <Typography className="mb-1" variant="h4">{title}</Typography>

            {/* Value */}
            <Typography className="mb-4" variant="h1">{value}</Typography>
          </div>

          {/* Right side - Chart */}
          {chartData.length > 0 && (
            <div className="w-32 h-full ml-4 flex-1 m-auto">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient
                      id={`gradient-${variant}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={colors.chartColor}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor={colors.chartColor}
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={colors.chartColor}
                    strokeWidth={2}
                    fill={`url(#gradient-${variant})`}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Subtitle at bottom */}
        {subtitle && <p className="text-xs text-gray-500 mt-2">{subtitle}</p>}
      </CardContent>
      {cta && href && (
        <div
          className={cn(
            "pointer-events-none bg-card/50 absolute bottom-0 flex justify-center w-full h-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
          )}
        >
          <Button
            variant="ghost"
            asChild
            size="sm"
            className="pointer-events-auto"
          >
            <a href={href}>
              {cta}
              <ArrowRightIcon className="ms-2 h-4 w-4 rtl:rotate-180" />
            </a>
          </Button>
        </div>
      )}
    </Card>
  );
};

export default DashboardCard;
