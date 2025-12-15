import React from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AreaChart, ChartDataPoint, AreaChartConfig } from "./AreaChart"

export const description = "An interactive area chart"

/**
 * Reusable Interactive Area Chart Component
 * 
 * A highly configurable area chart component with time range filtering, custom styling,
 * and flexible data handling. Perfect for displaying time-series data with multiple metrics.
 * 
 * @example
 * // Basic usage with default data
 * <InteractiveAreaChart
 *   title="Sales Over Time"
 *   description="Monthly sales performance"
 *   data={salesData}
 *   config={salesConfig}
 *   dateKey="month"
 *   dataKeys={["revenue", "profit"]}
 * />
 * 
 * @example
 * // Custom time range options
 * <InteractiveAreaChart
 *   title="User Activity"
 *   data={activityData}
 *   config={activityConfig}
 *   dateKey="date"
 *   dataKeys={["active", "inactive"]}
 *   timeRangeOptions={[
 *     { value: "1d", label: "Last 24 hours", days: 1 },
 *     { value: "7d", label: "Last week", days: 7 },
 *     { value: "30d", label: "Last month", days: 30 }
 *   ]}
 *   defaultTimeRange="7d"
 * />
 * 
 * @example
 * // Minimal chart without time selector
 * <InteractiveAreaChart
 *   title="Simple Chart"
 *   data={simpleData}
 *   config={simpleConfig}
 *   dateKey="x"
 *   dataKeys={["y"]}
 *   showTimeRangeSelector={false}
 *   height={200}
 * />
 */

// Types for the interactive chart component
export interface TimeRangeOption {
  value: string
  label: string
  days: number
}

export interface InteractiveAreaChartProps {
  // Data configuration
  data: ChartDataPoint[]
  config: AreaChartConfig
  dateKey: string
  dataKeys: string[]
  
  // Chart appearance
  title: string
  description?: string
  height?: string | number
  className?: string
  
  // Time range filtering
  timeRangeOptions?: TimeRangeOption[]
  defaultTimeRange?: string
  referenceDate?: string
  
  // Chart behavior
  showTimeRangeSelector?: boolean
  showLegend?: boolean
  showTooltip?: boolean
  showGrid?: boolean
  
  // Custom styling
  gradientIds?: Record<string, string>
  areaType?: "natural" | "monotone" | "step" | "stepBefore" | "stepAfter"
  stackId?: string
  
  // Custom formatters
  xAxisFormatter?: (value: any) => string
  tooltipLabelFormatter?: (value: any) => string
}

// Default time range options
const defaultTimeRangeOptions: TimeRangeOption[] = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 3 months", days: 90 },
]

