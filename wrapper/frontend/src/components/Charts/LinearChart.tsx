import { CartesianGrid, XAxis, Line, LineChart as RechartsLineChart } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '../ui/chart'

// Types for the reusable LinearChart component
export interface ChartDataPoint {
  [key: string]: string | number
}

export interface LineSeries {
  dataKey: string
  stroke?: string
  strokeWidth?: number
  type?: "basis" | "basisClosed" | "basisOpen" | "linear" | "linearClosed" | "natural" | "monotoneX" | "monotoneY" | "monotone" | "step" | "stepBefore" | "stepAfter"
  dot?: boolean | object
  activeDot?: boolean | object
  connectNulls?: boolean
  strokeDasharray?: string
}

export interface LinearChartProps {
  // Data configuration
  data: ChartDataPoint[]
  config: ChartConfig
  xAxisKey: string
  dataKey?: string // Keep for backward compatibility
  dataKeys?: string[] // New: support multiple data keys
  series?: LineSeries[] // New: detailed series configuration
  
  // Chart dimensions
  height?: string | number
  className?: string
  
  // Chart behavior
  showTooltip?: boolean
  showGrid?: boolean
  
  // Global line styling (applied to all series if not overridden)
  strokeWidth?: number
  stroke?: string
  type?: "basis" | "basisClosed" | "basisOpen" | "linear" | "linearClosed" | "natural" | "monotoneX" | "monotoneY" | "monotone" | "step" | "stepBefore" | "stepAfter"
  
  // Dot configuration
  showDots?: boolean
  dotSize?: number
  activeDotSize?: number
  
  // X-axis configuration
  tickMargin?: number
  hideXAxis?: boolean
  
  // Custom formatters
  xAxisFormatter?: (value: any) => string
  tooltipLabelFormatter?: (value: any) => string
  
  // Chart margins
  margin?: {
    top?: number
    right?: number
    bottom?: number
    left?: number
  }
}

/**
 * Reusable LinearChart Component
 * 
 * A focused component that handles only the line chart rendering logic without
 * time range filtering or card wrapper. Perfect for embedding in other components.
 * Supports both single and multiple data series in the same chart.
 * 
 * @example
 * // Basic usage (single series)
 * <LinearChart
 *   data={chartData}
 *   config={chartConfig}
 *   xAxisKey="month"
 *   dataKey="value"
 * />
 * 
 * @example
 * // Multiple series with dataKeys
 * <LinearChart
 *   data={chartData}
 *   config={chartConfig}
 *   xAxisKey="month"
 *   dataKeys={["revenue", "profit"]}
 *   height={300}
 * />
 * 
 * @example
 * // Multiple series with detailed configuration
 * <LinearChart
 *   data={chartData}
 *   config={chartConfig}
 *   xAxisKey="month"
 *   series={[
 *     { dataKey: "desktop", stroke: "#3B82F6", strokeWidth: 3, type: "monotone" },
 *     { dataKey: "mobile", stroke: "#10B981", strokeWidth: 2, type: "linear" }
 *   ]}
 *   height={300}
 * />
 * 
 * @example
 * // With custom styling
 * <LinearChart
 *   data={chartData}
 *   config={chartConfig}
 *   xAxisKey="month"
 *   dataKey="revenue"
 *   height={300}
 *   strokeWidth={3}
 *   showDots={true}
 * />
 */
export function LinearChart({
  data,
  config,
  xAxisKey = "month",
  dataKey, // Keep for backward compatibility
  dataKeys, // New: multiple data keys
  series, // New: detailed series configuration
  height = 300,
  className = "",
  showTooltip = true,
  showGrid = true,
  strokeWidth = 2,
  stroke,
  type = "natural",
  showDots = true,
  dotSize = 4,
  activeDotSize = 6,
  tickMargin = 8,
  hideXAxis = false,
  xAxisFormatter,
  tooltipLabelFormatter,
  margin = { left: 12, right: 12 },
}: LinearChartProps) {
  // Default X-axis formatter
  const defaultXAxisFormatter = (value: any) => {
    if (xAxisFormatter) return xAxisFormatter(value)
    return value.toString().slice(0, 3)
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
    return ["desktop"] // fallback
  }

  const dataKeysToUse = getDataKeys()

  // Generate series configuration
  const getSeriesConfig = (): LineSeries[] => {
    if (series && series.length > 0) {
      return series
    }
    // Generate from dataKeys with global defaults
    return dataKeysToUse.map(key => ({
      dataKey: key,
      stroke: config[key as keyof typeof config]?.color || stroke || `var(--color-${key})`,
      strokeWidth,
      type,
      dot: showDots ? { fill: config[key as keyof typeof config]?.color || stroke || `var(--color-${key})`, r: dotSize } : false,
      activeDot: { r: activeDotSize },
      connectNulls: false,
      strokeDasharray: undefined,
    }))
  }

  const seriesConfig = getSeriesConfig()

  return (
    <ChartContainer 
      config={config}
      className={`w-full ${className}`}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      <RechartsLineChart
        accessibilityLayer
        data={data}
        margin={margin}
      >
        {showGrid && <CartesianGrid vertical={false} />}
        {!hideXAxis && (
      <XAxis
            dataKey={xAxisKey}
        tickLine={false}
        axisLine={false}
            tickMargin={tickMargin}
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
      <Line
            key={seriesItem.dataKey}
            dataKey={seriesItem.dataKey}
            type={seriesItem.type}
            stroke={seriesItem.stroke}
            strokeWidth={seriesItem.strokeWidth}
            dot={seriesItem.dot}
            activeDot={seriesItem.activeDot}
            {...(seriesItem.connectNulls !== undefined && { connectNulls: seriesItem.connectNulls })}
            {...(seriesItem.strokeDasharray && { strokeDasharray: seriesItem.strokeDasharray })}
          />
        ))}
      </RechartsLineChart>
    </ChartContainer>
  )
}

// Backward compatibility - keep the old function name
export default function LinearChartLegacy({ chartConfig, chartData }: { chartConfig: ChartConfig, chartData: ChartDataPoint[] }) {
  return (
    <LinearChart
      data={chartData}
      config={chartConfig}
      xAxisKey="month"
        dataKey="desktop"
      height={300}
    />
  )
}