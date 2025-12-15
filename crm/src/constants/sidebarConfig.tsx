import {
  LayoutDashboard,
  UserPlus,
  Users,
  Building,
  Briefcase,
  FileCheck,
  FileSpreadsheet,
  Receipt,
  DollarSign,
  PhoneCall,
  Ticket,
  FileText,
  PieChart,
  Settings,
  Shield,
  HelpCircle,
  Package2,
  FileEdit,
  BarChart3,
} from "lucide-react";

// Permission-based menu items
export const getMenuItems = (permissions: any) => [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    id: "dashboard",
    url: "dashboard",
    show: () => permissions?.canViewDashboard?.() ?? true, // Default to true if permissions not loaded
  },
  { 
    icon: UserPlus, 
    title: "Leads", 
    id: "leads", 
    url: "leads",
    show: () => permissions?.canViewLeads?.() ?? true,
  },
  { 
    icon: Users, 
    title: "Contacts", 
    id: "contacts", 
    url: "contacts",
    show: () => permissions?.canViewContacts?.() ?? true,
  },
  { 
    icon: Building, 
    title: "Accounts", 
    id: "accounts", 
    url: "accounts",
    show: () => permissions?.canViewAccounts?.() ?? true,
  },
  {
    icon: Briefcase,
    title: "Opportunities",
    id: "opportunities",
    url: "opportunities",
    show: () => permissions?.canViewOpportunities?.() ?? true,
  },
  // Sales Section
  { 
    icon: FileCheck, 
    title: "Quotations", 
    id: "quotations", 
    url: "quotations",
    show: () => permissions?.canViewQuotations?.() ?? true,
  },
  {
    icon: FileSpreadsheet,
    title: "Sales Orders",
    id: "sales-orders",
    url: "sales-orders",
    show: () => permissions?.canViewSalesOrders?.() ?? true,
  },
  {
    icon: Receipt,
    title: "Invoices",
    id: "invoices",
    url: "invoices",
    show: () => permissions?.canViewInvoices?.() ?? true,
  },
  {
    icon: Package2,
    title: "Product Orders",
    id: "product-orders",
    url: "product-orders",
    show: () => permissions?.canViewProductOrders?.() ?? true,
  },
  {
    icon: Briefcase,
    title: "Inventory",
    id: "inventory",
    url: "inventory",
    show: () => permissions?.canViewInventory?.() ?? true,
  },
  {
    icon: DollarSign,
    title: "Payments",
    id: "payments",
    url: "payments",
    show: () => permissions?.canViewPayments?.() ?? false, // Default disabled
  },
  // Other Modules
  {
    icon: PhoneCall,
    title: "Communications",
    id: "communications",
    url: "communications",
    show: () => permissions?.canViewCommunications?.() ?? false,
  },
  { 
    icon: Ticket, 
    title: "Tickets", 
    id: "tickets", 
    url: "tickets",
    show: () => permissions?.canViewTickets?.() ?? true,
  },
  {
    icon: FileEdit,
    title: "Form Builder",
    id: "form-template-builder",
    url: "form-template-builder",
    show: () => true, // Direct access during development
  },
  {
    icon: BarChart3,
    title: "Analytics",
    id: "analytics",
    url: "analytics",
    show: () => true, // Show analytics to all users
  },
  {
    icon: FileText,
    title: "Documents",
    id: "documents",
    url: "documents",
    show: () => permissions?.canViewDocuments?.() ?? false,
  },
];

// Admin section with permission checks
export const getAdminMenuItems = (permissions: any) => [
  {
    icon: Shield,
    title: (title: string = "admin") => title,
    id: "admin",
    url: "admin",
    show: () => permissions?.isAdmin?.() ?? false,
  },
  {
    icon: PieChart,
    title: "Reports",
    id: "reports",
    url: "reports",
    show: () => permissions?.canViewReports?.() ?? false,
  },
];

// Secondary menu with permission checks
export const getSecondaryMenuItems = (permissions: any) => [
  {
    icon: Settings,
    title: "Settings",
    id: "settings",
    url: "settings",
    show: () => permissions?.canManageSettings?.() ?? false,
  },
  {
    icon: HelpCircle,
    title: "Get Help",
    id: "get-help",
    url: "get-help",
    show: () => true, // Always show help
  },
];

// Legacy exports for backward compatibility
export const defaultMenuItems = getMenuItems({});
export const adminMenuItems = getAdminMenuItems({});
export const secondaryMenuItems = getSecondaryMenuItems({});

export default {
  getMenuItems,
  getAdminMenuItems,
  getSecondaryMenuItems,
  menuItems: defaultMenuItems,
  adminMenuItems,
  secondaryMenuItems,
  menuItemSet: new Set([
    ...defaultMenuItems.map((item) => item.id),
    ...adminMenuItems.map((item) => item.id),
  ]),
};
