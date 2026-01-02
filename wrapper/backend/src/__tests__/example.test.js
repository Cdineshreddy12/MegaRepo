/**
 * Example Test File
 * 
 * This file demonstrates common testing patterns for backend code.
 * Use this as a reference when writing your own tests.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Example: Testing a utility function
function calculateTotal(items) {
  if (!Array.isArray(items)) {
    throw new Error('Items must be an array');
  }
  return items.reduce((sum, item) => sum + (item.price || 0), 0);
}

describe('calculateTotal function', () => {
  it('should calculate total of items correctly', () => {
    const items = [
      { price: 10 },
      { price: 20 },
      { price: 30 }
    ];
    
    const total = calculateTotal(items);
    expect(total).toBe(60);
  });

  it('should return 0 for empty array', () => {
    const total = calculateTotal([]);
    expect(total).toBe(0);
  });

  it('should handle items with missing price', () => {
    const items = [
      { price: 10 },
      {}, // Missing price
      { price: 20 }
    ];
    
    const total = calculateTotal(items);
    expect(total).toBe(30);
  });

  it('should throw error for invalid input', () => {
    expect(() => calculateTotal(null)).toThrow('Items must be an array');
    expect(() => calculateTotal('not an array')).toThrow('Items must be an array');
  });
});

// Example: Testing async functions
async function fetchUserData(userId) {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: userId,
        name: 'Test User',
        email: 'test@example.com'
      });
    }, 100);
  });
}

describe('fetchUserData function', () => {
  it('should fetch user data successfully', async () => {
    const user = await fetchUserData('123');
    
    expect(user).toHaveProperty('id', '123');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('email');
  });

  it('should throw error when userId is missing', async () => {
    await expect(fetchUserData(null)).rejects.toThrow('User ID is required');
    await expect(fetchUserData(undefined)).rejects.toThrow('User ID is required');
  });
});

// Example: Testing with mocks
describe('API endpoint testing pattern', () => {
  it('should demonstrate how to test API endpoints', async () => {
    // This is a pattern you would use with Fastify
    // const response = await app.inject({
    //   method: 'GET',
    //   url: '/api/users/123'
    // });
    // 
    // expect(response.statusCode).toBe(200);
    // expect(response.json()).toHaveProperty('id', '123');
    
    // For this example, we'll just verify the pattern
    expect(true).toBe(true);
  });
});

// Example: Testing error handling
function validateEmail(email) {
  if (!email) {
    throw new Error('Email is required');
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
  
  return true;
}

describe('validateEmail function', () => {
  it('should validate correct email addresses', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test.user@domain.co.uk')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(() => validateEmail('not-an-email')).toThrow('Invalid email format');
    expect(() => validateEmail('missing@domain')).toThrow('Invalid email format');
    expect(() => validateEmail('@domain.com')).toThrow('Invalid email format');
  });

  it('should reject empty or null emails', () => {
    expect(() => validateEmail(null)).toThrow('Email is required');
    expect(() => validateEmail(undefined)).toThrow('Email is required');
    expect(() => validateEmail('')).toThrow('Email is required');
  });
});



