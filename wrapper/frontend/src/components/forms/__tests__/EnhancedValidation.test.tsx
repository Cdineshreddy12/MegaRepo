import './test-setup';
import { EnhancedValidation, ValidationPatterns } from '../validation/EnhancedValidation';
import type { FormField } from '../types';

describe('EnhancedValidation', () => {
  describe('createFieldSchema', () => {
    it('should create email validation schema', () => {
      const field: FormField = {
        id: 'email',
        label: 'Email',
        type: 'email',
        required: true
      };

      const schema = EnhancedValidation.createFieldSchema(field);
      const result = schema.safeParse('invalid-email');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid email address');
      }
    });

    it('should create password validation schema', () => {
      const field: FormField = {
        id: 'password',
        label: 'Password',
        type: 'password',
        required: true
      };

      const schema = EnhancedValidation.createFieldSchema(field);
      const result = schema.safeParse('123');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Password must be at least 8 characters');
      }
    });

    it('should create URL validation schema', () => {
      const field: FormField = {
        id: 'website',
        label: 'Website',
        type: 'url',
        required: true
      };

      const schema = EnhancedValidation.createFieldSchema(field);
      const result = schema.safeParse('invalid-url');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid URL');
      }
    });

    it('should create number validation schema with min/max', () => {
      const field: FormField = {
        id: 'age',
        label: 'Age',
        type: 'number',
        required: true,
        min: 18,
        max: 100
      };

      const schema = EnhancedValidation.createFieldSchema(field);
      const result = schema.safeParse(15);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('18');
      }
    });

    it('should create optional field schema', () => {
      const field: FormField = {
        id: 'bio',
        label: 'Bio',
        type: 'textarea',
        required: false
      };

      const schema = EnhancedValidation.createFieldSchema(field);
      const result = schema.safeParse(undefined);
      
      expect(result.success).toBe(true);
    });
  });

  describe('createStepSchema', () => {
    it('should create step schema with multiple fields', () => {
      const fields: FormField[] = [
        {
          id: 'firstName',
          label: 'First Name',
          type: 'text',
          required: true
        },
        {
          id: 'lastName',
          label: 'Last Name',
          type: 'text',
          required: true
        },
        {
          id: 'email',
          label: 'Email',
          type: 'email',
          required: true
        }
      ];

      const schema = EnhancedValidation.createStepSchema(fields);
      const result = schema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      });

      expect(result.success).toBe(true);
    });

    it('should validate step with invalid data', () => {
      const fields: FormField[] = [
        {
          id: 'email',
          label: 'Email',
          type: 'email',
          required: true
        }
      ];

      const schema = EnhancedValidation.createStepSchema(fields);
      const result = schema.safeParse({
        email: 'invalid-email'
      });

      expect(result.success).toBe(false);
    });
  });

  describe('validateStep', () => {
    it('should validate step successfully', async () => {
      const fields: FormField[] = [
        {
          id: 'email',
          label: 'Email',
          type: 'email',
          required: true
        }
      ];

      const result = await EnhancedValidation.validateStep(
        { email: 'john@example.com' },
        fields
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should return validation errors', async () => {
      const fields: FormField[] = [
        {
          id: 'email',
          label: 'Email',
          type: 'email',
          required: true
        }
      ];

      const result = await EnhancedValidation.validateStep(
        { email: 'invalid-email' },
        fields
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBeDefined();
    });
  });

  describe('validateField', () => {
    it('should validate individual field successfully', async () => {
      const field: FormField = {
        id: 'email',
        label: 'Email',
        type: 'email',
        required: true
      };

      const result = await EnhancedValidation.validateField(
        field,
        'john@example.com',
        {}
      );

      expect(result.isValid).toBe(true);
    });

    it('should return field validation error', async () => {
      const field: FormField = {
        id: 'email',
        label: 'Email',
        type: 'email',
        required: true
      };

      const result = await EnhancedValidation.validateField(
        field,
        'invalid-email',
        {}
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe('ValidationPatterns', () => {
  it('should validate email pattern', () => {
    const result = ValidationPatterns.email.safeParse('test@example.com');
    expect(result.success).toBe(true);
  });

  it('should reject invalid email pattern', () => {
    const result = ValidationPatterns.email.safeParse('invalid-email');
    expect(result.success).toBe(false);
  });

  it('should validate password pattern', () => {
    const result = ValidationPatterns.password.safeParse('Password123');
    expect(result.success).toBe(true);
  });

  it('should reject weak password', () => {
    const result = ValidationPatterns.password.safeParse('123');
    expect(result.success).toBe(false);
  });

  it('should validate phone pattern', () => {
    const result = ValidationPatterns.phone.safeParse('+1234567890');
    expect(result.success).toBe(true);
  });

  it('should validate URL pattern', () => {
    const result = ValidationPatterns.url.safeParse('https://example.com');
    expect(result.success).toBe(true);
  });

  it('should validate ZIP code pattern', () => {
    const result = ValidationPatterns.zipCode.safeParse('12345');
    expect(result.success).toBe(true);
  });

  it('should validate extended ZIP code pattern', () => {
    const result = ValidationPatterns.zipCode.safeParse('12345-6789');
    expect(result.success).toBe(true);
  });

  it('should validate color pattern', () => {
    const result = ValidationPatterns.color.safeParse('#FF0000');
    expect(result.success).toBe(true);
  });

  it('should validate alphanumeric pattern', () => {
    const result = ValidationPatterns.alphanumeric.safeParse('abc123');
    expect(result.success).toBe(true);
  });

  it('should reject alphanumeric with special characters', () => {
    const result = ValidationPatterns.alphanumeric.safeParse('abc123!');
    expect(result.success).toBe(false);
  });

  it('should validate no spaces pattern', () => {
    const result = ValidationPatterns.noSpaces.safeParse('abc123');
    expect(result.success).toBe(true);
  });

  it('should reject no spaces with spaces', () => {
    const result = ValidationPatterns.noSpaces.safeParse('abc 123');
    expect(result.success).toBe(false);
  });

  it('should validate min length pattern', () => {
    const pattern = ValidationPatterns.minLength(5);
    const result = pattern.safeParse('hello');
    expect(result.success).toBe(true);
  });

  it('should reject min length pattern', () => {
    const pattern = ValidationPatterns.minLength(5);
    const result = pattern.safeParse('hi');
    expect(result.success).toBe(false);
  });

  it('should validate max length pattern', () => {
    const pattern = ValidationPatterns.maxLength(5);
    const result = pattern.safeParse('hello');
    expect(result.success).toBe(true);
  });

  it('should reject max length pattern', () => {
    const pattern = ValidationPatterns.maxLength(5);
    const result = pattern.safeParse('hello world');
    expect(result.success).toBe(false);
  });

  it('should validate range pattern', () => {
    const pattern = ValidationPatterns.range(1, 10);
    const result = pattern.safeParse(5);
    expect(result.success).toBe(true);
  });

  it('should reject range pattern', () => {
    const pattern = ValidationPatterns.range(1, 10);
    const result = pattern.safeParse(15);
    expect(result.success).toBe(false);
  });

  it('should validate positive pattern', () => {
    const result = ValidationPatterns.positive.safeParse(5);
    expect(result.success).toBe(true);
  });

  it('should reject positive pattern', () => {
    const result = ValidationPatterns.positive.safeParse(-5);
    expect(result.success).toBe(false);
  });

  it('should validate negative pattern', () => {
    const result = ValidationPatterns.negative.safeParse(-5);
    expect(result.success).toBe(true);
  });

  it('should reject negative pattern', () => {
    const result = ValidationPatterns.negative.safeParse(5);
    expect(result.success).toBe(false);
  });

  it('should validate integer pattern', () => {
    const result = ValidationPatterns.integer.safeParse(5);
    expect(result.success).toBe(true);
  });

  it('should reject integer pattern', () => {
    const result = ValidationPatterns.integer.safeParse(5.5);
    expect(result.success).toBe(false);
  });

  it('should validate decimal pattern', () => {
    const result = ValidationPatterns.decimal.safeParse(5.50);
    expect(result.success).toBe(true);
  });

  it('should reject decimal pattern', () => {
    const result = ValidationPatterns.decimal.safeParse(5.555);
    expect(result.success).toBe(false);
  });
});

// Run tests if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  const { runTests } = require('./test-setup');
  runTests();
}

