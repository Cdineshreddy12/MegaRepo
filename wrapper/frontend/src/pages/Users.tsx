import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, 
  Search, 
  Mail, 
  UserX, 
  Shield,
  Copy,
  ExternalLink,
  Building2,
  MapPin,
  X
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { tenantAPI, invitationAPI, permissionsAPI } from '@/lib/api'
import api from '@/lib/api'
import { formatDate, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { UnifiedUser } from '@/lib/api'

interface InviteUserFormData {
  email: string
  role: string
  organizationId?: string
  assignmentType?: 'primary' | 'secondary' | 'temporary' | 'guest'
  priority?: number
}

interface OrganizationAssignment {
  assignmentId: string
  userId: string
  userName: string
  userEmail: string
  organizationId: string // Keep for backward compatibility
  entityId?: string
  entityType?: 'organization' | 'location' | 'department' | 'team'
  organizationName: string // Keep for backward compatibility
  entityName?: string
  organizationCode: string // Keep for backward compatibility
  entityCode?: string
  assignmentType: 'primary' | 'secondary' | 'temporary' | 'guest'
  isActive: boolean
  assignedAt: string
  priority: number
}

export function Users() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState<InviteUserFormData>({
    email: '',
    role: '',
    organizationId: undefined,
    assignmentType: 'primary',
    priority: 1
  })
  const [showInvitationUrls, setShowInvitationUrls] = useState(false)
  const [organizationAssignments, setOrganizationAssignments] = useState<OrganizationAssignment[]>([])
  const [showOrgAssignmentModal, setShowOrgAssignmentModal] = useState(false)
  const [selectedUserForOrg, setSelectedUserForOrg] = useState<UnifiedUser | null>(null)
  const [orgAssignmentForm, setOrgAssignmentForm] = useState({
    organizationId: '',
    assignmentType: 'primary' as const,
    priority: 1
  })

  const queryClient = useQueryClient()
  const [users, setUsers] = useState<UnifiedUser[]>([])

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['tenant-users'],
    queryFn: () => tenantAPI.getUsers().then(res => res.data.data),
  })

  // Fetch roles for the invite modal
  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => permissionsAPI.getRoles(),
  })

  // Fetch organizations for assignment
  const { data: organizationsData, isLoading: orgsLoading, error: orgsError } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => {
      console.log('🔍 Fetching organizations...');
      return api.get('/api/organizations/hierarchy/current').then(res => {
        console.log('🔍 Organizations response:', res.data);
        const hierarchy = res.data.hierarchy || [];
        const expectedCount = res.data.totalOrganizations || 0;
        console.log(`📊 Expected ${expectedCount} organizations, received ${hierarchy.length} root nodes`);
        
        // Track processed IDs to avoid duplicates
        const processedIds = new Set<string>();
        const flattened: any[] = [];
        
        // Flatten the nested hierarchy recursively to include all organizations
        const processOrg = (org: any, depth: number = 0): void => {
          // Skip invalid or empty organizations
          if (!org || typeof org !== 'object') {
            console.warn(`⚠️ Skipping invalid org at depth ${depth}:`, org);
            return;
          }
          
          // Check for empty object {}
          if (Object.keys(org).length === 0) {
            console.warn(`⚠️ Skipping empty object {} at depth ${depth}`);
            return;
          }
          
          // Must have organizationId
          if (!org.organizationId || typeof org.organizationId !== 'string') {
            console.warn(`⚠️ Skipping org without valid organizationId at depth ${depth}:`, org);
            return;
          }
          
          // Skip if already processed (avoid duplicates)
          if (processedIds.has(org.organizationId)) {
            console.warn(`⚠️ Skipping duplicate organization: ${org.organizationName} (${org.organizationId})`);
            return;
          }
          
          // Transform API format to UI format
          const transformedOrg = {
            entityId: org.organizationId,
            entityName: org.organizationName || 'Unnamed Organization',
            entityCode: org.organizationCode || org.organizationName?.toLowerCase().replace(/\s+/g, '-') || `org-${org.organizationId.slice(0, 8)}`,
            organizationType: org.organizationType,
            organizationLevel: org.organizationLevel,
            parentOrganizationId: org.parentOrganizationId || null,
            isActive: org.isActive !== undefined ? org.isActive : true,
            description: org.description || ''
          };
          
          flattened.push(transformedOrg);
          processedIds.add(org.organizationId);
          
          // Recursively process children (aggressively filter out empty objects)
          if (org.children && Array.isArray(org.children)) {
            // Filter out empty objects, null, undefined, and invalid entries
            const validChildren = org.children.filter((child: any) => {
              if (!child || typeof child !== 'object') {
                return false;
              }
              // Filter out empty objects {}
              if (Object.keys(child).length === 0) {
                return false;
              }
              // Must have organizationId
              if (!child.organizationId || typeof child.organizationId !== 'string') {
                return false;
              }
              return true;
            });
            
            if (validChildren.length > 0) {
              validChildren.forEach((child: any) => processOrg(child, depth + 1));
            }
          }
        };
        
        // Process all root organizations in the hierarchy
        hierarchy.forEach((org: any, index: number) => {
          console.log(`🔄 Processing root org ${index + 1}/${hierarchy.length}:`, org.organizationName || org.organizationId);
          processOrg(org, 0);
        });
        
        console.log(`✅ Flattened ${flattened.length} organizations from hierarchy (expected: ${expectedCount})`);
        
        if (flattened.length !== expectedCount) {
          console.warn(`⚠️ Mismatch: Expected ${expectedCount} organizations but flattened ${flattened.length}`);
          console.warn(`📋 Flattened organization IDs:`, flattened.map(o => `${o.entityName} (${o.entityId})`));
        }
        
        return flattened;
      }).catch((error) => {
        console.error('❌ Error fetching organizations:', error);
        return []; // Return empty array on error
      });
    }
  })

  // Fetch organization assignments
  const { data: assignmentsData, isLoading: assignmentsLoading, refetch: refetchAssignments, error: assignmentsError } = useQuery({
    queryKey: ['organization-assignments'],
    queryFn: async () => {
      try {
        const res = await tenantAPI.getOrganizationAssignments();
      console.log('🔍 Debug - getOrganizationAssignments response:', res);
        return res.data.data || [];
      } catch (error) {
      console.error('❌ Error fetching organization assignments:', error);
        return [];
      }
    }
  })

  console.log('🔍 Debug - rolesData:', rolesData);
  console.log('🔍 Debug - rolesData.data:', rolesData?.data);
  console.log('🔍 Debug - rolesData.data.data:', rolesData?.data?.data);
  console.log('🔍 Debug - rolesData.data.data type:', typeof rolesData?.data?.data);
  console.log('🔍 Debug - isArray:', Array.isArray(rolesData?.data?.data));

  // Debug organization assignments
  console.log('🔍 Debug - assignmentsData:', assignmentsData);
  console.log('🔍 Debug - assignmentsLoading:', assignmentsLoading);
  console.log('🔍 Debug - assignmentsError:', assignmentsError);
  console.log('🔍 Debug - assignmentsData type:', typeof assignmentsData);
  console.log('🔍 Debug - assignmentsData isArray:', Array.isArray(assignmentsData));

  // Update users when data changes
  React.useEffect(() => {
    if (usersData) {
      let userList;
      if (Array.isArray(usersData)) {
        userList = usersData;
      } else {
        setUsers([]);
        return;
      }
      
      // Convert to UnifiedUser format with better invitation handling
      const unifiedUsers: UnifiedUser[] = userList.map((user: any) => {
        // Determine if this is an invited user
        const isInvited = user.invitationStatus === 'pending' || 
                         user.userType === 'invited' || 
                         user.id?.startsWith('inv_') ||
                         user.originalData?.user?.invitationToken ||
                         user.originalData?.invitationToken;
        
        // Extract invitation ID/token - prioritize the actual invitation token from database
        let invitationId = null;
        // 1. First priority: direct invitation token from database
        if (user.originalData?.invitationToken) {
          invitationId = user.originalData.invitationToken;
        }
        // 2. Second priority: nested invitation token
        else if (user.originalData?.user?.invitationToken) {
          invitationId = user.originalData.user.invitationToken;
        }
        // 3. Third priority: user.invitationId if it's actually a token
        else if (user.invitationId && user.invitationId.length > 20) {
          invitationId = user.invitationId;
        }
        // 4. Fourth priority: extract from user ID if it starts with 'inv_'
        else if (user.id?.startsWith('inv_')) {
          invitationId = user.id.replace('inv_', '');
        }
        // 5. Last priority: nested invitation ID
        else if (user.originalData?.user?.invitationId) {
          invitationId = user.originalData.user.invitationId;
        }
        
        const unifiedUser = {
          id: user.id || user.userId || `inv_${user.invitationId}`,
          email: user.email,
          firstName: user.firstName || user.email.split('@')[0],
          lastName: user.lastName || '',
          role: user.role || 'No role assigned',
          isActive: user.isActive || false,
          invitationStatus: user.invitationStatus || (isInvited ? 'pending' : 'active'),
          invitedAt: user.invitedAt || user.createdAt || new Date().toISOString(),
          expiresAt: user.expiresAt || null,
          lastActiveAt: user.lastActiveAt || null,
          invitationId: invitationId,
          status: user.status || (isInvited ? 'pending' : 'active'),
          userType: user.userType || (isInvited ? 'invited' : 'active'),
          originalData: user // Store original data for potential extraction
        };
        return unifiedUser;
      });
      
      setUsers(unifiedUsers);
    }
  }, [usersData])

  // Update invite form role when roles are loaded
  React.useEffect(() => {
    if (rolesData?.data?.data && Array.isArray(rolesData.data.data) && rolesData.data.data.length > 0) {
      const firstRole = rolesData.data.data[0];
      if (firstRole && firstRole.roleName && firstRole.roleName !== 'loading') {
        setInviteForm(prev => ({ ...prev, role: firstRole.roleName }));
      }
    } else if (rolesData && !rolesLoading) {
      // No roles available, set empty
      setInviteForm(prev => ({ ...prev, role: '' }));
    }
  }, [rolesData, rolesLoading])

  const filteredUsers = users.filter((user: UnifiedUser) => {
    // More flexible search - handle undefined/null values gracefully
    const searchLower = searchTerm.toLowerCase().trim();
    const firstName = (user.firstName || '').toLowerCase();
    const lastName = (user.lastName || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    
    const matchesSearch = searchTerm === '' || 
                         firstName.includes(searchLower) ||
                         lastName.includes(searchLower) ||
                         email.includes(searchLower);
    
    // More flexible role matching
    let matchesRole = true;
    if (selectedRole !== 'all') {
      // Check if the selected role matches the user's role exactly
      matchesRole = user.role === selectedRole;
      
      // If no exact match, check for role hierarchy (Super Admin includes Admin, etc.)
      if (!matchesRole) {
        if (selectedRole === 'Super Administrator') {
          matchesRole = user.role === 'Super Administrator';
        } else if (selectedRole === 'Admin') {
          matchesRole = user.role === 'Admin' || user.role === 'Super Administrator';
        } else if (selectedRole === 'Member') {
          matchesRole = user.role === 'Member' || user.role === 'contacts manager';
        } else if (selectedRole === 'No role assigned') {
          matchesRole = user.role === 'No role assigned';
        }
      }
    }
    
    return matchesSearch && matchesRole
  })

  // Use filtered users, but fallback to all users if filtering results in empty list
  const displayUsers = filteredUsers.length > 0 ? filteredUsers : users;
  const isFiltering = searchTerm !== '' || selectedRole !== 'all';

  const inviteUserMutation = useMutation({
    mutationFn: (data: InviteUserFormData) => tenantAPI.inviteUser({
      email: data.email,
      roleId: data.role,
      message: data.organizationId ? `Assigned to organization: ${data.organizationId}` : undefined
    }),
    onSuccess: () => {
      toast.success('User invitation sent successfully!')
      setShowInviteModal(false)
      setInviteForm({
        email: '',
        role: '',
        organizationId: undefined,
        assignmentType: 'primary',
        priority: 1
      })
      queryClient.invalidateQueries({ queryKey: ['tenant-users'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to invite user')
    }
  })

  const removeUserMutation = useMutation({
    mutationFn: (userId: string) => tenantAPI.removeUser(userId),
    onSuccess: () => {
      toast.success('User removed successfully!')
      queryClient.invalidateQueries({ queryKey: ['tenant-users'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove user')
    }
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      tenantAPI.updateUserRole(userId, role),
    onSuccess: () => {
      toast.success('User role updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['tenant-users'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update user role')
    }
  })

  // Organization assignment mutations
  const assignOrgMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: any }) =>
      invitationAPI.assignOrganizationToUser(userId, {
        entityId: data.organizationId,
        membershipType: data.assignmentType || 'direct',
        isPrimary: data.assignmentType === 'primary'
      }),
    onSuccess: () => {
      toast.success('User assigned to organization successfully!')
      refetchAssignments()
      setShowOrgAssignmentModal(false)
      setSelectedUserForOrg(null)
      setOrgAssignmentForm({ organizationId: '', assignmentType: 'primary', priority: 1 })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to assign user to organization')
    }
  })

  const removeOrgMutation = useMutation({
    mutationFn: ({ userId, membershipId }: { userId: string; membershipId: string }) =>
      invitationAPI.removeOrganizationFromUser(userId, membershipId),
    onSuccess: () => {
      toast.success('User removed from organization successfully!')
      refetchAssignments()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove user from organization')
    }
  })

  const handleInviteUser = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate that a role is selected
    if (!inviteForm.role || inviteForm.role.trim() === '') {
      toast.error('Please select a role for the user');
      return;
    }
    
    // Validate email
    if (!inviteForm.email || inviteForm.email.trim() === '') {
      toast.error('Please enter an email address');
      return;
    }
    
    inviteUserMutation.mutate(inviteForm)
  }

  const handleRemoveUser = (userId: string) => {
    // Check if this is an invited user (starts with 'inv_')
    if (userId.startsWith('inv_')) {
      if (confirm('Are you sure you want to cancel this invitation?')) {
        // For invited users, cancel the invitation
        removeUserMutation.mutate(userId);
      }
    } else {
      // For active users, proceed with removal
      if (confirm('Are you sure you want to remove this user?')) {
        removeUserMutation.mutate(userId);
      }
    }
  }

  const handleRoleChange = (userId: string, newRole: string) => {
    // Check if this is an invited user
    if (userId.startsWith('inv_')) {
      toast('Role changes for invited users will take effect when they accept the invitation');
      return;
    }

    updateRoleMutation.mutate({ userId, role: newRole });
  }

  // Organization assignment handlers
  const handleAssignOrg = (user: UnifiedUser) => {
    setSelectedUserForOrg(user);
    setOrgAssignmentForm({ organizationId: '', assignmentType: 'primary', priority: 1 });
    setShowOrgAssignmentModal(true);
  }

  const handleSubmitOrgAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForOrg || !orgAssignmentForm.organizationId) {
      toast.error('Please select an organization');
      return;
    }

    assignOrgMutation.mutate({
      userId: selectedUserForOrg.id,
      data: orgAssignmentForm
    });
  }

  const handleRemoveOrgAssignment = (userId: string, assignment: OrganizationAssignment) => {
    if (confirm(`Remove ${assignment.userName} from ${assignment.organizationName || assignment.entityName}?`)) {
      removeOrgMutation.mutate({
        userId,
        membershipId: assignment.assignmentId
      });
    }
  }

  // Get organization assignment for a user
  const getUserOrgAssignment = (userId: string) => {
    console.log(`🔍 Debug - getUserOrgAssignment(${userId}) - assignmentsData:`, assignmentsData);
    if (!Array.isArray(assignmentsData)) {
      return null;
    }
    const assignment = assignmentsData.find((assignment: OrganizationAssignment) => {
      const match = assignment.userId === userId;
      if (match) {
        console.log(`🔍 Debug - Found assignment for ${userId}:`, assignment);
      }
      return match;
    });
    console.log(`🔍 Debug - getUserOrgAssignment(${userId}) result:`, assignment);
    return assignment;
  }

  // Copy invitation URL to clipboard
  const copyInvitationUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Invitation URL copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy URL');
    }
  }

  // Manually fix invitation URL by trying different token extraction methods
  const fixInvitationUrl = (user: UnifiedUser) => {
    console.log('🔧 Attempting to fix invitation URL for:', user.email);
    
    // Try all possible token extraction methods
    const possibleTokens = [
      user.id.startsWith('inv_') ? user.id.replace('inv_', '') : null,
      user.invitationId,
      user.originalData?.user?.invitationToken,
      user.originalData?.invitationToken,
      user.originalData?.user?.invitationId,
      // Try to extract from the original data structure
      user.originalData?.user?.id,
      user.originalData?.id
    ].filter(Boolean);
    
    console.log('🔧 Possible tokens found:', possibleTokens);
    
    if (possibleTokens.length > 0) {
      // Use the first valid token
      const token = possibleTokens[0];
      const baseUrl = window.location.origin;
      const fixedUrl = `${baseUrl}/invite/accept?token=${token}`;
      
      console.log('🔧 Fixed URL:', fixedUrl);
      toast.success('Invitation URL fixed! Check the updated display.');
      
      // Update the user's invitationId to use the working token
      const updatedUsers = users.map(u => 
        u.id === user.id 
          ? { ...u, invitationId: token }
          : u
      );
      setUsers(updatedUsers);
      
      return fixedUrl;
    } else {
      toast.error('Could not find any valid invitation token');
      return null;
    }
  }

  // Bulk test all invitation URLs against backend API
  const testAllInvitationUrls = async () => {
    console.log('🧪 Bulk testing all invitation URLs against backend...');
    const pendingUsers = users.filter(u => u.invitationStatus === 'pending');
    
    if (pendingUsers.length === 0) {
      toast('No pending invitations to test');
      return;
    }
    
    let successCount = 0;
    let failureCount = 0;
    const results = [];
    
    for (const user of pendingUsers) {
      const invitationUrl = generateInvitationUrl(user);
      if (!invitationUrl) {
        results.push({ user: user.email, status: 'no_url', message: 'No URL generated' });
        failureCount++;
        continue;
      }
      
      try {
        const token = invitationUrl.split('token=')[1];
        console.log(`🧪 Testing ${user.email} with token: ${token.substring(0, 20)}...`);
        
        const response = await fetch(`/api/invitations/details-by-token?token=${token}`);
        
        if (response.ok) {
          const data = await response.json();
          results.push({ user: user.email, status: 'success', message: 'Backend found invitation', data });
          successCount++;
          console.log(`✅ ${user.email}: Backend API test successful`);
        } else {
          const errorData = await response.json().catch(() => ({}));
          results.push({ user: user.email, status: 'failure', message: `Backend error: ${response.status}`, error: errorData });
          failureCount++;
          console.log(`❌ ${user.email}: Backend API test failed - ${response.status}`);
        }
      } catch (error: any) {
        results.push({ user: user.email, status: 'error', message: 'Network error', error: error.message });
        failureCount++;
        console.log(`❌ ${user.email}: Network error - ${error.message}`);
      }
    }
    
    console.log('🧪 Bulk test results:', { successCount, failureCount, results });
    
    if (successCount === pendingUsers.length) {
      toast.success(`✅ All ${successCount} invitation URLs are working with the backend!`);
    } else if (successCount > 0) {
      toast.success(`✅ ${successCount} working • ❌ ${failureCount} failed • Check console for details`);
    } else {
      toast.error(`❌ All ${failureCount} invitation URLs failed backend validation. Check console for details.`);
    }
    
    return results;
  }

  // Manually regenerate invitation URL for debugging
  const regenerateInvitationUrl = (user: UnifiedUser) => {
    console.log('🔄 Manually regenerating invitation URL for:', user.email);
    console.log('🔄 Full user data:', user);
    
    // Force regeneration by clearing any cached data
    const newUrl = generateInvitationUrl(user);
    console.log('🔄 New URL generated:', newUrl);
    
    if (newUrl) {
      toast.success('Invitation URL regenerated successfully!');
    } else {
      toast.error('Failed to generate invitation URL. Check console for details.');
    }
    
    // Force re-render
    setUsers([...users]);
  }

  // Validate invitation URL
  const validateInvitationUrl = (url: string | null) => {
    if (!url) return { isValid: false, error: 'No invitation URL generated' };
    
    try {
      const urlObj = new URL(url);
      if (!urlObj.searchParams.get('token')) {
        return { isValid: false, error: 'Missing invitation token' };
      }
      return { isValid: true, error: null };
    } catch (error) {
      return { isValid: false, error: 'Invalid URL format' };
    }
  }

  // Test invitation URL against backend API
  const testInvitationUrl = async (user: UnifiedUser) => {
    const invitationUrl = generateInvitationUrl(user);
    if (!invitationUrl) {
      toast.error('No invitation URL to test');
      return;
    }
    
    try {
      console.log('🧪 Testing invitation URL against backend:', invitationUrl);
      
      // Extract token from URL
      const token = invitationUrl.split('token=')[1];
      
      // Test the backend API endpoint
      const response = await fetch(`/api/invitations/details-by-token?token=${token}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend API test successful:', data);
        toast.success('✅ Invitation URL is valid! Backend found the invitation.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log('❌ Backend API test failed:', response.status, errorData);
        toast.error(`❌ Backend API test failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error testing invitation URL:', error);
      toast.error('❌ Error testing invitation URL');
    }
  }

  // Comprehensive invitation URL generation with fallback mechanisms
  const generateInvitationUrl = (user: UnifiedUser) => {
    // For invited users, we need to extract the invitation token from the correct location
    if (user.userType === 'invited' || user.invitationStatus === 'pending') {
      let invitationToken = null;
      let tokenSource = 'unknown';
      
      // Debug logging to understand the data structure
      console.log('🔍 Generating invitation URL for user:', user.email);
      console.log('🔍 User data:', {
        id: user.id,
        invitationId: user.invitationId,
        userType: user.userType,
        invitationStatus: user.invitationStatus,
        originalData: user.originalData
      });
      
      // Priority order for finding invitation token:
      // 1. Check originalData.user.invitationToken (this is where it's stored from getTenantUsers)
      if (user.originalData?.user?.invitationToken) {
        invitationToken = user.originalData.user.invitationToken;
        tokenSource = 'originalData.user.invitationToken';
        console.log('🔑 Using originalData.user.invitationToken:', invitationToken);
      }
      // 2. Check originalData.invitationToken (direct case)
      else if (user.originalData?.invitationToken) {
        invitationToken = user.originalData.invitationToken;
        tokenSource = 'originalData.invitationToken';
        console.log('🔑 Using originalData.invitationToken:', invitationToken);
      }
      // 3. Check user.invitationId field (if it's actually a token)
      else if (user.invitationId && user.invitationId.length > 20) {
        invitationToken = user.invitationId;
        tokenSource = 'user.invitationId';
        console.log('🔑 Using user.invitationId:', invitationToken);
      }
      // 4. Check if this is a direct invitation (has invitationId starting with 'inv_')
      else if (user.id.startsWith('inv_')) {
        // Extract the actual invitation ID from the user ID
        invitationToken = user.id.replace('inv_', '');
        tokenSource = 'user.id (inv_ prefix)';
        console.log('🔑 Using invitation ID from user.id:', invitationToken);
      }
      // 5. Check if originalData.user has an invitationId field
      else if (user.originalData?.user?.invitationId) {
        invitationToken = user.originalData.user.invitationId;
        tokenSource = 'originalData.user.invitationId';
        console.log('🔑 Using originalData.user.invitationId:', invitationToken);
      }
      // 6. Check if the user ID itself is the invitation token (fallback)
      else if (user.id && user.id.length > 20 && !user.id.startsWith('inv_')) {
        invitationToken = user.id;
        tokenSource = 'user.id (fallback)';
        console.log('🔑 Using user.id as fallback invitation token:', invitationToken);
      }
      
      if (invitationToken) {
        const baseUrl = window.location.origin;
        const invitationUrl = `${baseUrl}/invite/accept?token=${invitationToken}`;
        console.log('✅ Generated invitation URL:', invitationUrl);
        console.log('✅ Token source:', tokenSource);
        return invitationUrl;
      } else {
        console.log('❌ No invitation token found for user:', user.email);
        console.log('❌ Available data paths:');
        console.log('  - user.id:', user.id);
        console.log('  - user.invitationId:', user.invitationId);
        console.log('  - user.originalData?.user?.invitationToken:', user.originalData?.user?.invitationToken);
        console.log('  - user.originalData?.invitationToken:', user.originalData?.invitationToken);
        console.log('  - user.originalData?.user?.invitationId:', user.originalData?.user?.invitationId);
        console.log('  - user.originalData:', user.originalData);
      }
    }
    return null;
  }

  const roleColors = {
    'Super Administrator': 'bg-purple-100 text-purple-800',
    'Admin': 'bg-red-100 text-red-800',
    'contacts manager': 'bg-blue-100 text-blue-800',
    'Member': 'bg-green-100 text-green-800',
    'No role assigned': 'bg-gray-100 text-gray-800',
    'admin': 'bg-red-100 text-red-800',
    'manager': 'bg-blue-100 text-blue-800',
    'user': 'bg-green-100 text-green-800'
  }

  const getRoleColor = (roleName: string) => {
    return roleColors[roleName as keyof typeof roleColors] || 'bg-gray-100 text-gray-800';
  }

  const getStatusBadge = (user: UnifiedUser) => {
    if (user.invitationStatus === 'pending') {
      return <Badge variant="secondary">Pending</Badge>
    }
    if (user.invitationStatus === 'accepted') {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Invitation Accepted</Badge>
    }
    if (user.isActive) {
      return <Badge variant="default">Active</Badge>
    }
    return <Badge variant="outline">Inactive</Badge>
  }

  const getLastActivity = (user: UnifiedUser) => {
    if (user.invitationStatus === 'pending') {
      return 'Never'
    }
    return user.lastActiveAt ? formatDate(user.lastActiveAt) : 'Never'
  }

  const getInvitedInfo = (user: UnifiedUser) => {
    if (user.invitationStatus === 'pending') {
      return formatDate(user.invitedAt)
    }
    return user.invitedAt ? formatDate(user.invitedAt) : 'N/A'
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-gray-600">Manage team members, roles, and invitations</p>
        </div>
        <div className="flex gap-2 mb-6">
          <Button
            onClick={testAllInvitationUrls}
            className="bg-green-600 hover:bg-green-700"
          >
            🧪 Test URLs
          </Button>
          
          <Button
            onClick={() => setShowInvitationUrls(true)}
            variant="outline"
          >
            View Invitation URLs
          </Button>
          
          <Button
            onClick={() => setShowInviteModal(true)}
            className="bg-gray-900 hover:bg-gray-800"
          >
            + Invite User
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                {/* <Users className="h-4 w-4 text-blue-600" /> */}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.invitationStatus === 'active' || u.isActive).length}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Invitations</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.invitationStatus === 'pending').length}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <Mail className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Admins</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.role === 'admin' || u.role === 'Super Administrator').length}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <Shield className="h-4 w-4 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Role:</span>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={rolesLoading ? "Loading..." : "All Roles"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {rolesLoading ? (
                  <SelectItem value="loading" disabled>Loading roles...</SelectItem>
                ) : rolesData?.data?.data && Array.isArray(rolesData.data.data) ? (
                  rolesData.data.data.map((role: any) => (
                    <SelectItem key={role.roleId} value={role.roleName}>
                      {role.roleName}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-roles" disabled>No roles available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members ({displayUsers.length})</CardTitle>
            <CardDescription>All users and pending invitations in your organization</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filtering Info */}
            {isFiltering && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Filtering Active:</strong> Showing {displayUsers.length} of {users.length} users
                  {searchTerm && ` • Search: "${searchTerm}"`}
                  {selectedRole !== 'all' && ` • Role: ${selectedRole}`}
                </p>
              </div>
            )}
            
            {/* Table Headers */}
            <div className="grid grid-cols-12 gap-4 p-4 border-b font-medium text-sm text-gray-600">
              <div className="col-span-5">User</div>
              <div className="col-span-3">Roles & Status</div>
              <div className="col-span-2">Last Activity</div>
              <div className="col-span-2">Invited</div>
            </div>
            
            <div className="space-y-2">
              {displayUsers.map((user) => (
                <div
                  key={user.id}
                  className="grid grid-cols-12 gap-4 p-4 border rounded-lg hover:bg-gray-50 items-center"
                >
                  {/* User Column */}
                  <div className="col-span-5 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center font-medium">
                      {getInitials(`${user.firstName || user.email.split('@')[0]} ${user.lastName || ''}`)}
                    </div>
                    <div>
                      <p className="font-medium">
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}` 
                          : user.email.split('@')[0]
                        }
                      </p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                  </div>

                  {/* Roles & Status Column */}
                  <div className="col-span-3 space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(user)}

                      {/* Show role if available */}
                      {user.role && user.role !== 'No role assigned' && (
                        <Badge className={getRoleColor(user.role)}>
                          {user.role}
                        </Badge>
                      )}

                      {/* Show "No role assigned" for users without roles */}
                      {(!user.role || user.role === 'No role assigned') && (
                        <Badge variant="outline">No role assigned</Badge>
                      )}
                    </div>

                    {/* Show organization assignment */}
                    {(() => {
                      console.log(`🔍 Debug - User ${user.email} status: ${user.invitationStatus}, id: ${user.id}`);
                      const orgAssignment = getUserOrgAssignment(user.id);
                      return (
                        <div className="text-xs text-gray-500">
                          <Building2 className="h-3 w-3 inline mr-1" />
                          {orgAssignment ?
                            `${orgAssignment.organizationName} (${orgAssignment.assignmentType})` :
                            'No organization assigned'
                          }
                        </div>
                      );
                    })()}
                  </div>

                  {/* Last Activity Column */}
                  <div className="col-span-2 text-sm text-gray-600">
                    {getLastActivity(user)}
                    {user.invitationStatus !== 'pending' && (
                      <p className="text-xs text-gray-500">No login</p>
                    )}
                  </div>

                  {/* Invited Column */}
                  <div className="col-span-2 text-sm text-gray-600">
                    {getInvitedInfo(user)}
                    {/* Show invitation status */}
                    {user.invitationStatus === 'accepted' && (
                      <div className="mt-1">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          ✓ Invitation Accepted
                        </Badge>
                      </div>
                    )}
                    {/* Show invitation URL only if present and pending */}
                    {user.invitationStatus === 'pending' && (() => {
                      const invitationUrl = generateInvitationUrl(user);
                      if (invitationUrl) {
                        return (
                          <div className="mt-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyInvitationUrl(invitationUrl)}
                              className="text-xs h-6 px-2 text-blue-600 hover:text-blue-700"
                              title="Copy Invitation URL"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy URL
                            </Button>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* Actions Column */}
                  <div className="col-span-12 flex items-center gap-1 pt-2 border-t">
                    {/* Organization Assignment - Show for all users for debugging */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAssignOrg(user)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      title={getUserOrgAssignment(user.id) ? "Change Organization Assignment" : "Assign to Organization"}
                    >
                      <Building2 className="h-4 w-4" />
                      {getUserOrgAssignment(user.id) && <span className="ml-1 text-xs">✓</span>}
                    </Button>

                    {/* Show actions for active users (non-pending) */}
                    {user.invitationStatus !== 'pending' && (
                      <>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newRole = user.role === 'Member' ? 'Admin' : 'Member'
                            handleRoleChange(user.id, newRole)
                          }}
                          title="Toggle Admin Role"
                        >
                          <Shield className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveUser(user.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Remove User"
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {/* Show actions for pending invitations */}
                    {user.invitationStatus === 'pending' && (() => {
                      const invitationUrl = generateInvitationUrl(user);
                      return (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveUser(user.id)}
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            title="Cancel Invitation"
                          >
                            <X className="h-4 w-4" />
                          </Button>

                          {/* Only show copy URL button if URL is available */}
                          {invitationUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyInvitationUrl(invitationUrl)}
                              title="Copy Invitation URL"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              ))}

              {displayUsers.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No users found matching your criteria</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Invitations Section */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>Manage pending invitations and generate invitation URLs</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Summary of invitation status */}
            {(() => {
              const pendingUsers = users.filter(u => u.invitationStatus === 'pending');
              const validUrls = pendingUsers.filter(u => {
                const url = generateInvitationUrl(u);
                return url && validateInvitationUrl(url).isValid;
              }).length;
              const invalidUrls = pendingUsers.length - validUrls;
              
              return (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Invitation Status:</strong> {validUrls} valid URLs • {invalidUrls} need attention
                    {invalidUrls > 0 && (
                      <span className="text-orange-600"> • Check console for debug information</span>
                    )}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    <strong>Note:</strong> Valid URLs only mean the frontend can generate them. 
                    Use the "🧪 Test API" button to verify they work with the backend.
                  </p>
                </div>
              );
            })()}
            
            <div className="space-y-4">
              {users.filter(u => u.invitationStatus === 'pending').map((user) => {
                const invitationUrl = generateInvitationUrl(user);
                const urlValidation = validateInvitationUrl(invitationUrl);
                
                return (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center font-medium">
                        {getInitials(user.firstName)}
                      </div>
                      <div>
                        <p className="font-medium">{user.firstName}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-xs text-gray-500">
                          Invited: {formatDate(user.invitedAt)}
                          {user.expiresAt && ` • Expires: ${formatDate(user.expiresAt)}`}
                        </p>
                        {/* Debug information */}
                        <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                          <p><strong>Debug Info:</strong></p>
                          <p>User ID: {user.id}</p>
                          <p>Invitation ID: {user.invitationId || 'None'}</p>
                          <p>User Type: {user.userType}</p>
                          <p>Status: {user.invitationStatus}</p>
                          {user.originalData?.user?.invitationToken && (
                            <p>Token: {user.originalData.user.invitationToken.substring(0, 20)}...</p>
                          )}
                          {user.originalData?.invitationToken && (
                            <p>Direct Token: {user.originalData.invitationToken.substring(0, 20)}...</p>
                          )}
                          {user.originalData?.user?.invitationId && (
                            <p>User Invitation ID: {user.originalData.user.invitationId.substring(0, 20)}...</p>
                          )}
                          {/* Show token source if URL was generated */}
                          {(() => {
                            const url = generateInvitationUrl(user);
                            if (url) {
                              // Extract token from URL to show source
                              const token = url.split('token=')[1];
                              return (
                                <div className="mt-1 p-1 bg-green-100 rounded">
                                  <p className="text-green-700">✅ URL Generated</p>
                                  <p className="text-green-600">Token: {token.substring(0, 20)}...</p>
                                </div>
                              );
                            }
                            return (
                              <div className="mt-1 p-1 bg-red-100 rounded">
                                <p className="text-red-700">❌ No URL Generated</p>
                                <p className="text-red-600">Check console for details</p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Only show invitation URL actions if URL is present */}
                      {invitationUrl && urlValidation.isValid ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyInvitationUrl(invitationUrl)}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy URL
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(invitationUrl, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open
                          </Button>
                          {/* Add test button for backend validation */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => testInvitationUrl(user)}
                            className="text-purple-600 hover:text-purple-700"
                          >
                            🧪 Test API
                          </Button>
                        </>
                      ) : invitationUrl ? (
                        <div className="text-red-600 text-sm">
                          <p>❌ {urlValidation.error}</p>
                          <p className="text-xs">Check console for debug info</p>
                        </div>
                      ) : (
                        <div className="text-gray-500 text-sm">
                          <p>No invitation URL available</p>
                        </div>
                      )}
                      
                      {/* Add refresh button for debugging - only if URL exists */}
                      {invitationUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => regenerateInvitationUrl(user)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          🔄 Refresh
                        </Button>
                      )}
                      
                      {/* Add fix button for broken URLs - only if URL doesn't exist or is invalid */}
                      {(!invitationUrl || !urlValidation.isValid) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fixInvitationUrl(user)}
                          className="text-green-600 hover:text-green-700"
                        >
                          🔧 Fix URL
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveUser(user.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              
              {users.filter(u => u.invitationStatus === 'pending').length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No pending invitations</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Organization Assignments Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Assignments</CardTitle>
            <CardDescription>Overview of user-organization assignments in your tenant</CardDescription>
          </CardHeader>
          <CardContent>
            {assignmentsLoading ? (
              <div className="animate-pulse">
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            ) : Array.isArray(assignmentsData) && assignmentsData.length > 0 ? (
              <div className="space-y-3">
                {assignmentsData.slice(0, 10).map((assignment: OrganizationAssignment) => {
                  const isLocation = assignment.entityType === 'location';
                  const entityName = assignment.entityName || assignment.organizationName || assignment.entityCode || assignment.organizationCode || 'Unknown';
                  const entityCode = assignment.entityCode || assignment.organizationCode;
                  
                  return (
                  <div key={assignment.assignmentId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          isLocation ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          {isLocation ? (
                            <MapPin className="h-4 w-4 text-green-600" />
                          ) : (
                        <Building2 className="h-4 w-4 text-blue-600" />
                          )}
                      </div>
                      <div>
                          <div className="flex items-center gap-2">
                        <p className="font-medium">
                              {entityName}
                            </p>
                            {isLocation && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-200">
                                Location
                              </Badge>
                            )}
                          </div>
                        <p className="text-sm text-gray-600">
                          {assignment.userName} • {assignment.assignmentType} • Priority {assignment.priority}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Assigned {formatDate(assignment.assignedAt)}
                      </p>
                      <Badge variant={assignment.isActive ? "default" : "secondary"}>
                        {assignment.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  );
                })}

                {Array.isArray(assignmentsData) && assignmentsData.length > 10 && (
                  <div className="text-center pt-2">
                    <p className="text-sm text-gray-600">
                      Showing 10 of {assignmentsData.length} assignments
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No organization assignments yet</p>
                <p className="text-sm text-gray-500">
                  Assign users to organizations using the building icon next to each user
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Invite User</CardTitle>
              <CardDescription>Send an invitation to a new team member</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInviteUser} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Email Address</label>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Role</label>
                  <Select value={inviteForm.role} onValueChange={(value) => setInviteForm(prev => ({ ...prev, role: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={rolesLoading ? "Loading roles..." : "Select a role"} />
                    </SelectTrigger>
                    <SelectContent>
                      {rolesLoading ? (
                        <SelectItem value="loading" disabled>Loading roles...</SelectItem>
                      ) : rolesData?.data?.data && Array.isArray(rolesData.data.data) && rolesData.data.data.length > 0 ? (
                        rolesData.data.data.map((role: any) => (
                          <SelectItem key={role.roleId} value={role.roleName}>
                            {role.roleName}
                          </SelectItem>
                        ))
                      ) : rolesData && !rolesLoading ? (
                        <SelectItem value="no-roles" disabled>No roles available - please create roles first</SelectItem>
                      ) : (
                        <SelectItem value="error" disabled>Error loading roles</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {rolesData && !rolesLoading && (!rolesData.data?.data || rolesData.data.data.length === 0) && (
                    <p className="text-xs text-red-600 mt-1">
                      No roles found. Please create some roles before inviting users.
                    </p>
                  )}
                </div>

                {/* Organization Assignment (Optional) */}
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Organization Assignment (Optional)</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Organization</label>
                      <Select
                        value={inviteForm.organizationId || ''}
                        onValueChange={(value) => setInviteForm(prev => ({
                          ...prev,
                          organizationId: value || undefined
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={orgsLoading ? "Loading organizations..." : "Select organization (optional)"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No organization assignment</SelectItem>
                          {orgsLoading ? (
                            <SelectItem value="loading" disabled>Loading organizations...</SelectItem>
                          ) : organizationsData && Array.isArray(organizationsData) && organizationsData.length > 0 ? (
                            organizationsData.map((org: any) => (
                              <SelectItem key={org.entityId} value={org.entityId}>
                                {org.entityName} ({org.entityCode})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-orgs" disabled>No organizations available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {inviteForm.organizationId && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium">Assignment Type</label>
                          <Select
                            value={inviteForm.assignmentType}
                            onValueChange={(value: any) => setInviteForm(prev => ({
                              ...prev,
                              assignmentType: value
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="primary">Primary</SelectItem>
                              <SelectItem value="secondary">Secondary</SelectItem>
                              <SelectItem value="temporary">Temporary</SelectItem>
                              <SelectItem value="guest">Guest</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium">Priority</label>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={inviteForm.priority}
                            onChange={(e) => setInviteForm(prev => ({
                              ...prev,
                              priority: parseInt(e.target.value) || 1
                            }))}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={
                      inviteUserMutation.isPending || 
                      !inviteForm.role || 
                      inviteForm.role.trim() === '' ||
                      !rolesData?.data?.data ||
                      rolesData.data.data.length === 0
                    }
                  >
                    {inviteUserMutation.isPending ? 'Sending...' : 'Send Invitation'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowInviteModal(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invitation URLs Modal */}
      {showInvitationUrls && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl">
            <CardHeader>
              <CardTitle>Invitation URLs</CardTitle>
              <CardDescription>Copy and share invitation URLs with your team members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Summary of invitation status */}
                {(() => {
                  const pendingUsers = users.filter(u => u.invitationStatus === 'pending');
                  const validUrls = pendingUsers.filter(u => {
                    const url = generateInvitationUrl(u);
                    return url && validateInvitationUrl(url).isValid;
                  }).length;
                  const invalidUrls = pendingUsers.length - validUrls;
                  
                  return (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700">
                        <strong>Invitation Status:</strong> {validUrls} valid URLs • {invalidUrls} need attention
                        {invalidUrls > 0 && (
                          <span className="text-orange-600"> • Check console for debug information</span>
                        )}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        <strong>Note:</strong> Valid URLs only mean the frontend can generate them. 
                        Use the "🧪 Test API" button to verify they work with the backend.
                      </p>
                    </div>
                  );
                })()}
                
                {users.filter(u => u.invitationStatus === 'pending').map((user) => {
                  const invitationUrl = generateInvitationUrl(user);
                  const urlValidation = validateInvitationUrl(invitationUrl);
                  
                  return (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{user.firstName}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-xs text-gray-500">
                          Invited: {formatDate(user.invitedAt)}
                          {user.expiresAt && ` • Expires: ${formatDate(user.expiresAt)}`}
                        </p>
                        {/* Debug information */}
                        <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                          <p><strong>Debug Info:</strong></p>
                          <p>User ID: {user.id}</p>
                          <p>Invitation ID: {user.invitationId || 'None'}</p>
                          <p>User Type: {user.userType}</p>
                          <p>Status: {user.invitationStatus}</p>
                          {user.originalData?.user?.invitationToken && (
                            <p>Token: {user.originalData.user.invitationToken.substring(0, 20)}...</p>
                          )}
                          {user.originalData?.invitationToken && (
                            <p>Direct Token: {user.originalData.invitationToken.substring(0, 20)}...</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Only show invitation URL buttons if URL is present */}
                        {invitationUrl && urlValidation.isValid ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyInvitationUrl(invitationUrl)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy URL
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(invitationUrl, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Open
                            </Button>
                          </>
                        ) : invitationUrl ? (
                          <div className="text-red-600 text-sm">
                            <p>❌ {urlValidation.error}</p>
                            <p className="text-xs">Check console for debug info</p>
                          </div>
                        ) : (
                          <div className="text-gray-500 text-sm">
                            <p>No invitation URL available</p>
                          </div>
                        )}
                        
                        {/* Add refresh button for debugging - only if URL exists */}
                        {invitationUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => regenerateInvitationUrl(user)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            🔄 Refresh
                          </Button>
                        )}
                        
                        {/* Add test button for backend validation - only if URL is valid */}
                        {invitationUrl && urlValidation.isValid && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => testInvitationUrl(user)}
                            className="text-purple-600 hover:text-purple-700"
                          >
                            🧪 Test API
                          </Button>
                        )}
                        
                        {/* Add fix button for broken URLs - only if URL doesn't exist or is invalid */}
                        {(!invitationUrl || !urlValidation.isValid) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fixInvitationUrl(user)}
                            className="text-green-600 hover:text-green-700"
                          >
                            🔧 Fix URL
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {users.filter(u => u.invitationStatus === 'pending').length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No pending invitations</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end gap-2">
                <Button onClick={() => testAllInvitationUrls()} variant="outline" className="text-purple-600">
                  🧪 Test All URLs
                </Button>
                <Button onClick={() => setShowInvitationUrls(false)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Organization Assignment Modal */}
      {showOrgAssignmentModal && selectedUserForOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Assign to Organization</CardTitle>
              <CardDescription>
                Assign {selectedUserForOrg.firstName} {selectedUserForOrg.lastName} to an organization (users can belong to multiple organizations)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitOrgAssignment} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Organization</label>
                  <Select
                    value={orgAssignmentForm.organizationId}
                    onValueChange={(value) => setOrgAssignmentForm(prev => ({ ...prev, organizationId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={orgsLoading ? "Loading organizations..." : "Select organization"} />
                    </SelectTrigger>
                    <SelectContent>
                      {orgsLoading ? (
                        <SelectItem value="loading" disabled>Loading organizations...</SelectItem>
                      ) : organizationsData && Array.isArray(organizationsData) && organizationsData.length > 0 ? (
                        organizationsData.map((org: any) => (
                          <SelectItem key={org.entityId} value={org.entityId}>
                            {org.entityName} ({org.entityCode})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-orgs" disabled>No organizations available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Assignment Type</label>
                    <Select
                      value={orgAssignmentForm.assignmentType}
                      onValueChange={(value: any) => setOrgAssignmentForm(prev => ({ ...prev, assignmentType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">Primary</SelectItem>
                        <SelectItem value="secondary">Secondary</SelectItem>
                        <SelectItem value="temporary">Temporary</SelectItem>
                        <SelectItem value="guest">Guest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Priority</label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={orgAssignmentForm.priority}
                      onChange={(e) => setOrgAssignmentForm(prev => ({
                        ...prev,
                        priority: parseInt(e.target.value) || 1
                      }))}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={assignOrgMutation.isPending || !orgAssignmentForm.organizationId}
                  >
                    {assignOrgMutation.isPending ? 'Assigning...' : 'Assign to Organization'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowOrgAssignmentModal(false);
                      setSelectedUserForOrg(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 