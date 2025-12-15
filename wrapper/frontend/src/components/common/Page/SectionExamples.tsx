import { useState } from "react";
import { Section, SectionAction, SectionBadge } from "./Section";
import { Download, RefreshCw, Settings, Plus, Trash2, Eye } from "lucide-react";

// Example data and handlers
const handleExport = () => console.log("Export clicked");
const handleRefresh = () => console.log("Refresh clicked");
const handleSettings = () => console.log("Settings clicked");
const handleAdd = () => console.log("Add clicked");
const handleDelete = () => console.log("Delete clicked");
// const handleView = () => console.log("View clicked");

// Example actions
const analyticsActions: SectionAction[] = [
  { 
    label: "Export", 
    onClick: handleExport, 
    icon: Download,
    variant: "outline" 
  },
  { 
    label: "Refresh", 
    onClick: handleRefresh, 
    icon: RefreshCw,
    variant: "ghost" 
  }
];

const settingsActions: SectionAction[] = [
  { 
    label: "Settings", 
    onClick: handleSettings, 
    icon: Settings,
    variant: "outline" 
  }
];

const dataActions: SectionAction[] = [
  { 
    label: "Add Item", 
    onClick: handleAdd, 
    icon: Plus,
    variant: "default" 
  },
  { 
    label: "Delete", 
    onClick: handleDelete, 
    icon: Trash2,
    variant: "destructive" 
  }
];

// Example badges
const liveBadge: SectionBadge = { text: "Live", variant: "destructive" };
const newBadge: SectionBadge = { text: "New", variant: "secondary" };
const betaBadge: SectionBadge = { text: "Beta", variant: "outline" };

// Example components
export function BasicSectionExample() {
  return (
    <Section 
      title="Basic Section" 
      description="A simple section with basic content"
    >
      <div className="p-4 bg-muted/50 rounded-lg">
        <p>This is basic section content.</p>
      </div>
    </Section>
  );
}

export function ActionsSectionExample() {
  return (
    <Section 
      title="Analytics Dashboard" 
      description="Real-time analytics and metrics"
      badges={[liveBadge, newBadge]}
      headerActions={analyticsActions}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900">Total Users</h4>
            <p className="text-2xl font-bold text-blue-600">1,234</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-semibold text-green-900">Revenue</h4>
            <p className="text-2xl font-bold text-green-600">$12,345</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <h4 className="font-semibold text-purple-900">Orders</h4>
            <p className="text-2xl font-bold text-purple-600">567</p>
          </div>
        </div>
      </div>
    </Section>
  );
}

export function CollapsibleSectionExample() {
  const [collapsed, setCollapsed] = useState(false);
  
  return (
    <Section 
      title="Settings" 
      description="Configure your application settings"
      collapsible
      collapsed={collapsed}
      onToggleCollapse={() => setCollapsed(!collapsed)}
      headerActions={settingsActions}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Theme</label>
          <select className="w-full p-2 border rounded-md">
            <option>Light</option>
            <option>Dark</option>
            <option>System</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Language</label>
          <select className="w-full p-2 border rounded-md">
            <option>English</option>
            <option>Spanish</option>
            <option>French</option>
          </select>
        </div>
      </div>
    </Section>
  );
}

export function LoadingSectionExample() {
  return (
    <Section 
      title="Loading Data" 
      description="This section is currently loading"
      loading={true}
    >
      <div>This content won't be shown while loading</div>
    </Section>
  );
}

export function ErrorSectionExample() {
  return (
    <Section 
      title="Error State" 
      description="Something went wrong"
      error="Failed to load data. Please try again."
    >
      <div>This content won't be shown when there's an error</div>
    </Section>
  );
}

export function VariantSectionExamples() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Core Variants (shadcn-inspired)</h3>
      
      <Section 
        title="Default Variant" 
        description="shadcn default card styling - rounded-xl, border, shadow"
        variant="default"
      >
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-blue-900">Default section with shadcn card styling. Perfect for most content sections.</p>
        </div>
      </Section>
      
      <Section 
        title="Card Variant" 
        description="Same as default - shadcn card styling"
        variant="card"
      >
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-green-900">Card variant uses the same styling as the default variant. Great for content cards.</p>
        </div>
      </Section>
      
      <Section 
        title="Outlined Variant" 
        description="Thicker border with transparent background"
        variant="outlined"
      >
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-purple-900">Outlined section with thicker border and transparent background. Great for emphasis.</p>
        </div>
      </Section>
      
      <Section 
        title="Filled Variant" 
        description="Muted background with no border"
        variant="filled"
      >
        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
          <p className="text-orange-900">Filled section with muted background color and no border. Subtle and clean.</p>
        </div>
      </Section>
      
      <Section 
        title="Ghost Variant" 
        description="No border, no background, just rounded corners"
        variant="ghost"
      >
        <div className="p-4 bg-pink-50 rounded-lg">
          <p className="text-pink-900">Ghost section with minimal styling - no border or background. Perfect for simple layouts.</p>
        </div>
      </Section>
      
      <Section 
        title="Minimal Variant" 
        description="Completely clean - no border, no shadow, no background"
        variant="minimal"
      >
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-900">Minimal variant with no borders, shadows, or background. Completely clean appearance.</p>
        </div>
      </Section>
    </div>
  );
}

