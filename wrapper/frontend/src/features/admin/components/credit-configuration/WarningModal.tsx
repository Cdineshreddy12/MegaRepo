import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info } from 'lucide-react';

interface WarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  changeImpact?: {
    affectedOperations: number;
    affectedTenants: number;
    estimatedImpact: string;
  } | null;
  confirmText?: string;
  cancelText?: string;
}

export const WarningModal: React.FC<WarningModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Configuration Changes",
  description = "You're about to make changes to credit cost configurations. This action may impact existing operations and billing.",
  changeImpact,
  confirmText = "Confirm Changes",
  cancelText = "Cancel Changes"
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        {changeImpact && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <h4 className="font-medium text-amber-800">Change Impact Assessment</h4>
                  <div className="text-sm text-amber-700 space-y-1">
                    <p>• <strong>{changeImpact.affectedOperations}</strong> operation costs will be modified</p>
                    <p>• <strong>{changeImpact.affectedTenants}</strong> tenant(s) will be affected</p>
                    <p>• {changeImpact.estimatedImpact}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-800">Important Notes</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>• Changes will take effect immediately for new operations</p>
                    <p>• Existing in-progress operations will continue with old costs</p>
                    <p>• Tenants will be notified of cost changes via email</p>
                    <p>• You can revert changes within 24 hours if needed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
