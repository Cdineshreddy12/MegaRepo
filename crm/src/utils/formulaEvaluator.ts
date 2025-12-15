/**
 * Lightweight client-side formula evaluator for form field calculations
 * Supports basic math operations and field references
 */

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Normalize field reference (label or ID) to field ID
 * Creates a mapping from labels to IDs for formula evaluation
 */
function normalizeFieldReference(
  fieldRef: string,
  fieldLabelToIdMap: Record<string, string>
): string {
  // If it's already a field ID, return as is
  if (fieldRef.startsWith('field-')) {
    return fieldRef;
  }
  
  // Check if it's a label (normalized: lowercase, spaces to underscores)
  const normalizedLabel = fieldRef.toLowerCase().replace(/\s+/g, '_');
  const fieldId = fieldLabelToIdMap[normalizedLabel] || fieldLabelToIdMap[fieldRef];
  
  return fieldId || fieldRef; // Return original if not found
}

/**
 * Evaluate a formula expression with field values
 * @param formula - Formula string (e.g., "Annual Revenue * Profitability Margin / 100" or "field1 * field2 / 100")
 * @param fieldValues - Object with field IDs as keys and values
 * @param fieldLabelToIdMap - Optional mapping from field labels to field IDs
 * @param options - Optional evaluation options
 * @returns Calculated result or null if invalid or if required fields are missing
 */
