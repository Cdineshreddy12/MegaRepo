import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Building,
  Package,
  Shield,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  Check,
  AlertCircle,
  Users,
  Settings,
  Eye,
  Edit,
  Trash2,
  Plus,
  Layers,
  Coins
} from 'lucide-react';
import api from '@/lib/api';
import { useTheme } from '@/components/theme/ThemeProvider';
import Pattern from '@/components/ui/pattern-background';
import { PearlButton } from '@/components/ui/pearl-button';

interface Application {
  appId: string;
  appCode: string;
  appName: string;
  description: string;
  subscriptionTier: string;
  modules: Module[];
}

interface Module {
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  description: string;
  isCore: boolean;
  permissions: Permission[];
}

interface Permission {
  code: string;
  name: string;
  description?: string;
  fullCode?: string;
}

interface RoleBuilderData {
  roleName: string;
  description: string;
  selectedApps: string[];
  selectedModules: Record<string, string[]>;
  selectedPermissions: Record<string, string[]>;
  restrictions: {
    timeRestrictions?: Record<string, any>;
    ipRestrictions?: Record<string, any>;
    dataRestrictions?: Record<string, any>;
    featureRestrictions?: Record<string, any>;
  };
}

interface ApplicationModuleRoleBuilderProps {
  onSave?: (role: any) => void;
  onCancel?: () => void;
  initialRole?: any;
}

