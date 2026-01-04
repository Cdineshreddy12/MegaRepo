import { Groq } from 'groq-sdk';

// Initialize Groq client with error handling
let groq = null;
try {
  const apiKey = process.env.GROQ_API_KEY;
  if (apiKey) {
    groq = new Groq({
      apiKey: apiKey,
      timeout: 10000, // 10 second timeout
    });
    console.log('✅ Groq AI service initialized');
  } else {
    console.warn('⚠️  Groq API key not configured, AI features disabled');
  }
} catch (error) {
  console.error('❌ Failed to initialize Groq AI service:', error.message);
  groq = null;
}

/**
 * Get CRM-specific field knowledge based on entity type
 */
function getCRMFieldKnowledge(entityType) {
  const knowledge = {
    account: {
      requiredFields: ['companyName', 'phone', 'email'],
      commonFields: [
        { id: 'companyName', type: 'text', label: 'Company Name', required: true, group: 'identification' },
        { id: 'phone', type: 'phone', label: 'Phone', required: false, group: 'contact' },
        { id: 'email', type: 'email', label: 'Email', required: false, group: 'contact' },
        { id: 'website', type: 'url', label: 'Website', required: false, group: 'contact' },
        { id: 'status', type: 'sysConfig', label: 'Account Status', category: 'account_status', required: false, group: 'status' },
        { id: 'industry', type: 'sysConfig', label: 'Industry', category: 'industries', required: false, group: 'business' },
        { id: 'segment', type: 'sysConfig', label: 'Customer Segment', category: 'customer_segments', required: false, group: 'business' },
        { id: 'zone', type: 'sysConfig', label: 'Zone', category: 'zones', required: false, group: 'location' },
        { id: 'assignedTo', type: 'user', label: 'Assigned To', required: false, group: 'assignment' },
        { id: 'ownershipType', type: 'select', label: 'Ownership Type', options: ['public', 'private', 'government', 'non_profit'], required: false, group: 'business' },
        { id: 'employeesCount', type: 'number', label: 'Employees Count', required: false, group: 'business' },
        { id: 'annualRevenue', type: 'number', label: 'Annual Revenue', required: false, group: 'financial' },
        { id: 'creditTerm', type: 'sysConfig', label: 'Credit Term', category: 'credit_terms', required: false, group: 'financial' },
        { id: 'invoicing', type: 'select', label: 'Invoicing Method', options: ['email', 'hard_copy', 'online_portal'], required: false, group: 'financial' },
        { id: 'gstNo', type: 'text', label: 'GST Number', required: false, group: 'financial' },
        { id: 'description', type: 'textarea', label: 'Description', required: false, group: 'additional' }
      ],
      fieldGroups: {
        identification: 'Account Identification',
        contact: 'Contact Information',
        location: 'Location & Address',
        business: 'Business Information',
        financial: 'Financial Details',
        status: 'Status & Workflow',
        assignment: 'Assignment & Ownership',
        additional: 'Additional Information'
      },
      layoutRecommendations: {
        identification: { columns: 1, priority: 'high' },
        contact: { columns: 2, priority: 'high' },
        location: { columns: 1, priority: 'medium' },
        business: { columns: 2, priority: 'medium' },
        financial: { columns: 2, priority: 'medium' },
        status: { columns: 2, priority: 'high' },
        assignment: { columns: 2, priority: 'high' }
      }
    },
    contact: {
      requiredFields: ['firstName', 'lastName', 'email', 'accountId'],
      commonFields: [
        { id: 'firstName', type: 'text', label: 'First Name', required: true, group: 'personal' },
        { id: 'lastName', type: 'text', label: 'Last Name', required: false, group: 'personal' },
        { id: 'email', type: 'email', label: 'Email', required: true, group: 'contact' },
        { id: 'phone', type: 'phone', label: 'Phone', required: false, group: 'contact' },
        { id: 'accountId', type: 'entity', label: 'Account', entityType: 'account', required: true, group: 'relationship' },
        { id: 'jobTitle', type: 'text', label: 'Job Title', required: false, group: 'professional' },
        { id: 'department', type: 'text', label: 'Department', required: false, group: 'professional' },
        { id: 'assignedTo', type: 'user', label: 'Assigned To', required: false, group: 'assignment' },
        { id: 'isPrimaryContact', type: 'checkbox', label: 'Primary Contact', required: false, group: 'relationship' }
      ],
      fieldGroups: {
        personal: 'Personal Information',
        contact: 'Contact Information',
        professional: 'Professional Details',
        relationship: 'Account Relationship',
        assignment: 'Assignment'
      }
    },
    lead: {
      requiredFields: ['firstName', 'lastName', 'email', 'companyName', 'product'],
      commonFields: [
        { id: 'firstName', type: 'text', label: 'First Name', required: true, group: 'personal' },
        { id: 'lastName', type: 'text', label: 'Last Name', required: true, group: 'personal' },
        { id: 'email', type: 'email', label: 'Email', required: true, group: 'contact' },
        { id: 'phone', type: 'phone', label: 'Phone', required: false, group: 'contact' },
        { id: 'companyName', type: 'text', label: 'Company Name', required: true, group: 'company' },
        { id: 'product', type: 'text', label: 'Product Interest', required: true, group: 'product' },
        { id: 'status', type: 'sysConfig', label: 'Lead Status', category: 'lead_status', required: true, group: 'status' },
        { id: 'source', type: 'sysConfig', label: 'Lead Source', category: 'lead_sources', required: false, group: 'status' },
        { id: 'zone', type: 'sysConfig', label: 'Zone', category: 'zones', required: true, group: 'location' },
        { id: 'assignedTo', type: 'user', label: 'Assigned To', required: false, group: 'assignment' },
        { id: 'score', type: 'number', label: 'Lead Score', required: false, group: 'qualification' }
      ],
      fieldGroups: {
        personal: 'Personal Information',
        contact: 'Contact Information',
        company: 'Company Information',
        product: 'Product Interest',
        status: 'Status & Source',
        location: 'Location',
        qualification: 'Qualification',
        assignment: 'Assignment'
      }
    }
  };

  return knowledge[entityType?.toLowerCase()] || {
    commonFields: [],
    fieldGroups: {},
    layoutRecommendations: {}
  };
}

