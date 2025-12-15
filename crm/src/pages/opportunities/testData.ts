import { OpportunityFormValues } from "./types";

export const defaultOpportunityData: OpportunityFormValues = {
  name: "", // Default empty string for name
  accountId: "", // Default empty string for accountId
  primaryContactId: "", // Default empty string for primaryContactId
  stage: "qualification", // Default stage set to "qualification"
  status: "prospect", // Default status set to "prospect"
  type: "new", // Default type set to "new"
  oem: "", // Default empty string for OEM
  revenue: 0.00, // Default revenue set to 0.00 (with decimal precision)
  profitability: 0.00, // Default profitability set to 0.00 (with decimal precision)
  expectedProfit: 0.00, // Default expected profit to 0.00 (with decimal precision)
  expense: 0.00, // Default expense to 0.00 (with decimal precision)
  expectedCloseDate: new Date(), // Default to the current date
  actualCloseDate: undefined, // Default to undefined for actualCloseDate
  description: "", // Default empty string for description
  nextStep: "", // Default empty string for next step
  competition: "", // Default empty string for competition
  decisionCriteria: "", // Default empty string for decision criteria
  assignedTo: "", // Default empty string for assigned user
  services: [] // Default empty array for services
};
  
export const sampleOpportunityData: OpportunityFormValues = {
  name: "Expansion Deal for Client XYZ",
  accountId: "account_001",
  primaryContactId: "contact_001",
  oem: "vendor_001",
  stage: "negotiation",
  status: "commit",
  type: "renewal",
  revenue: 500000.50, // Example revenue with decimal
  profitability: 85.75, // Example profitability percentage with decimal
  expectedProfit: 100000.25, // Example expected profit with decimal
  expense: 200000.75, // Example expense with decimal
  expectedCloseDate: new Date(new Date().getTime() + 15 * 24 * 60 * 60 * 1000), // Set to 15 days from now
  actualCloseDate: new Date(new Date().getTime() + 20 * 24 * 60 * 60 * 1000), // Set to 20 days from now
  description: "The client has shown strong interest in our upgraded product offering.",
  nextStep: "Finalize the proposal with pricing adjustments",
  competition: "Competitor X, Competitor Y",
  decisionCriteria: "Long-term relationship, service quality",
  assignedTo: "user_001",
  services: [
    { serviceType: "implementation", serviceRevenue: 50000.50 },
    { serviceType: "consulting", serviceRevenue: 25000.75 }
  ]
};