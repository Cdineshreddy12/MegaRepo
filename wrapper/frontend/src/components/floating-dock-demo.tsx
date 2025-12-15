import React, { useState } from "react";
import { FloatingDock, DockMode } from "@/components/ui/floating-dock";
import {
  IconBrandGithub,
  IconBrandX,
  IconExchange,
  IconHome,
  IconNewSection,
  IconTerminal2,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function FloatingDockDemo() {
  const [mode, setMode] = useState<DockMode>("dock");

  const links = [
    {
      title: "Home",
      icon: (
        <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
    },

    {
      title: "Products",
      icon: (
        <IconTerminal2 className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
    },
    {
      title: "Components",
      icon: (
        <IconNewSection className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
    },
    {
      title: "Aceternity UI",
      icon: (
        <img
          src="https://assets.aceternity.com/logo-dark.png"
          width={20}
          height={20}
          alt="Aceternity Logo"
        />
      ),
      href: "#",
    },
    {
      title: "Changelog",
      icon: (
        <IconExchange className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
    },

    {
      title: "Twitter",
      icon: (
        <IconBrandX className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
    },
    {
      title: "GitHub",
      icon: (
        <IconBrandGithub className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 p-8">
      <div className="max-w-6xl mx-auto">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Floating Dock Component Demo</CardTitle>
            <CardDescription>
              Choose between dock and sidebar modes. The dock mode shows a floating navigation bar,
              while sidebar mode provides a collapsible sidebar navigation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <Button
                variant={mode === "dock" ? "default" : "outline"}
                onClick={() => setMode("dock")}
              >
                Dock Mode
              </Button>
              <Button
                variant={mode === "sidebar" ? "default" : "outline"}
                onClick={() => setMode("sidebar")}
              >
                Sidebar Mode
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              Current mode: <span className="font-medium capitalize">{mode}</span>
            </div>
          </CardContent>
        </Card>

        {mode === "dock" ? (
          <div className="flex items-center justify-center h-[35rem] w-full border rounded-lg bg-white dark:bg-neutral-900">
            <FloatingDock
              mobileClassName="translate-y-20" // only for demo, remove for production
              items={links}
              mode={mode}
            />
          </div>
        ) : (
          <div className="flex border rounded-lg overflow-hidden bg-white dark:bg-neutral-900">
            <FloatingDock
              items={links}
              mode={mode}
              desktopClassName="h-[35rem]"
            />
            <div className="flex-1 p-8">
              <h2 className="text-2xl font-bold mb-4">Content Area</h2>
              <p className="text-muted-foreground">
                This is the main content area. The sidebar can be collapsed/expanded using the toggle button.
                In sidebar mode, the navigation items are displayed in a vertical layout with labels.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
