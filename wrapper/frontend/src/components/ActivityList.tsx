import React from 'react';
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import ActivityService, { ActivityLog, AuditLog } from '../services/activityService';

interface ActivityListProps {
  activities: ActivityLog[];
  auditLogs?: AuditLog[];
  loading?: boolean;
  error?: string | null;
  showDetails?: boolean;
}

// Helper functions to get user information
const getUserDisplayName = (item: ActivityLog | AuditLog): string => {
  if ('resourceType' in item) {
    // It's an audit log
    return (item as AuditLog).userName || 'Unknown';
  } else {
    // It's a regular activity - check for userInfo first, then fall back to direct fields
    const activity = item as ActivityLog;
    return activity.userInfo?.name || activity.userName || 'Unknown';
  }
};

const getUserDisplayEmail = (item: ActivityLog | AuditLog): string => {
  if ('resourceType' in item) {
    // It's an audit log
    return (item as AuditLog).userEmail || 'unknown';
  } else {
    // It's a regular activity - check for userInfo first, then fall back to direct fields
    const activity = item as ActivityLog;
    return activity.userInfo?.email || activity.userEmail || 'unknown';
  }
};

const ActivityList: React.FC<ActivityListProps> = ({
  activities,
  auditLogs = [],
  loading = false,
  error = null,
  showDetails = false
}) => {
  const formatActivityAction = (action: string) => {
    return ActivityService.formatActivityAction(action);
  };

  const getActivityIcon = (action: string) => {
    return ActivityService.getActivityIcon(action);
  };

  const getActivityColor = (action: string) => {
    return ActivityService.getActivityColor(action);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        {error}
      </div>
    );
  }

  const displayItems = activities.length > 0 ? activities : auditLogs;

  if (displayItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No activities found for the selected filters.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayItems.map((item) => {
        const isAuditLog = 'resourceType' in item;

        return (
          <div key={item.logId} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <div className="text-2xl">
              {getActivityIcon(item.action)}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center space-x-2">
                <Badge variant={getActivityColor(item.action) as any}>
                  {formatActivityAction(item.action)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(item.createdAt), 'MMM d, yyyy HH:mm')}
                </span>
              </div>

              <div className="text-sm text-muted-foreground">
                <div>
                  Application: {(item as ActivityLog).appName || 'System'}
                </div>
                <div>
                  User: {getUserDisplayName(item)} ({getUserDisplayEmail(item)})
                </div>
              </div>

              {isAuditLog && (
                <div className="text-sm text-muted-foreground">
                  Resource: {(item as AuditLog).resourceType} {(item as AuditLog).resourceId && `(${(item as AuditLog).resourceId})`}
                </div>
              )}

              {showDetails && ((item.metadata && Object.keys(item.metadata).length > 0) || (item.details && Object.keys(item.details).length > 0)) && (
                <div className="text-sm text-muted-foreground">
                  <details>
                    <summary className="cursor-pointer hover:text-foreground">
                      View Details
                    </summary>
                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                      {JSON.stringify(item.metadata || item.details, null, 2)}
                    </pre>
                  </details>
                </div>
              )}

              {isAuditLog && ((item as AuditLog).oldValues || (item as AuditLog).newValues) && (
                <div className="text-sm text-muted-foreground">
                  <details>
                    <summary className="cursor-pointer hover:text-foreground">
                      View Changes
                    </summary>
                    <div className="mt-2 space-y-2">
                      {(item as AuditLog).oldValues && (
                        <div>
                          <div className="font-medium text-red-600">Previous Values:</div>
                          <pre className="text-xs bg-red-50 p-2 rounded overflow-auto">
                            {JSON.stringify((item as AuditLog).oldValues, null, 2)}
                          </pre>
                        </div>
                      )}
                      {(item as AuditLog).newValues && (
                        <div>
                          <div className="font-medium text-green-600">New Values:</div>
                          <pre className="text-xs bg-green-50 p-2 rounded overflow-auto">
                            {JSON.stringify((item as AuditLog).newValues, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div>{item.ipAddress}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ActivityList;