export function NewVariantExamples() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Specialized Variants</h3>
      
      <Section 
        title="Panel Variant" 
        description="Subtle panel styling for secondary content"
        variant="panel"
      >
        <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
          <p className="text-cyan-900">Panel variant with subtle borders and background. Perfect for secondary information.</p>
        </div>
      </Section>
      
      <Section 
        title="Banner Variant" 
        description="Attention-grabbing banner with gradient background"
        variant="banner"
      >
        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
          <p className="text-indigo-900">Banner variant with gradient background. Great for announcements and highlights.</p>
        </div>
      </Section>
    </div>
  );
}

export function BorderVariantExamples() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Border-Focused Variants</h3>
      
      <Section 
        title="Dashed Border" 
        description="Dashed border style with dividers"
        variant="dashed"
      >
        <div className="p-4 bg-yellow-50 rounded-lg">
          <p className="text-yellow-900">Dashed border variant. Great for draft or temporary content.</p>
        </div>
      </Section>
      
      <Section 
        title="Dotted Border" 
        description="Dotted border style for subtle emphasis"
        variant="dotted"
      >
        <div className="p-4 bg-teal-50 rounded-lg">
          <p className="text-teal-900">Dotted border variant. Perfect for subtle emphasis.</p>
        </div>
      </Section>
      
      <Section 
        title="Double Border" 
        description="Double border for strong emphasis"
        variant="double"
      >
        <div className="p-4 bg-red-50 rounded-lg">
          <p className="text-red-900">Double border variant. Great for highlighting important content.</p>
        </div>
      </Section>
      
      <Section 
        title="Success State" 
        description="Success color border for positive states"
        variant="success"
      >
        <div className="p-4 bg-emerald-50 rounded-lg">
          <p className="text-emerald-900">Success variant with green border. Perfect for completed tasks or positive feedback.</p>
        </div>
      </Section>
      
      <Section 
        title="Warning Alert" 
        description="Warning color border for alerts"
        variant="warning"
      >
        <div className="p-4 bg-amber-50 rounded-lg">
          <p className="text-amber-900">Warning variant with yellow border. Great for alerts and attention-grabbing content.</p>
        </div>
      </Section>
      
      <Section 
        title="Destructive Alert" 
        description="Destructive color border for errors"
        variant="destructive"
      >
        <div className="p-4 bg-rose-50 rounded-lg">
          <p className="text-rose-900">Destructive variant with red border. Perfect for errors and critical alerts.</p>
        </div>
      </Section>
      
      <Section 
        title="Primary Emphasis" 
        description="Primary color border for important content"
        variant="primary"
      >
        <div className="p-4 bg-violet-50 rounded-lg">
          <p className="text-violet-900">Primary variant with theme primary color border. Great for highlighting key information.</p>
        </div>
      </Section>
    </div>
  );
}

export function VariantOverrideExamples() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Variant Overrides</h3>
      
      <Section 
        title="Card with Dashed Border" 
        description="Card variant with custom dashed border"
        variant="card"
        borderType="dashed"
        borderColor="primary"
      >
        <p>Card variant with overridden border style. Individual props override variant defaults.</p>
      </Section>
      
      <Section 
        title="Panel with Warning Border" 
        description="Panel variant with warning color border"
        variant="panel"
        borderColor="warning"
        borderWidth="thick"
      >
        <p>Panel variant with custom border color and width. Great for highlighting important content.</p>
      </Section>
      
      <Section 
        title="Banner with Custom Radius" 
        description="Banner variant with extra large border radius"
        variant="banner"
        borderRadius="xl"
      >
        <p>Banner variant with custom border radius. Shows how to fine-tune variant styling.</p>
      </Section>
    </div>
  );
}

