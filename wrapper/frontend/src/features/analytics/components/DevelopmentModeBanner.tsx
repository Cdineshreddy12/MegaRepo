import { Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DevelopmentModeBannerProps {
  isVisible: boolean;
  onTryRealAPI: () => void;
}

export function DevelopmentModeBanner({ isVisible, onTryRealAPI }: DevelopmentModeBannerProps) {
  if (!isVisible) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-yellow-600" />
          <div>
            <p className="text-sm font-medium text-yellow-800">Development Mode</p>
            <p className="text-xs text-yellow-600">Using mock data due to API connection issues</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onTryRealAPI}
        >
          Try Real API
        </Button>
      </div>
    </div>
  );
}
