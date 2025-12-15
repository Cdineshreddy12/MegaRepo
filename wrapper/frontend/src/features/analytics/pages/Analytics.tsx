import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts'
import { 
  Download, 
  Activity,
  Users,
  BarChart3,
  UserCheck,
  Gauge
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TabNavigation, TabItem } from '@/components/common/TabNavigation'
import { Badge } from '@/components/ui/badge'
import { useNavigation } from '@/hooks/useNavigation'
import { UnifiedLoading } from '@/components/common/UnifiedLoading'
import { ChartCard, DevelopmentModeBanner, PeriodSelector, ReportsSection } from '@/features/analytics/components'
import { SummaryCards } from '@/features/users/components'
import { formatNumber } from '@/lib/utils'
import api from '@/lib/api'

// Analytics data types
interface AnalyticsMetrics {
  totalApiCalls: number;
  activeUsers: number;
  avgResponseTime: number;
  errorRate: number;
  peakUsage: number;
  successRate: number;
}

// Mock data for development
const mockAnalyticsData = {
  api: {
    total: 125000,
    growth: 12.5,
    peak: 15000,
    peakGrowth: 8.2,
    rateLimited: 1250
  },
  users: {
    active: 2500,
    growth: 15.3
  },
  performance: {
    avgResponseTime: 245,
    improvement: 18.5,
    errorRate: 0.8,
    errorRateChange: -0.3,
    successRate: 99.2,
    successRateChange: 0.5
  },
  apiUsage: [
    { date: '2024-01-01', calls: 1200 },
    { date: '2024-01-02', calls: 1350 },
    { date: '2024-01-03', calls: 1100 },
    { date: '2024-01-04', calls: 1600 },
    { date: '2024-01-05', calls: 1400 },
  ],
  userActivity: [
    { date: '2024-01-01', activeUsers: 150 },
    { date: '2024-01-02', activeUsers: 180 },
    { date: '2024-01-03', activeUsers: 165 },
    { date: '2024-01-04', activeUsers: 200 },
    { date: '2024-01-05', activeUsers: 190 },
  ],
  endpoints: [
    { endpoint: '/api/users', calls: 5000 },
    { endpoint: '/api/analytics', calls: 3000 },
    { endpoint: '/api/reports', calls: 2000 },
    { endpoint: '/api/health', calls: 1500 },
  ],
  userGrowth: [
    { date: '2024-01-01', newUsers: 25 },
    { date: '2024-01-02', newUsers: 30 },
    { date: '2024-01-03', newUsers: 22 },
    { date: '2024-01-04', newUsers: 35 },
    { date: '2024-01-05', newUsers: 28 },
  ],
  responseTimes: [
    { timestamp: '2024-01-01', avg: 200, p95: 300 },
    { timestamp: '2024-01-02', avg: 220, p95: 320 },
    { timestamp: '2024-01-03', avg: 190, p95: 280 },
    { timestamp: '2024-01-04', avg: 250, p95: 350 },
    { timestamp: '2024-01-05', avg: 210, p95: 310 },
  ]
}

const mockReportsData = [
  {
    name: 'Monthly Analytics Report',
    createdAt: new Date('2024-01-01')
  },
  {
    name: 'API Usage Summary',
    createdAt: new Date('2024-01-02')
  }
]

