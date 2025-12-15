/**
 * Analytics AI Service
 * Uses Groq AI to generate formulas, map fields, and provide insights
 */

import { Groq } from 'groq-sdk';

class AnalyticsAiService {
  constructor() {
    this.groq = null;
  }

  /**
   * Get or initialize Groq client
   */
  getGroqClient() {
    if (!this.groq) {
      // Check for both GROQ_API_KEY and GROK_API_KEY (common typo)
      const apiKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
      if (!apiKey) {
        throw new Error('GROQ_API_KEY (or GROK_API_KEY) environment variable is not set. Please configure it to use AI features.');
      }
      this.groq = new Groq({
        apiKey: apiKey
      });
    }
    return this.groq;
  }
  /**
   * Generate formula from natural language description
   * @param {String} description - Natural language description
   * @param {Object} formTemplate - Form template object
   * @param {String} industry - Industry type (optional)
   * @returns {Promise<Object>} Generated formula and mappings
   */
  async generateFormulaFromDescription(description, formTemplate, industry = null) {
    try {
      const prompt = this.buildFormulaGenerationPrompt(description, formTemplate, industry);
      const groq = this.getGroqClient();
      
      const response = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        max_completion_tokens: 2048
      });

      const aiResponse = response.choices[0]?.message?.content || "";
      return this.parseFormulaResponse(aiResponse, formTemplate);
    } catch (error) {
      console.error('AI formula generation error:', error);
      throw new Error(`AI formula generation failed: ${error.message}`);
    }
  }

  /**
   * Build comprehensive prompt for formula generation
   */
  buildFormulaGenerationPrompt(description, formTemplate, industry) {
    const availableFields = this.extractFieldInfo(formTemplate);
    const industryMetrics = industry ? this.getIndustryMetrics(industry) : null;

    // Build comprehensive field mapping with all context
    const fieldMappingDetails = availableFields.map(f => {
      let details = `ID: ${f.id} | Label: "${f.label}" | Type: ${f.type}`;
      if (f.description) details += ` | Description: ${f.description}`;
      if (f.placeholder) details += ` | Placeholder: ${f.placeholder}`;
      if (f.calculationFormula) details += ` | Calculated Field Formula: ${f.calculationFormula}`;
      if (f.options && f.options.length > 0) details += ` | Options: ${f.options.join(', ')}`;
      if (f.category) details += ` | Category: ${f.category}`;
      return details;
    }).join('\n');
    
    // Build label-to-ID mapping examples for AI
    const labelToIdExamples = availableFields
      .filter(f => f.label && f.label.trim())
      .map(f => `  "${f.label}" → ${f.id}`)
      .join('\n');

    return `
You are an analytics formula expert. Generate a formula based on the user's description.

USER REQUEST: "${description}"

FORM TEMPLATE CONTEXT:
- Template Name: ${formTemplate.name || 'Unnamed Template'}
- Entity Type: ${formTemplate.entityType || 'General'}
- Description: ${formTemplate.description || 'No description'}

AVAILABLE FORM FIELDS (COMPLETE CONTEXT - USE EXACT IDs ONLY):
${fieldMappingDetails}

FIELD LABEL TO ID MAPPING (for reference):
${labelToIdExamples}

${industry ? `\nINDUSTRY CONTEXT: ${industry}\nCOMMON METRICS FOR THIS INDUSTRY:\n${industryMetrics?.map(m => `- ${m.name}: ${m.formula}`).join('\n') || ''}` : ''}

CRITICAL FIELD MAPPING RULES:
1. When user mentions a field by its LABEL (e.g., "Annual Revenue", "Total Profit"), you MUST map it to the exact FIELD ID from the list above
2. Example mappings:
${availableFields.slice(0, 5).map(f => `   - User says "${f.label}" → Use field ID: ${f.id}`).join('\n')}
3. **IMPORTANT: CALCULATED FIELDS CAN BE USED IN FORMULAS**
   - Calculated fields are marked with "Type: calculated" in the field list above
   - If a calculated field exists, you CAN and SHOULD reference it using its field label (e.g., "Total Profit", "Total Net Profit")
   - Calculated fields show their formula in "Calculated Field Formula" - you can reference these fields just like regular fields
   - Example: If user wants "profit ratio based on Total Profit", use "Total Profit" (which is a calculated field) in the formula
4. Available calculated fields in this template:
${availableFields.filter(f => f.type === 'calculated').map(f => `   - "${f.label}" (${f.id}) - Formula: ${f.calculationFormula || 'N/A'}`).join('\n') || '   - No calculated fields available'}
5. You can combine calculated fields with regular fields in formulas (e.g., "(Total Profit / Annual Revenue) * 100")

FORMULA SYNTAX RULES:
- Use HUMAN-READABLE FIELD LABELS in formulas (e.g., "Annual Revenue", "Total Profit")
- Do NOT use field IDs like "field-xxx" - use the actual field labels from the list above
- Aggregations: SUM(), AVG(), COUNT(), MIN(), MAX(), DISTINCT()
- Math operators: +, -, *, /, %, ^
- Conditionals: IF(condition, trueValue, falseValue)
- Date functions: MONTH(), YEAR(), DATEDIFF()
- Parentheses for grouping: (expression)

FORMULA EXAMPLES (using human-readable labels):
- Simple: Annual Revenue * Profitability Margin / 100
- With aggregation: SUM(Annual Revenue) * 0.15
- Percentage: (Total Profit / Annual Revenue) * 100
- Conditional: IF(Account Status = 'active', Annual Revenue, 0)
- Referencing calculated fields: (Total Net Profit / Annual Revenue) * 100

REQUIREMENTS:
1. Return ONLY valid JSON in this format:
{
  "formula": "Annual Revenue * Profitability Margin / 100",
  "variableMappings": [
    {
      "variableName": "annualRevenue",
      "fieldId": "field-annualRevenue",
      "fieldType": "number",
      "aggregation": "NONE",
      "description": "Annual revenue amount"
    },
    {
      "variableName": "profitabilityMargin",
      "fieldId": "field-profitabilityMargin",
      "fieldType": "number",
      "aggregation": "NONE",
      "description": "Profitability margin percentage"
    }
  ],
  "formulaType": "simple",
  "outputType": "number",
  "displayFormat": "0.00"
}

2. CRITICAL: Use HUMAN-READABLE FIELD LABELS in the formula (e.g., "Annual Revenue", "Total Profit", "Total Net Profit")
3. Do NOT use field IDs like "field-xxx" in the formula - use the exact labels from the field list above
4. **CALCULATED FIELDS ARE AVAILABLE**: You can use calculated fields (marked as "Type: calculated") in your formulas
   - Example: If "Total Profit" is a calculated field, you can use it: "(Total Profit / Annual Revenue) * 100"
   - Calculated fields work exactly like regular fields in formulas
5. Map user's description to field labels - use the exact label text as shown in the field list
6. If user mentions a field that doesn't exist, try to find the closest match by label similarity
7. Ensure formula is syntactically correct and uses human-readable labels
8. Include ALL referenced fields (including calculated fields) in variableMappings array with their correct fieldId
9. The variableMappings should contain the fieldId (for internal use), but the formula itself should use labels
10. When referencing calculated fields, use their label (e.g., "Total Profit") not their ID

IMPORTANT: 
- The formula string should use human-readable labels like "Annual Revenue" or "Total Profit", NOT field IDs like "field-annualRevenue"
- Calculated fields can be referenced by their labels just like regular fields
- The system will automatically convert labels to field IDs internally

Return ONLY the JSON object, no markdown, no code blocks, no explanations.`;
  }

  /**
   * Parse AI response into structured formula object
   */
  parseFormulaResponse(aiResponse, formTemplate) {
    try {
      // Extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate formula
        let formula = parsed.formula || '';
        if (!formula || typeof formula !== 'string' || formula.trim() === '') {
          throw new Error('AI generated an empty formula');
        }

        // Basic syntax validation
        const openParens = (formula.match(/\(/g) || []).length;
        const closeParens = (formula.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
          console.warn(`Formula has mismatched parentheses: ${openParens} open, ${closeParens} close`);
        }

        // Convert human-readable labels to field IDs in the formula
        // AI generates formulas with labels, but we need field IDs for internal processing
        const availableFields = this.extractFieldInfo(formTemplate);
        const labelToIdMap = new Map();
        availableFields.forEach(field => {
          if (field.label) {
            labelToIdMap.set(field.label, field.id);
            // Also map normalized versions (lowercase, spaces to underscores)
            const normalizedLabel = field.label.toLowerCase().replace(/\s+/g, '_');
            labelToIdMap.set(normalizedLabel, field.id);
          }
        });
        
        // Convert labels to field IDs in formula
        // CRITICAL: Sort labels by length (longest first) to avoid partial replacements
        // Also handle multi-word labels and case variations
        const sortedLabels = Array.from(labelToIdMap.keys()).sort((a, b) => b.length - a.length);
        let formulaWithIds = formula;
        
        // Track which parts of the formula have been replaced to avoid double-replacement
        const replacedRanges = [];
        
        sortedLabels.forEach(label => {
          const fieldId = labelToIdMap.get(label);
          if (!fieldId || !formula.includes(label)) return;
          
          // Escape special regex characters in label
          const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          
          // Handle labels with spaces/underscores - match them as whole units
          let pattern = escapedLabel;
          if (label.includes(' ') || label.includes('_')) {
            // Replace spaces and underscores with a pattern that matches both
            pattern = escapedLabel.replace(/\s+/g, '[\\s_]+').replace(/_/g, '[\\s_]+');
          }
          
          // Use word boundaries but allow spaces/underscores within the label
          const regex = new RegExp(`\\b${pattern}\\b`, 'gi'); // Case-insensitive global
          
          // Find all matches and replace them
          let match;
          const matches = [];
          while ((match = regex.exec(formula)) !== null) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              text: match[0]
            });
          }
          
          // Replace matches in reverse order to preserve indices
          matches.reverse().forEach(m => {
            // Check if this range overlaps with any already replaced range
            const overlaps = replacedRanges.some(r => 
              (m.start >= r.start && m.start < r.end) ||
              (m.end > r.start && m.end <= r.end) ||
              (m.start <= r.start && m.end >= r.end)
            );
            
            if (!overlaps) {
              // Replace this occurrence
              formulaWithIds = formulaWithIds.substring(0, m.start) + 
                              fieldId + 
                              formulaWithIds.substring(m.end);
              
              // Track this replacement
              replacedRanges.push({ start: m.start, end: m.start + fieldId.length });
              
              if (process.env.NODE_ENV === 'development') {
                console.log(`🔄 Converting label to ID: "${m.text}" → "${fieldId}"`);
              }
            }
          });
        });
        
        // Update formula to use field IDs
        formula = formulaWithIds;
        
        // CRITICAL: Also handle field ID + word combinations that might have been missed
        // Example: "1763874437351-ukf5g2kpt Ratio" should become "field-1763868813155-hz8ynncnm"
        // This handles cases where AI might have generated partial field IDs
        const fieldIdPattern = /(\d{13}-[a-z0-9]+)\s+([A-Za-z]+)/g;
        let fieldIdMatch;
        while ((fieldIdMatch = fieldIdPattern.exec(formula)) !== null) {
          const partialFieldId = fieldIdMatch[1];
          const followingWord = fieldIdMatch[2];
          
          // Try to find a field that matches this pattern
          const matchingField = availableFields.find(f => {
            const fieldIdWithoutPrefix = f.id.replace(/^field-/, '');
            return fieldIdWithoutPrefix === partialFieldId || f.id === `field-${partialFieldId}`;
          });
          
          if (matchingField) {
            // Check if this field's label ends with the following word
            const fieldLabel = matchingField.label || '';
            const labelWords = fieldLabel.toLowerCase().split(/[\s_]+/);
            const followingWordLower = followingWord.toLowerCase();
            
            // If the following word matches part of the label, replace the whole thing
            if (labelWords.includes(followingWordLower) || fieldLabel.toLowerCase().endsWith(followingWordLower)) {
              const fullPattern = `${partialFieldId}\\s+${followingWord}`;
              const fullRegex = new RegExp(`\\b${fullPattern}\\b`, 'gi');
              formula = formula.replace(fullRegex, matchingField.id);
              
              if (process.env.NODE_ENV === 'development') {
                console.log(`🔄 Converting partial field ID + word: "${fieldIdMatch[0]}" → "${matchingField.id}"`);
              }
            }
          }
        }
        
        // Validate field IDs exist in form template
        const availableFieldIds = availableFields.map(f => f.id);
        
        // Validate formula contains only valid field IDs
        const formulaFieldIds = this.extractFieldIdsFromFormula(formula);
        const invalidFieldIds = formulaFieldIds.filter(id => !availableFieldIds.includes(id));
        
        if (invalidFieldIds.length > 0) {
          console.warn('⚠️ Formula contains invalid field IDs after conversion:', {
            invalidIds: invalidFieldIds,
            availableIds: availableFieldIds.slice(0, 10), // Log first 10 for debugging
            formula: formula.substring(0, 200),
            originalFormula: parsed.formula?.substring(0, 200)
          });
        }

        // Store original formula with labels before conversion (for display)
        const originalFormulaWithLabels = parsed.formula || formula;
        
        // Validate and normalize variable mappings
        const availableFieldsForMapping = this.extractFieldInfo(formTemplate);
        const normalizedMappings = (parsed.variableMappings || []).map(mapping => {
          // Validate fieldId exists in template
          let fieldId = mapping.fieldId;
          if (!availableFieldIds.includes(fieldId)) {
            // Try to find by label
            const matchingField = availableFieldsForMapping.find(
              f => f.label === fieldId || 
                   f.label.toLowerCase() === fieldId.toLowerCase() ||
                   f.id === fieldId ||
                   f.id === `field-${fieldId}` ||
                   f.id === fieldId.replace(/^field-/, '')
            );
            if (matchingField) {
              fieldId = matchingField.id;
              if (process.env.NODE_ENV === 'development') {
                console.log(`✅ Fixed variable mapping: "${mapping.fieldId}" → "${fieldId}"`);
              }
            } else {
              console.warn(`⚠️ Variable mapping references invalid field: ${mapping.fieldId}`);
            }
          }
          
            const normalizedMapping = {
              variableName: mapping.variableName,
            fieldId: fieldId,
              fieldType: mapping.fieldType || 'number',
              description: mapping.description
            };
            
            // Normalize aggregation to uppercase enum values
            // Always normalize if provided (schema has default "NONE" if omitted)
            if (mapping.aggregation !== undefined && mapping.aggregation !== null) {
              const normalized = this.normalizeAggregation(mapping.aggregation);
              normalizedMapping.aggregation = normalized;
            }
            // If not provided, schema will default to "NONE"
            
            return normalizedMapping;
        });
        
        // Build result with converted formula (field IDs) and original formula (labels) for display
        const result = {
          formula: formula.trim(), // Formula with field IDs (for internal use/execution)
          originalFormula: originalFormulaWithLabels.trim(), // Original formula with human-readable labels (for display)
          variableMappings: normalizedMappings,
          formulaType: this.normalizeFormulaType(parsed.formulaType) || 'simple',
          outputType: parsed.outputType || 'number',
          displayFormat: parsed.displayFormat || null,
          description: parsed.description || ''
        };

        if (process.env.NODE_ENV === 'development') {
          console.log('📝 Parsed AI formula:', {
            formulaWithIds: result.formula.substring(0, 100),
            formulaWithLabels: result.originalFormula.substring(0, 100),
          variableMappingsCount: result.variableMappings.length,
          outputType: result.outputType
        });
        }

        return result;
      }
      
      throw new Error('No JSON found in AI response');
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('AI Response:', aiResponse.substring(0, 500));
      throw new Error(`Failed to parse AI response: ${error.message}`);
    }
  }

  /**
   * Map formula variables to form fields intelligently
   * @param {String} formula - Formula string
   * @param {Object} formTemplate - Form template
   * @returns {Promise<Object>} Field mappings with confidence scores
   */
  async mapFormulaToFields(formula, formTemplate) {
    try {
      const prompt = `
Analyze this formula and map each variable to the best matching form field.

FORMULA: ${formula}

AVAILABLE FIELDS:
${this.extractFieldInfo(formTemplate).map(f => 
  `- ${f.id} (${f.type}): ${f.label}`
).join('\n')}

Return JSON mapping:
{
  "mappings": [
    {
      "variableName": "revenue",
      "fieldId": "field_totalAmount",
      "fieldType": "number",
      "aggregation": "SUM",
      "confidence": 0.95,
      "reason": "Semantic match: revenue = total amount"
    }
  ],
  "unmappedVariables": []
}

Return ONLY the JSON object, no markdown.`;

      const groq = this.getGroqClient();
      const response = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
        max_completion_tokens: 1024
      });

      const aiResponse = response.choices[0]?.message?.content || "";
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No JSON found in AI response');
    } catch (error) {
      console.error('AI field mapping error:', error);
      throw new Error(`AI field mapping failed: ${error.message}`);
    }
  }

  /**
   * Suggest relevant metrics based on form structure
   * @param {Object} formTemplate - Form template
   * @param {String} industry - Industry type (optional)
   * @returns {Promise<Array>} Suggested metrics
   */
  async suggestMetrics(formTemplate, industry = null) {
    try {
      const prompt = `
Analyze this form template and suggest 5-10 relevant analytics metrics.

FORM TEMPLATE:
- Name: ${formTemplate.name}
- Entity Type: ${formTemplate.entityType || 'General'}
- Fields: ${formTemplate.sections?.flatMap(s => s.fields?.map(f => f.label) || []).join(', ') || 'None'}

${industry ? `INDUSTRY: ${industry}` : ''}

For each metric, provide:
1. Metric name
2. Formula
3. Description
4. Why it's relevant

Return JSON array:
[
  {
    "name": "Total Revenue",
    "formula": "SUM(field_revenue)",
    "description": "Sum of all revenue fields",
    "relevance": "Key performance indicator for sales"
  }
]

Return ONLY the JSON array, no markdown.`;

      const groq = this.getGroqClient();
      const response = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.5,
        max_completion_tokens: 2048
      });

      const aiResponse = response.choices[0]?.message?.content || "";
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return [];
    } catch (error) {
      console.error('AI metric suggestion error:', error);
      return [];
    }
  }

  /**
   * Generate insights from calculated analytics
   * @param {Object} analyticsResults - Calculated analytics results
   * @param {Object} historicalData - Historical comparison data (optional)
   * @returns {Promise<Object>} Generated insights
   */
  async generateInsights(analyticsResults, historicalData = null) {
    try {
      const prompt = `
Analyze these analytics results and provide actionable insights.

CURRENT METRICS:
${JSON.stringify(analyticsResults, null, 2)}

${historicalData ? `\nHISTORICAL COMPARISON:\n${JSON.stringify(historicalData, null, 2)}` : ''}

Provide:
1. Key findings (3-5 bullet points)
2. Trends identified
3. Anomalies or concerns
4. Recommendations
5. Next steps

Return JSON:
{
  "findings": ["Finding 1", "Finding 2"],
  "trends": ["Trend 1", "Trend 2"],
  "anomalies": ["Anomaly 1"],
  "recommendations": ["Recommendation 1"],
  "nextSteps": ["Step 1", "Step 2"]
}

Return ONLY the JSON object, no markdown.`;

      const groq = this.getGroqClient();
      const response = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_completion_tokens: 2048
      });

      const aiResponse = response.choices[0]?.message?.content || "";
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return {
        findings: [],
        trends: [],
        anomalies: [],
        recommendations: [],
        nextSteps: []
      };
    } catch (error) {
      console.error('AI insights generation error:', error);
      return {
        findings: [],
        trends: [],
        anomalies: [],
        recommendations: [],
        nextSteps: []
      };
    }
  }

  /**
   * Validate and fix formula syntax
   * @param {String} formula - Formula to validate
   * @param {Object} formTemplate - Form template
   * @returns {Promise<Object>} Validation result
   */
  async validateAndFixFormula(formula, formTemplate) {
    try {
      const prompt = `
Validate this formula and fix any syntax errors.

FORMULA: ${formula}

AVAILABLE FIELDS:
${this.extractFieldInfo(formTemplate).map(f => `${f.id} (${f.type})`).join(', ')}

If valid, return:
{
  "valid": true,
  "formula": "${formula}"
}

If invalid, return corrected version:
{
  "valid": false,
  "formula": "corrected_formula",
  "errors": ["Error description"],
  "fixes": ["What was fixed"]
}

Return ONLY the JSON object, no markdown.`;

      const groq = this.getGroqClient();
      const response = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        max_completion_tokens: 1024
      });

      const aiResponse = response.choices[0]?.message?.content || "";
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return { valid: false, formula: formula, errors: ['Unable to validate'] };
    } catch (error) {
      console.error('AI formula validation error:', error);
      return { valid: false, formula: formula, errors: [error.message] };
    }
  }

  /**
   * Generate pipelined aggregation from description
   * @param {String} description - Natural language description
   * @param {Object} formTemplate - Form template
   * @returns {Promise<Object>} Pipeline configuration
   */
  async generatePipeline(description, formTemplate) {
    try {
      const prompt = `
Generate a MongoDB-style aggregation pipeline based on this description.

DESCRIPTION: "${description}"

AVAILABLE FIELDS:
${this.extractFieldInfo(formTemplate).map(f => `- ${f.id} (${f.type}): ${f.label}`).join('\n')}

Return JSON pipeline configuration:
{
  "pipeline": [
    {
      "stage": "match",
      "filters": [
        {
          "fieldId": "field_status",
          "operator": "equals",
          "value": "closed"
        }
      ]
    },
    {
      "stage": "group",
      "by": "field_category",
      "aggregations": {
        "totalRevenue": {
          "type": "SUM",
          "field": "field_revenue"
        },
        "count": {
          "type": "COUNT",
          "field": "field_id"
        }
      }
    },
    {
      "stage": "sort",
      "field": "totalRevenue",
      "order": "desc"
    }
  ],
  "description": "Pipeline description"
}

Return ONLY the JSON object, no markdown.`;

      const groq = this.getGroqClient();
      const response = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        max_completion_tokens: 2048
      });

      const aiResponse = response.choices[0]?.message?.content || "";
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No JSON found in AI response');
    } catch (error) {
      console.error('AI pipeline generation error:', error);
      throw new Error(`AI pipeline generation failed: ${error.message}`);
    }
  }

  /**
   * Extract field information from form template
   */
  extractFieldInfo(formTemplate) {
    const fields = [];
    
    if (formTemplate.sections) {
      formTemplate.sections.forEach(section => {
        if (section.fields) {
          section.fields.forEach(field => {
            const fieldInfo = {
              id: field.id,
              type: field.type,
              label: field.label || '',
              required: field.required || false,
              placeholder: field.placeholder || '',
              description: field.metadata?.helpText || field.metadata?.description || '',
              // Include calculation formula if it's a calculated field
              calculationFormula: field.calculation?.formula || null,
              // Include options for select/radio fields
              options: field.options || [],
              // Include category for sysConfig fields
              category: field.category || field.metadata?.category || null,
            };
            
            // IMPORTANT: Include ALL fields, including calculated fields
            // This allows AI to reference other calculated fields in formulas
            fields.push(fieldInfo);
          });
        }
      });
    }
    
    // Log field extraction for debugging
    console.log('📋 Extracted fields for AI:', {
      totalFields: fields.length,
      calculatedFields: fields.filter(f => f.type === 'calculated').length,
      fieldLabels: fields.map(f => f.label).slice(0, 10), // First 10 for debugging
      calculatedFieldLabels: fields.filter(f => f.type === 'calculated').map(f => f.label)
    });
    
    return fields;
  }

  /**
   * Extract field IDs from formula string
   * @param {String} formula - Formula string
   * @returns {Array<String>} Array of field IDs found in formula
   */
  extractFieldIdsFromFormula(formula) {
    if (!formula || typeof formula !== 'string') {
      return [];
    }
    
    const fieldIds = new Set();
    
    // Match field-xxx pattern
    const fieldPattern = /field-([a-zA-Z0-9_-]+)/g;
    let match;
    while ((match = fieldPattern.exec(formula)) !== null) {
      fieldIds.add(match[0]); // Full field ID with prefix
      fieldIds.add(match[1]); // Field ID without prefix
    }
    
    return Array.from(fieldIds);
  }

  /**
   * Get industry-specific metrics
   */
  getIndustryMetrics(industry) {
    const metrics = {
      sales: [
        { name: "Total Revenue", formula: "SUM(field_revenue)" },
        { name: "Conversion Rate", formula: "(COUNT(WHERE field_status = 'closed_won') / COUNT(*)) * 100" },
        { name: "Average Deal Size", formula: "AVG(field_revenue)" }
      ],
      healthcare: [
        { name: "Patient Count", formula: "COUNT(DISTINCT field_patientId)" },
        { name: "Appointment Rate", formula: "(COUNT(WHERE field_appointmentStatus = 'completed') / COUNT(*)) * 100" }
      ],
      manufacturing: [
        { name: "Production Efficiency", formula: "(SUM(field_unitsProduced) / SUM(field_unitsPlanned)) * 100" },
        { name: "Defect Rate", formula: "(SUM(field_defectiveUnits) / SUM(field_totalUnits)) * 100" }
      ]
    };
    
    return metrics[industry] || [];
  }

  /**
   * Normalize formula type to valid enum value
   */
  normalizeFormulaType(formulaType) {
    if (!formulaType) return 'simple';
    
    const normalized = formulaType.toLowerCase().trim();
    
    // Map common variations to valid enum values
    const typeMap = {
      'calculated': 'aggregated',
      'calculation': 'aggregated',
      'compute': 'aggregated',
      'aggregate': 'aggregated',
      'aggregation': 'aggregated',
      'pipeline': 'pipelined',
      'conditional': 'conditional',
      'simple': 'simple',
      'basic': 'simple'
    };
    
    return typeMap[normalized] || 'aggregated'; // Default to 'aggregated' for unknown types
  }

  /**
   * Normalize aggregation value to valid enum (uppercase)
   */
  normalizeAggregation(aggregation) {
    if (!aggregation) return undefined;
    
    const normalized = String(aggregation).toUpperCase().trim();
    
    // Valid enum values: SUM, AVG, COUNT, MIN, MAX, DISTINCT, NONE
    const validValues = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'DISTINCT', 'NONE'];
    
    if (validValues.includes(normalized)) {
      return normalized;
    }
    
    // Map common variations
    const mapping = {
      'AVERAGE': 'AVG',
      'TOTAL': 'SUM',
      'TOTALSUM': 'SUM',
      'NONE': 'NONE',
      'NULL': 'NONE',
      '': 'NONE'
    };
    
    return mapping[normalized] || 'NONE'; // Default to NONE if invalid
  }
}

export default new AnalyticsAiService();