export function SizeSectionExamples() {
  return (
    <div className="space-y-4">
      <Section 
        title="Small Size" 
        description="Compact spacing"
        size="sm"
      >
        <p>Small section with compact spacing</p>
      </Section>
      
      <Section 
        title="Medium Size" 
        description="Default spacing"
        size="md"
      >
        <p>Medium section with default spacing</p>
      </Section>
      
      <Section 
        title="Large Size" 
        description="Generous spacing"
        size="lg"
      >
        <p>Large section with generous spacing</p>
      </Section>
    </div>
  );
}

export function ScrollableSectionExample() {
  return (
    <Section 
      title="Scrollable Content" 
      description="Content that can be scrolled"
      scrollable
      maxHeight={200}
      showDivider
    >
      <div className="space-y-2">
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} className="p-2 bg-muted/50 rounded">
            Item {i + 1}
          </div>
        ))}
      </div>
    </Section>
  );
}

export function DataTableSectionExample() {
  return (
    <Section 
      title="Data Management" 
      description="Manage your data entries"
      badges={[betaBadge]}
      headerActions={dataActions}
      showDivider
      footer={
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>Showing 1-10 of 100 items</span>
          <div className="flex gap-2">
            <button className="px-2 py-1 border rounded hover:bg-muted">Previous</button>
            <button className="px-2 py-1 border rounded hover:bg-muted">Next</button>
          </div>
        </div>
      }
    >
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <h4 className="font-medium">Data Item {i + 1}</h4>
              <p className="text-sm text-muted-foreground">Description for item {i + 1}</p>
            </div>
            <div className="flex gap-2">
              <button className="p-1 hover:bg-muted rounded">
                <Eye className="w-4 h-4" />
              </button>
              <button className="p-1 hover:bg-muted rounded">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function BorderTypeExamples() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Border Type Examples</h3>
      
      <Section 
        title="Solid Border (Default)" 
        description="Standard solid border"
        borderType="solid"
        borderColor="default"
        borderWidth="medium"
      >
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-blue-900">This section uses a solid border with default color and medium width.</p>
        </div>
      </Section>
      
      <Section 
        title="Dashed Border" 
        description="Dashed border style"
        borderType="dashed"
        borderColor="primary"
        borderWidth="medium"
      >
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-green-900">This section uses a dashed border with primary color.</p>
        </div>
      </Section>
      
      <Section 
        title="Dotted Border" 
        description="Dotted border style"
        borderType="dotted"
        borderColor="secondary"
        borderWidth="thin"
      >
        <div className="p-4 bg-purple-50 rounded-lg">
          <p className="text-purple-900">This section uses a dotted border with secondary color and thin width.</p>
        </div>
      </Section>
      
      <Section 
        title="Double Border" 
        description="Double border style"
        borderType="double"
        borderColor="destructive"
        borderWidth="thick"
      >
        <div className="p-4 bg-red-50 rounded-lg">
          <p className="text-red-900">This section uses a double border with destructive color and thick width.</p>
        </div>
      </Section>
      
      <Section 
        title="No Border" 
        description="No border style"
        borderType="none"
        variant="filled"
      >
        <div className="p-4 bg-orange-50 rounded-lg">
          <p className="text-orange-900">This section has no border and uses the filled variant.</p>
        </div>
      </Section>
    </div>
  );
}

export function BorderColorExamples() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Border Color Examples</h3>
      
      <Section 
        title="Default Border" 
        description="Default border color"
        borderColor="default"
        borderWidth="medium"
      >
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-900">Default border color using theme colors.</p>
        </div>
      </Section>
      
      <Section 
        title="Primary Border" 
        description="Primary color border"
        borderColor="primary"
        borderWidth="medium"
      >
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-blue-900">Primary color border for important sections.</p>
        </div>
      </Section>
      
      <Section 
        title="Success Border" 
        description="Success color border"
        borderColor="success"
        borderWidth="medium"
      >
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-green-900">Success color border for completed or positive states.</p>
        </div>
      </Section>
      
      <Section 
        title="Warning Border" 
        description="Warning color border"
        borderColor="warning"
        borderWidth="medium"
      >
        <div className="p-4 bg-yellow-50 rounded-lg">
          <p className="text-yellow-900">Warning color border for attention-grabbing content.</p>
        </div>
      </Section>
      
      <Section 
        title="Destructive Border" 
        description="Destructive color border"
        borderColor="destructive"
        borderWidth="medium"
      >
        <div className="p-4 bg-red-50 rounded-lg">
          <p className="text-red-900">Destructive color border for errors or critical content.</p>
        </div>
      </Section>
    </div>
  );
}

