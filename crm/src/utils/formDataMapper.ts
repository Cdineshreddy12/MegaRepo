/**
 * Form Data Mapper Utilities
 * 
 * Maps form template field IDs to entity data structures
 */

/**
 * Find field ID in formData by label or name (case-insensitive)
 * Useful when field IDs are auto-generated but labels are known
 */
function findFieldByLabelOrName(
  formData: Record<string, any>,
  template: any,
  labelOrName: string | string[]
): string | null {
  if (!template || !template.sections) return null;
  
  const searchTerms = Array.isArray(labelOrName) ? labelOrName : [labelOrName];
  const lowerSearchTerms = searchTerms.map(term => term.toLowerCase());
  
  // Search through template fields to find matching label or name
  for (const section of template.sections) {
    if (section.fields && Array.isArray(section.fields)) {
      for (const field of section.fields) {
        // Skip calculated fields - they should not be mapped to standard entity fields
        if (field.type === "calculated") {
          continue;
        }
        
        const fieldLabel = (field.label || '').toLowerCase();
        const fieldName = ((field as any).name || '').toLowerCase();
        const fieldId = (field.id || '').toLowerCase();
        
        // Check if any search term matches
        for (const searchTerm of lowerSearchTerms) {
          // Use exact match or contains match, but be more strict
          const isExactMatch = fieldLabel === searchTerm || fieldName === searchTerm;
          const isContainsMatch = fieldLabel.includes(searchTerm) || fieldName.includes(searchTerm) || fieldId.includes(searchTerm);
          
          // Prefer exact matches, but also accept contains matches if search term is substantial
          if (isExactMatch || (isContainsMatch && searchTerm.length >= 3)) {
            // Found the field, now check if it exists in formData and has a valid value
            const value = formData[field.id];
            if (value !== undefined && value !== null && value !== '') {
              // Additional validation: don't match if value is just the field label or type
              if (typeof value === 'string' && (value.toLowerCase() === fieldLabel || value.toLowerCase() === field.type)) {
                continue;
              }
              return field.id;
            }
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * Map Account form data to Account entity structure
 */
export function mapAccountFormData(formData: Record<string, any>, template?: any): Record<string, any> {
  // Helper function to get field value with multiple fallback options
  // Checks: field-{name}, {name}, template field IDs by label, and also handles case-insensitive matching
  const getFieldValue = (fieldName: string, defaultValue: any = undefined, allowEmpty: boolean = false, searchLabels?: string[]) => {
    // Try exact matches first
    let value = formData[`field-${fieldName}`] ?? formData[fieldName];
    
    // If not found and template is provided, try to find by label/name
    if ((value === undefined || value === null || value === '') && template) {
      const searchTerms = searchLabels || [fieldName];
      const fieldId = findFieldByLabelOrName(formData, template, searchTerms);
      if (fieldId) {
        value = formData[fieldId];
      }
    }
    
    // If still not found, try case-insensitive search
    if (value === undefined || value === null || value === '') {
      const lowerFieldName = fieldName.toLowerCase();
      for (const key in formData) {
        const lowerKey = key.toLowerCase();
        // Check if key matches field-{name} or just {name}
        if (lowerKey === `field-${lowerFieldName}` || lowerKey === lowerFieldName) {
          value = formData[key];
          break;
        }
      }
    }
    
    // Return value if found, or default if not found
    // For zone and other required fields, include even if empty string
    if (allowEmpty) {
      return value !== undefined && value !== null ? value : defaultValue;
    }
    return value !== undefined && value !== null && value !== '' ? value : defaultValue;
  };

  // Debug: Log zone field specifically
  if (process.env.NODE_ENV === 'development') {
    console.log('[mapAccountFormData] Zone field mapping:', {
      'field-zone': formData['field-zone'],
      'zone': formData['zone'],
      'allKeys': Object.keys(formData).filter(k => k.toLowerCase().includes('zone')),
      'allFormDataKeys': Object.keys(formData),
      'zoneValueFound': getFieldValue('zone'),
    });
  }

  // Manually extract zone from formData with all possible formats
  let zoneValue = formData.zone || formData["field-zone"] || formData.Zone;
  if (!zoneValue) {
    // Search case-insensitively for zone
    for (const key in formData) {
      if (key.toLowerCase() === 'zone' || key.toLowerCase() === 'field-zone') {
        zoneValue = formData[key];
        break;
      }
    }
  }

  // Helper to get number value with template support
  const getNumberValue = (fieldName: string, searchLabels?: string[]) => {
    const value = getFieldValue(fieldName, undefined, false, searchLabels);
    if (value === undefined || value === null || value === '') return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  };

  // Helper to get value directly from formData by key (with or without field- prefix)
  const getDirectValue = (fieldName: string): any => {
    return formData[`field-${fieldName}`] ?? formData[fieldName] ?? undefined;
  };

  const mapped: Record<string, any> = {
    companyName: getFieldValue("companyName", undefined, false, ["companyName", "company name", "company"]),
    email: getFieldValue("email", undefined, false, ["email", "email address"]),
    phone: getFieldValue("phone", undefined, true, ["phone", "phone number", "mobile", "contact number"]) || getDirectValue("phone"),
    description: getFieldValue("description", undefined, true, ["description", "notes", "about"]),
    industry: getFieldValue("industry", undefined, true, ["industry", "sector"]),
    status: getFieldValue("status", "active", true, ["status", "account status"]),
    accountType: getFieldValue("accountType", undefined, true, ["accountType", "account type", "type"]),
    segment: getFieldValue("segment", undefined, true, ["segment", "market segment"]) || getDirectValue("segment"),
    employeesCount: getNumberValue("employeesCount", ["employeesCount", "employees count", "employee count", "number of employees"]) || (getDirectValue("employeesCount") ? Number(getDirectValue("employeesCount")) : undefined),
    annualRevenue: getNumberValue("annualRevenue", ["annualRevenue", "annual revenue", "revenue", "yearly revenue"]),
    ownershipType: (() => {
      const value = getFieldValue("ownershipType", undefined, true, ["ownershipType", "ownership type", "ownership"]) || getDirectValue("ownershipType");
      // Transform to lowercase to match backend enum values (public, private, government, non_profit)
      if (value && typeof value === 'string') {
        const lowerValue = value.toLowerCase().trim();
        // Map common variations to correct enum values
        const enumMap: Record<string, string> = {
          'public': 'public',
          'private': 'private',
          'government': 'government',
          'non-profit': 'non_profit',
          'nonprofit': 'non_profit',
          'non_profit': 'non_profit',
        };
        return enumMap[lowerValue] || lowerValue;
      }
      return value;
    })(),
    invoicing: getFieldValue("invoicing", undefined, true, ["invoicing", "invoice method"]) || getDirectValue("invoicing"),
    creditTerm: getFieldValue("creditTerm", undefined, true, ["creditTerm", "credit term", "payment terms"]) || getDirectValue("creditTerm"),
    gstNo: getFieldValue("gstNo", undefined, true, ["gstNo", "gst no", "gst number", "gstin"]) || getDirectValue("gstNo"),
    zone: zoneValue || getFieldValue("zone", undefined, true, ["zone", "region"]) || getDirectValue("zone"), // Ensure zone is always included if present
    assignedTo: getFieldValue("assignedTo", null, true, ["assignedTo", "assigned to", "assignee", "owner"]) || getDirectValue("assignedTo") || null,
    parentAccount: getFieldValue("parentAccount", undefined, true, ["parentAccount", "parent account"]) || getDirectValue("parentAccount"),
    website: getFieldValue("website", undefined, true, ["website", "web", "url"]),
    billingAddress: getFieldValue("billingAddress", undefined, true, ["billingAddress", "billing address", "bill address"]),
    shippingAddress: getFieldValue("shippingAddress", undefined, true, ["shippingAddress", "shipping address", "ship address"]),
  };
  
  // Remove undefined values to keep mapped object clean
  Object.keys(mapped).forEach(key => {
    if (mapped[key] === undefined) {
      delete mapped[key];
    }
  });

  // Final check: if zone is still missing, search formData directly
  if (!mapped.zone) {
    // Search all possible zone field formats
    const zoneKeys = Object.keys(formData);
    for (const key of zoneKeys) {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'zone' || lowerKey === 'field-zone' || lowerKey.endsWith('zone')) {
        const value = formData[key];
        if (value !== undefined && value !== null && value !== '') {
          mapped.zone = value;
          if (process.env.NODE_ENV === 'development') {
            console.log('[mapAccountFormData] Found zone via direct search:', { key, value });
          }
          break;
        }
      }
    }
  }

  // Validate required fields - aggressive search for companyName
  if (!mapped.companyName || mapped.companyName.trim() === '') {
    // Try to find companyName by searching template fields first
    if (template) {
      const companyFieldId = findFieldByLabelOrName(formData, template, ['company name', 'company', 'companyName', 'name']);
      if (companyFieldId && formData[companyFieldId]) {
        const value = formData[companyFieldId];
        if (value && typeof value === 'string' && value.trim() !== '') {
          mapped.companyName = value.trim();
          if (process.env.NODE_ENV === 'development') {
            console.log('[mapAccountFormData] Found companyName via template search:', { fieldId: companyFieldId, value: mapped.companyName });
          }
        }
      }
    }
    
    // If still not found, search all formData keys
    if (!mapped.companyName || mapped.companyName.trim() === '') {
      const companyKeys = Object.keys(formData).filter(k => {
        const lowerKey = k.toLowerCase();
        return lowerKey.includes('company') || (lowerKey.includes('name') && !lowerKey.includes('first') && !lowerKey.includes('last'));
      });
      
      // Sort keys to prioritize exact matches
      companyKeys.sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const aIsExact = aLower.includes('company') && aLower.includes('name');
        const bIsExact = bLower.includes('company') && bLower.includes('name');
        if (aIsExact && !bIsExact) return -1;
        if (!aIsExact && bIsExact) return 1;
        return 0;
      });
      
      for (const key of companyKeys) {
        const value = formData[key];
        if (value && typeof value === 'string' && value.trim() !== '') {
          mapped.companyName = value.trim();
          if (process.env.NODE_ENV === 'development') {
            console.log('[mapAccountFormData] Found companyName via fallback search:', { key, value: mapped.companyName });
          }
          break;
        }
      }
    }
    
    // Last resort: check if there's any non-empty string value that could be companyName
    if (!mapped.companyName || mapped.companyName.trim() === '') {
      // Look for the first substantial text field that's not email, phone, etc.
      const excludedKeys = ['email', 'phone', 'website', 'description', 'industry', 'status', 'zone', 'assignedTo', 'gstNo', 'creditTerm'];
      const excludedValues = ['calculated', 'calculated field', 'computed']; // Exclude calculated field labels
      
      for (const key in formData) {
        const lowerKey = key.toLowerCase();
        if (excludedKeys.some(excluded => lowerKey.includes(excluded))) continue;
        
        // Skip calculated fields
        if (template) {
          const field = template.sections
            ?.flatMap((s: any) => s.fields || [])
            .find((f: any) => f.id === key);
          if (field && field.type === "calculated") {
            continue;
          }
        }
        
        const value = formData[key];
        if (value && typeof value === 'string' && value.trim().length > 2) {
          // Skip if value is an excluded value (like "calculated")
          if (excludedValues.includes(value.toLowerCase().trim())) {
            continue;
          }
          // Check if this field looks like a company name (has multiple words or is substantial)
          if (value.trim().split(/\s+/).length >= 1) {
            mapped.companyName = value.trim();
            if (process.env.NODE_ENV === 'development') {
              console.log('[mapAccountFormData] Found companyName via last resort search:', { key, value: mapped.companyName });
            }
            break;
          }
        }
      }
    }
  }

  // Collect ALL remaining fields from formData
  const standardAccountFields = [
    'companyName', 'email', 'phone', 'description', 'industry', 'status', 
    'accountType', 'segment', 'employeesCount', 'annualRevenue', 'ownershipType',
    'invoicing', 'creditTerm', 'gstNo', 'zone', 'assignedTo', 'parentAccount',
    'website', 'billingAddress', 'shippingAddress', 'createdBy', 'updatedBy',
    'orgCode', 'formTemplateId', 'customFields'
  ];
  
  const customFields: Record<string, any> = {};
  const mappedKeys = new Set(Object.keys(mapped));
  
  // Iterate through ALL formData keys and ensure they're included
  for (const key in formData) {
    // Skip internal fields
    if (key.startsWith('_') || key === 'id' || key === '__v') {
      continue;
    }
    
    const value = formData[key];
    // Skip empty values
    if (value === undefined || value === null || value === '') {
      continue;
    }
    
    // Check if this is a calculated field - handle differently
    let isCalculatedField = false;
    if (template) {
      const field = template.sections
        ?.flatMap((s: any) => s.fields || [])
        .find((f: any) => f.id === key);
      if (field && field.type === "calculated") {
        isCalculatedField = true;
        // Calculated fields should go to customFields for persistence
        // They represent computed values that should be stored with the entity
        const customKey = key.startsWith('field-') ? key.replace(/^field-/, '') : key;
        if (customFields[customKey] === undefined) {
          customFields[customKey] = value;
          if (process.env.NODE_ENV === 'development') {
            console.log('[mapAccountFormData] Added calculated field to customFields:', { key, customKey, value, fieldType: field.type });
          }
        }
        // Skip further processing for calculated fields - they don't map to standard entity fields
        continue;
      }
    }
    
    const fieldNameWithoutPrefix = key.replace(/^field-/, '');
    const isStandardField = standardAccountFields.includes(key) || standardAccountFields.includes(fieldNameWithoutPrefix);
    
    // If it's a standard field and not already mapped, map it
    if (isStandardField && !isCalculatedField) {
      // Try to map to standard field name (without 'field-' prefix)
      if (standardAccountFields.includes(fieldNameWithoutPrefix) && mapped[fieldNameWithoutPrefix] === undefined) {
        mapped[fieldNameWithoutPrefix] = value;
        mappedKeys.add(fieldNameWithoutPrefix);
        if (process.env.NODE_ENV === 'development') {
          console.log('[mapAccountFormData] Mapped standard field:', { key, fieldName: fieldNameWithoutPrefix, value });
        }
      } 
      // Or map directly if key matches standard field
      else if (standardAccountFields.includes(key) && mapped[key] === undefined) {
        mapped[key] = value;
        mappedKeys.add(key);
        if (process.env.NODE_ENV === 'development') {
          console.log('[mapAccountFormData] Mapped standard field directly:', { key, value });
        }
      }
    } else if (!isCalculatedField) {
      // Custom field - store in customFields
      const customKey = key.startsWith('field-') ? key.replace(/^field-/, '') : key;
      // Only add if not already in mapped or customFields
      if (!mappedKeys.has(customKey) && !mappedKeys.has(key) && customFields[customKey] === undefined) {
        customFields[customKey] = value;
        if (process.env.NODE_ENV === 'development') {
          console.log('[mapAccountFormData] Added custom field:', { key, customKey, value });
        }
      }
    }
  }
  
  // Add customFields to mapped object if there are any
  if (Object.keys(customFields).length > 0) {
    mapped.customFields = customFields;
    if (process.env.NODE_ENV === 'development') {
      console.log('[mapAccountFormData] Custom fields collected:', customFields);
      console.log('[mapAccountFormData] Custom fields count:', Object.keys(customFields).length);
    }
  }

  // Debug: Log the final mapped object
  if (process.env.NODE_ENV === 'development') {
    console.log('[mapAccountFormData] Final mapped object:', mapped);
    console.log('[mapAccountFormData] CompanyName:', mapped.companyName);
    console.log('[mapAccountFormData] Zone value:', mapped.zone);
    console.log('[mapAccountFormData] Zone exists in mapped:', 'zone' in mapped);
    console.log('[mapAccountFormData] Custom fields count:', Object.keys(customFields).length);
    console.log('[mapAccountFormData] All formData keys:', Object.keys(formData));
    if (template) {
      console.log('[mapAccountFormData] Template fields:', template.sections?.flatMap((s: any) => s.fields?.map((f: any) => ({ id: f.id, label: f.label })) || []) || []);
    }
  }

  return mapped;
}

/**
 * Map Lead form data to Lead entity structure
 */
export function mapLeadFormData(formData: Record<string, any>): Record<string, any> {
  return {
    firstName: formData["field-firstName"] || formData.firstName,
    lastName: formData["field-lastName"] || formData.lastName,
    email: formData["field-email"] || formData.email,
    phone: formData["field-phone"] || formData.phone,
    companyName: formData["field-companyName"] || formData.companyName,
    industry: formData["field-industry"] || formData.industry,
    jobTitle: formData["field-jobTitle"] || formData.jobTitle,
    source: formData["field-source"] || formData.source,
    status: formData["field-status"] || formData.status,
    score: formData["field-score"] ? Number(formData["field-score"]) : formData.score,
    notes: formData["field-notes"] || formData.notes,
    product: formData["field-product"] || formData.product,
    zone: formData["field-zone"] || formData.zone,
    address: formData["field-address"] || formData.address,
    assignedTo: formData["field-assignedTo"] || formData.assignedTo || null,
  };
}

/**
 * Map Contact form data to Contact entity structure
 */
export function mapContactFormData(formData: Record<string, any>): Record<string, any> {
  return {
    firstName: formData["field-firstName"] || formData.firstName,
    lastName: formData["field-lastName"] || formData.lastName,
    email: formData["field-email"] || formData.email,
    phone: formData["field-phone"] || formData.phone,
    jobTitle: formData["field-jobTitle"] || formData.jobTitle,
    department: formData["field-department"] || formData.department,
    accountId: formData["field-accountId"] || formData.accountId,
    assignedTo: formData["field-assignedTo"] || formData.assignedTo || null,
    isPrimaryContact: formData["field-isPrimaryContact"] || formData.isPrimaryContact || false,
    address: formData["field-address"] || formData.address,
  };
}

/**
 * Map Opportunity form data to Opportunity entity structure
 */
export function mapOpportunityFormData(formData: Record<string, any>, template?: any): Record<string, any> {
  // Helper function to get field value with multiple fallback options
  const getFieldValue = (fieldName: string, defaultValue: any = undefined, _allowEmpty: boolean = false, searchLabels?: string[]) => {
    // Try exact matches first
    let value = formData[`field-${fieldName}`] ?? formData[fieldName];

    // If not found and template is provided, try to find by label/name
    if ((value === undefined || value === null || value === '') && template) {
      const searchTerms = searchLabels || [fieldName];
      const fieldId = findFieldByLabelOrName(formData, template, searchTerms);
      if (fieldId) {
        value = formData[fieldId];
      }
    }

    // If still not found, try case-insensitive search
    if (value === undefined || value === null || value === '') {
      const lowerFieldName = fieldName.toLowerCase();
      for (const key in formData) {
        const lowerKey = key.toLowerCase();
        if (lowerKey === `field-${lowerFieldName}` || lowerKey === lowerFieldName) {
          value = formData[key];
          break;
        }
      }
    }

    return value !== undefined && value !== null && value !== '' ? value : defaultValue;
  };

  // Handle nested accountId and contactId (can be objects)
  const accountId = getFieldValue("accountId");
  const processedAccountId = typeof accountId === 'object' && accountId ? (accountId._id || accountId.id) : accountId;

  const contactId = getFieldValue("primaryContactId", undefined, false, ["primaryContactId", "contactId", "primaryContact"]);
  const processedContactId = typeof contactId === 'object' && contactId ? (contactId._id || contactId.id) : contactId;

  const assignedTo = getFieldValue("assignedTo");
  const processedAssignedTo = typeof assignedTo === 'object' && assignedTo ? (assignedTo._id || assignedTo.id) : assignedTo;

  // Handle dates
  const expectedCloseDate = getFieldValue("expectedCloseDate");
  const actualCloseDate = getFieldValue("actualCloseDate");

  // Handle numeric fields
  const revenue = getFieldValue("revenue", 0);
  const profitability = getFieldValue("profitability", 0);
  const expense = getFieldValue("expense");
  const expectedProfit = getFieldValue("expectedProfit");

  // Handle services array
  const services = formData.services || formData["field-services"] || [];

  const mapped: Record<string, any> = {
    name: getFieldValue("name"),
    accountId: processedAccountId,
    primaryContactId: processedContactId,
    oem: getFieldValue("oem"),
    description: getFieldValue("description", ""),
    stage: getFieldValue("stage", undefined, false, ["stage", "opportunityStage"]),
    status: getFieldValue("status", undefined, false, ["status", "opportunityStatus"]),
    type: getFieldValue("type", undefined, false, ["type", "opportunityType"]),
    revenue: revenue ? Number(revenue) : 0,
    profitability: profitability ? Number(profitability) : 0,
    expectedProfit: expectedProfit ? Number(expectedProfit) : undefined,
    expense: expense ? Number(expense) : undefined,
    services: Array.isArray(services) ? services : [],
    expectedCloseDate: expectedCloseDate ? (typeof expectedCloseDate === "string" ? new Date(expectedCloseDate) : expectedCloseDate) : undefined,
    actualCloseDate: actualCloseDate ? (typeof actualCloseDate === "string" ? new Date(actualCloseDate) : actualCloseDate) : undefined,
    nextStep: getFieldValue("nextStep", ""),
    competition: getFieldValue("competition", ""),
    decisionCriteria: getFieldValue("decisionCriteria", ""),
    assignedTo: processedAssignedTo || null,
  };

  // Collect ALL remaining fields from formData as custom fields
  const standardOpportunityFields = [
    'name', 'accountId', 'primaryContactId', 'oem', 'stage', 'status', 'type',
    'revenue', 'profitability', 'expectedProfit', 'expense', 'services',
    'expectedCloseDate', 'actualCloseDate', 'description', 'nextStep',
    'competition', 'decisionCriteria', 'assignedTo', 'createdBy', 'updatedBy',
    'orgCode', 'formTemplateId', 'customFields'
  ];

  const customFields: Record<string, any> = {};
  const mappedKeys = new Set(Object.keys(mapped));

  // Iterate through ALL formData keys and ensure they're included
  for (const key in formData) {
    // Skip internal fields
    if (key.startsWith('_') || key === 'id' || key === '__v') {
      continue;
    }

    const value = formData[key];
    // Skip empty values
    if (value === undefined || value === null || value === '') {
      continue;
    }

    // Check if this is a calculated field - handle differently
    let isCalculatedField = false;
    if (template) {
      const field = template.sections
        ?.flatMap((s: any) => s.fields || [])
        .find((f: any) => f.id === key);
      if (field && field.type === "calculated") {
        isCalculatedField = true;
        // Calculated fields should go to customFields for persistence
        const customKey = key.startsWith('field-') ? key.replace(/^field-/, '') : key;
        if (customFields[customKey] === undefined) {
          customFields[customKey] = value;
          if (process.env.NODE_ENV === 'development') {
            console.log('[mapOpportunityFormData] Added calculated field to customFields:', { key, customKey, value, fieldType: field.type });
          }
        }
        // Skip further processing for calculated fields
        continue;
      }
    }

    const fieldNameWithoutPrefix = key.replace(/^field-/, '');
    const isStandardField = standardOpportunityFields.includes(key) || standardOpportunityFields.includes(fieldNameWithoutPrefix);

    // If it's a standard field and not already mapped, map it
    if (isStandardField && !isCalculatedField) {
      // Try to map to standard field name (without 'field-' prefix)
      if (standardOpportunityFields.includes(fieldNameWithoutPrefix) && mapped[fieldNameWithoutPrefix] === undefined) {
        mapped[fieldNameWithoutPrefix] = value;
        mappedKeys.add(fieldNameWithoutPrefix);
        if (process.env.NODE_ENV === 'development') {
          console.log('[mapOpportunityFormData] Mapped standard field:', { key, fieldName: fieldNameWithoutPrefix, value });
        }
      }
      // Or map directly if key matches standard field
      else if (standardOpportunityFields.includes(key) && mapped[key] === undefined) {
        mapped[key] = value;
        mappedKeys.add(key);
        if (process.env.NODE_ENV === 'development') {
          console.log('[mapOpportunityFormData] Mapped standard field directly:', { key, value });
        }
      }
    } else if (!isCalculatedField) {
      // Custom field - store in customFields
      const customKey = key.startsWith('field-') ? key.replace(/^field-/, '') : key;
      // Only add if not already in mapped or customFields
      if (!mappedKeys.has(customKey) && !mappedKeys.has(key) && customFields[customKey] === undefined) {
        customFields[customKey] = value;
        if (process.env.NODE_ENV === 'development') {
          console.log('[mapOpportunityFormData] Added custom field:', { key, customKey, value });
        }
      }
    }
  }

  // Add customFields to mapped object if there are any
  if (Object.keys(customFields).length > 0) {
    mapped.customFields = customFields;
    if (process.env.NODE_ENV === 'development') {
      console.log('[mapOpportunityFormData] Custom fields collected:', customFields);
      console.log('[mapOpportunityFormData] Custom fields count:', Object.keys(customFields).length);
    }
  }

  // Debug: Log the final mapped object
  if (process.env.NODE_ENV === 'development') {
    console.log('[mapOpportunityFormData] Final mapped object:', mapped);
    console.log('[mapOpportunityFormData] Custom fields count:', Object.keys(customFields).length);
  }

  return mapped;
}


/**
 * Generic mapper that selects the right mapper based on entity type
 */
export function mapFormDataToEntity(
  entityType: string,
  formData: Record<string, any>,
  template?: any // Optional template to help map field IDs to entity fields
): Record<string, any> {
  const type = entityType.toLowerCase();
  
  // Debug: Log all form data keys to see what's being passed
  if (process.env.NODE_ENV === 'development') {
    console.log('[mapFormDataToEntity] Input formData keys:', Object.keys(formData));
    console.log('[mapFormDataToEntity] Zone-related keys:', Object.keys(formData).filter(k => k.toLowerCase().includes('zone')));
    console.log('[mapFormDataToEntity] Full formData:', formData);
  }
  
  let mappedData: Record<string, any>;
  
  switch (type) {
    case "account":
      mappedData = mapAccountFormData(formData, template);
      break;
    case "lead":
      mappedData = mapLeadFormData(formData);
      break;
    case "contact":
      mappedData = mapContactFormData(formData);
      break;
    case "opportunity":
      mappedData = mapOpportunityFormData(formData, template);
      break;
    default:
      // Return form data as-is if no mapper exists
      mappedData = formData;
  }
  
  // For accounts, ensure all form fields are included (either in mapped fields or customFields)
  if (type === "account" && template) {
    // Get all field IDs from template
    const templateFieldIds = new Set<string>();
    template.sections?.forEach((section: any) => {
      section.fields?.forEach((field: any) => {
        if (field.id) {
          templateFieldIds.add(field.id);
        }
      });
    });
    
    // Check if any template fields are missing from mappedData
    const missingFields: Record<string, any> = {};
    templateFieldIds.forEach((fieldId) => {
      // Check if this field exists in formData but not in mappedData
      if (formData[fieldId] !== undefined && formData[fieldId] !== null && formData[fieldId] !== '') {
        // Check if it's already mapped to a standard field
        const isMapped = Object.values(mappedData).includes(formData[fieldId]) || 
                        mappedData[fieldId] !== undefined ||
                        (mappedData.customFields && mappedData.customFields[fieldId] !== undefined);
        
        if (!isMapped) {
          // Try to find if it maps to a standard field by label/name
          const field = template.sections
            ?.flatMap((s: any) => s.fields || [])
            .find((f: any) => f.id === fieldId);
          
          if (field) {
            // Skip calculated fields - they should only go to customFields
            if (field.type === "calculated") {
              // Store calculated field in customFields
              if (!mappedData.customFields) {
                mappedData.customFields = {};
              }
              const customKey = fieldId.startsWith('field-') ? fieldId.replace(/^field-/, '') : fieldId;
              mappedData.customFields[customKey] = formData[fieldId];
            if (process.env.NODE_ENV === 'development') {
              console.log('[mapFormDataToEntity] Stored calculated field:', { fieldId, customKey, value: formData[fieldId] });
            }
            } else {
              const fieldLabel = (field.label || '').toLowerCase();
              const standardFieldMap: Record<string, string> = {
                'phone': 'phone',
                'zone': 'zone',
                'segment': 'segment',
                'employees count': 'employeesCount',
                'employee count': 'employeesCount',
                'invoicing': 'invoicing',
                'credit term': 'creditTerm',
                'credit terms': 'creditTerm',
                'gst no': 'gstNo',
                'gst number': 'gstNo',
                'gstin': 'gstNo',
                'parent account': 'parentAccount',
              };
              
              const mappedFieldName = standardFieldMap[fieldLabel];
              if (mappedFieldName && !mappedData[mappedFieldName]) {
                // Map to standard field
                mappedData[mappedFieldName] = formData[fieldId];
              } else {
                // Store in customFields
                if (!mappedData.customFields) {
                  mappedData.customFields = {};
                }
                const customKey = fieldId.startsWith('field-') ? fieldId.replace(/^field-/, '') : fieldId;
                mappedData.customFields[customKey] = formData[fieldId];
              }
            }
          }
        }
      }
    });
    
    if (process.env.NODE_ENV === 'development' && Object.keys(missingFields).length > 0) {
      console.log('[mapFormDataToEntity] Added missing template fields:', missingFields);
    }
  }
  
  // Ensure zone is included if it exists in formData (fallback for any field ID format)
  if (!mappedData.zone) {
    // First, try to find zone field by label in template
    if (template) {
      const zoneFieldId = findFieldByLabelOrName(formData, template, ['zone', 'region']);
      if (zoneFieldId && formData[zoneFieldId]) {
        mappedData.zone = formData[zoneFieldId];
        if (process.env.NODE_ENV === 'development') {
          console.log('[mapFormDataToEntity] Found zone by template label:', { fieldId: zoneFieldId, value: mappedData.zone });
        }
      }
    }
    
    // If still not found, try to find zone in any format
    if (!mappedData.zone) {
      const zoneKeys = Object.keys(formData).filter(k => k.toLowerCase().includes('zone'));
      if (zoneKeys.length > 0) {
        for (const key of zoneKeys) {
          const zoneValue = formData[key];
          if (zoneValue !== undefined && zoneValue !== null && zoneValue !== '') {
            mappedData.zone = zoneValue;
            if (process.env.NODE_ENV === 'development') {
              console.log('[mapFormDataToEntity] Found zone in formData:', { key, value: zoneValue });
            }
            break;
          }
        }
      }
    }
  }
  
  // Debug: Log mapped data to see what's being returned
  if (process.env.NODE_ENV === 'development') {
    console.log('[mapFormDataToEntity] Mapped data:', mappedData);
    console.log('[mapFormDataToEntity] Zone in mapped data:', mappedData.zone);
    console.log('[mapFormDataToEntity] Zone check - exists:', 'zone' in mappedData);
    console.log('[mapFormDataToEntity] Zone value:', mappedData.zone);
  }
  
  return mappedData;
}

/**
 * Map entity data to form field IDs (for edit mode)
 */
export function mapEntityToFormData(
  entityType: string,
  entityData: Record<string, any>
): Record<string, any> {
  const type = entityType.toLowerCase();
  const formData: Record<string, any> = {};

  // Common fields
  if (entityData.email) formData["field-email"] = entityData.email;
  if (entityData.phone) formData["field-phone"] = entityData.phone;
  if (entityData.assignedTo) {
    formData["field-assignedTo"] =
      typeof entityData.assignedTo === "object"
        ? entityData.assignedTo._id || entityData.assignedTo.id
        : entityData.assignedTo;
  }

  switch (type) {
    case "account":
      if (entityData.companyName) formData["field-companyName"] = entityData.companyName;
      if (entityData.description) formData["field-description"] = entityData.description;
      if (entityData.industry) formData["field-industry"] = entityData.industry;
      if (entityData.status) formData["field-status"] = entityData.status;
      if (entityData.accountType) formData["field-accountType"] = entityData.accountType;
      if (entityData.segment) formData["field-segment"] = entityData.segment;
      if (entityData.employeesCount) formData["field-employeesCount"] = entityData.employeesCount;
      if (entityData.annualRevenue) formData["field-annualRevenue"] = entityData.annualRevenue;
      if (entityData.ownershipType) formData["field-ownershipType"] = entityData.ownershipType;
      if (entityData.invoicing) formData["field-invoicing"] = entityData.invoicing;
      if (entityData.creditTerm) formData["field-creditTerm"] = entityData.creditTerm;
      if (entityData.gstNo) formData["field-gstNo"] = entityData.gstNo;
      if (entityData.zone) formData["field-zone"] = entityData.zone;
      if (entityData.website) formData["field-website"] = entityData.website;
      if (entityData.billingAddress) formData["field-billingAddress"] = entityData.billingAddress;
      if (entityData.shippingAddress) formData["field-shippingAddress"] = entityData.shippingAddress;
      break;

    case "lead":
      if (entityData.firstName) formData["field-firstName"] = entityData.firstName;
      if (entityData.lastName) formData["field-lastName"] = entityData.lastName;
      if (entityData.companyName) formData["field-companyName"] = entityData.companyName;
      if (entityData.industry) formData["field-industry"] = entityData.industry;
      if (entityData.jobTitle) formData["field-jobTitle"] = entityData.jobTitle;
      if (entityData.source) formData["field-source"] = entityData.source;
      if (entityData.status) formData["field-status"] = entityData.status;
      if (entityData.score) formData["field-score"] = entityData.score;
      if (entityData.notes) formData["field-notes"] = entityData.notes;
      if (entityData.product) formData["field-product"] = entityData.product;
      if (entityData.zone) formData["field-zone"] = entityData.zone;
      if (entityData.address) formData["field-address"] = entityData.address;
      break;

    case "contact":
      if (entityData.firstName) formData["field-firstName"] = entityData.firstName;
      if (entityData.lastName) formData["field-lastName"] = entityData.lastName;
      if (entityData.jobTitle) formData["field-jobTitle"] = entityData.jobTitle;
      if (entityData.department) formData["field-department"] = entityData.department;
      if (entityData.accountId) {
        formData["field-accountId"] =
          typeof entityData.accountId === "object"
            ? entityData.accountId._id || entityData.accountId.id
            : entityData.accountId;
      }
      if (entityData.isPrimaryContact !== undefined)
        formData["field-isPrimaryContact"] = entityData.isPrimaryContact;
      if (entityData.address) formData["field-address"] = entityData.address;
      break;

    case "opportunity":
      if (entityData.name) formData["field-name"] = entityData.name;
      if (entityData.accountId) {
        formData["field-accountId"] =
          typeof entityData.accountId === "object"
            ? entityData.accountId._id || entityData.accountId.id
            : entityData.accountId;
      }
      if (entityData.contactId) {
        formData["field-contactId"] =
          typeof entityData.contactId === "object"
            ? entityData.contactId._id || entityData.contactId.id
            : entityData.contactId;
      }
      if (entityData.stage) formData["field-stage"] = entityData.stage;
      if (entityData.probability) formData["field-probability"] = entityData.probability;
      if (entityData.amount) formData["field-amount"] = entityData.amount;
      if (entityData.expectedCloseDate)
        formData["field-expectedCloseDate"] = entityData.expectedCloseDate;
      if (entityData.description) formData["field-description"] = entityData.description;
      break;
  }

  return formData;
}

