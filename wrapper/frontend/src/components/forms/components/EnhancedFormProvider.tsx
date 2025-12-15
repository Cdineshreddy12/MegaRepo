import React, { useMemo } from 'react';
import { FormProvider, FormContextValue } from '../contexts/FormContext';

interface EnhancedFormProviderProps {
  children: React.ReactNode;
  contextValue: FormContextValue;
}

/**
 * Enhanced form provider that wraps the context
 */
export const EnhancedFormProvider: React.FC<EnhancedFormProviderProps> = ({
  children,
  contextValue
}) => {
  return (
    <FormProvider value={contextValue}>
      {children}
    </FormProvider>
  );
};
