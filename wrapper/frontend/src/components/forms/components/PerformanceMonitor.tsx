import React, { useState, useEffect, useRef } from 'react';
import { Activity, Zap, Clock, HardDrive, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface PerformanceMetrics {
  renderTime: number;
  fieldCount: number;
  memoryUsage: number;
  interactionCount: number;
  validationTime: number;
  stepChangeTime: number;
  totalTime: number;
}

interface PerformanceMonitorProps {
  formElement?: HTMLElement;
  showDetails?: boolean;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  formElement,
  showDetails = true,
  onMetricsUpdate
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    fieldCount: 0,
    memoryUsage: 0,
    interactionCount: 0,
    validationTime: 0,
    stepChangeTime: 0,
    totalTime: 0
  });
  const [isMonitoring, setIsMonitoring] = useState(false);
  const startTimeRef = useRef<number>(0);
  const interactionCountRef = useRef<number>(0);
  const observerRef = useRef<PerformanceObserver | null>(null);

  useEffect(() => {
    if (isMonitoring) {
      startMonitoring();
    } else {
      stopMonitoring();
    }

    return () => stopMonitoring();
  }, [isMonitoring]);

  const startMonitoring = () => {
    startTimeRef.current = performance.now();
    
    // Monitor form interactions
    const element = formElement || document.querySelector('[data-form-container]');
    if (element) {
      const handleInteraction = () => {
        interactionCountRef.current++;
        updateMetrics();
      };

      element.addEventListener('input', handleInteraction);
      element.addEventListener('change', handleInteraction);
      element.addEventListener('click', handleInteraction);

      // Monitor performance entries
      if ('PerformanceObserver' in window) {
        observerRef.current = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'measure') {
              updateMetrics();
            }
          });
        });
        observerRef.current.observe({ entryTypes: ['measure'] });
      }
    }
  };

  const stopMonitoring = () => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  };

  const updateMetrics = () => {
    const element = formElement || document.querySelector('[data-form-container]');
    if (!element) return;

    const currentTime = performance.now();
    const totalTime = currentTime - startTimeRef.current;
    
    const fields = element.querySelectorAll('input, select, textarea, button');
    const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;

    const newMetrics: PerformanceMetrics = {
      renderTime: totalTime,
      fieldCount: fields.length,
      memoryUsage: Math.round(memoryUsage / 1024 / 1024), // Convert to MB
      interactionCount: interactionCountRef.current,
      validationTime: 0, // This would be measured during validation
      stepChangeTime: 0, // This would be measured during step changes
      totalTime
    };

    setMetrics(newMetrics);
    if (onMetricsUpdate) {
      onMetricsUpdate(newMetrics);
    }
  };

  const getPerformanceScore = (): number => {
    let score = 100;
    
    // Deduct points for slow render time
    if (metrics.renderTime > 100) score -= 20;
    else if (metrics.renderTime > 50) score -= 10;
    
    // Deduct points for high memory usage
    if (metrics.memoryUsage > 50) score -= 20;
    else if (metrics.memoryUsage > 25) score -= 10;
    
    // Deduct points for too many fields without virtualization
    if (metrics.fieldCount > 50) score -= 15;
    else if (metrics.fieldCount > 25) score -= 5;
    
    return Math.max(0, score);
  };

  const performanceScore = getPerformanceScore();
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!showDetails) {
    return (
      <div className="flex items-center gap-2">
        <Button
          onClick={() => setIsMonitoring(!isMonitoring)}
          size="sm"
          variant={isMonitoring ? 'default' : 'outline'}
        >
          <Activity className="w-4 h-4 mr-1" />
          {isMonitoring ? 'Stop' : 'Monitor'}
        </Button>
        <Badge variant={performanceScore >= 80 ? 'default' : 'destructive'}>
          {performanceScore}%
        </Badge>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Performance Monitor
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsMonitoring(!isMonitoring)}
              size="sm"
              variant={isMonitoring ? 'default' : 'outline'}
            >
              {isMonitoring ? 'Stop' : 'Start'} Monitoring
            </Button>
            <Badge variant={performanceScore >= 80 ? 'default' : 'destructive'}>
              {performanceScore}%
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Clock className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <div className="text-lg font-bold text-blue-800">
                {metrics.renderTime.toFixed(0)}ms
              </div>
              <div className="text-sm text-blue-600">Render Time</div>
            </div>

            <div className="text-center p-3 bg-green-50 rounded-lg">
              <Zap className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <div className="text-lg font-bold text-green-800">
                {metrics.fieldCount}
              </div>
              <div className="text-sm text-green-600">Fields</div>
            </div>

            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <HardDrive className="w-6 h-6 mx-auto mb-2 text-purple-600" />
              <div className="text-lg font-bold text-purple-800">
                {metrics.memoryUsage}MB
              </div>
              <div className="text-sm text-purple-600">Memory</div>
            </div>

            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <Activity className="w-6 h-6 mx-auto mb-2 text-orange-600" />
              <div className="text-lg font-bold text-orange-800">
                {metrics.interactionCount}
              </div>
              <div className="text-sm text-orange-600">Interactions</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Performance Score</span>
              <span className={getScoreColor(performanceScore)}>
                {performanceScore}%
              </span>
            </div>
            <Progress value={performanceScore} className="h-2" />
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total Time:</span>
              <span>{metrics.totalTime.toFixed(0)}ms</span>
            </div>
            <div className="flex justify-between">
              <span>Validation Time:</span>
              <span>{metrics.validationTime.toFixed(0)}ms</span>
            </div>
            <div className="flex justify-between">
              <span>Step Change Time:</span>
              <span>{metrics.stepChangeTime.toFixed(0)}ms</span>
            </div>
          </div>

          {performanceScore < 80 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">
                Performance Recommendations
              </h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {metrics.renderTime > 100 && (
                  <li>• Consider optimizing render performance</li>
                )}
                {metrics.memoryUsage > 50 && (
                  <li>• High memory usage detected - check for memory leaks</li>
                )}
                {metrics.fieldCount > 50 && (
                  <li>• Consider virtual scrolling for large forms</li>
                )}
                {metrics.interactionCount > 100 && (
                  <li>• High interaction count - consider debouncing</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceMonitor;
