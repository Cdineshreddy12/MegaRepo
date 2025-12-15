export interface TenantAppConfig {
  tenantId: string;
  name: string;
  description?: string;
  branding: {
    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
    faviconUrl?: string;
    ogImage?: string; // Open Graph image for social sharing
  };
  features: {
    leads: boolean;
    salesPipeline: boolean;
    emailIntegration: boolean;
    smsIntegration: boolean;
    reports: boolean;
    customFields: boolean;
    aiAssistant?: boolean;
  };
  limits: {
    userCount: number;
    contactLimit: number;
    storageMb: number;
  };
  integrations: {
    emailProvider?: 'gmail' | 'outlook' | 'smtp';
    crmSync?: 'salesforce' | 'hubspot';
    slackWebhookUrl?: string;
    zapierEnabled?: boolean;
  };
  locale: {
    language: string;
    timezone: string;
    dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
    currency?: string; // e.g. "USD", "EUR"
    numberFormat?: string; // e.g. "en-US", "de-DE"
    dateTimeFormat?: string; // e.g. "YYYY-MM-DD HH:mm:ss"
    timeFormat?: string; // e.g. "12-hour", "24-hour"
    currencySymbol?: string; // e.g. "$", "€"
    currencySymbolPosition?: 'left' | 'right'; // e.g. "left" for "$100" or "right" for "100$" 
  };
  businessRules: {
    autoAssignLeads?: boolean;
    requiredFields: string[];
    pipelineStages: string[];
  };
  support: {
    contactEmail: string;
    showChatSupport: boolean;
  };
  customDomains?: {
    appUrl: string; // e.g. crm.tenantname.com
    emailFromDomain?: string;
  };
  profile?: {
    industry: string; // e.g. "Technology", "Healthcare"
    companySize: number; // Number of employees
    headquarters: string; // e.g. "New York, USA"
    foundedYear?: number; // e.g. 2005
    website?: string; // e.g. "https://www.acme-corp.com"
    GSTIN?: string; // e.g. "27AAECA1234C1Z5"
    PAN?: string; // e.g. "ABCDE1234F"
    address?: string; // e.g. "123 Main St, New York, NY 10001"
    phone?: string; // e.g. "+1-234-567-8900"
  };
}

export const TenantConfig: TenantAppConfig = {
  tenantId: "acme-corp",
  name: "Zopkit CRM",
  description: "Zopkit CRM is a powerful customer relationship management tool designed to help businesses manage their interactions with customers and prospects.",
  branding: {
    logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdilOQWysJYyvIb8fFVA0fxoL8yq32q2Gr4dX7CUu_TftaFtptrAZ-ADXcUWXv6DgEuI4&usqp=CAU",
    primaryColor: "#2B6CB0", // Green
    secondaryColor: "#FF1111", // Orange
    faviconUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdilOQWysJYyvIb8fFVA0fxoL8yq32q2Gr4dX7CUu_TftaFtptrAZ-ADXcUWXv6DgEuI4&usqp=CAU",
    ogImage: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdilOQWysJYyvIb8fFVA0fxoL8yq32q2Gr4dX7CUu_TftaFtptrAZ-ADXcUWXv6DgEuI4&usqp=CAU"
  },
  features: {
    leads: true,
    salesPipeline: true,
    emailIntegration: true,
    smsIntegration: false,
    reports: true,
    customFields: true,
    aiAssistant: false
  },
  limits: {
    userCount: 50,
    contactLimit: 10000,
    storageMb: 5000
  },
  integrations: {
    emailProvider: "gmail",
    crmSync: "hubspot",
    slackWebhookUrl: "https://hooks.slack.com/services/...",
    zapierEnabled: true
  },
  locale: {
    language: "en",
    timezone: "America/New_York",
    dateFormat: "MM/DD/YYYY",
    currency: "INR",
    numberFormat: "en-US",
    dateTimeFormat: "YYYY-MM-DD HH:mm:ss",
    timeFormat: "12-hour",
    currencySymbol: "$",
    currencySymbolPosition: "left"

  },
  businessRules: {
    autoAssignLeads: true,
    requiredFields: ["email", "phone"],
    pipelineStages: ["New", "Qualified", "Proposal", "Won", "Lost"]
  },
  support: {
    contactEmail: "support@acme-corp.com",
    showChatSupport: true
  },
  customDomains: {
    appUrl: "https://crm.acme-corp.com",
    emailFromDomain: "acme-corp.com"
  },
  profile: {
    industry: "Technology",
    companySize: 200,
    headquarters: "New York, USA",
    foundedYear: 2010,
    website: "https://www.acme-corp.com",
    GSTIN: "27AAECA1234C1Z5",
    PAN: "ABCDE1234F",
    address: "123 Main St, New York, NY 10001",
    phone: "+1-234-567-8900"
  }
};    
  