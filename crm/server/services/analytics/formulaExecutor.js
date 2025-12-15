/**
 * Formula Executor Service
 * Parses and executes formulas with support for pipelined aggregations
 */

import { evaluate, create, all } from 'mathjs';

// Configure mathjs with safe functions only
const math = create(all, {
  // Only allow safe operations
  createUnitClass: false,
  createUnitFunction: false
});

class FormulaExecutor {
  constructor() {
    this.fieldEvaluator = null; // Will be injected
  }

  setFieldEvaluator(evaluator) {
    this.fieldEvaluator = evaluator;
  }

  /**
   * Execute a formula with field data
   * @param {String} formula - Formula string (e.g., "SUM(field_revenue) * 0.15")
   * @param {Object} fieldData - Object with variable names as keys and arrays of values
   * @param {Object} options - Execution options
   * @param {Array} variableMappings - Optional variable mappings to map field IDs to variable names
   * @returns {*} Calculated result
   */
  execute(formula, fieldData, options = {}, variableMappings = []) {
    try {
      // Validate formula input
      if (!formula || typeof formula !== 'string' || formula.trim() === '') {
        throw new Error('Formula is empty or invalid');
      }

      // First, replace field IDs in formula with variable names from mappings
      let normalizedFormula = formula;
      if (variableMappings && variableMappings.length > 0) {
        normalizedFormula = this.normalizeFormulaWithMappings(formula, variableMappings);
        if (normalizedFormula !== formula) {
          console.log('Formula normalized:', { original: formula, normalized: normalizedFormula });
        }
      }

      // Simplify formula if numerator and denominator are the same (e.g., (x * y / 100) / x * 100 = y)
      normalizedFormula = this.simplifyFormula(normalizedFormula);

      // Replace field references with aggregated values
      // Pass variableMappings in options so processFormula can use them
      const processedFormula = this.processFormula(normalizedFormula, fieldData, {
        ...options,
        variableMappings: variableMappings || []
      });
      
      // Validate processed formula
      if (!processedFormula || processedFormula.trim() === '') {
        throw new Error('Processed formula is empty. Check field mappings.');
      }

      // Log for debugging
      console.log('Formula execution:', {
        original: formula,
        normalized: normalizedFormula !== formula ? normalizedFormula : 'same as original',
        processed: processedFormula,
        fieldDataKeys: Object.keys(fieldData || {}),
        fieldDataSample: Object.keys(fieldData || {}).reduce((acc, key) => {
          acc[key] = Array.isArray(fieldData[key]) ? fieldData[key].slice(0, 3) : fieldData[key];
          return acc;
        }, {})
      });
      
      // Check for division by zero before evaluation
      // Match patterns like: / 0, /0, /(0), / (0), etc.
      const divisionByZeroPattern = /\/(\s*\(?\s*0\s*\)?|\s*0\s*)/;
      if (divisionByZeroPattern.test(processedFormula)) {
        console.warn('⚠️ Division by zero detected in formula:', processedFormula);
        
        // Try to identify which field is causing the issue
        const zeroFields = Object.keys(fieldData).filter(key => {
          const values = fieldData[key];
          if (Array.isArray(values)) {
            return values.every(v => v === 0 || v === null || v === undefined);
          }
          return values === 0 || values === null || values === undefined;
        });
        
        // Also check if any field used as denominator has zero values
        const denominatorFields = this.extractDenominatorFields(processedFormula, fieldData);
        const zeroDenominators = denominatorFields.filter(field => {
          const values = fieldData[field];
          if (Array.isArray(values)) {
            return values.every(v => v === 0 || v === null || v === undefined);
          }
          return values === 0 || values === null || values === undefined;
        });
        
        // If all values are zero, return 0 instead of throwing error (for better UX)
        // But still log a warning
        if (zeroDenominators.length > 0 || zeroFields.length > 0) {
          console.warn(`⚠️ All values are zero for field(s): ${zeroDenominators.length > 0 ? zeroDenominators.join(', ') : zeroFields.join(', ')}. Returning 0.`);
          
          // Check if we can return a meaningful default (0) instead of error
          // Only throw error if it's a critical calculation that requires non-zero values
          const criticalFields = ['annualRevenue', 'revenue', 'amount', 'total'];
          const hasCriticalZeroField = zeroDenominators.some(f => 
            criticalFields.some(cf => f.toLowerCase().includes(cf))
          ) || zeroFields.some(f => 
            criticalFields.some(cf => f.toLowerCase().includes(cf))
          );
          
          if (hasCriticalZeroField) {
            throw new Error(`Division by zero: Field(s) "${zeroDenominators.length > 0 ? zeroDenominators.join('", "') : zeroFields.join('", "')}" have all zero values. Cannot calculate formula. Please ensure these fields have non-zero values.`);
          }
          
          // For non-critical fields, return 0
          return this.formatResult(0, options.outputType, options.displayFormat);
        }
        
        throw new Error('Division by zero detected in formula. Check that all denominator fields have non-zero values.');
      }
      
      // Evaluate the formula using mathjs
      let result;
      try {
        result = math.evaluate(processedFormula);
      } catch (error) {
        // Check if it's a division by zero error
        if (error.message && (error.message.includes('divide') || error.message.includes('zero') || 
            error.message.includes('Infinity') || error.message.includes('NaN'))) {
          throw new Error('Division by zero: Cannot divide by zero. Ensure denominator fields have non-zero values.');
        }
        throw error;
      }
      
      // Check if result is valid
      if (result === null || result === undefined || isNaN(result) || !isFinite(result)) {
        // Provide more context about what went wrong
        const zeroFields = Object.keys(fieldData).filter(key => {
          const values = fieldData[key];
          if (Array.isArray(values)) {
            return values.every(v => v === 0 || v === null || v === undefined);
          }
          return values === 0 || values === null || values === undefined;
        });
        
        if (zeroFields.length > 0) {
          throw new Error(`Invalid result: Field(s) ${zeroFields.join(', ')} have all zero values, causing division by zero or invalid calculation.`);
        }
        throw new Error(`Formula evaluation resulted in invalid value (${result}). Check formula logic and field values.`);
      }
      
      return this.formatResult(result, options.outputType, options.displayFormat);
    } catch (error) {
      console.error('Formula execution error:', error);
      console.error('Formula details:', {
        formula,
        fieldDataKeys: Object.keys(fieldData || {}),
        options
      });
      throw new Error(`Formula execution failed: ${error.message}`);
    }
  }

