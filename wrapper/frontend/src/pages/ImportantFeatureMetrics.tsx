import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Shield, 
  DollarSign, 
  Users, 
  Lock, 
  Star, 
  Activity,
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Target,
  Gauge,
  Crown,
  Zap
} from 'lucide-react';

interface ImportantFeatureMetrics {
  summary: {
    totalImportantFeatureCalls: number;
    criticalFeatureCalls: number;
    highPriorityFeatureCalls: number;
    uptime: string;
    trackedFeatures: number;
  };
  cachePerformance: {
    critical: {
      totalCalls: number;
      hits: number;
      misses: number;
      hitRate: string;
    };
    highPriority: {
      totalCalls: number;
      hits: number;
      misses: number;
      hitRate: string;
    };
  };
  businessImpact: Record<string, {
    totalCalls: number;
    callsAvoided: number;
    hitRate: string;
    costSavings: string;
  }>;
  topFeatures: Array<{
    key: string;
    priority: string;
    description: string;
    businessImpact: string;
    metrics: {
      totalCalls: number;
      cacheHitRate: string;
      avgResponseTime: string;
      callsAvoided: number;
    };
  }>;
  applicationUsage: Record<string, {
    totalCalls: number;
    features: Record<string, number>;
  }>;
  projections: {
    hourly: number;
    daily: number;
    weekly: number;
    monthly: number;
  };
  timestamp: string;
}

const ImportantFeatureMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<ImportantFeatureMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [simulationRunning, setSimulationRunning] = useState(false);

  // Fetch important feature metrics
  const fetchMetrics = async () => {
    try {
      const response = await fetch('/metrics/important-features');
      const data = await response.json();
      
      if (data.success) {
        setMetrics(data.data);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch important feature metrics:', error);
      setLoading(false);
    }
  };

  // Start simulation
  const startSimulation = async () => {
    try {
      const response = await fetch('/metrics/important-features/simulate', {
        method: 'POST'
      });
      
      if (response.ok) {
        setSimulationRunning(true);
        await fetchMetrics();
      }
    } catch (error) {
      console.error('Failed to start simulation:', error);
    }
  };

  // Reset metrics
  const resetMetrics = async () => {
    try {
      const response = await fetch('/metrics/important-features/reset', {
        method: 'POST'
      });
      
      if (response.ok) {
        await fetchMetrics();
      }
    } catch (error) {
      console.error('Failed to reset metrics:', error);
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Get priority icon and color
  const getPriorityDisplay = (priority: string) => {
    switch (priority) {
      case 'critical':
        return { icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-red-100 text-red-800 border-red-200' };
      case 'high':
        return { icon: <Star className="w-4 h-4" />, color: 'bg-orange-100 text-orange-800 border-orange-200' };
      default:
        return { icon: <Activity className="w-4 h-4" />, color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  // Get business impact icon
  const getBusinessImpactIcon = (impact: string) => {
    switch (impact) {
      case 'Security & Access Control':
      case 'Security & Compliance':
        return <Shield className="w-5 h-5 text-red-600" />;
      case 'Revenue Protection':
      case 'Fair Usage & Billing':
        return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'User Conversion':
        return <Users className="w-5 h-5 text-blue-600" />;
      case 'Product Experience':
        return <Star className="w-5 h-5 text-purple-600" />;
      case 'Data Isolation & Security':
        return <Lock className="w-5 h-5 text-indigo-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  // Prepare chart data
  const businessImpactData = metrics ? Object.entries(metrics.businessImpact).map(([impact, data]) => ({
    name: impact.replace(' & ', '\n& '),
    totalCalls: data.totalCalls,
    callsAvoided: data.callsAvoided,
    hitRate: parseFloat(data.hitRate),
    savings: parseFloat(data.costSavings)
  })) : [];

  const applicationUsageData = metrics ? Object.entries(metrics.applicationUsage).map(([app, data]) => ({
    name: app.toUpperCase(),
    calls: data.totalCalls,
    features: Object.keys(data.features).length
  })) : [];

  const colors = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-lg">Loading important feature metrics...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="w-8 h-8 text-blue-600" />
            Important Feature Metrics
          </h1>
          <p className="text-gray-600 mt-1">
            Track API performance for critical business features only
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
          
          {!simulationRunning && (
            <Button
              onClick={startSimulation}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Activity className="w-4 h-4" />
              Start Simulation
            </Button>
          )}
          
          <Button
            onClick={resetMetrics}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Critical Features</p>
                <p className="text-2xl font-bold text-red-900">
                  {metrics?.summary.criticalFeatureCalls.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-red-700 mt-1">
                  {metrics?.cachePerformance.critical.hitRate || '0'}% cache hit rate
                </p>
              </div>
              <Crown className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">High Priority</p>
                <p className="text-2xl font-bold text-orange-900">
                  {metrics?.summary.highPriorityFeatureCalls.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  {metrics?.cachePerformance.highPriority.hitRate || '0'}% cache hit rate
                </p>
              </div>
              <Star className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Features</p>
                <p className="text-2xl font-bold text-blue-900">
                  {metrics?.summary.trackedFeatures || 0}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Important features tracked
                </p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Cache Efficiency</p>
                <p className="text-2xl font-bold text-green-900">
                  {metrics ? (
                    ((metrics.cachePerformance.critical.hits + metrics.cachePerformance.highPriority.hits) /
                    (metrics.cachePerformance.critical.totalCalls + metrics.cachePerformance.highPriority.totalCalls) * 100).toFixed(1)
                  ) : '0'}%
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Overall hit rate
                </p>
              </div>
              <Zap className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical vs High Priority Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-red-600" />
              Critical Features Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm text-red-600">Total Calls</p>
                  <p className="text-xl font-bold text-red-800">
                    {metrics?.cachePerformance.critical.totalCalls.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="text-red-500">
                  <Shield className="w-8 h-8" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">Cache Hits</p>
                  <p className="text-lg font-bold text-green-800">
                    {metrics?.cachePerformance.critical.hits.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Cache Misses</p>
                  <p className="text-lg font-bold text-gray-800">
                    {metrics?.cachePerformance.critical.misses.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600">Hit Rate</p>
                <p className="text-3xl font-bold text-blue-800">
                  {metrics?.cachePerformance.critical.hitRate || '0'}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-orange-600" />
              High Priority Features Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg">
                <div>
                  <p className="text-sm text-orange-600">Total Calls</p>
                  <p className="text-xl font-bold text-orange-800">
                    {metrics?.cachePerformance.highPriority.totalCalls.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="text-orange-500">
                  <Star className="w-8 h-8" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">Cache Hits</p>
                  <p className="text-lg font-bold text-green-800">
                    {metrics?.cachePerformance.highPriority.hits.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Cache Misses</p>
                  <p className="text-lg font-bold text-gray-800">
                    {metrics?.cachePerformance.highPriority.misses.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600">Hit Rate</p>
                <p className="text-3xl font-bold text-blue-800">
                  {metrics?.cachePerformance.highPriority.hitRate || '0'}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Impact Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Business Impact Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={businessImpactData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    typeof value === 'number' ? value.toLocaleString() : value,
                    name === 'callsAvoided' ? 'Calls Avoided' : 'Total Calls'
                  ]}
                />
                <Bar dataKey="totalCalls" fill="#94A3B8" name="Total Calls" />
                <Bar dataKey="callsAvoided" fill="#22C55E" name="Calls Avoided" />
              </BarChart>
            </ResponsiveContainer>
            
            <div className="space-y-4">
              {Object.entries(metrics?.businessImpact || {}).map(([impact, data]) => (
                <div key={impact} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getBusinessImpactIcon(impact)}
                    <div>
                      <p className="font-medium text-gray-900">{impact}</p>
                      <p className="text-sm text-gray-600">
                        {data.callsAvoided.toLocaleString()} calls avoided ({data.hitRate}%)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-600">Savings</p>
                    <p className="font-semibold text-green-800">${data.costSavings}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Important Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5" />
            Top Important Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics?.topFeatures.slice(0, 8).map((feature, index) => {
              const priorityDisplay = getPriorityDisplay(feature.priority);
              return (
                <div key={feature.key} className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-gray-400">
                      #{index + 1}
                    </div>
                    <div className="flex items-center gap-2">
                      {getBusinessImpactIcon(feature.businessImpact)}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{feature.description}</h3>
                          <Badge className={priorityDisplay.color}>
                            {priorityDisplay.icon}
                            <span className="ml-1">{feature.priority.toUpperCase()}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{feature.businessImpact}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-600">Calls</p>
                      <p className="font-semibold">{feature.metrics.totalCalls.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Hit Rate</p>
                      <p className="font-semibold text-green-600">{feature.metrics.cacheHitRate}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Avg Time</p>
                      <p className="font-semibold text-blue-600">{feature.metrics.avgResponseTime}ms</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Application Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Application Usage of Important Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={applicationUsageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  value.toLocaleString(),
                  name === 'calls' ? 'Feature Calls' : 'Features Used'
                ]}
              />
              <Bar dataKey="calls" fill="#3B82F6" name="Feature Calls" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Status Info */}
      <Alert>
        <Target className="h-4 w-4" />
        <AlertDescription>
          <strong>Important Feature Tracking:</strong> Monitoring {metrics?.summary.trackedFeatures || 0} critical business features. 
          {simulationRunning && (
            <span className="text-green-600 font-medium"> Live simulation running - tracking only important features.</span>
          )}
          <br />
          <span className="text-sm text-gray-600">
            Last updated: {metrics?.timestamp ? new Date(metrics.timestamp).toLocaleString() : 'Never'} | 
            Uptime: {metrics?.summary.uptime || 'Unknown'}
          </span>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ImportantFeatureMetrics; 