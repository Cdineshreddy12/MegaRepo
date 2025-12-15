/**
 * Onboarding Schemas and Constants
 */

// Indian States
export const STATES = [
  { id: 'AP', name: 'Andhra Pradesh' },
  { id: 'AR', name: 'Arunachal Pradesh' },
  { id: 'AS', name: 'Assam' },
  { id: 'BR', name: 'Bihar' },
  { id: 'CT', name: 'Chhattisgarh' },
  { id: 'GA', name: 'Goa' },
  { id: 'GJ', name: 'Gujarat' },
  { id: 'HR', name: 'Haryana' },
  { id: 'HP', name: 'Himachal Pradesh' },
  { id: 'JK', name: 'Jammu and Kashmir' },
  { id: 'JH', name: 'Jharkhand' },
  { id: 'KA', name: 'Karnataka' },
  { id: 'KL', name: 'Kerala' },
  { id: 'MP', name: 'Madhya Pradesh' },
  { id: 'MH', name: 'Maharashtra' },
  { id: 'MN', name: 'Manipur' },
  { id: 'ML', name: 'Meghalaya' },
  { id: 'MZ', name: 'Mizoram' },
  { id: 'NL', name: 'Nagaland' },
  { id: 'OR', name: 'Odisha' },
  { id: 'PB', name: 'Punjab' },
  { id: 'RJ', name: 'Rajasthan' },
  { id: 'SK', name: 'Sikkim' },
  { id: 'TN', name: 'Tamil Nadu' },
  { id: 'TG', name: 'Telangana' },
  { id: 'TR', name: 'Tripura' },
  { id: 'UP', name: 'Uttar Pradesh' },
  { id: 'UT', name: 'Uttarakhand' },
  { id: 'WB', name: 'West Bengal' },
  { id: 'AN', name: 'Andaman and Nicobar Islands' },
  { id: 'CH', name: 'Chandigarh' },
  { id: 'DN', name: 'Dadra and Nagar Haveli' },
  { id: 'DD', name: 'Daman and Diu' },
  { id: 'DL', name: 'Delhi' },
  { id: 'LD', name: 'Lakshadweep' },
  { id: 'PY', name: 'Puducherry' },
];

// Company Types
export const COMPANY_TYPES = [
  { id: 'private-limited', name: 'Private Limited Company' },
  { id: 'public-limited', name: 'Public Limited Company' },
  { id: 'llp', name: 'Limited Liability Partnership (LLP)' },
  { id: 'partnership', name: 'Partnership Firm' },
  { id: 'sole-proprietorship', name: 'Sole Proprietorship' },
  { id: 'one-person-company', name: 'One Person Company (OPC)' },
  { id: 'section-8', name: 'Section 8 Company (Non-Profit)' },
];

// Business Types
export const BUSINESS_TYPES = [
  { id: 'technology', name: 'Technology & Software' },
  { id: 'healthcare', name: 'Healthcare & Medical' },
  { id: 'finance', name: 'Finance & Banking' },
  { id: 'retail', name: 'Retail & E-commerce' },
  { id: 'manufacturing', name: 'Manufacturing & Industrial' },
  { id: 'consulting', name: 'Consulting & Professional Services' },
  { id: 'education', name: 'Education & Training' },
  { id: 'real-estate', name: 'Real Estate' },
  { id: 'hospitality', name: 'Hospitality & Tourism' },
  { id: 'non-profit', name: 'Non-Profit & NGO' },
  { id: 'other', name: 'Other' },
];

// Team Member interface
export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string;
}

// Form data types
export interface newBusinessData {
  companyType?: string;
  state?: string;
  businessName?: string;
  businessType?: string;
  gstin?: string;
  teamMembers?: TeamMember[];
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  adminEmail?: string;
  adminPhone?: string;
}

export interface existingBusinessData {
  companyType?: string;
  state?: string;
  businessName?: string;
  businessType?: string;
  gstin?: string;
  teamMembers?: TeamMember[];
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  adminEmail?: string;
  adminPhone?: string;
}

