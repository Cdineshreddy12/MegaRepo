import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Search } from 'lucide-react';
import { Tenant } from './types';

interface TenantListProps {
  tenants: Tenant[];
  selectedTenant: Tenant | null;
  onTenantSelect: (tenant: Tenant) => void;
  loading: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export const TenantList: React.FC<TenantListProps> = ({
  tenants,
  selectedTenant,
  onTenantSelect,
  loading,
  searchTerm,
  onSearchChange
}) => {
  const filteredTenants = tenants.filter(tenant =>
    tenant.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.subdomain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="lg:col-span-1">
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Tenants ({tenants.length})
          </CardTitle>
          <CardDescription>
            Select a tenant to configure their credit costs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tenants..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Loading State */}
          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {/* Tenant List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredTenants.map((tenant) => (
              <div
                key={tenant.tenantId}
                onClick={() => onTenantSelect(tenant)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedTenant?.tenantId === tenant.tenantId
                    ? 'border-green-500 bg-green-50'
                    : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {tenant.companyName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {tenant.subdomain}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={tenant.isActive ? 'default' : 'secondary'} className="text-xs">
                        {tenant.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {tenant.assignmentCount} apps
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredTenants.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No tenants found</p>
                {searchTerm && (
                  <p className="text-xs mt-1">Try adjusting your search terms</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
