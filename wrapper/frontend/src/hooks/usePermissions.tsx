import { useState, useEffect, useCallback } from 'react'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { permissionsAPI } from '@/lib/api'
import toast from 'react-hot-toast'

interface Permission {
  id: string
  name: string
  description: string
  type: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export' | 'pay'
  level: 'basic' | 'advanced' | 'admin'
}

interface Module {
  moduleId: string
  moduleCode: string
  moduleName: string
  description: string
  permissions: string[]
  isCore: boolean
}

interface Application {
  appId: string
  appCode: string
  appName: string
  description: string
  icon: string
  modules: Module[]
  isEnabled: boolean
  subscriptionTier: string
  enabledModules: string[]
}

interface User {
  userId: string
  name: string
  email: string
  isActive: boolean
  isTenantAdmin: boolean
  createdAt: string
}

interface UserPermission {
  id: string
  userId: string
  appId: string
  moduleId: string
  permissions: string[]
  appCode: string
  appName: string
  moduleCode: string
  moduleName: string
}

interface PermissionTemplate {
  id: string
  name: string
  description: string
  color: string
  permissions: Array<{
    appCode: string
    moduleCode: string
    permissions: string[]
  }>
  isBuiltIn: boolean
}

interface PermissionChange {
  userId: string
  appId: string
  moduleId: string
  permissions: string[]
  type: 'add' | 'remove' | 'update'
}