export function evaluateFormula(
  formula: string,
  fieldValues: Record<string, any>,
  fieldLabelToIdMap?: Record<string, string>,
  options?: { treatEmptyAsZero?: boolean; fieldIdToLabelMap?: Record<string, string> }
): number | null {
  const treatEmptyAsZero = options?.treatEmptyAsZero ?? false; // Default to false - don't treat empty as zero
  const fieldIdToLabelMap = options?.fieldIdToLabelMap; // Reverse map: ID -> label for percentage detection
  if (!formula || typeof formula !== 'string' || formula.trim() === '') {
    return null;
  }

  try {
    // Replace field references with their values
    let processedFormula = formula.trim();
    
    // First, validate formula syntax - check for incomplete operations
    // Check for operators followed by closing paren, opening paren followed by operators, or operators at end
    // Specifically check for division operator followed by closing paren (incomplete division)
    if (processedFormula.match(/\/\s*\)/) || 
        processedFormula.match(/\/\s*$/) ||
        processedFormula.match(/[+\-*/]\s*\)/) || 
        processedFormula.match(/\(\s*[+\-*/]/) || 
        processedFormula.match(/[+\-*/]\s*$/)) {
      console.warn('[evaluateFormula] Formula has syntax error - incomplete operation:', processedFormula);
      // Try to fix common issues: division operator before closing paren
      // Replace "/ )" with "/ 100 )" if it's part of a percentage calculation pattern
      processedFormula = processedFormula.replace(/\/(\s*\))/g, '/ 100$1');
      // If still has issues, return null
      if (processedFormula.match(/\/\s*\)/) || processedFormula.match(/\/\s*$/)) {
        console.warn('[evaluateFormula] Could not fix formula syntax error');
        return null;
      }
      console.log('[evaluateFormula] Fixed formula syntax:', processedFormula);
    }
    
    // Build a comprehensive map of all possible field references
    // This ensures we can match fields regardless of how they're referenced in the formula
    const fieldReferenceMap = new Map<string, string>(); // reference -> actual field ID in fieldValues
    
    // Step 1: Add all field IDs from fieldValues (these are the source of truth)
    // Build a reverse map: for each value, find all keys that map to it
    const valueToKeysMap = new Map<any, Set<string>>();
    Object.entries(fieldValues).forEach(([key, value]) => {
      if (!valueToKeysMap.has(value)) {
        valueToKeysMap.set(value, new Set());
      }
      valueToKeysMap.get(value)!.add(key);
    });

    // Also create a map of normalized field names for better matching
    const normalizedFieldMap = new Map<string, string>();
    Object.keys(fieldValues).forEach(fieldId => {
      const normalized = fieldId.toLowerCase().replace(/^field-/, '').replace(/[^a-z0-9]/g, '');
      if (!normalizedFieldMap.has(normalized)) {
        normalizedFieldMap.set(normalized, fieldId);
      }
    });
    
    // For each field ID, create all possible reference variations
    // IMPORTANT: Each field maps to itself, NOT to other fields with the same value
    // Group field ID variations (field-X and X) together, but keep different fields separate
    const processedFieldIds = new Set<string>();
    
    Object.keys(fieldValues).forEach(fieldId => {
      // Skip if we've already processed this field or its variation
      if (processedFieldIds.has(fieldId)) return;
      
      // Determine canonical ID (prefer field-X format if both exist)
      let canonicalId = fieldId;
      
      if (fieldId.startsWith('field-')) {
        const withoutPrefix = fieldId.replace(/^field-/, '');
        if (fieldValues.hasOwnProperty(withoutPrefix)) {
          // Both field-X and X exist - use field-X as canonical
          canonicalId = fieldId;
          processedFieldIds.add(withoutPrefix); // Mark variation as processed
        }
      } else {
        const withPrefix = `field-${fieldId}`;
        if (fieldValues.hasOwnProperty(withPrefix)) {
          // Both X and field-X exist - use field-X as canonical
          canonicalId = withPrefix;
          processedFieldIds.add(withPrefix); // Mark variation as processed
        }
      }
      
      processedFieldIds.add(fieldId);
      
      // Map this field ID to its canonical ID
      fieldReferenceMap.set(fieldId, canonicalId);
      
      // Add with/without field- prefix variations for the SAME field
      if (fieldId.startsWith('field-')) {
        const withoutPrefix = fieldId.replace(/^field-/, '');
        fieldReferenceMap.set(withoutPrefix, canonicalId);
      } else {
        const withPrefix = `field-${fieldId}`;
        fieldReferenceMap.set(withPrefix, canonicalId);
      }
    });
    
    // Step 2: Add label mappings if provided
    // CRITICAL: Add ALL case variations to ensure formulas work regardless of how AI generates them
    if (fieldLabelToIdMap) {
      Object.entries(fieldLabelToIdMap).forEach(([label, fieldId]) => {
        // Determine the actual field ID (with or without field- prefix)
        let actualFieldId = fieldId;
        if (!fieldId.startsWith('field-')) {
          actualFieldId = `field-${fieldId}`;
        }
        
        // Add mappings even if fieldValue doesn't exist yet (for calculated fields)
        // The field might be calculated later, so we need the mapping available
        
        // Add exact label as-is
          fieldReferenceMap.set(label, actualFieldId);
        
        // Add lowercase version
        const labelLower = label.toLowerCase();
        if (labelLower !== label) {
          fieldReferenceMap.set(labelLower, actualFieldId);
        }
        
        // Add title case version (first letter uppercase, rest lowercase)
        const labelTitle = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
        if (labelTitle !== label && labelTitle !== labelLower) {
          fieldReferenceMap.set(labelTitle, actualFieldId);
        }
          
          // Add normalized label (lowercase, spaces to underscores)
        const normalizedLabel = labelLower.replace(/\s+/g, '_');
        if (normalizedLabel !== label && normalizedLabel !== labelLower) {
            fieldReferenceMap.set(normalizedLabel, actualFieldId);
          }
          
        // Add label with spaces replaced by underscores (preserve original case)
          const underscoreLabel = label.replace(/\s+/g, '_');
          if (underscoreLabel !== label && underscoreLabel !== normalizedLabel) {
            fieldReferenceMap.set(underscoreLabel, actualFieldId);
          }
        
        // Add label with spaces replaced by underscores (lowercase)
        const underscoreLabelLower = labelLower.replace(/\s+/g, '_');
        if (underscoreLabelLower !== normalizedLabel && underscoreLabelLower !== labelLower) {
          fieldReferenceMap.set(underscoreLabelLower, actualFieldId);
        }
        
        // Add title case with underscores
        const underscoreLabelTitle = labelTitle.replace(/\s+/g, '_');
        if (underscoreLabelTitle !== underscoreLabel && underscoreLabelTitle !== underscoreLabelLower) {
          fieldReferenceMap.set(underscoreLabelTitle, actualFieldId);
        }
        
        // IMPORTANT: Do NOT add individual words from multi-word labels
        // This causes partial matches (e.g., "profit" and "ratio" instead of "Profit Ratio")
        // Individual words should only be matched if they're standalone fields, not parts of multi-word labels
      });
    }
    
    // Step 3: Extract all field references from the formula
    const fieldMatches = new Set<string>();
    // Track field IDs that should be excluded because they're part of a label match
    const excludedFieldIds = new Set<string>();
    // Track field ID + word combinations that map to labels (e.g., "1763874437351-ukf5g2kpt Ratio" -> "Discount Ratio")
    const fieldIdToLabelCombinations = new Map<string, string>(); // field ID + word -> label
    
    // Pattern 1: field- IDs (field-annualRevenue, field-1763874437351-ukf5g2kpt)
    // Use a more comprehensive pattern that matches the full field ID including complex IDs
    // IMPORTANT: Check if field ID + following word(s) matches a label before matching just the field ID
    const fieldIdPattern = /field-[a-zA-Z0-9_-]+/g;
    let match;
    fieldIdPattern.lastIndex = 0;
    const fieldIdMatches: Array<{match: string, index: number, endIndex: number}> = [];
    while ((match = fieldIdPattern.exec(processedFormula)) !== null) {
      fieldIdMatches.push({
        match: match[0],
        index: match.index,
        endIndex: match.index + match[0].length
      });
    }
    
    // Also check for field IDs without "field-" prefix (e.g., "1763874437351-ukf5g2kpt")
    const fieldIdWithoutPrefixPattern = /\b[a-zA-Z0-9_-]+-[a-zA-Z0-9_-]+/g;
    fieldIdWithoutPrefixPattern.lastIndex = 0;
    while ((match = fieldIdWithoutPrefixPattern.exec(processedFormula)) !== null) {
      // Skip if it's already matched as a field- ID
      const alreadyMatched = fieldIdMatches.some(fm => 
        fm.index <= match.index && fm.endIndex >= match.index + match[0].length
      );
      if (!alreadyMatched) {
        fieldIdMatches.push({
          match: match[0],
          index: match.index,
          endIndex: match.index + match[0].length
        });
      }
    }
    
    // Process field ID matches, checking for label matches first
    for (const {match: fullFieldId, index, endIndex} of fieldIdMatches) {
      // Check if field ID + following word(s) matches a label
      // Look ahead for potential label matches (e.g., "1763874437351-ukf5g2kpt Ratio" -> "Discount Ratio")
      const afterMatch = processedFormula.substring(endIndex);
      // Match one or more words after the field ID (up to 2 words to handle multi-word labels like "Discount Ratio")
      const nextWordsMatch = afterMatch.match(/^\s+([A-Za-z][A-Za-z0-9_-]+(?:\s+[A-Za-z][A-Za-z0-9_-]+)?)/);
      
      if (nextWordsMatch) {
        const followingWords = nextWordsMatch[1].trim();
        
        // Strategy 1: Check if field ID + following words directly matches a label
        const potentialLabel = (fullFieldId + ' ' + followingWords).trim();
        const potentialLabelLower = potentialLabel.toLowerCase();
        const potentialLabelNormalized = potentialLabelLower.replace(/\s+/g, '_');
        
        // Strategy 2: Check if the field ID maps to a label, and that label + following words matches another label
        // Example: 1763874437351-ukf5g2kpt -> "Discount", and "Discount" + "Ratio" -> "Discount Ratio"
        let fieldIdLabel = '';
        const fieldIdVariations = [
          fullFieldId,
          fullFieldId.startsWith('field-') ? fullFieldId.replace(/^field-/, '') : `field-${fullFieldId}`,
          fullFieldId.replace(/^field-/, ''),
          `field-${fullFieldId.replace(/^field-/, '')}`
        ];
        
        // Find what label this field ID maps to by checking fieldLabelToIdMap if available
        if (fieldLabelToIdMap) {
          // Reverse lookup: find label(s) that map to this field ID
          for (const [label, mappedFieldId] of Object.entries(fieldLabelToIdMap)) {
            const mappedVariations = [
              mappedFieldId,
              mappedFieldId.startsWith('field-') ? mappedFieldId.replace(/^field-/, '') : `field-${mappedFieldId}`,
              mappedFieldId.replace(/^field-/, ''),
              `field-${mappedFieldId.replace(/^field-/, '')}`
            ];
            
            // Check if any variation matches
            if (fieldIdVariations.some(fid => mappedVariations.includes(fid))) {
              // Use the first matching label (prefer exact case match)
              if (!fieldIdLabel || label === label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()) {
                fieldIdLabel = label;
              }
            }
          }
        }
        
        // Also check fieldReferenceMap for reverse lookup
        if (!fieldIdLabel) {
          for (const [reference, mappedFieldId] of fieldReferenceMap.entries()) {
            // Skip if reference is a field ID pattern
            if (reference.startsWith('field-') || reference.match(/^[a-zA-Z0-9_-]+-[a-zA-Z0-9_-]+$/)) {
              continue;
            }
            
            const mappedVariations = [
              mappedFieldId,
              mappedFieldId.startsWith('field-') ? mappedFieldId.replace(/^field-/, '') : `field-${mappedFieldId}`,
              mappedFieldId.replace(/^field-/, ''),
              `field-${mappedFieldId.replace(/^field-/, '')}`
            ];
            
            if (fieldIdVariations.some(fid => mappedVariations.includes(fid))) {
              fieldIdLabel = reference;
              break; // Use first match
            }
          }
        }
        
        // If we found a label for this field ID, try combining it with following words
        let combinedLabel = '';
        if (fieldIdLabel) {
          combinedLabel = (fieldIdLabel + ' ' + followingWords).trim();
        }
        
        // Check if either potential label matches an existing label
        let foundLabelMatch = false;
        let matchedLabel = '';
        for (const [label, mappedFieldId] of fieldReferenceMap.entries()) {
          // Skip field IDs in the map (only check actual labels)
          if (label.startsWith('field-') || label.match(/^[a-zA-Z0-9_-]+-[a-zA-Z0-9_-]+$/)) {
            continue;
          }
          
          const labelLower = label.toLowerCase();
          const labelNormalized = labelLower.replace(/\s+/g, '_');
          
          // Check direct match: field ID + words (unlikely but possible)
          if (labelLower === potentialLabelLower || labelNormalized === potentialLabelNormalized) {
            fieldMatches.add(label);
            foundLabelMatch = true;
            matchedLabel = label;
            break;
          }
          
          // Check combined match: field ID's label + words (e.g., "Discount" + "Ratio" -> "Discount Ratio")
          if (combinedLabel) {
            const combinedLabelLower = combinedLabel.toLowerCase();
            const combinedLabelNormalized = combinedLabelLower.replace(/\s+/g, '_');
            if (labelLower === combinedLabelLower || labelNormalized === combinedLabelNormalized) {
              fieldMatches.add(label);
              foundLabelMatch = true;
              matchedLabel = label;
              break;
            }
          }
        }
        
        if (foundLabelMatch) {
          // Mark this field ID and its variations as excluded so they won't be processed separately
          excludedFieldIds.add(fullFieldId);
          const withoutPrefix = fullFieldId.replace(/^field-/, '');
          excludedFieldIds.add(withoutPrefix);
          excludedFieldIds.add(fullFieldId.startsWith('field-') ? fullFieldId : `field-${fullFieldId}`);
          
          // Track the field ID + word combination that maps to this label
          // This allows us to replace "1763874437351-ukf5g2kpt Ratio" when replacing "Discount Ratio"
          const fieldIdWordCombination = (fullFieldId + ' ' + followingWords).trim();
          if (matchedLabel) {
            fieldIdToLabelCombinations.set(fieldIdWordCombination, matchedLabel);
            // Also add variations
            fieldIdToLabelCombinations.set((withoutPrefix + ' ' + followingWords).trim(), matchedLabel);
          }
          
          continue; // Skip adding the field ID match since we found a label match
        }
      }
      
      // Skip if this field ID is excluded (part of a label match)
      if (excludedFieldIds.has(fullFieldId)) {
        continue;
      }
      
      // No label match found - proceed with field ID matching
      // Try to find this reference in our map (exact match)
      if (fieldReferenceMap.has(fullFieldId)) {
        fieldMatches.add(fullFieldId);
      }

      // Also check without prefix
      const withoutPrefix = fullFieldId.replace(/^field-/, '');
      if (!excludedFieldIds.has(withoutPrefix) && fieldReferenceMap.has(withoutPrefix)) {
        fieldMatches.add(withoutPrefix);
      }

      // Also try to find any key in fieldReferenceMap that matches this field ID
      // This handles cases where the field ID format might vary
      fieldReferenceMap.forEach((actualFieldId, reference) => {
        if (!excludedFieldIds.has(reference) && (reference === fullFieldId || reference === withoutPrefix)) {
          fieldMatches.add(reference);
        }
      });

      // Try normalized matching for complex IDs
      const normalizedRef = fullFieldId.toLowerCase().replace(/^field-/, '').replace(/[^a-z0-9]/g, '');
      const normalizedMatch = normalizedFieldMap.get(normalizedRef);
      if (normalizedMatch && !excludedFieldIds.has(normalizedMatch)) {
        fieldMatches.add(normalizedMatch);
      }
    }
    
    // Pattern 2: Check for label matches (case-insensitive word boundaries)
    // Sort labels by length (longest first) to match "Total Profit" before "Profit"
    // IMPORTANT: Filter out single-word labels that are part of multi-word labels to avoid partial matches
    const allLabels = Array.from(fieldReferenceMap.keys())
      .filter(ref => !ref.startsWith('field-'))
      .sort((a, b) => b.length - a.length);
    
    // Filter out ambiguous single words that appear in multi-word labels
    const sortedLabels = allLabels.filter(label => {
      // If it's a single word, check if it's part of a longer label
      if (!label.includes(' ') && !label.includes('_')) {
        // Check if this word appears in any longer label
        const isPartOfLongerLabel = allLabels.some(longerLabel => 
          longerLabel !== label && 
          longerLabel.length > label.length &&
          (longerLabel.toLowerCase().includes(label.toLowerCase() + ' ') ||
           longerLabel.toLowerCase().includes(' ' + label.toLowerCase()) ||
           longerLabel.toLowerCase().includes('_' + label.toLowerCase()) ||
           longerLabel.toLowerCase().includes(label.toLowerCase() + '_'))
        );
        // Only include if it's NOT part of a longer label (to avoid partial matches)
        return !isPartOfLongerLabel;
      }
      return true; // Always include multi-word labels
    });
    
    // Track which parts of the formula have been matched to avoid double-matching
    const matchedRanges: Array<{start: number, end: number}> = [];
    
    for (const reference of sortedLabels) {
      // Skip if it's already a field ID pattern (we handled those above)
      if (reference.startsWith('field-')) continue;
      
      // Skip if this reference is excluded (part of a label match found in Pattern 1)
      // Check if this label's field ID is in the excluded list
      const labelFieldId = fieldReferenceMap.get(reference);
      if (labelFieldId && excludedFieldIds.has(labelFieldId)) {
        continue; // Skip this label if its field ID is excluded
      }
      
      // Also check if the reference itself is excluded (for field IDs that are also labels)
      if (excludedFieldIds.has(reference)) {
        continue;
      }
      
      // Create regex pattern for this reference (handle spaces, underscores, case-insensitive)
      // IMPORTANT: Use case-insensitive matching to handle any case variation (e.g., "Profit Ratio", "profit ratio", "PROFIT RATIO")
      const escapedRef = escapeRegex(reference);
      // Match the label with word boundaries, allowing spaces/underscores between words
      // Replace spaces with [\s_]+ to match both spaces and underscores
      // The 'gi' flags ensure case-insensitive matching
      const patternStr = escapedRef.replace(/\s+/g, '[\\s_]+').replace(/_/g, '[\\s_]+');
      const pattern = new RegExp(`\\b${patternStr}\\b`, 'gi');
      
      // Reset regex lastIndex and find all matches
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(processedFormula)) !== null) {
        const matchStart = match.index;
        const matchEnd = matchStart + match[0].length;
        
        // Check if this match overlaps with a previously matched range
        const overlaps = matchedRanges.some(range => 
          (matchStart >= range.start && matchStart < range.end) ||
          (matchEnd > range.start && matchEnd <= range.end) ||
          (matchStart <= range.start && matchEnd >= range.end)
        );
        
        if (!overlaps) {
        fieldMatches.add(reference);
          matchedRanges.push({start: matchStart, end: matchEnd});
      }
      }
    }
    
    // Debug: Log what we found
    if (process.env.NODE_ENV === 'development' && fieldMatches.size > 0) {
      console.log('[evaluateFormula] Found field references:', Array.from(fieldMatches));
      console.log('[evaluateFormula] Field reference map keys:', Array.from(fieldReferenceMap.keys()));
    }
    
    // Step 4: Replace each field reference with its numeric value
    // CRITICAL: Process field ID + word combinations FIRST, before individual field references
    // This prevents partial replacements (e.g., "field-1763874437351-ukf5g2kpt Ratio" should be replaced as a whole)
    
    // First, replace field ID + word combinations
    if (fieldIdToLabelCombinations.size > 0) {
      // Sort combinations by length (longest first) to avoid partial matches
      const sortedCombinations = Array.from(fieldIdToLabelCombinations.entries())
        .sort((a, b) => b[0].length - a[0].length);
      
      for (const [fieldIdWordCombo, mappedLabel] of sortedCombinations) {
        // Find the field ID that this combination maps to
        const mappedFieldId = fieldReferenceMap.get(mappedLabel);
        if (!mappedFieldId) continue;
        
        // Get the value for this field
        const value = fieldValues[mappedFieldId] ?? 
                     fieldValues[mappedLabel] ?? 
                     fieldValues[mappedLabel.toLowerCase()] ??
                     fieldValues[mappedLabel.replace(/\s+/g, '_')];
        
        if (value === undefined || value === null || value === '') {
          if (!treatEmptyAsZero) continue;
        }
        
        const numValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
        
        // Replace the field ID + word combination
        // CRITICAL: Escape the field ID part properly (it contains hyphens)
        const escapedCombo = escapeRegex(fieldIdWordCombo);
        // Don't use word boundaries for field IDs with hyphens - use a more specific pattern
        // Match the entire combination including spaces/underscores
        // Split the combination into field ID part and word part
        const parts = fieldIdWordCombo.split(/\s+/);
        if (parts.length >= 2) {
          const fieldIdPart = parts[0]; // e.g., "field-1763874437351-ukf5g2kpt"
          const wordPart = parts.slice(1).join(' '); // e.g., "Ratio"
          
          // Escape both parts
          const escapedFieldId = escapeRegex(fieldIdPart);
          const escapedWord = escapeRegex(wordPart);
          
          // Create a pattern that matches: fieldIdPart + space/underscore + wordPart
          // Use lookbehind/lookahead to ensure we're matching the whole thing
          // Pattern: fieldIdPart followed by whitespace/underscore followed by wordPart
          const comboPattern = `${escapedFieldId}[\\s_]+${escapedWord}`;
          const comboRegex = new RegExp(comboPattern, 'gi');
          
          const beforeReplace = processedFormula;
          processedFormula = processedFormula.replace(comboRegex, String(numValue));
          
          if (process.env.NODE_ENV === 'development' && beforeReplace !== processedFormula) {
            console.log(`[evaluateFormula] Replaced field ID combination "${fieldIdWordCombo}" (maps to "${mappedLabel}") with ${numValue}`);
            console.log(`[evaluateFormula] Formula: "${beforeReplace.substring(0, 150)}" -> "${processedFormula.substring(0, 150)}"`);
          }
        } else {
          // Fallback: use the original pattern if splitting doesn't work
          const comboPattern = escapedCombo.replace(/\s+/g, '[\\s_]+').replace(/_/g, '[\\s_]+');
          const comboRegex = new RegExp(comboPattern, 'gi');
          
          const beforeReplace = processedFormula;
          processedFormula = processedFormula.replace(comboRegex, String(numValue));
          
          if (process.env.NODE_ENV === 'development' && beforeReplace !== processedFormula) {
            console.log(`[evaluateFormula] Replaced field ID combination (fallback) "${fieldIdWordCombo}" (maps to "${mappedLabel}") with ${numValue}`);
          }
        }
        
        if (process.env.NODE_ENV === 'development' && beforeReplace !== processedFormula) {
          console.log(`[evaluateFormula] Replaced field ID combination "${fieldIdWordCombo}" (maps to "${mappedLabel}") with ${numValue}`);
          console.log(`[evaluateFormula] Formula: "${beforeReplace.substring(0, 150)}" -> "${processedFormula.substring(0, 150)}"`);
        }
      }
    }
    
    // Now process individual field references
    // Sort by length (longest first) to avoid partial replacements
    // Also filter out any references that are excluded
    const sortedReferences = Array.from(fieldMatches)
      .filter(ref => !excludedFieldIds.has(ref))
      .sort((a, b) => b.length - a.length);
    
    // Track which fields are missing/empty
    const missingFields: string[] = [];
    
    sortedReferences.forEach(reference => {
      const actualFieldId = fieldReferenceMap.get(reference);
      if (!actualFieldId) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[evaluateFormula] No mapping found for reference "${reference}"`);
        }
        if (!treatEmptyAsZero) {
          missingFields.push(reference);
        }
        return;
      }
      
      // Get value from fieldValues - try ALL variations of the field ID
      // This ensures we find the value even if it's stored under a different variation
      let value: any = undefined;
      
      // Build list of all possible keys to check for this field
      const keysToCheck = new Set<string>();
      
      // 1. Add the actual field ID (canonical)
      keysToCheck.add(actualFieldId);
      
      // 2. Add the reference itself
      keysToCheck.add(reference);
      
      // 3. Add variations with/without field- prefix
      if (actualFieldId.startsWith('field-')) {
        keysToCheck.add(actualFieldId.replace(/^field-/, ''));
      } else {
        keysToCheck.add(`field-${actualFieldId}`);
      }
      
      if (reference.startsWith('field-')) {
        keysToCheck.add(reference.replace(/^field-/, ''));
      } else {
        keysToCheck.add(`field-${reference}`);
      }
      
      // 4. Try normalized field name matching
      const normalizedRef = reference.toLowerCase().replace(/^field-/, '').replace(/[^a-z0-9]/g, '');
      const normalizedMatch = normalizedFieldMap.get(normalizedRef);
      if (normalizedMatch) {
        keysToCheck.add(normalizedMatch);
        if (normalizedMatch.startsWith('field-')) {
          keysToCheck.add(normalizedMatch.replace(/^field-/, ''));
        } else {
          keysToCheck.add(`field-${normalizedMatch}`);
        }
      }
      
      // 5. Also check for label variations if reference is a label (not a field ID)
      // This is critical for formulas that use labels like "Profit Ratio"
      if (fieldLabelToIdMap && !reference.startsWith('field-')) {
        // Check if reference matches any label (case-insensitive, with space/underscore variations)
        for (const [label, labelFieldId] of Object.entries(fieldLabelToIdMap)) {
          const refLower = reference.toLowerCase();
          const labelLower = label.toLowerCase();
          const refNormalized = refLower.replace(/\s+/g, '_');
          const labelNormalized = labelLower.replace(/\s+/g, '_');
          
          // Match if labels are the same (case-insensitive) or normalized versions match
          if (refLower === labelLower || refNormalized === labelNormalized ||
              refLower.replace(/\s+/g, '') === labelLower.replace(/\s+/g, '')) {
            // Add all label variations to keysToCheck
            keysToCheck.add(label); // Exact label
            keysToCheck.add(label.toLowerCase()); // Lowercase label
            keysToCheck.add(labelNormalized); // Normalized (lowercase, underscores)
            keysToCheck.add(label.replace(/\s+/g, '_')); // With underscores (preserve case)
            
            // Also add the field ID for this label (with all variations)
            const actualLabelFieldId = labelFieldId.startsWith('field-') ? labelFieldId : `field-${labelFieldId}`;
            keysToCheck.add(actualLabelFieldId);
            keysToCheck.add(labelFieldId);
            if (actualLabelFieldId.startsWith('field-')) {
              keysToCheck.add(actualLabelFieldId.replace(/^field-/, ''));
            } else {
              keysToCheck.add(`field-${actualLabelFieldId}`);
            }
          }
        }
      }
      
      // 6. Also add the reference itself with various transformations (for labels)
      if (!reference.startsWith('field-')) {
        keysToCheck.add(reference.toLowerCase());
        keysToCheck.add(reference.toLowerCase().replace(/\s+/g, '_'));
        keysToCheck.add(reference.replace(/\s+/g, '_'));
      }
      
      // Try all keys in order - use first non-undefined value found
      for (const key of keysToCheck) {
        if (fieldValues.hasOwnProperty(key)) {
          const candidateValue = fieldValues[key];
          // Only use if not undefined (empty string, null, 0 are valid values)
          if (candidateValue !== undefined) {
            value = candidateValue;
            if (process.env.NODE_ENV === 'development') {
              if (key !== actualFieldId && key !== reference) {
                console.log(`[evaluateFormula] Found value for "${reference}" via key "${key}" (canonical: "${actualFieldId}"):`, candidateValue);
              } else {
                console.log(`[evaluateFormula] Found value for "${reference}" (canonical: "${actualFieldId}"):`, candidateValue);
              }
            }
            break;
          }
        }
      }
      
      // Debug: Log if value not found
      if (process.env.NODE_ENV === 'development' && value === undefined) {
        console.log(`[evaluateFormula] Value not found for "${reference}" (canonical: "${actualFieldId}"). Checked keys:`, Array.from(keysToCheck));
        console.log(`[evaluateFormula] Available keys in fieldValues:`, Object.keys(fieldValues).filter(k => 
          k.includes('profitability') || k.includes('Profitability') || 
          k === actualFieldId || k === reference ||
          keysToCheck.has(k)
        ));
      }

      // Last resort: try to find a field with similar name/label using fuzzy matching
      if (value === undefined && fieldLabelToIdMap) {
        const referenceLower = reference.toLowerCase().replace(/^field-/, '');
        for (const [label, fieldId] of Object.entries(fieldLabelToIdMap)) {
          const labelLower = label.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
          // Check for substring match or levenshtein distance <= 2
          if (labelLower.includes(referenceLower) || referenceLower.includes(labelLower) ||
              levenshteinDistance(labelLower, referenceLower) <= 2) {
            if (fieldValues[fieldId] !== undefined) {
              value = fieldValues[fieldId];
              if (process.env.NODE_ENV === 'development') {
                console.log(`[evaluateFormula] Found field via fuzzy matching: "${reference}" -> "${fieldId}" (label: "${label}")`);
              }
              break;
            }
          }
        }
      }
      
      // Check if this might be a percentage field based on the field label
      // Use the reverse map (ID -> label) for direct lookup
      let isLikelyPercentage = false;
      let fieldLabel = '';
      
      // First, try to get label from reverse map (most reliable)
      if (fieldIdToLabelMap) {
        fieldLabel = fieldIdToLabelMap[actualFieldId] || 
                    fieldIdToLabelMap[actualFieldId.replace(/^field-/, '')] ||
                    fieldIdToLabelMap[`field-${actualFieldId}`] ||
                    fieldIdToLabelMap[reference] ||
                    fieldIdToLabelMap[reference.replace(/^field-/, '')] ||
                    fieldIdToLabelMap[`field-${reference}`] ||
                    '';
      }
      
      // Fallback: try to find label from forward map
      if (!fieldLabel && fieldLabelToIdMap) {
        // Find the field label that maps to this actualFieldId
        const entry = Object.entries(fieldLabelToIdMap).find(([label, id]) => 
          id === actualFieldId || 
          id === actualFieldId.replace(/^field-/, '') ||
          `field-${id}` === actualFieldId ||
          id === reference ||
          id === reference.replace(/^field-/, '') ||
          `field-${id}` === reference
        );
        if (entry) {
          fieldLabel = entry[0];
        }
      }
      
      // Check label for percentage keywords
      if (fieldLabel) {
        const labelLower = fieldLabel.toLowerCase();
        // Only normalize "discount" fields
        // Do NOT normalize: profitability margin, revenue, etc.
        const percentageKeywords = ['discount'];
        const excludeKeywords = ['profitability', 'margin', 'revenue', 'growth'];
        
        // If label contains exclude keywords, definitely don't normalize
        if (excludeKeywords.some(keyword => labelLower.includes(keyword))) {
          isLikelyPercentage = false;
        } else if (percentageKeywords.some(keyword => labelLower.includes(keyword))) {
          // Only normalize if it's a discount field
          isLikelyPercentage = true;
        }
      }
      
      // Fallback: check reference name directly (for complex IDs without label mapping)
      if (!isLikelyPercentage && !fieldLabel) {
        const referenceLower = reference.toLowerCase();
        // Only check for discount - be very conservative
        if (referenceLower.includes('discount') && 
            !referenceLower.includes('profitability') && 
            !referenceLower.includes('margin') &&
            !referenceLower.includes('revenue')) {
          isLikelyPercentage = true;
        }
      }
      
      // Check if field is empty/missing
      // A field is considered empty if it's undefined, null, empty string, or whitespace-only string
      const isEmpty = value === undefined || 
                     value === null || 
                     value === '' || 
                     (typeof value === 'string' && value.trim() === '');
      
      if (isEmpty && !treatEmptyAsZero) {
        missingFields.push(reference);
        if (process.env.NODE_ENV === 'development') {
          console.log(`[evaluateFormula] Field "${reference}" (mapped to "${actualFieldId}") is empty - will return null`);
        }
        return; // Skip replacement for empty fields - they'll remain in the formula
      }
      
      let numValue: number;
      
      if (!isEmpty) {
        // Try to parse as number
        if (typeof value === 'number') {
          numValue = isNaN(value) || !isFinite(value) ? 0 : value;
        } else {
          const strValue = String(value).trim();
          const parsed = parseFloat(strValue);
          // If parseFloat returns NaN, the value is not a valid number
          if (isNaN(parsed)) {
            // Not a valid number - treat as empty if not treating empty as zero
            if (!treatEmptyAsZero) {
              missingFields.push(reference);
              if (process.env.NODE_ENV === 'development') {
                console.log(`[evaluateFormula] Field "${reference}" has invalid number value: "${strValue}"`);
              }
              return; // Skip replacement
            }
            numValue = 0;
          } else {
            numValue = parsed;
          }
        }
        
        // Auto-normalize percentage fields: if value is in 0-100 range and field name suggests percentage,
        // divide by 100 to convert to decimal (e.g., 15% -> 0.15)
        // IMPORTANT: Only normalize "discount" fields. Do NOT normalize:
        // - Profitability Margin (used correctly as-is: revenue * margin / 100)
        // - Revenue Growth (might be used differently)
        // - Other percentage fields that are already in correct format
        if (isLikelyPercentage && numValue > 1 && numValue <= 100) {
          const oldValue = numValue;
          numValue = numValue / 100;
          if (process.env.NODE_ENV === 'development') {
            console.log(`[evaluateFormula] Auto-normalized percentage field "${reference}" (label check: ${isLikelyPercentage}): ${oldValue}% -> ${numValue}`);
          }
        } else if (process.env.NODE_ENV === 'development' && numValue > 1 && numValue <= 100) {
          // Debug: log why we're NOT normalizing
          console.log(`[evaluateFormula] NOT normalizing field "${reference}": value=${numValue}, isLikelyPercentage=${isLikelyPercentage}`);
        }
      } else {
        // Empty field - use 0 only if treatEmptyAsZero is true
        numValue = 0;
        if (process.env.NODE_ENV === 'development') {
          console.log(`[evaluateFormula] Field "${reference}" is empty, using 0 (treatEmptyAsZero=${treatEmptyAsZero})`);
        }
      }
      
      // Debug: Log replacement
      if (process.env.NODE_ENV === 'development') {
        console.log(`[evaluateFormula] Replacing "${reference}" (mapped to "${actualFieldId}") with ${numValue} (value was: ${value})`);
      }
      
      // Replace all occurrences of this reference (use word boundaries for exact match)
      // IMPORTANT: Handle labels with spaces/underscores - match them as whole units
      let escapedRef = escapeRegex(reference);
      let regex: RegExp;
      
      // If reference contains spaces or underscores, create a pattern that matches both spaces and underscores
      if (reference.includes(' ') || reference.includes('_')) {
        // Replace spaces and underscores with a pattern that matches both spaces and underscores
        escapedRef = escapedRef.replace(/\s+/g, '[\\s_]+').replace(/_/g, '[\\s_]+');
        // Use word boundaries but allow spaces/underscores within the label
        const pattern = `\\b${escapedRef}\\b`;
        regex = new RegExp(pattern, 'gi'); // Case-insensitive global
      } else {
        // Single word - use simple word boundary match
        regex = new RegExp(`\\b${escapedRef}\\b`, 'gi'); // Case-insensitive global
      }
      
      const beforeReplace = processedFormula;
      processedFormula = processedFormula.replace(regex, String(numValue));
      
      if (process.env.NODE_ENV === 'development' && beforeReplace !== processedFormula) {
        console.log(`[evaluateFormula] Replaced "${reference}" in formula: "${beforeReplace}" -> "${processedFormula}"`);
      }
    });
    
    // If there are missing fields and we're not treating empty as zero, return null
    if (missingFields.length > 0 && !treatEmptyAsZero) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[evaluateFormula] Cannot evaluate formula - missing/empty fields: ${missingFields.join(', ')}`);
        console.log(`[evaluateFormula] Available field keys: ${Object.keys(fieldValues).join(', ')}`);
        console.log(`[evaluateFormula] Field reference map keys: ${Array.from(fieldReferenceMap.keys()).join(', ')}`);
      }
      return null;
    }
    
    // Clean up any remaining field references (shouldn't happen, but safety check)
    // CRITICAL: Only replace field IDs that are NOT part of a word combination
    // Check if field ID is followed by a space and a word - if so, don't replace it here
    // (it should have been handled by the field ID + word combination replacement above)
    // Use negative lookahead to avoid matching field IDs followed by a space and a word
    processedFormula = processedFormula.replace(/field-[a-zA-Z0-9_-]+(?![A-Za-z])/g, '0');
    
    // Debug: Log processed formula
    if (process.env.NODE_ENV === 'development') {
      console.log('[evaluateFormula] Processed formula:', processedFormula);
    }
    
    // Validate the processed formula contains only safe characters
    const cleanedFormula = processedFormula.replace(/\s/g, '');
    if (!/^[0-9+\-*/().]+$/.test(cleanedFormula)) {
      console.warn('[evaluateFormula] Formula contains invalid characters after replacement:', processedFormula);
      return null;
    }
    
    // Check for division operator followed by closing paren (incomplete division)
    // This is a common error when building formulas - auto-fix if it's clearly a percentage calculation
    if (processedFormula.match(/\/\s*\)/)) {
      console.warn('[evaluateFormula] Detected incomplete division before closing paren, attempting auto-fix');
      // Try to fix: replace "/ )" with "/ 100 )" if it's in a percentage-like pattern
      const fixedFormula = processedFormula.replace(/\/(\s*\))/g, '/ 100$1');
      // Validate the fixed formula
      const fixedCleaned = fixedFormula.replace(/\s/g, '');
      if (!fixedCleaned.match(/\/\s*\)/) && /^[0-9+\-*/().]+$/.test(fixedCleaned)) {
        console.log('[evaluateFormula] Auto-fixed formula:', fixedFormula);
        processedFormula = fixedFormula;
        // Re-validate cleaned formula
        const newCleaned = processedFormula.replace(/\s/g, '');
        if (!/^[0-9+\-*/().]+$/.test(newCleaned)) {
          console.warn('[evaluateFormula] Fixed formula still invalid');
          return null;
        }
      } else {
        console.warn('[evaluateFormula] Could not auto-fix formula');
        return null;
      }
    }
    
    // Check for syntax errors like incomplete operations
    const cleanedAfterFix = processedFormula.replace(/\s/g, '');
    if (cleanedAfterFix.match(/[+\-*/]$/) || cleanedAfterFix.match(/^[+\-*/]/) || cleanedAfterFix.match(/[+\-*/]{2,}/)) {
      console.warn('[evaluateFormula] Formula has syntax error:', processedFormula);
      return null;
    }
    
    // Check for empty parentheses or invalid patterns
    if (cleanedAfterFix.includes('()') || cleanedAfterFix.match(/\([+\-*/]/) || cleanedAfterFix.match(/[+\-*/]\)/)) {
      console.warn('[evaluateFormula] Formula has invalid parentheses pattern:', processedFormula);
      return null;
    }
    
    // Evaluate using Function constructor (safe for math expressions only)
    try {
      const result = Function(`"use strict"; return (${processedFormula})`)();
      
      if (typeof result === 'number' && isFinite(result) && !isNaN(result)) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[evaluateFormula] Success! Result:', result, 'from formula:', processedFormula);
        }
        return result;
      }
      
      console.warn('[evaluateFormula] Formula evaluation returned invalid result:', result, 'Formula:', processedFormula);
      return null;
    } catch (error) {
      console.warn('[evaluateFormula] Formula evaluation error:', error, 'Formula:', processedFormula, 'Original:', formula);
      return null;
    }
  } catch (error) {
    console.error('Formula evaluation failed:', error, 'Formula:', formula);
    return null;
  }
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate formula syntax
 */
