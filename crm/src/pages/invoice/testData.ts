// Default empty invoice order
export const defaultInvoice = {
  orderNumber: "",
  invoiceNumber: "",
  orderReference: "",
  accountId: "",
  status: "draft",
  oem: "",
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: new Date().toISOString().split('T')[0],
  currency: "USD",
  items: [
    {
      type: "product",
      status: "new",
      sku: "",
      description: "",
      quantity: 0,
      unitPrice: 0.00,
      gst: 0
    }
  ],
  subtotal: 0,
  gst: 0,
  discounts: 0,
  freightCharges: 0,
  totalDue: 0,
  paymentTerms: "Net 30 days from invoice date",
  invoiceNotes: "",
  boq: "",
  additionalInstructions: ""
};

// Default empty invoice order item
export const defaultInvoiceItem = {
  type: "product",
  status: "new",
  sku: "",
  description: "",
  quantity: 0,
  unitPrice: 0.00,
  gst: 0
};

// Sample invoice order for testing
export const sampleInvoiceOrder = {
  orderNumber: "IO-2024-001",
  invoiceNumber: "INV-2024-001",
  orderReference: "REF-2024-001",
  accountId: "acc12345",
  status: "Draft",
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
  currency: "USD",
  items: [
    {
      type: "product",
      status: "new",
      sku: "HW-10023",
      description: "Dell Latitude 5420 Laptop",
      quantity: 2,
      unitPrice: 85000.00,
      gst: 18
    },
    {
      type: "service",
      status: "new",
      sku: "SV-20045",
      description: "Extended Warranty - 3 Years",
      quantity: 2,
      unitPrice: 12000.00,
      gst: 18
    }
  ],
  subtotal: 194000,
  gst: 34920,
  discounts: 0,
  freightCharges: 1500,
  totalDue: 230420,
  paymentTerms: "50% advance, 50% upon delivery",
  invoiceNotes: "Please review all items before payment",
  boq: "Hardware and services as specified in the quotation QT-2024-045",
  additionalInstructions: "Handle with care. Contact support for any issues."
};

// Status options
export const statusOptions = [
  { value: "Draft", label: "Draft" },
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Sent", label: "Sent" },
  { value: "Paid", label: "Paid" },
  { value: "Overdue", label: "Overdue" },
  { value: "Cancelled", label: "Cancelled" }
];

// Currency options
export const currencyOptions = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "INR", label: "INR - Indian Rupee" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "JPY", label: "JPY - Japanese Yen" }
];

// Product type options
export const productTypeOptions = [
  { value: "product", label: "Product" },
  { value: "service", label: "Service" },
  { value: "subscription", label: "Subscription" },
  { value: "license", label: "License" }
];

// Item status options
export const itemStatusOptions = [
  { value: "new", label: "New" },
  { value: "renewal", label: "Renewal" },
  { value: "upgrade", label: "Upgrade" },
  { value: "replacement", label: "Replacement" }
];