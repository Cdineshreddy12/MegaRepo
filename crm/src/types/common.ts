import { ACTION, ENTITY, LeadStage } from "@/constants";

// Common interfaces used across components
export interface BaseFormProps {
  onClose: () => void;
}

export interface FormErrors {
  [key: string]: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface LineItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  tax: number;
  total: number;
}

export interface Address {
  _id?: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}


export interface UserRef {
  id: string; // converted from _id
  firstName: string;
  lastName: string;
  email: string;
  role: 'super_admin' | string; // expand as needed
}

export interface FormCallbacks {
  onClose: () => void;
  onSuccess: () => void;
}

export type EntityType = keyof typeof ENTITY;
export type ActionType = keyof typeof ACTION;
export type LeadStageType = keyof typeof LeadStage;
export type Zone = "east" | "west" | "north" | "south";
export type DocumentDeliveryMethod = "email" | "hard_copy" | "online_portal";
export type PaymentTerms =
  | "21_days"
  | "30_days"
  | "45_days"
  | "60_days"
  | "90_days"
  | "120_days"
  | "100%_advance"
  | "on_delivery"
  | "pdc_cheque";

export type BaseUser = {
  _id: string;
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type LeadStatus = "new" | "contacted" | "qualified" | "unqualified";

export type DropdownType =
  | "oem_vendors"
  | "currencies"
  | "renewal_terms"
  | "industries"
  | "company_types"
  | "company_sizes"
  | "contact_types"
  | "lead_sources"
  | "communication_types"
  | "communication_channels"
  | "departments"
  | "user_statuses"
  | "account_status"
  | "countries"
  | "zones"
  | "lead_status"
  | "designation"
  | "service"
  | "opportunity_stages"
  | "opportunity_status"
  | "product_categories"
  | "sales_order_status"
  | "invoice_status"
  | "ownership_type"
  | "warehouse_names";
