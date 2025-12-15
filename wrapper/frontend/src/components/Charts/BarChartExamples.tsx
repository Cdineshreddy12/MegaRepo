import { BarChart, ChartDataPoint } from "./BarChart"
import { ChartConfig } from "../ui/chart"

// Example data for different use cases
const salesData: ChartDataPoint[] = [
  { month: "Jan", revenue: 12000, profit: 3000 },
  { month: "Feb", revenue: 15000, profit: 4000 },
  { month: "Mar", revenue: 18000, profit: 5000 },
  { month: "Apr", revenue: 16000, profit: 4500 },
  { month: "May", revenue: 20000, profit: 6000 },
  { month: "Jun", revenue: 22000, profit: 7000 },
]

const salesConfig: ChartConfig = {
  Jan: { label: "January", color: "var(--chart-1)" },
  Feb: { label: "February", color: "var(--chart-1)" },
  Mar: { label: "March", color: "var(--chart-1)" },
  Apr: { label: "April", color: "var(--chart-1)" },
  May: { label: "May", color: "var(--chart-1)" },
  Jun: { label: "June", color: "var(--chart-1)" },
}

const browserData: ChartDataPoint[] = [
  { browser: "Chrome", visitors: 450 },
  { browser: "Firefox", visitors: 320 },
  { browser: "Safari", visitors: 280 },
  { browser: "Edge", visitors: 150 },
  { browser: "Other", visitors: 100 },
]

const browserConfig: ChartConfig = {
  Chrome: { label: "Chrome", color: "var(--chart-1)" },
  Firefox: { label: "Firefox", color: "var(--chart-2)" },
  Safari: { label: "Safari", color: "var(--chart-3)" },
  Edge: { label: "Edge", color: "var(--chart-4)" },
  Other: { label: "Other", color: "var(--chart-5)" },
}

const categoryData: ChartDataPoint[] = [
  { category: "Electronics", sales: 1200, target: 1000 },
  { category: "Clothing", sales: 800, target: 900 },
  { category: "Books", sales: 600, target: 500 },
  { category: "Home", sales: 1100, target: 1200 },
  { category: "Sports", sales: 400, target: 600 },
]

const categoryConfig: ChartConfig = {
  Electronics: { label: "Electronics", color: "var(--chart-1)" },
  Clothing: { label: "Clothing", color: "var(--chart-2)" },
  Books: { label: "Books", color: "var(--chart-3)" },
  Home: { label: "Home", color: "var(--chart-4)" },
  Sports: { label: "Sports", color: "var(--chart-5)" },
}

// Example components showing different configurations
export function BasicBarChart() {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Basic Bar Chart (Single Series)</h3>
      <BarChart
        data={salesData}
        config={salesConfig}
        xAxisKey="month"
        dataKey="revenue"
        height={300}
      />
    </div>
  )
}

export function MultiSeriesBarChart() {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Multi-Series Bar Chart</h3>
      <BarChart
        data={salesData}
        config={salesConfig}
        xAxisKey="month"
        dataKeys={["revenue", "profit"]}
        height={300}
      />
    </div>
  )
}

export function DetailedMultiSeriesBarChart() {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Detailed Multi-Series Bar Chart</h3>
      <BarChart
        data={browserData}
        config={browserConfig}
        xAxisKey="browser"
        series={[
          { dataKey: "visitors", fill: "#3B82F6", radius: 8, strokeWidth: 2 },
          { dataKey: "visitors", fill: "#10B981", radius: 6, strokeWidth: 1 }
        ]}
        height={300}
      />
    </div>
  )
}

export function StyledBarChart() {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Styled Bar Chart</h3>
      <BarChart
        data={browserData}
        config={browserConfig}
        xAxisKey="browser"
        dataKey="visitors"
        height={350}
        radius={12}
        strokeWidth={3}
        activeIndex={1}
        className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg"
      />
    </div>
  )
}

export function MinimalBarChart() {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Minimal Bar Chart</h3>
      <BarChart
        data={categoryData}
        config={categoryConfig}
        xAxisKey="category"
        dataKey="sales"
        height={250}
        showGrid={false}
        showTooltip={false}
        hideXAxis={false}
        radius={4}
        strokeWidth={1}
      />
    </div>
  )
}

export function CustomActiveBarChart() {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Custom Active Bar</h3>
      <BarChart
        data={salesData}
        config={salesConfig}
        xAxisKey="month"
        dataKey="revenue"
        height={300}
        activeIndex={3}
        showActiveBar={true}
        activeBarStrokeDasharray="8"
        activeBarStrokeDashoffset={8}
        activeBarFillOpacity={0.9}
        radius={[8, 8, 0, 0]}
      />
    </div>
  )
}

export function NoActiveBarChart() {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">No Active Bar</h3>
      <BarChart
        data={browserData}
        config={browserConfig}
        xAxisKey="browser"
        dataKey="visitors"
        height={300}
        showActiveBar={false}
        radius={6}
        strokeWidth={2}
      />
    </div>
  )
}

export function CustomFormatterChart() {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Custom Formatters</h3>
      <BarChart
        data={salesData}
        config={salesConfig}
        xAxisKey="month"
        dataKey="revenue"
        height={300}
        xAxisFormatter={(value) => value.substring(0, 3).toUpperCase()}
        tooltipLabelFormatter={(value) => `Month: ${value}`}
        radius={10}
      />
    </div>
  )
}

export function CompactBarChart() {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Compact Bar Chart</h3>
      <BarChart
        data={categoryData}
        config={categoryConfig}
        xAxisKey="category"
        dataKey="sales"
        height={200}
        tickMargin={5}
        radius={2}
        strokeWidth={1}
        className="bg-gray-50 p-2 rounded"
      />
    </div>
  )
}

export function RoundedBarChart() {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Rounded Bar Chart</h3>
      <BarChart
        data={browserData}
        config={browserConfig}
        xAxisKey="browser"
        dataKey="visitors"
        height={300}
        radius={[12, 12, 0, 0]}
        strokeWidth={0}
        activeIndex={2}
      />
    </div>
  )
}

export default function BarChartExamples() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">BarChart Examples</h2>
      <BasicBarChart />
      <MultiSeriesBarChart />
      <DetailedMultiSeriesBarChart />
      <StyledBarChart />
      <MinimalBarChart />
      <CustomActiveBarChart />
      <NoActiveBarChart />
      <CustomFormatterChart />
      <CompactBarChart />
      <RoundedBarChart />
    </div>
  )
}
