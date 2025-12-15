import { ContactFormValues } from "./types";

export const defaultValues: ContactFormValues = {
  assignedTo: "",
  accountId: "",
  createdBy: "",
  contactImage: null,
  businessCard: null,
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  jobTitle: "",
  department: "",
  contactType: "",
  leadSource: "",
  address: {
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  },
};

export const SampleContactData: ContactFormValues = {
  accountId: "1",
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  phone: "123-456-7890",
  jobTitle: "Software Engineer",
  department: "Engineering",
  contactType: "decision_maker",
  leadSource: "website",
  address: {
    street: "123 Main St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94101",
    country: "US",
  },
  assignedTo: "",
  createdBy: ""
}