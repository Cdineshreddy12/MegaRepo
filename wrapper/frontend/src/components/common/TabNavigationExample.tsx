import { User, Bell, Shield, CreditCard } from "lucide-react"
import { TabNavigation, TabItem } from "./TabNavigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Example usage of the reusable TabNavigation component
export function TabNavigationExample() {
  // Example 1: Basic tabs with content
  const basicTabs: TabItem[] = [
    {
      id: "account",
      label: "Account",
      icon: User,
      content: (
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>
              Manage your account information and preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Enter your name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter your email" />
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>
      ),
    },
    {
      id: "security",
      label: "Security",
      icon: Shield,
      content: (
        <Card>
          <CardHeader>
            <CardTitle>Security Settings</CardTitle>
            <CardDescription>
              Manage your security preferences and authentication.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Current Password</Label>
              <Input id="password" type="password" placeholder="Enter current password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input id="new-password" type="password" placeholder="Enter new password" />
            </div>
            <Button>Update Password</Button>
          </CardContent>
        </Card>
      ),
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      content: (
        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>
              Configure how you receive notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="email-notifications" />
              <Label htmlFor="email-notifications">Email notifications</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="push-notifications" />
              <Label htmlFor="push-notifications">Push notifications</Label>
            </div>
            <Button>Save Preferences</Button>
          </CardContent>
        </Card>
      ),
    },
    {
      id: "billing",
      label: "Billing",
      icon: CreditCard,
      content: (
        <Card>
          <CardHeader>
            <CardTitle>Billing Information</CardTitle>
            <CardDescription>
              Manage your subscription and payment methods.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="card-number">Card Number</Label>
              <Input id="card-number" placeholder="1234 5678 9012 3456" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input id="expiry" placeholder="MM/YY" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input id="cvv" placeholder="123" />
              </div>
            </div>
            <Button>Update Payment Method</Button>
          </CardContent>
        </Card>
      ),
    },
  ]

  // Example 2: Tabs with disabled state
  const tabsWithDisabled: TabItem[] = [
    {
      id: "active",
      label: "Active Tab",
      content: <div className="p-4">This is an active tab</div>,
    },
    {
      id: "disabled",
      label: "Disabled Tab",
      disabled: true,
      content: <div className="p-4">This tab is disabled</div>,
    },
    {
      id: "another",
      label: "Another Tab",
      content: <div className="p-4">Another active tab</div>,
    },
  ]

  const handleTabChange = (value: string) => {
    console.log("Tab changed to:", value)
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Basic Tab Navigation</h2>
        <TabNavigation
          tabs={basicTabs}
          defaultValue="account"
          onValueChange={handleTabChange}
          size="md"
        />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Small Size Tabs</h2>
        <TabNavigation
          tabs={tabsWithDisabled}
          defaultValue="active"
          size="sm"
          className="max-w-md"
        />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Large Size Tabs</h2>
        <TabNavigation
          tabs={basicTabs.slice(0, 3)}
          defaultValue="account"
          size="lg"
        />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Default Variant</h2>
        <TabNavigation
          tabs={basicTabs.slice(0, 3)}
          defaultValue="account"
          variant="default"
        />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Pills Variant</h2>
        <TabNavigation
          tabs={basicTabs.slice(0, 3)}
          defaultValue="account"
          variant="pills"
        />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Underline Variant</h2>
        <TabNavigation
          tabs={basicTabs.slice(0, 3)}
          defaultValue="account"
          variant="underline"
        />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Custom Styled Tabs</h2>
        <TabNavigation
          tabs={basicTabs.slice(0, 2)}
          defaultValue="account"
          tabsListClassName="bg-gray-100 rounded-lg p-1"
          tabsTriggerClassName="data-[state=active]:bg-white data-[state=active]:shadow-sm"
          tabsContentClassName="p-6 bg-gray-50 rounded-lg"
        />
      </div>
    </div>
  )
}

// Example of using just the tab list without content
export function TabListOnlyExample() {
  const tabs: TabItem[] = [
    { id: "tab1", label: "Tab 1", content: <div>Content 1</div> },
    { id: "tab2", label: "Tab 2", content: <div>Content 2</div> },
    { id: "tab3", label: "Tab 3", content: <div>Content 3</div> },
  ]

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold mb-4">Tab List Only Examples</h2>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">Default Variant</h3>
        <TabNavigation
          tabs={tabs}
          defaultValue="tab1"
          variant="default"
          onValueChange={(value) => console.log("Selected:", value)}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Pills Variant</h3>
        <TabNavigation
          tabs={tabs}
          defaultValue="tab1"
          variant="pills"
          onValueChange={(value) => console.log("Selected:", value)}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Underline Variant</h3>
        <TabNavigation
          tabs={tabs}
          defaultValue="tab1"
          variant="underline"
          onValueChange={(value) => console.log("Selected:", value)}
        />
      </div>
    </div>
  )
}