export function ApplicationModuleRoleBuilder({ 
  onSave, 
  onCancel, 
  initialRole 
}: ApplicationModuleRoleBuilderProps) {
  const { actualTheme, glassmorphismEnabled } = useTheme();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Role builder state
  const [roleData, setRoleData] = useState<RoleBuilderData>(() => {
    if (initialRole) {
      return {
        roleName: initialRole.roleName || initialRole.name || '',
        description: initialRole.description || '',
        selectedApps: [],
        selectedModules: {},
        selectedPermissions: {},
        restrictions: {
          timeRestrictions: {},
          ipRestrictions: {},
          dataRestrictions: {},
          featureRestrictions: {}
        }
      };
    }
    
    return {
      roleName: '',
      description: '',
      selectedApps: [],
      selectedModules: {},
      selectedPermissions: {},
      restrictions: {
        timeRestrictions: {},
        ipRestrictions: {},
        dataRestrictions: {},
        featureRestrictions: {}
      }
    };
  });

  // Load applications and modules from backend
  useEffect(() => {
    const loadRoleBuilderOptions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Loading role builder options from applications/modules tables...');
        
        // Call the backend API that uses applications and modules tables
        const response = await api.get('/api/custom-roles/builder-options');
        
        if (response.data.success) {
          const { applications: apps, totalApps, totalModules, totalPermissions } = response.data.data;
          
          console.log(`✅ Loaded ${totalApps} applications, ${totalModules} modules, ${totalPermissions} permissions`);
          
          setApplications(apps);
          
          // Expand all apps by default for better UX
          setExpandedApps(new Set(apps.map((app: Application) => app.appCode)));
          
          // If editing an existing role, populate the selections
          if (initialRole) {
            // Parse existing role permissions to rebuild selections
            const permissions = initialRole.permissions || [];
            const parsedSelections = parseExistingPermissions(permissions, apps);
            setRoleData(prev => ({
              ...prev,
              ...parsedSelections
            }));
          }
          
        } else {
          setError('Failed to load applications and modules');
        }
        
      } catch (err) {
        console.error('❌ Error loading role builder options:', err);
        setError('Failed to connect to server');
      } finally {
        setLoading(false);
      }
    };

    loadRoleBuilderOptions();
  }, [initialRole]);

  // Parse existing role permissions into selection format
  const parseExistingPermissions = (permissions: string[] | Record<string, any>, apps: Application[]) => {
    const selectedApps: string[] = [];
    const selectedModules: Record<string, string[]> = {};
    const selectedPermissions: Record<string, string[]> = {};

    console.log('🔍 Parsing existing permissions:', permissions);

    // Handle flat array format (e.g., ["crm.contacts.read", "crm.contacts.create"])
    if (Array.isArray(permissions)) {
      permissions.forEach(permission => {
        const parts = permission.split('.');
        if (parts.length >= 3) {
          const [appCode, moduleCode, permCode] = parts;
          
          // Add app if not already selected
          if (!selectedApps.includes(appCode)) {
            selectedApps.push(appCode);
          }
          
          // Add module
          if (!selectedModules[appCode]) {
            selectedModules[appCode] = [];
          }
          if (!selectedModules[appCode].includes(moduleCode)) {
            selectedModules[appCode].push(moduleCode);
          }
          
          // Add permission
          const moduleKey = `${appCode}.${moduleCode}`;
          if (!selectedPermissions[moduleKey]) {
            selectedPermissions[moduleKey] = [];
          }
          selectedPermissions[moduleKey].push(permCode);
        }
      });
    } 
    // Handle hierarchical object format (e.g., { crm: { contacts: ["read", "create"] } })
    else if (typeof permissions === 'object' && permissions !== null) {
      Object.entries(permissions).forEach(([appCode, appPermissions]) => {
        if (typeof appPermissions === 'object' && appPermissions !== null) {
          // Add app
          if (!selectedApps.includes(appCode)) {
            selectedApps.push(appCode);
          }
          
          Object.entries(appPermissions).forEach(([moduleCode, modulePerms]) => {
            if (Array.isArray(modulePerms)) {
              // Add module
              if (!selectedModules[appCode]) {
                selectedModules[appCode] = [];
              }
              if (!selectedModules[appCode].includes(moduleCode)) {
                selectedModules[appCode].push(moduleCode);
              }
              
              // Add permissions
              const moduleKey = `${appCode}.${moduleCode}`;
              if (!selectedPermissions[moduleKey]) {
                selectedPermissions[moduleKey] = [];
              }
              selectedPermissions[moduleKey] = [...modulePerms];
            }
          });
        }
      });
    }

    console.log('✅ Parsed permissions result:', { selectedApps, selectedModules, selectedPermissions });
    return { selectedApps, selectedModules, selectedPermissions };
  };

  // Toggle application selection
  const toggleAppSelection = (appCode: string) => {
    setRoleData(prev => {
      const newSelectedApps = prev.selectedApps.includes(appCode)
        ? prev.selectedApps.filter(code => code !== appCode)
        : [...prev.selectedApps, appCode];
      
      // If deselecting app, remove all its modules and permissions
      const newSelectedModules = { ...prev.selectedModules };
      const newSelectedPermissions = { ...prev.selectedPermissions };
      
      if (!newSelectedApps.includes(appCode)) {
        delete newSelectedModules[appCode];
        // Remove all permissions for this app's modules
        Object.keys(newSelectedPermissions).forEach(key => {
          if (key.startsWith(`${appCode}.`)) {
            delete newSelectedPermissions[key];
          }
        });
      }
      
      return {
        ...prev,
        selectedApps: newSelectedApps,
        selectedModules: newSelectedModules,
        selectedPermissions: newSelectedPermissions
      };
    });
  };

  // Toggle module selection
  const toggleModuleSelection = (appCode: string, moduleCode: string) => {
    setRoleData(prev => {
      const appModules = prev.selectedModules[appCode] || [];
      const newAppModules = appModules.includes(moduleCode)
        ? appModules.filter(code => code !== moduleCode)
        : [...appModules, moduleCode];
      
      const newSelectedModules = {
        ...prev.selectedModules,
        [appCode]: newAppModules
      };
      
      // If deselecting module, remove all its permissions
      const newSelectedPermissions = { ...prev.selectedPermissions };
      const moduleKey = `${appCode}.${moduleCode}`;
      
      if (!newAppModules.includes(moduleCode)) {
        delete newSelectedPermissions[moduleKey];
      }
      
      return {
        ...prev,
        selectedModules: newSelectedModules,
        selectedPermissions: newSelectedPermissions
      };
    });
  };

  // Toggle permission selection
  const togglePermissionSelection = (appCode: string, moduleCode: string, permissionCode: string) => {
    const moduleKey = `${appCode}.${moduleCode}`;
    
    setRoleData(prev => {
      const modulePermissions = prev.selectedPermissions[moduleKey] || [];
      const newModulePermissions = modulePermissions.includes(permissionCode)
        ? modulePermissions.filter(code => code !== permissionCode)
        : [...modulePermissions, permissionCode];
      
      return {
        ...prev,
        selectedPermissions: {
          ...prev.selectedPermissions,
          [moduleKey]: newModulePermissions
        }
      };
    });
  };

  // Quick select all permissions for a module
  const selectAllModulePermissions = (appCode: string, moduleCode: string) => {
    const app = applications.find(a => a.appCode === appCode);
    const module = app?.modules.find(m => m.moduleCode === moduleCode);
    
    if (module) {
      const moduleKey = `${appCode}.${moduleCode}`;
      const allPermissions = module.permissions.map(p => p.code);
      
      setRoleData(prev => ({
        ...prev,
        selectedPermissions: {
          ...prev.selectedPermissions,
          [moduleKey]: allPermissions
        }
      }));
    }
  };

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalApps = roleData.selectedApps.length;
    const totalModules = Object.values(roleData.selectedModules).reduce((sum, modules) => sum + modules.length, 0);
    const totalPermissions = Object.values(roleData.selectedPermissions).reduce((sum, perms) => sum + perms.length, 0);

    // Calculate estimated credit cost for selected permissions
    let estimatedCredits = 0;
    const selectedPermDetails: Array<{ code: string; cost: number; unit: string; isGlobal: boolean }> = [];

    roleData.selectedApps.forEach(appCode => {
      const app = applications.find(a => a.appCode === appCode);
      if (app) {
        const selectedModules = roleData.selectedModules[appCode] || [];
        selectedModules.forEach(moduleCode => {
          const module = app.modules.find(m => m.moduleCode === moduleCode);
          if (module) {
            const selectedPerms = roleData.selectedPermissions[`${appCode}.${moduleCode}`] || [];
            selectedPerms.forEach(permCode => {
              const permission = module.permissions.find(p => p.code === permCode);
              // NOTE: Fix: creditCost does not exist on type 'Permission', so check for .cost, .unit, .unitMultiplier, .isGlobal directly on permission
              if (
                typeof permission?.creditCost === 'object' &&
                permission.creditCost !== null &&
                typeof permission.cost === 'number' &&
                typeof permission.unitMultiplier === 'number' &&
                typeof permission.unit === 'string'
              ) {
                const cost = permission.cost * permission.unitMultiplier;
                estimatedCredits += cost;
                selectedPermDetails.push({
                  code: `${appCode}.${moduleCode}.${permCode}`,
                  cost: permission.creditCost.cost,
                  unit: permission.creditCost.unit,
                  isGlobal: permission.creditCost.isGlobal
                });
              }
            });
          }
        });
      }
    });

    return { totalApps, totalModules, totalPermissions, estimatedCredits, selectedPermDetails };
  }, [roleData, applications]);

  // Save role using the backend API
  const handleSave = async () => {
    if (!roleData.roleName.trim()) {
      toast.error('Please enter a role name');
      return;
    }

    if (summary.totalPermissions === 0) {
      toast.error('Please select at least one permission');
      return;
    }

    try {
      setSaving(true);
      
      // Check if we're editing an existing role or creating a new one
      const isEditing = initialRole?.roleId;
      const roleName = roleData.roleName;
      
      if (isEditing) {
        console.log('🔄 Updating existing role:', initialRole.roleId, 'with name:', roleName);
        
        // For editing, use the builder-specific update endpoint
        const response = await api.put(`/custom-roles/update-from-builder/${initialRole.roleId}`, {
          roleName: roleData.roleName,
          description: roleData.description,
          selectedApps: roleData.selectedApps,
          selectedModules: roleData.selectedModules,
          selectedPermissions: roleData.selectedPermissions,
          restrictions: roleData.restrictions
        });
        
        if (response.data.success) {
          console.log('✅ Role updated successfully:', response.data.data);
          toast.success(`Role "${roleData.roleName}" updated successfully with ${summary.totalPermissions} permissions!`);
          onSave?.(response.data.data);
        } else {
          toast.error('Failed to update role: ' + response.data.error);
        }
        
      } else {
        console.log('➕ Creating new role from applications and modules...', roleData);
        
        // Call the backend API that creates roles from apps/modules
        const response = await api.post('/api/custom-roles/create-from-builder', {
          roleName: roleData.roleName,
          description: roleData.description,
          selectedApps: roleData.selectedApps,
          selectedModules: roleData.selectedModules,
          selectedPermissions: roleData.selectedPermissions,
          restrictions: roleData.restrictions
        });
        
        if (response.data.success) {
          console.log('✅ Role created successfully:', response.data.data);
          toast.success(`Role "${roleData.roleName}" created successfully with ${summary.totalPermissions} permissions!`);
          onSave?.(response.data.data);
        } else {
          toast.error('Failed to create role: ' + response.data.error);
        }
      }
      
    } catch (error) {
      console.error('❌ Error saving role:', error);
      toast.error(isEditing ? 'Failed to update role' : 'Failed to create role');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading applications and modules...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <PearlButton onClick={() => window.location.reload()}>
            Retry
          </PearlButton>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen rounded-xl relative ${
      actualTheme === 'dark'
        ? 'bg-black text-white'
        : actualTheme === 'monochrome'
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100'
        : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Background */}
      <div className={`absolute inset-0 ${glassmorphismEnabled ? 'bg-gradient-to-br from-violet-100/30 via-purple-100/15 to-indigo-100/10 dark:from-slate-950/40 dark:via-slate-900/25 dark:to-slate-950/40 backdrop-blur-3xl' : ''}`}></div>

      {/* Purple gradient glassy effect */}
      {glassmorphismEnabled && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-200/12 via-violet-200/8 to-indigo-200/10 dark:from-purple-500/10 dark:via-violet-500/6 dark:to-indigo-500/8 backdrop-blur-3xl"></div>
      )}

      {/* Background Pattern */}
      {(actualTheme === 'dark' || actualTheme === 'monochrome') && (
        <div className="absolute inset-0 opacity-30">
          <Pattern />
        </div>
      )}

      {/* Floating decorative elements for glassy mode */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-16 left-16 w-48 h-48 rounded-full blur-3xl animate-pulse ${glassmorphismEnabled ? 'bg-gradient-to-r from-purple-200/20 to-violet-200/20 dark:from-purple-400/12 dark:to-violet-400/12 backdrop-blur-3xl border border-purple-300/30 dark:border-purple-600/30' : 'hidden'}`}></div>
        <div className={`absolute top-32 right-32 w-44 h-44 rounded-full blur-3xl animate-pulse ${glassmorphismEnabled ? 'bg-gradient-to-r from-violet-200/20 to-indigo-200/20 dark:from-violet-400/10 dark:to-indigo-400/10 backdrop-blur-3xl border border-violet-300/30 dark:border-violet-600/30' : 'hidden'}`} style={{animationDelay: '1.5s'}}></div>
        <div className={`absolute bottom-48 left-20 w-36 h-36 rounded-full blur-3xl animate-pulse ${glassmorphismEnabled ? 'bg-gradient-to-r from-indigo-200/20 to-purple-200/20 dark:from-indigo-400/8 dark:to-purple-400/8 backdrop-blur-3xl border border-indigo-300/30 dark:border-indigo-600/30' : 'hidden'}`} style={{animationDelay: '3s'}}></div>
        <div className={`absolute top-1/2 right-16 w-28 h-28 rounded-full blur-2xl animate-pulse ${glassmorphismEnabled ? 'bg-gradient-to-r from-pink-200/15 to-purple-200/15 dark:from-pink-400/6 dark:to-purple-400/6 backdrop-blur-3xl border border-pink-300/30 dark:border-pink-600/30' : 'hidden'}`} style={{animationDelay: '4.5s'}}></div>

        {/* Purple gradient glassy floating elements */}
        {glassmorphismEnabled && (
          <>
            <div className="absolute top-1/4 left-1/3 w-32 h-32 rounded-full blur-2xl animate-pulse bg-gradient-to-r from-purple-200/12 to-violet-200/8 dark:from-purple-400/6 dark:to-violet-400/4 backdrop-blur-3xl border border-purple-300/40 dark:border-purple-600/25" style={{animationDelay: '2s'}}></div>
            <div className="absolute bottom-1/4 right-1/3 w-24 h-24 rounded-full blur-xl animate-pulse bg-gradient-to-r from-violet-200/10 to-indigo-200/6 dark:from-violet-400/5 dark:to-indigo-400/3 backdrop-blur-3xl border border-violet-300/35 dark:border-violet-600/20" style={{animationDelay: '5.5s'}}></div>
            <div className="absolute top-3/4 left-1/2 w-20 h-20 rounded-full blur-lg animate-pulse bg-gradient-to-r from-indigo-200/8 to-purple-200/6 dark:from-indigo-400/4 dark:to-purple-400/3 backdrop-blur-3xl border border-indigo-300/30 dark:border-indigo-600/15" style={{animationDelay: '7s'}}></div>
          </>
        )}
      </div>

      {/* Content with enhanced glassmorphism card effect */}
      <div className="relative z-10">
        {/* Purple gradient glassy effect */}
        {glassmorphismEnabled && (
          <div className="absolute inset-0 backdrop-blur-3xl bg-gradient-to-br from-purple-200/8 via-violet-200/5 to-indigo-200/6 dark:from-purple-500/6 dark:via-violet-500/3 dark:to-indigo-500/4 rounded-3xl"></div>
        )}
        <div className={`${glassmorphismEnabled ? 'backdrop-blur-3xl bg-purple-100/4 dark:bg-purple-900/6 border border-purple-300/60 dark:border-purple-600/50 rounded-3xl shadow-2xl ring-1 ring-purple-300/35 dark:ring-purple-600/25' : ''}`}>
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className={`rounded-xl shadow-lg p-6 md:p-8 ${
        actualTheme === 'dark'
          ? glassmorphismEnabled
            ? 'bg-gradient-to-r from-purple-900 to-slate-900 text-white border border-purple-500/30'
            : 'bg-slate-900 text-white border border-slate-700'
          : actualTheme === 'monochrome'
          ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-gray-100 border border-gray-500/30'
          : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
      }`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3 mb-3">
              <Shield className={`w-7 h-7 md:w-8 md:h-8 ${
                actualTheme === 'dark'
                  ? glassmorphismEnabled
                    ? 'text-purple-300'
                    : 'text-slate-300'
                  : actualTheme === 'monochrome'
                  ? 'text-gray-300'
                  : 'text-blue-100'
              }`} />
              {initialRole?.roleId ? 'Edit Custom Role' : 'Create Custom Role'}
            </h2>
            <p className={`text-base md:text-lg leading-relaxed ${
              actualTheme === 'dark'
                ? glassmorphismEnabled
                  ? 'text-purple-200'
                  : 'text-slate-200'
                : actualTheme === 'monochrome'
                ? 'text-gray-300'
                : 'text-blue-100'
            }`}>
              {initialRole?.roleId ? 'Update role permissions by selecting applications, modules, and specific permissions' : 'Build custom roles by selecting applications, modules, and specific permissions'}
            </p>
          </div>
          
          <div className="flex-shrink-0">
            <div className={`rounded-xl p-4 text-center min-w-[140px] ${
              actualTheme === 'dark'
                ? glassmorphismEnabled
                  ? 'bg-purple-800/30 backdrop-blur-sm border border-purple-500/30'
                  : 'bg-slate-800/50 backdrop-blur-sm border border-slate-600'
                : actualTheme === 'monochrome'
                ? 'bg-gray-800/30 backdrop-blur-sm border border-gray-500/30'
                : 'bg-white/20 backdrop-blur-sm'
            }`}>
              <div className={`text-sm font-medium mb-1 ${
                actualTheme === 'dark'
                  ? glassmorphismEnabled
                    ? 'text-purple-200'
                    : 'text-slate-200'
                  : actualTheme === 'monochrome'
                  ? 'text-gray-200'
                  : 'text-white/90'
              }`}>Available Resources</div>
              <div className={`text-3xl font-bold mb-1 ${
                actualTheme === 'dark'
                  ? 'text-white'
                  : actualTheme === 'monochrome'
                  ? 'text-gray-100'
                  : 'text-white'
              }`}>{applications.length}</div>
              <div className={`text-sm ${
                actualTheme === 'dark'
                  ? glassmorphismEnabled
                    ? 'text-purple-300'
                    : 'text-slate-300'
                  : actualTheme === 'monochrome'
                  ? 'text-gray-300'
                  : 'text-blue-100'
              }`}>Applications</div>
            </div>
          </div>
        </div>
      </div>

      {/* Role Details Form */}
      <div className={`rounded-xl shadow-sm border p-6 ${
        actualTheme === 'dark'
          ? glassmorphismEnabled
            ? 'bg-slate-900/95 border-purple-500/30'
            : 'bg-slate-900 border-slate-700'
          : actualTheme === 'monochrome'
          ? 'bg-gray-900/95 border-gray-500/30'
          : 'bg-white border-gray-200'
      }`}>
        <h3 className={`text-xl font-semibold mb-6 flex items-center gap-2 ${
          actualTheme === 'dark'
            ? glassmorphismEnabled
              ? 'text-white'
              : 'text-slate-100'
            : actualTheme === 'monochrome'
            ? 'text-gray-100'
            : 'text-gray-900'
        }`}>
          <Users className={`w-5 h-5 ${
            actualTheme === 'dark'
              ? glassmorphismEnabled
                ? 'text-purple-400'
                : 'text-slate-400'
              : actualTheme === 'monochrome'
              ? 'text-gray-400'
              : 'text-blue-600'
          }`} />
          Role Information
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
              actualTheme === 'dark'
                ? glassmorphismEnabled
                  ? 'text-purple-200'
                  : 'text-slate-200'
                : actualTheme === 'monochrome'
                ? 'text-gray-200'
                : 'text-gray-700'
            }`}>
              Role Name *
            </label>
            <input
              type="text"
              value={roleData.roleName}
              onChange={(e) => setRoleData(prev => ({ ...prev, roleName: e.target.value }))}
              placeholder="e.g., Sales Manager, HR Specialist, Project Lead"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 text-base transition-colors ${
                actualTheme === 'dark'
                  ? glassmorphismEnabled
                    ? 'bg-slate-800/50 border-purple-500/30 text-white placeholder-purple-300 focus:ring-purple-500 focus:border-purple-500'
                    : 'bg-slate-800 border-slate-600 text-white placeholder-slate-400 focus:ring-slate-400 focus:border-slate-400'
                  : actualTheme === 'monochrome'
                  ? 'bg-gray-800/50 border-gray-500/30 text-gray-100 placeholder-gray-400 focus:ring-gray-400 focus:border-gray-400'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
            />
          </div>
          
          <div className="space-y-2">
            <label className={`block text-sm font-semibold ${
              actualTheme === 'dark'
                ? glassmorphismEnabled
                  ? 'text-purple-200'
                  : 'text-slate-200'
                : actualTheme === 'monochrome'
                ? 'text-gray-200'
                : 'text-gray-700'
            }`}>
              Description
            </label>
            <input
              type="text"
              value={roleData.description}
              onChange={(e) => setRoleData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of this role's responsibilities"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 text-base transition-colors ${
                actualTheme === 'dark'
                  ? glassmorphismEnabled
                    ? 'bg-slate-800/50 border-purple-500/30 text-white placeholder-purple-300 focus:ring-purple-500 focus:border-purple-500'
                    : 'bg-slate-800 border-slate-600 text-white placeholder-slate-400 focus:ring-slate-400 focus:border-slate-400'
                  : actualTheme === 'monochrome'
                  ? 'bg-gray-800/50 border-gray-500/30 text-gray-100 placeholder-gray-400 focus:ring-gray-400 focus:border-gray-400'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Progress Summary */}
      <div className={`rounded-xl shadow-sm border p-6 ${
        actualTheme === 'dark'
          ? glassmorphismEnabled
            ? 'bg-slate-900/95 border-purple-500/30'
            : 'bg-slate-900 border-slate-700'
          : actualTheme === 'monochrome'
          ? 'bg-gray-900/95 border-gray-500/30'
          : 'bg-white border-gray-200'
      }`}>
        <h3 className={`text-lg font-semibold mb-6 ${
          actualTheme === 'dark'
            ? glassmorphismEnabled
              ? 'text-white'
              : 'text-slate-100'
            : actualTheme === 'monochrome'
            ? 'text-gray-100'
            : 'text-gray-900'
        }`}>Selection Progress</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`rounded-xl p-5 ${
            actualTheme === 'dark'
              ? glassmorphismEnabled
                ? 'bg-gradient-to-br from-purple-900/50 to-purple-800/50 border border-purple-500/30'
                : 'bg-slate-800/50 border border-slate-600'
              : actualTheme === 'monochrome'
              ? 'bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-500/30'
              : 'bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200'
          }`}>
            <div className="flex items-center gap-4 mb-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                actualTheme === 'dark'
                  ? glassmorphismEnabled
                    ? 'bg-purple-600'
                    : 'bg-slate-600'
                  : actualTheme === 'monochrome'
                  ? 'bg-gray-600'
                  : 'bg-blue-600'
              }`}>
                <Building className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className={`text-2xl font-bold ${
                  actualTheme === 'dark'
                    ? glassmorphismEnabled
                      ? 'text-purple-200'
                      : 'text-slate-200'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-200'
                    : 'text-blue-800'
                }`}>{summary.totalApps}</div>
                <div className={`text-sm font-semibold ${
                  actualTheme === 'dark'
                    ? glassmorphismEnabled
                      ? 'text-purple-300'
                      : 'text-slate-300'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-300'
                    : 'text-blue-600'
                }`}>Applications Selected</div>
              </div>
            </div>
            <div className={`text-xs font-medium ${
              actualTheme === 'dark'
                ? glassmorphismEnabled
                  ? 'text-purple-300'
                  : 'text-slate-300'
                : actualTheme === 'monochrome'
                ? 'text-gray-300'
                : 'text-blue-700'
            }`}>
              {summary.totalApps > 0 ? `${summary.totalApps} of ${applications.length} apps chosen` : 'No applications selected yet'}
            </div>
          </div>
          
          <div className={`rounded-xl p-5 ${
            actualTheme === 'dark'
              ? glassmorphismEnabled
                ? 'bg-gradient-to-br from-green-900/50 to-green-800/50 border border-green-500/30'
                : 'bg-slate-800/50 border border-slate-600'
              : actualTheme === 'monochrome'
              ? 'bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-500/30'
              : 'bg-gradient-to-br from-green-50 to-green-100 border border-green-200'
          }`}>
            <div className="flex items-center gap-4 mb-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                actualTheme === 'dark'
                  ? glassmorphismEnabled
                    ? 'bg-green-600'
                    : 'bg-slate-600'
                  : actualTheme === 'monochrome'
                  ? 'bg-gray-600'
                  : 'bg-green-600'
              }`}>
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className={`text-2xl font-bold ${
                  actualTheme === 'dark'
                    ? glassmorphismEnabled
                      ? 'text-green-200'
                      : 'text-slate-200'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-200'
                    : 'text-green-800'
                }`}>{summary.totalModules}</div>
                <div className={`text-sm font-semibold ${
                  actualTheme === 'dark'
                    ? glassmorphismEnabled
                      ? 'text-green-300'
                      : 'text-slate-300'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-300'
                    : 'text-green-600'
                }`}>Modules Selected</div>
              </div>
            </div>
            <div className={`text-xs font-medium ${
              actualTheme === 'dark'
                ? glassmorphismEnabled
                  ? 'text-green-300'
                  : 'text-slate-300'
                : actualTheme === 'monochrome'
                ? 'text-gray-300'
                : 'text-green-700'
            }`}>
              {summary.totalModules > 0 ? `${summary.totalModules} modules across selected apps` : 'No modules selected yet'}
            </div>
          </div>
          
          <div className={`rounded-xl p-5 ${
            actualTheme === 'dark'
              ? glassmorphismEnabled
                ? 'bg-gradient-to-br from-indigo-900/50 to-indigo-800/50 border border-indigo-500/30'
                : 'bg-slate-800/50 border border-slate-600'
              : actualTheme === 'monochrome'
              ? 'bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-500/30'
              : 'bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200'
          }`}>
            <div className="flex items-center gap-4 mb-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                actualTheme === 'dark'
                  ? glassmorphismEnabled
                    ? 'bg-indigo-600'
                    : 'bg-slate-600'
                  : actualTheme === 'monochrome'
                  ? 'bg-gray-600'
                  : 'bg-purple-600'
              }`}>
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className={`text-2xl font-bold ${
                  actualTheme === 'dark'
                    ? glassmorphismEnabled
                      ? 'text-indigo-200'
                      : 'text-slate-200'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-200'
                    : 'text-purple-800'
                }`}>{summary.totalPermissions}</div>
                <div className={`text-sm font-semibold ${
                  actualTheme === 'dark'
                    ? glassmorphismEnabled
                      ? 'text-indigo-300'
                      : 'text-slate-300'
                    : actualTheme === 'monochrome'
                    ? 'text-gray-300'
                    : 'text-purple-600'
                }`}>Permissions Selected</div>
              </div>
            </div>
            <div className={`text-xs font-medium ${
              actualTheme === 'dark'
                ? glassmorphismEnabled
                  ? 'text-indigo-300'
                  : 'text-slate-300'
                : actualTheme === 'monochrome'
                ? 'text-gray-300'
                : 'text-purple-700'
            }`}>
              {summary.totalPermissions > 0 ? `${summary.totalPermissions} specific operations enabled` : 'No permissions selected yet'}
            </div>
          </div>
        </div>
      </div>

      {/* Applications & Modules Selection */}
      <div className={`rounded-xl shadow-sm border p-6 ${
        actualTheme === 'dark'
          ? glassmorphismEnabled
            ? 'bg-slate-900/95 border-purple-500/30'
            : 'bg-slate-900 border-slate-700'
          : actualTheme === 'monochrome'
          ? 'bg-gray-900/95 border-gray-500/30'
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <h3 className={`text-xl font-semibold flex items-center gap-3 ${
            actualTheme === 'dark'
              ? glassmorphismEnabled
                ? 'text-white'
                : 'text-slate-100'
              : actualTheme === 'monochrome'
              ? 'text-gray-100'
              : 'text-gray-900'
          }`}>
            <Layers className={`w-6 h-6 ${
              actualTheme === 'dark'
                ? glassmorphismEnabled
                  ? 'text-purple-400'
                  : 'text-slate-400'
                : actualTheme === 'monochrome'
                ? 'text-gray-400'
                : 'text-blue-600'
            }`} />
            Select Applications & Configure Permissions
          </h3>
          <div className={`text-sm text-right ${
            actualTheme === 'dark'
              ? glassmorphismEnabled
                ? 'text-purple-300'
                : 'text-slate-300'
              : actualTheme === 'monochrome'
              ? 'text-gray-300'
              : 'text-gray-500'
          }`}>
            Click applications to expand and select modules and permissions
          </div>
        </div>

        <div className="space-y-8">
          {applications.map((app) => {
            const isAppSelected = roleData.selectedApps.includes(app.appCode);
            const isExpanded = expandedApps.has(app.appCode);
            const selectedModules = roleData.selectedModules[app.appCode] || [];
            
            return (
              <div 
                key={app.appCode} 
                className={`border-2 rounded-xl transition-all duration-200 ${
                  isAppSelected 
                    ? actualTheme === 'dark'
                      ? glassmorphismEnabled
                        ? 'border-purple-500/50 bg-purple-900/20 shadow-lg'
                        : 'border-slate-500/50 bg-slate-800/30 shadow-lg'
                      : actualTheme === 'monochrome'
                      ? 'border-gray-500/50 bg-gray-900/20 shadow-lg'
                      : 'border-blue-300 bg-blue-50 shadow-lg'
                    : actualTheme === 'dark'
                      ? glassmorphismEnabled
                        ? 'border-purple-500/30 bg-slate-800/50 hover:border-purple-400/50 hover:shadow-md'
                        : 'border-slate-500/30 bg-slate-800/70 hover:border-slate-400/50 hover:shadow-md'
                      : actualTheme === 'monochrome'
                      ? 'border-gray-500/30 bg-gray-800/50 hover:border-gray-400/50 hover:shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
              >
                {/* Application Header */}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <button
                        onClick={() => toggleAppSelection(app.appCode)}
                        className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all duration-200 ${
                          isAppSelected 
                            ? actualTheme === 'dark'
                              ? glassmorphismEnabled
                                ? 'bg-purple-600 border-purple-600 text-white shadow-lg'
                                : 'bg-slate-600 border-slate-600 text-white shadow-lg'
                              : actualTheme === 'monochrome'
                              ? 'bg-gray-600 border-gray-600 text-white shadow-lg'
                              : 'bg-blue-600 border-blue-600 text-white shadow-lg'
                            : actualTheme === 'dark'
                              ? glassmorphismEnabled
                                ? 'border-purple-500/30 hover:border-purple-400 hover:bg-purple-900/30'
                                : 'border-slate-500/30 hover:border-slate-400 hover:bg-slate-800/40'
                              : actualTheme === 'monochrome'
                              ? 'border-gray-500/30 hover:border-gray-400 hover:bg-gray-900/30'
                            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                        }`}
                      >
                        {isAppSelected && <Check className="w-5 h-5" />}
                      </button>
                      
                      <div className="flex-1">
                        <h4 className={`text-xl font-bold flex items-center gap-3 mb-2 ${
                          actualTheme === 'dark'
                            ? glassmorphismEnabled
                              ? 'text-white'
                              : 'text-slate-100'
                            : actualTheme === 'monochrome'
                            ? 'text-gray-100'
                            : 'text-gray-900'
                        }`}>
                          <Building className={`w-6 h-6 ${
                            actualTheme === 'dark'
                              ? glassmorphismEnabled
                                ? 'text-purple-400'
                                : 'text-slate-400'
                              : actualTheme === 'monochrome'
                              ? 'text-gray-400'
                              : 'text-blue-600'
                          }`} />
                          {app.appName}
                        </h4>
                        <p className={`mb-3 ${
                          actualTheme === 'dark'
                            ? glassmorphismEnabled
                              ? 'text-purple-200'
                              : 'text-slate-200'
                            : actualTheme === 'monochrome'
                            ? 'text-gray-300'
                            : 'text-gray-600'
                        }`}>{app.description}</p>
                        <div className="flex items-center gap-4">
                          <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                            actualTheme === 'dark'
                              ? glassmorphismEnabled
                                ? 'bg-purple-900/50 text-purple-200'
                                : 'bg-slate-700/50 text-slate-200'
                              : actualTheme === 'monochrome'
                              ? 'bg-gray-900/50 text-gray-200'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {app.modules.length} modules available
                          </span>
                          <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                            actualTheme === 'dark'
                              ? glassmorphismEnabled
                                ? 'bg-purple-800/50 text-purple-200'
                                : 'bg-slate-600/50 text-slate-200'
                              : actualTheme === 'monochrome'
                              ? 'bg-gray-800/50 text-gray-200'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {app.subscriptionTier} tier
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      {isAppSelected && (
                        <div className="text-right">
                          <div className={`text-lg font-bold ${
                            actualTheme === 'dark'
                              ? glassmorphismEnabled
                                ? 'text-purple-300'
                                : 'text-slate-300'
                              : actualTheme === 'monochrome'
                              ? 'text-gray-300'
                              : 'text-blue-600'
                          }`}>
                            {selectedModules.length}/{app.modules.length}
                          </div>
                          <div className={`text-sm font-medium ${
                            actualTheme === 'dark'
                              ? glassmorphismEnabled
                                ? 'text-purple-400'
                                : 'text-slate-400'
                              : actualTheme === 'monochrome'
                              ? 'text-gray-400'
                              : 'text-blue-600'
                          }`}>modules selected</div>
                        </div>
                      )}
                      <button
                        onClick={() => setExpandedApps(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(app.appCode)) {
                            newSet.delete(app.appCode);
                          } else {
                            newSet.add(app.appCode);
                          }
                          return newSet;
                        })}
                        className={`p-3 rounded-xl transition-colors ${
                          isExpanded
                            ? actualTheme === 'dark'
                              ? glassmorphismEnabled
                                ? 'bg-purple-900/50 text-purple-200'
                                : 'bg-slate-700/50 text-slate-200'
                              : actualTheme === 'monochrome'
                              ? 'bg-gray-900/50 text-gray-200'
                              : 'bg-gray-100 text-gray-700'
                            : actualTheme === 'dark'
                              ? glassmorphismEnabled
                                ? 'hover:bg-purple-900/30 text-purple-300'
                                : 'hover:bg-slate-800/40 text-slate-300'
                              : actualTheme === 'monochrome'
                              ? 'hover:bg-gray-900/30 text-gray-300'
                              : 'hover:bg-gray-100 text-gray-500'
                        }`}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-6 h-6" />
                        ) : (
                          <ChevronRight className="w-6 h-6" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Modules */}
                {isExpanded && isAppSelected && (
                  <div className={`border-t p-6 ${
                    actualTheme === 'dark'
                      ? glassmorphismEnabled
                        ? 'border-purple-500/30 bg-slate-800/60'
                        : 'border-slate-600 bg-slate-800/70'
                      : actualTheme === 'monochrome'
                      ? 'border-gray-500/30 bg-gray-800/60'
                      : 'border-blue-200 bg-white/90'
                  }`}>
                    <div className="mb-6">
                      <h5 className={`text-lg font-semibold mb-2 ${
                        actualTheme === 'dark'
                          ? glassmorphismEnabled
                            ? 'text-purple-200'
                            : 'text-slate-200'
                          : actualTheme === 'monochrome'
                          ? 'text-gray-200'
                          : 'text-gray-800'
                      }`}>Available Modules</h5>
                      <p className={`text-sm ${
                        actualTheme === 'dark'
                          ? glassmorphismEnabled
                            ? 'text-purple-300'
                            : 'text-slate-300'
                          : actualTheme === 'monochrome'
                          ? 'text-gray-300'
                          : 'text-gray-600'
                      }`}>Select modules to enable specific functionality within {app.appName}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      {app.modules.map((module) => {
                        const isModuleSelected = selectedModules.includes(module.moduleCode);
                        const moduleKey = `${app.appCode}.${module.moduleCode}`;
                        const selectedPermissions = roleData.selectedPermissions[moduleKey] || [];
                        
                        return (
                          <div 
                            key={module.moduleCode}
                            className={`border-2 rounded-xl transition-all duration-200 ${
                              isModuleSelected 
                                ? actualTheme === 'dark'
                                  ? glassmorphismEnabled
                                    ? 'border-green-500/50 bg-green-900/30 shadow-md'
                                    : 'border-green-600/50 bg-green-900/40 shadow-md'
                                  : actualTheme === 'monochrome'
                                  ? 'border-green-500/50 bg-green-900/30 shadow-md'
                                  : 'border-green-300 bg-green-50 shadow-md'
                                : actualTheme === 'dark'
                                  ? glassmorphismEnabled
                                    ? 'border-purple-500/30 bg-slate-700/40 hover:border-green-400/50'
                                    : 'border-slate-600 bg-slate-700/50 hover:border-green-500/50'
                                  : actualTheme === 'monochrome'
                                  ? 'border-gray-500/30 bg-gray-700/40 hover:border-green-400/50'
                                : 'border-gray-200 bg-white hover:border-green-200'
                            }`}
                          >
                            {/* Module Header */}
                            <div className="p-5">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                  <button
                                    onClick={() => toggleModuleSelection(app.appCode, module.moduleCode)}
                                    className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                                      isModuleSelected 
                                        ? actualTheme === 'dark'
                                          ? glassmorphismEnabled
                                        ? 'bg-green-600 border-green-600 text-white' 
                                            : 'bg-green-700 border-green-700 text-white'
                                          : actualTheme === 'monochrome'
                                          ? 'bg-green-600 border-green-600 text-white'
                                          : 'bg-green-600 border-green-600 text-white'
                                        : actualTheme === 'dark'
                                          ? glassmorphismEnabled
                                            ? 'border-purple-500/30 hover:border-green-400 hover:bg-green-900/30'
                                            : 'border-slate-500/30 hover:border-green-500 hover:bg-green-900/40'
                                          : actualTheme === 'monochrome'
                                          ? 'border-gray-500/30 hover:border-green-400 hover:bg-green-900/30'
                                        : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
                                    }`}
                                  >
                                    {isModuleSelected && <Check className="w-4 h-4" />}
                                  </button>
                                  
                                  <div className="flex-1">
                                    <h6 className={`font-bold flex items-center gap-2 mb-1 ${
                                      actualTheme === 'dark'
                                        ? glassmorphismEnabled
                                          ? 'text-green-200'
                                          : 'text-slate-200'
                                        : actualTheme === 'monochrome'
                                        ? 'text-gray-200'
                                        : 'text-gray-900'
                                    }`}>
                                      <Package className={`w-4 h-4 ${
                                        actualTheme === 'dark'
                                          ? glassmorphismEnabled
                                            ? 'text-green-400'
                                            : 'text-green-500'
                                          : actualTheme === 'monochrome'
                                          ? 'text-green-400'
                                          : 'text-green-600'
                                      }`} />
                                      {module.moduleName}
                                      {module.isCore && (
                                        <span className={`text-xs px-2 py-1 rounded-md font-medium ${
                                          actualTheme === 'dark'
                                            ? glassmorphismEnabled
                                              ? 'bg-orange-900/50 text-orange-300'
                                              : 'bg-orange-800/50 text-orange-200'
                                            : actualTheme === 'monochrome'
                                            ? 'bg-orange-900/50 text-orange-300'
                                            : 'bg-orange-100 text-orange-700'
                                        }`}>
                                          CORE
                                        </span>
                                      )}
                                    </h6>
                                    <p className={`text-sm ${
                                      actualTheme === 'dark'
                                        ? glassmorphismEnabled
                                          ? 'text-green-300'
                                          : 'text-slate-300'
                                        : actualTheme === 'monochrome'
                                        ? 'text-gray-300'
                                        : 'text-gray-600'
                                    }`}>{module.description}</p>
                                  </div>
                                </div>
                                
                                {isModuleSelected && (
                                  <div className="text-right">
                                    <div className={`text-base font-bold ${
                                      actualTheme === 'dark'
                                        ? glassmorphismEnabled
                                          ? 'text-green-400'
                                          : 'text-green-300'
                                        : actualTheme === 'monochrome'
                                        ? 'text-green-400'
                                        : 'text-green-600'
                                    }`}>
                                      {selectedPermissions.length}/{module.permissions.length}
                                    </div>
                                    <div className={`text-xs font-medium ${
                                      actualTheme === 'dark'
                                        ? glassmorphismEnabled
                                          ? 'text-green-500'
                                          : 'text-green-400'
                                        : actualTheme === 'monochrome'
                                        ? 'text-green-500'
                                        : 'text-green-600'
                                    }`}>permissions</div>
                                  </div>
                                )}
                              </div>

                              {/* Permissions */}
                              {isModuleSelected && (
                                <div className={`mt-5 pt-5 border-t ${
                                  actualTheme === 'dark'
                                    ? glassmorphismEnabled
                                      ? 'border-green-500/30'
                                      : 'border-green-600/30'
                                    : actualTheme === 'monochrome'
                                    ? 'border-green-500/30'
                                    : 'border-green-200'
                                }`}>
                                  <div className="flex items-center justify-between mb-4">
                                    <h6 className={`text-sm font-semibold flex items-center gap-2 ${
                                      actualTheme === 'dark'
                                        ? glassmorphismEnabled
                                          ? 'text-green-200'
                                          : 'text-slate-200'
                                        : actualTheme === 'monochrome'
                                        ? 'text-gray-200'
                                        : 'text-gray-700'
                                    }`}>
                                      <Shield className={`w-4 h-4 ${
                                        actualTheme === 'dark'
                                          ? glassmorphismEnabled
                                            ? 'text-purple-400'
                                            : 'text-purple-500'
                                          : actualTheme === 'monochrome'
                                          ? 'text-purple-400'
                                          : 'text-purple-600'
                                      }`} />
                                      Permissions ({module.permissions.length} available)
                                    </h6>
                                    <PearlButton
                                      onClick={() => selectAllModulePermissions(app.appCode, module.moduleCode)}
                                      variant="outline"
                                      size="sm"
                                    >
                                      Select All
                                    </PearlButton>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
                                    {module.permissions.map((permission) => {
                                      const isPermSelected = selectedPermissions.includes(permission.code);

                                      return (
                                        <label
                                          key={permission.code}
                                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-150 ${
                                            isPermSelected
                                              ? actualTheme === 'dark'
                                                ? glassmorphismEnabled
                                                  ? 'border-purple-500/50 bg-purple-900/30 shadow-sm'
                                                  : 'border-purple-600/50 bg-purple-900/40 shadow-sm'
                                                : actualTheme === 'monochrome'
                                                ? 'border-purple-500/50 bg-purple-900/30 shadow-sm'
                                                : 'border-purple-300 bg-purple-50 shadow-sm'
                                              : actualTheme === 'dark'
                                                ? glassmorphismEnabled
                                                  ? 'border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-900/20'
                                                  : 'border-slate-600 hover:border-purple-500/50 hover:bg-purple-900/30'
                                                : actualTheme === 'monochrome'
                                                ? 'border-gray-500/30 hover:border-purple-400/50 hover:bg-purple-900/20'
                                              : 'border-gray-200 hover:border-purple-200 hover:bg-purple-25'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isPermSelected}
                                            onChange={() => togglePermissionSelection(app.appCode, module.moduleCode, permission.code)}
                                            className={`w-4 h-4 rounded focus:ring-2 ${
                                              actualTheme === 'dark'
                                                ? glassmorphismEnabled
                                                  ? 'text-purple-600 border-purple-500/30 focus:ring-purple-500'
                                                  : 'text-purple-500 border-slate-500 focus:ring-purple-400'
                                                : actualTheme === 'monochrome'
                                                ? 'text-purple-600 border-gray-500/30 focus:ring-purple-500'
                                                : 'text-purple-600 border-gray-300 focus:ring-purple-500'
                                            }`}
                                          />
                                          <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                              <span className={`font-medium text-sm ${
                                                isPermSelected
                                                  ? actualTheme === 'dark'
                                                    ? glassmorphismEnabled
                                                      ? 'text-purple-200'
                                                      : 'text-purple-100'
                                                    : actualTheme === 'monochrome'
                                                    ? 'text-purple-200'
                                                    : 'text-purple-800'
                                                  : actualTheme === 'dark'
                                                    ? glassmorphismEnabled
                                                      ? 'text-purple-300'
                                                      : 'text-slate-300'
                                                    : actualTheme === 'monochrome'
                                                    ? 'text-gray-300'
                                                    : 'text-gray-700'
                                              }`}>
                                                {permission.name}
                                              </span>
                                              {permission.creditCost && (
                                                <div className="flex items-center gap-2">
                                                  <Coins className={`w-3 h-3 ${
                                                    actualTheme === 'dark'
                                                      ? 'text-yellow-400'
                                                      : actualTheme === 'monochrome'
                                                      ? 'text-yellow-400'
                                                      : 'text-yellow-500'
                                                  }`} />
                                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                    permission.creditCost.isGlobal
                                                      ? actualTheme === 'dark'
                                                        ? glassmorphismEnabled
                                                          ? 'bg-blue-900/50 text-blue-300'
                                                          : 'bg-blue-800/50 text-blue-200'
                                                        : actualTheme === 'monochrome'
                                                        ? 'bg-blue-900/50 text-blue-300'
                                                        : 'bg-blue-100 text-blue-700'
                                                      : actualTheme === 'dark'
                                                        ? glassmorphismEnabled
                                                          ? 'bg-green-900/50 text-green-300'
                                                          : 'bg-green-800/50 text-green-200'
                                                        : actualTheme === 'monochrome'
                                                        ? 'bg-green-900/50 text-green-300'
                                                      : 'bg-green-100 text-green-700'
                                                  }`}>
                                                    {permission.creditCost.cost} credits
                                                  </span>
                                                  <span className={`text-xs ${
                                                    actualTheme === 'dark'
                                                      ? glassmorphismEnabled
                                                        ? 'text-purple-400'
                                                        : 'text-slate-400'
                                                      : actualTheme === 'monochrome'
                                                      ? 'text-gray-400'
                                                      : 'text-gray-400'
                                                  }`}>
                                                    per {permission.creditCost.unit}
                                                  </span>
                                                </div>
                                              )}
                                              {!permission.creditCost && (
                                                <span className={`text-xs italic ${
                                                  actualTheme === 'dark'
                                                    ? glassmorphismEnabled
                                                      ? 'text-purple-400'
                                                      : 'text-slate-400'
                                                    : actualTheme === 'monochrome'
                                                    ? 'text-gray-400'
                                                    : 'text-gray-400'
                                                }`}>No credit cost configured</span>
                                              )}
                                            </div>
                                            {permission.description && (
                                              <p className={`text-xs mt-1 ${
                                                isPermSelected
                                                  ? actualTheme === 'dark'
                                                    ? glassmorphismEnabled
                                                      ? 'text-purple-400'
                                                      : 'text-purple-300'
                                                    : actualTheme === 'monochrome'
                                                    ? 'text-purple-400'
                                                    : 'text-purple-600'
                                                  : actualTheme === 'dark'
                                                    ? glassmorphismEnabled
                                                      ? 'text-purple-500'
                                                      : 'text-slate-400'
                                                    : actualTheme === 'monochrome'
                                                    ? 'text-gray-400'
                                                    : 'text-gray-500'
                                              }`}>
                                                {permission.description}
                                              </p>
                                            )}
                                          </div>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-sm space-y-2">
            {summary.totalPermissions > 0 ? (
              <div className="space-y-2">
                <span className="text-green-600 font-medium flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Ready to {initialRole?.roleId ? 'update' : 'create'} role with {summary.totalPermissions} permissions
                </span>
                {summary.estimatedCredits > 0 && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <span className="font-medium">Estimated cost:</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
                      {summary.estimatedCredits.toFixed(2)} credits per operation
                    </span>
                    <span className="text-xs text-blue-500">
                      ({summary.selectedPermDetails.length} operations configured)
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-amber-600 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Please select at least one permission to continue
              </span>
            )}
          </div>
          
          <div className="flex gap-4 w-full sm:w-auto">
            <PearlButton
              onClick={onCancel}
              variant="secondary"
              className="flex-1 sm:flex-none"
            >
              Cancel
            </PearlButton>
            <PearlButton
              onClick={handleSave}
              disabled={saving || !roleData.roleName.trim() || summary.totalPermissions === 0}
              className="flex-1 sm:flex-none"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span className="hidden sm:inline">{initialRole?.roleId ? 'Updating Role...' : 'Creating Role...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span className="hidden sm:inline">
                    {initialRole?.roleId ? `Update Role (${summary.totalPermissions} permissions${summary.estimatedCredits > 0 ? ` - ${summary.estimatedCredits.toFixed(1)} credits/op` : ''})` : `Create Role (${summary.totalPermissions} permissions${summary.estimatedCredits > 0 ? ` - ${summary.estimatedCredits.toFixed(1)} credits/op` : ''})`}
                  </span>
                  <span className="sm:hidden">
                    {initialRole?.roleId ? 'Update' : 'Create'}
                  </span>
                </>
              )}
            </PearlButton>
          </div>
        </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
