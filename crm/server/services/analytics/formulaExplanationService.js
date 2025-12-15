/**
 * Formula Explanation Service
 * Generates human-readable explanations of what formulas calculate
 */

class FormulaExplanationService {
  /**
   * Generate explanation for a formula
   * @param {String} formula - Formula string
   * @param {Array} variableMappings - Variable mappings
   * @param {Object} calculationResult - Calculation result with breakdown
   * @returns {String} Human-readable explanation
   */
  generateExplanation(formula, variableMappings = [], calculationResult = null) {
    try {
      // Parse formula components
      const components = this.parseFormulaComponents(formula, variableMappings);
      
      // Generate explanation based on components
      let explanation = this.buildExplanation(components, calculationResult);
      
      return explanation;
    } catch (error) {
      console.error('Error generating formula explanation:', error);
      return this.generateBasicExplanation(formula);
    }
  }

  /**
   * Parse formula into components
   */
  parseFormulaComponents(formula, variableMappings) {
    const components = {
      aggregations: [],
      operations: [],
      constants: [],
      fields: [],
      structure: [] // Track formula structure for better explanation
    };

    // Extract aggregation functions with their positions
    const aggregationPattern = /\b(SUM|AVG|COUNT|MIN|MAX|DISTINCT)\s*\(([^)]+)\)/gi;
    let match;
    const aggregationMatches = [];
    while ((match = aggregationPattern.exec(formula)) !== null) {
      const func = match[1];
      const field = match[2];
      const fieldName = this.getFieldName(field, variableMappings);
      aggregationMatches.push({
        function: func,
        field: fieldName || field,
        original: match[0],
        index: match.index
      });
    }
    components.aggregations = aggregationMatches;

    // Extract direct field references (not in aggregations)
    // First, build a set of known variable names and field IDs from mappings
    const variableNames = new Set();
    const fieldIds = new Set();
    if (variableMappings && variableMappings.length > 0) {
      variableMappings.forEach(m => {
        if (m.variableName) {
          variableNames.add(m.variableName);
          variableNames.add(m.variableName.toLowerCase());
        }
        if (m.fieldId) {
          fieldIds.add(m.fieldId);
          if (m.fieldId.startsWith('field-')) {
            const withoutPrefix = m.fieldId.replace(/^field-/, '');
            variableNames.add(withoutPrefix);
            variableNames.add(withoutPrefix.toLowerCase());
          }
        }
      });
    }
    
    const usedInAggregations = new Set();
    components.aggregations.forEach(agg => {
      if (agg.field) usedInAggregations.add(agg.field);
      const fieldIdMatch = agg.original.match(/field-([a-zA-Z0-9_-]+)/);
      if (fieldIdMatch) {
        usedInAggregations.add(fieldIdMatch[0]);
      }
    });
    
    // Match field-* patterns
    const fieldPattern = /\bfield-([a-zA-Z0-9_-]+)\b/g;
    const foundFields = new Set();
    
    while ((match = fieldPattern.exec(formula)) !== null) {
      const fieldId = match[0];
      const fieldNamePart = match[1];
      
      if (!usedInAggregations.has(fieldId) && !usedInAggregations.has(fieldNamePart)) {
        const fieldName = this.getFieldName(fieldId, variableMappings);
        const identifier = fieldName || fieldId;
        if (!foundFields.has(identifier)) {
          foundFields.add(identifier);
          components.fields.push({
            field: identifier,
            original: fieldId
          });
        }
      }
    }
    
    // Match variable names (normalized field names without field- prefix)
    // Only match if they're in our variable mappings
    if (variableNames.size > 0) {
      const variablePattern = new RegExp(`\\b(${Array.from(variableNames).map(v => this.escapeRegex(v)).join('|')})\\b`, 'gi');
      variablePattern.lastIndex = 0;
      
      while ((match = variablePattern.exec(formula)) !== null) {
        const varName = match[0];
        const varNameLower = varName.toLowerCase();
        
        // Skip function names
        const functionNames = ['sum', 'avg', 'count', 'min', 'max', 'distinct', 'if', 'month', 'year', 'datediff'];
        if (functionNames.includes(varNameLower)) {
          continue;
        }
        
        // Skip if it's a number
        if (!isNaN(parseFloat(varName))) {
          continue;
        }
        
        // Skip if already found or in aggregations
        if (foundFields.has(varName) || usedInAggregations.has(varName)) {
          continue;
        }
        
        // Find the matching mapping
        const matchingMapping = variableMappings?.find(m => 
          m.variableName?.toLowerCase() === varNameLower ||
          m.fieldId?.toLowerCase() === varNameLower ||
          m.fieldId?.replace(/^field-/, '').toLowerCase() === varNameLower
        );
        
        if (matchingMapping) {
          const fieldName = this.getFieldName(matchingMapping.fieldId || matchingMapping.variableName, variableMappings);
          const identifier = fieldName || matchingMapping.variableName || varName;
          if (!foundFields.has(identifier)) {
            foundFields.add(identifier);
            components.fields.push({
              field: identifier,
              original: matchingMapping.fieldId || varName
            });
          }
        }
      }
    }

