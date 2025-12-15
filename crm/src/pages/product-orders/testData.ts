// Default empty product order
export const defaultProductOrder = {
  orderNumber: "",
  srdar: "",
  accountId: "",
  contact: "",
  status: "Draft",
  shippingMethod: "Courier",
  freightTerms: "",
  currency: "INR",
  exchangeRate: 1,
  expectedDeliveryDate: new Date().toISOString().split('T')[0],
  items: [
    {
      type: "",
      status: "",
      sku: "",
      description: "",
      quantity: 0,
      unitPrice: 0.00,
      gst: 0
    }
  ],
  paymentTerms: "",
  priceTerms: "",
  boq: "",
  otherTerms: "",
  freightCharges: 0,
  subtotal: 0,
  total: 0,
  gstTotal: 0
};

// Default empty product order item
export const defaultProductOrderItem = {
  type: "",
  status: "",
  sku: "",
  description: "",
  quantity: 0,
  unitPrice: 0.00,
  gst: 0
};

// Sample product order for testing
export const sampleProductOrder = {
  orderNumber: "PO-2024-001",
  srdar: "SR-2024-001",
  accountId: "acc12345",
  contact: "John Doe",
  status: "Draft",
  shippingMethod: "Express",
  freightTerms: "FOB Destination",
  currency: "INR",
  exchangeRate: 1,
  expectedDeliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days from now
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
  paymentTerms: "50% advance, 50% upon delivery",
  priceTerms: "Prices valid for 30 days from order date. Price includes standard warranty.",
  boq: "Hardware and services as specified in the quotation QT-2024-045",
  otherTerms: "Subject to our standard terms and conditions. Installation will be completed within 7 days of delivery.",
  freightCharges: 1500,
  subtotal: 194000,
  total: 230420, // Including GST and freight charges
  gstTotal: 34920
};

// Status options
export const statusOptions = [
  { value: "Draft", label: "Draft" },
  { value: "Confirmed", label: "Confirmed" },
  { value: "In Progress", label: "In Progress" },
  { value: "Ready for Delivery", label: "Ready for Delivery" },
  { value: "Delivered", label: "Delivered" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" }
];

// Shipping method options
export const shippingMethodOptions = [
  { value: "Courier", label: "Courier" },
  { value: "Standard", label: "Standard Delivery" },
  { value: "Express", label: "Express Delivery" },
  { value: "Overnight", label: "Overnight Delivery" },
  { value: "Pickup", label: "Customer Pickup" },
  { value: "Air Freight", label: "Air Freight" },
  { value: "Sea Freight", label: "Sea Freight" }
];

// Currency options
export const currencyOptions = [
  { value: "INR", label: "INR - Indian Rupee" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "AED", label: "AED - UAE Dirham" },
  { value: "SGD", label: "SGD - Singapore Dollar" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "AUD", label: "AUD - Australian Dollar" }
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

// Contact options (example - you would typically fetch these from an API)
export const contactOptions = [
  { value: "john-doe", label: "John Doe" },
  { value: "jane-smith", label: "Jane Smith" },
  { value: "mike-wilson", label: "Mike Wilson" },
  { value: "sarah-johnson", label: "Sarah Johnson" }
];

// Freight terms options
export const freightTermsOptions = [
  { value: "FOB Origin", label: "FOB Origin" },
  { value: "FOB Destination", label: "FOB Destination" },
  { value: "CIF", label: "CIF - Cost, Insurance & Freight" },
  { value: "EXW", label: "EXW - Ex Works" },
  { value: "DDP", label: "DDP - Delivered Duty Paid" },
  { value: "DAP", label: "DAP - Delivered at Place" }
];