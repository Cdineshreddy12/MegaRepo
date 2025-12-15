// Pricing-related type definitions

export interface ApplicationPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  features: string[];
  freeCredits: number;
  recommended?: boolean;
  popular?: boolean;
}

export interface CreditTopup {
  id: string;
  name: string;
  description: string;
  credits: number;
  price: number;
  currency: string;
  features: string[];
  recommended?: boolean;
}

export interface PricingCardProps {
  name: string;
  description: string;
  credits?: number;
  price?: number; // Required for topup cards, optional for application cards
  currency: string;
  features: string[];
  validityMonths?: number;
  recommended?: boolean;
  onPurchase?: () => void;
  isLoading?: boolean;
  monthlyPrice?: number; // Used for application cards
  annualPrice?: number; // Used for application cards
  freeCredits?: number; // Used for application cards
  type?: 'application' | 'topup';
}
