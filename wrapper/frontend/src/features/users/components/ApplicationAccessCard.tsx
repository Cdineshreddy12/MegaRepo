import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Card, CardContent, Button, Badge } from '@/components/ui';

interface ApplicationAccess {
  appId: string;
  appCode: string;
  appName: string;
  description: string;
  icon: string;
  baseUrl: string;
  status: string;
  isCore: boolean;
  modules: ModuleAccess[];
  permissions: Permission[];
}

interface ModuleAccess {
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  permissions: string[];
  grantedAt: string;
  expiresAt?: string;
}

interface Permission {
  permissionId: string;
  permissions: string[];
  grantedAt: string;
  expiresAt?: string;
}

interface ApplicationAccessCardProps {
  app: ApplicationAccess;
  onSync: () => void;
  isSyncing: boolean;
}

export function ApplicationAccessCard({
  app,
  onSync,
  isSyncing
}: ApplicationAccessCardProps) {
  return (
    <Card className="border rounded-lg p-3 bg-background">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{app.icon}</span>
          <div>
            <p className="font-medium text-sm">{app.appName}</p>
            <p className="text-xs text-muted-foreground">{app.appCode}</p>
          </div>
        </div>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={onSync}
          disabled={isSyncing}
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      {app.modules.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Modules:</p>
          <div className="flex flex-wrap gap-1">
            {app.modules.map(module => (
              <Badge key={module.moduleId} variant="outline" className="text-xs">
                {module.moduleCode}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
