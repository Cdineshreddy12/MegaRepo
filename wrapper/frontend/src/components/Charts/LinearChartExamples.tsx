import { LinearChart, ChartDataPoint } from "./LinearChart"
import { ChartConfig } from "../ui/chart"

// Example data for different use cases
const salesData: ChartDataPoint[] = [
  { month: "Jan", revenue: 12000, profit: 3000, expenses: 9000 },
  { month: "Feb", revenue: 15000, profit: 4000, expenses: 11000 },
  { month: "Mar", revenue: 18000, profit: 5000, expenses: 13000 },
  { month: "Apr", revenue: 16000, profit: 4500, expenses: 11500 },
  { month: "May", revenue: 20000, profit: 6000, expenses: 14000 },
  { month: "Jun", revenue: 22000, profit: 7000, expenses: 15000 },
]

const salesConfig: ChartConfig = {
  Jan: { label: "January", color: "var(--chart-1)" },
  Feb: { label: "February", color: "var(--chart-1)" },
  Mar: { label: "March", color: "var(--chart-1)" },
  Apr: { label: "April", color: "var(--chart-1)" },
  May: { label: "May", color: "var(--chart-1)" },
  Jun: { label: "June", color: "var(--chart-1)" },
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  profit: { label: "Profit", color: "var(--chart-2)" },
  expenses: { label: "Expenses", color: "var(--chart-3)" },
}

const performanceData: ChartDataPoint[] = [
  { month: "Jan", desktop: 1200, mobile: 800, tablet: 300 },
  { month: "Feb", desktop: 1400, mobile: 950, tablet: 350 },
  { month: "Mar", desktop: 1600, mobile: 1100, tablet: 400 },
  { month: "Apr", desktop: 1500, mobile: 1050, tablet: 380 },
  { month: "May", desktop: 1800, mobile: 1200, tablet: 450 },
  { month: "Jun", desktop: 2000, mobile: 1350, tablet: 500 },
]

const performanceConfig: ChartConfig = {
  Jan: { label: "January", color: "var(--chart-1)" },
  Feb: { label: "February", color: "var(--chart-1)" },
  Mar: { label: "March", color: "var(--chart-1)" },
  Apr: { label: "April", color: "var(--chart-1)" },
  May: { label: "May", color: "var(--chart-1)" },
  Jun: { label: "June", color: "var(--chart-1)" },
  desktop: { label: "Desktop", color: "var(--chart-1)" },
  mobile: { label: "Mobile", color: "var(--chart-2)" },
  tablet: { label: "Tablet", color: "var(--chart-3)" },
}

const trendData: ChartDataPoint[] = [
  { month: "Jan", users: 1000, sessions: 2500, pageviews: 10000 },
  { month: "Feb", users: 1200, sessions: 3000, pageviews: 12000 },
  { month: "Mar", users: 1400, sessions: 3500, pageviews: 14000 },
  { month: "Apr", users: 1300, sessions: 3200, pageviews: 13000 },
  { month: "May", users: 1600, sessions: 4000, pageviews: 16000 },
  { month: "Jun", users: 1800, sessions: 4500, pageviews: 18000 },
]

const trendConfig: ChartConfig = {
  Jan: { label: "January", color: "var(--chart-1)" },
  Feb: { label: "February", color: "var(--chart-1)" },
  Mar: { label: "March", color: "var(--chart-1)" },
  Apr: { label: "April", color: "var(--chart-1)" },
  May: { label: "May", color: "var(--chart-1)" },
  Jun: { label: "June", color: "var(--chart-1)" },
  users: { label: "Users", color: "var(--chart-1)" },
  sessions: { label: "Sessions", color: "var(--chart-2)" },
  pageviews: { label: "Page Views", color: "var(--chart-3)" },
}

// Example components showing different configurations
export function BasicLinearChart() {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Basic Linear Chart (Single Series)</h3>
      <LinearChart
        data={salesData}
        config={salesConfig}
        xAxisKey="month"
        dataKey="revenue"
        height={300}
      />
    </div>
  )
}

export function MultiSeriesLinearChart() {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Multi-Series Linear Chart</h3>
      <LinearChart
        data={salesData}
        config={salesConfig}
        xAxisKey="month"
        dataKeys={["revenue", "profit", "expenses"]}
        height={300}
      />
    </div>
  )
}

