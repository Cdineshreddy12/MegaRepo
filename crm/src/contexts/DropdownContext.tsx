// src/contexts/DropdownContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { dropdownService } from '@/services/api/dropdownService';
import { DropdownOption } from '@/types/Dropdown.types';
import { DropdownType } from '@/types/common';

// Define types for our context
interface DropdownsState {
  [key: string]: DropdownOption[];
}

interface DropdownContextType {
  dropdowns: DropdownsState;
  isLoading: boolean;
  error: Error | null;
  getLabel: (category: DropdownType, value: string) => string;
}

// Create context with default values
const DropdownContext = createContext<DropdownContextType | null>(null);

interface DropdownProviderProps {
  children: ReactNode;
}

export const DropdownProvider: React.FC<DropdownProviderProps> = ({ children }) => {
  const [dropdowns, setDropdowns] = useState<DropdownsState>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadAllDropdowns = async () => {
      setIsLoading(true);
      try {
        // Option 1: Load all dropdowns at once if your API supports it
        const allDropdowns = await dropdownService.getOptionsGroupByCategory();
        setDropdowns(allDropdowns);
        
        // Option 2: Or load each category separately if needed
        /*
        const industries = await dropdownService.getOptionsByCategory('industries');
        const leadSources = await dropdownService.getOptionsByCategory('lead_sources');
        const leadStatus = await dropdownService.getOptionsByCategory('lead_status');
        
        setDropdowns({
          industries,
          lead_sources: leadSources,
          lead_status: leadStatus,
        });
        */
        
        setError(null);
      } catch (err) {
        console.error('Error loading dropdowns:', err);
        setError(err instanceof Error ? err : new Error('Unknown error loading dropdowns'));
      } finally {
        setIsLoading(false);
      }
    };

    loadAllDropdowns();
  }, []);

  // Utility function to get label from value
  const getLabel = (category: DropdownType, value: string): string => {
    if (!value || !dropdowns[category]) return value;
    
    const option = dropdowns[category]?.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  return (
    <DropdownContext.Provider 
      value={{ 
        dropdowns, 
        isLoading, 
        error, 
        getLabel 
      }}
    >
      {children}
    </DropdownContext.Provider>
  );
};

// Custom hook to use the dropdown context
export const useDropdowns = () => {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error('useDropdowns must be used within a DropdownProvider');
  }
  return context;
};

// Utility hook for a specific category
export const useDropdownCategory = (category: DropdownType) => {
  const { dropdowns, isLoading, error } = useDropdowns();
  return {
    options: dropdowns[category] || [],
    isLoading,
    error
  };
};

// Utility hook to get label for a value
export const useDropdownLabel = (category: DropdownType, value?: string) => {
  const { getLabel, isLoading } = useDropdowns();
  return {
    label: value ? getLabel(category, value) : '',
    isLoading
  };
};