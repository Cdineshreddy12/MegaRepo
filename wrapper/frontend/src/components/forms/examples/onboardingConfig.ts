import { FormConfig } from '../types';
import { fieldValidationSchemas } from './validationSchemas';

/**
 * Example 3-step onboarding form configuration
 */
export const onboardingFormConfig: FormConfig = {
  title: 'Welcome to Our Platform',
  description: 'Let\'s get you set up with a few quick steps',
  showStepNumbers: true,
  allowBackNavigation: true,
  autoSave: true,
  steps: [
    {
      id: 'personal-info',
      title: 'Personal Information',
      description: 'Tell us a bit about yourself',
      showProgress: true,
      fields: [
        {
          id: 'firstName',
          label: 'First Name',
          type: 'text',
          placeholder: 'Enter your first name',
          required: true,
          validation: fieldValidationSchemas.firstName,
          className: 'col-span-1'
        },
        {
          id: 'lastName',
          label: 'Last Name',
          type: 'text',
          placeholder: 'Enter your last name',
          required: true,
          validation: fieldValidationSchemas.lastName,
          className: 'col-span-1'
        },
        {
          id: 'email',
          label: 'Email Address',
          type: 'email',
          placeholder: 'Enter your email address',
          required: true,
          validation: fieldValidationSchemas.email,
          helpText: 'We\'ll use this to send you important updates',
          className: 'col-span-2'
        },
        {
          id: 'phone',
          label: 'Phone Number',
          type: 'text',
          placeholder: 'Enter your phone number',
          required: true,
          validation: fieldValidationSchemas.phone,
          helpText: 'Include country code if international',
          className: 'col-span-2'
        },
        {
          id: 'dateOfBirth',
          label: 'Date of Birth',
          type: 'date',
          required: true,
          validation: fieldValidationSchemas.dateOfBirth,
          helpText: 'You must be at least 18 years old',
          className: 'col-span-2'
        },
        {
          id: 'bio',
          label: 'Bio',
          type: 'textarea',
          placeholder: 'Tell us a bit about yourself...',
          required: false,
          validation: fieldValidationSchemas.bio,
          helpText: 'Optional: A brief description about yourself',
          rows: 4,
          className: 'col-span-2'
        }
      ]
    },
    {
      id: 'address-info',
      title: 'Address Information',
      description: 'Where should we send your welcome package?',
      showProgress: true,
      fields: [
        {
          id: 'street',
          label: 'Street Address',
          type: 'text',
          placeholder: 'Enter your street address',
          required: true,
          validation: fieldValidationSchemas.street,
          className: 'col-span-2'
        },
        {
          id: 'city',
          label: 'City',
          type: 'text',
          placeholder: 'Enter your city',
          required: true,
          validation: fieldValidationSchemas.city,
          className: 'col-span-1'
        },
        {
          id: 'state',
          label: 'State/Province',
          type: 'select',
          placeholder: 'Select your state',
          required: true,
          validation: fieldValidationSchemas.state,
          helpText: 'Only for US citizens, SSN mandatory for S-Corporations.',
          options: [
            { value: 'CA', label: 'California' },
            { value: 'NY', label: 'New York' },
            { value: 'TX', label: 'Texas' },
            { value: 'FL', label: 'Florida' },
            { value: 'IL', label: 'Illinois' },
            { value: 'PA', label: 'Pennsylvania' },
            { value: 'OH', label: 'Ohio' },
            { value: 'GA', label: 'Georgia' },
            { value: 'NC', label: 'North Carolina' },
            { value: 'MI', label: 'Michigan' }
          ],
          className: 'col-span-1'
        },
        {
          id: 'zipCode',
          label: 'ZIP Code',
          type: 'text',
          placeholder: 'Enter your ZIP code',
          required: true,
          validation: fieldValidationSchemas.zipCode,
          helpText: 'These are the standard values for number of shares and per value in many top tier companies choose to get started.',
          className: 'col-span-1'
        },
        {
          id: 'country',
          label: 'Country',
          type: 'select',
          placeholder: 'Select your country',
          required: true,
          validation: fieldValidationSchemas.country,
          options: [
            { value: 'US', label: 'United States' },
            { value: 'CA', label: 'Canada' },
            { value: 'GB', label: 'United Kingdom' },
            { value: 'AU', label: 'Australia' },
            { value: 'DE', label: 'Germany' },
            { value: 'FR', label: 'France' },
            { value: 'JP', label: 'Japan' },
            { value: 'BR', label: 'Brazil' },
            { value: 'IN', label: 'India' },
            { value: 'CN', label: 'China' }
          ],
          className: 'col-span-1'
        },
        {
          id: 'isPrimary',
          label: 'Primary Address',
          type: 'switch',
          switchLabel: 'This is my primary address',
          required: false,
          validation: fieldValidationSchemas.isPrimary,
          helpText: 'Check if this is your main residence',
          className: 'col-span-2'
        },
        {
          id: 'gstin',
          label: 'GSTIN',
          type: 'text',
          placeholder: '22AAAAA0000A1Z6',
          required: false,
          validation: fieldValidationSchemas.gstin,
          helpText: 'GST Identification Number (15 digits)',
          className: 'col-span-2'
        }
      ]
    },
    {
      id: 'preferences',
      title: 'Preferences & Settings',
      description: 'Customize your experience',
      showProgress: true,
      fields: [
        {
          id: 'newsletter',
          label: 'Newsletter Subscription',
          type: 'checkbox',
          checkboxLabel: 'Subscribe to our newsletter',
          required: false,
          validation: fieldValidationSchemas.newsletter,
          helpText: 'Get the latest updates and news delivered to your inbox',
          className: 'col-span-2'
        },
        {
          id: 'notifications',
          label: 'Push Notifications',
          type: 'switch',
          switchLabel: 'Enable push notifications',
          required: false,
          validation: fieldValidationSchemas.notifications,
          helpText: 'Receive notifications about important updates',
          className: 'col-span-2'
        },
        {
          id: 'theme',
          label: 'Theme Preference',
          type: 'radio',
          required: true,
          validation: fieldValidationSchemas.theme,
          direction: 'horizontal',
          options: [
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' }
          ],
          className: 'col-span-2'
        },
        {
          id: 'language',
          label: 'Language',
          type: 'select',
          placeholder: 'Select your preferred language',
          required: true,
          validation: fieldValidationSchemas.language,
          options: [
            { value: 'en', label: 'English' },
            { value: 'es', label: 'Spanish' },
            { value: 'fr', label: 'French' },
            { value: 'de', label: 'German' },
            { value: 'it', label: 'Italian' },
            { value: 'pt', label: 'Portuguese' },
            { value: 'ru', label: 'Russian' },
            { value: 'ja', label: 'Japanese' },
            { value: 'ko', label: 'Korean' },
            { value: 'zh', label: 'Chinese' }
          ],
          className: 'col-span-2'
        },
        {
          id: 'marketing',
          label: 'Marketing Communications',
          type: 'checkbox',
          checkboxLabel: 'I agree to receive marketing communications',
          required: false,
          validation: fieldValidationSchemas.marketing,
          helpText: 'Optional: Receive promotional offers and product updates',
          className: 'col-span-2'
        },
        {
          id: 'termsAccepted',
          label: 'Terms and Conditions',
          type: 'checkbox',
          checkboxLabel: 'I accept the Terms and Conditions and Privacy Policy',
          required: true,
          validation: fieldValidationSchemas.termsAccepted,
          helpText: 'You must accept our terms to continue',
          className: 'col-span-2'
        }
      ]
    }
  ]
};
