"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { analyticsService, CalculationResult } from "@/services/api/analyticsService";
import { AnalyticsFormula } from "@/services/api/analyticsService";

interface AnalyticsWidgetProps {
  formula: AnalyticsFormula;
  dateRange?: {
    type: string;
    startDate?: string;
    endDate?: string;
  };
  showTrend?: boolean;
  className?: string;
}

export function AnalyticsWidget({
  formula,
  dateRange = { type: "last30days" },
  showTrend = false,
  className,
}: AnalyticsWidgetProps) {
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousResult, setPreviousResult] = useState<CalculationResult | null>(null);
  const loadingRef = useRef(false);
  const lastFormulaIdRef = useRef<string | undefined>();
  const lastDateRangeRef = useRef<string>("");

  // Create a stable string representation of dateRange for comparison
  const dateRangeKey = useMemo(() => {
    return JSON.stringify(dateRange);
  }, [dateRange?.type, dateRange?.startDate, dateRange?.endDate]);

  // Get stable formula ID
  const formulaId = useMemo(() => {
    return formula.id || formula._id;
  }, [formula.id, formula._id]);

  useEffect(() => {
    // Prevent duplicate calls
    if (loadingRef.current) {
      return;
    }

    // Check if formula ID or dateRange actually changed
    if (
      lastFormulaIdRef.current === formulaId &&
      lastDateRangeRef.current === dateRangeKey
    ) {
      return;
    }

    // Update refs
    lastFormulaIdRef.current = formulaId;
    lastDateRangeRef.current = dateRangeKey;

    loadData();
  }, [formulaId, dateRangeKey]);

  const loadData = async () => {
    if (!formulaId) {
      setLoading(false);
      return;
    }

    // Prevent concurrent calls
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      // Calculate current period
      const current = await analyticsService.calculate({
        formulaId: formulaId,
        dateRange,
      });
      setResult(current);

      // Calculate previous period for trend if enabled
      if (showTrend) {
        const previousDateRange = getPreviousPeriod(dateRange);
        try {
          const previous = await analyticsService.calculate({
            formulaId: formulaId,
            dateRange: previousDateRange,
          });
          setPreviousResult(previous);
        } catch (err) {
          // Ignore errors for previous period
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to calculate");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const getPreviousPeriod = (currentRange: any) => {
    const now = new Date();
    switch (currentRange.type) {
      case "last30days":
        return {
          type: "custom",
          startDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        };
      case "last7days":
        return {
          type: "custom",
          startDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        };
      case "thisMonth":
        return { type: "lastMonth" };
      default:
        return currentRange;
    }
  };

  const getTrend = () => {
    if (!result || !previousResult) return null;

    const currentValue = typeof result.value === "number" ? result.value : 0;
    const previousValue = typeof previousResult.value === "number" ? previousResult.value : 0;

    if (previousValue === 0) return null;

    const change = ((currentValue - previousValue) / previousValue) * 100;
    return {
      value: Math.abs(change),
      isPositive: change > 0,
    };
  };

  const trend = showTrend ? getTrend() : null;

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{formula.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-20">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{formula.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{formula.name}</CardTitle>
        {formula.description && (
          <p className="text-xs text-gray-500 mt-1">{formula.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold">{result?.formatted || "N/A"}</div>
          {result && (
            <>
              <p className="text-xs text-gray-500">
                From {result.submissionCount} submission{result.submissionCount !== 1 ? "s" : ""}
              </p>
              {result.explanation && (
                <p className="text-xs text-gray-600 mt-2 italic border-l-2 border-gray-300 pl-2">
                  {result.explanation}
                </p>
              )}
            </>
          )}
          {trend && (
            <div className="flex items-center gap-1 text-sm">
              {trend.isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={trend.isPositive ? "text-green-500" : "text-red-500"}>
                {trend.value.toFixed(1)}% vs previous period
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

