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
  'businessDetails.companyName': 'Company Name',
  'companyType': 'Company Type',
  'businessDetails.businessType': 'Business Type',
  'businessDetails.country': 'Registration Country',
  'billingAddress': 'Billing Street Address',
  'billingStreet': 'Billing Street Address',
  'billingCity': 'Billing City',
  'billingZip': 'Postal/ZIP Code',
  'state': 'State/Province',
  'firstName': 'First Name',
  'lastName': 'Last Name',
  'adminEmail': 'Admin Email',
  'supportEmail': 'Support Email',
  'termsAccepted': 'Terms and Conditions',
  'gstin': 'GSTIN',
  'panNumber': 'PAN Number',
  'einNumber': 'EIN Number',
  'vatNumber': 'VAT Number',
};

// Step mappings for navigation
const STEP_FIELD_MAP: Record<string, number> = {
  'businessDetails.companyName': 1,
  'companyType': 1,
  'businessDetails.businessType': 1,
  'businessDetails.country': 1,
  'billingAddress': 2,
  'billingStreet': 2,
  'billingCity': 2,
  'billingZip': 2,
  'state': 2,
  'firstName': 3,
  'lastName': 3,
  'adminEmail': 3,
  'supportEmail': 3,
  'termsAccepted': 4,
  'gstin': 2,
  'panNumber': 2,
  'einNumber': 2,
  'vatNumber': 2,
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

