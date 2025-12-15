import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Building,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  Loader2,
  Globe,
  Navigation,
  Clock,
  Phone,
  Mail
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Location {
  locationId: string;
  locationName: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  city?: string;
  state?: string;
  country?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  capacity?: {
    maxOccupancy?: number;
    currentOccupancy?: number;
    utilizationPercentage?: number;
  };
  organizationCount?: number;
  organizations?: Array<{
    organizationId: string;
    organizationName: string;
    organizationType: string;
    assignedAt: string;
  }>;
}

interface Organization {
  organizationId: string;
  organizationName: string;
  organizationType: 'parent' | 'sub';
  organizationLevel: number;
  hierarchyPath: string;
  isActive: boolean;
}

interface LocationManagementProps {
  tenantId: string;
  isAdmin: boolean;
  makeRequest: (endpoint: string, options?: RequestInit) => Promise<any>;
}

export function LocationManagement({
  tenantId,
  isAdmin,
  makeRequest
}: LocationManagementProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'compact'>('list');

  // Dialog states
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  // Form states
  const [locationForm, setLocationForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    organizationId: '',
    maxOccupancy: ''
  });

  const [editForm, setEditForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    maxOccupancy: '',
    isActive: true
  });

  // Load data using unified entity endpoints
  const loadData = async () => {
    try {
      setLoading(true);

      // Load locations using unified entity endpoint
      console.log('🔄 Loading locations...');
      const locationsResponse = await makeRequest(`/entities/tenant/${tenantId}?entityType=location`, {
        headers: { 'X-Application': 'crm' }
      });

      if (locationsResponse.success) {
        // Transform entities to location format
        const transformedLocations: Location[] = (locationsResponse.entities || []).map((entity: any) => ({
          locationId: entity.entityId,
          locationName: entity.entityName,
          address: entity.address || {},
          city: entity.address?.city || '',
          state: entity.address?.state || '',
          country: entity.address?.country || '',
          isActive: entity.isActive,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
          parentEntityId: entity.parentEntityId,
          responsiblePersonId: entity.responsiblePersonId,
          locationType: entity.locationType,
          capacity: entity.capacity,
          organizationCount: 0, // Will be calculated below
          organizations: []
        }));

        setLocations(transformedLocations);
        console.log('✅ Locations loaded:', transformedLocations.length);
      }

      // Load organizations for assignment using unified endpoint
      console.log('🔄 Loading organizations for location assignment...');
      const orgsResponse = await makeRequest(`/entities/hierarchy/${tenantId}`, {
        headers: { 'X-Application': 'crm' }
      });

      if (orgsResponse.success && orgsResponse.hierarchy) {
        // Flatten hierarchy to get all organizations
        const flattenOrgs = (orgs: any[]): Organization[] => {
          return orgs.reduce((acc: Organization[], org) => {
            acc.push({
              organizationId: org.entityId,
              organizationName: org.entityName,
              organizationType: org.organizationType || 'department',
              organizationLevel: org.entityLevel,
              hierarchyPath: org.hierarchyPath,
              isActive: org.isActive
            });
            if (org.children) {
              acc.push(...flattenOrgs(org.children));
            }
            return acc;
          }, []);
        };

        const flattenedOrgs = flattenOrgs(orgsResponse.hierarchy);
        setOrganizations(flattenedOrgs);
        console.log('✅ Organizations loaded for assignment:', flattenedOrgs.length);
      }
    } catch (error: any) {
      console.error('❌ Failed to load location data:', error);
      toast.error(`Failed to load location data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  // CRUD Operations using unified entity endpoints
  const createLocation = async () => {
    try {
      console.log('📝 Creating location:', {
        name: locationForm.name,
        city: locationForm.city,
        organizationId: locationForm.organizationId
      });

      const response = await makeRequest('/entities/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Application': 'crm' },
        body: JSON.stringify({
          entityName: locationForm.name,
          entityType: 'location',
          locationType: 'office', // Default location type
          address: {
            street: locationForm.address,
            city: locationForm.city,
            state: locationForm.state,
            zipCode: locationForm.zipCode,
            country: locationForm.country
          },
          parentEntityId: locationForm.organizationId || null,
          responsiblePersonId: null, // Can be enhanced to select from users
          capacity: locationForm.maxOccupancy ? {
            maxOccupancy: parseInt(locationForm.maxOccupancy),
            currentOccupancy: 0,
            utilizationPercentage: 0
          } : null
        })
      });

      if (response.success) {
        toast.success('Location created successfully!');
        console.log('✅ Location created:', response.location);
        setLocationForm({
          name: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
          organizationId: '',
          maxOccupancy: ''
        });
        setShowCreate(false);
        loadData();
      }
    } catch (error: any) {
      console.error('❌ Failed to create location:', error);
      toast.error(error.message || 'Failed to create location');
    }
  };

  const updateLocation = async () => {
    if (!selectedLocation) return;

    try {
      const response = await makeRequest(`/entities/${selectedLocation.locationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Application': 'crm' },
        body: JSON.stringify({
          entityName: editForm.name,
          address: {
            street: editForm.address,
            city: editForm.city,
            state: editForm.state,
            zipCode: editForm.zipCode,
            country: editForm.country
          },
          capacity: editForm.maxOccupancy ? {
            maxOccupancy: parseInt(editForm.maxOccupancy),
            currentOccupancy: selectedLocation.capacity?.currentOccupancy || 0,
            utilizationPercentage: selectedLocation.capacity?.utilizationPercentage || 0
          } : null,
          isActive: editForm.isActive
        })
      });

      if (response.success) {
        toast.success('Location updated successfully!');
        setShowEdit(false);
        setSelectedLocation(null);
        loadData();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update location');
    }
  };

  const deleteLocation = async (locationId: string, locationName: string) => {
    if (!confirm(`Are you sure you want to delete "${locationName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await makeRequest(`/entities/${locationId}`, {
        method: 'DELETE',
        headers: { 'X-Application': 'crm' }
      });

      if (response.success) {
        toast.success('Location deleted successfully!');
        loadData();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete location');
    }
  };

  // Filter locations
  const filteredLocations = locations.filter(location => {
    const matchesSearch = location.locationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.country?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' ||
      (filterType === 'active' && location.isActive) ||
      (filterType === 'inactive' && !location.isActive);
    return matchesSearch && matchesFilter;
  });

  const getUtilizationColor = (percentage?: number) => {
    if (!percentage) return 'text-gray-500';
    if (percentage < 50) return 'text-green-600';
    if (percentage < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-purple-600" />
              Location Management
            </h2>
            <p className="text-gray-600">Manage physical and virtual locations for your organizations</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Mode Selector */}
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="flex items-center gap-1"
              >
                <List className="w-4 h-4" />
                List
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="flex items-center gap-1"
              >
                <Grid3X3 className="w-4 h-4" />
                Grid
              </Button>
              <Button
                variant={viewMode === 'compact' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('compact')}
                className="flex items-center gap-1"
              >
                <Workflow className="w-4 h-4" />
                Compact
              </Button>
            </div>
            <Button variant="outline" onClick={loadData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => setShowCreate(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Location
            </Button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedLocations.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-900">
                {selectedLocations.length} location{selectedLocations.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm(`Activate ${selectedLocations.length} location${selectedLocations.length !== 1 ? 's' : ''}?`)) {
                    // Implement bulk activate
                    toast.success('Bulk activation coming soon!');
                    setSelectedLocations([]);
                  }
                }}
                className="border-green-300 text-green-700 hover:bg-green-50"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Activate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm(`Deactivate ${selectedLocations.length} location${selectedLocations.length !== 1 ? 's' : ''}?`)) {
                    // Implement bulk deactivate
                    toast.success('Bulk deactivation coming soon!');
                    setSelectedLocations([]);
                  }
                }}
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Deactivate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedLocations([])}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search locations by name, city, or country..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Locations Display with Multiple Views */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          <span className="ml-2 text-gray-600">Loading locations...</span>
        </div>
      ) : filteredLocations.length > 0 ? (
        <div className={
          viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' :
          viewMode === 'compact' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3' :
          'space-y-4' // list view
        }>
          {filteredLocations.map(location => {
            const isSelected = selectedLocations.includes(location.locationId);
            const handleSelect = (e: React.MouseEvent) => {
              e.stopPropagation();
              if (isSelected) {
                setSelectedLocations(prev => prev.filter(id => id !== location.locationId));
              } else {
                setSelectedLocations(prev => [...prev, location.locationId]);
              }
            };

            if (viewMode === 'compact') {
              return (
                <div
                  key={location.locationId}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={handleSelect}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={handleSelect}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center">
                      <MapPin className="w-3 h-3 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{location.locationName}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {location.city && `${location.city}, `}{location.country}
                      </div>
                    </div>
                    <Badge variant={location.isActive ? "default" : "secondary"} className="text-xs">
                      {location.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              );
            }

            return (
              <Card key={location.locationId} className={`hover:shadow-lg transition-shadow ${
                viewMode === 'list' ? 'flex items-center' : ''
              } ${isSelected ? 'ring-2 ring-blue-400' : ''}`}>
                <CardHeader className={`${viewMode === 'list' ? 'flex-1 pb-3' : 'pb-3'}`}>
                  <div className={`flex items-start justify-between ${viewMode === 'list' ? 'items-center' : ''}`}>
                    <div className="flex items-center gap-3">
                      {viewMode === 'list' && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={handleSelect}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                        />
                      )}
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className={viewMode === 'list' ? 'text-base' : 'text-lg'}>
                          {location.locationName}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={location.isActive ? "default" : "secondary"} className="text-xs">
                            {location.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {location.capacity?.utilizationPercentage && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${getUtilizationColor(location.capacity.utilizationPercentage)}`}
                            >
                              {location.capacity.utilizationPercentage}% utilized
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedLocation(location);
                          setEditForm({
                            name: location.locationName,
                            address: location.address?.street || '',
                            city: location.city || '',
                            state: location.state || '',
                            zipCode: location.address?.zipCode || '',
                            country: location.country || '',
                            maxOccupancy: location.capacity?.maxOccupancy?.toString() || '',
                            isActive: location.isActive
                          });
                          setShowEdit(true);
                        }}
                        title="Edit location"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteLocation(location.locationId, location.locationName)}
                          title="Delete location"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {viewMode !== 'list' && (
                  <CardContent className="space-y-3">
                    {/* Address */}
                    <div className="flex items-start gap-2">
                      <Navigation className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div className="text-sm text-gray-600">
                        {location.address?.street && <div>{location.address.street}</div>}
                        <div>
                          {location.city && `${location.city}, `}
                          {location.state && `${location.state} `}
                          {location.address?.zipCode && location.address.zipCode}
                        </div>
                        {location.country && <div>{location.country}</div>}
                      </div>
                    </div>

                    {/* Capacity */}
                    {location.capacity && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <div className="text-sm text-gray-600">
                          {location.capacity.currentOccupancy || 0} / {location.capacity.maxOccupancy || '∞'} occupants
                        </div>
                      </div>
                    )}

                    {/* Organizations */}
                    {location.organizationCount && location.organizationCount > 0 && (
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-400" />
                        <div className="text-sm text-gray-600">
                          Used by {location.organizationCount} organization{location.organizationCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    )}

                    {/* Created Date */}
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <div className="text-sm text-gray-600">
                        Created {new Date(location.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || filterType !== 'all' ? 'No locations match your criteria' : 'No locations found'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterType !== 'all' ? 'Try adjusting your search or filter settings.' : 'Add your first location to get started.'}
          </p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Location
          </Button>
        </div>
      )}

      {/* Create Location Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Location</DialogTitle>
            <DialogDescription>
              Add a new location and assign it to an organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-name">Location Name *</Label>
              <Input
                id="create-name"
                value={locationForm.name}
                onChange={(e) => setLocationForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter location name"
              />
            </div>

            <div>
              <Label htmlFor="create-org">Assign to Organization *</Label>
              <Select value={locationForm.organizationId} onValueChange={(value) => setLocationForm(prev => ({ ...prev, organizationId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.filter(org => org.isActive).map(org => (
                    <SelectItem key={org.organizationId} value={org.organizationId}>
                      {org.organizationName} (Level {org.organizationLevel})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="create-address">Street Address *</Label>
              <Input
                id="create-address"
                value={locationForm.address}
                onChange={(e) => setLocationForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter street address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-city">City *</Label>
                <Input
                  id="create-city"
                  value={locationForm.city}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Enter city"
                />
              </div>
              <div>
                <Label htmlFor="create-state">State/Province</Label>
                <Input
                  id="create-state"
                  value={locationForm.state}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="Enter state"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-zip">ZIP/Postal Code</Label>
                <Input
                  id="create-zip"
                  value={locationForm.zipCode}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, zipCode: e.target.value }))}
                  placeholder="Enter ZIP code"
                />
              </div>
              <div>
                <Label htmlFor="create-country">Country *</Label>
                <Input
                  id="create-country"
                  value={locationForm.country}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, country: e.target.value }))}
                  placeholder="Enter country"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="create-capacity">Max Occupancy (Optional)</Label>
              <Input
                id="create-capacity"
                type="number"
                value={locationForm.maxOccupancy}
                onChange={(e) => setLocationForm(prev => ({ ...prev, maxOccupancy: e.target.value }))}
                placeholder="Enter maximum occupancy"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={createLocation}
              disabled={!locationForm.name.trim() || !locationForm.address.trim() || !locationForm.city.trim() || !locationForm.country.trim() || !locationForm.organizationId}
            >
              Create Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Location Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>
              Update the details for {selectedLocation?.locationName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Location Name *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter location name"
              />
            </div>

            <div>
              <Label htmlFor="edit-address">Street Address *</Label>
              <Input
                id="edit-address"
                value={editForm.address}
                onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter street address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-city">City *</Label>
                <Input
                  id="edit-city"
                  value={editForm.city}
                  onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Enter city"
                />
              </div>
              <div>
                <Label htmlFor="edit-state">State/Province</Label>
                <Input
                  id="edit-state"
                  value={editForm.state}
                  onChange={(e) => setEditForm(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="Enter state"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-zip">ZIP/Postal Code</Label>
                <Input
                  id="edit-zip"
                  value={editForm.zipCode}
                  onChange={(e) => setEditForm(prev => ({ ...prev, zipCode: e.target.value }))}
                  placeholder="Enter ZIP code"
                />
              </div>
              <div>
                <Label htmlFor="edit-country">Country *</Label>
                <Input
                  id="edit-country"
                  value={editForm.country}
                  onChange={(e) => setEditForm(prev => ({ ...prev, country: e.target.value }))}
                  placeholder="Enter country"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-capacity">Max Occupancy (Optional)</Label>
              <Input
                id="edit-capacity"
                type="number"
                value={editForm.maxOccupancy}
                onChange={(e) => setEditForm(prev => ({ ...prev, maxOccupancy: e.target.value }))}
                placeholder="Enter maximum occupancy"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={editForm.isActive}
                onChange={(e) => setEditForm(prev => ({ ...prev, isActive: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <Label htmlFor="edit-active">Active Location</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>
              Cancel
            </Button>
            <Button
              onClick={updateLocation}
              disabled={!editForm.name.trim() || !editForm.address.trim() || !editForm.city.trim() || !editForm.country.trim()}
            >
              Update Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LocationManagement;
