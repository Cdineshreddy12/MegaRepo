import { EntityType } from "@/types/common";

export const ACTION = {
    CREATE: 'CREATE',
    MODIFY: 'MODIFY',
    DELETE: "DELETE",
    VIEW: "VIEW",
    PREVIEW: 'PREVIEW'
} as const

export const ENTITY = {
    ACCOUNT: 'ACCOUNT',
    LEAD: 'LEAD',
    CONTACT: 'CONTACT',
    OPPORTUNITY: 'OPPORTUNITY',
    QUOTATION: 'QUOTATION',
    TICKET: 'TICKET',
    USER: 'USER',
    ACTIVITY_LOG: 'ACTIVITY_LOG',
    AI_INSIGHTS: 'AI_INSIGHTS',
    SALES_ORDER: 'SALES_ORDER',
    INVOICE: 'INVOICE',
    PRODUCT_ORDER: 'PRODUCT_ORDER',
    INVENTORY: 'INVENTORY',
    SERIAL_NUMBER: 'SERIAL_NUMBER',
    MOVEMENT: 'MOVEMENT',
} as const

export const LeadStage = {
    QUALIFICATION: 'qualification',
    DISCOVERY: 'discovery',
    PROPOSAL: 'proposal'
}

export const countryOptions = [
    { value: "IN", label: "India" },
    { value: "US", label: "United States" },
    { value: "CA", label: "Canada" },
    { value: "UK", label: "United Kingdom" },
  ];
  
export const zoneOptions = [
    { value: "east", label: "East" },
    { value: "west", label: "West" },
    { value: "north", label: "North" },
    { value: "south", label: "South" },
]

export const RupeeSymbol = "₹"

type RoutePath = EntityType | 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD' | 'DASHBOARD' | 'AI_INSIGHTS'

export const ROUTE_PATH: Record<RoutePath, string> = {
    ACCOUNT: '/accounts',
    LEAD: '/leads',
    CONTACT: '/contacts',
    OPPORTUNITY: '/opportunities',
    QUOTATION: '/quotations',
    TICKET: '/tickets',
    USER: '/users',
    ACTIVITY_LOG: '/activity-logs',
    AI_INSIGHTS: 'ai-insights',
    LOGIN: '/',
    REGISTER: '/',
    FORGOT_PASSWORD: '/',
    DASHBOARD: '/',
    SALES_ORDER: '/sales-orders',
    INVOICE: '/invoices',
    PRODUCT_ORDER: '/product-orders',
    INVENTORY: '/inventory',
    SERIAL_NUMBER: '/serial-numbers',
    MOVEMENT: '/movements',
}