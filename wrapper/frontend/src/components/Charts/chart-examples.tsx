import { InteractiveAreaChart } from "./chart-area-interactive"
import { AreaChart, ChartDataPoint, AreaChartConfig } from "./AreaChart"

// Example data for different use cases
const salesData: ChartDataPoint[] = [
  { month: "2024-01", revenue: 12000, profit: 3000 },
  { month: "2024-02", revenue: 15000, profit: 4000 },
  { month: "2024-03", revenue: 18000, profit: 5000 },
  { month: "2024-04", revenue: 16000, profit: 4500 },
  { month: "2024-05", revenue: 20000, profit: 6000 },
  { month: "2024-06", revenue: 22000, profit: 7000 },
]

const salesConfig: AreaChartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-1)",
  },
  profit: {
    label: "Profit", 
    color: "var(--chart-2)",
  },
}

const userActivityData: ChartDataPoint[] = [
  { date: "2024-06-01", active: 150, inactive: 50 },
  { date: "2024-06-02", active: 200, inactive: 30 },
  { date: "2024-06-03", active: 180, inactive: 40 },
  { date: "2024-06-04", active: 220, inactive: 25 },
  { date: "2024-06-05", active: 190, inactive: 35 },
  { date: "2024-06-06", active: 250, inactive: 20 },
]

const userActivityConfig: AreaChartConfig = {
  active: {
    label: "Active Users",
    color: "var(--chart-1)",
  },
  inactive: {
    label: "Inactive Users",
    color: "var(--chart-2)",
  },
}

// Example components showing different configurations
export function SalesChart() {
  return (
    <InteractiveAreaChart
      title="Sales Performance"
      description="Monthly revenue and profit trends"
      data={salesData}
      config={salesConfig}
      dateKey="month"
      dataKeys={["revenue", "profit"]}
      timeRangeOptions={[
        { value: "3m", label: "Last 3 months", days: 90 },
        { value: "6m", label: "Last 6 months", days: 180 },
        { value: "1y", label: "Last year", days: 365 },
      ]}
      defaultTimeRange="6m"
      height={300}
    />
  )
}

export function UserActivityChart() {
  return (
    <InteractiveAreaChart
      title="User Activity"
      description="Daily active and inactive users"
      data={userActivityData}
      config={userActivityConfig}
      dateKey="date"
      dataKeys={["active", "inactive"]}
      timeRangeOptions={[
        { value: "7d", label: "Last 7 days", days: 7 },
        { value: "30d", label: "Last 30 days", days: 30 },
      ]}
      defaultTimeRange="7d"
      height={250}
    />
  )
}

export function SimpleChart() {
  return (
    <InteractiveAreaChart
      title="Simple Metrics"
      data={salesData}
      config={salesConfig}
      dateKey="month"
      dataKeys={["revenue"]}
      showTimeRangeSelector={false}
      showLegend={false}
      height={200}
    />
  )
}

// Example using the core AreaChart component directly (without card wrapper)
export function CoreAreaChartExample() {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Core AreaChart Component</h3>
      <AreaChart
        data={salesData}
        config={salesConfig}
        dateKey="month"
        dataKeys={["revenue", "profit"]}
        height={300}
        areaType="monotone"
      />
    </div>
  )
}

// Example with custom styling
export function CustomStyledChart() {
  return (
    <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
      <h3 className="text-xl font-bold mb-2 text-gray-800">Custom Styled Chart</h3>
      <p className="text-gray-600 mb-4">This chart uses the core AreaChart component with custom styling</p>
      <AreaChart
        data={userActivityData}
        config={userActivityConfig}
        dateKey="date"
        dataKeys={["active"]}
        height={250}
        showGrid={false}
        showLegend={false}
        className="bg-white rounded-lg p-2"
      />
    </div>
  )
}
