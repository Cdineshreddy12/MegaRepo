import React from 'react';
import { ThemeType } from '@/types/application';

interface DecorationProps {
    type: ThemeType;
    className?: string;
}

export const ApplicationCardDecoration: React.FC<DecorationProps> = ({ type, className = "" }) => {
    const renderDecoration = () => {
        switch (type) {
            case 'yellow':
                return (
                    <svg width="320" height="280" viewBox="0 0 280 240" fill="none" className={className}>
                        <defs>
                            <linearGradient id="gradYellow" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#EAB308" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#EAB308" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <circle cx="210" cy="190" r="110" fill="url(#gradYellow)" />
                        <path d="M40 200L100 140M60 220L120 160M80 240L140 180" stroke="#EAB308" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                );
            case 'red':
                return (
                    <svg width="320" height="280" viewBox="0 0 280 240" fill="none" className={className}>
                        <defs>
                            <radialGradient id="gradRed" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#F43F5E" stopOpacity="0" />
                            </radialGradient>
                        </defs>
                        <circle cx="220" cy="170" r="120" fill="url(#gradRed)" />
                        <path d="M20 200 C60 140 180 140 240 200" stroke="#F43F5E" strokeOpacity="0.4" strokeWidth="2.5" />
                    </svg>
                );
            case 'blue':
                return (
                    <svg width="320" height="280" viewBox="0 0 280 240" fill="none" className={className}>
                        <defs>
                            <linearGradient id="gradBlue" x1="100%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <rect x="140" y="40" width="110" height="170" rx="55" fill="url(#gradBlue)" />
                        <circle cx="100" cy="140" r="60" stroke="#3B82F6" strokeOpacity="0.4" strokeWidth="2" />
                    </svg>
                );
            case 'orange':
                return (
                    <svg width="320" height="280" viewBox="0 0 280 240" fill="none" className={className}>
                        <defs>
                            <linearGradient id="gradOrange" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#F97316" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <circle cx="170" cy="130" r="110" fill="url(#gradOrange)" />
                        <path d="M20 180 Q140 20 260 180" stroke="#F97316" strokeOpacity="0.4" strokeWidth="1.5" />
                    </svg>
                );
            case 'emerald':
                return (
                    <svg width="320" height="280" viewBox="0 0 280 240" fill="none" className={className}>
                        <defs>
                            <linearGradient id="gradEmerald" x1="0%" y1="100%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <rect x="110" y="90" width="150" height="150" rx="40" stroke="#10B981" strokeOpacity="0.3" strokeWidth="1.5" transform="rotate(15 170 150)" />
                        <circle cx="170" cy="150" r="100" fill="url(#gradEmerald)" />
                    </svg>
                );
            case 'purple':
                return (
                    <svg width="320" height="280" viewBox="0 0 280 240" fill="none" className={className}>
                        <defs>
                            <linearGradient id="gradPurple" x1="50%" y1="0%" x2="50%" y2="100%">
                                <stop offset="0%" stopColor="#A855F7" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <path d="M50 50 L230 50 L140 200 Z" fill="url(#gradPurple)" stroke="#A855F7" strokeOpacity="0.4" strokeWidth="2" />
                    </svg>
                );
            case 'indigo':
                return (
                    <svg width="320" height="280" viewBox="0 0 280 240" fill="none" className={className}>
                        <defs>
                            <linearGradient id="gradIndigo" x1="100%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <circle cx="200" cy="120" r="110" fill="url(#gradIndigo)" stroke="#6366F1" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="10 5" />
                    </svg>
                );
            case 'cyan':
                return (
                    <svg width="320" height="280" viewBox="0 0 280 240" fill="none" className={className}>
                        <defs>
                            <linearGradient id="gradCyan" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <rect x="80" y="80" width="120" height="120" rx="20" stroke="#06B6D4" strokeOpacity="0.3" strokeWidth="2" transform="rotate(45 140 140)" />
                        <circle cx="140" cy="140" r="110" fill="url(#gradCyan)" />
                    </svg>
                );
            case 'rose':
                return (
                    <svg width="320" height="280" viewBox="0 0 280 240" fill="none" className={className}>
                        <defs>
                            <radialGradient id="gradRose" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#F43F5E" stopOpacity="0" />
                            </radialGradient>
                        </defs>
                        <circle cx="140" cy="120" r="110" fill="url(#gradRose)" />
                        <path d="M140 80 L140 160 M100 120 L180 120" stroke="#F43F5E" strokeOpacity="0.4" strokeWidth="2" />
                    </svg>
                );
            case 'violet':
                return (
                    <svg width="320" height="280" viewBox="0 0 280 240" fill="none" className={className}>
                        <defs>
                            <linearGradient id="gradViolet" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <rect x="40" y="40" width="200" height="160" rx="30" fill="url(#gradViolet)" stroke="#8B5CF6" strokeOpacity="0.2" strokeWidth="1.5" />
                    </svg>
                );
            case 'amber':
                return (
                    <svg width="320" height="280" viewBox="0 0 280 240" fill="none" className={className}>
                        <defs>
                            <linearGradient id="gradAmber" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <polygon points="140,40 220,100 220,180 140,240 60,180 60,100" fill="url(#gradAmber)" stroke="#F59E0B" strokeOpacity="0.4" strokeWidth="2" />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <div className={`absolute bottom-0 right-0 overflow-hidden pointer-events-none select-none transition-all duration-700 ${className}`}>
            {renderDecoration()}
        </div>
    );
};
