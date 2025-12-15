import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Copy, Mail, Trash2, RefreshCw, ExternalLink, Calendar, User, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { invitationAPI } from '@/lib/api';

interface Invitation {
  invitationId: string;
  email: string;
  roleName: string;
  status: 'pending' | 'accepted' | 'cancelled' | 'expired';
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  acceptedAt?: string;
  invitationUrl: string;
  isExpired: boolean;
  daysUntilExpiry: number;
}

interface Organization {
  tenantId: string;
  companyName: string;
  kindeOrgId: string;
}

interface InvitationSummary {
  total: number;
  pending: number;
  accepted: number;
  expired: number;
}

interface InvitationManagerProps {
  orgCode: string;
}

export function InvitationManager({ orgCode }: InvitationManagerProps) {
  console.log('🚀 InvitationManager component rendered with orgCode:', orgCode);
  
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [summary, setSummary] = useState<InvitationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingInvitation, setCreatingInvitation] = useState(false);
  const [newInvitation, setNewInvitation] = useState({
    email: '',
    roleName: 'Member'
  });

  console.log('📊 InvitationManager state initialized:', {
    orgCode,
    loading,
    invitationsCount: invitations.length,
    hasOrganization: !!organization,
    hasSummary: !!summary
  });

  // Debug: Log invitations state changes
  useEffect(() => {
    console.log('📊 Invitations state updated:', {
      count: invitations.length,
      invitations: invitations.map(inv => ({ id: inv.invitationId, email: inv.email, status: inv.status }))
    });
  }, [invitations]);

  // Load invitations for the organization
  const loadInvitations = async () => {
    console.log('🔄 loadInvitations called for orgCode:', orgCode);
    
    if (!orgCode) {
      console.log('❌ No orgCode provided, skipping loadInvitations');
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 Loading invitations for org:', orgCode);
      
      const response = await invitationAPI.getAdminInvitations(orgCode);
      console.log('📡 API Response status:', response.status);
      
      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = response.data;
      console.log('📊 API Response data:', data);
      
      if (data.success) {
        console.log('✅ Setting invitations state with:', data.invitations.length, 'invitations');
        setInvitations(data.invitations);
        setOrganization(data.organization);
        setSummary(data.summary);
        console.log('✅ Invitations loaded successfully:', data.invitations.length);
      } else {
        console.error('❌ API returned success: false:', data);
        toast.error('Failed to load invitations: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error loading invitations:', error);
      toast.error('Failed to load invitations: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      console.log('🏁 Setting loading to false');
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 InvitationManager useEffect triggered with orgCode:', orgCode);
    console.log('🔄 About to call loadInvitations...');
    loadInvitations();
    console.log('🔄 loadInvitations called, returning from useEffect');
  }, [orgCode]);

  // Create new invitation
  const createInvitation = async () => {
    console.log('🚀 createInvitation called with:', { 
      email: newInvitation.email, 
      roleName: newInvitation.roleName,
      orgCode 
    });
    
    if (!newInvitation.email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      console.log('📝 Setting creatingInvitation to true...');
      setCreatingInvitation(true);
      
      console.log('📡 Calling invitationAPI.createTestInvitation...');
      const response = await invitationAPI.createTestInvitation({
        orgCode,
        email: newInvitation.email,
        roleName: newInvitation.roleName
      });

      console.log('📊 API Response received:', response);
      const data = response.data;
      
      if (data.success) {
        console.log('✅ Invitation created successfully, data:', data);
        toast.success('Invitation created successfully');
        setNewInvitation({ email: '', roleName: 'Member' });
        
        console.log('🔄 Calling loadInvitations to refresh the list...');
        loadInvitations(); // Reload the list
      } else {
        console.error('❌ API returned success: false:', data);
        toast.error(data.message || 'Failed to create invitation');
      }
    } catch (error) {
      console.error('❌ Error creating invitation:', error);
      toast.error('Failed to create invitation');
    } finally {
      console.log('🏁 Setting creatingInvitation to false...');
      setCreatingInvitation(false);
    }
  };

  // Resend invitation
  const resendInvitation = async (invitationId: string) => {
    try {
      const response = await invitationAPI.resendInvitation(orgCode, invitationId);

      const data = response.data;
      
      if (data.success) {
        toast.success('Invitation email resent successfully');
      } else {
        toast.error(data.message || 'Failed to resend invitation');
      }
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error('Failed to resend invitation');
    }
  };

  // Cancel invitation
  const cancelInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) {
      return;
    }

    try {
      const response = await invitationAPI.cancelInvitation(orgCode, invitationId);

      const data = response.data;
      
      if (data.success) {
        toast.success('Invitation cancelled successfully');
        loadInvitations(); // Reload the list
      } else {
        toast.error(data.message || 'Failed to cancel invitation');
      }
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
    }
  };

  // Copy invitation URL to clipboard
  const copyInvitationUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Invitation URL copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy URL');
    }
  };

  // Get status badge color
  const getStatusBadge = (status: string, isExpired: boolean) => {
    if (isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    
    switch (status) {
      case 'pending':
        return <Badge variant="default">Pending</Badge>;
      case 'accepted':
        return <Badge variant="secondary">Accepted</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invitations...</p>
          <p className="text-sm text-gray-500 mt-2">Organization: {orgCode}</p>
        </div>
      </div>
    );
  }

  // Debug information
  console.log('🎨 Rendering InvitationManager with:', {
    invitationsCount: invitations.length,
    organization: organization,
    summary: summary,
    orgCode: orgCode
  });

  // Show error state if no organization data
  if (!organization) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">
          <Shield className="h-12 w-12 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Failed to Load Organization</h3>
        </div>
        <p className="text-gray-600 mb-4">
          Could not load organization data for: <code className="bg-gray-100 px-2 py-1 rounded">{orgCode}</code>
        </p>
        <Button onClick={loadInvitations} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Debug Section - Remove in production */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-800">Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Organization Code:</strong> {orgCode}
            </div>
            <div>
              <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Invitations Count:</strong> {invitations.length}
            </div>
            <div>
              <strong>Organization:</strong> {organization ? 'Loaded' : 'Not Loaded'}
            </div>
            <div>
              <strong>Summary:</strong> {summary ? 'Loaded' : 'Not Loaded'}
            </div>
          </div>
          <Button 
            onClick={loadInvitations} 
            variant="outline" 
            size="sm" 
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reload Data
          </Button>
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Invitation Management</h2>
          <p className="text-muted-foreground">
            Manage team invitations for {organization?.companyName}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invitations</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{summary.pending}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accepted</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.accepted}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.expired}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create New Invitation */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Invitation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={newInvitation.email}
                onChange={(e) => setNewInvitation(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="w-32">
              <Label htmlFor="role">Role</Label>
              <Select
                value={newInvitation.roleName}
                onValueChange={(value) => setNewInvitation(prev => ({ ...prev, roleName: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Member">Member</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={createInvitation} 
              disabled={creatingInvitation || !newInvitation.email.trim()}
            >
              {creatingInvitation ? 'Creating...' : 'Create Invitation'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invitations Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No invitations found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Invited At</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.invitationId}>
                    <TableCell className="font-medium">{invitation.email}</TableCell>
                    <TableCell>{invitation.roleName}</TableCell>
                    <TableCell>{getStatusBadge(invitation.status, invitation.isExpired)}</TableCell>
                    <TableCell>{invitation.invitedBy}</TableCell>
                    <TableCell>{formatDate(invitation.invitedAt)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{formatDate(invitation.expiresAt)}</span>
                        {invitation.daysUntilExpiry > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {invitation.daysUntilExpiry} days left
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {/* Copy Invitation URL */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInvitationUrl(invitation.invitationUrl)}
                          title="Copy invitation URL"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>

                        {/* Open Invitation URL */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(invitation.invitationUrl, '_blank')}
                          title="Open invitation URL"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>

                        {/* Resend Email */}
                        {invitation.status === 'pending' && !invitation.isExpired && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resendInvitation(invitation.invitationId)}
                            title="Resend invitation email"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Cancel Invitation */}
                        {invitation.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelInvitation(invitation.invitationId)}
                            title="Cancel invitation"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invitation URL Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">View All Invitation URLs</Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invitation URLs</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share these URLs directly with your team members if emails weren't sent or need to be shared manually.
            </p>
            {invitations
              .filter(inv => inv.status === 'pending' && !inv.isExpired)
              .map((invitation) => (
                <div key={invitation.invitationId} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium">{invitation.email}</span>
                      <span className="text-sm text-muted-foreground ml-2">({invitation.roleName})</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyInvitationUrl(invitation.invitationUrl)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground break-all">
                    {invitation.invitationUrl}
                  </div>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
