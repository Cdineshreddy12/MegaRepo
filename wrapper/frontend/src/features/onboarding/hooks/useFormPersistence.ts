/**
 * Form Persistence Hook
 * Saves and restores onboarding form progress
 */

import { useEffect, useCallback, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { onboardingAPI } from '@/lib/api';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';

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

export const useFormPersistence = ({
  form,
  flowType,
  currentStep,
  autoSave = true,
  autoRestore = true,
  clearOnSubmit = true,
}: UseFormPersistenceOptions) => {
  const { user } = useKindeAuth();
  const hasRestoredRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Save form data to localStorage and backend
  const saveFormData = useCallback(async () => {
    try {
      const formData = form.getValues();
      
      // Save to localStorage for immediate access
      const storageKey = `${STORAGE_KEY_PREFIX}${flowType}`;
      const progressData = {
        currentStep,
        formData,
        flowType,
        lastSaved: new Date().toISOString(),
      };
      
      localStorage.setItem(storageKey, JSON.stringify(progressData));
      localStorage.setItem(STORAGE_KEY_FORM_DATA, JSON.stringify(formData));

      // Save to backend if user is authenticated
      if (user?.email) {
        try {
          await onboardingAPI.updateStep(
            `step_${currentStep}`,
            { step: currentStep, formData },
            user.email,
            formData
          );
        } catch (error) {
          console.warn('Failed to save progress to backend:', error);
          // Continue with localStorage save even if backend fails
        }
      }
    } catch (error) {
      console.error('Error saving form data:', error);
    }
  }, [form, flowType, currentStep, user]);

  // Restore form data from localStorage and backend
  const restoreFormData = useCallback(async () => {
    if (hasRestoredRef.current) return; // Only restore once
    hasRestoredRef.current = true;

    try {
      let restoredData: any = null;
      let restoredStep = 1;

      // Try to restore from backend first (if authenticated)
      if (user?.email) {
        try {
          const response = await onboardingAPI.getDataByEmail(user.email);
          if (response?.data?.onboardingData) {
            const onboardingData = response.data.onboardingData;
            restoredStep = onboardingData.currentStep 
              ? parseInt(onboardingData.currentStep.replace('step_', '')) || 1
              : 1;
            
            if (onboardingData.formData) {
              restoredData = onboardingData.formData;
            } else if (onboardingData.stepData) {
              // Merge step data if formData is not available
              restoredData = {};
              Object.values(onboardingData.stepData).forEach((stepData: any) => {
                Object.assign(restoredData, stepData);
              });
            }
          }
        } catch (error) {
          console.warn('Failed to restore from backend, trying localStorage:', error);
        }
      }

      // Fallback to localStorage if backend restore failed or user not authenticated
      if (!restoredData) {
        const storageKey = `${STORAGE_KEY_PREFIX}${flowType}`;
        const savedProgress = localStorage.getItem(storageKey);
        
        if (savedProgress) {
          try {
            const progressData = JSON.parse(savedProgress);
            restoredData = progressData.formData;
            restoredStep = progressData.currentStep || 1;
          } catch (error) {
            console.error('Error parsing saved progress:', error);
          }
        } else {
          // Try generic form data storage
          const savedFormData = localStorage.getItem(STORAGE_KEY_FORM_DATA);
          if (savedFormData) {
            try {
              restoredData = JSON.parse(savedFormData);
            } catch (error) {
              console.error('Error parsing saved form data:', error);
            }
          }
        }
      }

      // Restore form data if found
      if (restoredData) {
        // Reset form first to clear any default values
        form.reset();
        
        // Batch all setValue calls to prevent multiple re-renders
        // Collect all updates first
        const updates: Array<{ key: string; value: any }> = [];
        
        Object.keys(restoredData).forEach((key) => {
          const value = restoredData[key];
          if (value !== null && value !== undefined && value !== '') {
            updates.push({ key, value });
          }
        });
        
        // Apply all updates in a single batch using setTimeout to batch React updates
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            updates.forEach(({ key, value }) => {
              try {
                form.setValue(key as any, value, { shouldValidate: false, shouldDirty: false, shouldTouch: false });
              } catch (error) {
                // Ignore errors for fields that don't exist in current schema
                console.debug(`Skipping field ${key} during restore:`, error);
              }
            });
            resolve();
          }, 0);
        });

        // Return restored step for parent component to use
        return restoredStep;
      }
    } catch (error) {
      console.error('Error restoring form data:', error);
    }

    return 1; // Default to step 1 if no saved data
  }, [form, flowType, user]);

  // Clear saved form data
  const clearFormData = useCallback(() => {
    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${flowType}`;
      localStorage.removeItem(storageKey);
      localStorage.removeItem(STORAGE_KEY_FORM_DATA);
      
      // Clear backend data if authenticated
      if (user?.email) {
        onboardingAPI.updateStep('step_1', {}, user.email, {}).catch(console.error);
      }
    } catch (error) {
      console.error('Error clearing form data:', error);
    }
  }, [flowType, user]);

  // Auto-save on step change or form data change
  // Use subscription pattern instead of form.watch() to prevent infinite re-renders
  useEffect(() => {
    if (!autoSave) return;

    // Subscribe to form changes with a subscription pattern
    const subscription = form.watch((value, { name, type }) => {
      // Only save when actual field values change, not on every render
      if (type === 'change' && name) {
        // Debounce saves to avoid excessive API calls
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
          saveFormData();
        }, 1000); // Save 1 second after last change
      }
    });

    return () => {
      subscription.unsubscribe();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentStep, autoSave, saveFormData, form]);

  // Auto-restore on mount - only run once
  useEffect(() => {
    if (autoRestore && !hasRestoredRef.current) {
      restoreFormData().then((restoredStep) => {
        // If step was restored and different from current, notify parent
        if (restoredStep !== currentStep && restoredStep > 1) {
          // Dispatch custom event for step restoration
          window.dispatchEvent(new CustomEvent('onboarding-step-restored', { 
            detail: { step: restoredStep } 
          }));
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - remove currentStep dependency to prevent loops

  return {
    saveFormData,
    restoreFormData,
    clearFormData,
    hasPersistedData: !!localStorage.getItem(`${STORAGE_KEY_PREFIX}${flowType}`) || 
                      !!localStorage.getItem(STORAGE_KEY_FORM_DATA),
  };
};
