import React, { useState } from 'react';
import { FlowSelector, FlowConfig } from '../components/FlowSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  User, 
  Building2, 
  ShoppingCart, 
  CreditCard, 
  FileText, 
  Settings,
  Zap,
  Shield,
  Globe,
  Smartphone
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Sample flow configurations for examples
 */
const sampleFlows: FlowConfig[] = [
  {
    id: 'personal',
    name: 'Personal Account',
    description: 'Perfect for individuals and personal use',
    icon: <User className="w-6 h-6 text-blue-600" />,
    data: { type: 'personal', features: ['basic', 'support'] }
  },
  {
    id: 'business',
    name: 'Business Account',
    description: 'Ideal for small to medium businesses',
    icon: <Building2 className="w-6 h-6 text-green-600" />,
    data: { type: 'business', features: ['advanced', 'analytics', 'support'] }
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Advanced features for large organizations',
    icon: <Shield className="w-6 h-6 text-purple-600" />,
    data: { type: 'enterprise', features: ['premium', 'analytics', 'priority-support', 'custom'] }
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Built for online stores and marketplaces',
    icon: <ShoppingCart className="w-6 h-6 text-orange-600" />,
    data: { type: 'ecommerce', features: ['payments', 'inventory', 'analytics'] }
  },
  {
    id: 'saas',
    name: 'SaaS Platform',
    description: 'Software as a Service applications',
    icon: <Zap className="w-6 h-6 text-yellow-600" />,
    data: { type: 'saas', features: ['api', 'webhooks', 'analytics', 'multi-tenant'] }
  },
  {
    id: 'mobile',
    name: 'Mobile App',
    description: 'Native mobile application development',
    icon: <Smartphone className="w-6 h-6 text-pink-600" />,
    data: { type: 'mobile', features: ['ios', 'android', 'push-notifications'] }
  }
];

/**
 * Example 1: Default FlowSelector with card layout
 */
