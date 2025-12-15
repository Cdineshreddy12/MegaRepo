import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

interface BulkUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tenantName?: string;
}

export const BulkUpdateDialog: React.FC<BulkUpdateDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  tenantName
}) => {
  const [bulkData, setBulkData] = useState({
    creditMultiplier: '',
    freeAllowance: '',
    enableOverage: false,
    setActive: true
  });

  const handleConfirm = () => {
    // Here you would typically process the bulk data
    console.log('Bulk update data:', bulkData);
    onConfirm();
    // Reset form
    setBulkData({
      creditMultiplier: '',
      freeAllowance: '',
      enableOverage: false,
      setActive: true
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Bulk Update Tenant Configurations
          </DialogTitle>
          <DialogDescription>
            Apply configuration changes to multiple operations for {tenantName || 'this tenant'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div className="text-sm text-muted-foreground">
              This feature allows you to apply the same configuration changes to multiple operations at once.
              For now, you can use this to quickly adjust credit costs or settings across operations.
            </div>

            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-medium">Bulk Configuration Options</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bulkCreditMultiplier">Credit Cost Multiplier</Label>
                  <Input
                    id="bulkCreditMultiplier"
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="e.g., 1.2 for 20% increase"
                    value={bulkData.creditMultiplier}
                    onChange={(e) => setBulkData(prev => ({
                      ...prev,
                      creditMultiplier: e.target.value
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="bulkFreeAllowance">Set Free Allowance</Label>
                  <Input
                    id="bulkFreeAllowance"
                    type="number"
                    min="0"
                    placeholder="e.g., 100"
                    value={bulkData.freeAllowance}
                    onChange={(e) => setBulkData(prev => ({
                      ...prev,
                      freeAllowance: e.target.value
                    }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="bulkEnableOverage"
                  checked={bulkData.enableOverage}
                  onChange={(e) => setBulkData(prev => ({
                    ...prev,
                    enableOverage: e.target.checked
                  }))}
                />
                <Label htmlFor="bulkEnableOverage">Enable overage for all operations</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="bulkSetActive"
                  checked={bulkData.setActive}
                  onChange={(e) => setBulkData(prev => ({
                    ...prev,
                    setActive: e.target.checked
                  }))}
                />
                <Label htmlFor="bulkSetActive">Set all operations as active</Label>
              </div>
            </div>

            <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
              <strong>Note:</strong> This will apply changes to all tenant-specific operations.
              Global operations will not be affected.
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Apply Bulk Updates
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
