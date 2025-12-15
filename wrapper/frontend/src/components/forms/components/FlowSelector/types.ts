import React from 'react';

/**
 * Configuration for a flow option in the FlowSelector
 */
export interface FlowConfig {
  /** Unique identifier for the flow */
  id: string;
  /** Display name for the flow */
  name: string;
  /** Optional description/subtitle for the flow */
  description?: string;
  /** Optional icon to display with the flow */
  icon?: React.ReactNode;
  /** Optional additional data associated with the flow */
  data?: Record<string, any>;
}

/**
 * Props for the FlowSelector component
 */
export interface FlowSelectorProps {
  /** Array of flow configurations to display */
  flows: FlowConfig[];
  /** Callback when a flow is selected */
  onSelect: (flow: FlowConfig) => void;
  /** Optional ID of the flow to pre-select */
  defaultFlowId?: string;
  /** Optional custom renderer for each flow item */
  renderItem?: (flow: FlowConfig, isSelected: boolean, onClick: () => void) => React.ReactNode;
  /** Optional CSS class name for the container */
  className?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Optional title for the selector */
  title?: string;
  /** Optional description for the selector */
  description?: string;
  /** Layout variant - grid or list */
  variant?: 'grid' | 'list';
  /** Maximum number of columns in grid layout */
  maxColumns?: number;
}

/**
 * Internal state for the FlowSelector component
 */
export interface FlowSelectorState {
  selectedFlowId: string | null;
}
