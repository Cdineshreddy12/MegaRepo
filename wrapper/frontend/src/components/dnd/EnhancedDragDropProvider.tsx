import React, { createContext, useContext, useState, ReactNode, useRef, useCallback, useEffect } from 'react'
import { PermissionItem, User, Role } from '../../data/mockPermissions'

interface DragItem {
  type: 'permission' | 'user' | 'role' | 'feature-flag' | 'restriction'
  data: any
  preview?: string
  count?: number
}

interface AutoScrollState {
  isScrolling: boolean
  direction: 'up' | 'down' | null
  zone: 'top' | 'bottom' | null
}

interface DragDropContextType {
  // Basic drag state
  draggedItem: DragItem | null
  setDraggedItem: (item: DragItem | null) => void
  isDragging: boolean
  
  // Multi-select state
  selectedPermissions: string[]
  setSelectedPermissions: (permissions: string[]) => void
  selectedUsers: string[]
  setSelectedUsers: (users: string[]) => void
  selectedRoles: string[]
  setSelectedRoles: (roles: string[]) => void
  selectedRestrictions: string[]
  setSelectedRestrictions: (restrictions: string[]) => void
  
  // Advanced features
  isMultiSelectMode: boolean
  setMultiSelectMode: (enabled: boolean) => void
  dragPreview: string | null
  setDragPreview: (preview: string | null) => void
  
  // Auto-scroll
  autoScrollState: AutoScrollState
  setAutoScrollState: (state: AutoScrollState) => void
  
  // Drop zones
  activeDropZones: string[]
  setActiveDropZones: (zones: string[]) => void
  
  // Helper functions
  togglePermissionSelection: (permissionId: string) => void
  toggleUserSelection: (userId: string) => void
  toggleRoleSelection: (roleId: string) => void
  toggleRestrictionSelection: (restrictionId: string) => void
  clearAllSelections: () => void
  
  // Drag operations
  startDrag: (item: DragItem) => void
  endDrag: () => void
}

const DragDropContext = createContext<DragDropContextType | undefined>(undefined)

export function EnhancedDragDropProvider({ children }: { children: ReactNode }) {
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>([])
  const [isMultiSelectMode, setMultiSelectMode] = useState(false)
  const [dragPreview, setDragPreview] = useState<string | null>(null)
  const [autoScrollState, setAutoScrollState] = useState<AutoScrollState>({
    isScrolling: false,
    direction: null,
    zone: null
  })
  const [activeDropZones, setActiveDropZones] = useState<string[]>([])
  
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isDragging = draggedItem !== null

  // Auto-scroll functionality
  const startAutoScroll = useCallback((direction: 'up' | 'down', zone: 'top' | 'bottom') => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
    }

    setAutoScrollState({ isScrolling: true, direction, zone })

    scrollIntervalRef.current = setInterval(() => {
      const scrollAmount = 10
      if (direction === 'up') {
        window.scrollBy(0, -scrollAmount)
      } else {
        window.scrollBy(0, scrollAmount)
      }
    }, 16) // ~60fps
  }, [])

  const stopAutoScroll = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
      scrollIntervalRef.current = null
    }
    setAutoScrollState({ isScrolling: false, direction: null, zone: null })
  }, [])

  // Handle mouse position for auto-scroll
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const scrollThreshold = 100
      const windowHeight = window.innerHeight

      if (e.clientY < scrollThreshold) {
        startAutoScroll('up', 'top')
      } else if (e.clientY > windowHeight - scrollThreshold) {
        startAutoScroll('down', 'bottom')
      } else {
        stopAutoScroll()
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      stopAutoScroll()
    }
  }, [isDragging, startAutoScroll, stopAutoScroll])

  // Helper functions
  const togglePermissionSelection = useCallback((permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId) 
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    )
  }, [])

  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }, [])

  const toggleRoleSelection = useCallback((roleId: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    )
  }, [])

  const toggleRestrictionSelection = useCallback((restrictionId: string) => {
    setSelectedRestrictions(prev => 
      prev.includes(restrictionId) 
        ? prev.filter(id => id !== restrictionId)
        : [...prev, restrictionId]
    )
  }, [])

  const clearAllSelections = useCallback(() => {
    setSelectedPermissions([])
    setSelectedUsers([])
    setSelectedRoles([])
    setSelectedRestrictions([])
  }, [])

  const startDrag = useCallback((item: DragItem) => {
    setDraggedItem(item)
    
    // Generate preview text
    if (item.type === 'permission' && selectedPermissions.length > 1) {
      setDragPreview(`${selectedPermissions.length} permissions`)
    } else if (item.type === 'role' && selectedRoles.length > 1) {
      setDragPreview(`${selectedRoles.length} roles`)
    } else if (item.type === 'restriction' && selectedRestrictions.length > 1) {
      setDragPreview(`${selectedRestrictions.length} restrictions`)
    } else {
      setDragPreview(item.data.name || item.data.roleName || 'Item')
    }
  }, [selectedPermissions.length, selectedRoles.length, selectedRestrictions.length])

  const endDrag = useCallback(() => {
    setDraggedItem(null)
    setDragPreview(null)
    setActiveDropZones([])
    stopAutoScroll()
  }, [stopAutoScroll])

  const contextValue: DragDropContextType = {
    draggedItem,
    setDraggedItem,
    isDragging,
    selectedPermissions,
    setSelectedPermissions,
    selectedUsers,
    setSelectedUsers,
    selectedRoles,
    setSelectedRoles,
    selectedRestrictions,
    setSelectedRestrictions,
    isMultiSelectMode,
    setMultiSelectMode,
    dragPreview,
    setDragPreview,
    autoScrollState,
    setAutoScrollState,
    activeDropZones,
    setActiveDropZones,
    togglePermissionSelection,
    toggleUserSelection,
    toggleRoleSelection,
    toggleRestrictionSelection,
    clearAllSelections,
    startDrag,
    endDrag
  }

  return (
    <DragDropContext.Provider value={contextValue}>
      {children}
      
      {/* Auto-scroll indicators */}
      {autoScrollState.isScrolling && (
        <>
          {autoScrollState.zone === 'top' && (
            <div className="fixed top-0 left-0 right-0 h-20 bg-gradient-to-b from-blue-500/20 to-transparent pointer-events-none z-50 flex items-center justify-center">
              <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm animate-pulse">
                ↑ Scrolling Up
              </div>
            </div>
          )}
          {autoScrollState.zone === 'bottom' && (
            <div className="fixed bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-blue-500/20 to-transparent pointer-events-none z-50 flex items-center justify-center">
              <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm animate-pulse">
                ↓ Scrolling Down
              </div>
            </div>
          )}
        </>
      )}

      {/* Drag preview */}
      {isDragging && dragPreview && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 pointer-events-none">
          Dragging: {dragPreview}
        </div>
      )}
    </DragDropContext.Provider>
  )
}

export function useEnhancedDragDrop() {
  const context = useContext(DragDropContext)
  if (!context) {
    throw new Error('useEnhancedDragDrop must be used within an EnhancedDragDropProvider')
  }
  return context
} 