    // Extract operations - be smarter about detecting actual operations vs part of numbers
    const operationPattern = /([+\-*/])/g;
    const operationMatches = [];
    while ((match = operationPattern.exec(formula)) !== null) {
      const op = match[1];
      const before = formula.substring(Math.max(0, match.index - 1), match.index);
      const after = formula.substring(match.index + 1, match.index + 2);
      // Skip if it's part of a number (e.g., -5, 1e-5)
      if (!/\d/.test(before) && !/\d/.test(after) && op !== '-') {
        operationMatches.push(op);
      } else if (op === '-' && !/\d/.test(before) && /\d/.test(after)) {
        // This is a subtraction, not a negative number
        operationMatches.push(op);
      }
    }
    
    if (operationMatches.includes('+')) components.operations.push('addition');
    if (operationMatches.includes('-')) components.operations.push('subtraction');
    if (operationMatches.includes('*')) components.operations.push('multiplication');
    if (operationMatches.includes('/')) components.operations.push('division');

    // Extract constants (numbers) - exclude those that are part of field names
    const constantPattern = /\b(\d+\.?\d*)\b/g;
    while ((match = constantPattern.exec(formula)) !== null) {
      const num = parseFloat(match[0]);
      // Skip if it's part of a field reference or function name
      const before = formula.substring(Math.max(0, match.index - 10), match.index);
      const after = formula.substring(match.index + match[0].length, match.index + match[0].length + 10);
      const isPartOfField = /field-/.test(before) || /field-/.test(after);
      const isPartOfFunction = /(SUM|AVG|COUNT|MIN|MAX|DISTINCT)\s*\(/.test(before);
      
      if (!isPartOfField && !isPartOfFunction && !isNaN(num) && num !== 0 && num !== 1 && num !== 100) {
        components.constants.push(num);
      }
    }

    return components;
  }

  /**
   * Get human-readable field name from mappings
   */
  getFieldName(fieldId, variableMappings) {
    if (!variableMappings || variableMappings.length === 0) {
      return fieldId.replace(/^field-/, '');
    }

    // Try to find in variable mappings
    const mapping = variableMappings.find(m => 
      m.fieldId === fieldId || 
      m.variableName === fieldId ||
      fieldId.includes(m.fieldId.replace(/^field-/, ''))
    );

    if (mapping) {
      return mapping.variableName || mapping.description || mapping.fieldId.replace(/^field-/, '');
    }

    // Fallback: clean up field ID
    return fieldId.replace(/^field-/, '').replace(/-/g, ' ');
  }

