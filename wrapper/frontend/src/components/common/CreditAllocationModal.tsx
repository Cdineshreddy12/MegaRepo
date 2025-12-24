import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

interface CreditAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: string;
  entityName: string;
  entityType: 'organization' | 'location';
  availableCredits?: number;
}

const SUPPORTED_APPLICATIONS = [
  { code: 'crm', name: 'CRM', description: 'Customer Relationship Management' },
  { code: 'hr', name: 'HR', description: 'Human Resources Management' },
  { code: 'affiliate', name: 'Affiliate', description: 'Affiliate Management' },
  { code: 'system', name: 'System', description: 'System Administration' }
];

export function CreditAllocationModal({
  isOpen,
  onClose,
  entityId,
  entityName,
  entityType,
  availableCredits = 0
}: CreditAllocationModalProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [allocationForm, setAllocationForm] = useState({
    targetApplication: '',
    creditAmount: 0,
    allocationPurpose: '',
    autoReplenish: false
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAllocationForm({
        targetApplication: '',
        creditAmount: 0,
        allocationPurpose: '',
        autoReplenish: false
      });
    }
  }, [isOpen]);

  const handleAllocateCredits = async () => {
    if (!allocationForm.targetApplication || !allocationForm.creditAmount) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (allocationForm.creditAmount > availableCredits) {
      toast.error('Cannot allocate more credits than are available');
      return;
    }

    try {
      setLoading(true);

      const response = await api.post('/credits/allocate/application', {
        sourceEntityId: entityId,
        targetApplication: allocationForm.targetApplication,
        creditAmount: allocationForm.creditAmount,
        allocationPurpose: allocationForm.allocationPurpose,
        autoReplenish: allocationForm.autoReplenish
      });

      if (response.data.success) {
        toast.success(`Successfully allocated ${allocationForm.creditAmount} credits to ${allocationForm.targetApplication}`);

        // Invalidate credit queries to update the UI immediately
        try {
          queryClient.invalidateQueries({ queryKey: ['credit'] });
          queryClient.invalidateQueries({ queryKey: ['creditStatus'], exact: false });
          queryClient.invalidateQueries({ queryKey: ['admin', 'entities'] });
          queryClient.invalidateQueries({ queryKey: ['organization', 'hierarchy'] });
        } catch (invalidateError) {
          console.warn('Failed to invalidate queries:', invalidateError);
        }

        setAllocationForm({
          targetApplication: '',
          creditAmount: 0,
          allocationPurpose: '',
          autoReplenish: false
        });
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to allocate credits:', error);
      const errorMessage = error.response?.data?.message || 'Failed to allocate credits';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Allocate Credits to Application
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            Allocate credits from <Badge variant="outline" className="inline-flex">{entityName}</Badge> to a specific application
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Available Credits Info */}
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Available Credits: <span className="font-semibold text-green-600">{availableCredits.toLocaleString()}</span>
            </div>
          </div>

          {/* Application Selection */}
          <div>
            <label className="text-sm font-medium">Application</label>
            <Select
              value={allocationForm.targetApplication}
              onValueChange={(value) => setAllocationForm({...allocationForm, targetApplication: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select application" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_APPLICATIONS.map((app) => (
                  <SelectItem key={app.code} value={app.code}>
                    {app.name} - {app.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Credit Amount */}
          <div>
            <label className="text-sm font-medium">Credit Amount</label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              max={availableCredits}
              value={allocationForm.creditAmount || ''}
              onChange={(e) => setAllocationForm({...allocationForm, creditAmount: parseFloat(e.target.value) || 0})}
              placeholder="Enter credit amount"
            />
            {allocationForm.creditAmount > availableCredits && (
              <p className="text-sm text-red-600 mt-1">Cannot allocate more than available credits</p>
            )}
          </div>

          {/* Purpose */}
          <div>
            <label className="text-sm font-medium">Purpose (Optional)</label>
            <Input
              value={allocationForm.allocationPurpose}
              onChange={(e) => setAllocationForm({...allocationForm, allocationPurpose: e.target.value})}
              placeholder="Describe the purpose of this allocation"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleAllocateCredits}
              disabled={loading || !allocationForm.targetApplication || !allocationForm.creditAmount || allocationForm.creditAmount > availableCredits}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Allocating...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Allocate Credits
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
