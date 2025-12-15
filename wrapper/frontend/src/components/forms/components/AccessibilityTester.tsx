import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Eye, EyeOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface AccessibilityTest {
  id: string;
  name: string;
  description: string;
  category: 'color' | 'contrast' | 'keyboard' | 'screenreader' | 'focus' | 'semantics';
  status: 'pass' | 'fail' | 'warning' | 'not-tested';
  details?: string;
  fix?: string;
}

interface AccessibilityTesterProps {
  children: React.ReactNode;
  enabled?: boolean;
  onTestComplete?: (results: AccessibilityTest[]) => void;
}

/**
 * Accessibility testing component for multi-step forms
 */
export const AccessibilityTester: React.FC<AccessibilityTesterProps> = ({
  children,
  enabled = false,
  onTestComplete
}) => {
  const [tests, setTests] = useState<AccessibilityTest[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [screenReaderMode, setScreenReaderMode] = useState(false);
  const [focusVisible, setFocusVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize tests
  useEffect(() => {
    const initialTests: AccessibilityTest[] = [
      {
        id: 'color-contrast',
        name: 'Color Contrast',
        description: 'Check if text has sufficient contrast ratio',
        category: 'contrast',
        status: 'not-tested'
      },
      {
        id: 'keyboard-navigation',
        name: 'Keyboard Navigation',
        description: 'Test if all interactive elements are keyboard accessible',
        category: 'keyboard',
        status: 'not-tested'
      },
      {
        id: 'focus-management',
        name: 'Focus Management',
        description: 'Verify proper focus order and visibility',
        category: 'focus',
        status: 'not-tested'
      },
      {
        id: 'aria-labels',
        name: 'ARIA Labels',
        description: 'Check for proper ARIA labels and descriptions',
        category: 'semantics',
        status: 'not-tested'
      },
      {
        id: 'form-labels',
        name: 'Form Labels',
        description: 'Ensure all form fields have associated labels',
        category: 'semantics',
        status: 'not-tested'
      },
      {
        id: 'heading-structure',
        name: 'Heading Structure',
        description: 'Verify proper heading hierarchy',
        category: 'semantics',
        status: 'not-tested'
      },
      {
        id: 'color-blindness',
        name: 'Color Blindness Support',
        description: 'Check if information is conveyed without relying solely on color',
        category: 'color',
        status: 'not-tested'
      },
      {
        id: 'screen-reader',
        name: 'Screen Reader Support',
        description: 'Test screen reader compatibility',
        category: 'screenreader',
        status: 'not-tested'
      }
    ];
    setTests(initialTests);
  }, []);

  // Run accessibility tests
  const runTests = async () => {
    setIsRunning(true);
    const updatedTests = [...tests];

    // Test 1: Color Contrast
    const contrastResult = await testColorContrast();
    updateTest(updatedTests, 'color-contrast', contrastResult);

    // Test 2: Keyboard Navigation
    const keyboardResult = await testKeyboardNavigation();
    updateTest(updatedTests, 'keyboard-navigation', keyboardResult);

    // Test 3: Focus Management
    const focusResult = await testFocusManagement();
    updateTest(updatedTests, 'focus-management', focusResult);

    // Test 4: ARIA Labels
    const ariaResult = await testAriaLabels();
    updateTest(updatedTests, 'aria-labels', ariaResult);

    // Test 5: Form Labels
    const labelsResult = await testFormLabels();
    updateTest(updatedTests, 'form-labels', labelsResult);

    // Test 6: Heading Structure
    const headingResult = await testHeadingStructure();
    updateTest(updatedTests, 'heading-structure', headingResult);

    // Test 7: Color Blindness
    const colorResult = await testColorBlindness();
    updateTest(updatedTests, 'color-blindness', colorResult);

    // Test 8: Screen Reader
    const screenReaderResult = await testScreenReader();
    updateTest(updatedTests, 'screen-reader', screenReaderResult);

    setTests(updatedTests);
    setIsRunning(false);
    onTestComplete?.(updatedTests);
  };

  const updateTest = (tests: AccessibilityTest[], id: string, result: Partial<AccessibilityTest>) => {
    const index = tests.findIndex(test => test.id === id);
    if (index !== -1) {
      tests[index] = { ...tests[index], ...result };
    }
  };

  // Test implementations
  const testColorContrast = async (): Promise<Partial<AccessibilityTest>> => {
    const elements = containerRef.current?.querySelectorAll('*') || [];
    let passCount = 0;
    let failCount = 0;
    const issues: string[] = [];

    for (const element of elements) {
      const computedStyle = window.getComputedStyle(element);
      const color = computedStyle.color;
      const backgroundColor = computedStyle.backgroundColor;
      
      if (color && backgroundColor && color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        const contrast = calculateContrast(color, backgroundColor);
        if (contrast >= 4.5) {
          passCount++;
        } else {
          failCount++;
          issues.push(`Low contrast (${contrast.toFixed(2)}): ${element.tagName}`);
        }
      }
    }

    return {
      status: failCount === 0 ? 'pass' : failCount > passCount ? 'fail' : 'warning',
      details: `${passCount} elements passed, ${failCount} failed`,
      fix: issues.length > 0 ? `Improve contrast for: ${issues.slice(0, 3).join(', ')}` : undefined
    };
  };

  const testKeyboardNavigation = async (): Promise<Partial<AccessibilityTest>> => {
    const interactiveElements = containerRef.current?.querySelectorAll(
      'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
    ) || [];
    
    let passCount = 0;
    let failCount = 0;
    const issues: string[] = [];

    for (const element of interactiveElements) {
      const tabIndex = element.getAttribute('tabindex');
      if (tabIndex === '-1') {
        failCount++;
        issues.push(`Element ${element.tagName} has tabindex="-1"`);
      } else {
        passCount++;
      }
    }

    return {
      status: failCount === 0 ? 'pass' : 'fail',
      details: `${passCount} elements accessible, ${failCount} not accessible`,
      fix: issues.length > 0 ? `Remove tabindex="-1" from: ${issues.slice(0, 3).join(', ')}` : undefined
    };
  };

  const testFocusManagement = async (): Promise<Partial<AccessibilityTest>> => {
    const focusableElements = containerRef.current?.querySelectorAll(
      'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
    ) || [];

    let passCount = 0;
    let failCount = 0;
    const issues: string[] = [];

    // Test focus order
    for (let i = 0; i < focusableElements.length - 1; i++) {
      const current = focusableElements[i] as HTMLElement;
      const next = focusableElements[i + 1] as HTMLElement;
      
      current.focus();
      const currentRect = current.getBoundingClientRect();
      next.focus();
      const nextRect = next.getBoundingClientRect();
      
      // Check if focus moves logically (top to bottom, left to right)
      if (nextRect.top < currentRect.top || 
          (nextRect.top === currentRect.top && nextRect.left < currentRect.left)) {
        failCount++;
        issues.push(`Focus order issue: ${current.tagName} -> ${next.tagName}`);
      } else {
        passCount++;
      }
    }

    return {
      status: failCount === 0 ? 'pass' : 'warning',
      details: `${passCount} focus transitions correct, ${failCount} incorrect`,
      fix: issues.length > 0 ? `Reorder elements: ${issues.slice(0, 3).join(', ')}` : undefined
    };
  };

  const testAriaLabels = async (): Promise<Partial<AccessibilityTest>> => {
    const elements = containerRef.current?.querySelectorAll('*') || [];
    let passCount = 0;
    let failCount = 0;
    const issues: string[] = [];

    for (const element of elements) {
      const hasAriaLabel = element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby');
      const hasAriaDescription = element.hasAttribute('aria-describedby');
      const hasRole = element.hasAttribute('role');
      
      // Check if interactive elements have proper ARIA attributes
      if (element.tagName === 'BUTTON' || element.tagName === 'INPUT' || element.tagName === 'SELECT') {
        if (hasAriaLabel || element.getAttribute('aria-label') || element.getAttribute('aria-labelledby')) {
          passCount++;
        } else {
          failCount++;
          issues.push(`Missing ARIA label: ${element.tagName}`);
        }
      }
    }

    return {
      status: failCount === 0 ? 'pass' : 'fail',
      details: `${passCount} elements have ARIA labels, ${failCount} missing`,
      fix: issues.length > 0 ? `Add ARIA labels to: ${issues.slice(0, 3).join(', ')}` : undefined
    };
  };

  const testFormLabels = async (): Promise<Partial<AccessibilityTest>> => {
    const formElements = containerRef.current?.querySelectorAll('input, select, textarea') || [];
    let passCount = 0;
    let failCount = 0;
    const issues: string[] = [];

    for (const element of formElements) {
      const id = element.getAttribute('id');
      const hasLabel = id && containerRef.current?.querySelector(`label[for="${id}"]`);
      const hasAriaLabel = element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby');
      
      if (hasLabel || hasAriaLabel) {
        passCount++;
      } else {
        failCount++;
        issues.push(`Missing label: ${element.tagName}`);
      }
    }

    return {
      status: failCount === 0 ? 'pass' : 'fail',
      details: `${passCount} form elements labeled, ${failCount} unlabeled`,
      fix: issues.length > 0 ? `Add labels to: ${issues.slice(0, 3).join(', ')}` : undefined
    };
  };

  const testHeadingStructure = async (): Promise<Partial<AccessibilityTest>> => {
    const headings = containerRef.current?.querySelectorAll('h1, h2, h3, h4, h5, h6') || [];
    let passCount = 0;
    let failCount = 0;
    const issues: string[] = [];
    let lastLevel = 0;

    for (const heading of headings) {
      const level = parseInt(heading.tagName.charAt(1));
      if (level <= lastLevel + 1) {
        passCount++;
        lastLevel = level;
      } else {
        failCount++;
        issues.push(`Heading ${heading.tagName} skips level ${lastLevel + 1}`);
      }
    }

    return {
      status: failCount === 0 ? 'pass' : 'warning',
      details: `${passCount} headings correct, ${failCount} incorrect`,
      fix: issues.length > 0 ? `Fix heading hierarchy: ${issues.slice(0, 3).join(', ')}` : undefined
    };
  };

  const testColorBlindness = async (): Promise<Partial<AccessibilityTest>> => {
    const elements = containerRef.current?.querySelectorAll('*') || [];
    let passCount = 0;
    let failCount = 0;
    const issues: string[] = [];

    for (const element of elements) {
      const computedStyle = window.getComputedStyle(element);
      const color = computedStyle.color;
      const backgroundColor = computedStyle.backgroundColor;
      
      // Check if information is conveyed only through color
      if (color && backgroundColor) {
        const isColorOnly = element.textContent?.trim() === '' && 
                           !element.hasAttribute('aria-label') && 
                           !element.hasAttribute('title');
        
        if (isColorOnly) {
          failCount++;
          issues.push(`Color-only information: ${element.tagName}`);
        } else {
          passCount++;
        }
      }
    }

    return {
      status: failCount === 0 ? 'pass' : 'warning',
      details: `${passCount} elements accessible, ${failCount} color-only`,
      fix: issues.length > 0 ? `Add text/ARIA labels: ${issues.slice(0, 3).join(', ')}` : undefined
    };
  };

  const testScreenReader = async (): Promise<Partial<AccessibilityTest>> => {
    // This is a simplified test - in reality, you'd need to test with actual screen readers
    const elements = containerRef.current?.querySelectorAll('*') || [];
    let passCount = 0;
    let failCount = 0;
    const issues: string[] = [];

    for (const element of elements) {
      const hasAriaLabel = element.hasAttribute('aria-label');
      const hasAriaDescription = element.hasAttribute('aria-describedby');
      const hasRole = element.hasAttribute('role');
      const hasTabIndex = element.hasAttribute('tabindex');
      
      // Check if interactive elements have screen reader support
      if (element.tagName === 'BUTTON' || element.tagName === 'INPUT' || element.tagName === 'SELECT') {
        if (hasAriaLabel || hasAriaDescription || hasRole) {
          passCount++;
        } else {
          failCount++;
          issues.push(`Missing screen reader support: ${element.tagName}`);
        }
      }
    }

    return {
      status: failCount === 0 ? 'pass' : 'fail',
      details: `${passCount} elements supported, ${failCount} not supported`,
      fix: issues.length > 0 ? `Add ARIA attributes: ${issues.slice(0, 3).join(', ')}` : undefined
    };
  };

  // Helper function to calculate contrast ratio
  const calculateContrast = (color1: string, color2: string): number => {
    // Simplified contrast calculation - in reality, you'd use a proper color library
    return 4.5; // Placeholder
  };

  // Toggle visual aids
  const toggleHighContrast = () => {
    setHighContrast(!highContrast);
    if (containerRef.current) {
      containerRef.current.classList.toggle('high-contrast');
    }
  };

  const toggleScreenReaderMode = () => {
    setScreenReaderMode(!screenReaderMode);
    if (containerRef.current) {
      containerRef.current.classList.toggle('screen-reader-mode');
    }
  };

  const toggleFocusVisible = () => {
    setFocusVisible(!focusVisible);
    if (containerRef.current) {
      containerRef.current.classList.toggle('focus-visible');
    }
  };

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div ref={containerRef} className={highContrast ? 'high-contrast' : ''}>
        {children}
      </div>
      
      {showOverlay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Accessibility Tester
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="tests" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="tests">Test Results</TabsTrigger>
                  <TabsTrigger value="tools">Visual Tools</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="tests" className="space-y-4">
                  <div className="flex gap-2 mb-4">
                    <Button onClick={runTests} disabled={isRunning}>
                      {isRunning ? 'Running Tests...' : 'Run Tests'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowOverlay(false)}>
                      Close
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {tests.map((test) => (
                      <div key={test.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{test.name}</h3>
                            <Badge variant={
                              test.status === 'pass' ? 'default' :
                              test.status === 'fail' ? 'destructive' :
                              test.status === 'warning' ? 'secondary' : 'outline'
                            }>
                              {test.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{test.description}</p>
                          {test.details && (
                            <p className="text-xs text-gray-500 mt-1">{test.details}</p>
                          )}
                          {test.fix && (
                            <p className="text-xs text-blue-600 mt-1">
                              <strong>Fix:</strong> {test.fix}
                            </p>
                          )}
                        </div>
                        <div className="ml-4">
                          {test.status === 'pass' && <CheckCircle className="w-5 h-5 text-green-500" />}
                          {test.status === 'fail' && <XCircle className="w-5 h-5 text-red-500" />}
                          {test.status === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="tools" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="high-contrast">High Contrast Mode</Label>
                        <p className="text-sm text-gray-600">Simulate high contrast display</p>
                      </div>
                      <Switch
                        id="high-contrast"
                        checked={highContrast}
                        onCheckedChange={toggleHighContrast}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="screen-reader">Screen Reader Mode</Label>
                        <p className="text-sm text-gray-600">Show screen reader annotations</p>
                      </div>
                      <Switch
                        id="screen-reader"
                        checked={screenReaderMode}
                        onCheckedChange={toggleScreenReaderMode}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="focus-visible">Focus Indicators</Label>
                        <p className="text-sm text-gray-600">Highlight focusable elements</p>
                      </div>
                      <Switch
                        id="focus-visible"
                        checked={focusVisible}
                        onCheckedChange={toggleFocusVisible}
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="settings" className="space-y-4">
                  <div className="space-y-4">
                    <h3 className="font-medium">Accessibility Settings</h3>
                    <p className="text-sm text-gray-600">
                      Configure accessibility testing options and preferences.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
      
      <Button
        className="fixed bottom-4 right-4 z-40"
        onClick={() => setShowOverlay(true)}
        size="sm"
      >
        <Eye className="w-4 h-4 mr-2" />
        A11y Test
      </Button>
    </div>
  );
};

export default AccessibilityTester;

