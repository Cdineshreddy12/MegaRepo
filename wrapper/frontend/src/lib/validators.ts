import { z } from "zod"

// Common validation schemas
export const emailSchema = z.string().email("Invalid email address")
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters")
export const phoneSchema = z.string().regex(/^\+?[\d\s-()]+$/, "Invalid phone number")

// User validation
export const userSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  email: emailSchema,
  phone: phoneSchema.optional(),
  avatar: z.string().url().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const createUserSchema = userSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const updateUserSchema = createUserSchema.partial()

// Organization validation
export const organizationSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Organization name is required"),
  code: z.string().min(2, "Organization code must be at least 2 characters"),
  description: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const createOrganizationSchema = organizationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const updateOrganizationSchema = createOrganizationSchema.partial()

// Application validation
export const applicationSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Application name is required"),
  description: z.string().optional(),
  url: z.string().url().optional(),
  icon: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const createApplicationSchema = applicationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const updateApplicationSchema = createApplicationSchema.partial()

// API response schemas
export const apiResponseSchema = <T>(dataSchema: z.ZodType<T>) =>
  z.object({
    data: dataSchema,
    message: z.string().optional(),
    success: z.boolean(),
  })

export const paginatedResponseSchema = <T>(itemSchema: z.ZodType<T>) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
    message: z.string().optional(),
    success: z.boolean(),
  })