export function validateFormulaSyntax(formula: string, availableFields: string[]): {
  valid: boolean;
  error?: string;
  missingFields?: string[];
} {
  if (!formula || typeof formula !== 'string') {
    return { valid: false, error: 'Formula is empty' };
  }

  // Extract field references
  const fieldPattern = /field-([a-zA-Z0-9_-]+)/g;
  const referencedFields = new Set<string>();
  let match;
  
  while ((match = fieldPattern.exec(formula)) !== null) {
    referencedFields.add(match[0]);
    referencedFields.add(match[1]);
  }
  
  // Check for direct field references
  availableFields.forEach(fieldId => {
    if (formula.includes(fieldId)) {
      referencedFields.add(fieldId);
    }
  });
  
  // Check if all referenced fields are available
  const missingFields: string[] = [];
  referencedFields.forEach(fieldId => {
    if (!availableFields.includes(fieldId) && !availableFields.includes(fieldId.replace(/^field-/, ''))) {
      missingFields.push(fieldId);
    }
  });
  
  if (missingFields.length > 0) {
    return {
      valid: false,
      error: `Missing fields: ${missingFields.join(', ')}`,
      missingFields
    };
  }
  
  // Basic syntax validation
  const openParens = (formula.match(/\(/g) || []).length;
  const closeParens = (formula.match(/\)/g) || []).length;
  
  if (openParens !== closeParens) {
    return {
      valid: false,
      error: `Unbalanced parentheses: ${openParens} open, ${closeParens} close`
    };
  }
  
  // Check for invalid characters (only allow numbers, operators, parentheses, and field references)
  const invalidPattern = /[^0-9+\-*/().\sfield-]/i;
  if (invalidPattern.test(formula.replace(/field-[a-zA-Z0-9_-]+/g, ''))) {
    return {
      valid: false,
      error: 'Formula contains invalid characters'
    };
  }
  
  return { valid: true };
}