/**
 * Analyze form template and suggest optimal layouts using Groq AI
 * @param {Object} template - The form template to analyze
 * @param {string} businessRequirements - Optional business requirements description
 */
export async function analyzeFormLayout(template, businessRequirements = null) {
  // Check if AI service is available
  if (!groq) {
    console.warn('AI service not available, using rule-based suggestions');
    return generateRuleBasedSuggestions(template);
  }

  try {
    // Prepare comprehensive context for AI
    const totalFields = template.sections?.reduce((sum, s) => sum + (s.fields?.length || 0), 0) || 0;
    const existingFieldIds = new Set();
    const existingFieldLabels = new Set();
    const fieldTypesUsed = new Set();
    
    template.sections?.forEach(section => {
      section.fields?.forEach(field => {
        existingFieldIds.add(field.id.toLowerCase());
        existingFieldLabels.add(field.label.toLowerCase());
        fieldTypesUsed.add(field.type);
      });
    });

    const formContext = {
      entityType: template.entityType || 'General',
      entityName: template.name || 'Untitled Form',
      entityDescription: template.description || '',
      sectionCount: template.sections?.length || 0,
      totalFields: totalFields,
      existingFieldIds: Array.from(existingFieldIds),
      existingFieldLabels: Array.from(existingFieldLabels),
      fieldTypesUsed: Array.from(fieldTypesUsed),
      sections: template.sections?.map((section, sectionIndex) => ({
        id: section.id,
        title: section.title || `Section ${sectionIndex + 1}`,
        description: section.description || '',
        order: section.order || sectionIndex,
        fieldCount: section.fields?.length || 0,
        currentMetadata: section.metadata || {},
        fields: section.fields?.map((field, fieldIndex) => ({
          id: field.id,
          type: field.type,
          label: field.label,
          required: field.required || false,
          labelLength: field.label?.length || 0,
          placeholder: field.placeholder || '',
          options: field.options || [],
          category: field.category || field.metadata?.category || '',
          currentMetadata: field.metadata || {},
          currentWidth: field.metadata?.width || 'full',
          currentLabelPosition: field.metadata?.labelPosition || 'top',
          currentOrder: field.metadata?.order || fieldIndex,
          currentHelpText: field.metadata?.helpText || '',
          currentClassName: field.metadata?.className || '',
          validation: field.validation || {},
          conditionalLogic: field.conditionalLogic || {},
        })) || [],
      })) || [],
    };

    // CRM-specific field knowledge
    const crmFieldKnowledge = getCRMFieldKnowledge(formContext.entityType);
    
    // Analyze current form structure
    const formAnalysis = {
      hasContactFields: existingFieldLabels.has('email') || existingFieldLabels.has('phone') || existingFieldLabels.has('contact'),
      hasAddressFields: existingFieldLabels.has('address') || existingFieldLabels.has('city') || existingFieldLabels.has('location'),
      hasFinancialFields: existingFieldLabels.has('revenue') || existingFieldLabels.has('credit') || existingFieldLabels.has('payment'),
      hasStatusFields: existingFieldLabels.has('status') || fieldTypesUsed.has('sysConfig'),
      hasAssignmentFields: existingFieldLabels.has('assigned') || fieldTypesUsed.has('user'),
      hasEntityRelationships: fieldTypesUsed.has('entity'),
      averageFieldsPerSection: formContext.sectionCount > 0 ? Math.round(totalFields / formContext.sectionCount) : 0,
      largestSection: formContext.sections.reduce((max, s) => s.fieldCount > max.fieldCount ? s : max, formContext.sections[0] || { fieldCount: 0 }),
      smallestSection: formContext.sections.reduce((min, s) => s.fieldCount < min.fieldCount ? s : min, formContext.sections[0] || { fieldCount: 0 }),
    };
    
    // Build business requirements context
    const businessContext = businessRequirements 
      ? `\n\n═══════════════════════════════════════════════════════════════
BUSINESS REQUIREMENTS (CRITICAL - These are specific requirements from the user):
═══════════════════════════════════════════════════════════════
${businessRequirements}

IMPORTANT: The suggestions MUST align with these business requirements. Consider:
- Industry-specific fields needed (manufacturing, finance, healthcare, etc.)
- Workflow requirements mentioned (sales process, approval workflows, etc.)
- Data collection priorities (what data is most important?)
- User roles and use cases (who will fill this form? sales reps, admins, customers?)
- Business processes described (order processing, lead qualification, etc.)
- Integration needs (what other systems or entities does this connect to?)
- Reporting and analytics needs (what data needs to be tracked for reporting?)
`
      : '';
    
    // Create comprehensive prompt for Groq AI with detailed CRM context
    const prompt = `You are an expert CRM UX consultant specializing in B2B form design, layout optimization, and data entry workflows. You have deep knowledge of:
- CRM systems (Salesforce, HubSpot, Microsoft Dynamics patterns)
- B2B sales and marketing processes
- Entity relationships (Accounts → Contacts → Leads → Opportunities → Orders)
- Field rep workflows and mobile data entry
- Data quality and validation best practices
- Form usability and conversion optimization
${businessContext}

═══════════════════════════════════════════════════════════════
FORM CONTEXT & ANALYSIS
═══════════════════════════════════════════════════════════════
Entity Type: ${formContext.entityType || 'General'}
Form Name: ${formContext.entityName}
Form Description: ${formContext.entityDescription || 'No description provided'}
Total Sections: ${formContext.sectionCount}
Total Fields: ${formContext.totalFields}
Average Fields per Section: ${formAnalysis.averageFieldsPerSection}

Current Field Types Used: ${formContext.fieldTypesUsed.join(', ') || 'None'}
Existing Field Labels: ${formContext.existingFieldLabels.slice(0, 20).join(', ')}${formContext.existingFieldLabels.length > 20 ? '...' : ''}

Form Structure Analysis:
- Has Contact Fields: ${formAnalysis.hasContactFields ? 'Yes' : 'No'}
- Has Address Fields: ${formAnalysis.hasAddressFields ? 'Yes' : 'No'}
- Has Financial Fields: ${formAnalysis.hasFinancialFields ? 'Yes' : 'No'}
- Has Status Fields: ${formAnalysis.hasStatusFields ? 'Yes' : 'No'}
- Has Assignment Fields: ${formAnalysis.hasAssignmentFields ? 'Yes' : 'No'}
- Has Entity Relationships: ${formAnalysis.hasEntityRelationships ? 'Yes' : 'No'}
- Largest Section: "${formAnalysis.largestSection.title}" (${formAnalysis.largestSection.fieldCount} fields)
- Smallest Section: "${formAnalysis.smallestSection.title}" (${formAnalysis.smallestSection.fieldCount} fields)

═══════════════════════════════════════════════════════════════
CURRENT FORM STRUCTURE (DETAILED)
═══════════════════════════════════════════════════════════════
${JSON.stringify(formContext.sections, null, 2)}

═══════════════════════════════════════════════════════════════
CRM FIELD KNOWLEDGE FOR ${formContext.entityType.toUpperCase()}
═══════════════════════════════════════════════════════════════
${JSON.stringify(crmFieldKnowledge, null, 2)}

═══════════════════════════════════════════════════════════════
YOUR TASK: COMPREHENSIVE FORM ANALYSIS & OPTIMIZATION
═══════════════════════════════════════════════════════════════

Please analyze and provide comprehensive suggestions:

1. **Missing Fields**: Suggest important CRM fields that are missing but should be included:
   - Required fields for this entity type
   - Common CRM fields (status, assignedTo, etc.)
   - Related entity fields (accountId for contacts, etc.)
   - Each suggestion should include: id, type, label, required, placeholder, helpText
   - VALID FIELD TYPES ONLY: "text", "textarea", "number", "select", "checkbox", "radio", "date", "email", "phone", "sysConfig", "entity", "user", "organization", "url", "address"
   - For status fields: use type "sysConfig" with category (e.g., "account_status", "lead_status")
   - For assignedTo fields: use type "user"
   - For address fields: use type "address" or "text"
   - For entity relationships: use type "entity" with entityType metadata

2. **Field Layouts**: For each existing field, suggest:
   - Width (full, half, third, two-thirds, quarter, three-quarters, or number 1-12)
   - Label position (top, left, right, or hidden)
   - Display order (group related CRM fields together)
   - Help text (CRM-specific guidance)
   - Validation requirements
   - Custom CSS classes for CRM styling

3. **Section Layouts**: For each section, suggest:
   - Grid columns (1, 2, 3, 4, 6, or 12)
   - Spacing (compact, normal, or loose)
   - Display order
   - Section title improvements
   - Custom CSS classes

4. **CRM-Specific Recommendations**:
   - Field grouping (contact info, address, financial, etc.)
   - Required vs optional field indicators
   - Status and workflow fields placement
   - Assignment and ownership fields
   - Related entity lookups

═══════════════════════════════════════════════════════════════
CRM BEST PRACTICES & GUIDELINES
═══════════════════════════════════════════════════════════════

FIELD GROUPING & ORGANIZATION:
- Group related fields logically: Identification → Contact → Location → Business Info → Financial → Status → Assignment
- Place critical fields (name, email, phone) prominently at the top
- Status and assignment fields should be visible but not intrusive
- Address fields work best in full-width or grouped layout
- Financial fields should be grouped together for easy review
- Related entity lookups (Account → Contact) should be near the top

LAYOUT OPTIMIZATION:
- Use 2-column layouts for forms with many short fields (improves density)
- Use 1-column layouts for forms with long fields or textareas
- Use 3-column layouts sparingly (only for very short fields like checkboxes)
- Balance field widths: Don't mix full-width and half-width randomly
- Group related fields side-by-side (e.g., First Name + Last Name, Email + Phone)

MOBILE & RESPONSIVENESS:
- Consider field reps entering data on mobile devices
- Critical fields should be easily accessible (top of form)
- Avoid complex nested layouts on mobile
- Touch-friendly field sizes (minimum 44px height)
- Quick data entry workflows (minimize scrolling)

DATA QUALITY & VALIDATION:
- Required fields should be clearly marked
- Help text should guide users on format and expectations
- Validation rules should be clear (e.g., "Enter valid email", "Include country code")
- Complex fields (zones, credit terms) need detailed help text

VISUAL HIERARCHY:
- Important fields should stand out (use CSS classes like "crm-field-highlight")
- Status fields should be visually distinct
- Critical workflow fields (assignedTo, status) should be prominent
- Use consistent spacing and alignment

CRM-SPECIFIC CONSIDERATIONS:
- Account forms: Emphasize company info, financials, and relationships
- Contact forms: Emphasize personal info, contact methods, and account relationship
- Lead forms: Emphasize qualification fields, source tracking, and conversion potential
- Status fields should use sysConfig type with appropriate categories
- Assignment fields should use user type for proper user lookup
- Entity relationships should use entity type with entityType metadata

Return your response as a valid JSON object in this exact format:
{
  "missingFields": [
    {
      "id": "field-companyName",
      "type": "text",
      "label": "Company Name",
      "required": true,
      "placeholder": "Enter company name",
      "helpText": "Official registered company name",
      "sectionId": "section-basic-info",
      "suggestions": {
        "width": "full",
        "labelPosition": "top",
        "order": 1
      },
      "reasoning": "Required CRM field for account identification"
    }
  ],
  "fieldSuggestions": [
    {
      "fieldId": "field-id",
      "suggestions": {
        "width": "half",
        "labelPosition": "top",
        "order": 1,
        "helpText": "CRM-specific guidance",
        "className": "crm-field-highlight"
      },
      "reasoning": "Brief explanation of CRM best practice"
    }
  ],
  "sectionSuggestions": [
    {
      "sectionId": "section-id",
      "suggestions": {
        "columns": 2,
        "spacing": "normal",
        "order": 1,
        "title": "Improved Section Title",
        "className": "crm-section"
      },
      "reasoning": "CRM field grouping best practice"
    }
  ],
  "overallRecommendations": [
    "CRM-specific recommendation 1",
    "CRM-specific recommendation 2"
  ],
  "confidence": 0.9
}

IMPORTANT: Return ONLY valid JSON, no markdown formatting, no code blocks, just the raw JSON object.`;

    // Add timeout and error handling for AI call
    const chatCompletion = await Promise.race([
      groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama-3.3-70b-versatile", // Using Groq's latest versatile model
        temperature: 0.7,
        max_completion_tokens: 4096,
        top_p: 1,
        stream: false
      }),
      // Timeout after 15 seconds
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI request timeout')), 15000)
      )
    ]).catch(error => {
      console.error('AI service error:', error.message);
      throw new Error(`AI service unavailable: ${error.message}`);
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content || "";

    if (!aiResponse) {
      console.warn('Groq AI returned empty response, using fallback');
      return generateRuleBasedSuggestions(template);
    }

    // Parse JSON from response (handle markdown code blocks if present)
    let jsonData;
    try {
      // Try to extract JSON if wrapped in markdown or nested in other structure
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Handle nested structure if Groq returns {analysis: {...}}
        jsonData = parsed.analysis || parsed.fieldSuggestions ? parsed : parsed;
      } else {
        jsonData = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      console.error('Failed to parse Groq AI response:', parseError);
      console.error('AI Response (first 500 chars):', aiResponse.substring(0, 500));
      // Fallback to rule-based suggestions
      return generateRuleBasedSuggestions(template);
    }

    // Validate and normalize the response
    const validFieldTypes = ['text', 'textarea', 'number', 'select', 'checkbox', 'radio', 'date', 'email', 'phone', 'sysConfig', 'entity', 'user', 'organization', 'url', 'password', 'multiselect', 'datetime', 'time', 'file', 'image', 'boolean', 'signature', 'rating', 'slider', 'color', 'address', 'repeater', 'html', 'divider'];
    
    // Get existing field IDs for validation (using different variable name to avoid conflict)
    const validationExistingFieldIds = new Set();
    const validationExistingSectionIds = new Set();
    template.sections?.forEach(section => {
      validationExistingSectionIds.add(section.id);
      section.fields?.forEach(field => {
        validationExistingFieldIds.add(field.id);
      });
    });
    
    // Normalize missing fields: fix invalid types and validate structure
    const normalizedMissingFields = (jsonData.missingFields || []).map(field => {
      let normalizedType = field.type?.toLowerCase();
      
      // Map invalid types to valid ones
      const typeMapping = {
        'status': 'sysConfig',
        'assignedto': 'user',
        'assigned_to': 'user',
        'contactname': 'text',
        'contact_name': 'text',
        'companyname': 'text',
        'company_name': 'text'
      };
      
      if (typeMapping[normalizedType]) {
        normalizedType = typeMapping[normalizedType];
      }
      
      // If still invalid, default to 'text'
      if (!validFieldTypes.includes(normalizedType)) {
        normalizedType = 'text';
      }
      
      // Add category for sysConfig fields
      const normalizedField = {
        id: field.id || `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: normalizedType,
        label: field.label || 'Untitled Field',
        required: field.required !== undefined ? field.required : false,
        placeholder: field.placeholder,
        helpText: field.helpText,
        sectionId: validationExistingSectionIds.has(field.sectionId) ? field.sectionId : (template.sections?.[0]?.id || 'section-1'),
        suggestions: field.suggestions || {},
        reasoning: field.reasoning
      };
      
      // Add category for sysConfig type fields
      if (normalizedType === 'sysConfig') {
        if (field.type?.toLowerCase() === 'status' || field.label?.toLowerCase().includes('status')) {
          normalizedField.category = formContext.entityType === 'account' ? 'account_status' : 
                                    formContext.entityType === 'lead' ? 'lead_status' : 
                                    formContext.entityType === 'contact' ? 'contact_status' : 'status';
        } else if (field.category) {
          normalizedField.category = field.category;
        } else if (field.label?.toLowerCase().includes('zone')) {
          normalizedField.category = 'zones';
        } else if (field.label?.toLowerCase().includes('industry')) {
          normalizedField.category = 'industries';
        } else if (field.label?.toLowerCase().includes('segment')) {
          normalizedField.category = 'customer_segments';
        } else if (field.label?.toLowerCase().includes('credit')) {
          normalizedField.category = 'credit_terms';
        }
      }
      
      // Add entityType for entity/user fields
      if (normalizedType === 'user' && field.id?.toLowerCase().includes('assigned')) {
        // Already handled by type mapping
      } else if (normalizedType === 'entity') {
        normalizedField.metadata = { entityType: field.entityType || 'account' };
      }
      
      return normalizedField;
    });
    
    // Filter field suggestions to only include existing fields
    const normalizedFieldSuggestions = (jsonData.fieldSuggestions || []).filter(suggestion => {
      return validationExistingFieldIds.has(suggestion.fieldId);
    });
    
    // Normalize section suggestions: validate section IDs
    const normalizedSectionSuggestions = (jsonData.sectionSuggestions || []).map(suggestion => {
      return {
        ...suggestion,
        sectionId: validationExistingSectionIds.has(suggestion.sectionId) ? suggestion.sectionId : (template.sections?.[0]?.id || 'section-1')
      };
    });
    
    const result = {
      missingFields: normalizedMissingFields,
      fieldSuggestions: normalizedFieldSuggestions,
      sectionSuggestions: normalizedSectionSuggestions,
      overallRecommendations: jsonData.overallRecommendations || [],
      confidence: jsonData.confidence || 0.8,
      rawResponse: aiResponse
    };
    
    // Merge with rule-based missing fields if AI didn't provide any
    if (result.missingFields.length === 0) {
      const ruleBased = generateRuleBasedSuggestions(template);
      result.missingFields = ruleBased.missingFields || [];
    }
    
    return result;
  } catch (error) {
    console.error('Groq AI analysis error:', error);
    console.error('Error details:', error.message);
    // Fallback to rule-based suggestions
    return generateRuleBasedSuggestions(template);
  }
}

/**
 * Rule-based fallback suggestions (when AI is unavailable)
 */
function generateRuleBasedSuggestions(template) {
  const missingFields = [];
  const fieldSuggestions = [];
  const sectionSuggestions = [];
  const overallRecommendations = [];
  
  // Add CRM-specific missing field detection
  const crmKnowledge = getCRMFieldKnowledge(template.entityType);
  if (crmKnowledge && crmKnowledge.commonFields) {
    const existingFieldIds = new Set();
    template.sections?.forEach(section => {
      section.fields?.forEach(field => {
        existingFieldIds.add(field.id.toLowerCase());
      });
    });
    
    crmKnowledge.commonFields.forEach(crmField => {
      const fieldIdLower = crmField.id.toLowerCase();
      if (!existingFieldIds.has(fieldIdLower) && crmField.required) {
        missingFields.push({
          id: crmField.id,
          type: crmField.type,
          label: crmField.label,
          required: crmField.required,
          placeholder: `Enter ${crmField.label.toLowerCase()}`,
          helpText: `Required ${template.entityType || 'CRM'} field`,
          sectionId: template.sections?.[0]?.id || 'section-1',
          suggestions: {
            width: crmField.type === 'textarea' ? 'full' : 'half',
            labelPosition: 'top',
            order: missingFields.length + 1
          },
          reasoning: `Required CRM field for ${template.entityType || 'this entity'}`
        });
      }
    });
  }

  template.sections?.forEach((section, sectionIndex) => {
    const fields = section.fields || [];
    const fieldCount = fields.length;

    // Section suggestions
    let suggestedColumns = 1;
    if (fieldCount <= 2 && !fields.some(f => f.type === 'textarea')) {
      suggestedColumns = 2;
    } else if (fieldCount <= 4 && fields.filter(f => ['text', 'email', 'phone'].includes(f.type)).length >= 2) {
      suggestedColumns = 2;
    } else if (fieldCount > 6 && !fields.some(f => f.type === 'textarea')) {
      suggestedColumns = 3;
    }

    sectionSuggestions.push({
      sectionId: section.id,
      suggestions: {
        columns: suggestedColumns,
        spacing: fieldCount > 8 ? 'compact' : 'normal',
        order: section.order || sectionIndex,
      },
      reasoning: `Rule-based: ${fieldCount} fields analyzed for optimal layout`
    });

    // Field suggestions
    fields.forEach((field, fieldIndex) => {
      const suggestions = {};
      let reasoning = '';

      const labelLength = field.label?.length || 0;
      const isLongField = field.type === 'textarea';
      const isShortField = ['checkbox', 'radio', 'date'].includes(field.type);

      if (isLongField) {
        suggestions.width = 'full';
        reasoning = 'Textarea fields span full width';
      } else if (isShortField && labelLength < 15) {
        suggestions.width = suggestedColumns === 1 ? 'half' : 'third';
        reasoning = 'Short field can share space';
      } else if (labelLength > 25) {
        suggestions.width = 'full';
        reasoning = 'Long label requires full width';
      } else if (suggestedColumns > 1) {
        suggestions.width = 'half';
        reasoning = 'Standard width for multi-column layout';
      } else {
        suggestions.width = 'full';
        reasoning = 'Full width for single column';
      }

      suggestions.labelPosition = labelLength > 30 ? 'top' : (suggestedColumns === 1 && labelLength < 20 ? 'left' : 'top');
      suggestions.order = field.order || fieldIndex;

      if (field.required && !field.metadata?.helpText) {
        if (field.type === 'email') {
          suggestions.helpText = 'Enter a valid email address';
        } else if (field.type === 'phone') {
          suggestions.helpText = 'Include country code if international';
        }
      }

      fieldSuggestions.push({
        fieldId: field.id,
        suggestions,
        reasoning: reasoning.trim() || 'Rule-based suggestion'
      });
    });
  });

  const totalFields = template.sections?.reduce((sum, s) => sum + (s.fields?.length || 0), 0) || 0;
  if (totalFields > 15) {
    overallRecommendations.push('Consider splitting into more sections for better UX');
  }

  return {
    missingFields,
    fieldSuggestions,
    sectionSuggestions,
    overallRecommendations,
    confidence: 0.7
  };
}

/**
 * Apply suggestions to a template
 */
export function applySuggestionsToTemplate(template, analysis) {
  const updatedTemplate = JSON.parse(JSON.stringify(template));

  // Apply field suggestions
  analysis.fieldSuggestions?.forEach(fieldSuggestion => {
    updatedTemplate.sections?.forEach(section => {
      const field = section.fields?.find(f => f.id === fieldSuggestion.fieldId);
      if (field) {
        if (!field.metadata) {
          field.metadata = {};
        }
        Object.assign(field.metadata, fieldSuggestion.suggestions);
      }
    });
  });

  // Apply section suggestions
  analysis.sectionSuggestions?.forEach(sectionSuggestion => {
    const section = updatedTemplate.sections?.find(s => s.id === sectionSuggestion.sectionId);
    if (section) {
      if (!section.metadata) {
        section.metadata = {};
      }
      Object.assign(section.metadata, sectionSuggestion.suggestions);
    }
  });

  return updatedTemplate;
}

/**
 * Generate a complete end-to-end form template from scratch based on industry and use case
 * @param {Object} params - Generation parameters
 * @param {string} params.entityType - Entity type (account, contact, lead, etc.)
 * @param {string} params.industry - Industry (manufacturing, healthcare, finance, etc.)
 * @param {string} params.useCase - Use case description
 * @param {string} params.businessRequirements - Detailed business requirements
 * @param {string} params.tenantId - Tenant ID for the template
 * @returns {Promise<Object>} Complete form template
 */
export async function generateCompleteTemplate({
  entityType = 'account',
  industry = '',
  useCase = '',
  businessRequirements = '',
  tenantId = ''
}) {
  // Check if AI service is available
  if (!groq) {
    console.warn('AI service not available, cannot generate templates');
    throw new Error('AI service is not configured. Please set GROQ_API_KEY environment variable.');
  }

  try {
    // Get CRM field knowledge for the entity type
    const crmFieldKnowledge = getCRMFieldKnowledge(entityType);
    
    // Get available system config categories
    const Dropdown = (await import('../models/Dropdown.js')).default;
    const availableCategories = await Dropdown.distinct('category', { isActive: true });
    
    // Map categories to entity-specific recommendations
    const categoryMapping = {
      account: ['account_status', 'industries', 'zones', 'customer_segments', 'credit_terms', 'countries', 'oem_vendors', 'company_types', 'company_sizes'],
      contact: ['contact_types', 'departments', 'designation', 'countries'],
      lead: ['lead_status', 'lead_sources', 'zones', 'industries', 'countries'],
      opportunity: ['opportunity_stages', 'opportunity_status', 'oem_vendors', 'currencies', 'renewal_terms'],
      quotation: ['currencies', 'oem_vendors', 'renewal_terms'],
      salesOrder: ['sales_order_status', 'currencies', 'oem_vendors'],
      invoice: ['invoice_status', 'currencies', 'oem_vendors'],
      ticket: ['service', 'zones', 'oem_vendors']
    };
    
    const recommendedCategories = categoryMapping[entityType] || [];
    const entityCategories = recommendedCategories.filter(cat => availableCategories.includes(cat));
    
    // Build comprehensive prompt for complete template generation
    const prompt = `You are an expert CRM consultant specializing in B2B form design and template creation. Your task is to generate a COMPLETE, PRODUCTION-READY form template from scratch.

═══════════════════════════════════════════════════════════════
GENERATION PARAMETERS
═══════════════════════════════════════════════════════════════
Entity Type: ${entityType}
Industry: ${industry || 'General B2B'}
Use Case: ${useCase || 'General CRM form'}
Business Requirements: ${businessRequirements || 'Standard CRM requirements'}

═══════════════════════════════════════════════════════════════
CRM FIELD KNOWLEDGE FOR ${entityType.toUpperCase()}
═══════════════════════════════════════════════════════════════
${JSON.stringify(crmFieldKnowledge, null, 2)}

═══════════════════════════════════════════════════════════════
VALID FIELD TYPES (COMPLETE LIST - USE EXACTLY AS SHOWN)
═══════════════════════════════════════════════════════════════
You MUST use ONLY these field types (case-sensitive, exact spelling):

BASIC INPUT TYPES:
- "text" - Single-line text input
- "textarea" - Multi-line text input
- "number" - Numeric input
- "email" - Email address input with validation
- "phone" - Phone number input
- "url" - Website/URL input with validation (use "url" NOT "URL" or "website")
- "password" - Password input (masked)

SELECTION TYPES:
- "select" - Single-select dropdown
- "multiselect" - Multi-select dropdown
- "radio" - Radio button group
- "checkbox" - Checkbox (single or group)

DATE/TIME TYPES:
- "date" - Date picker
- "datetime" - Date and time picker
- "time" - Time picker

FILE TYPES:
- "file" - File upload
- "image" - Image upload

SPECIAL TYPES:
- "boolean" - True/false checkbox
- "address" - Address input (structured)
- "color" - Color picker
- "rating" - Star rating input
- "slider" - Range slider
- "signature" - Signature capture
- "repeater" - Repeating field group
- "html" - HTML content display
- "divider" - Visual divider/separator

CRM-SPECIFIC TYPES:
- "sysConfig" - Dropdown from system config (MUST use camelCase "sysConfig")
- "user" - User selection/lookup
- "entity" - Related entity lookup (Account, Contact, etc.)
- "organization" - Organization selection

CRITICAL RULES:
1. Use EXACT type names as shown above - no variations, no capitalization changes
2. For website/URL fields: use type "url" (lowercase)
3. For dropdowns from system config: use type "sysConfig" (camelCase)
4. For user assignment: use type "user"
5. For related entities: use type "entity" with metadata.entityType

═══════════════════════════════════════════════════════════════
AVAILABLE SYSTEM CONFIG CATEGORIES (DROPDOWN FIELDS)
═══════════════════════════════════════════════════════════════
The system has the following dropdown categories available for sysConfig fields:

ALL AVAILABLE CATEGORIES:
${availableCategories.map(cat => `- ${cat}`).join('\n')}

RECOMMENDED CATEGORIES FOR ${entityType.toUpperCase()}:
${entityCategories.length > 0 ? entityCategories.map(cat => `- ${cat}`).join('\n') : 'None specifically recommended'}

IMPORTANT: When creating fields that should use dropdowns from system config:
- Use type: "sysConfig" (NOT "sysconfig" or "sys_config" - must be camelCase)
- Set category to one of the available categories above
- Common mappings:
  * Status fields → "account_status", "lead_status", "opportunity_status", "invoice_status", "sales_order_status"
  * Industry → "industries"
  * Zone → "zones"
  * Lead Source → "lead_sources"
  * Credit Terms → Use "credit_terms" if available, otherwise use "select" type with options
  * Customer Segment → Use appropriate category or "select" type
  * OEM/Vendor → "oem_vendors"
  * Country → "countries"
  * Department → "departments"
  * Designation → "designation"
  * Service → "service"
  * Opportunity Stage → "opportunity_stages"
  * Ownership Type → "ownership_type"

═══════════════════════════════════════════════════════════════
YOUR TASK: GENERATE COMPLETE FORM TEMPLATE
═══════════════════════════════════════════════════════════════

Generate a complete, production-ready form template with:

1. **SECTIONS**: Create 3-6 logical sections that group related fields:
   - Each section should have: id, title, description, order, fields array
   - Suggested section groups:
     * Identification/Basic Information (company name, account type, etc.)
     * Contact Information (email, phone, website, address)
     * Business Information (industry, segment, employees, revenue)
     * Financial Details (credit terms, payment methods, GST, etc.)
     * Status & Workflow (status, assignedTo, etc.)
     * Additional Information (notes, description, custom fields)

2. **FIELDS**: For each section, include ALL relevant fields:
   - Required fields for ${entityType} entity type
   - Industry-specific fields based on "${industry}"
   - Use case-specific fields based on "${useCase}"
   - Common CRM fields (status, assignedTo, etc.)
   - Each field must include:
     * id: unique identifier (e.g., "field-companyName")
     * type: MUST be one of these EXACT valid types (case-sensitive):
       "text", "textarea", "number", "email", "phone", "url", "password", 
       "select", "multiselect", "radio", "checkbox", "date", "datetime", "time",
       "file", "image", "boolean", "entity", "user", "organization", "sysConfig",
       "signature", "rating", "slider", "color", "address", "repeater", "html", "divider"
     * CRITICAL: 
       - Use "sysConfig" (camelCase) NOT "sysconfig" or "sys_config" for dropdown fields
       - Use "url" (lowercase) for website/URL fields, NOT "URL" or "website"
       - Use exact type names as listed above - no variations allowed
     * label: clear, user-friendly label
     * required: true/false based on CRM best practices
     * placeholder: helpful placeholder text
     * category: for sysConfig fields (e.g., "account_status", "zones", "industries")
     * options: for select/radio fields
     * metadata: {
       * width: "full" | "half" | "third" | "two-thirds" | "quarter" | "three-quarters"
       * labelPosition: "top" | "left" | "right" | "hidden"
       * order: number (for field ordering)
       * helpText: detailed guidance for users
       * className: CSS classes for styling
       * category: for sysConfig fields
       * entityType: for entity fields
     * }
     * validation: { min, max, pattern, minLength, maxLength } if needed

3. **LAYOUT OPTIMIZATION**:
   - Use 2-column layouts for sections with many short fields
   - Use 1-column layouts for sections with long fields or textareas
   - Group related fields side-by-side (e.g., First Name + Last Name, Email + Phone)
   - Set appropriate widths based on field type and label length
   - Order fields logically within each section

4. **INDUSTRY & USE CASE SPECIFIC FIELDS**:
   ${industry ? `- Add industry-specific fields for ${industry} industry` : ''}
   ${useCase ? `- Add use case-specific fields for: ${useCase}` : ''}
   ${businessRequirements ? `- Incorporate these requirements: ${businessRequirements}` : ''}

5. **CRM BEST PRACTICES**:
   - Place critical fields (name, email, phone) at the top
   - Group related fields together
   - Use sysConfig type for status, industry, zone, segment, credit terms
   - Use user type for assignedTo fields
   - Use entity type for related entity lookups
   - Add helpful helpText for complex fields
   - Mark required fields appropriately

Return your response as a valid JSON object in this exact format:
{
  "name": "Template Name (e.g., '${industry} ${entityType} Form' or '${useCase} Template')",
  "description": "Detailed description of what this template is for",
  "entityType": "${entityType}",
  "sections": [
    {
      "id": "section-identification",
      "title": "Identification",
      "description": "Basic account identification information",
      "order": 1,
      "metadata": {
        "columns": 2,
        "spacing": "normal",
        "order": 1
      },
      "fields": [
        {
          "id": "field-companyName",
          "type": "text",
          "label": "Company Name",
          "required": true,
          "placeholder": "Enter company name",
          "metadata": {
            "width": "full",
            "labelPosition": "top",
            "order": 1,
            "helpText": "Official registered company name"
          },
          "validation": {
            "minLength": 2,
            "maxLength": 200
          }
        }
      ]
    }
  ],
  "settings": {},
  "permissions": {}
}

IMPORTANT: 
- Return ONLY valid JSON, no markdown formatting, no code blocks
- Include ALL required fields for ${entityType}
- Include industry-specific fields for ${industry}
- Include use case-specific fields for ${useCase}
- Make it production-ready and complete
- Use proper field types and categories
- Set appropriate metadata for layout optimization`;

    // Add timeout and error handling for AI call
    const chatCompletion = await Promise.race([
      groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_completion_tokens: 8192,
        top_p: 1,
        stream: false
      }),
      // Timeout after 20 seconds for template generation
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI request timeout')), 20000)
      )
    ]).catch(error => {
      console.error('AI service error during template generation:', error.message);
      throw new Error(`AI service unavailable: ${error.message}`);
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content || "";

    if (!aiResponse) {
      throw new Error('AI returned empty response');
    }

    // Parse JSON from response
    let templateData;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        templateData = JSON.parse(jsonMatch[0]);
      } else {
        templateData = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      console.error('Failed to parse AI template response:', parseError);
      console.error('AI Response (first 1000 chars):', aiResponse.substring(0, 1000));
      throw new Error('Failed to parse AI-generated template');
    }

    // Validate and normalize the template
    const normalizedTemplate = {
      name: templateData.name || `${industry || 'General'} ${entityType} Template`,
      description: templateData.description || `Complete ${entityType} form template for ${industry || 'general'} industry`,
      entityType: templateData.entityType || entityType,
      tenantId: tenantId,
      isActive: true,
      version: 1,
      sections: (templateData.sections || []).map((section, sectionIndex) => {
        const sectionFieldCount = section.fields?.length || 0;
        const hasTextarea = section.fields?.some(f => f.type === 'textarea') || false;
        const hasLongFields = section.fields?.some(f => ['textarea', 'address'].includes(f.type)) || false;
        
        // Determine optimal columns based on field count and types
        let suggestedColumns = 2;
        if (hasLongFields || sectionFieldCount <= 2) {
          suggestedColumns = 1;
        } else if (sectionFieldCount >= 6 && !hasTextarea) {
          suggestedColumns = 3;
        }
        
        return {
          id: section.id || `section-${Date.now()}-${sectionIndex}`,
          title: section.title || `Section ${sectionIndex + 1}`,
          description: section.description || '',
          order: section.order || sectionIndex + 1,
          metadata: {
            columns: section.metadata?.columns || suggestedColumns,
            spacing: section.metadata?.spacing || (sectionFieldCount > 8 ? 'compact' : 'normal'),
            order: section.metadata?.order || section.order || sectionIndex + 1,
            className: section.metadata?.className || '',
            ...section.metadata
          },
        fields: (section.fields || []).map((field, fieldIndex) => {
          // Normalize field type - ensure sysConfig is camelCase
          let normalizedType = field.type;
          
          // Handle case variations - fix sysConfig casing
          if (typeof normalizedType === 'string') {
            const lowerType = normalizedType.toLowerCase();
            const typeMapping = {
              'status': 'sysConfig',
              'sysconfig': 'sysConfig', // Fix lowercase
              'sys_config': 'sysConfig', // Fix snake_case
              'assignedto': 'user',
              'assigned_to': 'user'
            };
            
            if (typeMapping[lowerType]) {
              normalizedType = typeMapping[lowerType];
            } else {
              // Preserve original case for other types, but ensure first letter is lowercase
              normalizedType = normalizedType.charAt(0).toLowerCase() + normalizedType.slice(1);
            }
          }
          
          // Determine category for sysConfig fields
          let fieldCategory = field.category || field.metadata?.category || '';
          
          // Auto-detect category for sysConfig fields if not provided
          if (normalizedType === 'sysConfig' && !fieldCategory) {
            const labelLower = (field.label || '').toLowerCase();
            if (labelLower.includes('status') && entityType === 'account') {
              fieldCategory = 'account_status';
            } else if (labelLower.includes('status') && entityType === 'lead') {
              fieldCategory = 'lead_status';
            } else if (labelLower.includes('industry')) {
              fieldCategory = 'industries';
            } else if (labelLower.includes('zone')) {
              fieldCategory = 'zones';
            } else if (labelLower.includes('source') && entityType === 'lead') {
              fieldCategory = 'lead_sources';
            } else if (labelLower.includes('segment')) {
              fieldCategory = 'customer_segments';
            } else if (labelLower.includes('credit')) {
              fieldCategory = 'credit_terms';
            } else if (labelLower.includes('oem') || labelLower.includes('vendor')) {
              fieldCategory = 'oem_vendors';
            } else if (labelLower.includes('country')) {
              fieldCategory = 'countries';
            } else if (labelLower.includes('department')) {
              fieldCategory = 'departments';
            } else if (labelLower.includes('designation')) {
              fieldCategory = 'designation';
            }
            
            // Validate category exists
            if (fieldCategory && !availableCategories.includes(fieldCategory)) {
              fieldCategory = ''; // Clear invalid category
            }
          }
          
          // Determine optimal width based on field type and label length
          let suggestedWidth = field.metadata?.width || 'full';
          const labelLength = (field.label || '').length;
          
          if (!field.metadata?.width) {
            if (normalizedType === 'textarea' || normalizedType === 'address') {
              suggestedWidth = 'full';
            } else if (normalizedType === 'checkbox' || normalizedType === 'radio') {
              suggestedWidth = 'half';
            } else if (labelLength > 25) {
              suggestedWidth = 'full';
            } else if (['email', 'phone', 'date', 'number'].includes(normalizedType)) {
              suggestedWidth = 'half';
            } else if (labelLength < 15 && normalizedType !== 'textarea') {
              suggestedWidth = 'half';
            }
          }
          
          // Determine label position
          let suggestedLabelPosition = field.metadata?.labelPosition || 'top';
          if (!field.metadata?.labelPosition) {
            if (labelLength > 30) {
              suggestedLabelPosition = 'top';
            } else if (labelLength < 15 && suggestedWidth === 'half') {
              suggestedLabelPosition = 'top'; // Keep top for consistency
            }
          }
          
          const normalizedField = {
            id: field.id || `field-${Date.now()}-${fieldIndex}`,
            type: normalizedType || 'text',
            label: field.label || 'Untitled Field',
            required: field.required || false,
            placeholder: field.placeholder || '',
            options: field.options || [],
            category: fieldCategory, // Use determined category
            metadata: {
              width: field.metadata?.width || suggestedWidth,
              labelPosition: field.metadata?.labelPosition || suggestedLabelPosition,
              order: field.metadata?.order || field.order || fieldIndex + 1,
              helpText: field.metadata?.helpText || field.helpText || '',
              className: field.metadata?.className || '',
              category: fieldCategory, // Also in metadata
              entityType: field.metadata?.entityType || '',
              ...field.metadata
            },
            validation: field.validation || {}
          };

          // Ensure category is set for sysConfig fields
          if (normalizedType === 'sysConfig' && !normalizedField.category && entityCategories.length > 0) {
            // Use first recommended category as fallback
            normalizedField.category = entityCategories[0];
            normalizedField.metadata.category = entityCategories[0];
          }

          return normalizedField;
        }).sort((a, b) => {
          // Sort fields by order
          const orderA = a.metadata?.order || 999;
          const orderB = b.metadata?.order || 999;
          return orderA - orderB;
        })
        }
      }).sort((a, b) => {
        // Sort sections by order
        const orderA = a.metadata?.order || a.order || 999;
        const orderB = b.metadata?.order || b.order || 999;
        return orderA - orderB;
      }),
      settings: templateData.settings || {},
      permissions: templateData.permissions || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      success: true,
      template: normalizedTemplate,
      rawResponse: aiResponse
    };

  } catch (error) {
    console.error('Template generation error:', error);
    throw error;
  }
}