export function BorderWidthExamples() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Border Width Examples</h3>
      
      <Section 
        title="Thin Border" 
        description="Thin border width"
        borderWidth="thin"
        borderColor="primary"
      >
        <p>This section uses a thin border for subtle emphasis.</p>
      </Section>
      
      <Section 
        title="Medium Border" 
        description="Medium border width (default)"
        borderWidth="medium"
        borderColor="primary"
      >
        <p>This section uses a medium border for standard emphasis.</p>
      </Section>
      
      <Section 
        title="Thick Border" 
        description="Thick border width"
        borderWidth="thick"
        borderColor="primary"
      >
        <p>This section uses a thick border for strong emphasis.</p>
      </Section>
    </div>
  );
}

export function BorderRadiusExamples() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Border Radius Examples</h3>
      
      <Section 
        title="No Radius" 
        description="Sharp corners"
        borderRadius="none"
        borderColor="primary"
      >
        <p>This section has no border radius for sharp, angular corners.</p>
      </Section>
      
      <Section 
        title="Small Radius" 
        description="Slightly rounded corners"
        borderRadius="sm"
        borderColor="primary"
      >
        <p>This section has small border radius for subtle rounding.</p>
      </Section>
      
      <Section 
        title="Medium Radius" 
        description="Moderately rounded corners (default)"
        borderRadius="md"
        borderColor="primary"
      >
        <p>This section has medium border radius for standard rounding.</p>
      </Section>
      
      <Section 
        title="Large Radius" 
        description="Well rounded corners"
        borderRadius="lg"
        borderColor="primary"
      >
        <p>This section has large border radius for prominent rounding.</p>
      </Section>
      
      <Section 
        title="Extra Large Radius" 
        description="Very rounded corners (shadcn default)"
        borderRadius="xl"
        borderColor="primary"
      >
        <p>This section has extra large border radius - the shadcn default for cards.</p>
      </Section>
      
      <Section 
        title="Full Radius" 
        description="Fully rounded (pill shape)"
        borderRadius="full"
        borderColor="primary"
      >
        <p>This section has full border radius creating a pill-like shape.</p>
      </Section>
    </div>
  );
}

export function CombinedBorderExamples() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Combined Border Examples</h3>
      
      <Section 
        title="Dashed Primary" 
        description="Dashed border with primary color and thick width"
        borderType="dashed"
        borderColor="primary"
        borderWidth="thick"
        borderRadius="lg"
      >
        <p>Combination of dashed style, primary color, thick width, and large radius.</p>
      </Section>
      
      <Section 
        title="Dotted Success" 
        description="Dotted border with success color and thin width"
        borderType="dotted"
        borderColor="success"
        borderWidth="thin"
        borderRadius="md"
      >
        <p>Combination of dotted style, success color, thin width, and medium radius.</p>
      </Section>
      
      <Section 
        title="Double Warning" 
        description="Double border with warning color and medium width"
        borderType="double"
        borderColor="warning"
        borderWidth="medium"
        borderRadius="xl"
      >
        <p>Combination of double style, warning color, medium width, and extra large radius.</p>
      </Section>
    </div>
  );
}

export function CleanStylingExamples() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Clean Styling Examples</h3>
      
      <Section 
        title="Minimal Section" 
        description="No border, no shadow, no background"
        variant="minimal"
      >
        <div className="p-4 bg-slate-50 rounded-lg">
          <p className="text-slate-900">Minimal variant provides the cleanest appearance with no visual styling.</p>
        </div>
      </Section>
      
      <Section 
        title="Ghost Section" 
        description="No border, no shadow, with rounded corners"
        variant="ghost"
      >
        <div className="p-4 bg-stone-50 rounded-lg">
          <p className="text-stone-900">Ghost variant provides clean styling with subtle rounded corners.</p>
        </div>
      </Section>
      
      <Section 
        title="Custom Clean Override" 
        description="Using className to remove border and shadow"
        variant="card"
        className="border-0 shadow-none bg-transparent"
      >
        <div className="p-4 bg-zinc-50 rounded-lg">
          <p className="text-zinc-900">Custom override using className to achieve clean styling with any variant.</p>
        </div>
      </Section>
    </div>
  );
}


export default function SectionExamples() {
  return (
    <div className="space-y-4">
      <BasicSectionExample />
      <ActionsSectionExample />
      <CollapsibleSectionExample />
      <LoadingSectionExample />
      <ErrorSectionExample />
      <VariantSectionExamples />
      <NewVariantExamples />
      <BorderVariantExamples />
      <VariantOverrideExamples />
      <CleanStylingExamples />
      <SizeSectionExamples />
      <ScrollableSectionExample />
      <DataTableSectionExample />
      <BorderTypeExamples />
      <BorderColorExamples />
      <BorderWidthExamples />
      <BorderRadiusExamples />
      <CombinedBorderExamples />
    </div>
  );
} 

