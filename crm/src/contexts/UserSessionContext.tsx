import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User, Organization, Tenant } from '../services/api/authService';
import { useOrgActions } from '../store/org-store';
import { useToast } from '../hooks/useToast';

interface UserSessionState {
  user: User | null;
  tenant: Tenant | null;
  permissions: string[];
  entities: Organization[];
  totalCredits: number;
  isTenantAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  currentEntityId: string | null;
}

interface UserSessionContextType extends UserSessionState {
  setUserSession: (data: {
    user: User;
    tenant?: Tenant;
    permissions?: string[];
    entities?: Organization[];
    totalCredits?: number;
    isTenantAdmin?: boolean;
    currentEntityId?: string;
  }) => void;
  clearUserSession: () => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  updateCredits: (credits: number) => void;
  setCurrentEntityId: (entityId: string) => void;
}

const UserSessionContext = createContext<UserSessionContextType | undefined>(undefined);

export const useUserSession = () => {
  const context = useContext(UserSessionContext);
  if (context === undefined) {
    throw new Error('useUserSession must be used within a UserSessionProvider');
  }
  return context;
};

interface UserSessionProviderProps {
  children: React.ReactNode;
}

export const UserSessionProvider: React.FC<UserSessionProviderProps> = ({ children }) => {
  const { setOrganizations, setSelectedOrg } = useOrgActions();
  const { toast } = useToast();

  const [sessionState, setSessionState] = useState<UserSessionState>({
    user: null,
    tenant: null,
    permissions: [],
    entities: [],
    totalCredits: 0,
    isTenantAdmin: false,
    isLoading: true,
    error: null,
    currentEntityId: null
  });

  // Initialize session from localStorage on app load
  useEffect(() => {
    const initializeSession = () => {
      try {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('userSession');

        if (token && userData) {
          const sessionData = JSON.parse(userData);
          const entities = sessionData.entities || [];

          setSessionState({
            user: sessionData.user,
            tenant: sessionData.tenant,
            permissions: sessionData.permissions || [],
            entities: entities,
            totalCredits: sessionData.totalCredits || 0,
            isTenantAdmin: sessionData.isTenantAdmin || false,
            currentEntityId: sessionData.currentEntityId || null,
            isLoading: false,
            error: null
          });

          // Initialize org-store with entities from session
          if (entities.length > 0) {
            console.log('🏢 Initializing org-store from session:', entities.length);
            setOrganizations(entities);
          }
        } else {
          setSessionState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Error initializing user session:', error);
        setSessionState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load user session'
        }));
      }
    };

    initializeSession();
  }, []);

  const setUserSession = useCallback((data: {
    user: User;
    tenant?: Tenant;
    permissions?: string[];
    entities?: Organization[];
    totalCredits?: number;
    isTenantAdmin?: boolean;
    currentEntityId?: string | null;
  }) => {
    console.log('🔄 UserSessionContext: Setting user session with entities:', {
      entities: data.entities,
      entitiesLength: data.entities?.length,
      hasEntities: !!data.entities && data.entities.length > 0
    });

    // If no currentEntityId is provided but we have entities, set the appropriate one
    let entityId = data.currentEntityId;
    if (!entityId && data.entities && data.entities.length > 0) {
      // Try to use primary organization if available
      if (data.user?.primaryOrganizationId) {
        const primaryOrg = data.entities.find(org => org.orgCode === data.user.primaryOrganizationId);
        if (primaryOrg) {
          entityId = primaryOrg.id; // Use ObjectId instead of orgCode
          console.log('🔍 Using primary organization entityId:', entityId);
        }
      }

      // Check if there's already a selected organization in localStorage that matches current entities
      if (!entityId) {
        try {
          const orgStoreData = localStorage.getItem('org-store');
          if (orgStoreData) {
            const orgStore = JSON.parse(orgStoreData);
            const cachedSelectedOrg = orgStore.state?.selectedOrg;
            if (cachedSelectedOrg) {
              const selectedOrgEntity = data.entities.find(org => org.orgCode === cachedSelectedOrg);
              if (selectedOrgEntity) {
                entityId = selectedOrgEntity.id; // Use ObjectId instead of orgCode
                console.log('🔍 Using cached selected organization entityId:', entityId);
              } else {
                console.log('⚠️ Cached selectedOrg not found in current entities, ignoring cache');
              }
            }
          }
        } catch (error) {
          console.error('Error reading org-store from localStorage:', error);
        }
      }

      // Smart selection based on organization assignments and priority
      if (!entityId && data.user?.organizationAssignments) {
        const assignments = data.user.organizationAssignments;
        console.log('🔍 Selecting initial organization from assignments:', assignments.length);

        // Find primary assignments with highest priority (lowest priority number)
        const primaryAssignments = assignments.filter(assignment =>
          assignment.assignmentType === 'primary' && assignment.isActive
        );

        if (primaryAssignments.length > 0) {
          // Sort by priority (ascending) then by most recent assignment (descending assignedAt)
          primaryAssignments.sort((a, b) => {
            if (a.priority !== b.priority) {
              return a.priority - b.priority; // Lower priority number = higher priority
            }
            return new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime(); // Most recent first
          });

          const selectedAssignment = primaryAssignments[0];
          const selectedEntity = data.entities.find(org => org.orgCode === selectedAssignment.entityId);

          if (selectedEntity) {
            entityId = selectedEntity.id;
            console.log('🔍 Using prioritized primary assignment entityId:', entityId, 'for org:', selectedAssignment.entityName);
          }
        }

        // If no primary assignments found, try secondary assignments
        if (!entityId) {
          const secondaryAssignments = assignments.filter(assignment =>
            assignment.assignmentType === 'secondary' && assignment.isActive
          );

          if (secondaryAssignments.length > 0) {
            secondaryAssignments.sort((a, b) => {
              if (a.priority !== b.priority) {
                return a.priority - b.priority;
              }
              return new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime();
            });

            const selectedAssignment = secondaryAssignments[0];
            const selectedEntity = data.entities.find(org => org.orgCode === selectedAssignment.entityId);

            if (selectedEntity) {
              entityId = selectedEntity.id;
              console.log('🔍 Using prioritized secondary assignment entityId:', entityId, 'for org:', selectedAssignment.entityName);
            }
          }
        }
      }

      // Final fallback to first entity if no other organization found
      if (!entityId) {
        entityId = data.entities[0].id || null; // Use ObjectId instead of orgCode
        console.log('🔍 Using first entity as fallback entityId:', entityId, 'from entities:', data.entities.length);
      }
    }

    console.log('🔍 Final entityId being set:', entityId);

    const newSession = {
      user: data.user,
      tenant: data.tenant || null,
      permissions: data.permissions || [],
      entities: data.entities || [],
      totalCredits: data.totalCredits || 0,
      isTenantAdmin: data.isTenantAdmin || false,
      currentEntityId: entityId || null,
      isLoading: false,
      error: null
    };

    setSessionState(newSession);

    // Update org-store with organizations and selected organization
    if (data.entities && data.entities.length > 0) {
      console.log('🏢 Updating org-store with organizations:', data.entities.length);

      // Clear old organizations first to avoid stale data
      setOrganizations([]);
      setSelectedOrg(null);

      // Set new organizations
      setOrganizations(data.entities);

      // Set selected organization based on the entityId (ObjectId)
      if (entityId) {
        const selectedEntity = data.entities.find(org => org.id === entityId);
        if (selectedEntity) {
          console.log('🎯 Setting selected org in org-store:', selectedEntity.orgCode);
          setSelectedOrg(selectedEntity.orgCode);
        }
      }
    }

    // Persist to localStorage
    try {
      localStorage.setItem('userSession', JSON.stringify(newSession));
    } catch (error) {
      console.error('Error saving user session to localStorage:', error);
    }
  }, []);

  const clearUserSession = useCallback(() => {
    setSessionState({
      user: null,
      tenant: null,
      permissions: [],
      entities: [],
      totalCredits: 0,
      isTenantAdmin: false,
      currentEntityId: null,
      isLoading: false,
      error: null
    });

    // Clear org-store
    setOrganizations([]);
    setSelectedOrg(null);

    // Clear from localStorage
    localStorage.removeItem('userSession');
  }, [setOrganizations, setSelectedOrg]);

  const hasPermission = useCallback((permission: string): boolean => {
    return sessionState.permissions.includes(permission);
  }, [sessionState.permissions]);

  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    return permissions.some(permission => sessionState.permissions.includes(permission));
  }, [sessionState.permissions]);

  const updateCredits = useCallback((credits: number) => {
    setSessionState(prev => ({
      ...prev,
      totalCredits: credits
    }));

    // Update localStorage
    try {
      const sessionData = localStorage.getItem('userSession');
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        parsed.totalCredits = credits;
        localStorage.setItem('userSession', JSON.stringify(parsed));
      }
    } catch (error) {
      console.error('Error updating credits in localStorage:', error);
    }
  }, []);

  const setCurrentEntityId = useCallback((entityId: string) => {
    setSessionState(prev => ({
      ...prev,
      currentEntityId: entityId
    }));

    // Update localStorage
    try {
      const sessionData = localStorage.getItem('userSession');
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        parsed.currentEntityId = entityId;
        localStorage.setItem('userSession', JSON.stringify(parsed));
      }
    } catch (error) {
      console.error('Error updating currentEntityId in localStorage:', error);
    }
  }, []);

  const contextValue = useMemo<UserSessionContextType>(() => ({
    ...sessionState,
    setUserSession,
    clearUserSession,
    hasPermission,
    hasAnyPermission,
    updateCredits,
    setCurrentEntityId
  }), [
    sessionState.user,
    sessionState.tenant,
    sessionState.permissions,
    sessionState.entities,
    sessionState.totalCredits,
    sessionState.isTenantAdmin,
    sessionState.isLoading,
    sessionState.error,
    sessionState.currentEntityId,
    setUserSession,
    clearUserSession,
    hasPermission,
    hasAnyPermission,
    updateCredits,
    setCurrentEntityId
  ]);

  return (
    <UserSessionContext.Provider value={contextValue}>
      {children}
    </UserSessionContext.Provider>
  );
};
