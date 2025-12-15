import React from 'react';
import { RefreshCw } from 'lucide-react';
import { DialogHeader, Button, Switch, Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui';

interface SyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dryRun: boolean;
  onDryRunChange: (value: boolean) => void;
  onConfirm: () => void;
  isSyncing: boolean;
}

export function SyncDialog({
  open,
  onOpenChange,
  dryRun,
  onDryRunChange,
  onConfirm,
  isSyncing
}: SyncDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sync All Users</DialogTitle>
          <DialogDescription>
            Sync all users to their accessible applications
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="dry-run"
              checked={dryRun}
              onCheckedChange={onDryRunChange}
            />
            <label htmlFor="dry-run" className="text-sm">
              Dry run (preview only)
            </label>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {dryRun ? 'Preview Sync' : 'Start Sync'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
