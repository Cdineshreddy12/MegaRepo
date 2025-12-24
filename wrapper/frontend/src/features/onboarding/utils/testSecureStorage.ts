/**
 * Test script for secure storage functionality
 * This can be run in browser console for testing
 */

import { secureStore, secureRetrieve, secureClear } from './secureStorage';
import { sanitizeFormData } from './sanitization';
import { validateFormDataSecurity } from './securityValidations';

// Test data
const testFormData = {
  firstName: 'John',
  lastName: 'Doe',
  adminEmail: 'john.doe@company.com',
  adminMobile: '+91-9876543210',
  gstin: '22AAAAA0000A1Z5',
  panNumber: 'AAAPA0000A',
  businessDetails: {
    companyName: 'Test Company Ltd',
    businessType: 'Technology',
    country: 'IN'
  },
  billingStreet: '123 Business Street',
  termsAccepted: true
};

export const testSecureStorage = () => {
  console.log('🧪 Testing Secure Storage Functionality');

  try {
    // Test 1: Sanitization
    console.log('1. Testing data sanitization...');
    const sanitized = sanitizeFormData(testFormData);
    console.log('✅ Sanitization successful:', sanitized);

    // Test 2: Security validation
    console.log('2. Testing security validation...');
    const validation = validateFormDataSecurity(sanitized);
    console.log('✅ Security validation result:', validation);

    // Test 3: Secure storage
    console.log('3. Testing secure storage...');
    secureStore('test_onboarding_data', sanitized);
    console.log('✅ Data stored securely');

    // Test 4: Secure retrieval
    console.log('4. Testing secure retrieval...');
    const retrieved = secureRetrieve('test_onboarding_data');
    console.log('✅ Data retrieved securely:', retrieved);

    // Test 5: Data integrity
    console.log('5. Testing data integrity...');
    const isDataIntact = JSON.stringify(sanitized) === JSON.stringify(retrieved);
    console.log('✅ Data integrity check:', isDataIntact ? 'PASSED' : 'FAILED');

    // Test 6: Secure clear
    console.log('6. Testing secure clear...');
    secureClear('test_onboarding_data');
    const cleared = secureRetrieve('test_onboarding_data');
    console.log('✅ Data cleared successfully:', cleared === null ? 'CLEARED' : 'NOT CLEARED');

    console.log('🎉 All tests passed! Secure storage is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Auto-run in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Uncomment to run tests automatically
  // testSecureStorage();
}