import { Container, Grid } from '@/components/common/Page';
import { StatsCard } from '@/components/ui/stats-card';
import { ApplicationGrid } from '@/features/applications/components/ApplicationGrid';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useOrganizationAuth } from '@/hooks/useOrganizationAuth';
import { useCreditStatus } from '@/hooks/useCreditStatus';
import { useUserContext } from '@/contexts/UserContextProvider';
import { Users, Building, Coins, Calendar, CreditCard, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';


// Hook to manage recently used applications
function useRecentlyUsedApps() {
    const [recentlyUsedApps, setRecentlyUsedApps] = useState<any[]>([])

    // Load recently used apps from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('recentlyUsedApps')
        if (stored) {
            try {
                const parsed = JSON.parse(stored)
                setRecentlyUsedApps(parsed)
            } catch (e) {
                console.error('Error parsing recently used apps:', e)
            }
        }
    }, [])

    // Track application usage
    const trackAppUsage = (app: any) => {
        const appId = app.appId || app.id
        const now = Date.now()

        // Get current recently used apps
        const current = [...recentlyUsedApps]

        // Remove if already exists (to move to front)
        const filtered = current.filter(item => item.appId !== appId)

        // Add to front with timestamp
        const updated = [{
            appId,
            appData: app,
            lastUsed: now,
            usageCount: (current.find(item => item.appId === appId)?.usageCount || 0) + 1
        }, ...filtered.slice(0, 9)] // Keep only top 10

        // Save to localStorage
        localStorage.setItem('recentlyUsedApps', JSON.stringify(updated))
        setRecentlyUsedApps(updated)
    }

    return { recentlyUsedApps, trackAppUsage }
}

export function OverviewPage() {
    const { metrics, applications, isLoading } = useDashboardData()
    const { tenantId } = useOrganizationAuth()
    const { tenant } = useUserContext()
    const { creditStatus, isLoading: creditLoading } = useCreditStatus()
    const navigate = useNavigate()
    const { recentlyUsedApps, trackAppUsage } = useRecentlyUsedApps()

    // Get the actual application data for recently used apps
    const getRecentlyUsedAppData = () => {
        return recentlyUsedApps
            .map(item => {
                // Find the full app data from the applications list
                const fullAppData = applications?.find((app: any) =>
                    (app.appId || app.id) === item.appId
                )
                return fullAppData ? { ...fullAppData, usageCount: item.usageCount, lastUsed: item.lastUsed } : null
            })
            .filter(Boolean)
            .slice(0, 6) // Show top 6 recently used apps
    }

    const recentlyUsedAppData = getRecentlyUsedAppData()

    const handleViewApplication = (app: any) => {
        // Track the app usage
        trackAppUsage(app)
        // Navigate to the application
        navigate('/dashboard/applications')
    }

    return (
        <Container>
            {/* Overview Metrics */}
            <Grid columns={{ sm: 1, md: 2, lg: 3 }} gap={6}>
                {/* Available Organization */}
                <StatsCard
                    title="Organization"
                    value="Active"
                    description={tenant?.companyName || 'Organization'}
                    icon={Building}
                />

                {/* Available Credits */}
                <StatsCard
                    title="Available Credits"
                    value={creditLoading ? '...' : (creditStatus?.availableCredits || 0)}
                    description="Ready to use"
                    icon={Coins}
                />

                {/* Last Purchase Date */}
                <StatsCard
                    title="Last Purchase"
                    value={creditStatus?.lastPurchase ?
                        new Date(creditStatus.lastPurchase).toLocaleDateString() :
                        'No purchases'
                    }
                    description="Most recent transaction"
                    icon={Calendar}
                />

                {/* Number of Credits */}
                <StatsCard
                    title="Total Credits"
                    value={creditLoading ? '...' : (creditStatus?.totalCredits || 0)}
                    description="Allocated to organization"
                    icon={CreditCard}
                />

                {/* Active Plan */}
                <StatsCard
                    title="Active Plan"
                    value={creditStatus?.plan || 'Basic'}
                    description="Current subscription"
                    icon={Crown}
                />

                {/* Number of Users */}
                <StatsCard
                    title="Total Users"
                    value={isLoading ? '...' : (metrics?.totalUsers || 0)}
                    description="Active team members"
                    icon={Users}
                />
            </Grid>

            {/* Recently Used Applications Section */}
            {recentlyUsedAppData.length > 0 && (
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Recently Used Applications</h2>
                            <p className="text-gray-600 mt-1">Your most frequently accessed applications</p>
                        </div>
                    </div>

                    <ApplicationGrid
                        applications={recentlyUsedAppData}
                        onViewApplication={handleViewApplication}
                    />
                </div>
            )}
        </Container>
    )
}