export function DetailedMultiSeriesLinearChart() {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Detailed Multi-Series Linear Chart</h3>
      <LinearChart
        data={performanceData}
        config={performanceConfig}
        xAxisKey="month"
        series={[
          { dataKey: "desktop", stroke: "#3B82F6", strokeWidth: 3, type: "monotone" },
          { dataKey: "mobile", stroke: "#10B981", strokeWidth: 2, type: "linear" },
          { dataKey: "tablet", stroke: "#F59E0B", strokeWidth: 2, type: "natural" }
        ]}
        height={300}
      />
    </div>
  )
}

export function StyledLinearChart() {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Styled Linear Chart</h3>
      <LinearChart
        data={trendData}
        config={trendConfig}
        xAxisKey="month"
        dataKey="users"
        height={350}
        strokeWidth={3}
        showDots={true}
        dotSize={6}
        activeDotSize={8}
        className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg"
      />
    </div>
  )
}

export function MinimalLinearChart() {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Minimal Linear Chart</h3>
      <LinearChart
        data={salesData}
        config={salesConfig}
        xAxisKey="month"
        dataKey="revenue"
        height={250}
        showGrid={false}
        showTooltip={false}
        showDots={false}
        hideXAxis={false}
        strokeWidth={1}
      />
    </div>
  )
}

export function CustomFormatterLinearChart() {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Custom Formatters</h3>
      <LinearChart
        data={salesData}
        config={salesConfig}
        xAxisKey="month"
        dataKey="revenue"
        height={300}
        xAxisFormatter={(value) => value.substring(0, 3).toUpperCase()}
        tooltipLabelFormatter={(value) => `Month: ${value}`}
        strokeWidth={3}
      />
    </div>
  )
}

export function DifferentLineTypesChart() {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Different Line Types</h3>
      <LinearChart
        data={trendData}
        config={trendConfig}
        xAxisKey="month"
        series={[
          { dataKey: "users", stroke: "#3B82F6", strokeWidth: 2, type: "monotone" },
          { dataKey: "sessions", stroke: "#10B981", strokeWidth: 2, type: "linear" },
          { dataKey: "pageviews", stroke: "#F59E0B", strokeWidth: 2, type: "step" }
        ]}
        height={300}
      />
    </div>
  )
}

export function DashedLinesChart() {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Dashed Lines</h3>
      <LinearChart
        data={salesData}
        config={salesConfig}
        xAxisKey="month"
        series={[
          { dataKey: "revenue", stroke: "#3B82F6", strokeWidth: 2, type: "monotone" },
          { dataKey: "profit", stroke: "#10B981", strokeWidth: 2, type: "monotone", strokeDasharray: "5 5" },
          { dataKey: "expenses", stroke: "#EF4444", strokeWidth: 2, type: "monotone", strokeDasharray: "10 5" }
        ]}
        height={300}
      />
    </div>
  )
}

export function CompactLinearChart() {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Compact Linear Chart</h3>
      <LinearChart
        data={performanceData}
        config={performanceConfig}
        xAxisKey="month"
        dataKeys={["desktop", "mobile"]}
        height={200}
        tickMargin={5}
        strokeWidth={1}
        dotSize={3}
        activeDotSize={4}
        className="bg-gray-50 p-2 rounded"
      />
    </div>
  )
}

export function NoDotsLinearChart() {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">No Dots Linear Chart</h3>
      <LinearChart
        data={trendData}
        config={trendConfig}
        xAxisKey="month"
        dataKeys={["users", "sessions"]}
        height={300}
        showDots={false}
        strokeWidth={3}
      />
    </div>
  )
}

export default function LinearChartExamples() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">LinearChart Examples</h2>
      <BasicLinearChart />
      <MultiSeriesLinearChart />
      <DetailedMultiSeriesLinearChart />
      <StyledLinearChart />
      <MinimalLinearChart />
      <CustomFormatterLinearChart />
      <DifferentLineTypesChart />
      <DashedLinesChart />
      <CompactLinearChart />
      <NoDotsLinearChart />
    </div>
  )
}
