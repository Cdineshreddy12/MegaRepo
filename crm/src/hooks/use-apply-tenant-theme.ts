// hooks/useApplyTenantTheme.ts
import { useEffect } from 'react';
import { applyTenantTheme, TenantConfig } from '@/utils/applyTenantTheme';

export const useApplyTenantTheme = (config: TenantConfig) => {
  useEffect(() => {
    applyTenantTheme(config);
  }, [config]);
};
