import React from 'react';
import { Layout, Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

type DashboardGridProps = {
  layout: Layout[];
  children: React.ReactNode[];
  cols?: number;
  rowHeight?: number;
  width?: number;
  draggableHandle?: string;
};

const breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const cols = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };

const DashboardGrid: React.FC<DashboardGridProps> = ({
  layout,
  children,
  rowHeight = 100,
  draggableHandle = ".drag-handle",
}) => {
  if (!Array.isArray(children)) {
    throw new Error("DashboardGrid children must be an array");
  }

  // Map the same layout to all breakpoints for simplicity
  const layouts = {
    lg: layout,
    md: layout,
    sm: layout,
    xs: layout,
    xxs: layout,
  };

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      breakpoints={breakpoints}
      cols={cols}
      rowHeight={rowHeight}
      isResizable
      isDraggable
      draggableHandle={draggableHandle}
      // width prop is not needed, handled by WidthProvider
    >
      {children.map((child, index) => (
        <div key={layout[index].i}>
          {child}
        </div>
      ))}
    </ResponsiveGridLayout>
  );
};

export default DashboardGrid;