  /**
   * Process formula by replacing field references with aggregated values
   */
  processFormula(formula, fieldData, options) {
    if (!formula || typeof formula !== 'string') {
      throw new Error('Invalid formula: must be a non-empty string');
    }

    if (!fieldData || typeof fieldData !== 'object') {
      throw new Error('Invalid fieldData: must be an object');
    }

    let processed = formula.trim();

    // If formula is empty after trim, return 0
    if (processed === '') {
      return '0';
    }

    // First, evaluate IF functions per-submission to create intermediate arrays
    // This handles cases like SUM(IF(...)) where IF needs to be evaluated per submission
    processed = this.evaluateConditionalFunctionsPerSubmission(processed, fieldData);
    
    // Then replace aggregation functions: SUM(field_name), AVG(field_name), etc.
    // Handle nested functions by matching balanced parentheses
    // Pass variableMappings if available (from options or context)
    const variableMappings = options.variableMappings || [];
    processed = this.replaceAggregations(processed, fieldData, variableMappings);
    
    // If formula still contains IF statements or other functions, evaluate them as single values
    processed = this.evaluateConditionalFunctions(processed, fieldData);

    // Check if we have multiple direct field references (without aggregations)
    // If so, we should evaluate per-submission and then aggregate
    const directFieldRefs = [];
    const aggregationFuncs = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'DISTINCT'];
    
    Object.keys(fieldData).forEach(fieldName => {
      const regex = new RegExp(`\\b${this.escapeRegex(fieldName)}\\b`, 'g');
      let match;
      while ((match = regex.exec(processed)) !== null) {
        // Check if this is inside an aggregation function
        let isInFunctionCall = false;
        let parenDepth = 0;
        
        for (let j = match.index - 1; j >= Math.max(0, match.index - 100); j--) {
          if (processed[j] === ')') {
            parenDepth++;
          } else if (processed[j] === '(') {
            if (parenDepth === 0) {
              const beforeParen = processed.substring(Math.max(0, j - 20), j).trim();
              for (const func of aggregationFuncs) {
                if (beforeParen.endsWith(func) || new RegExp(`\\b${func}\\s*$`).test(beforeParen)) {
                  isInFunctionCall = true;
                  break;
                }
              }
              break;
            } else {
              parenDepth--;
            }
          }
        }
        
        if (!isInFunctionCall) {
          directFieldRefs.push(fieldName);
        }
      }
    });
    
    // If we have multiple direct field references, evaluate per-submission
    if (directFieldRefs.length > 1) {
      const uniqueFields = [...new Set(directFieldRefs)];
      const fieldArrays = {};
      
      // Get arrays for all fields
      uniqueFields.forEach(fieldName => {
        const values = fieldData[fieldName];
        if (Array.isArray(values)) {
          fieldArrays[fieldName] = values.map(v => {
            const num = Number(v);
            return isNaN(num) ? 0 : num;
          });
        } else {
          fieldArrays[fieldName] = [Number(values) || 0];
        }
      });
      
      // Determine max length
      const maxLength = Math.max(...Object.values(fieldArrays).map(arr => arr.length));
      
      // Evaluate formula for each submission index
      const perSubmissionResults = [];
      for (let idx = 0; idx < maxLength; idx++) {
        // Create a temporary formula with values for this submission
        let submissionFormula = processed;
        uniqueFields.forEach(fieldName => {
          const value = fieldArrays[fieldName][idx] || 0;
          const regex = new RegExp(`\\b${this.escapeRegex(fieldName)}\\b`, 'g');
          submissionFormula = submissionFormula.replace(regex, String(value));
        });
        
        try {
          const result = math.evaluate(submissionFormula);
          if (isFinite(result) && !isNaN(result)) {
            perSubmissionResults.push(result);
          }
        } catch (err) {
          console.warn(`Error evaluating formula for submission ${idx}:`, err);
        }
      }
      
      // Sum all per-submission results
      if (perSubmissionResults.length > 0) {
        const total = perSubmissionResults.reduce((sum, val) => sum + val, 0);
        return String(total);
      }
    }
    
