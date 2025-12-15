import { Quotation, QuotationItem } from "@/services/api/quotationService";

const sampleQuotationItem: QuotationItem = {
    type: 'service',
    status: 'renewal',
    sku: 'SRV-001',
    description: 'Software license renewal',
    quantity: 1,
    unitPrice: 500,
    gst: 18, // 18% GST
  };
  
  export const sampleQuotation: Quotation = {
    id: 'Q-001234',
    quotationNumber: 'Q-001234',
    accountId: '',
    contactId: '', // Optional, can be left empty or null
    status: 'sent',
    issueDate: '2025-02-23T10:00:00Z',
    validUntil: '2025-03-23T10:00:00Z',
    items: [
      sampleQuotationItem,
      {
        type: 'product',
        status: 'new',
        sku: 'PRD-002',
        description: 'Laptop',
        quantity: 2,
        unitPrice: 35000,
        gst: 18, // 18% GST
      },
    ],
    subtotal: 76300, // Total before GST
    gstTotal: 13734, // GST total
    total: 90034, // Total after GST
    terms: 'Payment due in 30 days',
    notes: 'Prices are inclusive of shipping.',
    oem: 'OEMTech Inc.',
    currencyRate: 1.00,
    quoteCurrency: 'INR',
    renewalTerm: '1 year',
  };
  

  export const defaultQuotationItem: QuotationItem = {
    type: 'product', // Default to 'product'
    status: 'new', // Default to 'new'
    sku: '', // Default to empty string
    description: '',
    quantity: 1, // Default to 1
    unitPrice: 0, // Default to 0
    gst: 0, // Default GST 0%
    total: 0, // Total = quantity * (unitPrice + gst)
  };
  
  export const defaultQuotation: Quotation = {
    id: '', // Default to empty string (not set)
    quotationNumber: '', // Default to empty string
    accountId: '', // Default to empty string
    contactId: '', // Default to empty string (optional)
    status: 'draft', // Default status
    issueDate: new Date().toISOString(), // Current date as ISO string
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from today as ISO string
    items: [defaultQuotationItem], // Default to one quotation item
    subtotal: 0, // Default subtotal
    gstTotal: 0, // Default GST total
    total: 0, // Default total (subtotal + gstTotal)
    terms: '', // Default to empty string
    notes: '', // Default to empty string
    oem: '', // Default to empty string
    currencyRate: 1.00, // Default currency rate
    quoteCurrency: 'INR', // Default quote currency
    renewalTerm: '', // Default to empty string (optional)
  };
  