import { User, Role } from '@/types/user-management';

/**
 * Validation Service for User Management
 * 
 * Provides comprehensive validation for user data and operations
 */
export class ValidationService {
  /**
   * Validate email format
   */
  static validateEmail(email: string): { isValid: boolean; error?: string } {
    if (!email) {
      return { isValid: false, error: 'Email is required' };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'Invalid email format' };
    }
    
    return { isValid: true };
  }
  
  /**
   * Validate user name
   */
  static validateName(name: string): { isValid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
      return { isValid: false, error: 'Name is required' };
    }
    
    if (name.trim().length < 2) {
      return { isValid: false, error: 'Name must be at least 2 characters long' };
    }
    
    if (name.trim().length > 100) {
      return { isValid: false, error: 'Name must be less than 100 characters' };
    }
    
    return { isValid: true };
  }
  
  /**
   * Validate user form data
   */
  static validateUserForm(formData: {
    name: string;
    email: string;
    title?: string;
    department?: string;
  }): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    
    // Validate name
    const nameValidation = this.validateName(formData.name);
    if (!nameValidation.isValid) {
      errors.name = nameValidation.error!;
    }
    
    // Validate email
    const emailValidation = this.validateEmail(formData.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error!;
    }
    
    // Validate title (optional)
    if (formData.title && formData.title.length > 100) {
      errors.title = 'Title must be less than 100 characters';
    }
    
    // Validate department (optional)
    if (formData.department && formData.department.length > 100) {
      errors.department = 'Department must be less than 100 characters';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
  
  /**
   * Validate invite form data
   */
  static validateInviteForm(formData: {
    email: string;
    name: string;
    roleIds: string[];
    message?: string;
  }): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    
    // Validate name
    const nameValidation = this.validateName(formData.name);
    if (!nameValidation.isValid) {
      errors.name = nameValidation.error!;
    }
    
    // Validate email
    const emailValidation = this.validateEmail(formData.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error!;
    }
    
    // Validate roles
    if (!formData.roleIds || formData.roleIds.length === 0) {
      errors.roleIds = 'At least one role must be selected';
    }
    
    // Validate message (optional)
    if (formData.message && formData.message.length > 500) {
      errors.message = 'Message must be less than 500 characters';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
  
  /**
   * Validate role assignment
   */
  static validateRoleAssignment(roleIds: string[]): { isValid: boolean; error?: string } {
    if (!roleIds || roleIds.length === 0) {
      return { isValid: false, error: 'At least one role must be selected' };
    }
    
    // Filter out invalid role IDs
    const validRoleIds = roleIds.filter(roleId => 
      roleId && 
      roleId !== 'unknown' && 
      typeof roleId === 'string' && 
      roleId.trim() !== ''
    );
    
    if (validRoleIds.length === 0) {
      return { isValid: false, error: 'No valid roles selected' };
    }
    
    return { isValid: true };
  }
  
  /**
   * Validate user selection for bulk operations
   */
  static validateBulkOperation(selectedUsers: Set<string>, operation: string): { isValid: boolean; error?: string } {
    if (selectedUsers.size === 0) {
      return { isValid: false, error: 'No users selected' };
    }
    
    if (selectedUsers.size > 100) {
      return { isValid: false, error: 'Cannot perform bulk operations on more than 100 users at once' };
    }
    
    return { isValid: true };
  }
  
  /**
   * Validate user status for specific operations
   */
  static validateUserOperation(user: User, operation: string): { isValid: boolean; error?: string } {
    switch (operation) {
      case 'promote':
        if (user.isTenantAdmin) {
          return { isValid: false, error: 'User is already an admin' };
        }
        break;
        
      case 'deactivate':
        if (!user.isActive) {
          return { isValid: false, error: 'User is already inactive' };
        }
        break;
        
      case 'reactivate':
        if (user.isActive) {
          return { isValid: false, error: 'User is already active' };
        }
        break;
        
      case 'resendInvite':
        if (user.isActive && user.onboardingCompleted) {
          return { isValid: false, error: 'User has already accepted the invitation' };
        }
        break;
        
      case 'assignRoles':
        if (!user.isActive) {
          return { isValid: false, error: 'Cannot assign roles to inactive users' };
        }
        break;
    }
    
    return { isValid: true };
  }
}