    // If only one or no direct field references, use the old logic
    // Replace direct field references (without aggregation) - be careful not to replace parts of function calls
    // After aggregation functions are processed, any remaining field references should be replaced with their values
    Object.keys(fieldData).forEach(fieldName => {
      // Create regex to find the field name as a whole word
      const regex = new RegExp(`\\b${this.escapeRegex(fieldName)}\\b`, 'g');
      
      // Find all matches and process them in reverse order (to preserve indices)
      const matches = [];
      let match;
      while ((match = regex.exec(processed)) !== null) {
        matches.push({
          index: match.index,
          length: match[0].length
        });
      }
      
      // Process matches in reverse order to preserve indices
      for (let i = matches.length - 1; i >= 0; i--) {
        const matchInfo = matches[i];
        const startIndex = matchInfo.index;
        const endIndex = startIndex + matchInfo.length;
        
        // Check if this field is inside an aggregation function call
        // Look backwards to find the nearest opening parenthesis and check if it's part of a function call
        let isInFunctionCall = false;
        let parenDepth = 0;
        let foundOpeningParen = false;
        
        // Scan backwards from the field to find if it's inside a function call
        for (let j = startIndex - 1; j >= Math.max(0, startIndex - 100); j--) {
          if (processed[j] === ')') {
            parenDepth++;
          } else if (processed[j] === '(') {
            if (parenDepth === 0) {
              // Found the opening paren that contains this field
              foundOpeningParen = true;
              // Check if there's a function name before this opening paren
              const beforeParen = processed.substring(Math.max(0, j - 20), j).trim();
              for (const func of aggregationFuncs) {
                if (beforeParen.endsWith(func) || new RegExp(`\\b${func}\\s*$`).test(beforeParen)) {
                  isInFunctionCall = true;
                  break;
                }
              }
              break;
            } else {
              parenDepth--;
            }
          }
        }
        
        // If not in a function call, replace with the field's value
        if (!isInFunctionCall) {
          const values = fieldData[fieldName];
          let replacement;
          
          if (Array.isArray(values) && values.length > 0) {
            // For single direct field reference, use sum (more common for calculations)
            const numericValues = values.filter(v => v !== null && v !== undefined && !isNaN(Number(v))).map(Number);
            
            if (numericValues.length > 0) {
              // Use sum for single field reference (e.g., just "annualRevenue" means sum all)
              const sum = numericValues.reduce((acc, val) => acc + val, 0);
              replacement = String(sum);
            } else {
              // Fallback to first value if no valid numbers
              replacement = String(values[0] || 0);
            }
          } else if (values !== null && values !== undefined) {
            replacement = String(values);
          } else {
            replacement = '0';
          }
          
          // Replace this occurrence
          processed = processed.substring(0, startIndex) + replacement + processed.substring(endIndex);
        }
      }
    });

