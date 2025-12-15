import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Organization } from '@/services/api/authService';

interface OrgStoreState {
  organizations: Organization[];
  selectedOrg: string | null;
  setOrganizations: (organizations: Organization[]) => void;
  setSelectedOrg: (orgCode: string | null) => void;
  getSelectedOrg: () => string | null;
  clearSelectedOrg: () => void;
}

export const useOrgStore = create<OrgStoreState>()(
  persist(
    (set, get) => ({
      organizations: [],
      selectedOrg: null,

      setOrganizations: (organizations) => set({ organizations }),

      setSelectedOrg: (orgCode) => {
        // Validate that the orgCode exists in accessible organizations
        const { organizations } = get();
        if (orgCode && !organizations.find(org => org.orgCode === orgCode)) {
          console.warn(`Cannot select org ${orgCode} - not in accessible organizations`);
          return;
        }
        set({ selectedOrg: orgCode });
        console.log('🔄 Selected organization changed to:', orgCode);
      },

      getSelectedOrg: () => get().selectedOrg,

      clearSelectedOrg: () => set({ selectedOrg: null }),
    }),
    {
      name: 'org-store', // Key for localStorage
      partialize: (state) => ({
        selectedOrg: state.selectedOrg,
        organizations: state.organizations,
      }),
    }
  )
);

// Hook to get current selected org for API calls
export const useSelectedOrg = () => {
  return useOrgStore((state) => state.selectedOrg);
};

// Hook to get all accessible organizations
export const useOrganizations = () => {
  return useOrgStore((state) => state.organizations);
};

// Hook to get org store actions
export const useOrgActions = () => {
  const { setOrganizations, setSelectedOrg, clearSelectedOrg } = useOrgStore();
  return { setOrganizations, setSelectedOrg, clearSelectedOrg };
};
