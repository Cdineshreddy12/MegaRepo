import React, { useState } from 'react';
import { useCreditHistory } from '@/queries/CreditQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Clock, Coins, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface CreditActivityViewerProps {
  className?: string;
}

const CreditActivityViewer: React.FC<CreditActivityViewerProps> = ({ className }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data: historyData, isLoading, error } = useCreditHistory({
    page: currentPage,
    limit: 10
  });

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  const getOperationBadgeColor = (operationCode: string) => {
    if (operationCode.includes('create')) return 'default';
    if (operationCode.includes('update')) return 'secondary';
    if (operationCode.includes('delete')) return 'destructive';
    if (operationCode.includes('read')) return 'outline';
    return 'default';
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Credit Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !historyData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Credit Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Unable to load credit activity history.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { logs, pagination } = historyData?.data || {};

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Credit Activity History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!logs || logs.length === 0 ? (
          <div className="text-center py-6">
            <Coins className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No credit activity found
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Date & Time</TableHead>
                  <TableHead>Operation</TableHead>
                  <TableHead className="text-right">Credits Used</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(log.timestamp)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getOperationBadgeColor(log.operationCode)} className="text-xs">
                        {log.operationCode 
                          ? log.operationCode.replace(/^crm\./, '').replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                          : 'Unknown Operation'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      -{log.creditCost}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.remainingCredits.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Credit Transaction Details</DialogTitle>
                          </DialogHeader>
                          {selectedLog && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="font-medium text-muted-foreground">Operation</p>
                                  <Badge variant={getOperationBadgeColor(selectedLog.operationCode)}>
                                    {selectedLog.operationCode}
                                  </Badge>
                                </div>
                                <div>
                                  <p className="font-medium text-muted-foreground">Credits Used</p>
                                  <p className="text-red-600 font-medium">-{selectedLog.creditCost}</p>
                                </div>
                                <div>
                                  <p className="font-medium text-muted-foreground">Timestamp</p>
                                  <p>{formatDate(selectedLog.timestamp)}</p>
                                </div>
                                <div>
                                  <p className="font-medium text-muted-foreground">Remaining Credits</p>
                                  <p className="font-medium">{selectedLog.remainingCredits.toLocaleString()}</p>
                                </div>
                              </div>

                              {selectedLog.operationDetails && Object.keys(selectedLog.operationDetails).length > 0 && (
                                <div>
                                  <p className="font-medium text-muted-foreground mb-2">Operation Details</p>
                                  <ScrollArea className="h-32 w-full border rounded p-2">
                                    <pre className="text-xs">
                                      {JSON.stringify(selectedLog.operationDetails, null, 2)}
                                    </pre>
                                  </ScrollArea>
                                </div>
                              )}

                              <div>
                                <p className="font-medium text-muted-foreground">Transaction ID</p>
                                <p className="text-xs font-mono bg-gray-100 p-2 rounded">
                                  {selectedLog.transactionId}
                                </p>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} entries
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                    disabled={pagination.page === pagination.pages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CreditActivityViewer;
