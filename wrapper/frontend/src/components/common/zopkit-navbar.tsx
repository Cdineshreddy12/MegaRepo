"use client";
import React, { useState } from "react";
import { HoveredLink, Menu, MenuItem, ProductItem } from "@/components/ui/navbar-menu";
import { cn } from "@/lib/utils";

interface ZopkitNavbarProps {
  isAuthenticated: boolean | null;
  isLoading: boolean;
  onLogin: () => void;
  onShowDemo: () => void;
  className?: string;
}

export function ZopkitNavbar({
  isAuthenticated,
  isLoading,
  onLogin,
  onShowDemo,
  className
}: ZopkitNavbarProps) {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className={cn("fixed top-6 inset-x-0 max-w-5xl mx-auto z-50", className)}>
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">Z</span>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Zopkit
            </h1>
            <p className="text-xs text-gray-500 -mt-1">Business Suite</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <Menu setActive={setActive}>
          <MenuItem setActive={setActive} active={active} item="Applications">
            <div className="text-sm grid grid-cols-2 gap-6 p-4">
              <ProductItem
                title="CRM Dashboard"
                href="#crm"
                src="/crm-dashboard.svg"
                description="Customer relationship management with AI assistant."
              />
              <ProductItem
                title="HRMS System"
                href="#hrms"
                src="/hrms.svg"
                description="Complete human resource management solution."
              />
              <ProductItem
                title="Finance Management"
                href="#finance"
                src="/finance-management.svg"
                description="Comprehensive financial operations platform."
              />
              <ProductItem
                title="Operations Management"
                href="#operations"
                src="/operations-management.svg"
                description="Streamline your business operations."
              />
              <ProductItem
                title="Project Management"
                href="#projects"
                src="/project-management.svg"
                description="Advanced project tracking and collaboration."
              />
              <ProductItem
                title="Zopkit Academy"
                href="#academy"
                src="/zopkit-academy.svg"
                description="Learning and development platform."
              />
            </div>
          </MenuItem>

          <MenuItem setActive={setActive} active={active} item="Features">
            <div className="flex flex-col space-y-4 text-sm">
              <HoveredLink href="#ai-assistant">AI Assistant</HoveredLink>
              <HoveredLink href="#analytics">Advanced Analytics</HoveredLink>
              <HoveredLink href="#integrations">API Integrations</HoveredLink>
              <HoveredLink href="#security">Enterprise Security</HoveredLink>
              <HoveredLink href="#automation">Workflow Automation</HoveredLink>
            </div>
          </MenuItem>

          <MenuItem setActive={setActive} active={active} item="Pricing">
            <div className="flex flex-col space-y-4 text-sm">
              <HoveredLink href="#starter">Starter Plan</HoveredLink>
              <HoveredLink href="#professional">Professional</HoveredLink>
              <HoveredLink href="#enterprise">Enterprise</HoveredLink>
              <HoveredLink href="#custom">Custom Solutions</HoveredLink>
            </div>
          </MenuItem>

          <MenuItem setActive={setActive} active={active} item="Resources">
            <div className="flex flex-col space-y-4 text-sm">
              <HoveredLink href="#docs">Documentation</HoveredLink>
              <HoveredLink href="#api">API Reference</HoveredLink>
              <HoveredLink href="#support">Support Center</HoveredLink>
              <HoveredLink href="#blog">Blog</HoveredLink>
            </div>
          </MenuItem>
        </Menu>

        {/* CTA Buttons */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onShowDemo}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Schedule Demo
          </button>

          {isAuthenticated ? (
            <button
              onClick={onLogin}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Dashboard'}
            </button>
          ) : (
            <button
              onClick={onLogin}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Get Started'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}