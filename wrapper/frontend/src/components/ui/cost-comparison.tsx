import React, { useState, useMemo } from 'react';
import {
  Check,
  X,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Filter,
  ArrowRight,
  Minus,
  Search,
  Sliders,
  Calculator,
  EyeOff,
  Eye,
  Info,
  Users,
  Briefcase,
  CreditCard,
  LayoutGrid,
  Box,
  ShieldCheck,
  Zap,
  Globe,
  Database,
  Lock,
  Headphones,
  LucideIcon
} from 'lucide-react';

// --- Types ---

export type PlanTier = 'starter' | 'professional' | 'enterprise';

export type FeatureValuePrimitive = string | number | boolean;

export interface FeatureValueObject {
  value: FeatureValuePrimitive;
  tooltip?: string;
  highlight?: boolean;
}

export type FeatureValue = FeatureValuePrimitive | FeatureValueObject;

export interface PlanDefinition {
  id: PlanTier;
  name: string;
  description: string;
  basePrice: number | null;
  model: 'flat' | 'per_user' | 'custom';
  annualDiscountPercent: number;
  buttonText: string;
  highlightColor: string;
  badge?: string;
  popular?: boolean;
}

export interface Feature {
  id: string;
  name: string;
  description?: string;
  tiers: Record<PlanTier, FeatureValue>;
}

export interface Module {
  id: string;
  name: string;
  features: Feature[];
}

export interface Application {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
  modules: Module[];
}

// --- Data ---

export const PLANS: PlanDefinition[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small teams and startups.',
    basePrice: 29, // Flat fee implies simplified starting point
    model: 'flat',
    annualDiscountPercent: 0, // No discount on starter
    buttonText: 'Start Free Trial',
    highlightColor: 'border-slate-200 hover:border-slate-300',
    badge: 'Best Value'
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'For growing businesses requiring scale.',
    basePrice: 19, // Per user
    model: 'per_user',
    annualDiscountPercent: 20,
    popular: true,
    buttonText: 'Get Started',
    highlightColor: 'border-blue-500 ring-1 ring-blue-500 shadow-blue-100'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Maximum security and control.',
    basePrice: null,
    model: 'custom',
    annualDiscountPercent: 0,
    buttonText: 'Contact Sales',
    highlightColor: 'border-purple-500 hover:shadow-purple-100',
    badge: 'Custom Solutions'
  }
];

