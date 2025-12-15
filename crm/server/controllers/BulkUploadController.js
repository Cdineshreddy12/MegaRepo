import Papa from 'papaparse';
import XLSX from 'xlsx';
import mongoose from 'mongoose';

// Enhanced schema details function that handles nested objects like address
const getSchemaDetails = (model) => {
  const schemaObj = {};
  const requiredFields = [];
  const uniqueFields = [];
  const fieldTypes = {};
  const references = {};
  const nestedFields = {};

  // Pre-check: scan top level schema for address patterns
  const addressFieldPatterns = ['address', 'billingAddress', 'shippingAddress', 'mailingAddress', 'homeAddress', 'workAddress'];
  const potentialAddressFields = Object.entries(model.schema.paths)
    .filter(([key]) => addressFieldPatterns.some(pattern => key === pattern))
    .map(([key]) => key);
  
  console.log("Potential address fields detected:", potentialAddressFields);

  // Process each path in the schema
  Object.entries(model.schema.paths).forEach(([fieldName, fieldSchema]) => {
    // Skip internal mongoose fields
    if (['_id', '__v', 'createdAt', 'updatedAt'].includes(fieldName)) {
      return;
    }

    // Handle nested fields like address.street, address.city, etc.
    if (fieldName.includes('.')) {
      const [parentField, childField] = fieldName.split('.');
      
      // Initialize the parent object if not already done
      if (!nestedFields[parentField]) {
        nestedFields[parentField] = {};
      }
      
      // Add child field to the parent's nested fields
      nestedFields[parentField][childField] = {
        type: fieldSchema.instance,
        required: !!fieldSchema.isRequired,
        path: fieldName
      };
      
      // Also track the field type for validation
      fieldTypes[fieldName] = fieldSchema.instance;
      
      // Track required nested fields
      if (fieldSchema.isRequired) {
        requiredFields.push(fieldName);
      }
      
      return;
    }

    // Handle regular (non-nested) fields
    schemaObj[fieldName] = {
      type: fieldSchema.instance,
      required: !!fieldSchema.isRequired,
      unique: !!fieldSchema.options.unique,
      ref: fieldSchema.options.ref,
      enum: fieldSchema.enumValues,
      default: fieldSchema.defaultValue
    };

    // Special handling for objects that might be nested schemas
    if (fieldSchema.instance === 'Object' && fieldSchema.schema) {
      schemaObj[fieldName].isNested = true;
      
      // Process the nested schema - first approach using schema paths
      try {
        if (fieldSchema.schema && fieldSchema.schema.paths) {
          Object.entries(fieldSchema.schema.paths).forEach(([nestedKey, nestedSchema]) => {
            // Skip internal mongoose fields in nested schema
            if (['_id', '__v'].includes(nestedKey)) {
              return;
            }
            
            // Initialize the parent in nestedFields if needed
            if (!nestedFields[fieldName]) {
              nestedFields[fieldName] = {};
            }
            
            // Add nested field details
            nestedFields[fieldName][nestedKey] = {
              type: nestedSchema.instance,
              required: !!nestedSchema.isRequired,
              path: `${fieldName}.${nestedKey}`
            };
            
            // Also add to fieldTypes for validation
            fieldTypes[`${fieldName}.${nestedKey}`] = nestedSchema.instance;
            
            // Track required nested fields
            if (nestedSchema.isRequired) {
              requiredFields.push(`${fieldName}.${nestedKey}`);
            }
          });
        }
      } catch (err) {
        console.warn(`Error processing nested schema for ${fieldName} using paths:`, err.message);
      }
      
      // If we couldn't process using paths, try an alternative approach using schema.obj
      // This catches cases where the nested paths aren't directly accessible
      if (!nestedFields[fieldName] || Object.keys(nestedFields[fieldName]).length === 0) {
        try {
          if (fieldSchema.schema && fieldSchema.schema.obj) {
            Object.entries(fieldSchema.schema.obj).forEach(([nestedKey, nestedSchemaObj]) => {
              // Initialize the parent in nestedFields if needed
              if (!nestedFields[fieldName]) {
                nestedFields[fieldName] = {};
              }
              
              // Determine type from the schema object
              let type = 'String';  // Default
              if (nestedSchemaObj.type) {
                if (nestedSchemaObj.type === String) type = 'String';
                else if (nestedSchemaObj.type === Number) type = 'Number';
                else if (nestedSchemaObj.type === Boolean) type = 'Boolean';
                else if (nestedSchemaObj.type === Date) type = 'Date';
                else type = 'Mixed';
              }
              
              // Add nested field details
              nestedFields[fieldName][nestedKey] = {
                type: type,
                required: !!nestedSchemaObj.required,
                path: `${fieldName}.${nestedKey}`
              };
              
              // Also add to fieldTypes for validation
              fieldTypes[`${fieldName}.${nestedKey}`] = type;
              
              // Track required nested fields
              if (nestedSchemaObj.required) {
                requiredFields.push(`${fieldName}.${nestedKey}`);
              }
            });
          }
        } catch (err) {
          console.warn(`Error processing nested schema for ${fieldName} using obj:`, err.message);
        }
      }
    }

    if (fieldSchema.isRequired) {
      requiredFields.push(fieldName);
    }

    if (fieldSchema.options.unique) {
      uniqueFields.push(fieldName);
    }

    fieldTypes[fieldName] = fieldSchema.instance;

    if (fieldSchema.options.ref) {
      references[fieldName] = fieldSchema.options.ref;
    }
  });

  // ENHANCED SOLUTION: Explicitly handle all address fields detected earlier
  potentialAddressFields.forEach(addressField => {
    // If we haven't properly detected nested fields for this address field,
    // manually add the standard address structure
    if (!nestedFields[addressField] || Object.keys(nestedFields[addressField]).length === 0) {
      const addressFields = {
        street: { type: 'String', required: false },
        city: { type: 'String', required: false },
        state: { type: 'String', required: false },
        zipCode: { type: 'String', required: false },
        country: { type: 'String', required: false }
      };
      
      console.log(`Manually injecting address fields for ${addressField}`);
      
      nestedFields[addressField] = {};
      Object.entries(addressFields).forEach(([key, config]) => {
        nestedFields[addressField][key] = {
          type: config.type,
          required: config.required,
          path: `${addressField}.${key}`
        };
        
        fieldTypes[`${addressField}.${key}`] = config.type;
        
        if (config.required) {
          requiredFields.push(`${addressField}.${key}`);
        }
      });
    }
  });

  // Ensure we have nested fields for the generic address field
  if (!nestedFields.address && !potentialAddressFields.includes('address')) {
    nestedFields.address = {
      street: { type: 'String', required: false, path: 'address.street' },
      city: { type: 'String', required: false, path: 'address.city' },
      state: { type: 'String', required: false, path: 'address.state' },
      zipCode: { type: 'String', required: false, path: 'address.zipCode' },
      country: { type: 'String', required: false, path: 'address.country' }
    };
    
    // Add to fieldTypes
    Object.keys(nestedFields.address).forEach(key => {
      fieldTypes[`address.${key}`] = 'String';
    });
  }

  return {
    schema: schemaObj,
    requiredFields,
    uniqueFields,
    fieldTypes,
    references,
    nestedFields
  };
};

