/**
 * EXAMPLE: How to use Entity Scope and Edit Responsible Person
 * 
 * This file demonstrates how to:
 * 1. Use entity scope to filter data
 * 2. Show/hide features based on user's scope
 * 3. Integrate the Edit Responsible Person modal
 */

import React, { useState, useEffect } from 'react';
import { useEntityScope } from '@/contexts/EntityScopeContext';
import { EditResponsiblePersonModal } from '@/components/modals/EditResponsiblePersonModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserCog, Shield, Users, Building2 } from 'lucide-react';
import api from '@/lib/api';

interface Entity {
  entityId: string;
  entityName: string;
  entityType: string;
  responsiblePersonId?: string;
  responsiblePersonName?: string;
}

export const EntityScopeExample: React.FC = () => {
  const { entityScope, loading, canAccessEntity, isTenantAdmin, isEntityAdmin } = useEntityScope();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);

  useEffect(() => {
    loadEntities();
  }, []);

  const loadEntities = async () => {
    try {
      const response = await api.get('/entities');
      if (response.data?.success) {
        // Filter entities based on user's scope
        const allEntities = response.data.data || [];
        const accessibleEntities = filterEntitiesByScope(allEntities);
        setEntities(accessibleEntities);
      }
    } catch (error) {
      console.error('Failed to load entities:', error);
    }
  };

  // Filter entities based on entity scope
  const filterEntitiesByScope = (allEntities: Entity[]) => {
    if (!entityScope) return [];
    if (entityScope.isUnrestricted) return allEntities; // Tenant admin sees all
    
    // Filter to only accessible entities
    return allEntities.filter(entity => 
      entityScope.entityIds.includes(entity.entityId)
    );
  };

  // Check if user can edit this specific entity
  const canEdit = (entity: Entity) => {
    // Tenant admins can edit anything
    if (isTenantAdmin) return true;
    
    // Entity admins can only edit entities in their scope
    return canAccessEntity(entity.entityId);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Scope Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Your Access Level
          </CardTitle>
          <CardDescription>
            Based on your role and responsibilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading scope...</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">Scope Type:</span>
                <Badge variant={isTenantAdmin ? "default" : "secondary"}>
                  {isTenantAdmin ? 'Tenant Admin' : isEntityAdmin ? 'Entity Admin' : 'User'}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="font-medium">Accessible Entities:</span>
                <Badge variant="outline">
                  {entityScope?.isUnrestricted ? 'All' : `${entityScope?.entityIds.length || 0}`}
                </Badge>
              </div>

              {isEntityAdmin && entityScope?.responsibilities && (
                <div className="mt-4">
                  <p className="font-medium mb-2">Your Responsibilities:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    {entityScope.responsibilities.map((resp: any, idx: number) => (
                      <li key={idx}>
                        {resp.entityType} - {resp.responsibilityLevel}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entities List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {isTenantAdmin ? 'All Entities' : 'My Entities'}
          </CardTitle>
          <CardDescription>
            {isTenantAdmin 
              ? 'You have access to all entities in your organization'
              : 'Entities you are responsible for and their children'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {entities.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No entities available
              </p>
            ) : (
              entities.map((entity) => (
                <div
                  key={entity.entityId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-gray-400" />
                      <div>
                        <h3 className="font-medium">{entity.entityName}</h3>
                        <p className="text-sm text-gray-500">
                          {entity.entityType}
                          {entity.responsiblePersonName && (
                            <span className="ml-2">
                              • Admin: {entity.responsiblePersonName}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {canEdit(entity) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingEntity(entity)}
                    >
                      <UserCog className="w-4 h-4 mr-2" />
                      Change Admin
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Responsible Person Modal */}
      <EditResponsiblePersonModal
        isOpen={!!editingEntity}
        onClose={() => setEditingEntity(null)}
        entity={editingEntity}
        onSuccess={() => {
          loadEntities();
          // Optionally refresh entity scope if responsibilities changed
          // entityScope.refreshEntityScope();
        }}
      />
    </div>
  );
};

// Example of using entity scope in existing components
export const IntegrationExample = () => {
  const { isTenantAdmin, isEntityAdmin, canAccessEntity } = useEntityScope();

  // Example 1: Conditional rendering based on role
  if (isTenantAdmin) {
    return <div>Tenant Admin View - Full Access</div>;
  }

  if (isEntityAdmin) {
    return <div>Entity Admin View - Limited to Your Entities</div>;
  }

  return <div>Regular User View</div>;
};

// Example 2: Filtering users based on entity scope
export const FilteredUserListExample = () => {
  const { entityScope } = useEntityScope();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadUsers();
  }, [entityScope]);

  const loadUsers = async () => {
    const response = await api.get('/admin/users');
    let allUsers = response.data?.data || [];

    // If not tenant admin, filter users to only show those in accessible entities
    if (entityScope && !entityScope.isUnrestricted) {
      allUsers = allUsers.filter((user: any) => {
        // Check if user belongs to any accessible entity
        return user.entityMemberships?.some((membership: any) =>
          entityScope.entityIds.includes(membership.entityId)
        );
      });
    }

    setUsers(allUsers);
  };

  return (
    <div>
      {/* Render filtered users */}
      {users.map((user: any) => (
        <div key={user.userId}>{user.name}</div>
      ))}
    </div>
  );
};

export default EntityScopeExample;

