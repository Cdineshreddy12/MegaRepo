import { z } from "zod";

export const UserFormSchema = z.object({
  employeeCode: z.string().min(1, { message: "Employee Code is required" }),
  firstName: z.string().min(1, { message: "Employee First Name is required" }),
  lastName: z.string().optional(),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, {
    message: "Password should be at least 6 chars"
  }),
  contactMobile: z.string().min(1, { message: "Contact Mobile is required" }),
  zone: z.array(z.string()),
  role: z.enum(['super_admin', 'admin', 'user']).default('user'),
   designation: z.string().min(1) ,//z.enum(["national_head", "zonal_head", "deal_owner"]),  or 
  isActive: z.boolean().optional().default(false),
});

export default UserFormSchema;
export type UserFormValues = z.infer<typeof UserFormSchema>;
