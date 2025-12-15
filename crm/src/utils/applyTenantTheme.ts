// utils/applyTenantTheme.ts
import { hexToHSL } from './color';

interface BrandingConfig {
    primaryColor?: string;
    secondaryColor?: string;
}

export interface TenantConfig {
    branding?: BrandingConfig;
}

export const applyTenantTheme = (config: TenantConfig): void => {
    const primaryHex = config?.branding?.primaryColor || '#3b82f6'; // fallback to blue-500
    const secondaryHex = config?.branding?.secondaryColor || '#9333ea'; // fallback to purple-500

    const primaryHSL = hexToHSL(primaryHex);
    const secondaryHSL = hexToHSL(secondaryHex);
    const primaryForegroundHSL = '0 0% 100%'; // White — you could make this dynamic too
    

    const root = document.documentElement;
    root.style.setProperty('--primary', primaryHSL);
    root.style.setProperty('--secondary', secondaryHSL);
    root.style.setProperty('--primary-foreground', primaryForegroundHSL);
};
