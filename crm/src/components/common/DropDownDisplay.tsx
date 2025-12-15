// src/components/common/DropDownDisplay.tsx
import React, { useEffect, useState } from 'react';
import { dropdownService } from '@/services/api/dropdownService';
import { DropdownOption } from '@/types/Dropdown.types';
import { DropdownType } from '@/types/common';

interface DropdownDisplayProps {
  category: DropdownType;
  value?: string;
  fallback?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  [key: string]: any; // For additional props
}

/**
 * Standalone dropdown display component that doesn't require a context
 * Makes its own API call to fetch dropdown options
 */
const DropdownDisplay: React.FC<DropdownDisplayProps> = ({ 
  category, 
  value = '', 
  fallback, 
  className = "", 
  style = {}, 
  ...props 
}) => {
  const [label, setLabel] = useState<string | React.ReactNode>(value);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  useEffect(() => {
    // If no value provided, nothing to look up
    if (!value) {
      return;
    }
    
    setIsLoading(true);
    
    const fetchLabel = async () => {
      try {
        const options = await dropdownService.getOptionsByCategory(category);
        const option = options.find(opt => opt.value === value);
        if (option) {
          setLabel(option.label);
        } else {
          // If not found, use fallback or value
          setLabel(fallback || value);
        }
      } catch (error) {
        console.error(`Error fetching ${category} options:`, error);
        // On error, use fallback or value
        setLabel(fallback || value);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLabel();
  }, [category, value, fallback]);
  
  // If loading, show a loading indicator
  if (isLoading) {
    return <span className={`text-gray-400 ${className}`} style={style} {...props}>Loading...</span>;
  }
  
  // Display the label, fallback to the provided fallback or the value itself
  return (
    <span className={className} style={style} {...props}>
      {label}
    </span>
  );
};

export default DropdownDisplay;