// Helper to validate field value based on type
const validateFieldValue = (value, type, options = {}) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  try {
    switch (type) {
      case 'Number':
        const num = Number(value);
        return isNaN(num) ? 'Invalid number' : null;
      case 'Date':
        const date = new Date(value);
        return isNaN(date.getTime()) ? 'Invalid date' : null;
      case 'Boolean':
        if (!['true', 'false', '0', '1', true, false].includes(value)) {
          return 'Invalid boolean value';
        }
        return null;
      case 'ObjectID':
        if (!mongoose.Types.ObjectId.isValid(value)) {
          return 'Invalid ObjectID';
        }
        return null;
      default:
        return null;
    }
  } catch (error) {
    return `Invalid ${type.toLowerCase()}`;
  }
};

// Generate template handler with support for nested fields
export const generateTemplate = async (req, res) => {
  try {
    const { modelName } = req.params;
    const Model = mongoose.model(modelName);
    
    if (!Model) {
      return res.status(400).json({ message: 'Invalid model name' });
    }

    const { schema, requiredFields, nestedFields } = getSchemaDetails(Model);

    // Create template headers including nested fields
    const headers = [];
    
    // Process regular fields
    Object.entries(schema).forEach(([fieldName, details]) => {
      // Skip nested objects since we'll handle them separately
      if (details.isNested) {
        return;
      }
      
      headers.push({
        label: fieldName,
        required: details.required,
        type: details.type,
        enum: details.enum
      });
    });
    
    // Process nested fields with special handling for multiple address fields
    Object.entries(nestedFields).forEach(([parentField, childFields]) => {
      // Address fields need prefix to distinguish between billing and shipping
      const isAddressField = parentField === 'billingAddress' || 
                           parentField === 'shippingAddress' || 
                           parentField === 'address';
      
      Object.entries(childFields).forEach(([childField, details]) => {
        const actualChildField = childField === 'zipcode' ? 'zipCode' : childField;
        
        // For address fields, prefix with the parent type (billing/shipping)
        let displayLabel = actualChildField;
        if (isAddressField) {
          // Use a prefix for the display name based on the parent field
          const prefix = parentField === 'billingAddress' ? 'billing' :
                       parentField === 'shippingAddress' ? 'shipping' : '';
          // Capitalize the child field
          const capitalizedChild = actualChildField.charAt(0).toUpperCase() + actualChildField.slice(1);
          // Create display label like "billingStreet" or "shippingCity"
          displayLabel = prefix ? `${prefix}${capitalizedChild}` : actualChildField;
        }
        
        headers.push({
          label: actualChildField,
          displayLabel: displayLabel,
          originalPath: `${parentField}.${actualChildField}`,
          required: details.required,
          type: details.type,
          parentField: parentField
        });
      });
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Create main template sheet
    const ws = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(ws, [headers.map(h => `${h.displayLabel || h.label}${h.required ? '*' : ''}`)]);

    // Add example data row
    const exampleRow = {};
    headers.forEach(h => {
      const key = h.displayLabel || h.label;
      
      // Provide example values based on field type and name
      if (h.label.includes('email')) {
        exampleRow[key] = 'example@company.com';
      } else if (h.label.includes('phone')) {
        exampleRow[key] = '+1234567890';
      } else if (key.includes('street') || key.includes('Street')) {
        exampleRow[key] = '123 Main St';
      } else if (key.includes('city') || key.includes('City')) {
        exampleRow[key] = 'City Name';
      } else if (key.includes('state') || key.includes('State')) {
        exampleRow[key] = 'State';
      } else if (key.includes('zipCode') || key.includes('ZipCode')) {
        exampleRow[key] = '12345';
      } else if (key.includes('country') || key.includes('Country')) {
        exampleRow[key] = 'United States';
      } else if (h.type === 'Date') {
        exampleRow[key] = new Date().toISOString().split('T')[0];
      } else if (h.type === 'Number') {
        exampleRow[key] = '0';
      } else if (h.type === 'Boolean') {
        exampleRow[key] = 'true';
      } else if (h.enum && h.enum.length > 0) {
        exampleRow[key] = h.enum[0];
      } else {
        exampleRow[key] = '';
      }
    });
    
    // Add the example row
    XLSX.utils.sheet_add_json(ws, [exampleRow], { skipHeader: true, origin: 'A2' });

    // Store the field mapping for upload processing
    const fieldMapping = {};
    headers.forEach(h => {
      if (h.originalPath) {
        fieldMapping[h.displayLabel || h.label] = h.originalPath;
      }
    });

    // Add validation info sheet
    const validationInfo = headers.map(h => ({
      Field: h.displayLabel || h.label,
      Required: h.required ? 'Yes' : 'No',
      Type: h.type,
      ValidValues: h.enum ? h.enum.join(', ') : 'Any'
    }));
    const wsValidation = XLSX.utils.json_to_sheet(validationInfo);

    // Add mapping sheet (hidden from users but used by the upload processor)
    const mappingData = Object.entries(fieldMapping).map(([display, path]) => ({
      DisplayField: display,
      ActualPath: path
    }));
    const wsMapping = XLSX.utils.json_to_sheet(mappingData);

    // Add instructions sheet
    const instructions = [
      ['Bulk Upload Instructions'],
      [''],
      ['1. Fields marked with an asterisk (*) are required.'],
      ['2. Address fields are separated into shipping and billing addresses.'],
      ['3. Email addresses must be in a valid format (e.g., user@example.com).'],
      ['4. Phone numbers should include country code (e.g., +1234567890).'],
      ['5. The template includes a sample row - please replace it with your actual data.'],
      [''],
      ['Field Format Notes:'],
      ['- Dates should be in YYYY-MM-DD format'],
      ['- Boolean values should be "true" or "false"'],
      ['- For fields with specific valid values, check the "Field Info" sheet']
    ];
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);

    // Add sheets to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.utils.book_append_sheet(wb, wsValidation, 'Field Info');
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');
    XLSX.utils.book_append_sheet(wb, wsMapping, '_Mapping'); // Hidden sheet for internal use

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${modelName.toLowerCase()}_template.xlsx`);
    res.send(buffer);

  } catch (error) {
    console.error('Template generation error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Export handler with support for nested fields
export const exportData = async (req, res) => {
  try {
    const { modelName } = req.params;
    const Model = mongoose.model(modelName);
    
    if (!Model) {
      return res.status(400).json({ message: 'Invalid model name' });
    }

    const schemaDetails = getSchemaDetails(Model);

    // Get all records - handle populate carefully to avoid ObjectId casting errors
    let query = Model.find({});

    // Only populate references that are likely to be ObjectIds
    // Skip populating fields that might contain UUID strings or other non-ObjectId values
    const validReferences = Object.keys(schemaDetails.references).filter(ref => {
      // For now, we'll skip populating user-related references that might be UUIDs
      // This can be enhanced based on specific model requirements
      const skipRefs = ['createdBy', 'updatedBy', 'assignedTo', 'userId', 'employeeCode'];
      return !skipRefs.includes(ref);
    });

    if (validReferences.length > 0) {
      query = query.populate(validReferences);
    }

    const records = await query.lean();

    // Process records for export, flattening nested objects with direct field names
    const processedRecords = records.map(record => {
      const processedRecord = {};
      
      // Always include the MongoDB ID
      processedRecord._id = record._id.toString();
      
      // Process regular fields
      Object.entries(schemaDetails.schema).forEach(([fieldName, details]) => {
        // Skip nested objects since we'll handle them separately
        if (details.isNested) {
          return;
        }
        
        let value = record[fieldName];
        
        // Handle populated fields
        if (details.ref && value) {
          if (typeof value === 'object') {
            // Include both the ID and the readable value
            processedRecord[`${fieldName}_id`] = value._id ? value._id.toString() : null;
            processedRecord[fieldName] = value.name || 
                                        (value.firstName && `${value.firstName} ${value.lastName || ''}`) || 
                                        (value._id ? value._id.toString() : null);
          } else {
            processedRecord[fieldName] = value;
          }
        } else {
          processedRecord[fieldName] = value;
        }
      });
      
      // Process nested fields with direct names
      Object.entries(schemaDetails.nestedFields).forEach(([parentField, childFields]) => {
        if (record[parentField]) {
          // Create a prefix based on parent field name
          const prefix = parentField === 'billingAddress' ? 'billing' :
                        parentField === 'shippingAddress' ? 'shipping' : '';
          
          Object.entries(childFields).forEach(([childField, details]) => {
            // For address fields, use prefixed names
            if (prefix) {
              const capitalizedChild = childField.charAt(0).toUpperCase() + childField.slice(1);
              const fieldName = `${prefix}${capitalizedChild}`;
              processedRecord[fieldName] = record[parentField][childField];
            } else {
              // For other nested fields, use parent.child notation
              processedRecord[`${parentField}.${childField}`] = record[parentField][childField];
            }
          });
        }
      });

      return processedRecord;
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(processedRecords);
    XLSX.utils.book_append_sheet(wb, ws, 'Data');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${modelName.toLowerCase()}_export.xlsx`);
    res.send(buffer);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: error.message });
  }
};

