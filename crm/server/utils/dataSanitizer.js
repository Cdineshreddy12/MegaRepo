import mongoose from 'mongoose';
import UserProfile from '../models/UserProfile.js';

/**
 * Common ObjectId fields that should be sanitized
 */
export const COMMON_OBJECT_ID_FIELDS = [
  'assignedTo',
  'createdBy',
  'accountId',
  'contactId',
  'primaryContactId',
  'relatedTo.id',
  'userId',
  'ownerId'
];

/**
 * Sanitize ObjectId fields by converting empty strings to undefined
 * This prevents MongoDB errors when trying to save empty strings as ObjectIds
 * @param {Object} data - Data object to sanitize
 * @param {Array} fields - Array of field paths to sanitize (e.g., ['assignedTo', 'accountId'])
 * @returns {Object} Sanitized data object
 */
export function sanitizeObjectIdFields(data, fields = COMMON_OBJECT_ID_FIELDS) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  fields.forEach(fieldPath => {
    // Handle nested paths like 'relatedTo.id'
    const pathParts = fieldPath.split('.');
    let current = sanitized;

    // Navigate to the parent object
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (current && typeof current === 'object' && pathParts[i] in current) {
        current = current[pathParts[i]];
      } else {
        return; // Path doesn't exist, skip
      }
    }

    // Get the field name
    const fieldName = pathParts[pathParts.length - 1];

    // Handle nested objects
    if (pathParts.length > 1) {
      // Re-navigate to set the value
      let target = sanitized;
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!target[pathParts[i]]) {
          target[pathParts[i]] = {};
        }
        target = target[pathParts[i]];
      }
      
      if (target[fieldName] === '' || target[fieldName] === null) {
        target[fieldName] = undefined;
      }
    } else {
      // Top-level field
      if (current[fieldName] === '' || current[fieldName] === null) {
        current[fieldName] = undefined;
      }
    }
  });

  return sanitized;
}

/**
 * Populate user fields in documents
 * @param {Array|Object} documents - Documents to populate
 * @param {Array} userFields - Fields that contain user IDs (e.g., ['assignedTo', 'createdBy'])
 * @param {Array} selectFields - Fields to select from user (e.g., ['firstName', 'lastName', 'email'])
 * @returns {Promise<Array|Object>} Documents with populated user fields
 */
export async function populateUserFields(documents, userFields = ['assignedTo', 'createdBy'], selectFields = ['firstName', 'lastName', 'email']) {
  if (!documents) {
    return documents;
  }

  const docsArray = Array.isArray(documents) ? documents : [documents];
  
  if (docsArray.length === 0) {
    return Array.isArray(documents) ? [] : null;
  }

  // Collect all unique user IDs
  const userIds = new Set();
  docsArray.forEach(doc => {
    userFields.forEach(field => {
      if (doc[field]) {
        const userId = doc[field].toString();
        if (userId && userId !== 'undefined' && userId !== 'null') {
          userIds.add(userId);
        }
      }
    });
  });

  if (userIds.size === 0) {
    return documents;
  }

  // Query UserProfile for all user IDs
  const userIdsArray = Array.from(userIds);
  const userProfiles = await UserProfile.find({
    $or: [
      { _id: { $in: userIdsArray.filter(id => mongoose.Types.ObjectId.isValid(id)) } },
      { userId: { $in: userIdsArray } },
      { employeeCode: { $in: userIdsArray } }
    ]
  }).select(`userId personalInfo.firstName personalInfo.lastName personalInfo.email employeeCode _id ${selectFields.join(' ')}`).lean();

  // Create a map for quick lookup
  const userMap = new Map();
  userProfiles.forEach(profile => {
    const userObj = {
      _id: profile._id,
      id: profile._id.toString(),
      userId: profile.userId,
      firstName: profile.personalInfo?.firstName || '',
      lastName: profile.personalInfo?.lastName || '',
      email: profile.personalInfo?.email || '',
      ...selectFields.reduce((acc, field) => {
        if (profile[field] !== undefined) {
          acc[field] = profile[field];
        }
        return acc;
      }, {})
    };

    userMap.set(profile._id.toString(), userObj);
    if (profile.userId) userMap.set(profile.userId, userObj);
    if (profile.employeeCode) userMap.set(profile.employeeCode, userObj);
  });

  // Populate user fields in documents
  const populatedDocs = docsArray.map(doc => {
    const populated = { ...doc };
    userFields.forEach(field => {
      if (doc[field]) {
        const userId = doc[field].toString();
        const userData = userMap.get(userId);
        if (userData) {
          populated[field] = userData;
        } else {
          // Create a default user object if not found
          populated[field] = {
            _id: userId,
            id: userId,
            firstName: 'Unknown',
            lastName: 'User',
            email: ''
          };
        }
      }
    });
    return populated;
  });

  return Array.isArray(documents) ? populatedDocs : populatedDocs[0];
}

