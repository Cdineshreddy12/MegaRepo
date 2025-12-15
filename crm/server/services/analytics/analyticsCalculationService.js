/**
 * Analytics Calculation Service
 * Main orchestrator for analytics calculations
 */

import FormSubmission from "../../models/FormSubmission.js";
import FormTemplate from "../../models/FormTemplate.js";
import AnalyticsFormula from "../../models/AnalyticsFormula.js";
import customFieldEvaluator from "./customFieldEvaluator.js";
import formulaExecutor from "./formulaExecutor.js";
import analyticsAiService from "./analyticsAiService.js";
import formulaExplanationService from "./formulaExplanationService.js";
import Account from "../../models/Account.js";

// Set field evaluator in formula executor
formulaExecutor.setFieldEvaluator(customFieldEvaluator);

class AnalyticsCalculationService {
  /**
   * Calculate analytics using formula ID
   * @param {String} formulaId - Formula ID
   * @param {Object} filters - Additional filters
   * @param {Object} dateRange - Date range filter
   * @param {String} tenantId - Tenant ID
   * @param {String} orgCode - Organization code
   * @returns {Promise<Object>} Calculation result
   */
  async calculate(formulaId, filters = {}, dateRange = {}, tenantId, orgCode = null) {
    try {
      // Load formula
      const formula = await AnalyticsFormula.findById(formulaId);
      if (!formula) {
        throw new Error('Formula not found');
      }

      // Check tenant isolation
      if (formula.tenantId !== tenantId) {
        throw new Error('Unauthorized access to formula');
      }

      // Fetch form submissions
      const submissions = await this.fetchSubmissions(
        formula.formTemplateId,
        { ...filters, ...this.buildDateFilter(dateRange) },
        tenantId,
        orgCode
      );

      console.log('📊 Fetched submissions for calculation:', {
        count: submissions.length,
        formTemplateId: formula.formTemplateId,
        tenantId,
        orgCode
      });

      // Apply formula filters
      const filteredSubmissions = customFieldEvaluator.filterSubmissions(
        submissions,
        formula.filters || []
      );

      // Check if using pipelined aggregation
      if (formula.pipeline && formula.pipeline.length > 0) {
        return await this.calculatePipeline(formula, filteredSubmissions);
      }

      // Standard formula calculation
      return await this.calculateStandard(formula, filteredSubmissions);
    } catch (error) {
      console.error('Analytics calculation error:', error);
      throw error;
    }
  }

  /**
   * Calculate using standard formula
   */
  async calculateStandard(formula, submissions) {
    // Validate formula
    if (!formula.formula || typeof formula.formula !== 'string' || formula.formula.trim() === '') {
      throw new Error('Formula is empty. Please provide a valid formula.');
    }

    // Map variables to field values
    const fieldData = customFieldEvaluator.mapVariablesToFields(
      formula.variableMappings || [],
      submissions,
      {}
    );

    // Log for debugging
    console.log('Calculating formula:', {
      formula: formula.formula,
      variableMappings: formula.variableMappings?.length || 0,
      submissions: submissions.length,
      fieldDataKeys: Object.keys(fieldData),
      fieldDataSample: Object.keys(fieldData).reduce((acc, key) => {
        if (Array.isArray(fieldData[key])) {
          acc[key] = `${fieldData[key].length} values: [${fieldData[key].slice(0, 3).join(', ')}...]`;
        } else {
          acc[key] = fieldData[key];
        }
        return acc;
      }, {})
    });

    // Check if we have any field data
    if (Object.keys(fieldData).length === 0 && (formula.variableMappings || []).length > 0) {
      console.warn('Warning: No field data mapped. Formula may not work correctly.');
    }

    // Execute formula
    let numericResult;
    let formattedResult;
    try {
      // First get numeric result (without formatting)
      const rawResult = formulaExecutor.execute(
        formula.formula,
        fieldData,
        {
          outputType: 'number', // Get numeric value first
          displayFormat: null
        },
        formula.variableMappings || [] // Pass variable mappings to normalize field IDs to variable names
      );
      
      numericResult = typeof rawResult === 'number' ? rawResult : Number(rawResult) || 0;
      
      // Format the result
      formattedResult = this.formatResult(
        numericResult,
        formula.outputType || 'number',
        formula.displayFormat
      );
    } catch (error) {
      console.error('Formula execution failed:', {
        formula: formula.formula,
        error: error.message,
        fieldDataKeys: Object.keys(fieldData)
      });
      throw error;
    }

    // Update usage tracking
    await AnalyticsFormula.findByIdAndUpdate(formula._id, {
      $inc: { usageCount: 1 },
      lastUsed: new Date()
    });

    // Generate explanation of what the formula calculates
    const explanation = formulaExplanationService.generateExplanation(
      formula.formula,
      formula.variableMappings || [],
      { value: numericResult, formatted: formattedResult }
    );
    
    // Generate breakdown
    const breakdown = formulaExplanationService.generateBreakdown(
      formula.formula,
      fieldData,
      { value: numericResult }
    );

    return {
      value: numericResult,
      formatted: formattedResult,
      rawValue: numericResult,
      submissionCount: submissions.length,
      formula: formula.formula,
      explanation: explanation,
      breakdown: breakdown,
      metadata: {
        formulaId: formula._id,
        formulaName: formula.name,
        calculatedAt: new Date()
      }
    };
  }

