/**
 * Custom Field Evaluator Service
 * Extracts and normalizes field values from form submissions
 */

class CustomFieldEvaluator {
  /**
   * Extract field value from submission data
   * @param {Object} submission - Form submission object
   * @param {String} fieldId - Field ID to extract
   * @param {String} fieldType - Field type (number, date, text, etc.)
   * @returns {*} Extracted value
   */
  getFieldValue(submission, fieldId, fieldType) {
    const rawValue = this.getNestedValue(submission.data, fieldId);
    
    if (rawValue === undefined || rawValue === null) {
      return null;
    }

    switch (fieldType) {
      case 'number':
        return this.parseNumber(rawValue);
      case 'date':
      case 'datetime':
        return this.parseDate(rawValue);
      case 'boolean':
      case 'checkbox':
        return this.parseBoolean(rawValue);
      case 'select':
      case 'radio':
        return String(rawValue);
      case 'multiselect':
        return Array.isArray(rawValue) ? rawValue : [rawValue];
      case 'text':
      case 'textarea':
      case 'email':
      case 'phone':
      default:
        return String(rawValue);
    }
  }

  /**
   * Get nested value from object using dot notation or array notation
   * @param {Object} obj - Object to search
   * @param {String} path - Path like "field_revenue" or "items[0].quantity"
   * @returns {*} Value at path
   */
  getNestedValue(obj, path) {
    if (!obj || !path) return null;

    // Handle array notation: items[0].quantity
    const parts = path.split(/[\.\[\]]/).filter(p => p);
    
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) {
        return null;
      }
      
      // Handle numeric array indices
      const numIndex = parseInt(part, 10);
      if (!isNaN(numIndex)) {
        current = current[numIndex];
      } else {
        current = current[part];
      }
    }
    
    return current;
  }

  /**
   * Parse number value
   */
  parseNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Parse date value
   */
  parseDate(value) {
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  /**
   * Parse boolean value
   */
  parseBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1' || value === 'yes';
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    return false;
  }

  /**
   * Map formula variables to actual field values from submissions
   * @param {Array} variables - Formula variables with mappings
   * @param {Array} submissions - Form submissions array
   * @param {Object} fieldMappings - Variable to field ID mappings
   * @returns {Object} Object with variable names as keys and arrays of values as values
   */
  mapVariablesToFields(variables, submissions, fieldMappings) {
    const result = {};

    // Initialize result structure
    variables.forEach(variable => {
      result[variable.variableName] = [];
    });

    // Extract values from each submission
    submissions.forEach(submission => {
      variables.forEach(variable => {
        const fieldId = variable.fieldId;
        const fieldType = variable.fieldType;
        const aggregation = variable.aggregation || 'NONE';

        const value = this.getFieldValue(submission, fieldId, fieldType);

        // Handle different aggregation types
        switch (aggregation) {
          case 'SUM':
          case 'AVG':
          case 'MIN':
          case 'MAX':
            // For numeric aggregations, extract numeric value
            if (fieldType === 'number') {
              result[variable.variableName].push(value || 0);
            } else if (fieldType === 'multiselect' && Array.isArray(value)) {
              // Sum array length for multiselect
              result[variable.variableName].push(value.length);
            }
            break;
          case 'COUNT':
          case 'DISTINCT':
            // For count, always push 1 (will be counted)
            result[variable.variableName].push(1);
            break;
          case 'NONE':
          default:
            // No aggregation, push raw value
            result[variable.variableName].push(value);
            break;
        }
      });
    });

    return result;
  }

  /**
   * Extract all field values for a submission
   * @param {Object} submission - Form submission
   * @param {Object} fieldMappings - Field mappings
   * @returns {Object} Object with field IDs as keys
   */
  extractAllFields(submission, fieldMappings) {
    const result = {};
    
    Object.keys(fieldMappings).forEach(variableName => {
      const mapping = fieldMappings[variableName];
      result[variableName] = this.getFieldValue(
        submission,
        mapping.fieldId,
        mapping.fieldType
      );
    });

    return result;
  }

  /**
   * Group submissions by a field value
   * @param {Array} submissions - Form submissions
   * @param {String} fieldId - Field ID to group by
   * @param {String} fieldType - Field type
   * @returns {Object} Grouped submissions { "value1": [submissions], "value2": [submissions] }
   */
  groupByField(submissions, fieldId, fieldType) {
    const groups = {};

    submissions.forEach(submission => {
      const value = this.getFieldValue(submission, fieldId, fieldType);
      const key = value !== null && value !== undefined ? String(value) : '__null__';
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(submission);
    });

    return groups;
  }

  /**
   * Filter submissions based on filter criteria
   * @param {Array} submissions - Form submissions
   * @param {Array} filters - Filter criteria array
   * @returns {Array} Filtered submissions
   */
  filterSubmissions(submissions, filters) {
    if (!filters || filters.length === 0) {
      return submissions;
    }

    return submissions.filter(submission => {
      return filters.every(filter => {
        const fieldValue = this.getFieldValue(
          submission,
          filter.fieldId,
          this.inferFieldType(filter.value)
        );

        return this.evaluateFilter(fieldValue, filter.operator, filter.value);
      });
    });
  }

  /**
   * Evaluate a single filter condition
   */
  evaluateFilter(fieldValue, operator, filterValue) {
    switch (operator) {
      case 'equals':
        return fieldValue == filterValue;
      case 'notEquals':
        return fieldValue != filterValue;
      case 'greaterThan':
        return Number(fieldValue) > Number(filterValue);
      case 'lessThan':
        return Number(fieldValue) < Number(filterValue);
      case 'greaterThanOrEqual':
        return Number(fieldValue) >= Number(filterValue);
      case 'lessThanOrEqual':
        return Number(fieldValue) <= Number(filterValue);
      case 'contains':
        return String(fieldValue).includes(String(filterValue));
      case 'notContains':
        return !String(fieldValue).includes(String(filterValue));
      case 'in':
        return Array.isArray(filterValue) && filterValue.includes(fieldValue);
      case 'notIn':
        return Array.isArray(filterValue) && !filterValue.includes(fieldValue);
      case 'isEmpty':
        return fieldValue === null || fieldValue === undefined || fieldValue === '';
      case 'isNotEmpty':
        return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
      default:
        return true;
    }
  }

  /**
   * Infer field type from value
   */
  inferFieldType(value) {
    if (typeof value === 'number') return 'number';
    if (value instanceof Date) return 'date';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'multiselect';
    return 'text';
  }
}

export default new CustomFieldEvaluator();