/**
 * Populate entity/user fields in customFields object
 * Resolves MongoDB IDs to actual populated objects
 * @param {Object} opportunity - Opportunity document
 * @param {Object} template - Form template (optional, for field type detection)
 * @returns {Promise<Object>} Opportunity with populated customFields
 */
export async function populateCustomFieldsEntities(opportunity, template = null) {
  if (!opportunity || !opportunity.customFields || typeof opportunity.customFields !== 'object') {
    return opportunity;
  }

  const Account = (await import('../models/Account.js')).default;
  const User = (await import('../models/User.js')).default;
  const Contact = (await import('../models/Contact.js')).default;

  const customFields = { ...opportunity.customFields };
  const populatedFields = {};

  // Common entity/user field mappings
  const entityFieldMappings = {
    // Account fields
    accountName: { model: Account, select: 'companyName zone orgCode industry', type: 'account' },
    account: { model: Account, select: 'companyName zone orgCode industry', type: 'account' },
    accountId: { model: Account, select: 'companyName zone orgCode industry', type: 'account' },
    
    // User fields
    assignedTo: { model: User, select: 'firstName lastName email contactMobile role', type: 'user' },
    assigned_to: { model: User, select: 'firstName lastName email contactMobile role', type: 'user' },
    assignee: { model: User, select: 'firstName lastName email contactMobile role', type: 'user' },
    createdBy: { model: User, select: 'firstName lastName email contactMobile role', type: 'user' },
    
    // Contact fields
    contactId: { model: Contact, select: 'firstName lastName email contactMobile role', type: 'contact' },
    primaryContactId: { model: Contact, select: 'firstName lastName email contactMobile role', type: 'contact' },
    contact: { model: Contact, select: 'firstName lastName email contactMobile role', type: 'contact' },
  };

  // Check template for field types if available
  if (template && template.sections) {
    template.sections.forEach(section => {
      if (section.fields) {
        section.fields.forEach(field => {
          const fieldId = field.id;
          const fieldName = fieldId.replace(/^field-/, '').toLowerCase();
          
          // Map field type to model
          if (field.type === 'entity' && field.metadata?.entityType) {
            const entityType = field.metadata.entityType.toLowerCase();
            if (entityType === 'account') {
              entityFieldMappings[fieldName] = { model: Account, select: 'companyName zone orgCode industry', type: 'account' };
            } else if (entityType === 'contact') {
              entityFieldMappings[fieldName] = { model: Contact, select: 'firstName lastName email contactMobile role', type: 'contact' };
            }
          } else if (field.type === 'user') {
            entityFieldMappings[fieldName] = { model: User, select: 'firstName lastName email contactMobile role', type: 'user' };
          }
        });
      }
    });
  }

  // Collect all IDs to populate
  const populatePromises = [];

  for (const [fieldName, fieldValue] of Object.entries(customFields)) {
    const fieldNameLower = fieldName.toLowerCase();
    const mapping = entityFieldMappings[fieldNameLower] || 
                    entityFieldMappings[fieldName];

    if (mapping && fieldValue) {
      // Check if it's an ID string (24 character MongoDB ObjectId)
      if (typeof fieldValue === 'string' && fieldValue.length === 24 && /^[a-f\d]{24}$/i.test(fieldValue)) {
        populatePromises.push(
          mapping.model.findById(fieldValue)
            .select(mapping.select)
            .lean()
            .then(populated => {
              if (populated) {
                populatedFields[fieldName] = populated;
              }
            })
            .catch(err => {
              console.warn(`Failed to populate ${fieldName}:`, err.message);
            })
        );
      }
      // If it's already an object but missing fields, try to populate
      else if (typeof fieldValue === 'object' && fieldValue !== null && !fieldValue.companyName && !fieldValue.firstName) {
        const id = fieldValue._id || fieldValue.id || fieldValue;
        if (typeof id === 'string' && id.length === 24 && /^[a-f\d]{24}$/i.test(id)) {
          populatePromises.push(
            mapping.model.findById(id)
              .select(mapping.select)
              .lean()
              .then(populated => {
                if (populated) {
                  populatedFields[fieldName] = populated;
                }
              })
              .catch(err => {
                console.warn(`Failed to populate ${fieldName}:`, err.message);
              })
          );
        }
      }
    }
  }

  // Wait for all populates to complete
  await Promise.all(populatePromises);

  // Merge populated fields into customFields
  const result = {
    ...opportunity,
    customFields: {
      ...customFields,
      ...populatedFields
    }
  };

  return result;
}

export default {
  sanitizeObjectIdFields,
  COMMON_OBJECT_ID_FIELDS,
  populateUserFields,
  populateCustomFieldsEntities
};

