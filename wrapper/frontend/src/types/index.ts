export interface BusinessApp {
  id: number | string;
  name: string;
  tagline: string;
  icon: React.ComponentType<any>;
  gradient: string;
  color: string;
  features: Array<string | { title: string; description: string; icon: string }>;
  stats: Array<{ value: string; label: string }>;
}

export interface Product {
  id: number | string;
  name: string;
  tagline: string;
  iconName: string;
  gradient: string;
  color: string;
  features: Array<string | { title: string; description: string; icon: string }>;
  stats: Array<{ value: string; label: string }>;
  description?: string;
  useCases?: Array<{ title: string; description: string }>;
  pricing?: Array<{ name: string; price: string; features: string[] }>;
}

export interface ProductData extends Product { }

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
}
