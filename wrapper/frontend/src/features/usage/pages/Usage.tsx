import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Activity, Clock, Database, Users, AlertTriangle, Download } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usageAPI } from '@/lib/api'
import { formatNumber, formatDate } from '@/lib/utils'

export function Usage() {
  const [selectedPeriod, setSelectedPeriod] = useState('7d')

  const { data: currentUsage, isLoading } = useQuery({
    queryKey: ['current-usage'],
    queryFn: () => usageAPI.getCurrent().then(res => res.data)
  })

  const { data: usageMetrics } = useQuery({
    queryKey: ['usage-metrics', selectedPeriod],
    queryFn: () => usageAPI.getMetrics(selectedPeriod).then(res => res.data)
  })

  const { data: usageBreakdown } = useQuery({
    queryKey: ['usage-breakdown'],
    queryFn: () => usageAPI.getBreakdown().then(res => res.data)
  })

  const { data: usageAlerts } = useQuery({
    queryKey: ['usage-alerts'],
    queryFn: () => usageAPI.getAlerts().then(res => res.data)
  })

  const { data: usageLogs } = useQuery({
    queryKey: ['usage-logs'],
    queryFn: () => usageAPI.getLogs().then(res => res.data)
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usage Analytics</h1>
          <p className="text-gray-600">Monitor your API usage and resource consumption</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Period Selection */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Period:</span>
        {['24h', '7d', '30d', '90d'].map((period) => (
          <Button
            key={period}
            variant={selectedPeriod === period ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod(period)}
          >
            {period}
          </Button>
        ))}
      </div>

      {/* Current Usage Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">API Calls</p>
                <p className="text-2xl font-bold">{formatNumber(currentUsage?.apiCalls || 0)}</p>
                <p className="text-xs text-gray-500">This month</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Storage Used</p>
                <p className="text-2xl font-bold">{(currentUsage?.storage || 0).toFixed(2)} GB</p>
                <p className="text-xs text-gray-500">Total storage</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <Database className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold">{formatNumber(currentUsage?.users || 0)}</p>
                <p className="text-xs text-gray-500">This month</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bandwidth</p>
                <p className="text-2xl font-bold">{(currentUsage?.bandwidth || 0).toFixed(2)} GB</p>
                <p className="text-xs text-gray-500">This month</p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>API Usage Trend</CardTitle>
            <CardDescription>API calls over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={usageMetrics?.apiUsage || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="calls" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Storage Growth</CardTitle>
            <CardDescription>Storage usage over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={usageMetrics?.storage || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="size" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="breakdown" className="space-y-6">
        <TabsList>
          <TabsTrigger value="breakdown">Usage Breakdown</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Usage by Endpoint</CardTitle>
                <CardDescription>Most used API endpoints</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {usageBreakdown?.endpoints?.map((endpoint: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{endpoint.path}</p>
                        <p className="text-sm text-gray-600">{endpoint.method}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatNumber(endpoint.calls)}</p>
                        <p className="text-sm text-gray-600">{endpoint.percentage}%</p>
                      </div>
                    </div>
                  )) || (
                    <p className="text-gray-500 text-center py-4">No data available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usage by User</CardTitle>
                <CardDescription>Top users by API calls</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {usageBreakdown?.users?.map((user: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatNumber(user.calls)}</p>
                        <Badge variant="secondary">{user.role}</Badge>
                      </div>
                    </div>
                  )) || (
                    <p className="text-gray-500 text-center py-4">No data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Usage Alerts</CardTitle>
              <CardDescription>Notifications for unusual usage patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {usageAlerts?.map((alert: any, index: number) => (
                  <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{alert.title}</p>
                      <p className="text-sm text-gray-600">{alert.description}</p>
                      <p className="text-xs text-gray-500">{formatDate(alert.createdAt)}</p>
                    </div>
                    <Badge variant={alert.severity === 'high' ? 'destructive' : 'warning'}>
                      {alert.severity}
                    </Badge>
                  </div>
                )) || (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No alerts at this time</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Logs</CardTitle>
              <CardDescription>Detailed usage activity log</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {usageLogs?.data?.map((log: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border-b">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">
                          {log.method} {log.endpoint}
                        </p>
                        <p className="text-xs text-gray-600">
                          User: {log.user} • IP: {log.ip}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={log.status >= 400 ? 'destructive' : 'secondary'}>
                        {log.status}
                      </Badge>
                      <p className="text-xs text-gray-500">{formatDate(log.timestamp)}</p>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No activity logs available</p>
                  </div>
                )}
              </div>
              
              {usageLogs?.hasMore && (
                <div className="text-center pt-4">
                  <Button variant="outline">Load More</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Usage 