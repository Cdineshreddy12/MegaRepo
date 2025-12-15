/**
 * Toast Hook Component
 */

import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export const useToast = () => {
  const addToast = (message: string, options?: ToastOptions) => {
    const { type = 'info', duration = 3000 } = options || {};
    
    switch (type) {
      case 'success':
        sonnerToast.success(message, { duration });
        break;
      case 'error':
        sonnerToast.error(message, { duration });
        break;
      case 'warning':
        sonnerToast.warning(message, { duration });
        break;
      default:
        sonnerToast.info(message, { duration });
    }
  };

  return { addToast };
};

