import { z } from 'zod';

/**
 * Validation schemas for the example onboarding form
 */

// Personal Information Step
export const personalInfoSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  bio: z.string().min(10, 'Bio must be at least 10 characters').optional(),
});

// Address Information Step
export const addressInfoSchema = z.object({
  street: z.string().min(5, 'Street address must be at least 5 characters'),
  city: z.string().min(2, 'City must be at least 2 characters'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code'),
  country: z.string().min(2, 'Country is required'),
  isPrimary: z.boolean().optional(),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z$/, 'Please enter a valid GSTIN (15 digits)').optional(),
});

// Preferences Step
export const preferencesSchema = z.object({
  newsletter: z.boolean(),
  notifications: z.boolean(),
  theme: z.enum(['light', 'dark', 'system']),
  language: z.string().min(2, 'Language is required'),
  marketing: z.boolean(),
  termsAccepted: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
});

// Complete form schema
export const completeOnboardingSchema = z.object({
  ...personalInfoSchema.shape,
  ...addressInfoSchema.shape,
  ...preferencesSchema.shape,
});

// Field-specific validation schemas
export const fieldValidationSchemas = {
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  bio: z.string().min(10, 'Bio must be at least 10 characters').optional(),
  street: z.string().min(5, 'Street address must be at least 5 characters'),
  city: z.string().min(2, 'City must be at least 2 characters'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code'),
  country: z.string().min(2, 'Country is required'),
  isPrimary: z.boolean().optional(),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z$/, 'Please enter a valid GSTIN (15 digits)').optional(),
  newsletter: z.boolean(),
  notifications: z.boolean(),
  theme: z.enum(['light', 'dark', 'system']),
  language: z.string().min(2, 'Language is required'),
  marketing: z.boolean(),
  termsAccepted: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
};

export type PersonalInfoData = z.infer<typeof personalInfoSchema>;
export type AddressInfoData = z.infer<typeof addressInfoSchema>;
export type PreferencesData = z.infer<typeof preferencesSchema>;
export type CompleteOnboardingData = z.infer<typeof completeOnboardingSchema>;
