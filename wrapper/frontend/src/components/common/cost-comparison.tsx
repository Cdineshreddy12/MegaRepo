"use client";
import { useState } from 'react';
import {
  Check,
  Users,
  Globe,
  Receipt,
  ShoppingCart,
  Settings,
  Link,
  Zap,
  Puzzle,
  Shield,
  Headphones,
  Plug,
  ChevronDown,
  Star,
  ArrowRight,
  Target,
  Layers
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

const CostComparison = () => {
  const [isAnnual, setIsAnnual] = useState(true);
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  const INITIAL_FEATURES_COUNT = 10;

  const plans = [
    {
      name: 'Essential',
      monthlyPrice: 35,
      annualPrice: 29,
      description: 'Perfect for small businesses getting started',
      popular: false,
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      textColor: 'text-blue-600',
      buttonVariant: 'outline' as const,
      features: [
        { icon: Check, text: 'Everything you need to get started' }
      ]
    },
    {
      name: 'Perform',
      monthlyPrice: 54,
      annualPrice: 49,
      description: 'Most popular choice for growing businesses',
      popular: true,
      color: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      textColor: 'text-emerald-600',
      buttonVariant: 'default' as const,
      features: [
        { icon: Check, text: 'Advanced features for growing teams' }
      ]
    },
    {
      name: 'Enterprise',
      monthlyPrice: 85,
      annualPrice: 79,
      description: 'Complete solution for large organizations',
      popular: false,
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      textColor: 'text-purple-600',
      buttonVariant: 'outline' as const,
      features: [
        { icon: Check, text: 'Enterprise-grade features and support' }
      ]
    }
  ];

  const features = [
    // Core Platform Features (First 5 - always visible)
    {
      name: 'Platform Access',
      icon: Settings,
      category: 'Core',
      essential: true,
      perform: true,
      enterprise: true,
      description: 'Complete platform access with dashboard',
      priority: 'high'
    },
    {
      name: 'Account Management',
      icon: Users,
      category: 'Core',
      essential: '400 users',
      perform: '800 users',
      enterprise: 'Unlimited users',
      description: 'User account management and permissions',
      priority: 'high'
    },
    {
      name: 'Custom Domains',
      icon: Globe,
      category: 'Core',
      essential: '4 domains',
      perform: '10 domains',
      enterprise: 'Unlimited domains',
      description: 'Custom domain support and SSL',
      priority: 'high'
    },
    {
      name: 'Receipt Processing',
      icon: Receipt,
      category: 'Core',
      essential: 'Unlimited',
      perform: 'Unlimited',
      enterprise: 'Unlimited',
      description: 'Automated receipt forwarding and processing',
      priority: 'high'
    },
    {
      name: 'Supplier Tools',
      icon: ShoppingCart,
      category: 'Core',
      essential: '1 supplier',
      perform: '10 suppliers',
      enterprise: 'Unlimited suppliers',
      description: 'Supplier management and integration',
      priority: 'high'
    },

    // Advanced Features (Next 5 - show initially)
    {
      name: 'Core Features',
      icon: Zap,
      category: 'Advanced',
      essential: true,
      perform: true,
      enterprise: true,
      description: 'All core business management features',
      priority: 'medium'
    },
    {
      name: 'Public URL Generator',
      icon: Link,
      category: 'Advanced',
      essential: true,
      perform: true,
      enterprise: true,
      description: 'Generate and manage public URLs',
      priority: 'medium'
    },
    {
      name: 'API Integrations',
      icon: Plug,
      category: 'Advanced',
      essential: true,
      perform: true,
      enterprise: true,
      description: 'Third-party service integrations',
      priority: 'medium'
    },
    {
      name: 'Add-on Features',
      icon: Puzzle,
      category: 'Advanced',
      essential: true,
      perform: true,
      enterprise: true,
      description: 'Additional feature add-ons',
      priority: 'medium'
    },
    {
      name: 'Customer Support',
      icon: Headphones,
      category: 'Advanced',
      essential: 'Standard',
      perform: 'Priority',
      enterprise: '24/7 Premium',
      description: 'Customer support access and response times',
      priority: 'medium'
    },

    // Enterprise Features (Last 3 - hidden initially)
    {
      name: 'Advanced Admin Roles',
      icon: Shield,
      category: 'Enterprise',
      essential: false,
      perform: false,
      enterprise: true,
      description: 'Advanced administrative controls and permissions',
      priority: 'low'
    },
    {
      name: 'Enterprise Add-ons',
      icon: Settings,
      category: 'Enterprise',
      essential: false,
      perform: false,
      enterprise: true,
      description: 'Specialized enterprise-only features',
      priority: 'low'
    },
    {
      name: 'Custom Integrations',
      icon: Plug,
      category: 'Enterprise',
      essential: false,
      perform: false,
      enterprise: true,
      description: 'Custom integration development and support',
      priority: 'low'
    }
  ];

  const visibleFeatures = showAllFeatures ? features : features.slice(0, INITIAL_FEATURES_COUNT);
  const hasMoreFeatures = features.length > INITIAL_FEATURES_COUNT;

  const getFeatureValue = (feature: Record<string, any>, planName: string) => {
    const key = planName.toLowerCase();
    const value = feature[key];
    if (typeof value === 'boolean') {
      return value ? '✓' : '—';
    }
    return value;
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-3 md:px-4 py-8">
      {/* Professional Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold mb-4">
          <Target className="w-3 h-3" />
          Plan Comparison
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Choose Your Plan
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-6 text-base">
          Select the perfect plan for your business needs with our comprehensive feature comparison.
        </p>

        {/* Compact Pricing Toggle */}
        <div className="flex items-center justify-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg max-w-sm mx-auto border border-gray-200 dark:border-gray-700">
          <span className={`text-sm font-medium ${!isAnnual ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
            Monthly
          </span>
          <Switch
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
            aria-label="Toggle annual pricing"
          />
          <span className={`text-sm font-medium flex items-center gap-1 ${isAnnual ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
            Annual
            <Badge variant="secondary" className="text-xs px-1 py-0.5 ml-1">
              20% off
            </Badge>
          </span>
        </div>
      </div>

      {/* Compact Fixed Pricing Cards Header */}
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-900 shadow-lg border-b border-gray-200 dark:border-gray-700 mb-4">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg ${
                  plan.popular ? 'ring-1 ring-blue-500 ring-offset-2 bg-blue-50/50 dark:bg-blue-950/20' : 'bg-white dark:bg-gray-900'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-[100]">
                    <Badge variant="default" className="px-3 py-1 text-xs font-bold shadow-md bg-blue-600">
                      <Star className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                </div>
                )}

                <CardContent className="p-4 text-center">
                  <div className={`w-10 h-10 ${plan.color} rounded-lg flex items-center justify-center mx-auto mb-3 shadow-md`}>
                    <Settings className="w-5 h-5 text-white" />
              </div>

                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-3 text-xs">
                    {plan.description}
                  </p>

                  <div className="mb-3">
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      ${isAnnual ? plan.annualPrice : plan.monthlyPrice}
                      <span className="text-sm font-normal text-gray-600 dark:text-gray-400">/mo</span>
                    </div>
                    {isAnnual && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        Billed annually (Save 20%)
                </div>
                    )}
              </div>

                  <Button
                    className={`w-full ${plan.popular ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-800 hover:bg-gray-700'} text-white font-medium py-2 text-sm transition-all duration-200`}
                    size="sm"
                  >
                    {plan.popular ? 'Get Started' : 'Choose Plan'}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
                </div>
              </div>

      {/* Compact Feature Comparison */}
      <Card className="shadow-lg border-0 overflow-hidden bg-white dark:bg-gray-900">
        <CardHeader className="text-center pb-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
            <Layers className="w-5 h-5 inline mr-2" />
            Feature Comparison
          </CardTitle>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Compare plan features side-by-side
          </p>
          {hasMoreFeatures && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllFeatures(!showAllFeatures)}
                className="flex items-center gap-2 border hover:bg-gray-50 dark:hover:bg-gray-800 text-sm px-4 py-2"
              >
                {showAllFeatures ? (
                  <>
                    <ChevronDown className="w-4 h-4 rotate-180" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show All ({features.length} features)
                  </>
                )}
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div
              className={`relative ${showAllFeatures ? 'h-auto' : 'h-[500px] overflow-y-auto'}`}
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgb(16 185 129) rgb(243 244 246)'
              }}
            >
              <style dangerouslySetInnerHTML={{
                __html: `
                  div::-webkit-scrollbar {
                    width: 8px;
                  }
                  div::-webkit-scrollbar-track {
                    background: rgb(243 244 246);
                    border-radius: 8px;
                  }
                  div::-webkit-scrollbar-thumb {
                    background: rgb(16 185 129);
                    border-radius: 8px;
                    transition: background-color 0.3s;
                  }
                  div::-webkit-scrollbar-thumb:hover {
                    background: rgb(5 150 105);
                  }
                  @media (prefers-color-scheme: dark) {
                    div::-webkit-scrollbar-track {
                      background: rgb(31 41 55);
                    }
                    div::-webkit-scrollbar-thumb {
                      background: rgb(16 185 129);
                    }
                    div::-webkit-scrollbar-thumb:hover {
                      background: rgb(5 150 105);
                    }
                  }
                `
              }} />

              {/* Feature Comparison Table */}
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left py-4 px-4 font-bold text-gray-900 dark:text-gray-100 text-sm">
                      Features
                    </th>
                    <th className="text-center py-4 px-4 font-bold text-blue-600 text-sm">
                      Essential
                    </th>
                    <th className="text-center py-4 px-4 font-bold text-emerald-600 text-sm">
                      Perform
                    </th>
                    <th className="text-center py-4 px-4 font-bold text-purple-600 text-sm">
                      Enterprise
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {visibleFeatures.map((feature, index) => (
                    <tr
                      key={index}
                      className={`group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors duration-200 ${
                        feature.category === 'Core' ? 'bg-blue-50/30 dark:bg-blue-950/10' :
                        feature.category === 'Advanced' ? 'bg-gray-50/30 dark:bg-gray-800/10' :
                        'bg-purple-50/20 dark:bg-purple-950/5'
                      }`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            feature.category === 'Core' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                            feature.category === 'Advanced' ? 'bg-gray-100 dark:bg-gray-800 text-gray-600' :
                            'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                          }`}>
                            <feature.icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                              {feature.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {feature.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {getFeatureValue(feature, 'Essential') !== false ? (
                          <div className="flex items-center justify-center">
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span className="ml-2 text-sm font-medium">
                              {getFeatureValue(feature, 'Essential')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {getFeatureValue(feature, 'Perform') !== false ? (
                          <div className="flex items-center justify-center">
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span className="ml-2 text-sm font-medium">
                              {getFeatureValue(feature, 'Perform')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {getFeatureValue(feature, 'Enterprise') !== false ? (
                          <div className="flex items-center justify-center">
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span className="ml-2 text-sm font-medium">
                              {getFeatureValue(feature, 'Enterprise')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* Show More/Less indicator */}
                  {hasMoreFeatures && !showAllFeatures && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <ChevronDown className="w-4 h-4 text-blue-600 animate-bounce" />
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">
                            {features.length - INITIAL_FEATURES_COUNT} more features
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAllFeatures(true)}
                            className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                          >
                            Show All
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional CTA */}
      <div className="text-center mt-12">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            Ready to Get Started?
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
            Join thousands of businesses using our platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 shadow-md">
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" className="border-gray-300 hover:border-blue-500 hover:text-blue-600 px-6 py-2">
              Contact Sales
            </Button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            14-day free trial • No credit card required
          </p>
        </div>
      </div>
    </div>
  );
};

export default CostComparison;