// Default chart data for backward compatibility
const defaultChartData: ChartDataPoint[] = [
  { date: "2024-04-01", desktop: 222, mobile: 150 },
  { date: "2024-04-02", desktop: 97, mobile: 180 },
  { date: "2024-04-03", desktop: 167, mobile: 120 },
  { date: "2024-04-04", desktop: 242, mobile: 260 },
  { date: "2024-04-05", desktop: 373, mobile: 290 },
  { date: "2024-04-06", desktop: 301, mobile: 340 },
  { date: "2024-04-07", desktop: 245, mobile: 180 },
  { date: "2024-04-08", desktop: 409, mobile: 320 },
  { date: "2024-04-09", desktop: 59, mobile: 110 },
  { date: "2024-04-10", desktop: 261, mobile: 190 },
  { date: "2024-04-11", desktop: 327, mobile: 350 },
  { date: "2024-04-12", desktop: 292, mobile: 210 },
  { date: "2024-04-13", desktop: 342, mobile: 380 },
  { date: "2024-04-14", desktop: 137, mobile: 220 },
  { date: "2024-04-15", desktop: 120, mobile: 170 },
  { date: "2024-04-16", desktop: 138, mobile: 190 },
  { date: "2024-04-17", desktop: 446, mobile: 360 },
  { date: "2024-04-18", desktop: 364, mobile: 410 },
  { date: "2024-04-19", desktop: 243, mobile: 180 },
  { date: "2024-04-20", desktop: 89, mobile: 150 },
  { date: "2024-04-21", desktop: 137, mobile: 200 },
  { date: "2024-04-22", desktop: 224, mobile: 170 },
  { date: "2024-04-23", desktop: 138, mobile: 230 },
  { date: "2024-04-24", desktop: 387, mobile: 290 },
  { date: "2024-04-25", desktop: 215, mobile: 250 },
  { date: "2024-04-26", desktop: 75, mobile: 130 },
  { date: "2024-04-27", desktop: 383, mobile: 420 },
  { date: "2024-04-28", desktop: 122, mobile: 180 },
  { date: "2024-04-29", desktop: 315, mobile: 240 },
  { date: "2024-04-30", desktop: 454, mobile: 380 },
  { date: "2024-05-01", desktop: 165, mobile: 220 },
  { date: "2024-05-02", desktop: 293, mobile: 310 },
  { date: "2024-05-03", desktop: 247, mobile: 190 },
  { date: "2024-05-04", desktop: 385, mobile: 420 },
  { date: "2024-05-05", desktop: 481, mobile: 390 },
  { date: "2024-05-06", desktop: 498, mobile: 520 },
  { date: "2024-05-07", desktop: 388, mobile: 300 },
  { date: "2024-05-08", desktop: 149, mobile: 210 },
  { date: "2024-05-09", desktop: 227, mobile: 180 },
  { date: "2024-05-10", desktop: 293, mobile: 330 },
  { date: "2024-05-11", desktop: 335, mobile: 270 },
  { date: "2024-05-12", desktop: 197, mobile: 240 },
  { date: "2024-05-13", desktop: 197, mobile: 160 },
  { date: "2024-05-14", desktop: 448, mobile: 490 },
  { date: "2024-05-15", desktop: 473, mobile: 380 },
  { date: "2024-05-16", desktop: 338, mobile: 400 },
  { date: "2024-05-17", desktop: 499, mobile: 420 },
  { date: "2024-05-18", desktop: 315, mobile: 350 },
  { date: "2024-05-19", desktop: 235, mobile: 180 },
  { date: "2024-05-20", desktop: 177, mobile: 230 },
  { date: "2024-05-21", desktop: 82, mobile: 140 },
  { date: "2024-05-22", desktop: 81, mobile: 120 },
  { date: "2024-05-23", desktop: 252, mobile: 290 },
  { date: "2024-05-24", desktop: 294, mobile: 220 },
  { date: "2024-05-25", desktop: 201, mobile: 250 },
  { date: "2024-05-26", desktop: 213, mobile: 170 },
  { date: "2024-05-27", desktop: 420, mobile: 460 },
  { date: "2024-05-28", desktop: 233, mobile: 190 },
  { date: "2024-05-29", desktop: 78, mobile: 130 },
  { date: "2024-05-30", desktop: 340, mobile: 280 },
  { date: "2024-05-31", desktop: 178, mobile: 230 },
  { date: "2024-06-01", desktop: 178, mobile: 200 },
  { date: "2024-06-02", desktop: 470, mobile: 410 },
  { date: "2024-06-03", desktop: 103, mobile: 160 },
  { date: "2024-06-04", desktop: 439, mobile: 380 },
  { date: "2024-06-05", desktop: 88, mobile: 140 },
  { date: "2024-06-06", desktop: 294, mobile: 250 },
  { date: "2024-06-07", desktop: 323, mobile: 370 },
  { date: "2024-06-08", desktop: 385, mobile: 320 },
  { date: "2024-06-09", desktop: 438, mobile: 480 },
  { date: "2024-06-10", desktop: 155, mobile: 200 },
  { date: "2024-06-11", desktop: 92, mobile: 150 },
  { date: "2024-06-12", desktop: 492, mobile: 420 },
  { date: "2024-06-13", desktop: 81, mobile: 130 },
  { date: "2024-06-14", desktop: 426, mobile: 380 },
  { date: "2024-06-15", desktop: 307, mobile: 350 },
  { date: "2024-06-16", desktop: 371, mobile: 310 },
  { date: "2024-06-17", desktop: 475, mobile: 520 },
  { date: "2024-06-18", desktop: 107, mobile: 170 },
  { date: "2024-06-19", desktop: 341, mobile: 290 },
  { date: "2024-06-20", desktop: 408, mobile: 450 },
  { date: "2024-06-21", desktop: 169, mobile: 210 },
  { date: "2024-06-22", desktop: 317, mobile: 270 },
  { date: "2024-06-23", desktop: 480, mobile: 530 },
  { date: "2024-06-24", desktop: 132, mobile: 180 },
  { date: "2024-06-25", desktop: 141, mobile: 190 },
  { date: "2024-06-26", desktop: 434, mobile: 380 },
  { date: "2024-06-27", desktop: 448, mobile: 490 },
  { date: "2024-06-28", desktop: 149, mobile: 200 },
  { date: "2024-06-29", desktop: 103, mobile: 160 },
  { date: "2024-06-30", desktop: 446, mobile: 400 },
]

