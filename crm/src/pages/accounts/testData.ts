import { AccountFormValues } from "./types";

export const defaultAccountState: AccountFormValues = {
  // **Account Identification**
  companyName: "", // Default to an empty string (required field)
  phone: "", // Default to an empty string or null if optional
  email: "", // Default to an empty string for the email field
  website: "", // Default to an empty string or null if optional
  status: "active", // Default status is "active"
  description: "", // Default to an empty string or null if optional

  parentAccount: "", // Default to an empty string or null if optional
  accountType: "", // Default to an empty string or null if optional
  segment: "", // Default to an empty string or null if optional

  // **Address & Location**
  billingAddress: {
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: ''
  }, // Default to empty address object
  sameAsBilling: false, // Default to false if optional
  shippingAddress: {
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: ''
  }, // Default to empty address object
  zone: "north", // Default to null or empty value

  // **Financial & Business Information**
  ownershipType: null, // Default to null (nullable field)
  industry: "", // Default to an empty string
  employeesCount: 1, // Default to 1 employee (based on schema requirement)
  annualRevenue: 0, // Default to 0 for annual revenue (optional)
  gstNo: "", // Default to an empty string
  creditTerm: null, // Default to null for optional credit terms

  // **Assigned and Invoicing**
  assignedTo: "", // Default to an empty string or null if optional
  invoicing: null, // Default to null if optional
};

export const formattedSampleData = {
  name: "Sample Company",
  website: "https://samplecompany.com",
  industry: "technology",
  employeesCount: 100,
  annualRevenue: 5000000,
  type: "enterprise",
  ownershipType: "private",
  status: "active", // default status value
  description: "This is a sample company for testing purposes.",

  // Billing address restructured to match schema
  billingAddress: {
    street: "123 Sample Street",
    city: "Sample City",
    state: "Sample State",
    zipCode: "12345",
    country: "US",
  },

  // Shipping address restructured to match schema
  shippingAddress: {
    street: "123 Sample Street",
    city: "Sample City",
    state: "Sample State",
    zipCode: "12345",
    country: "US",
  },

  // Optional fields, can be left as undefined
  taxId: undefined,

  // For createdBy and assignedTo, we will leave them undefined
  createdBy: undefined,
  assignedTo: undefined,

  // Default timestamp fields
  createdAt: new Date(),
  updatedAt: new Date(),
};