export const usePermissions = () => {
  const { getToken } = useKindeAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [userPermissions, setUserPermissions] = useState<Map<string, UserPermission[]>>(new Map())
  const [templates, setTemplates] = useState<PermissionTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [changes, setChanges] = useState<Map<string, PermissionChange[]>>(new Map())

  // Load all data
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      
      const [appsResponse, usersResponse, templatesResponse] = await Promise.all([
        permissionsAPI.getApplications(),
        permissionsAPI.getUsers(),
        permissionsAPI.getTemplates()
      ])

      console.log('🔍 API Responses:', {
        appsResponse: appsResponse,
        usersResponse: usersResponse,
        templatesResponse: templatesResponse
      })

      // Validate API response structure with better error handling
      const appsData = appsResponse?.data || appsResponse || []
      const usersData = usersResponse?.data || usersResponse || []
      const templatesData = templatesResponse?.data || templatesResponse || []

      if (!Array.isArray(appsData)) {
        console.warn('Applications data is not an array:', appsData)
        setApplications([])
      } else {
        setApplications(appsData)
      }
      
      if (!Array.isArray(usersData)) {
        console.warn('Users data is not an array:', usersData)
        setUsers([])
      } else {
        setUsers(usersData)
      }
      
      if (!Array.isArray(templatesData)) {
        console.warn('Templates data is not an array:', templatesData)
        setTemplates([])
      } else {
        setTemplates(templatesData)
      }

      // Load permissions for each user only if we have users
      const permissionsMap = new Map()
      if (Array.isArray(usersData) && usersData.length > 0) {
        await Promise.all(
          usersData.map(async (user: User) => {
            try {
              const permsResponse = await permissionsAPI.getUserPermissions(user.userId)
              permissionsMap.set(user.userId, permsResponse.data || [])
            } catch (error) {
              console.error(`Failed to load permissions for user ${user.userId}:`, error)
              permissionsMap.set(user.userId, [])
            }
          })
        )
      }
      setUserPermissions(permissionsMap)

    } catch (error) {
      console.error('Failed to load permissions data:', error)
      toast.error('Failed to load permissions data')
      // Set empty arrays as fallback
      setApplications([])
      setUsers([])
      setTemplates([])
      setUserPermissions(new Map())
    } finally {
      setLoading(false)
    }
  }, [])

  // Check if user has a specific permission
  const hasPermission = useCallback((userId: string, appId: string, moduleId: string, permissionId: string): boolean => {
    const userPerms = userPermissions.get(userId) || []
    const modulePerms = userPerms.find(p => p.appId === appId && p.moduleId === moduleId)
    return modulePerms?.permissions.includes(permissionId) || false
  }, [userPermissions])

  // Get all permissions for a user
  const getUserPermissions = useCallback((userId: string): UserPermission[] => {
    return userPermissions.get(userId) || []
  }, [userPermissions])

  // Add a permission change to the pending changes
  const addChange = useCallback((userId: string, appId: string, moduleId: string, permissions: string[], type: 'add' | 'remove' | 'update') => {
    setChanges(prev => {
      const userChanges = prev.get(userId) || []
      const existingChangeIndex = userChanges.findIndex(c => c.appId === appId && c.moduleId === moduleId)
      
      const newChange: PermissionChange = { userId, appId, moduleId, permissions, type }
      
      if (existingChangeIndex >= 0) {
        userChanges[existingChangeIndex] = newChange
      } else {
        userChanges.push(newChange)
      }
      
      const newChanges = new Map(prev)
      newChanges.set(userId, userChanges)
      return newChanges
    })
  }, [])

  // Toggle a single permission
  const togglePermission = useCallback((userId: string, appId: string, moduleId: string, permissionId: string) => {
    const currentPerms = getUserPermissions(userId)
    const modulePerms = currentPerms.find(p => p.appId === appId && p.moduleId === moduleId)
    
    let newPermissions: string[]
    if (modulePerms) {
      if (modulePerms.permissions.includes(permissionId)) {
        newPermissions = modulePerms.permissions.filter(p => p !== permissionId)
      } else {
        newPermissions = [...modulePerms.permissions, permissionId]
      }
    } else {
      newPermissions = [permissionId]
    }

    addChange(userId, appId, moduleId, newPermissions, 'update')

    // Update local state immediately for UI feedback
    setUserPermissions(prev => {
      const newMap = new Map(prev)
      const userPerms = [...(newMap.get(userId) || [])]
      const existingIndex = userPerms.findIndex(p => p.appId === appId && p.moduleId === moduleId)
      
      const app = applications.find(a => a.appId === appId)
      const module = app?.modules.find(m => m.moduleId === moduleId)
      
      if (existingIndex >= 0) {
        userPerms[existingIndex] = {
          ...userPerms[existingIndex],
          permissions: newPermissions
        }
      } else if (app && module) {
        userPerms.push({
          id: `temp-${Date.now()}`,
          userId,
          appId,
          moduleId,
          permissions: newPermissions,
          appCode: app.appCode,
          appName: app.appName,
          moduleCode: module.moduleCode,
          moduleName: module.moduleName
        })
      }
      
      newMap.set(userId, userPerms)
      return newMap
    })
  }, [getUserPermissions, addChange, applications])

  // Apply template to user
  const applyTemplate = useCallback(async (userId: string, templateId: string, clearExisting = false) => {
    try {
      const template = templates.find(t => t.id === templateId)
      if (!template) {
        toast.error('Template not found')
        return
      }

      // Convert template permissions to permission changes
      const changes: PermissionChange[] = []
      
      for (const templatePerm of template.permissions) {
        const app = applications.find(a => a.appCode === templatePerm.appCode)
        const module = app?.modules.find(m => m.moduleCode === templatePerm.moduleCode)
        
        if (app && module) {
          changes.push({
            userId,
            appId: app.appId,
            moduleId: module.moduleId,
            permissions: templatePerm.permissions,
            type: 'update'
          })
        }
      }

      // Update local state and changes
      setChanges(prev => {
        const newChanges = new Map(prev)
        newChanges.set(userId, changes)
        return newChanges
      })

      // Update local permissions state for immediate UI feedback
      setUserPermissions(prev => {
        const newMap = new Map(prev)
        const newPerms: UserPermission[] = []
        
        for (const change of changes) {
          const app = applications.find(a => a.appId === change.appId)
          const module = app?.modules.find(m => m.moduleId === change.moduleId)
          
          if (app && module) {
            newPerms.push({
              id: `temp-${Date.now()}-${change.moduleId}`,
              userId: change.userId,
              appId: change.appId,
              moduleId: change.moduleId,
              permissions: change.permissions,
              appCode: app.appCode,
              appName: app.appName,
              moduleCode: module.moduleCode,
              moduleName: module.moduleName
            })
          }
        }
        
        newMap.set(userId, clearExisting ? newPerms : [...(newMap.get(userId) || []), ...newPerms])
        return newMap
      })

      toast.success(`Applied ${template.name} template`)
    } catch (error) {
      console.error('Failed to apply template:', error)
      toast.error('Failed to apply template')
    }
  }, [templates, applications])

  // Clear user permissions
  const clearUserPermissions = useCallback((userId: string) => {
    setChanges(prev => {
      const newChanges = new Map(prev)
      newChanges.set(userId, [])
      return newChanges
    })

    setUserPermissions(prev => {
      const newMap = new Map(prev)
      newMap.set(userId, [])
      return newMap
    })

    toast.success('Cleared user permissions')
  }, [])

  // Save all pending changes
  const saveChanges = useCallback(async () => {
    try {
      setLoading(true)

      // Convert changes to API format
      const assignments: Array<{
        userId: string
        appId: string
        moduleId: string
        permissions: string[]
      }> = []

      changes.forEach((userChanges) => {
        userChanges.forEach((change) => {
          assignments.push({
            userId: change.userId,
            appId: change.appId,
            moduleId: change.moduleId,
            permissions: change.permissions
          })
        })
      })

      if (assignments.length === 0) {
        toast.info('No changes to save')
        return
      }

      await permissionsAPI.bulkAssignPermissions(assignments)

      // Clear changes and reload data
      setChanges(new Map())
      await loadData()

      toast.success(`Successfully saved ${assignments.length} permission changes`)
    } catch (error) {
      console.error('Failed to save changes:', error)
      toast.error('Failed to save permission changes')
    } finally {
      setLoading(false)
    }
  }, [changes, loadData])

  // Reset all changes
  const resetChanges = useCallback(() => {
    setChanges(new Map())
    loadData() // Reload original data
    toast.info('Reset all changes')
  }, [loadData])

  // Get pending changes count
  const getChangesCount = useCallback(() => {
    let count = 0
    changes.forEach((userChanges) => {
      count += userChanges.length
    })
    return count
  }, [changes])

  // Check if user has pending changes
  const userHasChanges = useCallback((userId: string) => {
    return (changes.get(userId) || []).length > 0
  }, [changes])

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    // Data
    applications,
    users,
    userPermissions,
    templates,
    loading,
    
    // Actions
    loadData,
    hasPermission,
    getUserPermissions,
    togglePermission,
    applyTemplate,
    clearUserPermissions,
    saveChanges,
    resetChanges,
    
    // Change tracking
    changes,
    getChangesCount,
    userHasChanges
  }
}

// Permission checking utilities
export function hasPermission(
  permissions: UserPermissions, 
  module: string, 
  section: string, 
  action: string
): boolean {
  if (permissions.isAdmin) return true
  if (permissions.isLoading) return false
  
  return permissions.modules[module]?.[section]?.includes(action) || false
}

export function hasAnyPermission(
  permissions: UserPermissions,
  checks: Array<{ module: string; section: string; action: string }>
): boolean {
  return checks.some(check => 
    hasPermission(permissions, check.module, check.section, check.action)
  )
}

export function canAccessModule(permissions: UserPermissions, module: string): boolean {
  if (permissions.isAdmin) return true
  if (permissions.isLoading) return false
  
  return Object.keys(permissions.modules[module] || {}).length > 0
} 