  /**
   * Calculate using pipelined aggregation
   */
  async calculatePipeline(formula, submissions) {
    // Execute pipeline
    const pipelineResult = formulaExecutor.executePipeline(
      formula.pipeline,
      submissions,
      formula.variableMappings || []
    );

    // Format results
    const formattedResult = Array.isArray(pipelineResult)
      ? pipelineResult.map(item => this.formatPipelineItem(item, formula))
      : this.formatPipelineItem(pipelineResult, formula);

    // Update usage tracking
    await AnalyticsFormula.findByIdAndUpdate(formula._id, {
      $inc: { usageCount: 1 },
      lastUsed: new Date()
    });

    return {
      value: pipelineResult,
      formatted: formattedResult,
      rawValue: pipelineResult,
      submissionCount: submissions.length,
      pipeline: formula.pipeline,
      metadata: {
        formulaId: formula._id,
        formulaName: formula.name,
        calculatedAt: new Date()
      }
    };
  }

  /**
   * Format pipeline result item
   */
  formatPipelineItem(item, formula) {
    const formatted = { ...item };
    
    // Format numeric fields based on output type
    Object.keys(formatted).forEach(key => {
      if (typeof formatted[key] === 'number') {
        formatted[key] = this.formatResult(
          formatted[key],
          formula.outputType || 'number',
          formula.displayFormat
        );
      }
    });

    return formatted;
  }

