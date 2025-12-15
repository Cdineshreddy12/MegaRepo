import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AccessibilityTesterProps {
  formElement?: HTMLElement;
}

export const SimpleAccessibilityTester: React.FC<AccessibilityTesterProps> = ({
  formElement
}) => {
  const [score, setScore] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    
    const element = formElement || document.querySelector('[data-form-container]');
    if (!element) {
      setScore(0);
      setIsRunning(false);
      return;
    }

    let passedTests = 0;
    const totalTests = 3;

    // Test 1: Form labels
    const inputs = element.querySelectorAll('input, select, textarea');
    let labeledInputs = 0;
    inputs.forEach(input => {
      const id = input.getAttribute('id');
      const ariaLabel = input.getAttribute('aria-label');
      const label = id ? element.querySelector(`label[for="${id}"]`) : null;
      if (label || ariaLabel) labeledInputs++;
    });
    if (labeledInputs > 0) passedTests++;

    // Test 2: Focus indicators
    const focusableElements = element.querySelectorAll('input, button, select, textarea');
    let hasFocusIndicator = 0;
    focusableElements.forEach(el => {
      const styles = window.getComputedStyle(el as Element);
      if (styles.outline !== 'none' || styles.boxShadow !== 'none') {
        hasFocusIndicator++;
      }
    });
    if (hasFocusIndicator > 0) passedTests++;

    // Test 3: ARIA attributes
    const elementsWithAria = element.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby]');
    if (elementsWithAria.length > 0) passedTests++;

    setScore(Math.round((passedTests / totalTests) * 100));
    setIsRunning(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Button onClick={runTests} disabled={isRunning} size="sm" variant="outline">
        {isRunning ? 'Testing...' : 'Test A11y'}
      </Button>
      <Badge variant={score >= 80 ? 'default' : 'destructive'}>
        {score}%
      </Badge>
    </div>
  );
};

