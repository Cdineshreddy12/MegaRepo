import React, { useRef, useEffect, useState } from 'react';
import { FormField } from '../types';

/**
 * Lazy loading component for field components
 */
export const LazyFieldComponent: React.FC<{
  field: FormField;
  renderField: (field: FormField) => React.ReactNode;
  fallback?: React.ReactNode;
  height?: number;
}> = ({ field, renderField, fallback, height = 80 }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Delay loading to prevent too many simultaneous loads
          setTimeout(() => setIsLoaded(true), 100);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ minHeight: height }}>
      {isVisible ? (
        isLoaded ? (
          renderField(field)
        ) : (
          fallback || <FieldSkeleton height={height} />
        )
      ) : (
        <div style={{ height }} /> // Placeholder height
      )}
    </div>
  );
};

/**
 * Field skeleton for loading states
 */
export const FieldSkeleton: React.FC<{ height?: number }> = ({ height = 80 }) => (
  <div 
    className="animate-pulse space-y-3 p-4 border border-gray-200 rounded-lg"
    style={{ minHeight: height }}
  >
    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
    <div className="h-10 bg-gray-200 rounded"></div>
    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
  </div>
);

/**
 * Hook for virtual scrolling optimization
 */
export const useVirtualScrolling = (
  items: any[],
  threshold: number = 50
) => {
  const [shouldVirtualize, setShouldVirtualize] = useState(false);

  useEffect(() => {
    setShouldVirtualize(items.length > threshold);
  }, [items.length, threshold]);

  return {
    shouldVirtualize,
    itemCount: items.length,
    threshold
  };
};

/**
 * Hook for form performance monitoring
 */
export const useFormPerformance = () => {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    fieldCount: 0,
    memoryUsage: 0
  });

  const measurePerformance = (fieldCount: number) => {
    const startTime = performance.now();
    
    // Simulate performance measurement
    requestAnimationFrame(() => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      setMetrics({
        renderTime,
        fieldCount,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
      });
    });
  };

  return {
    metrics,
    measurePerformance
  };
};
