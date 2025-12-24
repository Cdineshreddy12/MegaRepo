import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { Monitor, Palette, Sparkles, Eye, EyeOff, Building2 } from 'lucide-react'
import { useTheme } from '@/components/theme/ThemeProvider'
import AccountSettings from './AccountSettings'

export const Settings: React.FC = () => {
  const { actualTheme, glassmorphismEnabled, setGlassmorphismEnabled } = useTheme()
  const [navigationMode, setNavigationMode] = useState<'traditional' | 'dock'>('traditional')

  // Get current settings from localStorage or defaults
  React.useEffect(() => {
    const savedNavigationMode = localStorage.getItem('navigation-mode') as 'traditional' | 'dock' || 'traditional'
    setNavigationMode(savedNavigationMode)
  }, [])

  const handleNavigationModeChange = (mode: 'traditional' | 'dock') => {
    setNavigationMode(mode)
    localStorage.setItem('navigation-mode', mode)
    // You might want to trigger a page reload or state update here
    window.location.reload()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="max-w-6xl mx-auto p-6 space-y-8"
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account details, preferences, and dashboard customization
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">
            <Monitor className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="account">
            <Building2 className="h-4 w-4 mr-2" />
            Account Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-8">
          {/* Appearance Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize the visual appearance of your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Theme</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose your preferred color scheme
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {actualTheme}
                  </Badge>
                  <ThemeToggle />
                </div>
              </div>

              <Separator />

              {/* Glassy Mode */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Glassy Mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Enable ultra-modern glassmorphism effects
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={glassmorphismEnabled ? "default" : "secondary"}>
                    {glassmorphismEnabled ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                    {glassmorphismEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                  <Switch
                    checked={glassmorphismEnabled}
                    onCheckedChange={setGlassmorphismEnabled}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Navigation
              </CardTitle>
              <CardDescription>
                Choose how you want to navigate through the dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Navigation Mode */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Navigation Style</Label>
                  <p className="text-sm text-muted-foreground">
                    Select your preferred navigation interface
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Traditional Sidebar */}
                  <div
                    className={`relative border rounded-lg p-4 cursor-pointer transition-all ${navigationMode === 'traditional'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border hover:border-primary/50'
                      }`}
                    onClick={() => handleNavigationModeChange('traditional')}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                        <Monitor className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-medium">Traditional Sidebar</h3>
                        <p className="text-sm text-muted-foreground">Classic sidebar navigation</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="h-2 bg-muted rounded w-full"></div>
                      <div className="h-2 bg-muted rounded w-3/4"></div>
                      <div className="h-2 bg-muted rounded w-1/2"></div>
                    </div>
                    {navigationMode === 'traditional' && (
                      <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                      </div>
                    )}
                  </div>

                  {/* Floating Dock */}
                  <div
                    className={`relative border rounded-lg p-4 cursor-pointer transition-all ${navigationMode === 'dock'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border hover:border-primary/50'
                      }`}
                    onClick={() => handleNavigationModeChange('dock')}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-medium">Floating Dock</h3>
                        <p className="text-sm text-muted-foreground">Modern floating navigation</p>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 bg-muted rounded-full"></div>
                        <div className="w-3 h-3 bg-muted rounded-full"></div>
                        <div className="w-3 h-3 bg-muted rounded-full"></div>
                        <div className="w-3 h-3 bg-muted rounded-full"></div>
                      </div>
                    </div>
                    {navigationMode === 'dock' && (
                      <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview Section */}
          <Card>
            <CardHeader>
              <CardTitle>Current Configuration</CardTitle>
              <CardDescription>
                Your current settings summary
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="capitalize">
                  Theme: {actualTheme}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  Navigation: {navigationMode}
                </Badge>
                <Badge variant={glassmorphismEnabled ? "default" : "secondary"}>
                  Glassmorphism: {glassmorphismEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <AccountSettings />
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}

export default Settings