export const APPLICATIONS: Application[] = [
  {
    id: 'platform_core',
    name: 'Platform Foundation',
    icon: LayoutGrid,
    description: 'Identity, security, and administration.',
    modules: [
      {
        id: 'security',
        name: 'Security & Identity',
        features: [
          {
            id: 'sso',
            name: 'Single Sign-On (SSO)',
            tiers: { starter: false, professional: 'Google & Microsoft', enterprise: 'SAML, OIDC & Custom' }
          },
          {
            id: 'mfa',
            name: 'Multi-Factor Auth',
            tiers: { starter: 'SMS', professional: 'Authenticator App', enterprise: 'Hardware Keys (YubiKey)' }
          },
          {
            id: 'audit_logs',
            name: 'Audit Logs',
            tiers: { starter: '7 Days', professional: '90 Days', enterprise: 'Unlimited / Exportable' }
          }
        ]
      },
      {
        id: 'admin',
        name: 'Administration',
        features: [
          {
            id: 'roles',
            name: 'Custom Roles',
            tiers: { starter: 3, professional: 10, enterprise: 'Unlimited' }
          },
          {
            id: 'api',
            name: 'API Access',
            tiers: { starter: 'Read-only', professional: 'Standard (1000/min)', enterprise: 'High-Volume (10k/min)' }
          }
        ]
      }
    ]
  },
  {
    id: 'crm',
    name: 'Sales CRM',
    icon: Users,
    description: 'Pipeline management and sales automation.',
    modules: [
      {
        id: 'pipelines',
        name: 'Pipeline Management',
        features: [
          {
            id: 'active_pipelines',
            name: 'Active Pipelines',
            tiers: { starter: 1, professional: 5, enterprise: 'Unlimited' }
          },
          {
            id: 'lead_enrichment',
            name: 'Auto-Enrichment',
            description: 'Automatically populate company data from email domains.',
            tiers: { starter: false, professional: true, enterprise: true }
          }
        ]
      },
      {
        id: 'automation',
        name: 'Sales Automation',
        features: [
          {
            id: 'sequences',
            name: 'Email Sequences',
            tiers: { starter: false, professional: true, enterprise: true }
          },
          {
            id: 'dialer',
            name: 'Power Dialer',
            tiers: { starter: false, professional: false, enterprise: { value: true, tooltip: 'Includes 1000 minutes/user' } }
          }
        ]
      }
    ]
  },
  {
    id: 'finance',
    name: 'Finance OS',
    icon: CreditCard,
    description: 'Accounting, invoicing, and expense management.',
    modules: [
      {
        id: 'invoicing',
        name: 'Invoicing & Payments',
        features: [
          {
            id: 'invoices',
            name: 'Monthly Invoices',
            tiers: { starter: 50, professional: 500, enterprise: 'Unlimited' }
          },
          {
            id: 'currencies',
            name: 'Multi-Currency',
            tiers: { starter: false, professional: true, enterprise: true }
          }
        ]
      },
      {
        id: 'compliance',
        name: 'Tax & Compliance',
        features: [
          {
            id: 'auto_tax',
            name: 'Automated Tax Calculation',
            tiers: { starter: false, professional: true, enterprise: true }
          },
          {
            id: 'erp_sync',
            name: 'NetSuite/SAP Sync',
            tiers: { starter: false, professional: false, enterprise: true }
          }
        ]
      }
    ]
  },
  {
    id: 'operations',
    name: 'Inventory & Ops',
    icon: Box,
    description: 'Multi-location inventory and logistics.',
    modules: [
      {
        id: 'inventory',
        name: 'Inventory Management',
        features: [
          {
            id: 'locations',
            name: 'Warehouse Locations',
            tiers: { starter: 1, professional: 5, enterprise: 'Unlimited' }
          },
          {
            id: 'forecasting',
            name: 'Demand Forecasting',
            tiers: { starter: false, professional: 'Basic', enterprise: 'AI-Powered' }
          }
        ]
      }
    ]
  },
  {
    id: 'support',
    name: 'Support & Success',
    icon: Headphones,
    description: 'Service level agreements and training.',
    modules: [
      {
        id: 'sla',
        name: 'Service Level',
        features: [
          {
            id: 'support_channel',
            name: 'Support Channels',
            tiers: { starter: 'Email', professional: 'Email & Chat', enterprise: '24/7 Phone & Slack' }
          },
          {
            id: 'onboarding',
            name: 'Onboarding',
            tiers: { starter: 'Self-serve', professional: 'Guided Session', enterprise: 'Dedicated Success Manager' }
          }
        ]
      }
    ]
  }
];

// --- Helpers ---

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

const Tooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-block ml-1.5 align-middle">
    <Info className="w-3.5 h-3.5 text-slate-400 hover:text-blue-500 cursor-help transition-colors" />
    <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-slate-800 text-white text-xs rounded-lg shadow-xl z-50 text-center leading-relaxed pointer-events-none">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
    </div>
  </div>
);