  /**
   * Generate formula from description using AI
   * @param {String} description - Natural language description
   * @param {String} formTemplateId - Form template ID
   * @param {String} tenantId - Tenant ID
   * @param {String} orgCode - Organization code
   * @param {String} userId - User ID
   * @param {String} industry - Industry type (optional)
   * @returns {Promise<Object>} Generated formula
   */
  async generateFormulaFromDescription(
    description,
    formTemplateId,
    tenantId,
    orgCode,
    userId,
    industry = null
  ) {
    try {
      // Validate required parameters
      if (!userId) {
        throw new Error('User ID is required to create a formula');
      }
      if (!tenantId) {
        throw new Error('Tenant ID is required');
      }
      if (!formTemplateId) {
        throw new Error('Form template ID is required');
      }

      // Load form template with all fields and sections populated
      const FormTemplate = (await import("../../models/FormTemplate.js")).default;
      const formTemplate = await FormTemplate.findById(formTemplateId)
        .lean(); // Use lean() to get plain JavaScript object with all fields
      if (!formTemplate) {
        throw new Error('Form template not found');
      }
      
      // Ensure form template has all necessary data
      if (!formTemplate.sections || !Array.isArray(formTemplate.sections)) {
        throw new Error('Form template has no sections');
      }
      
      // Log template structure for debugging
      console.log('📋 Form template loaded for AI:', {
        templateId: formTemplateId,
        templateName: formTemplate.name,
        sectionsCount: formTemplate.sections?.length || 0,
        totalFields: formTemplate.sections?.reduce((sum, s) => sum + (s.fields?.length || 0), 0) || 0,
        fieldLabels: formTemplate.sections?.flatMap(s => s.fields?.map(f => f.label) || []) || []
      });

      // Detect industry if not provided
      if (!industry) {
        const industryService = (await import("./industryAnalyticsService.js")).default;
        industry = industryService.detectIndustry(formTemplate);
      }

      // Generate formula using AI
      const aiResult = await analyticsAiService.generateFormulaFromDescription(
        description,
        formTemplate,
        industry
      );

      // Create formula document
      const formula = new AnalyticsFormula({
        name: description.substring(0, 100),
        description: aiResult.description || description,
        tenantId,
        orgCode,
        formula: aiResult.formula,
        formulaType: aiResult.formulaType || 'simple',
        variableMappings: aiResult.variableMappings || [],
        outputType: aiResult.outputType || 'number',
        displayFormat: aiResult.displayFormat,
        formTemplateId,
        industry,
        createdBy: userId, // Ensure userId is set
        updatedBy: userId,
        validation: {
          syntaxValid: true,
          fieldsValid: true,
          lastValidated: new Date()
        },
        isActive: true
      });

      await formula.save();

      // Format formula with human-readable field labels for display
      // Use originalFormula if available (from AI generation with labels), otherwise format the stored formula
      const displayFormula = aiResult.originalFormula || this.formatFormulaWithLabels(formula.formula, formula.variableMappings, formTemplate);

      return {
        formula: {
          ...formula.toJSON(),
          formula: displayFormula, // Use human-readable labels for display
          originalFormula: formula.formula // Keep original formula with field IDs for execution
        },
        preview: await this.calculatePreview(formula, tenantId, orgCode)
      };
    } catch (error) {
      console.error('Formula generation error:', error);
      throw error;
    }
  }

