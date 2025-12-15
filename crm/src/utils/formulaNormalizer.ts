/**
 * Formula Normalization Utility
 * 
 * This utility ensures formulas are ALWAYS stored with field IDs internally,
 * while supporting human-readable labels for display and user input.
 * 
 * Key principles:
 * 1. Storage: Always use field IDs (e.g., "field-1763868813155-hz8ynncnm")
 * 2. Display: Convert IDs to human-readable labels (e.g., "Discount Ratio")
 * 3. Input: Accept labels or IDs, normalize to IDs before storage
 */

interface FieldInfo {
  id: string;
  label: string;
  type?: string;
}

/**
 * Build comprehensive label-to-ID mapping with all variations
 */
export function buildLabelToIdMap(fields: FieldInfo[]): Record<string, string> {
  const map: Record<string, string> = {};
  
  fields.forEach(field => {
    if (!field.label || !field.id) return;
    
    const label = field.label.trim();
    const id = field.id;
    
    // Add exact label
    map[label] = id;
    
    // Add case variations
    map[label.toLowerCase()] = id;
    map[label.toUpperCase()] = id;
    const titleCase = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
    if (titleCase !== label) {
      map[titleCase] = id;
    }
    
    // Add normalized versions (spaces to underscores)
    const normalized = label.toLowerCase().replace(/\s+/g, '_');
    map[normalized] = id;
    map[normalized.replace(/_/g, ' ')] = id;
    
    // Add field ID variations
    map[id] = id; // Self-reference
    if (id.startsWith('field-')) {
      const withoutPrefix = id.replace(/^field-/, '');
      map[withoutPrefix] = id;
    } else {
      map[`field-${id}`] = id;
    }
  });
  
  return map;
}

/**
 * Build ID-to-label mapping for display
 */
export function buildIdToLabelMap(fields: FieldInfo[]): Record<string, string> {
  const map: Record<string, string> = {};
  
  fields.forEach(field => {
    if (!field.label || !field.id) return;
    
    map[field.id] = field.label;
    
    // Add variations
    if (field.id.startsWith('field-')) {
      const withoutPrefix = field.id.replace(/^field-/, '');
      map[withoutPrefix] = field.label;
    } else {
      map[`field-${field.id}`] = field.label;
    }
  });
  
  return map;
}

/**
 * Normalize a formula to use field IDs only
 * This is the SINGLE SOURCE OF TRUTH for formula normalization
 */
