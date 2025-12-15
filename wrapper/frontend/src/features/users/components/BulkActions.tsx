import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface BulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
}

export function BulkActions({ selectedCount, onClearSelection }: BulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-primary">
              {selectedCount} user{selectedCount !== 1 ? 's' : ''} selected
            </span>
          </div>
          
          <div className="flex gap-2">
            <Button size="sm">
              Bulk Actions
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearSelection}
            >
              Clear
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
