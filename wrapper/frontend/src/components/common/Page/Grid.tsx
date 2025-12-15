import React from 'react'
import { cn } from '@/lib/utils'

// Type definitions for better type safety
type GridColumnCount = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
type GridGap = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24
type GridAutoFit = 'auto-fit' | 'auto-fill'
type GridFlow = 'row' | 'col' | 'dense' | 'row-dense' | 'col-dense'

interface ResponsiveGrid {
    xs?: GridColumnCount
    sm?: GridColumnCount
    md?: GridColumnCount
    lg?: GridColumnCount
    xl?: GridColumnCount
    '2xl'?: GridColumnCount
}

interface GridProps {
    children: React.ReactNode
    columns?: ResponsiveGrid
    gap?: GridGap
    gapX?: GridGap
    gapY?: GridGap
    autoFit?: GridAutoFit
    minWidth?: string
    flow?: GridFlow
    areas?: string[]
    template?: string
    className?: string
    as?: keyof JSX.IntrinsicElements
}

// Comprehensive grid column mappings
const gridColsMap: Record<GridColumnCount, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    7: 'grid-cols-7',
    8: 'grid-cols-8',
    9: 'grid-cols-9',
    10: 'grid-cols-10',
    11: 'grid-cols-11',
    12: 'grid-cols-12'
}

// Gap mappings for different spacing values
const gapMap: Record<GridGap, string> = {
    0: 'gap-0',
    1: 'gap-1',
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
    5: 'gap-5',
    6: 'gap-6',
    8: 'gap-8',
    10: 'gap-10',
    12: 'gap-12',
    16: 'gap-16',
    20: 'gap-20',
    24: 'gap-24'
}

// Gap X mappings
const gapXMap: Record<GridGap, string> = {
    0: 'gap-x-0',
    1: 'gap-x-1',
    2: 'gap-x-2',
    3: 'gap-x-3',
    4: 'gap-x-4',
    5: 'gap-x-5',
    6: 'gap-x-6',
    8: 'gap-x-8',
    10: 'gap-x-10',
    12: 'gap-x-12',
    16: 'gap-x-16',
    20: 'gap-x-20',
    24: 'gap-x-24'
}

// Gap Y mappings
const gapYMap: Record<GridGap, string> = {
    0: 'gap-y-0',
    1: 'gap-y-1',
    2: 'gap-y-2',
    3: 'gap-y-3',
    4: 'gap-y-4',
    5: 'gap-y-5',
    6: 'gap-y-6',
    8: 'gap-y-8',
    10: 'gap-y-10',
    12: 'gap-y-12',
    16: 'gap-y-16',
    20: 'gap-y-20',
    24: 'gap-y-24'
}

// Grid flow mappings
const gridFlowMap: Record<GridFlow, string> = {
    'row': 'grid-flow-row',
    'col': 'grid-flow-col',
    'dense': 'grid-flow-dense',
    'row-dense': 'grid-flow-row-dense',
    'col-dense': 'grid-flow-col-dense'
}

/**
 * A flexible and responsive Grid component with comprehensive CSS Grid features
 * 
 * @param children - Grid items to be displayed
 * @param columns - Responsive column configuration for different breakpoints
 * @param gap - Global gap between grid items
 * @param gapX - Horizontal gap between grid items
 * @param gapY - Vertical gap between grid items
 * @param autoFit - Auto-fit behavior for responsive grids
 * @param minWidth - Minimum width for auto-fit columns (CSS value)
 * @param flow - Grid flow direction
 * @param areas - Grid template areas (CSS Grid)
 * @param template - Custom grid template
 * @param className - Additional CSS classes
 * @param as - HTML element to render as
 */
export const Grid = ({
    children,
    columns = { xs: 1, sm: 2, md: 3, lg: 4 },
    gap = 6,
    gapX = 6,
    gapY = 6,
    autoFit,
    minWidth = '250px',
    flow = 'row',
    areas,
    template,
    className,
    as: Component = 'div'
}: GridProps) => {
    // Build responsive column classes
    const getColumnClasses = () => {
        const classes: string[] = []
        
        if (columns.xs) {
            classes.push(gridColsMap[columns.xs])
        }
        if (columns.sm) {
            classes.push(`sm:${gridColsMap[columns.sm]}`)
        }
        if (columns.md) {
            classes.push(`md:${gridColsMap[columns.md]}`)
        }
        if (columns.lg) {
            classes.push(`lg:${gridColsMap[columns.lg]}`)
        }
        if (columns.xl) {
            classes.push(`xl:${gridColsMap[columns.xl]}`)
        }
        if (columns['2xl']) {
            classes.push(`2xl:${gridColsMap[columns['2xl']]}`)
        }
        
        return classes.join(' ')
    }

    // Build gap classes
    const getGapClasses = () => {
        const classes: string[] = []
        
        if (gap !== undefined) {
            classes.push(gapMap[gap])
        }
        if (gapX !== undefined) {
            classes.push(gapXMap[gapX])
        }
        if (gapY !== undefined) {
            classes.push(gapYMap[gapY])
        }
        
        return classes.join(' ')
    }

    // Build auto-fit classes
    const getAutoFitClasses = () => {
        if (!autoFit) return ''
        
        const autoFitClass = autoFit === 'auto-fit' ? 'grid-cols-[repeat(auto-fit,minmax(250px,1fr))]' : 'grid-cols-[repeat(auto-fill,minmax(250px,1fr))]'
        return autoFitClass.replace('250px', minWidth)
    }

    // Build grid template areas
    const getGridTemplateAreas = () => {
        if (!areas || areas.length === 0) return {}
        
        const areasString = areas.map(area => `"${area}"`).join(' ')
        return {
            gridTemplateAreas: areasString
        }
    }

    // Build custom template
    const getCustomTemplate = () => {
        if (!template) return {}
        return {
            gridTemplate: template
        }
    }

    // Combine all classes
    const gridClasses = cn(
        'grid',
        getColumnClasses(),
        getGapClasses(),
        getAutoFitClasses(),
        gridFlowMap[flow],
        className
    )

    // Combine all styles
    const gridStyles = {
        ...getGridTemplateAreas(),
        ...getCustomTemplate()
    }

    return (
        <Component 
            className={gridClasses}
            style={gridStyles}
        >
            {children}
        </Component>
    )
}

interface GridItemProps {
    children: React.ReactNode
    className?: string
    as?: keyof JSX.IntrinsicElements
}

export const GridItem = ({ children, className, as: Component = 'div' }: GridItemProps) => {
    return (
        <Component className={className}>
            {children}
        </Component>
    )
}
