'use client';

import { useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Background,
  useReactFlow,
  ReactFlowProvider,
  type Edge,
  BackgroundVariant,
  type NodeTypes,
  Controls,
  MiniMap,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Building, MapPin, Loader2, RefreshCw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { OrganizationNode } from './OrganizationNode';
import type { OrganizationHierarchy } from '@/types/organization';

// Define nodeTypes
const nodeTypes: NodeTypes = {
  organizationNode: OrganizationNode,
};

interface OrganizationHierarchyFlowProps {
  hierarchy: OrganizationHierarchy | null;
  loading: boolean;
  onRefresh?: () => void;
  isAdmin?: boolean;
  tenantId?: string;
  tenantName?: string;
  onNodeClick?: (nodeId: string) => void;
  onEditOrganization?: (orgId: string) => void;
  onDeleteOrganization?: (orgId: string) => void;
  onAddSubOrganization?: (parentId: string) => void;
  onAddLocation?: (parentId: string) => void;
}

// Convert hierarchy tree to React Flow nodes and edges with proper hierarchical layout
function convertHierarchyToFlow(
  hierarchy: OrganizationHierarchy | null,
  tenantId?: string,
  tenantName?: string,
  onNodeClick?: (nodeId: string) => void,
  onEditOrganization?: (orgId: string) => void,
  onDeleteOrganization?: (orgId: string) => void,
  onAddSubOrganization?: (parentId: string) => void,
  onAddLocation?: (parentId: string) => void
) {
  const nodes: any[] = [];
  const edges: Edge[] = [];
  const nodeMap = new Map<string, any>();

  // Layout configuration - optimized spacing for better alignment
  const NODE_WIDTH = 280;
  const NODE_HEIGHT = 180;
  const HORIZONTAL_SPACING = 350; // Spacing between root hierarchies
  const VERTICAL_SPACING = 220; // Vertical spacing between levels
  const ROOT_Y = 100;
  const MIN_SIBLING_DISTANCE = 80; // Compact spacing between sibling nodes (padding between nodes)
  const MIN_SUBTREE_SPACING = 50; // Minimum spacing between subtrees

  // If no hierarchy, return empty or just tenant node
  if (!hierarchy || !hierarchy.hierarchy || hierarchy.hierarchy.length === 0) {
    // Still show tenant node if available
    if (tenantId && tenantName) {
      const tenantNode = {
        id: `tenant-${tenantId}`,
        type: 'organizationNode',
        position: { x: 0, y: ROOT_Y },
        data: {
          id: `tenant-${tenantId}`,
          name: tenantName,
          entityType: 'organization',
          organizationType: 'tenant',
          isActive: true,
          description: 'Root tenant organization',
          availableCredits: 0,
          reservedCredits: 0,
          entityLevel: 0,
          onNodeClick,
          onEditOrganization,
          onDeleteOrganization,
          onAddSubOrganization,
          onAddLocation,
        },
        style: {
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
        },
        draggable: true,
      };
      nodes.push(tenantNode);
    }
    return { nodes, edges };
  }

  // First pass: Calculate subtree widths and positions
  interface NodeLayout {
    x: number;
    y: number;
    subtreeWidth: number;
    subtreeLeft: number;
    subtreeRight: number;
  }

  const layouts = new Map<string, NodeLayout>();

  // Calculate subtree width recursively (bottom-up)
  function calculateSubtreeLayout(org: any, level: number): { width: number; left: number; right: number } {
    const nodeId = org.entityId || org.organizationId;
    const children = org.children || [];

    if (children.length === 0) {
      // Leaf node - use node width centered
      const layout = {
        width: NODE_WIDTH,
        left: -NODE_WIDTH / 2,
        right: NODE_WIDTH / 2,
      };
      layouts.set(nodeId, {
        x: 0,
        y: ROOT_Y + (level * VERTICAL_SPACING),
        subtreeWidth: layout.width,
        subtreeLeft: layout.left,
        subtreeRight: layout.right,
      });
      return layout;
    }

    // Calculate layout for all children
    const childLayouts = children.map((child: any) => calculateSubtreeLayout(child, level + 1));
    
    // Calculate total width needed for children
    let totalChildrenWidth = 0;
    childLayouts.forEach((layout) => {
      totalChildrenWidth += layout.width;
    });
    
    // Add compact spacing between children (not full subtree width)
    // Use MIN_SIBLING_DISTANCE as padding between nodes, not between subtree boundaries
    const spacing = children.length > 1 ? (children.length - 1) * MIN_SIBLING_DISTANCE : 0;
    const totalWidth = Math.max(NODE_WIDTH, totalChildrenWidth + spacing);

    // Calculate left and right boundaries
    const left = -totalWidth / 2;
    const right = totalWidth / 2;

    layouts.set(nodeId, {
      x: 0, // Will be set in second pass
      y: ROOT_Y + (level * VERTICAL_SPACING),
      subtreeWidth: totalWidth,
      subtreeLeft: left,
      subtreeRight: right,
    });

    return { width: totalWidth, left, right };
  }

  // Second pass: Assign actual x positions (top-down)
  function assignPositions(org: any, parentX: number, level: number): void {
    const nodeId = org.entityId || org.organizationId;
    const children = org.children || [];
    const layout = layouts.get(nodeId)!;

    if (children.length === 0) {
      // Leaf node - position at parent's x (will be adjusted if parent has siblings)
      layout.x = parentX;
    } else {
      // Calculate starting position for children
      let currentX = parentX - layout.subtreeWidth / 2;
      
      // Position children first with compact spacing
      children.forEach((child: any, index: number) => {
        const childLayout = layouts.get(child.entityId || child.organizationId)!;
        const childSubtreeWidth = childLayout.subtreeWidth;
        
        // Position child at the center of its allocated space
        const childX = currentX + childSubtreeWidth / 2;
        childLayout.x = childX;
        
        // Recursively position child's descendants
        assignPositions(child, childX, level + 1);
        
        // Move to next child position with compact spacing
        currentX += childSubtreeWidth;
        if (index < children.length - 1) {
          currentX += MIN_SIBLING_DISTANCE; // Compact spacing between siblings
        }
      });

      // Center parent above its children
      const firstChildLayout = layouts.get(children[0].entityId || children[0].organizationId)!;
      const lastChildLayout = layouts.get(children[children.length - 1].entityId || children[children.length - 1].organizationId)!;
      const childrenCenterX = (firstChildLayout.x + lastChildLayout.x) / 2;
      layout.x = childrenCenterX;
    }
  }

  // Create tenant node at the top if tenant info is available
  let tenantNodeId: string | null = null;
  if (tenantId && tenantName) {
    tenantNodeId = `tenant-${tenantId}`;
    // Calculate total width needed for all root organizations
    let totalRootWidth = 0;
    hierarchy.hierarchy.forEach((org: any) => {
      const layout = calculateSubtreeLayout(org, 1); // Level 1 (under tenant)
      totalRootWidth += layout.width;
    });
    const rootSpacing = hierarchy.hierarchy.length > 1 ? (hierarchy.hierarchy.length - 1) * HORIZONTAL_SPACING : 0;
    const totalWidth = Math.max(NODE_WIDTH, totalRootWidth + rootSpacing);
    
    layouts.set(tenantNodeId, {
      x: 0, // Will be centered later
      y: ROOT_Y,
      subtreeWidth: totalWidth,
      subtreeLeft: -totalWidth / 2,
      subtreeRight: totalWidth / 2,
    });
  }

  // Calculate layouts for all root nodes (now at level 1, under tenant)
  let rootXOffset = tenantNodeId ? -layouts.get(tenantNodeId)!.subtreeWidth / 2 : 0;
  hierarchy.hierarchy.forEach((org: any, index: number) => {
    const layout = calculateSubtreeLayout(org, 1); // Level 1 (under tenant)
    const nodeId = org.entityId || org.organizationId;
    const nodeLayout = layouts.get(nodeId)!;
    
    // Position root node at the center of its subtree
    nodeLayout.x = rootXOffset + layout.width / 2;
    assignPositions(org, nodeLayout.x, 1); // Level 1
    
    // Move to next root position with appropriate spacing
    rootXOffset += layout.width;
    if (index < hierarchy.hierarchy.length - 1) {
      rootXOffset += HORIZONTAL_SPACING; // Spacing between root hierarchies
    }
  });

  // Center tenant node above all root organizations
  if (tenantNodeId) {
    const tenantLayout = layouts.get(tenantNodeId)!;
    if (hierarchy.hierarchy.length > 0) {
      const firstRootLayout = layouts.get(hierarchy.hierarchy[0].entityId || hierarchy.hierarchy[0].organizationId)!;
      const lastRootLayout = layouts.get(hierarchy.hierarchy[hierarchy.hierarchy.length - 1].entityId || hierarchy.hierarchy[hierarchy.hierarchy.length - 1].organizationId)!;
      tenantLayout.x = (firstRootLayout.x + lastRootLayout.x) / 2;
    }
  }

  // Create tenant node if available
  if (tenantNodeId && tenantName) {
    const tenantLayout = layouts.get(tenantNodeId)!;
    const tenantNode = {
      id: tenantNodeId,
      type: 'organizationNode',
      position: { x: tenantLayout.x, y: tenantLayout.y },
      data: {
        id: tenantNodeId,
        name: tenantName,
        entityType: 'organization',
        organizationType: 'tenant',
        isActive: true,
        description: 'Root tenant organization',
        availableCredits: 0,
        reservedCredits: 0,
        entityLevel: 0,
        onNodeClick,
        onEditOrganization,
        onDeleteOrganization,
        onAddSubOrganization,
        onAddLocation,
      },
      style: {
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      },
      draggable: true,
    };
    nodes.push(tenantNode);
    nodeMap.set(tenantNodeId, tenantNode);
  }

  // Create nodes and edges
  function createNodesAndEdges(org: any, parentId: string | null): void {
    const nodeId = org.entityId || org.organizationId;
    const nodeName = org.entityName || org.organizationName;
    const entityType = org.entityType || 'organization';
    const isLocation = entityType === 'location';
    const layout = layouts.get(nodeId)!;

    // Create node
    const node = {
      id: nodeId,
      type: 'organizationNode',
      position: { x: layout.x, y: layout.y },
      data: {
        id: nodeId,
        name: nodeName,
        entityType,
        organizationType: org.organizationType,
        locationType: org.locationType,
        isActive: org.isActive !== false,
        description: org.description,
        availableCredits: org.availableCredits !== undefined && org.availableCredits !== null
          ? (typeof org.availableCredits === 'string' ? parseFloat(org.availableCredits) || 0 : org.availableCredits)
          : undefined,
        reservedCredits: org.reservedCredits !== undefined && org.reservedCredits !== null
          ? (typeof org.reservedCredits === 'string' ? parseFloat(org.reservedCredits) || 0 : org.reservedCredits)
          : undefined,
        entityLevel: org.entityLevel || org.organizationLevel || 0,
        onNodeClick,
        onEditOrganization,
        onDeleteOrganization,
        onAddSubOrganization,
        onAddLocation,
      },
      style: {
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      },
      draggable: true,
    };

    nodes.push(node);
    nodeMap.set(nodeId, node);

    // Create edge from parent
    if (parentId && nodeMap.has(parentId)) {
      edges.push({
        id: `${parentId}-${nodeId}`,
        source: parentId,
        target: nodeId,
        type: 'smoothstep',
        animated: false,
        style: {
          stroke: isLocation ? '#f59e0b' : '#3b82f6',
          strokeWidth: 2,
        },
        markerEnd: {
          type: 'arrowclosed',
          color: isLocation ? '#f59e0b' : '#3b82f6',
        },
      });
    }

    // Process children
    const children = org.children || [];
    children.forEach((child: any) => {
      createNodesAndEdges(child, nodeId);
    });
  }

  // Create all nodes and edges, connecting root orgs to tenant
  hierarchy.hierarchy.forEach((org: any) => {
    createNodesAndEdges(org, tenantNodeId); // Connect to tenant instead of null
  });

  // Center all nodes horizontally
  if (nodes.length > 0) {
    const minX = Math.min(...nodes.map(n => n.position.x));
    const maxX = Math.max(...nodes.map(n => n.position.x));
    const centerX = (minX + maxX) / 2;
    const offsetX = -centerX;

    nodes.forEach(node => {
      node.position.x += offsetX;
    });
  }

  return { nodes, edges };
}

// Inner component that uses useReactFlow hook
function OrganizationHierarchyFlowInner({
  hierarchy,
  loading,
  onRefresh,
  isAdmin = false,
  tenantId,
  tenantName,
  onNodeClick,
  onEditOrganization,
  onDeleteOrganization,
  onAddSubOrganization,
  onAddLocation,
}: OrganizationHierarchyFlowProps) {
  console.log('🎨 OrganizationHierarchyFlowInner rendered:', {
    hasHierarchy: !!hierarchy,
    hierarchyLength: hierarchy?.hierarchy?.length || 0,
    loading,
    hierarchyData: hierarchy
  });
  
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  // Convert hierarchy to React Flow format
  const { nodes, edges } = useMemo(() => {
    console.log('🔄 Converting hierarchy to flow:', hierarchy);
    const result = convertHierarchyToFlow(
      hierarchy,
      tenantId,
      tenantName,
      onNodeClick,
      onEditOrganization,
      onDeleteOrganization,
      onAddSubOrganization,
      onAddLocation
    );
    console.log('✅ Converted to flow:', result.nodes.length, 'nodes', result.edges.length, 'edges');
    return result;
  }, [hierarchy, tenantId, tenantName, onNodeClick, onEditOrganization, onDeleteOrganization, onAddSubOrganization, onAddLocation]);

  // Fit view when nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => {
        fitView({ padding: 0.3, duration: 600, includeHiddenNodes: false });
      }, 200);
    }
  }, [nodes.length, fitView]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 500 });
  }, [fitView]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading organization hierarchy...</p>
        </div>
      </div>
    );
  }

  if (!hierarchy || nodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Organizations Found</h3>
          <p className="text-gray-600 mb-4">
            Create your first organization to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-gray-50" style={{ width: '100%', height: '100%', minHeight: '600px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        className="bg-transparent"
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        panOnScroll={true}
        panOnDrag={[1, 2]} // Pan with middle mouse button or space+click
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
        <Controls className="bg-white border border-gray-200 rounded-lg shadow-sm" />
        <MiniMap
          className="bg-white border border-gray-200 rounded-lg shadow-sm"
          nodeColor={(node) => {
            const entityType = node.data?.entityType;
            if (entityType === 'location') return '#f59e0b';
            return node.data?.isActive ? '#3b82f6' : '#9ca3af';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
        <Panel position="top-left" className="bg-white border border-gray-200 rounded-lg shadow-sm p-3">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-sm">Organization Hierarchy</h3>
              <p className="text-xs text-gray-600">
                {hierarchy.totalOrganizations} {hierarchy.totalOrganizations === 1 ? 'organization' : 'organizations'}
              </p>
            </div>
          </div>
        </Panel>
        <Panel position="top-right" className="flex gap-2">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="bg-white border border-gray-200 shadow-sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleFitView}
            className="bg-white border border-gray-200 shadow-sm"
          >
            <Maximize2 className="w-4 h-4 mr-2" />
            Fit View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => zoomIn({ duration: 300 })}
            className="bg-white border border-gray-200 shadow-sm"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => zoomOut({ duration: 300 })}
            className="bg-white border border-gray-200 shadow-sm"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
        </Panel>
      </ReactFlow>
    </div>
  );
}

// Outer component that provides ReactFlowProvider
export function OrganizationHierarchyFlow(props: OrganizationHierarchyFlowProps) {
  console.log('🎨 OrganizationHierarchyFlow rendered with props:', {
    hasHierarchy: !!props.hierarchy,
    hierarchyLength: props.hierarchy?.hierarchy?.length || 0,
    loading: props.loading,
    totalOrganizations: props.hierarchy?.totalOrganizations || 0
  });
  
  return (
    <ReactFlowProvider>
      <OrganizationHierarchyFlowInner {...props} />
    </ReactFlowProvider>
  );
}

