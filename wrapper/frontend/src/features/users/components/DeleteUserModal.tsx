import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { PearlButton } from '@/components/ui/pearl-button';
import { User } from '@/types/user-management';

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onDelete: () => void;
}

export function DeleteUserModal({
  isOpen,
  onClose,
  user,
  onDelete
}: DeleteUserModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {user?.name || user?.email}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="text-center py-4">
          <p className="text-muted-foreground">
            The user will be permanently removed from the system.
          </p>
        </div>

        <DialogFooter>
          <PearlButton variant="outline" onClick={onClose}>
            Cancel
          </PearlButton>
          <PearlButton onClick={onDelete}>
            Delete
          </PearlButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