/**
 * Get all field IDs referenced in a formula
 * Supports both field IDs (field-xxx) and human-readable labels
 * @param formula - Formula string (may contain field IDs or labels)
 * @param fieldLabelToIdMap - Optional map from labels to field IDs for conversion
 */
export function getReferencedFields(
  formula: string,
  fieldLabelToIdMap?: Record<string, string>
): string[] {
  if (!formula || typeof formula !== 'string') {
    return [];
  }

  const fields = new Set<string>();
  
  // First, try to find field IDs matching the pattern field-xxx
  const fieldPattern = /field-([a-zA-Z0-9_-]+)/g;
  let match;
  
  while ((match = fieldPattern.exec(formula)) !== null) {
    fields.add(match[0]);
    fields.add(match[1]);
  }
  
  // If we have a label-to-ID map, also check for labels in the formula
  if (fieldLabelToIdMap && Object.keys(fieldLabelToIdMap).length > 0) {
    // Sort labels by length (longest first) to avoid partial matches
    const sortedLabels = Object.entries(fieldLabelToIdMap)
      .sort((a, b) => b[0].length - a[0].length);
    
    for (const [label, fieldId] of sortedLabels) {
      // Escape special regex characters in label
      const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Use word boundaries to match whole words only
      const regex = new RegExp(`\\b${escapedLabel}\\b`, 'g');
      
      if (regex.test(formula)) {
        // Add both the label and the corresponding field ID
        fields.add(label);
        fields.add(fieldId);
        // Also add with/without field- prefix
        if (fieldId.startsWith('field-')) {
          fields.add(fieldId.replace(/^field-/, ''));
        } else {
          fields.add(`field-${fieldId}`);
        }
      }
    }
  }
  
  return Array.from(fields);
}

