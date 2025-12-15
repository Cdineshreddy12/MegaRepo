import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { EmptyState } from '@/components/common/EmptyState';

interface Report {
  name: string;
  createdAt: Date;
}

interface ReportsSectionProps {
  reports: Report[];
  isLoading: boolean;
  error?: Error | null;
  onGenerateReport?: () => void;
  onRetry?: () => void;
}

export function ReportsSection({ 
  reports, 
  isLoading, 
  error, 
  onGenerateReport,
  onRetry 
}: ReportsSectionProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
          <CardDescription>Recent analytics reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
          <CardDescription>Recent analytics reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-red-500 mb-4">
              <Download className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Failed to load reports</p>
            </div>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
          <CardDescription>Recent analytics reports</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Download}
            title="No reports generated yet"
            description="Generate your first analytics report to see it here."
            action={onGenerateReport ? {
              label: "Generate Report",
              onClick: onGenerateReport,
              icon: Download,
              variant: "default"
            } : undefined}
            showCard={false}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Reports</CardTitle>
        <CardDescription>Recent analytics reports</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {reports.map((report, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <div>
                <p className="font-medium">{report.name}</p>
                <p className="text-sm text-muted-foreground">
                  Generated on {formatDate(report.createdAt)}
                </p>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
