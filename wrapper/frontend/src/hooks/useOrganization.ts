import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/api';

export function useOrganization() {
  const { orgCode: orgCodeFromUrl } = useParams();
  const { getOrganization } = useKindeAuth();
  const authUser = useAuthStore(state => state.user);
  
  const [kindeOrgCode, setKindeOrgCode] = useState<string | undefined>(undefined);
  const [resolvedOrgCode, setResolvedOrgCode] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  // Fallback: extract org from URL path even if route isn't /org/:orgCode
  const orgFromPath = typeof window !== 'undefined'
    ? (window.location.pathname.match(/^\/org\/([^/]+)/)?.[1] || undefined)
    : undefined;
  
  const effectiveOrgCode = orgFromPath || orgCodeFromUrl || kindeOrgCode || authUser?.tenantId || undefined;

  useEffect(() => {
    let mounted = true;
    
    async function resolveOrg() {
      try {
        setLoading(true);
        
        // Get Kinde organization
        const kindeOrg = await getOrganization();
        if (mounted && kindeOrg) {
          // Handle both object and string return types
          if (typeof kindeOrg === 'object' && kindeOrg !== null) {
            setKindeOrgCode((kindeOrg as any).orgCode || (kindeOrg as any).id);
          } else if (typeof kindeOrg === 'string') {
            setKindeOrgCode(kindeOrg);
          }
        }
        
        // If we already have an org code, use it
        if (effectiveOrgCode && mounted) {
          setResolvedOrgCode(effectiveOrgCode);
          return;
        }
        
        // Ask backend to provide org from authenticated session
        const resp = await api.get('/subscriptions/debug-auth');
        const serverOrg: string | undefined = resp?.data?.kindeOrgId || resp?.data?.organization?.id;
        if (mounted) {
          setResolvedOrgCode(serverOrg);
        }
      } catch (e) {
        console.warn('⚠️ Failed to resolve orgCode from server:', e);
        if (mounted) {
          setResolvedOrgCode(effectiveOrgCode);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    
    resolveOrg();
    return () => { mounted = false };
  }, [orgFromPath, orgCodeFromUrl, kindeOrgCode, authUser?.tenantId, getOrganization, effectiveOrgCode]);

  console.log('🎯 Organization hook rendered!');
  console.log('🏢 orgCode from URL params:', orgCodeFromUrl);
  console.log('🛣️ orgCode from path:', orgFromPath);
  console.log('🪪 orgCode from Kinde user:', kindeOrgCode);
  console.log('🗂️ orgCode from auth store (tenantId):', authUser?.tenantId);
  console.log('✅ effectiveOrgCode:', effectiveOrgCode);
  console.log('🧭 resolvedOrgCode (final):', resolvedOrgCode);

  return {
    orgCode: resolvedOrgCode,
    loading,
    effectiveOrgCode
  };
}