  /**
   * Build explanation from components
   */
  buildExplanation(components, calculationResult) {
    // Analyze formula structure to build a natural explanation
    const uniqueFields = new Set();
    const aggregationsByField = {};
    
    // Group aggregations by field to avoid repetition
    components.aggregations.forEach(agg => {
      const fieldName = this.formatFieldName(agg.field);
      uniqueFields.add(fieldName);
      if (!aggregationsByField[fieldName]) {
        aggregationsByField[fieldName] = [];
      }
      aggregationsByField[fieldName].push(agg.function.toUpperCase());
    });

    // Build description based on formula complexity
    let explanation = '';

    if (components.aggregations.length === 0 && components.fields.length > 0) {
      // Simple direct field reference - check if multiple fields (per-submission calculation)
      const fieldNames = Array.from(uniqueFields);
      if (fieldNames.length > 1) {
        // Multiple fields without aggregations means per-submission calculation
        const fieldDescriptions = fieldNames.map(f => this.formatFieldName(f));
        explanation = `Calculates per submission: ${fieldDescriptions.join(' × ')}`;
      } else {
        explanation = `Uses ${fieldNames.join(', ')}`;
      }
    } else if (components.aggregations.length === 1) {
      // Single aggregation - simple description
      const agg = components.aggregations[0];
      const fieldName = this.formatFieldName(agg.field);
      const hasPercentage = components.constants.some(c => c < 1 && c > 0);
      
      switch (agg.function.toUpperCase()) {
        case 'SUM':
          if (hasPercentage) {
            const percent = components.constants.find(c => c < 1 && c > 0);
            const percentValue = percent ? (percent * 100).toFixed(0) : '';
            explanation = `Calculates ${percentValue}% of total ${fieldName}`;
          } else {
            explanation = `Total ${fieldName}`;
          }
          break;
        case 'AVG':
          explanation = `Average ${fieldName}`;
          break;
        case 'COUNT':
          explanation = `Count of ${fieldName}`;
          break;
        case 'MIN':
          explanation = `Minimum ${fieldName}`;
          break;
        case 'MAX':
          explanation = `Maximum ${fieldName}`;
          break;
        default:
          explanation = `${agg.function} of ${fieldName}`;
      }
    } else {
      // Multiple aggregations - describe the calculation logic
      const fieldDescriptions = [];
      const uniqueFieldNames = new Set();
      Object.keys(aggregationsByField).forEach(fieldName => {
        if (!uniqueFieldNames.has(fieldName)) {
          uniqueFieldNames.add(fieldName);
          const funcs = aggregationsByField[fieldName];
          const func = funcs[0]; // Use first function if multiple
          const funcName = func === 'SUM' ? 'total' : func === 'AVG' ? 'average' : func.toLowerCase();
          fieldDescriptions.push(`${funcName} ${fieldName}`);
        }
      });

      // Count how many times each field appears
      const fieldCounts = {};
      components.aggregations.forEach(agg => {
        const fieldName = this.formatFieldName(agg.field);
        fieldCounts[fieldName] = (fieldCounts[fieldName] || 0) + 1;
      });

      // Build natural language description
      const hasAddition = components.operations.includes('addition');
      const hasSubtraction = components.operations.includes('subtraction');
      const hasMultiplication = components.operations.includes('multiplication');
      const hasDivision = components.operations.includes('division');
      const hasPercentage = components.constants.some(c => c < 1 && c > 0);

      // Analyze formula structure
      const uniqueFieldsCount = uniqueFieldNames.size;
      const totalAggregations = components.aggregations.length;

      if (uniqueFieldsCount === 1 && totalAggregations > 1 && hasMultiplication && hasPercentage) {
        // Same field used multiple times with percentage (e.g., SUM(field) * 0.15)
        const fieldName = Array.from(uniqueFieldNames)[0];
        const percent = components.constants.find(c => c < 1 && c > 0);
        const percentValue = percent ? (percent * 100).toFixed(0) : '';
        explanation = `Calculates ${percentValue}% of total ${fieldName}`;
      } else if (hasAddition && hasSubtraction && hasMultiplication) {
        // Complex formula: revenue + (revenue * growth%) - (revenue * expense%)
        if (uniqueFieldsCount === 1) {
          const fieldName = Array.from(uniqueFieldNames)[0];
          explanation = `Calculates total ${fieldName} plus growth adjustment, minus expense adjustment`;
        } else {
          explanation = `Calculates ${fieldDescriptions[0]}`;
          if (fieldDescriptions.length > 1) {
            explanation += ` plus growth adjustments`;
          }
          if (hasSubtraction) {
            explanation += `, minus expense adjustments`;
          }
        }
      } else if (hasAddition && hasMultiplication && !hasSubtraction) {
        // Addition with multiplication
        if (uniqueFieldsCount === 1) {
          const fieldName = Array.from(uniqueFieldNames)[0];
          explanation = `Adds total ${fieldName} with growth adjustments`;
        } else {
          explanation = `Adds ${fieldDescriptions[0]}`;
          if (fieldDescriptions.length > 1) {
            explanation += ` and ${fieldDescriptions.slice(1).join(' and ')}`;
          }
        }
        if (hasPercentage) {
          const percentages = components.constants
            .filter(c => c < 1 && c > 0)
            .map(c => `${(c * 100).toFixed(0)}%`);
          explanation += `, applying ${percentages.join(' and ')} factors`;
        }
      } else if (hasSubtraction && hasMultiplication && !hasAddition) {
        // Subtraction with multiplication
        explanation = `Subtracts adjusted expenses from ${fieldDescriptions[0]}`;
        if (hasPercentage) {
          const percentages = components.constants
            .filter(c => c < 1 && c > 0)
            .map(c => `${(c * 100).toFixed(0)}%`);
          explanation += ` using ${percentages.join(' and ')} factors`;
        }
      } else if (hasMultiplication && hasPercentage && !hasAddition && !hasSubtraction) {
        // Simple multiplication with percentage
        const percent = components.constants.find(c => c < 1 && c > 0);
        const percentValue = percent ? (percent * 100).toFixed(0) : '';
        explanation = `Calculates ${percentValue}% of ${fieldDescriptions[0]}`;
      } else {
        // Fallback: describe aggregations without repetition
        const uniqueDescriptions = Array.from(new Set(fieldDescriptions));
        if (uniqueDescriptions.length > 0) {
          explanation = `Combines ${uniqueDescriptions.join(', ')}`;
          if (hasPercentage) {
            const percentages = components.constants
              .filter(c => c < 1 && c > 0)
              .map(c => `${(c * 100).toFixed(0)}%`);
            explanation += ` with ${percentages.join(' and ')} adjustments`;
          }
        } else {
          // No aggregations found, check for direct field operations
          if (components.fields.length > 1) {
            const fieldNames = components.fields.map(f => this.formatFieldName(f.field));
            explanation = `Calculates per submission: ${fieldNames.join(' × ')}`;
          } else if (components.fields.length === 1) {
            explanation = `Uses ${this.formatFieldName(components.fields[0].field)}`;
          } else {
            explanation = 'Calculated metric based on form data';
          }
        }
      }
    }

    // Add direct field references if they're not already covered
    if (components.fields.length > 0) {
      const uncoveredFields = components.fields
        .map(f => this.formatFieldName(f.field))
        .filter(f => !uniqueFields.has(f));
      
      if (uncoveredFields.length > 0) {
        explanation += ` using ${uncoveredFields.join(', ')}`;
      }
    }

    // Capitalize first letter and add period
    if (explanation.length > 0) {
      explanation = explanation.charAt(0).toUpperCase() + explanation.slice(1);
      if (!explanation.endsWith('.')) {
        explanation += '.';
      }
    }

    // Final fallback: if we have fields but no explanation, generate a basic one
    if ((!explanation || explanation === 'Calculated metric based on form data.') && components.fields.length > 0) {
      const fieldNames = components.fields.map(f => this.formatFieldName(f.field));
      if (fieldNames.length > 1) {
        // Multiple fields - check operations
        if (components.operations.includes('multiplication')) {
          explanation = `Calculates per submission: ${fieldNames.join(' × ')}.`;
        } else if (components.operations.includes('addition')) {
          explanation = `Calculates per submission: ${fieldNames.join(' + ')}.`;
        } else if (components.operations.includes('subtraction')) {
          explanation = `Calculates per submission: ${fieldNames.join(' - ')}.`;
        } else if (components.operations.includes('division')) {
          explanation = `Calculates per submission: ${fieldNames.join(' ÷ ')}.`;
        } else {
          explanation = `Uses ${fieldNames.join(' and ')}.`;
        }
      } else if (fieldNames.length === 1) {
        explanation = `Uses ${fieldNames[0]}.`;
      }
    }

    return explanation || 'Calculated metric based on form data.';
  }

