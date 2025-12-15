import React from "react"
import { Area, AreaChart as RechartsAreaChart, CartesianGrid, XAxis } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

// Types for the core AreaChart component
export interface ChartDataPoint {
  [key: string]: string | number
}

export interface AreaChartConfig {
  [key: string]: {
    label: string
    color?: string
  }
}

export interface AreaChartProps {
  // Data configuration
  data: ChartDataPoint[]
  config: AreaChartConfig
  dateKey: string
  dataKeys: string[]
  
  // Chart dimensions
  height?: string | number
  className?: string
  
  // Chart behavior
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

/**
 * Core AreaChart Component
 * 
 * A focused component that handles only the chart rendering logic without
 * time range filtering or card wrapper. Perfect for embedding in other components.
 * 
 * @example
 * // Basic usage
 * <AreaChart
 *   data={chartData}
 *   config={chartConfig}
 *   dateKey="date"
 *   dataKeys={["value1", "value2"]}
 * />
 * 
 * @example
 * // With custom styling
 * <AreaChart
 *   data={chartData}
 *   config={chartConfig}
 *   dateKey="date"
 *   dataKeys={["revenue"]}
 *   height={300}
 *   areaType="monotone"
 *   showGrid={false}
 * />
 */
export function AreaChart({
  data,
  config,
  dateKey,
  dataKeys,
  height = 250,
  className = "",
  showLegend = true,
  showTooltip = true,
  showGrid = true,
  gradientIds,
  areaType = "natural",
  stackId = "a",
  xAxisFormatter,
  tooltipLabelFormatter,
}: AreaChartProps) {
  // Generate gradient IDs if not provided
  const gradients = React.useMemo(() => {
    if (gradientIds) return gradientIds
    
    const generated: Record<string, string> = {}
    dataKeys.forEach(key => {
      generated[key] = `fill${key.charAt(0).toUpperCase() + key.slice(1)}`
    })
    return generated
  }, [gradientIds, dataKeys])

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
    <ChartContainer
      config={config}
      className={`aspect-auto w-full ${className}`}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      <RechartsAreaChart data={data}>
        <defs>
          {dataKeys.map((key) => {
            const gradientId = gradients[key]
            const colorVar = `var(--color-${key})`
            return (
              <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={colorVar}
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor={colorVar}
                  stopOpacity={0.1}
                />
              </linearGradient>
            )
          })}
        </defs>
        {showGrid && <CartesianGrid vertical={false} />}
        <XAxis
          dataKey={dateKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={xAxisFormatter || defaultXAxisFormatter}
        />
        {showTooltip && (
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={tooltipLabelFormatter || defaultTooltipLabelFormatter}
                indicator="dot"
              />
            }
          />
        )}
        {dataKeys.map((key) => (
          <Area
            key={key}
            dataKey={key}
            type={areaType}
            fill={`url(#${gradients[key]})`}
            stroke={`var(--color-${key})`}
            stackId={stackId}
          />
        ))}
        {showLegend && <ChartLegend content={<ChartLegendContent />} />}
      </RechartsAreaChart>
    </ChartContainer>
  )
}

export default AreaChart
