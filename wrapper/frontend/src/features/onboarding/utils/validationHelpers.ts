/**
 * Validation Helpers for Onboarding Form
 */

import { FieldErrors, FieldValues } from 'react-hook-form';

export interface FieldMapping {
  fieldPath: string;
  displayName: string;
  stepNumber: number;
}

// Field name mappings for user-friendly error messages
const FIELD_NAME_MAP: Record<string, string> = {
  // Business Details
  'businessDetails.companyName': 'Company Name',
  'legalCompanyName': 'Company Name',
  'companyName': 'Company Name',
  'companyType': 'Company Type',
  'businessDetails.businessType': 'Business Type',
  'businessType': 'Business Type',
  'businessDetails.country': 'Registration Country',
  'country': 'Country',
  'companySize': 'Company Size',
  'organizationSize': 'Company Size',
  'industry': 'Industry',
  'website': 'Website',
  
  // Tax Details
  'billingAddress': 'Billing Street Address',
  'billingStreet': 'Billing Street Address',
  'billingCity': 'Billing City',
  'billingState': 'Billing State',
  'billingZip': 'Postal/ZIP Code',
  'billingCountry': 'Billing Country',
  'state': 'State/Province',
  'incorporationState': 'Incorporation State',
  'taxRegistered': 'Tax Registered',
  'vatGstRegistered': 'GST/VAT Registered',
  'hasGstin': 'Has GSTIN',
  'gstin': 'GSTIN',
  'panNumber': 'PAN Number',
  'einNumber': 'EIN Number',
  'vatNumber': 'VAT Number',
  'cinNumber': 'CIN Number',
  
  // Admin Details
  'firstName': 'First Name',
  'lastName': 'Last Name',
  'email': 'Email',
  'adminEmail': 'Admin Email',
  'adminMobile': 'Admin Mobile',
  'supportEmail': 'Support Email',
  'billingEmail': 'Billing Email',
  'contactSalutation': 'Contact Salutation',
  'contactMiddleName': 'Middle Name',
  'contactJobTitle': 'Job Title',
  'contactDepartment': 'Department',
  'contactAuthorityLevel': 'Authority Level',
  'preferredContactMethod': 'Preferred Contact Method',
  'contactDirectPhone': 'Direct Phone',
  'contactMobilePhone': 'Mobile Phone',
  'phone': 'Phone',
  
  // Review & Submit
  'termsAccepted': 'Terms and Conditions',
  'defaultLanguage': 'Default Language',
  'defaultLocale': 'Default Locale',
  'timezone': 'Timezone',
  'currency': 'Currency',
  'defaultCurrency': 'Currency',
  'defaultTimeZone': 'Timezone',
};

// Step mappings for navigation
// Step 1: Business Details - company info, business type, industry, website
// Step 2: Tax Details - tax registration, GSTIN, PAN, billing address
// Step 3: Admin Details - firstName, lastName, email, adminEmail, contact info
// Step 4: Review & Submit - terms acceptance
const STEP_FIELD_MAP: Record<string, number> = {
  // Step 1: Business Details
  'businessDetails.companyName': 1,
  'legalCompanyName': 1,
  'companyName': 1,
  'companyType': 1,
  'businessDetails.businessType': 1,
  'businessType': 1,
  'businessDetails.country': 1,
  'country': 1,
  'companySize': 1,
  'organizationSize': 1,
  'industry': 1,
  'website': 1,
  
  // Step 2: Tax Details
  'billingAddress': 2,
  'billingStreet': 2,
  'billingCity': 2,
  'billingState': 2,
  'billingZip': 2,
  'billingCountry': 2,
  'state': 2,
  'incorporationState': 2,
  'taxRegistered': 2,
  'vatGstRegistered': 2,
  'hasGstin': 2,
  'gstin': 2,
  'panNumber': 2,
  'einNumber': 2,
  'vatNumber': 2,
  'cinNumber': 2,
  'taxRegistrationDetails': 2,
  
  // Step 3: Admin Details
  'firstName': 3,
  'lastName': 3,
  'email': 3,
  'adminEmail': 3,
  'adminMobile': 3,
  'supportEmail': 3,
  'billingEmail': 3,
  'contactSalutation': 3,
  'contactMiddleName': 3,
  'contactJobTitle': 3,
  'contactDepartment': 3,
  'contactAuthorityLevel': 3,
  'preferredContactMethod': 3,
  'contactDirectPhone': 3,
  'contactMobilePhone': 3,
  'phone': 3,
  
  // Step 4: Review & Submit
  'termsAccepted': 4,
  'defaultLanguage': 4,
  'defaultLocale': 4,
  'timezone': 4,
  'currency': 4,
  'defaultCurrency': 4,
  'defaultTimeZone': 4,
};

