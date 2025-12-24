import React, { useEffect } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { OnboardingFormOptimized } from '../components/OnboardingFormOptimized';

/**
 * OPTIMIZED Main Onboarding Page - Uses performance-optimized components
 */
const OnboardingPageOptimized: React.FC = () => {
    const { isLoading: isKindeLoading } = useKindeAuth();
    const { theme, setTheme } = useTheme();

    // Force light theme for onboarding page - use ref to prevent infinite loops
    const originalThemeRef = React.useRef<string | null>(null);

    useEffect(() => {
        // Store original theme only once
        if (originalThemeRef.current === null) {
            originalThemeRef.current = theme;
        }

        // Only set theme if it's not already light
        if (theme !== 'light') {
            console.log('🔅 Forcing light theme for onboarding page');
            setTheme('light');
        }

        // Restore original theme when component unmounts
        return () => {
            const originalTheme = originalThemeRef.current;
            if (originalTheme && originalTheme !== 'light') {
                console.log('🔄 Restoring original theme:', originalTheme);
                setTheme(originalTheme);
            }
        };
    }, []); // Only run on mount/unmount - remove theme dependency to prevent loops

    // Show loading while determining authentication status
    if (isKindeLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading your information...</p>
                </div>
            </div>
        );
    }

    // OnboardingFormOptimized handles flow selection internally with optimized performance
    return (
        <div className="h-screen w-full overflow-hidden">
            <OnboardingFormOptimized />
        </div>
    );
};

export default OnboardingPageOptimized;