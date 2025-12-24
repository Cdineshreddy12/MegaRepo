/**
 * OPTIMIZED Form Persistence Hook
 * Reduced auto-save frequency and improved performance with secure storage
 */

import { useEffect, useCallback, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { onboardingAPIOptimized } from '@/lib/apiOptimized';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { secureStore, secureRetrieve, secureClear } from '../utils/secureStorage';

const STORAGE_KEY_PREFIX = 'onboarding_progress_';
const STORAGE_KEY_FORM_DATA = 'onboarding_form_data';

export interface UseFormPersistenceOptions {
  form: UseFormReturn<any>;
  flowType: string;
  currentStep: number;
  autoSave?: boolean;
  autoRestore?: boolean;
  clearOnSubmit?: boolean;
}

export const useFormPersistenceOptimized = ({
  form,
  flowType,
  currentStep,
  autoSave = true,
  autoRestore = true,
}: UseFormPersistenceOptions) => {
  const { user } = useKindeAuth();
  const hasRestoredRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // OPTIMIZED: Save form data with reduced frequency and secure storage
  const saveFormData = useCallback(async () => {
    try {
      // Get ALL form values including empty strings and nested objects
      const rawFormData = form.getValues();

      // Deep clone to preserve all data including empty strings and null values
      const deepClone = (obj: any): any => {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (Array.isArray(obj)) return obj.map(deepClone);
        
        const cloned: any = {};
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            cloned[key] = deepClone(obj[key]);
          }
        }
        return cloned;
      };

      // Clone form data to preserve all values including empty strings and null
      const clonedFormData = deepClone(rawFormData);

      // IMPORTANT: Save raw form data directly to preserve ALL fields including empty strings
      // Sanitization will be done on submission, not during persistence
      // This ensures all fields are restored correctly
      const dataToStore = clonedFormData;

      // Save to secure localStorage for immediate access
      const storageKey = `${STORAGE_KEY_PREFIX}${flowType}`;
      const progressData = {
        currentStep,
        formData: dataToStore, // Store raw data to preserve all fields
        flowType,
        lastSaved: new Date().toISOString(),
      };

      secureStore(storageKey, progressData);
      secureStore(STORAGE_KEY_FORM_DATA, dataToStore);

      // OPTIMIZED: Save to backend using new onboarding_form_data table
      // This works even when user doesn't exist in database yet
      if (user?.email) {
        const lastBackendSave = localStorage.getItem(`${storageKey}_backend_save`);
        const now = Date.now();
        const timeSinceLastSave = lastBackendSave ? now - parseInt(lastBackendSave) : Infinity;

        // Save to backend every 30 seconds (reduced from 60s for better persistence)
        // Always save form data to backend for persistence across devices
        if (timeSinceLastSave > 30000) {
          try {
            const response = await onboardingAPIOptimized.updateStep(
              `step_${currentStep}`,
              { 
                step: currentStep, 
                completedAt: new Date().toISOString(),
                flowType: flowType
              },
              user.email,
              dataToStore // Send complete form data to backend for persistence
            );
            
            // Mark as successful if backend saved successfully
            if (response?.data?.success) {
              localStorage.setItem(`${storageKey}_backend_save`, now.toString());
              console.log('✅ Form data saved to backend:', response.data);
            }
          } catch (error: any) {
            // Log error but don't break the onboarding flow
            console.warn('Backend form data save failed, continuing with local storage:', error?.message || 'Unknown error');
            // Still continue - local storage is the primary persistence mechanism
          }
        }
      }
    } catch (error) {
      // Silent error handling to avoid performance impact
    }
  }, [form, flowType, currentStep, user]);

  // Restore form data from secure localStorage first (faster)
  const restoreFormData = useCallback(async () => {
    if (hasRestoredRef.current) return 1;
    hasRestoredRef.current = true;

    try {
      let restoredData: any = null;
      let restoredStep = 1;

      // Try secure localStorage first (much faster than API call)
      const storageKey = `${STORAGE_KEY_PREFIX}${flowType}`;
      const savedProgress = secureRetrieve(storageKey);

      if (savedProgress) {
        try {
          restoredData = savedProgress.formData;
          restoredStep = savedProgress.currentStep || 1;
        } catch (error) {
          console.warn('Failed to parse restored progress data:', error);
          // Try generic secure form data as fallback
          const savedFormData = secureRetrieve(STORAGE_KEY_FORM_DATA);
          if (savedFormData) {
            restoredData = savedFormData;
          }
        }
      }

      // Also try to restore from backend (new onboarding_form_data table)
      // This ensures data persists even if localStorage is cleared
      if (user?.email) {
        try {
          const backendResponse = await onboardingAPIOptimized.getDataByEmail(user.email, user.id);
          
          if (backendResponse?.data?.success && backendResponse?.data?.data?.savedFormData) {
            const backendFormData = backendResponse.data.data.savedFormData;
            const backendStep = backendResponse.data.data.onboardingStep;
            
            // Use backend data if it's more complete or if local storage is empty
            if (!restoredData || Object.keys(backendFormData).length > Object.keys(restoredData).length) {
              restoredData = backendFormData;
              if (backendStep) {
                const stepNumber = parseInt(backendStep.replace('step_', '')) || 1;
                restoredStep = stepNumber;
              }
              console.log('✅ Restored form data from backend table');
              
              // Also update local storage with backend data for faster future access
              secureStore(storageKey, {
                currentStep: restoredStep,
                formData: backendFormData,
                flowType: flowType,
                lastSaved: new Date().toISOString(),
              });
            }
          }
        } catch (error) {
          console.warn('Failed to restore from backend, using local storage:', error);
        }
      }

      // Restore form data if found
      if (restoredData) {
        form.reset();

        // OPTIMIZED: Batch all setValue calls - handle nested objects properly
        // Restore ALL fields including empty strings and null values
        const setFormValue = (key: string, val: any, parentKey?: string) => {
          const fullKey = parentKey ? `${parentKey}.${key}` : key;
          
          try {
            // Handle nested objects (e.g., businessDetails)
            if (val !== null && typeof val === 'object' && !Array.isArray(val) && val.constructor === Object) {
              // For nested objects, recursively set each property
              Object.keys(val).forEach((nestedKey) => {
                setFormValue(nestedKey, val[nestedKey], fullKey);
              });
            } else {
              // For primitive values, arrays, null, undefined, and empty strings
              // Restore ALL values including empty strings and null
              form.setValue(fullKey as any, val === undefined ? '' : val, { 
                shouldValidate: false, 
                shouldDirty: false, 
                shouldTouch: false 
              });
            }
          } catch (error) {
            // Log but continue - some fields might not exist in schema
            console.debug(`Skipping field ${fullKey} during restore:`, error);
          }
        };

        // Restore all fields - use setTimeout to ensure form is ready
        setTimeout(() => {
          Object.keys(restoredData).forEach((key) => {
            setFormValue(key, restoredData[key]);
          });
        }, 0);

        return restoredStep;
      }
    } catch (error) {
      // Silent error handling
    }

    return 1;
  }, [form, flowType]);

  // Clear saved form data securely
  const clearFormData = useCallback(() => {
    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${flowType}`;
      secureClear(storageKey);
      secureClear(STORAGE_KEY_FORM_DATA);
      localStorage.removeItem(`${storageKey}_backend_save`);

      if (user?.email) {
        onboardingAPIOptimized.updateStep('step_1', {}, user.email, {}).catch(() => {});
      }
    } catch (error) {
      // Silent error handling
    }
  }, [flowType, user]);

  // OPTIMIZED: Auto-save with longer debounce (2 seconds instead of 1)
  useEffect(() => {
    if (!autoSave) return;

    const subscription = form.watch((_value, { name, type }) => {
      if (type === 'change' && name) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
          saveFormData();
        }, 2000); // Increased from 1000ms to 2000ms
      }
    });

    return () => {
      subscription.unsubscribe();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentStep, autoSave, saveFormData, form]);

  // Auto-restore on mount
  useEffect(() => {
    if (autoRestore && !hasRestoredRef.current) {
      restoreFormData().then((restoredStep) => {
        if (restoredStep !== currentStep && restoredStep > 1) {
          window.dispatchEvent(new CustomEvent('onboarding-step-restored', {
            detail: { step: restoredStep }
          }));
        }
      });
    }
  }, []); // Only run on mount

  return {
    saveFormData,
    restoreFormData,
    clearFormData,
    hasPersistedData: !!secureRetrieve(`${STORAGE_KEY_PREFIX}${flowType}`) ||
                      !!secureRetrieve(STORAGE_KEY_FORM_DATA),
  };
};