  /**
   * Format formula with human-readable field labels
   * @param {String} formula - Formula string with field IDs
   * @param {Array} variableMappings - Variable mappings array
   * @param {Object} formTemplate - Form template with field definitions
   * @returns {String} Formula with human-readable field labels
   */
  formatFormulaWithLabels(formula, variableMappings, formTemplate) {
    if (!formula || !formTemplate) {
      return formula;
    }

    // Create a map of fieldId -> label from form template
    const fieldIdToLabelMap = {};
    if (formTemplate.sections && Array.isArray(formTemplate.sections)) {
      formTemplate.sections.forEach(section => {
        if (section.fields && Array.isArray(section.fields)) {
          section.fields.forEach(field => {
            if (field.id && field.label) {
              fieldIdToLabelMap[field.id] = field.label;
              // Also map without "field-" prefix
              if (field.id.startsWith('field-')) {
                fieldIdToLabelMap[field.id.replace(/^field-/, '')] = field.label;
              }
            }
          });
        }
      });
    }

    // Replace field IDs with labels in the formula
    let formattedFormula = formula;
    
    // Replace field IDs using variable mappings first (they have better context)
    if (variableMappings && Array.isArray(variableMappings)) {
      variableMappings.forEach(mapping => {
        if (mapping.fieldId) {
          // Prioritize field label from form template, fallback to variableName
          const label = fieldIdToLabelMap[mapping.fieldId] || fieldIdToLabelMap[mapping.fieldId.replace(/^field-/, '')] || mapping.variableName || mapping.fieldId;
          // Replace field ID with label
          const fieldIdPattern = new RegExp(`\\b${mapping.fieldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
          formattedFormula = formattedFormula.replace(fieldIdPattern, label);
          
          // Also replace without "field-" prefix
          const fieldIdWithoutPrefix = mapping.fieldId.replace(/^field-/, '');
          if (fieldIdWithoutPrefix !== mapping.fieldId) {
            const patternWithoutPrefix = new RegExp(`\\b${fieldIdWithoutPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
            formattedFormula = formattedFormula.replace(patternWithoutPrefix, label);
          }
        }
      });
    }

    // Replace any remaining field IDs that weren't in variable mappings
    Object.entries(fieldIdToLabelMap).forEach(([fieldId, label]) => {
      const fieldIdPattern = new RegExp(`\\b${fieldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      formattedFormula = formattedFormula.replace(fieldIdPattern, label);
    });

    return formattedFormula;
  }

  /**
   * Calculate preview for formula
   */
  async calculatePreview(formula, tenantId, orgCode) {
    try {
      // Always use the provided orgCode from request context (resolved from user/query)
      // Don't fall back to formula.orgCode as it might be null for old formulas
      const effectiveOrgCode = orgCode;
      
      if (!effectiveOrgCode) {
        console.warn('⚠️ No orgCode available for preview calculation', {
          formulaId: formula._id || formula.id,
          formulaOrgCode: formula.orgCode,
          providedOrgCode: orgCode
        });
        return {
          value: 0,
          formatted: 'N/A',
          message: 'Organization context required for preview. Please ensure orgCode is set.',
          error: true
        };
      }
      
      console.log('🔍 Calculating preview:', {
        formulaId: formula._id || formula.id,
        formulaName: formula.name,
        orgCode: effectiveOrgCode,
        formTemplateId: formula.formTemplateId
      });
      
      // Fetch limited submissions for preview (no date filters for preview)
      const submissions = await this.fetchSubmissions(
        formula.formTemplateId,
        {}, // No date filters for preview - get all available data
        tenantId,
        effectiveOrgCode,
        100 // Limit to 100 for preview
      );

      console.log('📊 Preview submissions fetched:', {
        count: submissions.length,
        formulaId: formula._id || formula.id
      });

      if (submissions.length === 0) {
        console.warn('⚠️ No submissions found for preview', {
          formulaId: formula._id || formula.id,
          orgCode: effectiveOrgCode,
          formTemplateId: formula.formTemplateId
        });
        return {
          value: 0,
          formatted: 'N/A',
          message: 'No data available for preview',
          error: true
        };
      }

      // Calculate with limited data
      let result;
      if (formula.pipeline && formula.pipeline.length > 0) {
        result = await this.calculatePipeline(formula, submissions);
      } else {
        result = await this.calculateStandard(formula, submissions);
      }
      
      return {
        value: result.value,
        formatted: result.formatted,
        submissionCount: submissions.length,
        explanation: result.explanation,
        breakdown: result.breakdown
      };
    } catch (error) {
      console.error('Preview calculation error:', error);
      return {
        value: 0,
        formatted: 'N/A',
        message: error.message || 'Preview calculation failed',
        error: true
      };
    }
  }

  /**
   * Fetch form submissions with filters
   */
  async fetchSubmissions(formTemplateId, filters, tenantId, orgCode = null, limit = null) {
    console.log('🔍 fetchSubmissions called:', { formTemplateId, tenantId, orgCode, filters });
    
    // First, get the form template to check entityType
    const formTemplate = await FormTemplate.findById(formTemplateId);
    if (!formTemplate) {
      throw new Error('Form template not found');
    }

    const entityType = formTemplate.entityType?.toLowerCase();
    console.log('📋 Form template entityType:', entityType);

    // If entityType is "account", fetch Account documents and convert to submission format
    if (entityType === 'account') {
      console.log('📊 Fetching Account documents for analytics...');
      return await this.fetchAccountSubmissions(formTemplateId, filters, tenantId, orgCode, limit);
    }

    // Otherwise, fetch FormSubmission records (for standalone forms)
    const query = {
      templateId: formTemplateId,
      tenantId,
      status: { $ne: 'draft' } // Exclude drafts
    };

    // Add orgCode filter if provided
    if (orgCode) {
      query.orgCode = orgCode;
    }

    // Add date filters
    if (filters.startDate || filters.endDate) {
      query.submittedAt = {};
      if (filters.startDate) {
        query.submittedAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.submittedAt.$lte = new Date(filters.endDate);
      }
    }

    const queryOptions = {
      sort: { submittedAt: -1 }
    };

    if (limit) {
      queryOptions.limit = limit;
    }

    return await FormSubmission.find(query, null, queryOptions);
  }

  /**
   * Fetch Account documents and convert to submission format
   */
  async fetchAccountSubmissions(formTemplateId, filters, tenantId, orgCode, limit) {
    // Convert formTemplateId to string for query (Account model stores it as String)
    const formTemplateIdStr = formTemplateId?.toString ? formTemplateId.toString() : String(formTemplateId);
    
    // Build query: fetch all accounts for the orgCode (don't require formTemplateId match)
    // This allows analytics to work on all accounts for the entity type, not just those created with a specific template
    const query = {};

    // orgCode is required - if not provided, we can't fetch accounts
    if (!orgCode) {
      console.warn('⚠️ No orgCode provided, cannot fetch accounts');
      return [];
    }

    // Filter by orgCode (required)
    query.orgCode = orgCode;

    // Optionally filter by formTemplateId if we want only accounts created with this template
    // For now, we'll fetch all accounts for the orgCode to allow analytics on all accounts
    // This is better because accounts might have been created before formTemplateId was added
    // Uncomment the line below if you want to filter by formTemplateId:
    // query.formTemplateId = formTemplateIdStr;

    // Add date filters using createdAt
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
      }
    }

    const queryOptions = {
      sort: { createdAt: -1 }
    };

    if (limit) {
      queryOptions.limit = limit;
    }

    console.log('🔍 Fetching accounts for analytics:', {
      formTemplateId,
      query,
      orgCode,
      filters
    });

    const accounts = await Account.find(query, null, queryOptions);
    
    console.log('✅ Found accounts:', accounts.length, 'accounts with formTemplateId:', formTemplateId);
    if (accounts.length === 0) {
      console.warn('⚠️ No accounts found. Query was:', JSON.stringify(query));
      // Try without date filter to see if that's the issue
      const queryWithoutDate = {
        $or: [
          { formTemplateId: formTemplateIdStr },
          { formTemplateId: { $exists: false } },
          { formTemplateId: null }
        ]
      };
      if (orgCode) {
        queryWithoutDate.orgCode = orgCode;
      }
      const allAccounts = await Account.find(queryWithoutDate).limit(10);
      console.log('🔍 Accounts without date filter:', allAccounts.length);
      if (allAccounts.length > 0) {
        console.log('📋 Sample accounts (no date filter):', allAccounts.slice(0, 3).map(acc => ({
          _id: acc._id,
          formTemplateId: acc.formTemplateId,
          orgCode: acc.orgCode,
          createdAt: acc.createdAt
        })));
      }
    }

    // Convert Account documents to submission format
    // Submission format: { data: { fieldId: value, ... }, submittedAt: Date, ... }
    const submissions = accounts.map((account, index) => {
      const accountObj = account.toObject();
      
      // Build data object with field mappings
      const data = {};
      
      // Map standard Account fields to field IDs
      if (accountObj.companyName) data['field-companyName'] = accountObj.companyName;
      if (accountObj.email) data['field-email'] = accountObj.email;
      if (accountObj.phone) data['field-phone'] = accountObj.phone;
      if (accountObj.description) data['field-description'] = accountObj.description;
      if (accountObj.website) data['field-website'] = accountObj.website;
      if (accountObj.status) data['field-status'] = accountObj.status;
      if (accountObj.accountType) data['field-accountType'] = accountObj.accountType;
      if (accountObj.segment) data['field-segment'] = accountObj.segment;
      if (accountObj.employeesCount !== undefined) data['field-employeesCount'] = accountObj.employeesCount;
      if (accountObj.annualRevenue !== undefined) data['field-annualRevenue'] = accountObj.annualRevenue;
      if (accountObj.ownershipType) data['field-ownershipType'] = accountObj.ownershipType;
      if (accountObj.industry) data['field-industry'] = accountObj.industry;
      if (accountObj.zone) data['field-zone'] = accountObj.zone;
      if (accountObj.invoicing) data['field-invoicing'] = accountObj.invoicing;
      if (accountObj.creditTerm) data['field-creditTerm'] = accountObj.creditTerm;
      if (accountObj.gstNo) data['field-gstNo'] = accountObj.gstNo;
      if (accountObj.parentAccount) data['field-parentAccount'] = accountObj.parentAccount;
      if (accountObj.assignedTo) data['field-assignedTo'] = accountObj.assignedTo;
      
      // Add custom fields
      if (accountObj.customFields && typeof accountObj.customFields === 'object') {
        Object.keys(accountObj.customFields).forEach(key => {
          const fieldId = key.startsWith('field-') ? key : `field-${key}`;
          data[fieldId] = accountObj.customFields[key];
        });
      }

      const submission = {
        _id: accountObj._id,
        templateId: formTemplateId,
        tenantId: accountObj.tenantId || tenantId,
        orgCode: accountObj.orgCode,
        data: data,
        submittedAt: accountObj.createdAt || new Date(),
        createdAt: accountObj.createdAt,
        updatedAt: accountObj.updatedAt,
        status: 'submitted'
      };

      // Log first submission for debugging (use index instead of submissions.length)
      if (index === 0) {
        console.log('📝 First submission data:', {
          fieldCount: Object.keys(data).length,
          sampleFields: Object.keys(data).slice(0, 10),
          annualRevenue: data['field-annualRevenue'],
          hasCustomFields: !!accountObj.customFields,
          customFieldsKeys: accountObj.customFields ? Object.keys(accountObj.customFields) : []
        });
      }

      return submission;
    });

    console.log('✅ Converted', submissions.length, 'accounts to submissions');
    if (submissions.length > 0) {
      console.log('📋 Sample submission:', {
        dataKeys: Object.keys(submissions[0].data).slice(0, 10),
        annualRevenue: submissions[0].data['field-annualRevenue']
      });
    }
    return submissions;
  }

  /**
   * Build date filter from date range object
   */
  buildDateFilter(dateRange) {
    if (!dateRange || !dateRange.type) {
      return {};
    }

    const now = new Date();
    const filters = {};

    switch (dateRange.type) {
      case 'today':
        filters.startDate = new Date(now.setHours(0, 0, 0, 0));
        filters.endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        filters.startDate = new Date(yesterday.setHours(0, 0, 0, 0));
        filters.endDate = new Date(yesterday.setHours(23, 59, 59, 999));
        break;
      case 'last7days':
        filters.startDate = new Date(now.setDate(now.getDate() - 7));
        filters.endDate = new Date();
        break;
      case 'last30days':
        filters.startDate = new Date(now.setDate(now.getDate() - 30));
        filters.endDate = new Date();
        break;
      case 'thisMonth':
        filters.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        filters.endDate = new Date();
        break;
      case 'lastMonth':
        filters.startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        filters.endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'custom':
        if (dateRange.startDate) filters.startDate = new Date(dateRange.startDate);
        if (dateRange.endDate) filters.endDate = new Date(dateRange.endDate);
        break;
    }

    return filters;
  }

  /**
   * Format result based on output type
   */
  formatResult(value, outputType, displayFormat) {
    if (value === null || value === undefined) {
      return '0';
    }

    const numValue = Number(value);

    switch (outputType) {
      case 'percentage':
        if (displayFormat) {
          return formulaExecutor.formatNumber(numValue * 100, displayFormat) + '%';
        }
        return (numValue * 100).toFixed(2) + '%';
      
      case 'currency':
        if (displayFormat) {
          return formulaExecutor.formatNumber(numValue, displayFormat);
        }
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(numValue);
      
      case 'number':
        if (displayFormat) {
          return formulaExecutor.formatNumber(numValue, displayFormat);
        }
        return numValue;
      
      default:
        return String(value);
    }
  }
}

export default new AnalyticsCalculationService();