const cleanFieldName = (fieldName) => {
  // Remove asterisks from field names (used to mark required fields in templates)
  return fieldName.replace(/\*/g, '');
};

// Bulk upload handler with support for nested fields
export const bulkUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const { modelName } = req.params;
    const Model = mongoose.model(modelName);
    
    if (!Model) {
      return res.status(400).json({ message: 'Invalid model name' });
    }

    const schemaDetails = getSchemaDetails(Model);

    // Debug log schema details
    console.log('Required fields:', schemaDetails.requiredFields);
    console.log('Nested fields:', Object.keys(schemaDetails.nestedFields));

    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname.toLowerCase();
    let records = [];
    let fieldMapping = {};
    let originalHeaders = [];

    // Parse file based on extension
    if (fileName.endsWith('.csv')) {
      const csvText = fileBuffer.toString('utf8');
      const parsedCsv = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: header => header.trim() // Keep asterisks for now
      });
      records = parsedCsv.data;
      originalHeaders = parsedCsv.meta.fields;
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const workbook = XLSX.read(fileBuffer, {
        type: 'buffer',
        cellDates: true,
        dateNF: 'yyyy-mm-dd'
      });
      
      // Try to get the mapping sheet if it exists
      try {
        if (workbook.SheetNames.includes('_Mapping')) {
          const mappingSheet = workbook.Sheets['_Mapping'];
          const mappingData = XLSX.utils.sheet_to_json(mappingSheet);
          
          mappingData.forEach(item => {
            if (item.DisplayField && item.ActualPath) {
              // Clean the display field to handle potential asterisks
              const cleanedDisplayField = cleanFieldName(item.DisplayField);
              fieldMapping[cleanedDisplayField] = item.ActualPath;
              // Also keep the original mapping in case headers still have asterisks
              fieldMapping[item.DisplayField] = item.ActualPath;
            }
          });
          console.log('Field mapping loaded:', fieldMapping);
        }
      } catch (err) {
        console.warn('No mapping sheet found or could not be processed:', err.message);
      }
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Get original headers from the sheet
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      originalHeaders = [];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = worksheet[XLSX.utils.encode_cell({r: range.s.r, c: C})];
        if (cell && cell.v) originalHeaders.push(cell.v);
      }
      
      records = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        defval: null
      });
    } else {
      return res.status(400).json({ message: 'Please upload a CSV or Excel file' });
    }

    if (records.length === 0) {
      return res.status(400).json({ message: 'File is empty' });
    }

    // Debug log record sample and headers
    console.log('Original headers:', originalHeaders);
    console.log('First record sample:', records[0]);
    console.log('Record keys:', Object.keys(records[0]));

    // Create a mapping from original headers to cleaned headers
    const headerMapping = {};
    originalHeaders.forEach(header => {
      headerMapping[header] = cleanFieldName(header);
    });
    console.log('Header cleaning mapping:', headerMapping);

    const results = {
      successful: [],
      failed: [],
      warnings: []
    };

    // Regular address field patterns
    const addressFields = ['street', 'city', 'state', 'zipcode', 'zipCode', 'country'];
    
    // Prefixed address field patterns for billing and shipping
    const billingPattern = /^billing(Street|City|State|ZipCode|Country)$/i;
    const shippingPattern = /^shipping(Street|City|State|ZipCode|Country)$/i;

    // Function to get the parent object for a nested field
    const getParentAndChildForField = (field) => {
      // Clean the field name first
      const cleanedField = cleanFieldName(field);
      
      // First check explicit mapping from the mapping sheet
      if (fieldMapping[cleanedField]) {
        const parts = fieldMapping[cleanedField].split('.');
        return { parent: parts[0], child: parts[1] };
      }
      
      // Check for billing address pattern
      const billingMatch = cleanedField.match(billingPattern);
      if (billingMatch) {
        // Extract child field and convert to lowercase
        const childField = billingMatch[1].toLowerCase();
        return { parent: 'billingAddress', child: childField === 'zipcode' ? 'zipCode' : childField };
      }
      
      // Check for shipping address pattern
      const shippingMatch = cleanedField.match(shippingPattern);
      if (shippingMatch) {
        // Extract child field and convert to lowercase
        const childField = shippingMatch[1].toLowerCase();
        return { parent: 'shippingAddress', child: childField === 'zipcode' ? 'zipCode' : childField };
      }
      
      // Check for regular address fields (for backward compatibility)
      if (addressFields.includes(cleanedField.toLowerCase())) {
        return { parent: 'address', child: cleanedField.toLowerCase() === 'zipcode' ? 'zipCode' : cleanedField.toLowerCase() };
      }
      
      // Not a nested field
      return null;
    };

    // Process records
    for (const [index, record] of records.entries()) {
      try {
        const processedRecord = {};
        const validationErrors = [];
        const nestedObjects = {};
        
        // First pass - identify and group nested fields
        Object.entries(record).forEach(([key, value]) => {
          // Skip empty values
          if (value === null || value === undefined || value === '') {
            return;
          }
          
          // Check if this is a nested field
          const nestedInfo = getParentAndChildForField(key);
          
          if (nestedInfo) {
            // This is a nested field
            const { parent, child } = nestedInfo;
            
            if (!nestedObjects[parent]) {
              nestedObjects[parent] = {};
            }
            
            nestedObjects[parent][child] = value;
          } else if (key.includes('.')) {
            // Handle dot notation if it's still in the data
            const [parent, child] = key.split('.');
            
            if (!nestedObjects[parent]) {
              nestedObjects[parent] = {};
            }
            
            nestedObjects[parent][child] = value;
          }
        });
        
        // Add nested objects to processed record
        Object.entries(nestedObjects).forEach(([parent, children]) => {
          if (Object.keys(children).length > 0) {
            processedRecord[parent] = children;
          }
        });

        // Second pass - process regular fields
        Object.entries(record).forEach(([key, value]) => {
          // Skip empty values
          if (value === null || value === undefined || value === '') {
            return;
          }
          
          // Skip fields that are part of nested objects
          const nestedInfo = getParentAndChildForField(key);
          if (nestedInfo || key.includes('.')) {
            return;
          }
          
          // Clean the field name by removing any asterisks
          const normalizedKey = cleanFieldName(key.trim());
          
          // Skip empty values unless field is required
          if (!schemaDetails.requiredFields.includes(normalizedKey)) {
            // Add it anyway since it's a provided field
            processedRecord[normalizedKey] = value;
          } else {
            // Validate required field value
            const validationError = validateFieldValue(
              value,
              schemaDetails.fieldTypes[normalizedKey],
              schemaDetails.schema[normalizedKey]
            );

            if (validationError) {
              validationErrors.push(`${normalizedKey}: ${validationError}`);
              return;
            }

            // Handle special types
            if (schemaDetails.fieldTypes[normalizedKey] === 'Boolean') {
              processedRecord[normalizedKey] = ['true', '1', true].includes(value);
            } else if (schemaDetails.fieldTypes[normalizedKey] === 'Date') {
              processedRecord[normalizedKey] = new Date(value);
            } else {
              processedRecord[normalizedKey] = value;
            }
          }
        });

        // Debug log processed record
        console.log('Processed record:', JSON.stringify(processedRecord));

        // Check required fields
        const missingFields = schemaDetails.requiredFields.filter(field => {
          // For nested fields (e.g., "address.street")
          if (field.includes('.')) {
            const [parent, child] = field.split('.');
            return !(
              processedRecord[parent] && 
              processedRecord[parent][child] !== undefined && 
              processedRecord[parent][child] !== null && 
              processedRecord[parent][child] !== ''
            );
          }
          
          // For regular fields
          return !processedRecord.hasOwnProperty(field);
        });

        if (missingFields.length > 0) {
          console.log('Missing required fields:', missingFields);
          results.failed.push({
            row: index + 2,
            reason: `Missing required fields: ${missingFields.join(', ')}`
          });
          continue;
        }

        // Check unique constraints
        let uniqueViolation = false;
        for (const field of schemaDetails.uniqueFields) {
          if (processedRecord[field]) {
            const existing = await Model.findOne({ [field]: processedRecord[field] });
            if (existing) {
              uniqueViolation = true;
              results.failed.push({
                row: index + 2,
                reason: `Duplicate value for ${field}`
              });
              break;
            }
          }
        }

        if (uniqueViolation || validationErrors.length > 0) {
          if (validationErrors.length > 0) {
            results.failed.push({
              row: index + 2,
              reason: validationErrors.join('; ')
            });
          }
          continue;
        }

        // Add metadata if needed
        if (!processedRecord.createdBy && req.user) {
          processedRecord.createdBy = req.user.userId;
        }

        // Create and save record
        const newRecord = new Model(processedRecord);
        await newRecord.save();

        results.successful.push({
          row: index + 2,
          id: newRecord._id
        });

      } catch (error) {
        console.error(`Error processing row ${index + 2}:`, error);
        results.failed.push({
          row: index + 2,
          reason: error.message
        });
      }
    }

    return res.status(200).json({
      message: 'Bulk upload completed',
      summary: {
        total: records.length,
        successful: results.successful.length,
        failed: results.failed.length,
        warnings: results.warnings.length
      },
      results
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
};

export default { generateTemplate, exportData, bulkUpload };