export const DefaultFlowSelectorExample: React.FC = () => {
  const [selectedFlow, setSelectedFlow] = useState<FlowConfig | null>(null);

  const handleFlowSelect = (flow: FlowConfig) => {
    setSelectedFlow(flow);
    toast.success(`Selected: ${flow.name}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Default Card Layout</h3>
        <p className="text-sm text-gray-600 mb-4">
          Default grid layout with card-based UI using shadcn/ui components.
        </p>
      </div>

      <FlowSelector
        flows={sampleFlows}
        onSelect={handleFlowSelect}
        title="Choose Your Account Type"
        description="Select the type of account that best fits your needs"
        variant="grid"
        maxColumns={3}
      />

      {selectedFlow && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {selectedFlow.icon}
                <span className="font-medium">{selectedFlow.name}</span>
              </div>
              <p className="text-sm text-gray-600">{selectedFlow.description}</p>
              <div className="flex flex-wrap gap-1">
                {selectedFlow.data?.features.map((feature: string) => (
                  <Badge key={feature} variant="secondary" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/**
 * Example 2: List layout FlowSelector
 */
export const ListFlowSelectorExample: React.FC = () => {
  const [selectedFlow, setSelectedFlow] = useState<FlowConfig | null>(null);

  const handleFlowSelect = (flow: FlowConfig) => {
    setSelectedFlow(flow);
    toast.success(`Selected: ${flow.name}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">List Layout</h3>
        <p className="text-sm text-gray-600 mb-4">
          Vertical list layout with button-style items.
        </p>
      </div>

      <FlowSelector
        flows={sampleFlows.slice(0, 4)} // Show only first 4 for list demo
        onSelect={handleFlowSelect}
        title="Select Integration Type"
        description="Choose how you want to integrate with our platform"
        variant="list"
        defaultFlowId="business"
      />

      {selectedFlow && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Integration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {selectedFlow.icon}
                <span className="font-medium">{selectedFlow.name}</span>
              </div>
              <p className="text-sm text-gray-600">{selectedFlow.description}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/**
 * Example 3: Custom renderItem with Radio Group
 */
export const CustomRadioFlowSelectorExample: React.FC = () => {
  const [selectedFlow, setSelectedFlow] = useState<FlowConfig | null>(null);

  const handleFlowSelect = (flow: FlowConfig) => {
    setSelectedFlow(flow);
    toast.success(`Selected: ${flow.name}`);
  };

  // Custom renderer using RadioGroup
  const renderRadioItem = (flow: FlowConfig, isSelected: boolean, onClick: () => void) => (
    <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
      <RadioGroupItem
        value={flow.id}
        id={flow.id}
        checked={isSelected}
        onChange={onClick}
        className="mt-1"
      />
      <div className="flex-1 min-w-0">
        <Label htmlFor={flow.id} className="cursor-pointer">
          <div className="flex items-center gap-3">
            {flow.icon}
            <div>
              <div className="font-medium">{flow.name}</div>
              {flow.description && (
                <div className="text-sm text-gray-600">{flow.description}</div>
              )}
            </div>
          </div>
        </Label>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Custom Radio Group Layout</h3>
        <p className="text-sm text-gray-600 mb-4">
          Custom renderer using RadioGroup for a different UI approach.
        </p>
      </div>

      <FlowSelector
        flows={sampleFlows.slice(0, 3)}
        onSelect={handleFlowSelect}
        renderItem={renderRadioItem}
        title="Choose Your Plan"
        description="Select the plan that works best for your team"
        defaultFlowId="business"
      />

      {selectedFlow && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {selectedFlow.icon}
                <span className="font-medium">{selectedFlow.name}</span>
              </div>
              <p className="text-sm text-gray-600">{selectedFlow.description}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/**
 * Example 4: Advanced Custom Renderer
 */
export const AdvancedCustomFlowSelectorExample: React.FC = () => {
  const [selectedFlow, setSelectedFlow] = useState<FlowConfig | null>(null);

  const handleFlowSelect = (flow: FlowConfig) => {
    setSelectedFlow(flow);
    toast.success(`Selected: ${flow.name}`);
  };

  // Advanced custom renderer with detailed information
  const renderAdvancedItem = (flow: FlowConfig, isSelected: boolean, onClick: () => void) => (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isSelected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
      }`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              {flow.icon}
              <div>
                <h3 className="text-lg font-semibold">{flow.name}</h3>
                <p className="text-sm text-gray-600">{flow.description}</p>
              </div>
            </div>
            
            {flow.data?.features && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Features:</h4>
                <div className="flex flex-wrap gap-1">
                  {flow.data.features.map((feature: string) => (
                    <Badge key={feature} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex-shrink-0 ml-4">
            {isSelected ? (
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            ) : (
              <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Advanced Custom Layout</h3>
        <p className="text-sm text-gray-600 mb-4">
          Custom renderer with detailed information and custom selection indicator.
        </p>
      </div>

      <FlowSelector
        flows={sampleFlows}
        onSelect={handleFlowSelect}
        renderItem={renderAdvancedItem}
        title="Choose Your Solution"
        description="Select the solution that best fits your requirements"
        variant="grid"
        maxColumns={2}
      />

      {selectedFlow && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Solution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {selectedFlow.icon}
                <div>
                  <div className="font-medium">{selectedFlow.name}</div>
                  <div className="text-sm text-gray-600">{selectedFlow.description}</div>
                </div>
              </div>
              
              {selectedFlow.data?.features && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Included Features:</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedFlow.data.features.map((feature: string) => (
                      <Badge key={feature} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/**
 * Main example component that showcases all variants
 */
export const FlowSelectorShowcase: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-4">FlowSelector Component</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A flexible and accessible component for selecting from a list of flow configurations.
            Built with React, TypeScript, and shadcn/ui.
          </p>
        </div>

        <div className="space-y-12">
          <DefaultFlowSelectorExample />
          <ListFlowSelectorExample />
          <CustomRadioFlowSelectorExample />
          <AdvancedCustomFlowSelectorExample />
        </div>
      </div>
    </div>
  );
};

export default FlowSelectorShowcase;
