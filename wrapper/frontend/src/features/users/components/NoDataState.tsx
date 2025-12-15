import React from 'react';
import { AlertCircle, RefreshCw, Users } from 'lucide-react';
import { Card, CardContent, Button } from '@/components/ui';

interface NoDataStateProps {
  type: 'no-data' | 'no-users' | 'no-results';
  onRetry?: () => void;
  onClearFilters?: () => void;
  loading?: boolean;
}

export function NoDataState({ type, onRetry, onClearFilters, loading = false }: NoDataStateProps) {
  const getContent = () => {
    switch (type) {
      case 'no-data':
        return {
          icon: <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />,
          title: 'No data available',
          description: 'This could be because:',
          details: [
            '• Backend server is not running',
            '• API endpoints are not accessible',
            '• No users exist in the system',
            '• Authentication issues'
          ],
          showRetry: true
        };
      case 'no-users':
        return {
          icon: <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />,
          title: 'No users found matching your criteria',
          description: 'Try adjusting your search or filter settings to see more results.',
          details: [
            '• Check your search term spelling',
            '• Try different filter combinations',
            '• Clear all filters to see all users',
            '• Ensure users exist in the system'
          ],
          showRetry: false,
          showClearFilters: true
        };
      case 'no-results':
        return {
          icon: <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />,
          title: 'No results found',
          description: 'Try adjusting your search criteria.',
          details: [],
          showRetry: false
        };
      default:
        return {
          icon: <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />,
          title: 'No data available',
          description: '',
          details: [],
          showRetry: false
        };
    }
  };

  const content = getContent();

  return (
    <Card>
      <CardContent className="p-8 text-center">
        {content.icon}
        <p className="text-muted-foreground mb-2">{content.title}</p>
        {content.description && (
          <p className="text-sm text-muted-foreground mb-4">{content.description}</p>
        )}
        {content.details.length > 0 && (
          <ul className="text-sm text-muted-foreground text-left max-w-md mx-auto space-y-1">
            {content.details.map((detail, index) => (
              <li key={index}>{detail}</li>
            ))}
          </ul>
        )}
        <div className="flex gap-2 justify-center mt-4">
          {content.showRetry && onRetry && (
            <Button 
              onClick={onRetry} 
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Retry Loading Data
            </Button>
          )}
          {content.showClearFilters && onClearFilters && (
            <Button 
              onClick={onClearFilters} 
              variant="default"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
