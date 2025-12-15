import React from 'react';
import {
  DollarSign,
  Euro,
  PoundSterling,
  IndianRupee,
  Bitcoin,
  LucideIcon,
  HelpCircle,
  JapaneseYen,
} from 'lucide-react';
import { TenantConfig } from '@/lib/app-config';

type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'BTC';

const currencyIconMap: Record<CurrencyCode, LucideIcon> = {
  USD: DollarSign,
  EUR: Euro,
  GBP: PoundSterling,
  INR: IndianRupee,
  JPY: JapaneseYen,
  BTC: Bitcoin,
};

type CurrencySymbolProps = {
  currency?: string;
  size?: number;
  className?: string;
};

const CurrencySymbol: React.FC<CurrencySymbolProps> = ({ currency = TenantConfig.locale.currency , size = 20, className }) => {
  const code = currency?.toUpperCase() as CurrencyCode;
  const Icon = currencyIconMap[code] || HelpCircle;

  return <Icon size={size} className={className} />;
};

export default CurrencySymbol;
