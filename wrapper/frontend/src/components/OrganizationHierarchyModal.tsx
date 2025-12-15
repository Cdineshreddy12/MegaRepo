import { Dialog, DialogContent } from '@/components/ui/dialog';
import { OrganizationHierarchyChart } from './OrganizationHierarchyChart';
import { PearlButton } from '@/components/ui/pearl-button';
import { X } from 'lucide-react';

// Types based on your documentation
interface Entity {
  entityId: string;
  entityName: string;
  entityType: 'organization' | 'location' | 'department' | 'team';
  organizationType?: string;
  locationType?: string;
  departmentType?: string;
  teamType?: string;
  entityLevel: number;
  hierarchyPath: string;
  fullHierarchyPath: string;
  parentEntityId?: string;
  responsiblePersonId?: string;
  responsiblePersonName?: string;
  isActive: boolean;
  description?: string;
  children: Entity[];
  availableCredits?: number;
  reservedCredits?: number;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface OrganizationHierarchyModalProps {
  isOpen: boolean;
  onClose: () => void;
  hierarchy: Entity[];
  isLoading?: boolean;
  onSelectEntity?: (entity: Entity) => void;
  onEditEntity?: (entity: Entity) => void;
  onDeleteEntity?: (entityId: string) => void;
}

export function OrganizationHierarchyModal({
  isOpen,
  onClose,
  hierarchy,
  isLoading = false,
  onSelectEntity,
  onEditEntity,
  onDeleteEntity
}: OrganizationHierarchyModalProps) {

  return (
    <>
      {/* Fixed close button overlay */}
      {isOpen && (
        <PearlButton
          variant="secondary"
          size="sm"
          onClick={onClose}
          className="fixed top-2 right-2 z-[9999] !p-2"
        >
          <X className="w-4 h-4" />
        </PearlButton>
      )}

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[98vw] h-[98vh] max-w-none max-h-none p-0 ">
          {/* Full-screen content area */}
          <div className="w-full h-full overflow-auto bg-gray-50 pt-16 pb-6 px-6">
            <OrganizationHierarchyChart
              hierarchy={hierarchy}
              isLoading={isLoading}
              onSelectEntity={onSelectEntity}
              onEditEntity={onEditEntity}
              onDeleteEntity={onDeleteEntity}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
