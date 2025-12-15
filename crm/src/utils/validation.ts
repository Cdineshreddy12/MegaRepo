export const validateRequired = (value: string, fieldName: string): string | null => {
  if (!value.trim()) {
    return `${fieldName} is required`;
  }
  return null;
};

export const validateEmail = (email: string): string | null => {
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return 'Please enter a valid email address';
  }
  return null;
};

export const validatePhone = (phone: string): string | null => {
  if (!phone.match(/^\+?[\d\s-]{10,}$/)) {
    return 'Please enter a valid phone number';
  }
  return null;
};

export const validateDate = (date: string, fieldName: string): string | null => {
  if (!date) {
    return `${fieldName} is required`;
  }
  return null;
};

export const validateNumber = (value: number, min: number, max: number, fieldName: string): string | null => {
  if (value < min || value > max) {
    return `${fieldName} must be between ${min} and ${max}`;
  }
  return null;
};