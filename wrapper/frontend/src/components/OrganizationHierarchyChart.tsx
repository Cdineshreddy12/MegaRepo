import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronRight, Building2, MapPin, Users, UserCheck, MoreHorizontal, Eye, Edit, Trash2, ZoomIn, ZoomOut, Maximize2, RotateCcw, Move, CreditCard } from 'lucide-react';
import { PearlButton } from '@/components/ui/pearl-button';
import { CreditAllocationModal } from '@/components/common/CreditAllocationModal';

// Types based on your documentation
interface Entity {
  entityId: string;
  entityName: string;
  entityType: 'organization' | 'location' | 'department' | 'team';
  organizationType?: string;
  locationType?: string;
  departmentType?: string;
  teamType?: string;
  entityLevel: number;
  hierarchyPath: string;
  fullHierarchyPath: string;
  parentEntityId?: string;
  responsiblePersonId?: string;
  responsiblePersonName?: string;
  isActive: boolean;
  description?: string;
  children: Entity[];
  availableCredits?: number;
  reservedCredits?: number;
  // Application credit allocations for organizations
  applicationAllocations?: Array<{
    application: string;
    allocatedCredits: number;
    usedCredits: number;
    availableCredits: number;
    hasAllocation: boolean;
    autoReplenish: boolean;
  }>;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface OrganizationHierarchyChartProps {
  hierarchy: Entity[];
  onSelectEntity?: (entity: Entity) => void;
  onEditEntity?: (entity: Entity) => void;
  onDeleteEntity?: (entityId: string) => void;
  isLoading?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

// (legacy color arrays removed in favor of type-based themes)

// Themed color palette by entity type for consistent visuals
const ENTITY_THEMES = {
  tenant: {
    card: 'border-blue-500 dark:border-blue-400 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30',
    iconBg: 'bg-blue-200 dark:bg-blue-800',
    iconColor: 'text-blue-700 dark:text-blue-300',
    line: '#3b82f6'
  },
  parentOrg: {
    card: 'border-emerald-500 dark:border-emerald-400 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30',
    iconBg: 'bg-emerald-100 dark:bg-emerald-800',
    iconColor: 'text-emerald-700 dark:text-emerald-300',
    line: '#10b981'
  },
  subOrg: {
    card: 'border-indigo-400 dark:border-indigo-300 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/30 dark:to-violet-900/30',
    iconBg: 'bg-indigo-100 dark:bg-indigo-800',
    iconColor: 'text-indigo-700 dark:text-indigo-300',
    line: '#6366f1'
  },
  location: {
    card: 'border-rose-400 dark:border-rose-300 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/30 dark:to-pink-900/30',
    iconBg: 'bg-rose-100 dark:bg-rose-800',
    iconColor: 'text-rose-700 dark:text-rose-300',
    line: '#f43f5e'
  }
} as const;

type EntityTheme = typeof ENTITY_THEMES[keyof typeof ENTITY_THEMES];

const getEntityTheme = (entity: Entity): EntityTheme => {
  if (entity.organizationType === 'tenant') return ENTITY_THEMES.tenant;
  if (entity.entityType === 'location') return ENTITY_THEMES.location;
  // Treat level 1 or explicit parent as parent org
  if (entity.organizationType === 'parent' || entity.entityLevel === 1) {
    return ENTITY_THEMES.parentOrg;
  }
  // Otherwise consider it a sub-organization (branch/division/department/etc.)
  return ENTITY_THEMES.subOrg;
};

// Connection line component using coordinates
interface ConnectionLineProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  strokeWidth?: number;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({ from, to, color, strokeWidth = 2 }) => {
  // Calculate control points for curved line (like Supabase)
  const midY = from.y + (to.y - from.y) / 2;
  
  // Create smooth curved path
  const pathData = `M ${from.x} ${from.y} C ${from.x} ${midY} ${to.x} ${midY} ${to.x} ${to.y}`;
  
  // Convert border color classes to actual colors
  const getStrokeColor = (colorClass: string) => {
    if (colorClass.includes('blue')) return '#3b82f6';
    if (colorClass.includes('emerald')) return '#10b981';
    if (colorClass.includes('indigo')) return '#6366f1';
    if (colorClass.includes('rose')) return '#f43f5e';
    return '#6b7280'; // Default gray
  };
  
  return (
    <path
      d={pathData}
      stroke={getStrokeColor(color)}
      strokeWidth={strokeWidth}
      fill="none"
      className="transition-all duration-200"
      style={{
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
      }}
    />
  );
};

// Connection manager for coordinate-based connections
interface EntityPosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const useEntityPositions = () => {
  const [positions, setPositions] = useState<Map<string, EntityPosition>>(new Map());
  
  const updatePosition = useCallback((id: string, element: HTMLElement) => {
    // Use a timeout to ensure DOM has updated
    requestAnimationFrame(() => {
      const rect = element.getBoundingClientRect();
      const container = element.closest('[data-chart-content]');
      
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const containerScrollLeft = container.scrollLeft || 0;
        const containerScrollTop = container.scrollTop || 0;
        
        setPositions(prev => new Map(prev.set(id, {
          id,
          x: rect.left - containerRect.left + containerScrollLeft + rect.width / 2,
          y: rect.top - containerRect.top + containerScrollTop + rect.height,
          width: rect.width,
          height: rect.height
        })));
      }
    });
  }, []);
  
  const getPosition = useCallback((id: string) => positions.get(id), [positions]);
  
  const clearPositions = useCallback(() => {
    setPositions(new Map());
  }, []);
  
  return { updatePosition, getPosition, positions, clearPositions };
};

const EntityIcon = ({ entityType, organizationType, className = "w-5 h-5" }: { 
  entityType: string; 
  organizationType?: string;
  className?: string 
}) => {
  // Special handling for tenant
  if (organizationType === 'tenant') {
    return <Building2 className={`${className} text-blue-600`} />;
  }
  
  switch (entityType) {
    case 'organization':
      return <Building2 className={className} />;
    case 'location':
      return <MapPin className={className} />;
    case 'department':
      return <Users className={className} />;
    case 'team':
      return <UserCheck className={className} />;
    default:
      return <Building2 className={className} />;
  }
};

const EntityCard = ({
  entity,
  onSelect,
  onEdit,
  onDelete,
  onAllocateCredits,
  isExpanded,
  onToggleExpanded,
  updatePosition
}: {
  entity: Entity;
  onSelect?: (entity: Entity) => void;
  onEdit?: (entity: Entity) => void;
  onDelete?: (entityId: string) => void;
  onAllocateCredits?: (entityId: string) => void;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
  updatePosition?: (id: string, element: HTMLElement) => void;
}) => {
  const [showActions, setShowActions] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Themed styling by entity type
  const isTenant = entity.organizationType === 'tenant';
  const theme = getEntityTheme(entity);
  const colorClass = theme.card;
  
  const hasChildren = entity.children && entity.children.length > 0;

  // Update position when component mounts or changes
  useEffect(() => {
    if (cardRef.current && updatePosition) {
      updatePosition(entity.entityId, cardRef.current);
    }
  }, [entity.entityId, updatePosition, isExpanded]);

  // Also update position after a delay to ensure layout is complete
  useEffect(() => {
    const timer = setTimeout(() => {
      if (cardRef.current && updatePosition) {
        updatePosition(entity.entityId, cardRef.current);
      }
    }, 50);
    
    return () => clearTimeout(timer);
  }, [entity.entityId, updatePosition, isExpanded]);

  return (
    <div className="relative">
      {/* Entity Card */}
      <div
        ref={cardRef}
        className={`
          relative bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 transition-all duration-200 hover:shadow-xl
          cursor-pointer group border-2 ${colorClass}
          ${isTenant ? 'w-80 min-h-[160px] shadow-xl' : 'w-72 min-h-[140px]'}
          select-none
          ${(entity.entityType === 'organization' || entity.entityType === 'location') ? 'ring-2 ring-green-200 dark:ring-green-300 ring-opacity-50' : ''}
        `}
        onClick={() => onSelect?.(entity)}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        data-entity-id={entity.entityId}
        title={(entity.entityType === 'organization' || entity.entityType === 'location') ? 'Click to allocate credits to applications' : undefined}
      >
        {/* Header with Icon and Expand Button */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-full ${theme.iconBg}`}>
              <EntityIcon
                entityType={entity.entityType}
                organizationType={entity.organizationType}
                className={isTenant ? `w-6 h-6 ${theme.iconColor}` : `w-5 h-5 ${theme.iconColor}`}
              />
            </div>
            {/* Credit Allocation Indicator for Organizations and Locations */}
            {(entity.entityType === 'organization' || entity.entityType === 'location') && (
              <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                <CreditCard className="w-3 h-3" />
                <span>Allocatable</span>
              </div>
            )}
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpanded?.();
                }}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                )}
              </button>
            )}
          </div>
          
          {/* Actions Menu */}
          <div className={`transition-opacity duration-200 ${showActions ? 'opacity-100' : 'opacity-0'}`}>
            <div className="relative">
              <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <MoreHorizontal className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
              
              {showActions && (
                <div className="absolute right-0 top-8 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-10 min-w-[120px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect?.(entity);
                    }}
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 w-full text-left"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(entity);
                    }}
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 w-full text-left"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  {/* Credit Allocation - only for organizations and locations */}
                  {(entity.entityType === 'organization' || entity.entityType === 'location') && onAllocateCredits && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAllocateCredits(entity.entityId);
                      }}
                      className="flex items-center space-x-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-600 w-full text-left"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Allocate Credits</span>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(entity.entityId);
                    }}
                    className="flex items-center space-x-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-600 text-red-600 dark:text-red-400 w-full text-left"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Entity Name */}
        <h3 className={`font-semibold text-gray-900 dark:text-white mb-1 leading-tight ${isTenant ? 'text-lg' : 'text-sm'}`}>
          {entity.entityName || 'YOUR NAME HERE'}
        </h3>
        
        {/* Entity Type/Position */}
        <p className={`text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-3 ${isTenant ? 'text-sm font-medium text-blue-700 dark:text-blue-400' : 'text-xs'}`}>
          {entity.organizationType || entity.locationType || entity.departmentType || entity.teamType || 'POSITION'}
        </p>

        {/* Responsible Person */}
        {entity.responsiblePersonName && (
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <UserCheck className="w-3 h-3 text-gray-600 dark:text-gray-300" />
            </div>
            <span className="text-xs text-gray-700 dark:text-gray-300">{entity.responsiblePersonName}</span>
          </div>
        )}

        {/* Credits (if available) */}
        {(entity.availableCredits !== undefined || entity.reservedCredits !== undefined || entity.applicationAllocations) && (
          <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
            {/* Organization Credits */}
            {(entity.availableCredits !== undefined || entity.reservedCredits !== undefined) && (
              <div className="border-b border-gray-200 dark:border-gray-700 pb-1 mb-1">
                <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">Organization Credits:</div>
                {entity.availableCredits !== undefined && (
                  <div className="flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-green-600 dark:text-green-400" />
                    <span className="text-gray-700 dark:text-gray-300">Available: <span className="font-medium text-green-700 dark:text-green-400">{Number(entity.availableCredits || 0).toLocaleString()}</span></span>
                  </div>
                )}
                {entity.reservedCredits !== undefined && Number(entity.reservedCredits) > 0 && (
                  <div className="flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-gray-700 dark:text-gray-300">Reserved: <span className="font-medium text-yellow-700 dark:text-yellow-400">{Number(entity.reservedCredits || 0).toLocaleString()}</span></span>
                  </div>
                )}
              </div>
            )}

            {/* Application Allocations */}
            {entity.applicationAllocations && entity.applicationAllocations.length > 0 && (
              <div>
                <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">Application Credits:</div>
                {entity.applicationAllocations.slice(0, 3).map((allocation) => (
                  <div key={allocation.application} className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400"></div>
                      <span className="capitalize text-gray-700 dark:text-gray-300">{allocation.application}:</span>
                    </div>
                    <span className={`font-medium ${
                      allocation.availableCredits > 0 ? 'text-green-600 dark:text-green-400' :
                      allocation.hasAllocation ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {Number(allocation.availableCredits || 0).toFixed(0)}/{Number(allocation.allocatedCredits || 0).toFixed(0)}
                      {allocation.autoReplenish && <span className="text-xs ml-1">🔄</span>}
                    </span>
                  </div>
                ))}
                {entity.applicationAllocations.length > 3 && (
                  <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                    +{entity.applicationAllocations.length - 3} more...
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {entity.description && (
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {entity.description.length > 80 
                ? `${entity.description.substring(0, 80)}...` 
                : entity.description
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const HierarchyNode = ({ 
  entity, 
  level = 0, 
  onSelect,
  onEdit,
  onDelete,
  expandedNodes,
  toggleExpanded,
  updatePosition,
  getPosition
}: {
  entity: Entity;
  level?: number;
  onSelect?: (entity: Entity) => void;
  onEdit?: (entity: Entity) => void;
  onDelete?: (entityId: string) => void;
  expandedNodes: Set<string>;
  toggleExpanded: (entityId: string) => void;
  updatePosition?: (id: string, element: HTMLElement) => void;
  getPosition?: (id: string) => EntityPosition | undefined;
}) => {
  const hasChildren = entity.children && entity.children.length > 0;
  const isExpanded = expandedNodes.has(entity.entityId);

  return (
    <div className="flex flex-col items-center">
      {/* Entity Card */}
      <EntityCard
        entity={entity}
        onSelect={onSelect}
        onEdit={onEdit}
        onDelete={onDelete}
        onAllocateCredits={handleAllocateCredits}
        isExpanded={isExpanded}
        onToggleExpanded={() => toggleExpanded(entity.entityId)}
        updatePosition={updatePosition}
      />

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="flex justify-center space-x-16 mt-16">
          {entity.children.map((child) => (
            <HierarchyNode
              key={child.entityId}
              entity={child}
              level={level + 1}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              expandedNodes={expandedNodes}
              toggleExpanded={toggleExpanded}
              updatePosition={updatePosition}
              getPosition={getPosition}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const OrganizationHierarchyChart: React.FC<OrganizationHierarchyChartProps> = ({
  hierarchy,
  onSelectEntity,
  onEditEntity,
  onDeleteEntity,
  isLoading = false,
  isOpen = false,
  onClose
}) => {
  // Filter out tenant entities to start from primary organization
  const filteredHierarchy = hierarchy.filter(entity => entity.organizationType !== 'tenant');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const chartRef = useRef<HTMLDivElement>(null);
  const { updatePosition, getPosition, positions, clearPositions } = useEntityPositions();

  // Credit allocation modal state
  const [showCreditAllocationModal, setShowCreditAllocationModal] = useState(false);
  const [selectedEntityForAllocation, setSelectedEntityForAllocation] = useState<{
    id: string;
    name: string;
    type: 'organization' | 'location';
    availableCredits: number;
  } | null>(null);

  // Auto-expand root nodes and their first level children
  useEffect(() => {
    if (filteredHierarchy && filteredHierarchy.length > 0) {
      const expandedIds = new Set<string>();

      filteredHierarchy.forEach(entity => {
        // Expand root entity (primary organization)
        expandedIds.add(entity.entityId);

        // Also expand first level children if they exist
        if (entity.children && entity.children.length > 0) {
          entity.children.forEach(child => {
            expandedIds.add(child.entityId);
          });
        }
      });

      setExpandedNodes(expandedIds);
    }
  }, [filteredHierarchy]);

  const toggleExpanded = (entityId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entityId)) {
        newSet.delete(entityId);
      } else {
        newSet.add(entityId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const getAllEntityIds = (entities: Entity[]): string[] => {
      let ids: string[] = [];
      entities.forEach(entity => {
        ids.push(entity.entityId);
        if (entity.children) {
          ids = ids.concat(getAllEntityIds(entity.children));
        }
      });
      return ids;
    };

    setExpandedNodes(new Set(getAllEntityIds(filteredHierarchy)));
  };

  const handleAllocateCredits = (entityId: string) => {
    // Find the entity in the hierarchy to get its details
    const findEntity = (entities: Entity[]): Entity | null => {
      for (const entity of entities) {
        if (entity.entityId === entityId) {
          return entity;
        }
        if (entity.children) {
          const found = findEntity(entity.children);
          if (found) return found;
        }
      }
      return null;
    };

    const entity = findEntity(filteredHierarchy);
    if (entity) {
      setSelectedEntityForAllocation({
        id: entityId,
        name: entity.entityName,
        type: entity.entityType,
        availableCredits: entity.availableCredits || 0
      });
      setShowCreditAllocationModal(true);
    }
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Zoom functionality
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.3));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const fitToScreen = () => {
    setZoom(0.8);
    setPan({ x: 0, y: 0 });
  };

  // Pan functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === chartRef.current || (e.target as Element).closest('[data-chart-content]')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.3, Math.min(3, prev + delta)));
  };

  // Generate connections based on current positions
  const generateConnections = useCallback(() => {
    const connections: Array<{
      from: { x: number; y: number };
      to: { x: number; y: number };
      color: string;
    }> = [];

    const processEntity = (entity: Entity) => {
      if (expandedNodes.has(entity.entityId) && entity.children?.length > 0) {
        const parentPos = getPosition?.(entity.entityId);
        if (parentPos) {
          entity.children.forEach(child => {
            const childPos = getPosition?.(child.entityId);
            if (childPos && parentPos) {
              const theme = getEntityTheme(child); // Use child theme for line color
              connections.push({
                from: {
                  x: parentPos.x,
                  y: parentPos.y // Already set to bottom of card in updatePosition
                },
                to: {
                  x: childPos.x,
                  y: childPos.y - childPos.height // Connect to top of child
                },
                color: theme.line
              });
            }
            // Recursively process children
            processEntity(child);
          });
        }
      }
    };

    if (filteredHierarchy && filteredHierarchy.length > 0) {
      filteredHierarchy.forEach(processEntity);
    }
    
    return connections;
  }, [filteredHierarchy, expandedNodes, getPosition, positions]);

  // Clear positions and trigger updates when expand/collapse changes
  useEffect(() => {
    clearPositions();
    
    const timer = setTimeout(() => {
      // Force position recalculation after layout changes
      const allCards = document.querySelectorAll('[data-entity-id]');
      allCards.forEach(card => {
        const entityId = card.getAttribute('data-entity-id');
        if (entityId && card instanceof HTMLElement) {
          updatePosition(entityId, card);
        }
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [expandedNodes, clearPositions, updatePosition]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-300">Loading hierarchy...</span>
      </div>
    );
  }

  if (!filteredHierarchy || filteredHierarchy.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500 dark:text-gray-400">
        <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
        <p>No organizational hierarchy data available.</p>
      </div>
    );
  }

  return (
    <>
      {/* Full-Screen Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-lg shadow-2xl w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-800 dark:to-purple-800 text-white rounded-t-lg">
              <h2 className="text-xl font-semibold">Organization Hierarchy</h2>
              <div className="flex items-center space-x-2">
                {/* Hierarchy Controls */}
                <PearlButton
                  onClick={expandAll}
                  variant="secondary"
                  size="sm"
                  data-testid="expand-all-btn"
                  title="Expand All"
                >
                  Expand All
                </PearlButton>
                <PearlButton
                  onClick={collapseAll}
                  variant="secondary"
                  size="sm"
                  title="Collapse All"
                >
                  Collapse All
                </PearlButton>
                
                {/* Zoom Controls */}
                <div className="flex items-center space-x-1 bg-white bg-opacity-20 rounded-full p-1">
                  <PearlButton
                    onClick={handleZoomOut}
                    variant="outline"
                    size="sm"
                    title="Zoom Out"
                    disabled={zoom <= 0.3}
                    className="!p-1 !px-2"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </PearlButton>
                  <span className="px-2 text-sm font-medium min-w-[3rem] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <PearlButton
                    onClick={handleZoomIn}
                    variant="outline"
                    size="sm"
                    title="Zoom In"
                    disabled={zoom >= 3}
                    className="!p-1 !px-2"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </PearlButton>
                </div>

                {/* View Controls */}
                <PearlButton
                  onClick={fitToScreen}
                  variant="outline"
                  size="sm"
                  title="Fit to Screen"
                  className="!p-1 !px-2"
                >
                  <Maximize2 className="w-4 h-4" />
                </PearlButton>
                <PearlButton
                  onClick={resetView}
                  variant="outline"
                  size="sm"
                  title="Reset View"
                  className="!p-1 !px-2"
                >
                  <RotateCcw className="w-4 h-4" />
                </PearlButton>
                
                {/* Debug Refresh */}
                {process.env.NODE_ENV === 'development' && (
                  <button
                    onClick={() => {
                      clearPositions();
                      setTimeout(() => {
                        const allCards = document.querySelectorAll('[data-entity-id]');
                        allCards.forEach(card => {
                          const entityId = card.getAttribute('data-entity-id');
                          if (entityId && card instanceof HTMLElement) {
                            updatePosition(entityId, card);
                          }
                        });
                      }, 100);
                    }}
                    className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                    title="Refresh Connections"
                  >
                    🔄
                  </button>
                )}

                {/* Close Button */}
                <PearlButton
                  onClick={() => onClose?.()}
                  variant="secondary"
                  size="sm"
                  title="Close"
                  className="ml-2 !p-1 !px-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </PearlButton>
              </div>
            </div>

            {/* Chart Content */}
            <div 
              ref={chartRef}
              className="flex-1 overflow-hidden bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-black relative cursor-grab"
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              data-testid="hierarchy-chart"
            >
              {/* Pan/Zoom Instructions */}
              <div className="absolute top-4 left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-lg p-3 text-xs text-gray-600 dark:text-gray-300 shadow-sm z-10">
                <div className="flex items-center space-x-2 mb-1">
                  <Move className="w-3 h-3" />
                  <span>Click and drag to pan</span>
                </div>
                <div className="text-gray-500 dark:text-gray-400">Mouse wheel to zoom</div>
              </div>

              {/* Debug Panel */}
              {process.env.NODE_ENV === 'development' && (
                <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-lg p-3 text-xs text-gray-600 dark:text-gray-300 shadow-sm z-10 max-w-sm">
                  <div className="font-bold mb-2 dark:text-white">Debug Info</div>
                  <div>Positions tracked: {positions.size}</div>
                  <div>Connections: {generateConnections().length}</div>
                  <div className="mt-2 max-h-32 overflow-y-auto">
                    {Array.from(positions.entries()).map(([id, pos]) => (
                      <div key={id} className="text-xs">
                        {id.slice(0, 8)}: ({Math.round(pos.x)}, {Math.round(pos.y)})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Zoomable/Pannable Content */}
              <div 
                className="absolute inset-0 flex items-center justify-center p-8"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
                data-chart-content
              >
                {/* SVG Connections Overlay */}
                <svg 
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ 
                    overflow: 'visible',
                    zIndex: 0
                  }}
                >
                  <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                      refX="10" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
                    </marker>
                  </defs>
                  {generateConnections().map((connection, index) => (
                    <ConnectionLine
                      key={`connection-${index}-${Date.now()}`}
                      from={{ x: connection.from.x, y: connection.from.y }}
                      to={{ x: connection.to.x, y: connection.to.y }}
                      color={connection.color}
                      strokeWidth={2}
                    />
                  ))}
                </svg>

                {/* Entity Nodes */}
                <div className="min-w-max flex flex-col items-center space-y-16 relative z-10">
                  {filteredHierarchy.map((rootEntity) => (
                    <HierarchyNode
                      key={rootEntity.entityId}
                      entity={rootEntity}
                      onSelect={onSelectEntity}
                      onEdit={onEditEntity}
                      onDelete={onDeleteEntity}
                      expandedNodes={expandedNodes}
                      toggleExpanded={toggleExpanded}
                      updatePosition={updatePosition}
                      getPosition={getPosition}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Stats */}
            <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6 py-3">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center space-x-4">
                  <div>
                    Total Entities: <span className="font-medium dark:text-white">{getAllEntityCount(filteredHierarchy)}</span>
                  </div>
                  <div>
                    Expanded: <span className="font-medium dark:text-white">{expandedNodes.size}</span> /
                    <span className="font-medium dark:text-white">{getAllEntityCount(filteredHierarchy)}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                  <div>Zoom: {Math.round(zoom * 100)}%</div>
                  <div>Pan: {Math.round(pan.x)}, {Math.round(pan.y)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Credit Allocation Modal */}
      {selectedEntityForAllocation && (
        <CreditAllocationModal
          isOpen={showCreditAllocationModal}
          onClose={() => {
            setShowCreditAllocationModal(false);
            setSelectedEntityForAllocation(null);
          }}
          entityId={selectedEntityForAllocation.id}
          entityName={selectedEntityForAllocation.name}
          entityType={selectedEntityForAllocation.type}
          availableCredits={selectedEntityForAllocation.availableCredits}
        />
      )}
    </>
  );
};

// Helper function to count all entities
const getAllEntityCount = (entities: Entity[]): number => {
  let count = entities.length;
  entities.forEach(entity => {
    if (entity.children) {
      count += getAllEntityCount(entity.children);
    }
  });
  return count;
};

export default OrganizationHierarchyChart;