const defaultChartConfig: AreaChartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)",
  },
}

export function InteractiveAreaChart({
  data = defaultChartData,
  config = defaultChartConfig,
  dateKey = "date",
  dataKeys = ["desktop", "mobile"],
  title = "Area Chart - Interactive",
  description = "Showing data over time",
  height = 250,
  className = "",
  timeRangeOptions = defaultTimeRangeOptions,
  defaultTimeRange = "90d",
  referenceDate,
  showTimeRangeSelector = true,
  showLegend = true,
  showTooltip = true,
  showGrid = true,
  gradientIds,
  areaType = "natural",
  stackId = "a",
  xAxisFormatter,
  tooltipLabelFormatter,
}: InteractiveAreaChartProps) {
  const [timeRange, setTimeRange] = React.useState(defaultTimeRange)

  // Filter data based on time range
  const filteredData = React.useMemo(() => {
    if (!showTimeRangeSelector || !timeRangeOptions.length) {
      return data
    }

    const selectedOption = timeRangeOptions.find(option => option.value === timeRange)
    if (!selectedOption) return data

    const refDate = referenceDate ? new Date(referenceDate) : new Date()
    const startDate = new Date(refDate)
    startDate.setDate(startDate.getDate() - selectedOption.days)

    return data.filter((item) => {
      const date = new Date(item[dateKey] as string)
      return date >= startDate
    })
  }, [data, timeRange, timeRangeOptions, dateKey, referenceDate, showTimeRangeSelector])

  // Default formatters
  const defaultXAxisFormatter = (value: any) => {
    const date = new Date(value)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  const defaultTooltipLabelFormatter = (value: any) => {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  return (
    <Card className={`pt-0 ${className}`}>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>{title}</CardTitle>
          {description && (
            <CardDescription>{description}</CardDescription>
          )}
        </div>
        {showTimeRangeSelector && timeRangeOptions.length > 0 && (
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
              aria-label="Select a time range"
            >
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {timeRangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="rounded-lg">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <AreaChart
          data={filteredData}
          config={config}
          dateKey={dateKey}
          dataKeys={dataKeys}
          height={height}
          showLegend={showLegend}
          showTooltip={showTooltip}
          showGrid={showGrid}
          gradientIds={gradientIds}
          areaType={areaType}
          stackId={stackId}
          xAxisFormatter={xAxisFormatter || defaultXAxisFormatter}
          tooltipLabelFormatter={tooltipLabelFormatter || defaultTooltipLabelFormatter}
        />
      </CardContent>
    </Card>
  )
}

// Backward compatibility - keep the old function name
export function ChartAreaInteractive() {
  return (
    <InteractiveAreaChart
      data={defaultChartData}
      config={defaultChartConfig}
      dateKey="date"
      dataKeys={["desktop", "mobile"]}
      title="Area Chart - Interactive"
      description="Showing total visitors for the last 3 months"
      timeRangeOptions={defaultTimeRangeOptions}
      defaultTimeRange="90d"
      referenceDate="2024-06-30"
    />
  )
}
