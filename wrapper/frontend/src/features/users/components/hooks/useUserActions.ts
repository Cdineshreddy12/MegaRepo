import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { User } from '@/types/user-management';

/**
 * Custom hook for user-related actions and utilities
 * 
 * Features:
 * - User status determination
 * - Invitation URL generation
 * - Clipboard operations
 * - Status color mapping
 */
export function useUserActions() {
  
  /**
   * Get user status based on user properties
   */
  const getUserStatus = useCallback((user: User): string => {
    if (!user.isActive) return 'Pending';
    if (!user.onboardingCompleted) return 'Setup Required';
    return 'Active';
  }, []);
  
  /**
   * Get status color class based on user status
   */
  const getStatusColor = useCallback((user: User): string => {
    const status = getUserStatus(user);
    switch (status) {
      case 'Active': 
        return 'bg-green-100 text-green-800';
      case 'Pending': 
        return 'bg-yellow-100 text-yellow-800';
      case 'Setup Required': 
        return 'bg-orange-100 text-orange-800';
      default: 
        return 'bg-gray-100 text-gray-800';
    }
  }, [getUserStatus]);
  
  /**
   * Generate invitation URL for a user
   */
  const generateInvitationUrl = useCallback((user: User): string | null => {
    if (user.invitationStatus === 'pending' || user.userType === 'invited') {
      let invitationToken = null;
      let tokenSource = 'unknown';
      
      // Priority order for finding invitation token:
      // 1. Check invitationId field (extracted during transformation)
      if (user.invitationId && user.invitationId.length > 20) {
        invitationToken = user.invitationId;
        tokenSource = 'user.invitationId';
      }
      // 2. Check originalData.invitationToken (direct case - this is the actual token from database)
      else if (user.originalData?.invitationToken) {
        invitationToken = user.originalData.invitationToken;
        tokenSource = 'originalData.invitationToken';
      }
      // 3. Check originalData.user.invitationToken (nested case)
      else if (user.originalData?.user?.invitationToken) {
        invitationToken = user.originalData.user.invitationToken;
        tokenSource = 'originalData.user.invitationToken';
      }
      // 4. Check if this is a direct invitation (has invitationId starting with 'inv_')
      else if (user.userId && user.userId.startsWith('inv_')) {
        invitationToken = user.userId.replace('inv_', '');
        tokenSource = 'user.userId (inv_ prefix)';
      }
      // 5. Check if originalData.user has an invitationId field
      else if (user.originalData?.user?.invitationId) {
        invitationToken = user.originalData.user.invitationId;
        tokenSource = 'originalData.user.invitationId';
      }
      
      if (invitationToken) {
        const baseUrl = window.location.origin;
        const invitationUrl = `${baseUrl}/invite/accept?token=${invitationToken}`;
        console.log(`🔗 Generated invitation URL for ${user.email}:`, {
          invitationUrl,
          tokenSource,
          invitationToken
        });
        return invitationUrl;
      } else {
        console.warn(`⚠️ Could not find invitation token for user ${user.email}:`, {
          user,
          tokenSource
        });
        return null;
      }
    }
    return null;
  }, []);
  
  /**
   * Copy invitation URL to clipboard
   */
  const copyInvitationUrl = useCallback(async (user: User): Promise<void> => {
    const invitationUrl = generateInvitationUrl(user);
    if (invitationUrl) {
      try {
        await navigator.clipboard.writeText(invitationUrl);
        toast.success('Invitation URL copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy invitation URL:', error);
        toast.error('Failed to copy invitation URL');
      }
    } else {
      toast.error('No invitation URL available for this user');
    }
  }, [generateInvitationUrl]);
  
  return {
    getUserStatus,
    getStatusColor,
    generateInvitationUrl,
    copyInvitationUrl
  };
}
