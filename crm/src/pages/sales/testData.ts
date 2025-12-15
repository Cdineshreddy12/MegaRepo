// Updated defaultSalesOrder to match the schema structure
export const defaultSalesOrder = {
  // Basic Information
  orderNumber: "",
  accountId: "",
  primaryContactId: "",
  opportunityId: null,
  quotationId: null,
  
  // Status
  status: "draft",
  
  // Required OEM field
  oem: "",
  
  // Dates (using current date as default)
  orderDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
  deliveryDate: "",
  expectedDeliveryDate: "",
  
  // Contact and CRM
  contact: "",
  crm: "",
  
  // Shipping Information
  shippingMethod: "Courier",
  freightTerms: "",
  
  // Currency (matching quotation defaults)
  quoteCurrency: "INR",
  currencyRate: 1.00,
  
  // Items (empty array, will be populated by user)
  items: [],
  
  // Financial totals (will be calculated)
  subtotal: 0,
  gstTotal: 0,
  freightCharges: 0,
  total: 0,
  
  // Terms (matching quotation structure)
  terms: {
    prices: "",
    boq: "",
    paymentTerms: "",
  },
  
  // Additional fields
  renewalTerm: "",
  notes: "",
  
  // Addresses (optional)
  billingAddress: undefined,
  shippingAddress: undefined,
  
  // User tracking (will be set by backend)
  createdBy: "",
  updatedBy: "",
};

// Shipping method options for dropdown
export const shippingMethodOptions = [
  { value: "Courier", label: "Courier" },
  { value: "Self Pickup", label: "Self Pickup" },
  { value: "Logistics Partner", label: "Logistics Partner" },
];

// Status options for dropdown (if needed)
export const salesOrderStatusOptions = [
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

// Currency options
export const currencyOptions = [
  { value: "INR", label: "INR" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
];

// Item type options
export const itemTypeOptions = [
  { value: "product", label: "Product" },
  { value: "service", label: "Service" },
];

// Item status options
export const itemStatusOptions = [
  { value: "new", label: "New" },
  { value: "renewal", label: "Renewal" },
];