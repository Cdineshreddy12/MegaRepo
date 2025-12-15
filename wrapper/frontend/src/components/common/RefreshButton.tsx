import { Badge } from '@/components/ui/'
import { useDashboardData } from '@/hooks/useDashboardData'
import { RefreshCw, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCallback } from 'react'

interface CacheRefreshButtonProps {
    icon?: LucideIcon
}

export default function CacheRefreshButton({ icon: Icon = RefreshCw }: CacheRefreshButtonProps) {
    const { refreshDashboard, isLoading, cacheAge } = useDashboardData()
    
    // Wrap the refresh function to prevent infinite loops
    const handleRefresh = useCallback(async () => {
        try {
            await refreshDashboard()
        } catch (error) {
            console.error('Failed to refresh:', error)
        }
    }, [refreshDashboard])
    
    return (
        <Badge 
            variant="outline" 
            className="text-xs cursor-pointer hover:bg-muted/50 transition-colors" 
            onClick={handleRefresh}
        >
            {cacheAge && cacheAge > 0
                ? `Refreshed ${Math.round(cacheAge / 1000)}s ago`
                : 'Just refreshed'
            }
            <Icon className={cn('w-3 h-3 ml-2', isLoading && 'animate-spin')} />
        </Badge>
    )
}