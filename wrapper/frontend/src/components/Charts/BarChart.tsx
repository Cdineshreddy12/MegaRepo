import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart'
import { Bar, BarChart as BarChartRecharts, CartesianGrid, Rectangle, XAxis } from "recharts"

// Types for the reusable BarChart component
export interface ChartDataPoint {
  [key: string]: string | number
}


export interface BarSeries {
  dataKey: string
  fill?: string
  strokeWidth?: number
  radius?: number | [number, number, number, number]
  activeIndex?: number
  showActiveBar?: boolean
  activeBarStrokeDasharray?: string
  activeBarStrokeDashoffset?: number
  activeBarFillOpacity?: number
}

export interface BarChartProps {
  // Data configuration
  data: ChartDataPoint[]
  config: ChartConfig
  xAxisKey: string
  dataKey?: string // Keep for backward compatibility
  dataKeys?: string[] // New: support multiple data keys
  series?: BarSeries[] // New: detailed series configuration
  
  // Chart dimensions
  height?: string | number
  className?: string
  
  // Chart behavior
  showTooltip?: boolean
  showGrid?: boolean
  
  // Global bar styling (applied to all series if not overridden)
  strokeWidth?: number
  radius?: number | [number, number, number, number]
  fill?: string
  
  // Active bar configuration (global defaults)
  activeIndex?: number
  showActiveBar?: boolean
  activeBarStrokeDasharray?: string
  activeBarStrokeDashoffset?: number
  activeBarFillOpacity?: number
  
  // X-axis configuration
  tickMargin?: number
  hideXAxis?: boolean
  
  // Custom formatters
  xAxisFormatter?: (value: any) => string
  tooltipLabelFormatter?: (value: any) => string
}

/**
 * Reusable BarChart Component
 * 
 * A focused component that handles only the bar chart rendering logic without
 * time range filtering or card wrapper. Perfect for embedding in other components.
 * Supports both single and multiple data series in the same chart.
 * 
 * @example
 * // Basic usage (single series)
 * <BarChart
 *   data={chartData}
 *   config={chartConfig}
 *   xAxisKey="category"
 *   dataKey="value"
 * />
 * 
 * @example
 * // Multiple series with dataKeys
 * <BarChart
 *   data={chartData}
 *   config={chartConfig}
 *   xAxisKey="month"
 *   dataKeys={["revenue", "profit"]}
 *   height={300}
 * />
 * 
 * @example
 * // Multiple series with detailed configuration
 * <BarChart
 *   data={chartData}
 *   config={chartConfig}
 *   xAxisKey="month"
 *   series={[
 *     { dataKey: "apiCalls", fill: "#3B82F6", radius: 6 },
 *     { dataKey: "users", fill: "#10B981", radius: 4 }
 *   ]}
 *   height={300}
 * />
 * 
 * @example
 * // With custom styling
 * <BarChart
 *   data={chartData}
 *   config={chartConfig}
 *   xAxisKey="month"
 *   dataKey="revenue"
 *   height={300}
 *   radius={12}
 *   strokeWidth={3}
 * />
 */
export function BarChart({
  data,
  config,
  xAxisKey = "browser",
  dataKey, // Keep for backward compatibility
  dataKeys, // New: multiple data keys
  series, // New: detailed series configuration
  height = 300,
  className = "",
  showTooltip = true,
  showGrid = true,
  strokeWidth = 2,
  radius = 8,
  fill,
  activeIndex,
  showActiveBar = true,
  activeBarStrokeDasharray = "4",
  activeBarStrokeDashoffset = 4,
  activeBarFillOpacity = 0.8,
  tickMargin = 10,
  hideXAxis = false,
  xAxisFormatter,
  tooltipLabelFormatter,
}: BarChartProps) {
  // Default X-axis formatter
  const defaultXAxisFormatter = (value: any) => {
    if (xAxisFormatter) return xAxisFormatter(value)
    return config[value as keyof typeof config]?.label || value
  }

  // Determine which data keys to use
  const getDataKeys = () => {
    if (series && series.length > 0) {
      return series.map(s => s.dataKey)
    }
    if (dataKeys && dataKeys.length > 0) {
      return dataKeys
    }
    if (dataKey) {
      return [dataKey]
    }
    return ["visitors"] // fallback
  }

  const dataKeysToUse = getDataKeys()

  // Generate series configuration
  const getSeriesConfig = () => {
    if (series && series.length > 0) {
      return series
    }
    // Generate from dataKeys with global defaults
    return dataKeysToUse.map(key => ({
      dataKey: key,
      fill: config[key as keyof typeof config]?.color || fill,
      strokeWidth,
      radius,
      activeIndex,
      showActiveBar,
      activeBarStrokeDasharray,
      activeBarStrokeDashoffset,
      activeBarFillOpacity,
    }))
  }

  const seriesConfig = getSeriesConfig()

  return (
    <ChartContainer 
      config={config}
      className={`w-full ${className}`}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      <BarChartRecharts accessibilityLayer data={data}>
        {showGrid && <CartesianGrid vertical={false} />}
        {!hideXAxis && (
          <XAxis
            dataKey={xAxisKey}
            tickLine={false}
            tickMargin={tickMargin}
            axisLine={false}
            tickFormatter={defaultXAxisFormatter}
          />
        )}
        {showTooltip && (
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent 
                hideLabel={!tooltipLabelFormatter}
                labelFormatter={tooltipLabelFormatter}
              />
            }
          />
        )}
        {seriesConfig.map((seriesItem) => (
          <Bar
            key={seriesItem.dataKey}
            dataKey={seriesItem.dataKey}
            strokeWidth={seriesItem.strokeWidth}
            radius={seriesItem.radius}
            fill={seriesItem.fill}
            activeIndex={seriesItem.activeIndex}
            activeBar={
              seriesItem.showActiveBar && seriesItem.activeIndex !== undefined
                ? ({ ...props }) => {
                    return (
                      <Rectangle
                        {...props}
                        fillOpacity={seriesItem.activeBarFillOpacity}
                        stroke={props.payload?.fill || seriesItem.fill}
                        strokeDasharray={seriesItem.activeBarStrokeDasharray}
                        strokeDashoffset={seriesItem.activeBarStrokeDashoffset}
                      />
                    )
                  }
                : undefined
            }
          />
        ))}
      </BarChartRecharts>
    </ChartContainer>
  )
}

// Backward compatibility - keep the old function name
export default function BarChartLegacy({ chartConfig, chartData }: { chartConfig: ChartConfig, chartData: ChartDataPoint[] }) {
  return (
    <BarChart
      data={chartData}
      config={chartConfig}
      xAxisKey="browser"
      dataKey="visitors"
      height={300}
    />
  )
}