const ValueRenderer = ({ valueObj }: { valueObj: FeatureValueObject }) => {
  const { value, tooltip, highlight } = valueObj;

  if (value === true) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${highlight ? 'bg-blue-100 ring-2 ring-blue-200' : 'bg-emerald-100'}`}>
          <Check className={`w-4 h-4 ${highlight ? 'text-blue-600' : 'text-emerald-600'}`} />
        </div>
        {tooltip && <Tooltip text={tooltip} />}
      </div>
    );
  }

  if (value === false) {
    return (
      <div className="flex items-center justify-center h-full opacity-40">
        <Minus className="w-4 h-4 text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full text-center px-2">
      <span className={`text-sm font-medium ${highlight ? 'text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100' : 'text-slate-700'}`}>
        {value}
      </span>
      {tooltip && <Tooltip text={tooltip} />}
    </div>
  );
};

// --- Main Component ---

const CostComparison = () => {
  // State: Cost Calculator
  const [isAnnual, setIsAnnual] = useState(true);
  const [userCount, setUserCount] = useState(10);

  // State: Filtering & Visibility
  const [selectedApps, setSelectedApps] = useState<string[]>(['all']);
  const [selectedPlans, setSelectedPlans] = useState<PlanTier[]>(['starter', 'professional', 'enterprise']);
  const [expandedApps, setExpandedApps] = useState<string[]>(APPLICATIONS.map(a => a.id));

  // State: Smart Views
  const [showDiffOnly, setShowDiffOnly] = useState(false);
  const [smartView, setSmartView] = useState(true); // Hides modules not relevant to selected plans
  const [searchQuery, setSearchQuery] = useState('');

  // --- Logic: Cost Calculation ---
  const calculateCost = (planId: PlanTier) => {
    const plan = PLANS.find(p => p.id === planId);
    if (!plan || plan.basePrice === null) return null;

    let monthlyCost = 0;
    if (plan.model === 'flat') {
      monthlyCost = plan.basePrice;
    } else if (plan.model === 'per_user') {
      monthlyCost = plan.basePrice * userCount;
    }

    if (isAnnual) {
      const discount = monthlyCost * (plan.annualDiscountPercent / 100);
      monthlyCost = monthlyCost - discount;
    }

    return monthlyCost;
  };

  // --- Logic: Filtering ---

  const toggleAppSelection = (appId: string) => {
    if (appId === 'all') {
      setSelectedApps(['all']);
    } else {
      let newSelection = selectedApps.filter(id => id !== 'all');
      if (newSelection.includes(appId)) {
        newSelection = newSelection.filter(id => id !== appId);
      } else {
        newSelection.push(appId);
      }
      if (newSelection.length === 0) newSelection = ['all'];
      setSelectedApps(newSelection);
    }
  };

  const togglePlanSelection = (planId: PlanTier) => {
    if (selectedPlans.includes(planId)) {
      if (selectedPlans.length > 1) { // Prevent deselecting all
        setSelectedPlans(selectedPlans.filter(p => p !== planId));
      }
    } else {
      // Sort to maintain order: Starter -> Pro -> Enterprise
      const order: PlanTier[] = ['starter', 'professional', 'enterprise'];
      const newPlans = [...selectedPlans, planId].sort((a, b) => order.indexOf(a) - order.indexOf(b));
      setSelectedPlans(newPlans);
    }
  };

  const toggleAppExpansion = (appId: string) => {
    setExpandedApps(prev =>
      prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId]
    );
  };

  // --- Process Data for Render ---

  const processedApps = useMemo(() => {
    return APPLICATIONS.map(app => {
      // 1. App Level Filter
      if (!selectedApps.includes('all') && !selectedApps.includes(app.id)) return null;

      // 2. Filter Modules & Features
      const visibleModules = app.modules.map(module => {
        const visibleFeatures = module.features.filter(feature => {
          // Search Filter
          if (searchQuery && !feature.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
          }

          // Smart View: Hide feature if all selected plans have it as 'false' (Not included)
          if (smartView) {
            const hasValueInSelectedPlans = selectedPlans.some(planId => {
              const val = feature.tiers[planId];
              return typeof val === 'object' ? val.value !== false : val !== false;
            });
            if (!hasValueInSelectedPlans) return false;
          }

          // Diff View: Hide if all selected plans have identical values
          if (showDiffOnly) {
            const values = selectedPlans.map(planId => {
              const val = feature.tiers[planId];
              return typeof val === 'object' ? val.value : val;
            });
            const allEqual = values.every(v => v === values[0]);
            if (allEqual) return false;
          }

          return true;
        });

        if (visibleFeatures.length === 0) return null;
        return { ...module, features: visibleFeatures };
      }).filter(Boolean);

      if (visibleModules.length === 0) return null;
      return { ...app, modules: visibleModules };
    }).filter(Boolean); // Remove null apps
  }, [selectedApps, selectedPlans, searchQuery, smartView, showDiffOnly]);


  // --- Render Helpers ---

  // Dynamic grid template based on active plans
  // 1st col is feature name (min 280px), rest are equal width
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `minmax(240px, 1.5fr) repeat(${selectedPlans.length}, minmax(160px, 1fr))`
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">

      {/* --- Top Control Bar (Mobile Sticky) --- */}
      <div className="bg-slate-900 text-white py-3 px-4 sm:hidden sticky top-0 z-50 flex items-center justify-between shadow-md">
        <span className="font-bold text-lg">UnifiedOps</span>
        <button className="text-sm bg-blue-600 px-3 py-1 rounded-full font-medium">Get Started</button>
      </div>

      {/* --- Header Section --- */}
      <div className="bg-white border-b border-slate-200 pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="max-w-2xl">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                Transparent Pricing for Every Stage
              </h1>
              <p className="mt-4 text-lg text-slate-500">
                Compare plans, calculate costs, and find the perfect fit for your organization.
              </p>
            </div>

            {/* Cost Calculator Widget */}
            <div className="w-full md:w-auto bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm min-w-[320px]">
              <div className="flex items-center space-x-2 mb-4 text-slate-700 font-semibold">
                <Calculator className="w-5 h-5 text-blue-600" />
                <span>Cost Estimator</span>
              </div>

              <div className="space-y-5">
                {/* Users Slider */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Team Size</span>
                    <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{userCount} users</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={userCount}
                    onChange={(e) => setUserCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>1</span>
                    <span>100+</span>
                  </div>
                </div>

                {/* Billing Toggle */}
                <div className="flex items-center justify-between p-1 bg-slate-200 rounded-lg relative">
                  <div className={`absolute left-1 top-1 w-[calc(50%-4px)] h-[calc(100%-8px)] bg-white rounded shadow-sm transition-transform duration-200 ease-in-out ${isAnnual ? 'translate-x-full' : 'translate-x-0'}`}></div>
                  <button
                    onClick={() => setIsAnnual(false)}
                    className={`relative z-10 w-1/2 text-center text-sm font-medium py-1.5 transition-colors ${!isAnnual ? 'text-slate-900' : 'text-slate-500'}`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setIsAnnual(true)}
                    className={`relative z-10 w-1/2 text-center text-sm font-medium py-1.5 transition-colors flex items-center justify-center gap-1 ${isAnnual ? 'text-slate-900' : 'text-slate-500'}`}
                  >
                    Annual <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1 rounded font-bold">-20%</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* --- Main Content Area --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Advanced Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
          {/* App Tabs */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => toggleAppSelection('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedApps.includes('all')
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-transparent text-slate-600 hover:bg-slate-100'
                }`}
            >
              All Apps
            </button>
            {APPLICATIONS.map(app => (
              <button
                key={app.id}
                onClick={() => toggleAppSelection(app.id)}
                className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!selectedApps.includes('all') && selectedApps.includes(app.id)
                  ? 'bg-blue-100 text-blue-700 shadow-sm ring-1 ring-blue-200'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
                  }`}
              >
                <app.icon className="w-3 h-3 mr-1.5" />
                {app.name}
              </button>
            ))}
          </div>

          {/* View Toggles */}
          <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-auto">
            <button
              onClick={() => setSmartView(!smartView)}
              className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${smartView ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              title="Hide features not included in selected plans"
            >
              {smartView ? <Eye className="w-3.5 h-3.5 mr-1.5" /> : <EyeOff className="w-3.5 h-3.5 mr-1.5" />}
              Smart View
            </button>

            <button
              onClick={() => setShowDiffOnly(!showDiffOnly)}
              className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${showDiffOnly ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
            >
              <Sliders className="w-3.5 h-3.5 mr-1.5" />
              Diff Only
            </button>
          </div>
        </div>

        {/* --- Dynamic Table --- */}
        <div className="bg-white rounded-2xl shadow ring-1 ring-slate-200 overflow-hidden">
          <div className="h-[600px] overflow-auto relative">
            <div className="min-w-[800px]">
              {/* --- Table Header --- */}
              <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all">
                <div style={gridStyle} className="items-end py-4 px-4 sm:px-6">

                  {/* Control Column */}
                  <div className="flex flex-col justify-end pr-4 pb-1 sticky left-0 z-20 bg-white/95 backdrop-blur-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search features..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 overflow-x-auto whitespace-nowrap scrollbar-hide">
                      <span className="font-semibold">Compare:</span>
                      {PLANS.map(plan => (
                        <label key={plan.id} className="flex items-center cursor-pointer hover:text-slate-800 transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedPlans.includes(plan.id)}
                            onChange={() => togglePlanSelection(plan.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-1.5"
                          />
                          {plan.name}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Plan Columns */}
                  {PLANS.filter(p => selectedPlans.includes(p.id)).map(plan => {
                    const estimatedCost = calculateCost(plan.id);
                    return (
                      <div key={plan.id} className={`flex flex-col p-3 rounded-t-xl transition-all border-t border-x ${plan.highlightColor} relative bg-white`}>
                        {plan.popular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                            Most Popular
                          </div>
                        )}
                        <h3 className="text-lg font-bold text-slate-900 text-center">{plan.name}</h3>

                        <div className="mt-2 text-center h-14 flex flex-col justify-center">
                          {estimatedCost !== null ? (
                            <div>
                              <span className="text-2xl font-bold tracking-tight text-slate-900">
                                {formatCurrency(estimatedCost)}
                              </span>
                              <span className="text-xs font-semibold text-slate-400 block -mt-1">
                                /mo {isAnnual && 'billed annually'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xl font-bold tracking-tight text-slate-900">Contact Sales</span>
                          )}
                        </div>

                        <button className={`mt-3 w-full rounded-md py-1.5 text-xs font-bold shadow-sm transition-all
                          ${plan.id === 'professional'
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50'}`}>
                          {plan.buttonText}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {(processedApps as any[]).map((app, index) => {
                // TS Hack: processedApps might have nulls filtered out, but TS doesn't know for sure
                if (!app) return null;

                const isExpanded = expandedApps.includes(app.id);
                return (
                  <div key={app.id} className={index !== 0 ? 'border-t border-slate-200' : ''}>
                    {/* App Header Row */}
                    <div
                      onClick={() => toggleAppExpansion(app.id)}
                      className="w-full flex items-center justify-between px-4 sm:px-6 py-4 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0 p-2 bg-white rounded-lg border border-slate-200 text-blue-600 shadow-sm group-hover:scale-105 transition-transform">
                          <app.icon className="w-5 h-5" />
                        </div>
                        <div className="ml-4">
                          <h4 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{app.name}</h4>
                          <p className="text-xs text-slate-500 hidden sm:block">{app.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isExpanded ? 'Collapse' : 'Expand'}
                        </span>
                        <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                          <ChevronDown className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    {/* Modules */}
                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="divide-y divide-slate-100">
                        {app.modules.map((module: any) => (
                          <div key={module.id} className="bg-white">
                            {/* Module Name Row */}
                            <div style={gridStyle} className="bg-white">
                              <div className="col-span-1 px-6 py-2 sticky left-0 z-10 bg-white">
                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{module.name}</span>
                              </div>
                              {/* Empty cells for columns to maintain grid structure background if needed */}
                              {selectedPlans.map(p => <div key={p} className="bg-slate-50/30" />)}
                            </div>

                            {/* Features */}
                            {module.features.map((feature: any) => (
                              <div
                                key={feature.id}
                                style={gridStyle}
                                className="group hover:bg-blue-50/30 transition-colors border-b border-slate-50 last:border-0"
                              >
                                <div className="flex items-center px-6 py-3 border-r border-transparent group-hover:border-slate-100 sticky left-0 z-10 bg-white group-hover:bg-blue-50/30 transition-colors shadow-[4px_0_24px_-2px_rgba(0,0,0,0.02)]">
                                  <span className="text-sm text-slate-700 font-medium group-hover:text-slate-900">{feature.name}</span>
                                  {feature.description && <Tooltip text={feature.description} />}
                                </div>

                                {PLANS.filter(p => selectedPlans.includes(p.id)).map((plan) => (
                                  <div key={`${feature.id}-${plan.id}`} className="flex items-center justify-center py-3 border-l border-slate-100 group-hover:border-slate-200">
                                    <ValueRenderer valueObj={
                                      typeof feature.tiers[plan.id] === 'object' && feature.tiers[plan.id] !== null
                                        ? feature.tiers[plan.id] as FeatureValueObject
                                        : { value: feature.tiers[plan.id] as FeatureValuePrimitive }
                                    } />
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Empty State */}
              {processedApps.length === 0 && (
                <div className="p-16 text-center text-slate-500 bg-slate-50">
                  <Filter className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium text-slate-900">No matching features found</h3>
                  <p className="mt-1 max-w-sm mx-auto">Try adjusting your search terms, selected apps, or toggle off "Smart View" to see hidden features.</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSmartView(false);
                      setSelectedApps(['all']);
                      setShowDiffOnly(false);
                    }}
                    className="mt-6 text-sm font-semibold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Reset all filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CostComparison;
