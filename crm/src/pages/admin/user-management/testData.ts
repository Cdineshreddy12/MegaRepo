import { UserFormValues } from "./zodSchema";

export const defaultValues: UserFormValues = {
  employeeCode: '',
  firstName: '',
  lastName: '',
  email: '',
  contactMobile: '',
  password: '',
  zone: [],
  role: 'user', // Set default role
  designation: 'deal_owner', // Set default designation
  isActive: false
};