export function Analytics() {
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [selectedMetric, setSelectedMetric] = useState('all')
  const [useMockData, setUseMockData] = useState(false)
  const navigation = useNavigation()

  const { data: metricsData, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['analytics-metrics', selectedPeriod],
    queryFn: () => api.get(`/analytics/metrics?period=${selectedPeriod}`),
  })

  const { data: performanceData, error: performanceError } = useQuery({
    queryKey: ['analytics-performance'],
    queryFn: () => api.get('/analytics/performance'),
  })

  const { data: reportsData, isLoading: reportsLoading, error: reportsError } = useQuery({
    queryKey: ['analytics-reports'],
    queryFn: () => api.get('/analytics/reports'),
  })

  // Auto-fallback to mock data in development if API fails
  useEffect(() => {
    if (metricsError && !useMockData) {
      console.warn('API Error detected, falling back to mock data for development')
      setUseMockData(true)
    }
  }, [metricsError, useMockData])

  // Use mock data if API fails or in development mode
  const effectiveMetricsData = useMockData || metricsError ? mockAnalyticsData : (metricsData as any)
  const effectivePerformanceData = useMockData || performanceError ? mockAnalyticsData : (performanceData as any)
  const effectiveReportsData = useMockData || reportsError ? mockReportsData : (reportsData as any)

  const apiMetrics = (effectiveMetricsData as any)?.api || {}
  const userMetrics = (effectiveMetricsData as any)?.users || {}
  const performanceMetrics = (effectivePerformanceData as any) || {}

  // Prepare metrics for AnalyticsSummaryCards
  const analyticsMetrics: AnalyticsMetrics = {
    totalApiCalls: apiMetrics.total || 0,
    activeUsers: userMetrics.active || 0,
    avgResponseTime: performanceMetrics.avgResponseTime || 0,
    errorRate: performanceMetrics.errorRate || 0,
    peakUsage: apiMetrics.peak || 0,
    successRate: performanceMetrics.successRate || 0,
  }

  // Tab configuration for TabNavigation
  const analyticsTabs: TabItem[] = [
    {
      id: 'all',
      label: 'Overview',
      icon: BarChart3,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="API Calls Over Time"
              description="Daily API usage for the selected period"
              isLoading={metricsLoading && !useMockData}
              isEmpty={!(effectiveMetricsData as any)?.apiUsage || (effectiveMetricsData as any)?.apiUsage.length === 0}
              emptyTitle="No API data available"
              emptyDescription="API usage data will appear here once it's available for the selected period."
              emptyAction={
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              }
            >
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={(effectiveMetricsData as any)?.apiUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="calls" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="User Activity"
              description="Daily active users"
              isLoading={metricsLoading && !useMockData}
              isEmpty={!(effectiveMetricsData as any)?.userActivity || (effectiveMetricsData as any).userActivity.length === 0}
              emptyTitle="No user activity data"
              emptyDescription="User activity data will appear here once users start engaging with your platform."
              emptyAction={
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  View Users
                </Button>
              }
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={(effectiveMetricsData as any)?.userActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="activeUsers" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )
    },
    {
      id: 'api',
      label: 'API Usage',
      icon: Activity,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>API Endpoint Usage</CardTitle>
                <CardDescription>Most popular endpoints</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={(metricsData as any)?.endpoints || []} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="endpoint" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="calls" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Error Rates</CardTitle>
                  <CardDescription>API error distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 bg-chart-4 rounded-full"></div>
                        <span className="text-sm">2xx Success</span>
                      </div>
                      <span className="font-medium">95.2%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm">4xx Client Error</span>
                      </div>
                      <span className="font-medium">3.1%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 bg-destructive rounded-full"></div>
                        <span className="text-sm">5xx Server Error</span>
                      </div>
                      <span className="font-medium">1.7%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Rate Limiting</CardTitle>
                  <CardDescription>Throttled requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Requests</span>
                      <span className="font-medium">{formatNumber(apiMetrics.total || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Rate Limited</span>
                      <span className="font-medium text-destructive">{formatNumber(apiMetrics.rateLimited || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Rate Limit %</span>
                      <Badge variant="secondary">
                        {((apiMetrics.rateLimited || 0) / (apiMetrics.total || 1) * 100).toFixed(2)}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'users',
      label: 'User Analytics',
      icon: UserCheck,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>New user registrations over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={(metricsData as any)?.userGrowth || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="newUsers" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Retention</CardTitle>
                <CardDescription>User activity retention rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Day 1</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 bg-muted rounded-full">
                        <div className="h-2 bg-chart-4 rounded-full" style={{ width: '85%' }}></div>
                      </div>
                      <span className="text-sm font-medium">85%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Day 7</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 bg-gray-200 rounded-full">
                        <div className="h-2 bg-blue-500 rounded-full" style={{ width: '65%' }}></div>
                      </div>
                      <span className="text-sm font-medium">65%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Day 30</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 bg-gray-200 rounded-full">
                        <div className="h-2 bg-purple-500 rounded-full" style={{ width: '45%' }}></div>
                      </div>
                      <span className="text-sm font-medium">45%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },
    {
      id: 'performance',
      label: 'Performance',
      icon: Gauge,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Response Time Trends</CardTitle>
                <CardDescription>API response times over the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={(performanceData as any)?.responseTimes || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="avg" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Average"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="p95" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="95th Percentile"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    }
  ]

  return (
    <UnifiedLoading
      isLoading={metricsLoading && !useMockData}
      error={metricsError}
      isEmpty={!effectiveMetricsData}
      loadingType="page"
      loadingMessage="Loading analytics data..."
      errorTitle="Failed to load analytics"
      errorDescription="There was an error loading the analytics data. Please try again."
      onRetry={() => navigation.refresh()}
      emptyTitle="No analytics data"
      emptyDescription="Analytics data will appear here once available."
    >
      <div className="space-y-6">
        {/* Development Mode Banner */}
        <DevelopmentModeBanner 
          isVisible={useMockData}
          onTryRealAPI={() => {
            setUseMockData(false)
            navigation.refresh()
          }}
        />

        {/* Period Selection */}
        <PeriodSelector 
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />

        {/* Analytics Summary Cards */}
        <SummaryCards 
          analytics={analyticsMetrics}
          isLoading={metricsLoading}
          variant="analytics"
        />

        {/* Charts */}
        <TabNavigation
          tabs={analyticsTabs}
          value={selectedMetric}
          onValueChange={setSelectedMetric}
          variant="default"
          size="md"
          className="space-y-4"
        />

        {/* Recent Reports */}
        <ReportsSection
          reports={(effectiveReportsData as any) || []}
          isLoading={reportsLoading}
          error={reportsError}
          onGenerateReport={() => {
            // Handle generate report action
            console.log('Generate report clicked');
          }}
          onRetry={() => navigation.refresh()}
        />
      </div>
    </UnifiedLoading>
  )
}

export default Analytics 