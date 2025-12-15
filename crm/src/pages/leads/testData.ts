import { LeadFormValues, LeadSource, Status } from "./types";

export const dummyLeadData: LeadFormValues = {
  firstName: "John",
  lastName: "Doe",
  email: "johndoe@example.com",
  phone: "123-456-7890",
  companyName: "Acme Corp",
  jobTitle: "Sales Manager",
  source: "website",
  status: "new",
  score: 85,
  notes: "Interested in enterprise solutions.",
  zone: 'east',
  assignedTo: null

};


export const defaultValues: LeadFormValues = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    companyName: "",
    jobTitle: "",
    source: "website" as LeadSource,
    status: "new" as Status,
    score: 0,
    notes: "",
    zone: 'east',
    assignedTo: null,  
  };
  