  /**
   * Format field name for display
   */
  formatFieldName(fieldName) {
    if (!fieldName) return 'data';
    
    // Convert camelCase or snake_case to readable format
    return fieldName
      .replace(/^field-/, '')
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .toLowerCase()
      .trim();
  }

  /**
   * Escape special regex characters
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Generate basic explanation when parsing fails
   */
  generateBasicExplanation(formula) {
    if (formula.includes('SUM') && formula.includes('annualRevenue')) {
      return 'Calculates total revenue metrics';
    }
    if (formula.includes('profit')) {
      return 'Calculates profit-related metrics';
    }
    if (formula.includes('revenue')) {
      return 'Calculates revenue-related metrics';
    }
    return 'Custom calculated metric';
  }

  /**
   * Generate detailed breakdown of calculation
   */
  generateBreakdown(formula, fieldData, result) {
    const breakdown = [];
    
    try {
      // Extract all field references
      const fieldPattern = /\bfield-([a-zA-Z0-9_-]+)\b/g;
      const fields = new Set();
      let match;
      while ((match = fieldPattern.exec(formula)) !== null) {
        fields.add(match[1]);
      }

      // Generate breakdown for each field
      fields.forEach(fieldName => {
        const values = fieldData[fieldName] || fieldData[`field-${fieldName}`];
        if (values && Array.isArray(values)) {
          const sum = values.reduce((a, b) => (Number(a) || 0) + (Number(b) || 0), 0);
          const avg = sum / values.length;
          const count = values.filter(v => v !== null && v !== undefined && v !== 0).length;
          
          breakdown.push({
            field: fieldName,
            sum: sum,
            average: avg,
            count: count,
            values: values.slice(0, 5) // Show first 5 values
          });
        }
      });

      return breakdown;
    } catch (error) {
      console.error('Error generating breakdown:', error);
      return [];
    }
  }
}

export default new FormulaExplanationService();