/**
 * Extract field errors from react-hook-form errors object
 */
export const extractFieldErrors = (errors: FieldErrors<FieldValues>): FieldMapping[] => {
  const fieldErrors: FieldMapping[] = [];

  const traverseErrors = (errorObj: any, path: string = '') => {
    Object.keys(errorObj).forEach((key) => {
      const currentPath = path ? `${path}.${key}` : key;
      const error = errorObj[key];

      if (error?.message) {
        // This is a field error
        fieldErrors.push({
          fieldPath: currentPath,
          displayName: FIELD_NAME_MAP[currentPath] || currentPath,
          stepNumber: STEP_FIELD_MAP[currentPath] || 1,
        });
      } else if (typeof error === 'object' && error !== null) {
        // Nested object, traverse deeper
        traverseErrors(error, currentPath);
      }
    });
  };

  traverseErrors(errors);
  return fieldErrors;
};

/**
 * Get user-friendly error message for a field
 */
export const getFieldErrorMessage = (fieldPath: string, error: any): string => {
  const displayName = FIELD_NAME_MAP[fieldPath] || fieldPath;
  const message = error?.message || 'This field is required';
  return `${displayName}: ${message}`;
};

/**
 * Format validation errors for toast display
 */
export const formatValidationErrors = (errors: FieldErrors<FieldValues>): { message: string; fields: FieldMapping[] } => {
  const fieldErrors = extractFieldErrors(errors);
  
  if (fieldErrors.length === 0) {
    return { message: 'Please fix the validation errors', fields: [] };
  }

  if (fieldErrors.length === 1) {
    const field = fieldErrors[0];
    const error = getNestedError(errors, field.fieldPath);
    return {
      message: getFieldErrorMessage(field.fieldPath, error),
      fields: fieldErrors,
    };
  }

  const fieldNames = fieldErrors.map(f => f.displayName).join(', ');
  return {
    message: `Please fix the following fields: ${fieldNames}`,
    fields: fieldErrors,
  };
};

/**
 * Get nested error from errors object
 */
const getNestedError = (errors: any, path: string): any => {
  const parts = path.split('.');
  let current = errors;
  for (const part of parts) {
    if (!current || typeof current !== 'object') return null;
    current = current[part];
  }
  return current;
};

/**
 * Get step number for a field path
 */
export const getStepNumberForField = (fieldPath: string): number => {
  // Remove leading slash if present (from backend field paths like "/email")
  const cleanPath = fieldPath.replace(/^\//, '');
  return STEP_FIELD_MAP[cleanPath] || STEP_FIELD_MAP[fieldPath] || 1;
};

/**
 * Get display name for a field path
 */
export const getDisplayNameForField = (fieldPath: string): string => {
  // Remove leading slash if present
  const cleanPath = fieldPath.replace(/^\//, '');
  return FIELD_NAME_MAP[cleanPath] || FIELD_NAME_MAP[fieldPath] || cleanPath.charAt(0).toUpperCase() + cleanPath.slice(1);
};

