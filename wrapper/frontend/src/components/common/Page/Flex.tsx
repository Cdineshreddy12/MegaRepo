import React from 'react'
import { cn } from '@/lib/utils'

// Type definitions for better type safety
type FlexDirection = 'row' | 'row-reverse' | 'col' | 'col-reverse'
type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse'
type JustifyContent = 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'
type AlignItems = 'start' | 'end' | 'center' | 'baseline' | 'stretch'
type AlignContent = 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly' | 'stretch'
type FlexGap = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24
type FlexGrow = 0 | 1
type FlexShrink = 0 | 1
type FlexBasis = 'auto' | 'full' | 'fit' | 'max' | 'min' | 'none' | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '12'

interface ResponsiveFlex {
    xs?: FlexDirection
    sm?: FlexDirection
    md?: FlexDirection
    lg?: FlexDirection
    xl?: FlexDirection
    '2xl'?: FlexDirection
}

interface FlexProps {
    children: React.ReactNode
    direction?: FlexDirection
    responsive?: ResponsiveFlex
    wrap?: FlexWrap
    justify?: JustifyContent
    align?: AlignItems
    alignContent?: AlignContent
    gap?: FlexGap
    gapX?: FlexGap
    gapY?: FlexGap
    className?: string
    as?: keyof JSX.IntrinsicElements
}

interface FlexItemProps {
    children: React.ReactNode
    grow?: FlexGrow
    shrink?: FlexShrink
    basis?: FlexBasis
    order?: number
    align?: 'auto' | 'start' | 'end' | 'center' | 'baseline' | 'stretch'
    className?: string
    as?: keyof JSX.IntrinsicElements
}

// Flex direction mappings
const flexDirectionMap: Record<FlexDirection, string> = {
    'row': 'flex-row',
    'row-reverse': 'flex-row-reverse',
    'col': 'flex-col',
    'col-reverse': 'flex-col-reverse'
}

// Flex wrap mappings
const flexWrapMap: Record<FlexWrap, string> = {
    'nowrap': 'flex-nowrap',
    'wrap': 'flex-wrap',
    'wrap-reverse': 'flex-wrap-reverse'
}

// Justify content mappings
const justifyContentMap: Record<JustifyContent, string> = {
    'start': 'justify-start',
    'end': 'justify-end',
    'center': 'justify-center',
    'between': 'justify-between',
    'around': 'justify-around',
    'evenly': 'justify-evenly'
}

// Align items mappings
const alignItemsMap: Record<AlignItems, string> = {
    'start': 'items-start',
    'end': 'items-end',
    'center': 'items-center',
    'baseline': 'items-baseline',
    'stretch': 'items-stretch'
}

// Align content mappings
const alignContentMap: Record<AlignContent, string> = {
    'start': 'content-start',
    'end': 'content-end',
    'center': 'content-center',
    'between': 'content-between',
    'around': 'content-around',
    'evenly': 'content-evenly',
    'stretch': 'content-stretch'
}

// Gap mappings
const gapMap: Record<FlexGap, string> = {
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
const gapXMap: Record<FlexGap, string> = {
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
const gapYMap: Record<FlexGap, string> = {
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

// Flex grow mappings
const flexGrowMap: Record<FlexGrow, string> = {
    0: 'grow-0',
    1: 'grow'
}

// Flex shrink mappings
const flexShrinkMap: Record<FlexShrink, string> = {
    0: 'shrink-0',
    1: 'shrink'
}

// Flex basis mappings
const flexBasisMap: Record<FlexBasis, string> = {
    'auto': 'basis-auto',
    'full': 'basis-full',
    'fit': 'basis-fit',
    'max': 'basis-max',
    'min': 'basis-min',
    'none': 'basis-none',
    '0': 'basis-0',
    '1': 'basis-1',
    '2': 'basis-2',
    '3': 'basis-3',
    '4': 'basis-4',
    '5': 'basis-5',
    '6': 'basis-6',
    '12': 'basis-12'
}

// Align self mappings
const alignSelfMap: Record<NonNullable<FlexItemProps['align']>, string> = {
    'auto': 'self-auto',
    'start': 'self-start',
    'end': 'self-end',
    'center': 'self-center',
    'baseline': 'self-baseline',
    'stretch': 'self-stretch'
}

/**
 * A comprehensive Flexbox component with advanced layout capabilities
 * 
 * @param children - Flex items to be displayed
 * @param direction - Flex direction (row, col, etc.)
 * @param responsive - Responsive direction configuration for different breakpoints
 * @param wrap - Flex wrap behavior
 * @param justify - Justify content alignment
 * @param align - Align items alignment
 * @param alignContent - Align content alignment
 * @param gap - Global gap between flex items
 * @param gapX - Horizontal gap between flex items
 * @param gapY - Vertical gap between flex items
 * @param className - Additional CSS classes
 * @param as - HTML element to render as
 */
export const Flex = ({
    children,
    direction = 'row',
    responsive,
    wrap = 'nowrap',
    justify,
    align,
    alignContent,
    gap,
    gapX,
    gapY,
    className,
    as: Component = 'div'
}: FlexProps) => {
    // Build responsive direction classes
    const getResponsiveClasses = () => {
        if (!responsive) return ''
        
        const classes: string[] = []
        
        if (responsive.xs) {
            classes.push(flexDirectionMap[responsive.xs])
        }
        if (responsive.sm) {
            classes.push(`sm:${flexDirectionMap[responsive.sm]}`)
        }
        if (responsive.md) {
            classes.push(`md:${flexDirectionMap[responsive.md]}`)
        }
        if (responsive.lg) {
            classes.push(`lg:${flexDirectionMap[responsive.lg]}`)
        }
        if (responsive.xl) {
            classes.push(`xl:${flexDirectionMap[responsive.xl]}`)
        }
        if (responsive['2xl']) {
            classes.push(`2xl:${flexDirectionMap[responsive['2xl']]}`)
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

    // Combine all classes
    const flexClasses = cn(
        'flex',
        flexDirectionMap[direction],
        getResponsiveClasses(),
        flexWrapMap[wrap],
        justify && justifyContentMap[justify],
        align && alignItemsMap[align],
        alignContent && alignContentMap[alignContent],
        getGapClasses(),
        className
    )

    return (
        <Component className={flexClasses}>
            {children}
        </Component>
    )
}

/**
 * A flexible FlexItem component with advanced flex properties
 * 
 * @param children - Content to be displayed
 * @param grow - Flex grow property
 * @param shrink - Flex shrink property
 * @param basis - Flex basis property
 * @param order - Flex order property
 * @param align - Align self property
 * @param className - Additional CSS classes
 * @param as - HTML element to render as
 */
export const FlexItem = ({
    children,
    grow,
    shrink,
    basis,
    order,
    align,
    className,
    as: Component = 'div'
}: FlexItemProps) => {
    // Build order styles
    const getOrderStyles = () => {
        if (order === undefined) return {}
        return { order }
    }

    // Combine all classes
    const itemClasses = cn(
        grow !== undefined && flexGrowMap[grow],
        shrink !== undefined && flexShrinkMap[shrink],
        basis && flexBasisMap[basis],
        align && alignSelfMap[align],
        className
    )

    return (
        <Component 
            className={itemClasses}
            style={getOrderStyles()}
        >
            {children}
        </Component>
    )
}