import React, { createContext, useContext, useState, ReactNode } from 'react';
import ZopkitLoader from '@/components/ui/ZopkitLoader';

interface LoadingContextType {
  isLoading: boolean;
  loadingMessage: string;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  setLoadingMessage: (message: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('LOADING');

  const showLoading = (message: string = 'LOADING') => {
    setLoadingMessage(message);
    setIsLoading(true);
  };

  const hideLoading = () => {
    setIsLoading(false);
  };

  const setLoadingMessageHandler = (message: string) => {
    setLoadingMessage(message);
  };

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        loadingMessage,
        showLoading,
        hideLoading,
        setLoadingMessage: setLoadingMessageHandler,
      }}
    >
      {children}
      {isLoading && <ZopkitLoader message={loadingMessage} />}
    </LoadingContext.Provider>
  );
};