    // Clean up any double operators or invalid syntax
    processed = processed
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\(\s*\)/g, '(0)') // Replace empty parentheses with (0)
      .replace(/^\s*[+\-*/)]+\s*/g, '') // Remove leading operators/parentheses
      .replace(/\s*[+\-*/]+\s*$/g, '') // Remove trailing operators
      .trim();

    // Final validation - check for common syntax errors
    if (!processed || processed === '') {
      throw new Error('Formula became empty after processing. Check field mappings.');
    }

    if (processed.match(/^[+\-*/)]/)) {
      throw new Error(`Invalid formula syntax: formula starts with invalid character "${processed.substring(0, 5)}..."`);
    }

    if (processed.match(/[+\-*/]$/)) {
      throw new Error(`Invalid formula syntax: formula ends with invalid character "${processed.slice(-5)}"`);
    }

    // Check for balanced parentheses
    const openCount = (processed.match(/\(/g) || []).length;
    const closeCount = (processed.match(/\)/g) || []).length;
    if (openCount !== closeCount) {
      throw new Error(`Unbalanced parentheses: ${openCount} open, ${closeCount} close in formula: "${processed}"`);
    }

    return processed;
  }

  /**
   * Replace aggregation functions with balanced parentheses handling
   * @param {String} formula - Formula string
   * @param {Object} fieldData - Field data object
   * @param {Array} variableMappings - Variable mappings array (optional)
   */
  replaceAggregations(formula, fieldData, variableMappings = []) {
    const aggregationFuncs = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'DISTINCT'];
    let processed = formula;
    let changed = true;
    let iterations = 0;
    const maxIterations = 20; // Prevent infinite loops

    // Process from innermost to outermost by finding balanced parentheses
    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      for (const func of aggregationFuncs) {
        // Find function calls with balanced parentheses
        const funcRegex = new RegExp(`\\b${func}\\(`, 'g');
        let match;

        while ((match = funcRegex.exec(processed)) !== null) {
          const startIndex = match.index;
          const funcStart = startIndex + func.length + 1; // After "FUNC("
          
          // Find matching closing parenthesis
          let depth = 1;
          let i = funcStart;
          let endIndex = -1;

          while (i < processed.length && depth > 0) {
            if (processed[i] === '(') depth++;
            if (processed[i] === ')') depth--;
            if (depth === 0) {
              endIndex = i;
              break;
            }
            i++;
          }

          if (endIndex === -1) {
            // Unbalanced parentheses, skip this match
            break;
          }

          // Extract the content inside parentheses
          const content = processed.substring(funcStart, endIndex);
          
          // Check if content is a simple field name (not a nested function or expression)
          // Allow field names with hyphens (e.g., "field-annualRevenue") and underscores
          const trimmedContent = content.trim();
          // Updated regex to allow hyphens and underscores in field names
          const isSimpleField = /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(trimmedContent);
          
          // Check if content contains operators (complex expression)
          const hasOperators = /[+\-*/]/.test(trimmedContent);
          
          if (hasOperators && !isSimpleField) {
            // Complex expression inside aggregation - evaluate per-submission then aggregate
            try {
              // Extract all field names from the expression
              const fieldNamesInExpression = [];
              Object.keys(fieldData).forEach(fieldName => {
                if (trimmedContent.includes(fieldName)) {
                  fieldNamesInExpression.push(fieldName);
                }
              });
              
              if (fieldNamesInExpression.length > 0) {
                // Get arrays for all fields
                const fieldArrays = {};
                fieldNamesInExpression.forEach(fieldName => {
                  const values = fieldData[fieldName];
                  if (Array.isArray(values)) {
                    fieldArrays[fieldName] = values.map(v => {
                      const num = Number(v);
                      return isNaN(num) ? 0 : num;
                    });
                  } else {
                    fieldArrays[fieldName] = [Number(values) || 0];
                  }
                });
                
                // Determine max length
                const maxLength = Math.max(...Object.values(fieldArrays).map(arr => arr.length));
                
                // Evaluate expression for each submission index
                const perSubmissionResults = [];
                for (let idx = 0; idx < maxLength; idx++) {
                  // Create a temporary expression with values for this submission
                  let submissionExpression = trimmedContent;
                  fieldNamesInExpression.forEach(fieldName => {
                    const value = fieldArrays[fieldName][idx] || 0;
                    // Replace all occurrences of this field name with its value
                    const regex = new RegExp(`\\b${this.escapeRegex(fieldName)}\\b`, 'g');
                    submissionExpression = submissionExpression.replace(regex, String(value));
                  });
                  
                  try {
                    const result = math.evaluate(submissionExpression);
                    if (isFinite(result) && !isNaN(result)) {
                      perSubmissionResults.push(result);
                    }
                  } catch (err) {
                    console.warn(`Error evaluating expression for submission ${idx}:`, err);
                  }
                }
                
                // Apply aggregation function
                let replacement = '0';
                if (perSubmissionResults.length > 0) {
                  switch (func) {
                    case 'SUM':
                      replacement = String(perSubmissionResults.reduce((sum, val) => sum + val, 0));
                      break;
                    case 'AVG':
                      const sum = perSubmissionResults.reduce((s, val) => s + val, 0);
                      replacement = String(sum / perSubmissionResults.length);
                      break;
                    case 'COUNT':
                      replacement = String(perSubmissionResults.length);
                      break;
                    case 'MIN':
                      replacement = String(Math.min(...perSubmissionResults));
                      break;
                    case 'MAX':
                      replacement = String(Math.max(...perSubmissionResults));
                      break;
                    case 'DISTINCT':
                      replacement = String(new Set(perSubmissionResults).size);
                      break;
                  }
                }
                
                // Replace the aggregation function with the result
                processed = processed.substring(0, startIndex) + replacement + processed.substring(endIndex + 1);
                changed = true;
                break; // Restart search
              }
            } catch (err) {
              console.error(`Error processing complex aggregation ${func}:`, err);
              // Fall through to try simple field handling
            }
          } else if (isSimpleField) {
            // Simple field reference - replace with aggregated value
            const fieldName = trimmedContent;
            // Try multiple variations to find the field in fieldData
            let values = null;
            const triedKeys = [];
            
            // 0. First, check if this is a variable name from mappings (most common case)
            // Variable names are what we use in formulas after normalization
            if (fieldData[fieldName]) {
              values = fieldData[fieldName];
              triedKeys.push(fieldName);
            }
            
            // 1. Try exact match (field ID)
            if (!values && fieldData[fieldName]) {
              values = fieldData[fieldName];
              triedKeys.push(fieldName);
            }
            
            // 2. Try without "field-" prefix
            if (!values && fieldName.startsWith('field-')) {
              const fieldNameWithoutPrefix = fieldName.replace(/^field-/, '');
              triedKeys.push(fieldNameWithoutPrefix);
              if (fieldData[fieldNameWithoutPrefix]) {
                values = fieldData[fieldNameWithoutPrefix];
              }
            }
            
            // 3. Try with underscore instead of hyphen
            if (!values) {
              const fieldNameWithUnderscore = fieldName.replace(/-/g, '_');
              triedKeys.push(fieldNameWithUnderscore);
              if (fieldData[fieldNameWithUnderscore]) {
                values = fieldData[fieldNameWithUnderscore];
              }
            }
            
            // 4. Try adding "field-" prefix if it doesn't have it
            if (!values && !fieldName.startsWith('field-')) {
              const fieldNameWithPrefix = `field-${fieldName}`;
              triedKeys.push(fieldNameWithPrefix);
              if (fieldData[fieldNameWithPrefix]) {
                values = fieldData[fieldNameWithPrefix];
              }
            }
            
            // 5. Try case-insensitive match
            if (!values) {
              const availableKeys = Object.keys(fieldData);
              const matchedKey = availableKeys.find(key => 
                key.toLowerCase() === fieldName.toLowerCase() ||
                key.toLowerCase() === fieldName.replace(/^field-/, '').toLowerCase() ||
                key.toLowerCase().replace(/-/g, '_') === fieldName.toLowerCase().replace(/-/g, '_')
              );
              if (matchedKey) {
                values = fieldData[matchedKey];
                triedKeys.push(matchedKey);
              }
            }
            
            // 6. Try to find via variable mappings (if variableMappings are available)
            if (!values && variableMappings && variableMappings.length > 0) {
              const mapping = variableMappings.find(m => 
                m.fieldId === fieldName || 
                m.variableName === fieldName ||
                m.fieldId === fieldName.replace(/^field-/, '') ||
                m.variableName === fieldName.replace(/^field-/, '')
              );
              if (mapping && fieldData[mapping.variableName]) {
                values = fieldData[mapping.variableName];
                triedKeys.push(`via mapping: ${mapping.variableName}`);
              }
            }

            if (!values || !Array.isArray(values) || values.length === 0) {
              console.warn(`⚠️ No values found for field: ${fieldName}. Tried keys: ${triedKeys.join(', ') || 'none'}. Available keys: ${Object.keys(fieldData).join(', ')}`);
              console.warn(`⚠️ Field data sample:`, Object.keys(fieldData).reduce((acc, key) => {
                acc[key] = Array.isArray(fieldData[key]) ? `${fieldData[key].length} values` : typeof fieldData[key];
                return acc;
              }, {}));
              const replacement = '0';
              processed = processed.substring(0, startIndex) + replacement + processed.substring(endIndex + 1);
              changed = true;
              break; // Restart search
            }

            try {
              let replacement = '0';
              switch (func) {
                case 'SUM':
                  replacement = String(values.reduce((sum, val) => sum + (Number(val) || 0), 0));
                  break;
                case 'AVG':
                  const sum = values.reduce((s, val) => s + (Number(val) || 0), 0);
                  replacement = values.length > 0 ? String(sum / values.length) : '0';
                  break;
                case 'COUNT':
                  replacement = String(values.length);
                  break;
                case 'MIN':
                  const minValues = values.map(v => Number(v) || 0).filter(v => !isNaN(v));
                  replacement = minValues.length > 0 ? String(Math.min(...minValues)) : '0';
                  break;
                case 'MAX':
                  const maxValues = values.map(v => Number(v) || 0).filter(v => !isNaN(v));
                  replacement = maxValues.length > 0 ? String(Math.max(...maxValues)) : '0';
                  break;
                case 'DISTINCT':
                  replacement = String(new Set(values).size);
                  break;
              }
              
              processed = processed.substring(0, startIndex) + replacement + processed.substring(endIndex + 1);
              changed = true;
              break; // Restart search
            } catch (err) {
              console.error(`Error processing aggregation ${func} for field ${fieldName}:`, err);
              const replacement = '0';
              processed = processed.substring(0, startIndex) + replacement + processed.substring(endIndex + 1);
              changed = true;
              break; // Restart search
            }
          } else {
            // Nested function or complex expression - skip for now
            // Move regex forward to avoid infinite loop
            funcRegex.lastIndex = endIndex + 1;
          }
        }
      }
    }

    return processed;
  }

  /**
   * Normalize formula by replacing field IDs with variable names from mappings
   * @param {String} formula - Original formula with field IDs
   * @param {Array} variableMappings - Variable mappings array
   * @returns {String} Normalized formula with variable names
   */
  normalizeFormulaWithMappings(formula, variableMappings) {
    let normalized = formula;
    
    // Create a map of fieldId -> variableName for quick lookup
    const fieldIdToVariableMap = {};
    variableMappings.forEach(mapping => {
      if (mapping.fieldId && mapping.variableName) {
        // Map both with and without "field-" prefix
        fieldIdToVariableMap[mapping.fieldId] = mapping.variableName;
        if (mapping.fieldId.startsWith('field-')) {
          fieldIdToVariableMap[mapping.fieldId.replace(/^field-/, '')] = mapping.variableName;
        } else {
          fieldIdToVariableMap[`field-${mapping.fieldId}`] = mapping.variableName;
        }
      }
    });

    // Replace field IDs with variable names in the formula
    // Use word boundaries to avoid partial matches
    Object.keys(fieldIdToVariableMap).forEach(fieldId => {
      const variableName = fieldIdToVariableMap[fieldId];
      // Replace field IDs that appear as standalone identifiers (not inside strings)
      // Match field IDs that are: at start, after operators, after parentheses, after commas
      const regex = new RegExp(`\\b${fieldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      normalized = normalized.replace(regex, variableName);
    });

    return normalized;
  }

  /**
   * Evaluate IF functions per-submission to create arrays for aggregation
   * This handles SUM(IF(...)) by evaluating IF for each submission index
   */
  evaluateConditionalFunctionsPerSubmission(formula, fieldData) {
    let processed = formula;
    let changed = true;
    let iterations = 0;
    const maxIterations = 10;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      // Find IF(condition, trueValue, falseValue) patterns that are inside aggregation functions
      const ifRegex = /\bIF\s*\(/gi;
      let match;

      while ((match = ifRegex.exec(processed)) !== null) {
        const startIndex = match.index;
        const ifStart = startIndex + 3; // After "IF("
        
        // Find matching closing parenthesis
        let depth = 1;
        let i = ifStart;
        let endIndex = -1;

        while (i < processed.length && depth > 0) {
          if (processed[i] === '(') depth++;
          if (processed[i] === ')') depth--;
          if (depth === 0) {
            endIndex = i;
            break;
          }
          i++;
        }

        if (endIndex === -1) {
          break;
        }

        // Check if this IF is inside an aggregation function (SUM, AVG, etc.)
        const beforeIf = processed.substring(0, startIndex);
        const aggregationMatch = beforeIf.match(/\b(SUM|AVG|COUNT|MIN|MAX)\s*\([^)]*$/);
        
        if (aggregationMatch) {
          // Extract IF arguments
          const content = processed.substring(ifStart, endIndex);
          const args = this.parseFunctionArgs(content);
          
          if (args.length >= 3) {
            const condition = args[0].trim();
            const trueValue = args[1].trim();
            const falseValue = args[2].trim();

            // Parse condition: field_name = 'value'
            const conditionMatch = condition.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*(=|!=|>|<|>=|<=)\s*(.+)$/);
            
            if (conditionMatch) {
              const [, fieldName, operator, value] = conditionMatch;
              const conditionValue = value.replace(/['"]/g, ''); // Remove quotes
              
              // Get field arrays
              const conditionFieldValues = fieldData[fieldName] || [];
              const trueFieldValues = fieldData[trueValue] || [];
              const falseValueNum = Number(falseValue) || 0;
              
              // Determine max length
              const maxLength = Math.max(
                conditionFieldValues.length,
                trueFieldValues.length,
                Array.isArray(trueFieldValues) ? trueFieldValues.length : 0
              );
              
              // Evaluate IF for each submission index
              const resultArray = [];
              for (let idx = 0; idx < maxLength; idx++) {
                const conditionVal = conditionFieldValues[idx];
                let conditionResult = false;
                
                if (conditionVal !== undefined && conditionVal !== null) {
                  const strVal = String(conditionVal);
                  switch (operator) {
                    case '=':
                    case '==':
                      conditionResult = strVal === conditionValue;
                      break;
                    case '!=':
                      conditionResult = strVal !== conditionValue;
                      break;
                    default:
                      conditionResult = false;
                  }
                }
                
                if (conditionResult) {
                  // Use value from trueValue field (or the trueValue itself if it's a number)
                  const trueVal = trueFieldValues[idx];
                  resultArray.push(Number(trueVal) || 0);
                } else {
                  resultArray.push(falseValueNum);
                }
              }
              
              // Create a synthetic field name for this IF result
              const syntheticFieldName = `__if_result_${startIndex}`;
              fieldData[syntheticFieldName] = resultArray;
              
              // Replace IF(...) with the synthetic field name
              processed = processed.substring(0, startIndex) + syntheticFieldName + processed.substring(endIndex + 1);
              changed = true;
              break; // Restart search
            }
          }
        }
      }
    }

    return processed;
  }

  /**
   * Evaluate conditional functions like IF() for single value evaluation
   */
  evaluateConditionalFunctions(formula, fieldData) {
    let processed = formula;
    let changed = true;
    let iterations = 0;
    const maxIterations = 10;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      // Find IF(condition, trueValue, falseValue) patterns
      const ifRegex = /\bIF\s*\(/gi;
      let match;

      while ((match = ifRegex.exec(processed)) !== null) {
        const startIndex = match.index;
        const ifStart = startIndex + 3; // After "IF("
        
        // Find matching closing parenthesis
        let depth = 1;
        let i = ifStart;
        let endIndex = -1;

        while (i < processed.length && depth > 0) {
          if (processed[i] === '(') depth++;
          if (processed[i] === ')') depth--;
          if (depth === 0) {
            endIndex = i;
            break;
            }
          i++;
        }

        if (endIndex === -1) {
          break;
        }

        // Extract IF arguments
        const content = processed.substring(ifStart, endIndex);
        const args = this.parseFunctionArgs(content);
        
        if (args.length >= 3) {
          const condition = args[0].trim();
          const trueValue = args[1].trim();
          const falseValue = args[2].trim();

          // Evaluate condition (simple equality check for now)
          // Format: field_name = 'value' or field_name != 'value'
          const conditionMatch = condition.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*(=|!=|>|<|>=|<=)\s*(.+)$/);
          
          if (conditionMatch) {
            const [, fieldName, operator, value] = conditionMatch;
            const fieldValues = fieldData[fieldName];
            const conditionValue = value.replace(/['"]/g, ''); // Remove quotes
            
            // Evaluate condition
            let conditionResult = false;
            if (fieldValues && Array.isArray(fieldValues) && fieldValues.length > 0) {
              // Check if any value matches condition
              conditionResult = fieldValues.some(val => {
                const strVal = String(val);
                switch (operator) {
                  case '=':
                  case '==':
                    return strVal === conditionValue;
                  case '!=':
                    return strVal !== conditionValue;
                  default:
                    return false; // Only support equality for now
                }
              });
            }

            const replacement = conditionResult ? trueValue : falseValue;
            processed = processed.substring(0, startIndex) + replacement + processed.substring(endIndex + 1);
            changed = true;
            break;
          }
        }
      }
    }

    return processed;
  }

  /**
   * Parse function arguments handling nested parentheses and quotes
   */
  parseFunctionArgs(content) {
    const args = [];
    let currentArg = '';
    let depth = 0;
    let inQuotes = false;
    let quoteChar = null;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      
      if ((char === '"' || char === "'") && (i === 0 || content[i - 1] !== '\\')) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
          currentArg += char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = null;
          currentArg += char;
        } else {
          currentArg += char;
        }
      } else if (!inQuotes && char === '(') {
        depth++;
        currentArg += char;
      } else if (!inQuotes && char === ')') {
        depth--;
        currentArg += char;
      } else if (!inQuotes && depth === 0 && char === ',') {
        args.push(currentArg.trim());
        currentArg = '';
      } else {
        currentArg += char;
      }
    }

    if (currentArg.trim()) {
      args.push(currentArg.trim());
    }

    return args;
  }

  /**
   * Simplify formula by removing redundant operations
   * Example: (x * y / 100) / x * 100 = y
   */
  simplifyFormula(formula) {
    try {
      // Pattern: (field1 * field2 / constant) / field1 * constant = field2
      // Match: (field * something / num) / field * num
      const simplificationPattern = /\(([a-zA-Z_][a-zA-Z0-9_]*)\s*\*\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\/\s*(\d+)\)\s*\/\s*\1\s*\*\s*\3/g;
      
      let simplified = formula;
      let changed = true;
      let iterations = 0;
      
      while (changed && iterations < 10) {
        changed = false;
        iterations++;
        
        // Try to simplify: (field1 * field2 / num) / field1 * num = field2
        const match = simplificationPattern.exec(simplified);
        if (match) {
          const field1 = match[1];
          const field2 = match[2];
          const num = match[3];
          
          // Replace the entire pattern with just field2
          simplified = simplified.replace(match[0], field2);
          changed = true;
          console.log(`📐 Simplified formula: ${match[0]} → ${field2}`);
        }
        
        // Reset regex lastIndex
        simplificationPattern.lastIndex = 0;
      }
      
      return simplified;
    } catch (error) {
      console.warn('Error simplifying formula:', error);
      return formula; // Return original if simplification fails
    }
  }

  /**
   * Extract fields that are used as denominators in division operations
   */
  extractDenominatorFields(formula, fieldData) {
    const denominatorFields = [];
    // Find all division operations: / fieldName or / (expression)
    const divisionPattern = /\/(\s*\([^)]+\)|\s*([a-zA-Z_][a-zA-Z0-9_]*))/g;
    let match;
    
    while ((match = divisionPattern.exec(formula)) !== null) {
      const denominator = match[1].trim();
      // Remove parentheses if present
      const cleanDenominator = denominator.replace(/^\(|\)$/g, '');
      
      // Check if this matches any field name
      Object.keys(fieldData).forEach(fieldName => {
        if (cleanDenominator === fieldName || formula.includes(`/${fieldName}`)) {
          if (!denominatorFields.includes(fieldName)) {
            denominatorFields.push(fieldName);
          }
        }
      });
    }
    
    return denominatorFields;
  }

  /**
   * Escape special regex characters
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Execute pipelined aggregation
   * @param {Array} pipeline - Pipeline stages array
   * @param {Array} submissions - Form submissions
   * @param {Object} fieldMappings - Field mappings
   * @returns {*} Result of pipeline execution
   */
  executePipeline(pipeline, submissions, fieldMappings) {
    if (!pipeline || pipeline.length === 0) {
      throw new Error('Pipeline is empty');
    }

    let currentData = submissions;

    // Execute each stage in sequence
    for (const stage of pipeline) {
      currentData = this.executePipelineStage(stage, currentData, fieldMappings);
    }

    return currentData;
  }

  /**
   * Execute a single pipeline stage
   */
  executePipelineStage(stage, data, fieldMappings) {
    const stageType = stage.stage || stage.type;

    switch (stageType) {
      case 'match':
      case 'filter':
        return this.executeMatchStage(stage, data);
      
      case 'group':
      case 'groupBy':
        return this.executeGroupStage(stage, data, fieldMappings);
      
      case 'project':
      case 'select':
        return this.executeProjectStage(stage, data);
      
      case 'sort':
        return this.executeSortStage(stage, data);
      
      case 'limit':
        return this.executeLimitStage(stage, data);
      
      case 'aggregate':
        return this.executeAggregateStage(stage, data, fieldMappings);
      
      default:
        throw new Error(`Unknown pipeline stage type: ${stageType}`);
    }
  }

  /**
   * Execute match/filter stage
   */
  executeMatchStage(stage, data) {
    if (!this.fieldEvaluator) {
      throw new Error('Field evaluator not set');
    }

    const filters = stage.filters || stage.criteria || [];
    return this.fieldEvaluator.filterSubmissions(data, filters);
  }

  /**
   * Execute group stage
   */
  executeGroupStage(stage, data, fieldMappings) {
    if (!this.fieldEvaluator) {
      throw new Error('Field evaluator not set');
    }

    const groupByField = stage.by || stage.groupBy || stage.field;
    if (!groupByField) {
      throw new Error('Group stage requires "by" field');
    }

    // Find field type from mappings
    const fieldType = this.findFieldType(groupByField, fieldMappings);
    
    // Group submissions
    const groups = this.fieldEvaluator.groupByField(data, groupByField, fieldType);
    
    // Apply aggregations if specified
    const aggregations = stage.aggregations || stage.agg || {};
    const result = [];

    Object.keys(groups).forEach(groupKey => {
      const groupData = groups[groupKey];
      const groupResult = {
        _id: groupKey === '__null__' ? null : groupKey,
        count: groupData.length
      };

      // Apply aggregations
      Object.keys(aggregations).forEach(aggName => {
        const aggConfig = aggregations[aggName];
        const aggType = aggConfig.type || aggConfig.function || 'SUM';
        const aggField = aggConfig.field || aggConfig.fieldId;

        // Extract values for aggregation
        const values = groupData.map(sub => {
          const fieldType = this.findFieldType(aggField, fieldMappings);
          return this.fieldEvaluator.getFieldValue(sub, aggField, fieldType);
        }).filter(v => v !== null && v !== undefined);

        // Apply aggregation
        switch (aggType.toUpperCase()) {
          case 'SUM':
            groupResult[aggName] = values.reduce((sum, val) => sum + (Number(val) || 0), 0);
            break;
          case 'AVG':
          case 'AVERAGE':
            const sum = values.reduce((s, val) => s + (Number(val) || 0), 0);
            groupResult[aggName] = values.length > 0 ? sum / values.length : 0;
            break;
          case 'COUNT':
            groupResult[aggName] = values.length;
            break;
          case 'MIN':
            groupResult[aggName] = values.length > 0 ? Math.min(...values.map(v => Number(v) || 0)) : 0;
            break;
          case 'MAX':
            groupResult[aggName] = values.length > 0 ? Math.max(...values.map(v => Number(v) || 0)) : 0;
            break;
          case 'DISTINCT':
            groupResult[aggName] = new Set(values).size;
            break;
          default:
            groupResult[aggName] = 0;
        }
      });

      result.push(groupResult);
    });

    return result;
  }

  /**
   * Execute project/select stage
   */
  executeProjectStage(stage, data) {
    const fields = stage.fields || stage.select || [];
    if (fields.length === 0) {
      return data;
    }

    return data.map(item => {
      const projected = {};
      fields.forEach(field => {
        if (typeof field === 'string') {
          projected[field] = item[field] || item.data?.[field];
        } else if (typeof field === 'object') {
          // Handle field aliasing: { field: "original", as: "alias" }
          const sourceField = field.field || field.from;
          const alias = field.as || field.to || sourceField;
          projected[alias] = item[sourceField] || item.data?.[sourceField];
        }
      });
      return projected;
    });
  }

  /**
   * Execute sort stage
   */
  executeSortStage(stage, data) {
    const sortField = stage.field || stage.sortBy;
    const sortOrder = stage.order || stage.direction || 'asc';

    if (!sortField) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aVal = a[sortField] || a.data?.[sortField];
      const bVal = b[sortField] || b.data?.[sortField];
      
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder.toLowerCase() === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Execute limit stage
   */
  executeLimitStage(stage, data) {
    const limit = stage.limit || stage.count || 10;
    return data.slice(0, limit);
  }

  /**
   * Execute aggregate stage (final aggregation)
   */
  executeAggregateStage(stage, data, fieldMappings) {
    const aggregations = stage.aggregations || stage.agg || {};
    const result = {};

    Object.keys(aggregations).forEach(aggName => {
      const aggConfig = aggregations[aggName];
      const aggType = aggConfig.type || aggConfig.function || 'SUM';
      const aggField = aggConfig.field || aggConfig.fieldId;

      // Extract values
      const values = data.map(item => {
        const fieldType = this.findFieldType(aggField, fieldMappings);
        return this.fieldEvaluator.getFieldValue(item, aggField, fieldType);
      }).filter(v => v !== null && v !== undefined);

      // Apply aggregation
      switch (aggType.toUpperCase()) {
        case 'SUM':
          result[aggName] = values.reduce((sum, val) => sum + (Number(val) || 0), 0);
          break;
        case 'AVG':
        case 'AVERAGE':
          const sum = values.reduce((s, val) => s + (Number(val) || 0), 0);
          result[aggName] = values.length > 0 ? sum / values.length : 0;
          break;
        case 'COUNT':
          result[aggName] = values.length;
          break;
        case 'MIN':
          result[aggName] = values.length > 0 ? Math.min(...values.map(v => Number(v) || 0)) : 0;
          break;
        case 'MAX':
          result[aggName] = values.length > 0 ? Math.max(...values.map(v => Number(v) || 0)) : 0;
          break;
        default:
          result[aggName] = 0;
      }
    });

    return result;
  }

  /**
   * Find field type from mappings
   */
  findFieldType(fieldId, fieldMappings) {
    if (!fieldMappings) return 'text';

    // Search in variable mappings
    for (const variable of Object.values(fieldMappings)) {
      if (variable.fieldId === fieldId) {
        return variable.fieldType || 'text';
      }
    }

    return 'text';
  }

  /**
   * Format result based on output type
   */
  formatResult(value, outputType = 'number', displayFormat = null) {
    if (value === null || value === undefined) {
      return 0;
    }

    const numValue = Number(value);

    switch (outputType) {
      case 'percentage':
        if (displayFormat) {
          return this.formatNumber(numValue * 100, displayFormat) + '%';
        }
        return (numValue * 100).toFixed(2) + '%';
      
      case 'currency':
        if (displayFormat) {
          return this.formatNumber(numValue, displayFormat);
        }
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(numValue);
      
      case 'number':
        if (displayFormat) {
          return this.formatNumber(numValue, displayFormat);
        }
        return numValue;
      
      case 'date':
        return new Date(value).toISOString();
      
      case 'text':
      default:
        return String(value);
    }
  }

  /**
   * Format number with custom format string
   */
  formatNumber(value, format) {
    // Simple format implementation
    // Format examples: "$0,0.00", "0.00%", "0,0"
    if (format.includes('$')) {
      return '$' + value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
    if (format.includes('%')) {
      return (value * 100).toFixed(2) + '%';
    }
    return value.toLocaleString('en-US');
  }

  /**
   * Validate formula syntax
   */
  validateFormula(formula) {
    try {
      // Test with dummy data
      const testData = { test_field: [1, 2, 3] };
      this.processFormula(formula, testData, {});
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
}

export default new FormulaExecutor();

