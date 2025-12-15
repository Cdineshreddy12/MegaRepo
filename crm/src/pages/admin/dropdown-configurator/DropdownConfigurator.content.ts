import { DropdownType } from "@/types/common";
import { DropdownConfig } from "./types";

export const configContent: {
  [key: string]: { id: DropdownType; name: string; description: string };
  } = {
    account_status: {
      id: "account_status",
      name: "Account Status",
      description: "List of Account Status",
    },  
  communication_channels: {
    id: "communication_channels",
    name: "Communication Channels",
    description: "Channels for communication",
  },
  communication_types: {
    id: "communication_types",
    name: "Communication Types",
    description: "Types of communications",
  },
  company_sizes: {
    id: "company_sizes",
    name: "Company Sizes",
    description: "Size ranges for companies",
  },
  company_types: {
    id: "company_types",
    name: "Company Types",
    description: "Types of companies",
  },
  contact_types: {
    id: "contact_types",
    name: "Contact Types",
    description: "Types of contacts",
  },
  countries: {
    id: "countries",
    name: "Countries",
    description: "List of countries",
  },
  currencies: {
    id: "currencies",
    name: "Currencies",
    description: "Available currencies for transactions",
  },
  designation: {
    id: "designation",
    name: "Designations",
    description: "Employee designation",
  },
  departments: {
    id: "departments",
    name: "Departments",
    description: "Company departments",
  },
  industries: {
    id: "industries",
    name: "Industries",
    description: "Industry sectors for accounts and contacts",
  },
  lead_sources: {
    id: "lead_sources",
    name: "Lead Sources",
    description: "Sources of leads",
  },
  lead_status: {
    id: "lead_status",
    name: "Lead Status",
    description: "List of Lead Status",
  },
  oem_vendors: {
    id: "oem_vendors",
    name: "OEM Vendors",
    description: "Vendors for product quotations",
  },
  opportunity_stages: {
    id: "opportunity_stages",
    name: "Opportunity Stages",
    description: "Opportunity stages for sales process",
  },
  opportunity_status: {
    id: "opportunity_status",
    name: "Opportunity Status",
    description: "Opportunity status for sales process",
  },
  ownership_type: {
    id: "ownership_type",
    name: "Ownership Type",
    description: "Ownership Type for sales process",
  },
  product_categories: {
    id: "product_categories",
    name: "Product Categories",
    description: "Categories for products",
  },
  renewal_terms: {
    id: "renewal_terms",
    name: "Renewal Terms",
    description: "Available renewal terms for contracts",
  },
  
  service: {
    id: "service",
    name: "Service",
    description: "Service options",
  },
  sales_order_status: {
    id: "sales_order_status",
    name: "Sales Order Status",
    description: "Status options for sales orders",
  },
  invoice_status: {
    id: "invoice_status",
    name: "Invoice Status",
    description: "Status options for invoices",
  },
  user_statuses: {
    id: "user_statuses",
    name: "User Statuses",
    description: "Status options for users",
  },
  warehouse_names: {
    id: "warehouse_names",
    name: "Warehouse Names",
    description: "Names of warehouses",
  },
  zones: {
    id: "zones",
    name: "Zones",
    description: "List of zones",
  },
  };
  
  export const dropdownSet = new Set(Object.keys(configContent));
  export const configOptionsSource = Object.keys(configContent).map((key) => {
    return {
      id: key as DropdownType,
      name: configContent[key].name,
      description: configContent[key].description,
    } as DropdownConfig;
  });
  