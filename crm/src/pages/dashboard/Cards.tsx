import {
  ArrowRight,
  ArrowUpRight,
  GripHorizontal,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/utils/format";

export interface Metric {
  displayName: string;
  count: number;
  value: string;
  icon: LucideIcon;
  color: string;
  description: string;
  target?: string;
}

export const DealStatusMetricCard = ({
  metric,
  onClick,
}: {
  metric: Metric;
  onClick: () => void;
}) => {
  const { displayName, description, count, value } = metric;
  return (
    <Card className="w-full h-full">
      <GripHorizontal
        className="drag-handle cursor-move absolute inset-0 mx-auto text-gray-400"
        onClick={(e) => e.stopPropagation()}
      />
      <CardHeader>
        <div className="flex items-center justify-between">
          <metric.icon className="text-primary" />
          <span className="text-sm font-medium">Total: {count}</span>
        </div>
        <CardTitle className="text-gray-900 text-lg leading-none">
          Deal Stage: {displayName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className="text-lg font-semibold"
          // style={{ color: `var(--${color}-600, #333)` }}
        >
          {value ? formatCurrency(value) : "--"}
        </p>
        <CardDescription>{description}</CardDescription>
      </CardContent>
      <CardFooter>
        <Button
          variant="link"
          className="text-sm text-primary"
          onClick={onClick}
        >
          <ArrowRight size={16} className="ml-1" />
          <span className="text-sm text-primary">View Details</span>
        </Button>
      </CardFooter>
    </Card>
  );
};

export const OpportunityStatusMetricsCard = ({
  metric,
  onClick,
}: {
  metric: Metric & { expectedProfit: number; statusKey: string };
  onClick: (status: string) => void;
}) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          {/* <metric.icon /> */}

          <span
            className="text-sm font-medium"
            // style={{ color: `var(--${metric.color}-600, #333)` }}
          >
            Total: {metric.count}
          </span>
        </div>
        <CardTitle>{metric.displayName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between">
          <div>
            <p className="text-xs text-gray-500">Revenue</p>
            <p
              className="text-md font-semibold"
              // style={{ color: `var(--${metric.color}-600, #333)` }}
            >
              {metric.value}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Expected Profit</p>
            <p
              className="text-md font-semibold"
              // style={{ color: `var(--${metric.color}-600, #333)` }}
            >
              {metric?.expectedProfit}
            </p>
          </div>
        </div>
        <CardDescription>{metric.description}</CardDescription>
      </CardContent>
      <CardFooter className="flex items-center justify-end text-sm text-primary">
        <Button
          variant="link"
          className="text-sm text-primary"
          onClick={() =>
            metric.statusKey ? onClick(metric.statusKey) : () => {}
          }
        >
          <ArrowRight size={16} className="ml-1" />
          <span className="text-sm text-primary">View Details</span>
        </Button>
      </CardFooter>
    </Card>
  );
};

type StatusCardProps = {
  icon?: React.ReactNode;
  title: string;
  total: number;
  amountLabel?: string;
  amountValue?: string;
  subAmountLabel?: string;
  subAmountValue?: string;
  description: string;
  onViewDetails?: () => void;
};

export const StatusCard: React.FC<StatusCardProps> = ({
  icon,
  title,
  total,
  amountLabel,
  amountValue,
  subAmountLabel,
  subAmountValue,
  description,
  onViewDetails,
}) => {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div>{icon}</div>
          <div className="text-sm text-muted-foreground">Total: {total}</div>
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-semibold">{title}</h3>
          {amountValue && (
            <p className="text-2xl font-bold text-foreground">{amountValue}</p>
          )}
        </div>

        {(amountLabel || subAmountLabel) && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{amountLabel}</span>
            <span>{subAmountLabel}</span>
          </div>
        )}

        {subAmountValue && (
          <div className="flex justify-between text-sm font-medium text-foreground">
            <span></span>
            <span>{subAmountValue}</span>
          </div>
        )}

        <p className="text-sm text-muted-foreground">{description}</p>

        {onViewDetails && (
          <Button
            variant="link"
            className="p-0 h-auto text-sm text-primary"
            onClick={onViewDetails}
          >
            View Details
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
