import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Clock, 
  Server, 
  Users, 
  CreditCard,
  Activity
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

interface TrialSystemStatus {
  monitoringStatus: {
    isRunning: boolean
    lastHealthCheck: string | null
    errorCount: number
    activeJobs: number
    uptime: number | null
  }
  subscriptionStats: Array<{
    plan: string
    status: string
    count: number
  }>
  expiredTrials: Array<{
    tenantId: string
    companyName: string
    plan: string
    status: string
    trialEnd: string
    daysExpired: number
  }>
  systemHealth: {
    isHealthy: boolean
    issues: string[]
  }
  timestamp: string
}

export function TrialSystemMonitor() {
  const [status, setStatus] = useState<TrialSystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [restarting, setRestarting] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/trials/system-status')
      if (response.data.success) {
        setStatus(response.data.data)
        setLastRefresh(new Date())
      } else {
        toast.error('Failed to fetch trial system status')
      }
    } catch (error: any) {
      console.error('Error fetching trial system status:', error)
      toast.error(error.response?.data?.message || 'Failed to fetch status')
    } finally {
      setLoading(false)
    }
  }

  const restartMonitoring = async () => {
    try {
      setRestarting(true)
      const response = await api.post('/admin/trials/restart-monitoring')
      if (response.data.success) {
        toast.success('Trial monitoring system restarted successfully')
        await fetchStatus() // Refresh status after restart
      } else {
        toast.error('Failed to restart trial monitoring')
      }
    } catch (error: any) {
      console.error('Error restarting trial monitoring:', error)
      toast.error(error.response?.data?.message || 'Failed to restart monitoring')
    } finally {
      setRestarting(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !status) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Trial System Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusColor = (isHealthy: boolean) => isHealthy ? 'text-green-600' : 'text-red-600'
  const getStatusIcon = (isHealthy: boolean) => isHealthy ? CheckCircle : XCircle

  const formatUptime = (uptime: number | null) => {
    if (!uptime) return 'Unknown'
    const hours = Math.floor(uptime / (1000 * 60 * 60))
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Trial System Monitor
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStatus}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={restartMonitoring}
                disabled={restarting}
              >
                <Server className={`h-4 w-4 mr-2 ${restarting ? 'animate-spin' : ''}`} />
                Restart Monitoring
              </Button>
            </div>
          </div>
          {lastRefresh && (
            <p className="text-sm text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {status && (
            <div className="space-y-4">
              {/* System Health Alert */}
              {!status.systemHealth.isHealthy && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>System Issues Detected:</strong>
                    <ul className="mt-2 space-y-1">
                      {status.systemHealth.issues.map((issue, index) => (
                        <li key={index} className="text-sm">• {issue}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Monitoring Status Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  {React.createElement(
                    getStatusIcon(status.monitoringStatus.isRunning),
                    { 
                      className: `h-8 w-8 ${getStatusColor(status.monitoringStatus.isRunning)}` 
                    }
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-600">Monitoring Status</p>
                    <p className="text-lg font-bold">
                      {status.monitoringStatus.isRunning ? 'Running' : 'Stopped'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Server className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Jobs</p>
                    <p className="text-lg font-bold">
                      {status.monitoringStatus.activeJobs}
                      <span className="text-sm text-gray-500 ml-1">/ 4</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <AlertTriangle className={`h-8 w-8 ${status.monitoringStatus.errorCount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Error Count</p>
                    <p className="text-lg font-bold">{status.monitoringStatus.errorCount}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Clock className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Last Health Check</p>
                    <p className="text-sm font-bold">
                      {status.monitoringStatus.lastHealthCheck 
                        ? new Date(status.monitoringStatus.lastHealthCheck).toLocaleTimeString()
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription Statistics */}
      {status && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {status.subscriptionStats.map((stat, index) => (
                <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                  <Badge variant={stat.status === 'active' ? 'default' : stat.status === 'past_due' ? 'destructive' : 'secondary'}>
                    {stat.status}
                  </Badge>
                  <p className="text-2xl font-bold mt-2">{stat.count}</p>
                  <p className="text-sm text-gray-600 capitalize">{stat.plan}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expired Trials */}
      {status && status.expiredTrials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recently Expired Trials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {status.expiredTrials.map((trial, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div>
                    <p className="font-medium">{trial.companyName || trial.tenantId}</p>
                    <p className="text-sm text-gray-600">
                      {trial.plan} • Expired {trial.daysExpired} days ago
                    </p>
                  </div>
                  <Badge variant="destructive">
                    {trial.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 