export function normalizeFormulaToFieldIds(
  formula: string,
  fields: FieldInfo[]
): { normalizedFormula: string; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!formula || typeof formula !== 'string' || formula.trim() === '') {
    return { normalizedFormula: '', errors: ['Formula is empty'], warnings: [] };
  }
  
  let normalizedFormula = formula.trim();
  const labelToIdMap = buildLabelToIdMap(fields);
  const fieldIds = new Set(fields.map(f => f.id));
  
  // Step 1: Handle field ID + word combinations FIRST
  // Example: "field-1763874437351-ukf5g2kpt Ratio" -> "field-1763868813155-hz8ynncnm"
  const fieldIdWordPattern = /(field-)?(\d{13}-[a-z0-9]+)\s+([A-Za-z][A-Za-z0-9\s]*)/g;
  const fieldIdWordMatches: Array<{
    fullMatch: string;
    start: number;
    end: number;
    fieldIdPart: string;
    wordPart: string;
  }> = [];
  
  let match;
  while ((match = fieldIdWordPattern.exec(normalizedFormula)) !== null) {
    const fullMatch = match[0];
    const fieldIdPart = match[1] ? match[1] + match[2] : `field-${match[2]}`;
    const wordPart = match[3].trim();
    
    // Try to find a field that matches this combination
    const matchingField = fields.find(f => {
      const fieldIdWithoutPrefix = f.id.replace(/^field-/, '');
      const partialId = fieldIdPart.replace(/^field-/, '');
      
      if (fieldIdWithoutPrefix === partialId || f.id === fieldIdPart) {
        // Check if the word part matches the field's label
        const labelLower = (f.label || '').toLowerCase();
        const wordLower = wordPart.toLowerCase();
        const labelWords = labelLower.split(/[\s_]+/);
        
        return labelWords.includes(wordLower) || 
               labelLower.endsWith(wordLower) ||
               labelLower.includes(wordLower);
      }
      return false;
    });
    
    if (matchingField) {
      fieldIdWordMatches.push({
        fullMatch,
        start: match.index,
        end: match.index + fullMatch.length,
        fieldIdPart,
        wordPart
      });
    }
  }
  
  // Replace field ID + word combinations in reverse order
  fieldIdWordMatches.reverse().forEach(m => {
    const matchingField = fields.find(f => {
      const fieldIdWithoutPrefix = f.id.replace(/^field-/, '');
      const partialId = m.fieldIdPart.replace(/^field-/, '');
      return fieldIdWithoutPrefix === partialId || f.id === m.fieldIdPart;
    });
    
    if (matchingField) {
      normalizedFormula = normalizedFormula.substring(0, m.start) + 
                          matchingField.id + 
                          normalizedFormula.substring(m.end);
    }
  });
  
  // Step 2: Replace labels with field IDs (longest first to avoid partial matches)
  const sortedLabels = Object.entries(labelToIdMap)
    .filter(([label, id]) => label !== id && !label.startsWith('field-'))
    .sort((a, b) => b[0].length - a[0].length);
  
  const replacedRanges: Array<{ start: number; end: number }> = [];
  
  for (const [label, fieldId] of sortedLabels) {
    // Escape special regex characters
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Handle spaces/underscores in labels
    const patternStr = escapedLabel.replace(/\s+/g, '[\\s_]+').replace(/_/g, '[\\s_]+');
    const regex = new RegExp(`\\b${patternStr}\\b`, 'gi');
    
    // Find all matches
    const matches: Array<{ start: number; end: number; text: string }> = [];
    let regexMatch;
    while ((regexMatch = regex.exec(normalizedFormula)) !== null) {
      matches.push({
        start: regexMatch.index,
        end: regexMatch.index + regexMatch[0].length,
        text: regexMatch[0]
      });
    }
    
    // Replace matches in reverse order
    matches.reverse().forEach(m => {
      // Check if this range overlaps with any already replaced range
      const overlaps = replacedRanges.some(r => 
        (m.start >= r.start && m.start < r.end) ||
        (m.end > r.start && m.end <= r.end) ||
        (m.start <= r.start && m.end >= r.end)
      );
      
      if (!overlaps) {
        normalizedFormula = normalizedFormula.substring(0, m.start) + 
                           fieldId + 
                           normalizedFormula.substring(m.end);
        
        replacedRanges.push({ start: m.start, end: m.start + fieldId.length });
      }
    });
  }
  
  // Step 3: Validate all field references exist
  const fieldReferencePattern = /field-[a-zA-Z0-9_-]+/g;
  const referencedFieldIds = new Set<string>();
  let refMatch;
  while ((refMatch = fieldReferencePattern.exec(normalizedFormula)) !== null) {
    referencedFieldIds.add(refMatch[0]);
  }
  
  // Also check for field IDs without prefix
  const fieldIdWithoutPrefixPattern = /\b\d{13}-[a-z0-9]+\b/g;
  while ((refMatch = fieldIdWithoutPrefixPattern.exec(normalizedFormula)) !== null) {
    const withPrefix = `field-${refMatch[0]}`;
    if (fieldIds.has(withPrefix)) {
      referencedFieldIds.add(withPrefix);
      // Replace the ID without prefix with the one with prefix
      normalizedFormula = normalizedFormula.substring(0, refMatch.index) + 
                         withPrefix + 
                         normalizedFormula.substring(refMatch.index + refMatch[0].length);
    }
  }
  
  // Check for invalid field references
  referencedFieldIds.forEach(fieldId => {
    if (!fieldIds.has(fieldId)) {
      // Try to find a similar field
      const fieldIdWithoutPrefix = fieldId.replace(/^field-/, '');
      const similarField = fields.find(f => 
        f.id.replace(/^field-/, '') === fieldIdWithoutPrefix ||
        f.id === fieldId ||
        f.id === `field-${fieldIdWithoutPrefix}`
      );
      
      if (!similarField) {
        errors.push(`Field "${fieldId}" does not exist`);
      } else {
        warnings.push(`Field "${fieldId}" was corrected to "${similarField.id}"`);
        // Replace with correct field ID
        normalizedFormula = normalizedFormula.replace(
          new RegExp(`\\b${fieldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'),
          similarField.id
        );
      }
    }
  });
  
  // Step 4: Clean up any remaining invalid patterns
  // Remove standalone numbers that look like field IDs but aren't
  normalizedFormula = normalizedFormula.replace(/\b(\d{1,12})\b(?![a-z0-9-])/g, (match, num) => {
    // If it's a standalone number (not part of a field ID), keep it
    // But if it's followed by a word that might be part of a label, warn
    return match;
  });
  
  return {
    normalizedFormula: normalizedFormula.trim(),
    errors,
    warnings
  };
}

/**
 * Validate formula syntax and field references
 */
export function validateFormula(
  formula: string,
  fields: FieldInfo[]
): { valid: boolean; errors: string[]; warnings: string[]; normalizedFormula?: string } {
  const { normalizedFormula, errors, warnings } = normalizeFormulaToFieldIds(formula, fields);
  
  // Additional syntax validation
  const openParens = (formula.match(/\(/g) || []).length;
  const closeParens = (formula.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push(`Mismatched parentheses: ${openParens} open, ${closeParens} close`);
  }
  
  // Check for invalid characters after normalization
  // First, remove all field IDs (field- followed by alphanumeric and hyphens) to check remaining characters
  const cleanedFormula = normalizedFormula.replace(/\s/g, '');
  // Remove field IDs: field- followed by alphanumeric, hyphens, underscores
  const formulaWithoutFieldIds = cleanedFormula.replace(/field-[a-zA-Z0-9_-]+/g, '');
  // Also remove field IDs without prefix (timestamp-hash format)
  const formulaWithoutAnyIds = formulaWithoutFieldIds.replace(/\b\d{13}-[a-z0-9]+\b/g, '');
  
  // Now check for invalid characters (only operators, numbers, parentheses, and decimal points should remain)
  const invalidChars = formulaWithoutAnyIds.match(/[^0-9+\-*/().]/);
  if (invalidChars) {
    errors.push(`Invalid characters found: ${invalidChars[0]}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalizedFormula: errors.length === 0 ? normalizedFormula : undefined
  };
}