/**
 * Convert field IDs in a formula to human-readable labels
 * @param formula - Formula string with field IDs (e.g., "field-annualRevenue * field-profitabilityMargin")
 * @param fieldIdToLabelMap - Map of field IDs to their labels
 * @returns Formula with field IDs replaced by labels (e.g., "Annual Revenue * Profitability Margin")
 */
export function formatFormulaWithLabels(
  formula: string | null | undefined,
  fieldIdToLabelMap: Record<string, string>
): string {
  // Handle non-string inputs
  if (!formula) return "";
  if (typeof formula !== "string") {
    console.warn("[formatFormulaWithLabels] Formula is not a string:", typeof formula, formula);
    return String(formula || "");
  }
  
  if (!fieldIdToLabelMap || Object.keys(fieldIdToLabelMap).length === 0) return formula;
  
  let formattedFormula = formula;
  
  // Build a comprehensive map of all field ID variations to labels
  const idToLabelMap = new Map<string, string>();
  
  // First, add direct mappings
  Object.entries(fieldIdToLabelMap).forEach(([id, label]) => {
    if (!label) return; // Skip if no label
    
    idToLabelMap.set(id, label);
    
    // Add variations: with/without field- prefix
    if (id.startsWith('field-')) {
      const withoutPrefix = id.replace(/^field-/, '');
      idToLabelMap.set(withoutPrefix, label);
      
      // Also handle complex IDs like field-1763874437351-ukf5g2kpt
      // Extract the numeric part after field- prefix
      const parts = id.split('-');
      if (parts.length > 2) {
        // field-1763874437351-ukf5g2kpt -> 1763874437351-ukf5g2kpt
        const withoutFieldPrefix = parts.slice(1).join('-');
        idToLabelMap.set(withoutFieldPrefix, label);
      }
    } else {
      idToLabelMap.set(`field-${id}`, label);
      
      // If id contains hyphens, also add variations
      if (id.includes('-')) {
        const parts = id.split('-');
        if (parts.length > 1) {
          // Add field- prefix version
          idToLabelMap.set(`field-${id}`, label);
        }
      }
    }
  });
  
  // Replace field IDs with labels
  // Sort by length (longest first) to avoid partial replacements
  // CRITICAL: Process longer IDs first to avoid replacing parts of longer IDs
  const sortedFieldIds = Array.from(idToLabelMap.keys())
    .filter(id => id.length > 0) // Filter out empty strings
    .sort((a, b) => {
      // Sort by length (longest first), then alphabetically for same length
      if (b.length !== a.length) return b.length - a.length;
      return a.localeCompare(b);
    });
  
  // Replace field IDs with labels
  // Process in order: longest IDs first to avoid partial replacements
  for (const fieldId of sortedFieldIds) {
    const label = idToLabelMap.get(fieldId);
    if (label && typeof formattedFormula === "string" && formattedFormula.includes(fieldId)) {
      // Escape special regex characters in fieldId
      const escapedFieldId = escapeRegex(fieldId);
      
      // Build regex pattern with word boundaries
      // Word boundaries work correctly for field IDs with hyphens
      const pattern = `\\b${escapedFieldId}\\b`;
      const regex = new RegExp(pattern, 'g');
      
      const beforeReplace = formattedFormula;
      formattedFormula = formattedFormula.replace(regex, label);
      
      // Debug: Log if replacement happened
      if (process.env.NODE_ENV === 'development' && beforeReplace !== formattedFormula) {
        console.log(`[formatFormulaWithLabels] Replaced "${fieldId}" with "${label}"`);
        console.log(`[formatFormulaWithLabels] Formula: "${beforeReplace.substring(0, 100)}" -> "${formattedFormula.substring(0, 100)}"`);
      }
    }
  }
  
  // Second pass: Handle any remaining field- patterns that might have been missed
  // This ensures we catch all field IDs, even complex ones
  const remainingFieldPattern = /field-[a-zA-Z0-9_-]+/g;
  let match;
  const processedIds = new Set<string>();
  
  while ((match = remainingFieldPattern.exec(formattedFormula)) !== null) {
    const fieldId = match[0];
    if (processedIds.has(fieldId)) continue; // Skip if already processed
    processedIds.add(fieldId);
    
    // Try to find label for this field ID
    let foundLabel: string | undefined;
    
    // Check exact match
    if (idToLabelMap.has(fieldId)) {
      foundLabel = idToLabelMap.get(fieldId);
    } else {
      // Check without field- prefix
      const withoutPrefix = fieldId.replace(/^field-/, '');
      if (idToLabelMap.has(withoutPrefix)) {
        foundLabel = idToLabelMap.get(withoutPrefix);
      } else {
        // Check if any key in the map matches this ID (fuzzy match)
        for (const [mapId, mapLabel] of idToLabelMap.entries()) {
          if (mapId === fieldId || mapId === withoutPrefix || 
              fieldId.includes(mapId) || mapId.includes(fieldId)) {
            // Check if this is a valid match (not a partial match)
            if (fieldId.endsWith(mapId) || mapId.endsWith(fieldId) || 
                fieldId === mapId || fieldId.replace(/^field-/, '') === mapId) {
              foundLabel = mapLabel;
              break;
            }
          }
        }
      }
    }
    
    if (foundLabel) {
      const escapedFieldId = escapeRegex(fieldId);
      const regex = new RegExp(`\\b${escapedFieldId}\\b`, 'g');
      formattedFormula = formattedFormula.replace(regex, foundLabel);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[formatFormulaWithLabels] Second pass: Replaced "${fieldId}" with "${foundLabel}"`);
      }
    }
  }
  
  return formattedFormula;
}

/**
 * Convert field ID references to human-readable labels
 * @param fieldIds - Array of field IDs (e.g., ["field-annualRevenue", "annualRevenue"])
 * @param fieldIdToLabelMap - Map of field IDs to their labels
 * @returns Array of human-readable labels, removing duplicates
 */
export function convertFieldIdsToLabels(
  fieldIds: string[],
  fieldIdToLabelMap: Record<string, string>
): string[] {
  if (!fieldIds || !fieldIdToLabelMap) return fieldIds;
  
  const labels = new Set<string>();
  
  for (const fieldId of fieldIds) {
    // Try exact match first
    if (fieldIdToLabelMap[fieldId]) {
      labels.add(fieldIdToLabelMap[fieldId]);
      continue;
    }
    
    // Try with/without field- prefix
    if (fieldId.startsWith('field-')) {
      const withoutPrefix = fieldId.replace(/^field-/, '');
      if (fieldIdToLabelMap[withoutPrefix]) {
        labels.add(fieldIdToLabelMap[withoutPrefix]);
        continue;
      }
    } else {
      const withPrefix = `field-${fieldId}`;
      if (fieldIdToLabelMap[withPrefix]) {
        labels.add(fieldIdToLabelMap[withPrefix]);
        continue;
      }
    }
    
    // If no label found, keep the original ID
    labels.add(fieldId);
  }
  
  return Array.from(labels);
}

