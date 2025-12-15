import FormTemplate from "../models/FormTemplate.js";
import FormSubmission from "../models/FormSubmission.js";
import { getEffectiveUser } from "../utils/authHelpers.js";
import { analyzeFormLayout, applySuggestionsToTemplate, generateCompleteTemplate } from "../services/formLayoutAiService.js";

/**
 * Create a new form template
 */
export const createTemplate = async (req, res) => {
  try {
    const user = getEffectiveUser(req);
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;
    const orgCode = req.body.orgCode || req.tenant?.orgCode || req.user?.orgCode;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    // Get user ID with multiple fallbacks
    const userId = user?.userId || user?.id || user?._id || req.user?.userId || req.user?.id || req.user?._id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required. Please ensure you are authenticated."
      });
    }

    const templateData = {
      ...req.body,
      tenantId,
      orgCode,
      createdBy: userId,
      updatedBy: userId
    };

    // Validate sections and fields
    if (templateData.sections && Array.isArray(templateData.sections)) {
      templateData.sections = templateData.sections.map((section, sectionIndex) => {
        // Only include metadata if it has properties (not empty object)
        const hasMetadata = section.metadata && Object.keys(section.metadata).length > 0;
        
        return {
          ...section,
          id: section.id || `section-${Date.now()}-${sectionIndex}`,
          order: section.order ?? sectionIndex,
          // Explicitly preserve metadata (including columns) - only include if it has properties
          ...(hasMetadata && { metadata: section.metadata }),
          fields: (section.fields || []).map((field, fieldIndex) => ({
            ...field,
            id: field.id || `field-${Date.now()}-${sectionIndex}-${fieldIndex}`,
            order: field.order ?? fieldIndex
          }))
        };
      });
    }

    const template = new FormTemplate(templateData);
    await template.save();

    res.status(201).json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error("Error creating form template:", error);
    res.status(500).json({
      success: false,
      message: "Error creating form template",
      error: error.message
    });
  }
};

/**
 * Get all form templates with filtering
 */
export const getTemplates = async (req, res) => {
  try {
    const user = getEffectiveUser(req);
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;
    const orgCode = req.query.orgCode || req.tenant?.orgCode || req.user?.orgCode;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const query = { tenantId };

    // Filter by orgCode if provided
    if (orgCode) {
      query.$or = [
        { orgCode },
        { orgCode: { $exists: false } },
        { orgCode: null }
      ];
    }

    // Filter by entityType
    if (req.query.entityType) {
      query.entityType = req.query.entityType;
    }

    // Filter by isActive
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === "true";
    }

    // Filter by tags
    if (req.query.tags) {
      const tags = Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags];
      query.tags = { $in: tags };
    }

    // Search by name or description
    if (req.query.search) {
      query.$or = [
        ...(query.$or || []),
        { name: { $regex: req.query.search, $options: "i" } },
        { description: { $regex: req.query.search, $options: "i" } }
      ];
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const templates = await FormTemplate.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await FormTemplate.countDocuments(query);

    res.json({
      success: true,
      data: templates,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching form templates:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching form templates",
      error: error.message
    });
  }
};

/**
 * Get a single form template by ID
 */
export const getTemplate = async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    // Validate template ID - ensure it's a string
    let templateId = req.params.id;
    
    // Handle case where ID might be an object stringified
    if (typeof templateId === "object" && templateId !== null) {
      templateId = templateId.id || templateId._id || String(templateId);
    }
    
    // Convert to string and clean
    templateId = String(templateId).trim();
    
    // Check for invalid IDs
    if (!templateId || 
        templateId === "undefined" || 
        templateId === "null" ||
        templateId === "[object Object]" ||
        templateId === "") {
      return res.status(400).json({
        success: false,
        message: "Template ID is required and must be valid",
        received: req.params.id,
        type: typeof req.params.id
      });
    }

    const template = await FormTemplate.findOne({
      _id: templateId,
      tenantId
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Form template not found"
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error("Error fetching form template:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching form template",
      error: error.message
    });
  }
};

/**
 * Update a form template
 */
export const updateTemplate = async (req, res) => {
  try {
    const user = getEffectiveUser(req);
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    // Validate template ID
    const templateId = req.params.id;
    if (!templateId || templateId === "undefined" || templateId.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Template ID is required and must be valid"
      });
    }

    const template = await FormTemplate.findOne({
      _id: templateId,
      tenantId
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Form template not found"
      });
    }

    // Update fields - merge sections metadata instead of replacing
    if (req.body.sections && Array.isArray(req.body.sections)) {
      // Merge sections with existing template sections to preserve metadata.columns
      template.sections = req.body.sections.map((incomingSection) => {
        const existingSection = template.sections.find(s => s.id === incomingSection.id);
        
        // Merge metadata: preserve existing metadata.columns if incoming metadata is empty or doesn't have columns
        let mergedMetadata = {};
        if (existingSection?.metadata) {
          mergedMetadata = { ...existingSection.metadata };
        }
        // Only merge incoming metadata if it has properties (not empty object)
        if (incomingSection.metadata && Object.keys(incomingSection.metadata).length > 0) {
          mergedMetadata = { ...mergedMetadata, ...incomingSection.metadata };
        }
        
        return {
          ...incomingSection,
          // Only include metadata if it has properties
          ...(Object.keys(mergedMetadata).length > 0 && { metadata: mergedMetadata })
        };
      });
      
      // Update other fields
      Object.keys(req.body).forEach(key => {
        if (key !== "_id" && key !== "id" && key !== "createdAt" && key !== "createdBy" && key !== "sections") {
          template[key] = req.body[key];
        }
      });
    } else {
      // Update fields normally if sections are not being updated
      Object.keys(req.body).forEach(key => {
        if (key !== "_id" && key !== "id" && key !== "createdAt" && key !== "createdBy") {
          template[key] = req.body[key];
        }
      });
    }

    // Get user ID with multiple fallbacks
    const userId = user?.userId || user?.id || user?._id || req.user?.userId || req.user?.id || req.user?._id;
    if (userId) {
      template.updatedBy = userId;
    }
    template.version = (template.version || 1) + 1;

    // Validate and normalize sections and fields
    if (template.sections && Array.isArray(template.sections)) {
      template.sections = template.sections.map((section, sectionIndex) => {
        // Only include metadata if it has properties (not empty object)
        const hasMetadata = section.metadata && Object.keys(section.metadata).length > 0;
        
        return {
          ...section,
          id: section.id || `section-${Date.now()}-${sectionIndex}`,
          order: section.order ?? sectionIndex,
          // Explicitly preserve metadata (including columns) - only include if it has properties
          ...(hasMetadata && { metadata: section.metadata }),
          fields: (section.fields || []).map((field, fieldIndex) => ({
            ...field,
            id: field.id || `field-${Date.now()}-${sectionIndex}-${fieldIndex}`,
            order: field.order ?? fieldIndex
          }))
        };
      });
    }

    await template.save();

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error("Error updating form template:", error);
    res.status(500).json({
      success: false,
      message: "Error updating form template",
      error: error.message
    });
  }
};

/**
 * Set a template as default for its entity type
 * This will unset other templates for the same entity type
 */
export const setDefaultTemplate = async (req, res) => {
  try {
    const user = getEffectiveUser(req);
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    // Validate template ID
    const templateId = req.params.id;
    if (!templateId || templateId === "undefined" || templateId.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Template ID is required and must be valid"
      });
    }

    const template = await FormTemplate.findOne({
      _id: templateId,
      tenantId
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Form template not found"
      });
    }

    if (!template.entityType) {
      return res.status(400).json({
        success: false,
        message: "Template must have an entityType to be set as default"
      });
    }

    // Unset all other default templates for the same entity type
    await FormTemplate.updateMany(
      {
        tenantId,
        entityType: template.entityType,
        _id: { $ne: templateId },
        isDefault: true
      },
      {
        $set: { isDefault: false }
      }
    );

    // Set this template as default
    template.isDefault = true;
    
    // Get user ID with multiple fallbacks
    const userId = user?.userId || user?.id || user?._id || req.user?.userId || req.user?.id || req.user?._id;
    if (userId) {
      template.updatedBy = userId;
    }
    
    await template.save();

    res.json({
      success: true,
      data: template,
      message: `Template "${template.name}" is now the default template for ${template.entityType}`
    });
  } catch (error) {
    console.error("Error setting default template:", error);
    res.status(500).json({
      success: false,
      message: "Error setting default template",
      error: error.message
    });
  }
};

/**
 * Delete a form template (soft delete by setting isActive to false)
 */
export const deleteTemplate = async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    // Validate template ID
    const templateId = req.params.id;
    if (!templateId || templateId === "undefined" || templateId.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Template ID is required and must be valid"
      });
    }

    const template = await FormTemplate.findOne({
      _id: templateId,
      tenantId
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Form template not found"
      });
    }

    // Soft delete
    template.isActive = false;
    await template.save();

    res.json({
      success: true,
      message: "Form template deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting form template:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting form template",
      error: error.message
    });
  }
};

/**
 * Duplicate a form template
 */
export const duplicateTemplate = async (req, res) => {
  try {
    const user = getEffectiveUser(req);
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    // Validate template ID
    const templateId = req.params.id;
    if (!templateId || templateId === "undefined" || templateId.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Template ID is required and must be valid"
      });
    }

    const originalTemplate = await FormTemplate.findOne({
      _id: templateId,
      tenantId
    });

    if (!originalTemplate) {
      return res.status(404).json({
        success: false,
        message: "Form template not found"
      });
    }

    const templateData = originalTemplate.toObject();
    delete templateData._id;
    delete templateData.id;
    delete templateData.createdAt;
    delete templateData.updatedAt;
    
    // Get user ID with multiple fallbacks
    const userId = user?.userId || user?.id || user?._id || req.user?.userId || req.user?.id || req.user?._id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required. Please ensure you are authenticated."
      });
    }
    
    templateData.name = `${templateData.name} (Copy)`;
    templateData.createdBy = userId;
    templateData.updatedBy = userId;
    templateData.version = 1;

    const newTemplate = new FormTemplate(templateData);
    await newTemplate.save();

    res.status(201).json({
      success: true,
      data: newTemplate
    });
  } catch (error) {
    console.error("Error duplicating form template:", error);
    res.status(500).json({
      success: false,
      message: "Error duplicating form template",
      error: error.message
    });
  }
};

/**
 * Submit form data
 */
export const submitForm = async (req, res) => {
  try {
    const user = getEffectiveUser(req);
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;
    const orgCode = req.body.orgCode || req.tenant?.orgCode || req.user?.orgCode;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const { templateId, data, status = "submitted", relatedEntityType, relatedEntityId } = req.body;

    // Get template
    const template = await FormTemplate.findOne({
      _id: templateId,
      tenantId,
      isActive: true
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Form template not found or inactive"
      });
    }

    // Get user ID with multiple fallbacks
    const userId = user?.userId || user?.id || user?._id || req.user?.userId || req.user?.id || req.user?._id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required. Please ensure you are authenticated."
      });
    }

    // Check if multiple submissions are allowed
    if (!template.settings?.allowMultipleSubmissions && status === "submitted") {
      const existingSubmission = await FormSubmission.findOne({
        templateId: template._id,
        tenantId,
        submittedBy: userId,
        status: "submitted"
      });

      if (existingSubmission) {
        return res.status(400).json({
          success: false,
          message: "Multiple submissions are not allowed for this form"
        });
      }
    }

    // Process form data - remove tenantId and orgCode if present, auto-populate createdBy/updatedBy
    const processedData = { ...data };
    
    // Remove backend-only fields that shouldn't be in form data
    delete processedData.tenantId;
    delete processedData.orgCode;
    
    // Auto-populate createdBy and updatedBy from authenticated user
    if (userId) {
      // If form has createdBy field, populate it (for new records)
      if (template.sections.some(section => 
        section.fields.some(field => field.name === "createdBy" || field.id.includes("createdBy"))
      )) {
        processedData.createdBy = userId;
      }
      
      // Always populate updatedBy (for both new and updated records)
      if (template.sections.some(section => 
        section.fields.some(field => field.name === "updatedBy" || field.id.includes("updatedBy"))
      )) {
        processedData.updatedBy = userId;
      }
    }

    // Create submission
    const submissionData = {
      templateId: template._id,
      tenantId,
      orgCode,
      data: processedData,
      status,
      submittedBy: userId,
      relatedEntityType,
      relatedEntityId,
      formVersion: template.version || 1,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent")
    };

    if (status === "submitted") {
      submissionData.submittedAt = new Date();
    }

    const submission = new FormSubmission(submissionData);
    await submission.save();

    // Auto-create entity if configured and template is for opportunities
    let createdEntity = null;
    if (template.entityType === 'opportunity' && template.settings?.autoCreateEntity) {
      try {
        console.log('🏗️ Auto-creating opportunity from form submission...');
        const Opportunity = (await import('../models/Opportunity.js')).default;
        createdEntity = await Opportunity.createFromFormSubmission(submission, userId);
        console.log('✅ Opportunity created from form submission:', createdEntity._id);

        // Update submission with related entity info
        submission.relatedEntityType = 'opportunity';
        submission.relatedEntityId = createdEntity._id;
        await submission.save();
      } catch (entityError) {
        console.error('❌ Failed to auto-create opportunity:', entityError);
        // Don't fail the entire submission if entity creation fails
      }
    }

    // TODO: Trigger workflow if configured
    // TODO: Send notifications if configured

    res.status(201).json({
      success: true,
      data: submission,
      createdEntity: createdEntity,
      message: template.settings?.successMessage || "Form submitted successfully!"
    });
  } catch (error) {
    console.error("Error submitting form:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting form",
      error: error.message
    });
  }
};

/**
 * Get form submissions with filtering
 */
export const getSubmissions = async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const query = { tenantId };

    // Filter by templateId
    if (req.query.templateId) {
      query.templateId = req.query.templateId;
    }

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by relatedEntityType
    if (req.query.relatedEntityType) {
      query.relatedEntityType = req.query.relatedEntityType;
    }

    // Filter by relatedEntityId
    if (req.query.relatedEntityId) {
      query.relatedEntityId = req.query.relatedEntityId;
    }

    // Filter by submittedBy
    if (req.query.submittedBy) {
      query.submittedBy = req.query.submittedBy;
    }

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      query.submittedAt = {};
      if (req.query.startDate) {
        query.submittedAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.submittedAt.$lte = new Date(req.query.endDate);
      }
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const submissions = await FormSubmission.find(query)
      .populate("templateId", "name description")
      .sort({ submittedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await FormSubmission.countDocuments(query);

    res.json({
      success: true,
      data: submissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching form submissions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching form submissions",
      error: error.message
    });
  }
};

/**
 * Get a single form submission by ID
 */
export const getSubmission = async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const submission = await FormSubmission.findOne({
      _id: req.params.id,
      tenantId
    }).populate("templateId");

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Form submission not found"
      });
    }

    res.json({
      success: true,
      data: submission
    });
  } catch (error) {
    console.error("Error fetching form submission:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching form submission",
      error: error.message
    });
  }
};

/**
 * Update form submission (for drafts or status updates)
 */
export const updateSubmission = async (req, res) => {
  try {
    const user = getEffectiveUser(req);
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const submission = await FormSubmission.findOne({
      _id: req.params.id,
      tenantId
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Form submission not found"
      });
    }

    // Update fields
    if (req.body.data !== undefined) {
      submission.data = req.body.data;
    }

    if (req.body.status !== undefined) {
      submission.status = req.body.status;
      
      if (req.body.status === "submitted" && !submission.submittedAt) {
        submission.submittedAt = new Date();
      }
      
      if (["reviewed", "approved", "rejected"].includes(req.body.status)) {
        submission.reviewedAt = new Date();
        // Get user ID with multiple fallbacks
        const userId = user?.userId || user?.id || user?._id || req.user?.userId || req.user?.id || req.user?._id;
        if (userId) {
          submission.reviewedBy = userId;
        }
        if (req.body.reviewNotes) {
          submission.reviewNotes = req.body.reviewNotes;
        }
      }
    }

    if (req.body.attachments !== undefined) {
      submission.attachments = req.body.attachments;
    }

    await submission.save();

    res.json({
      success: true,
      data: submission
    });
  } catch (error) {
    console.error("Error updating form submission:", error);
    res.status(500).json({
      success: false,
      message: "Error updating form submission",
      error: error.message
    });
  }
};

/**
 * Delete a form submission
 */
export const deleteSubmission = async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const submission = await FormSubmission.findOne({
      _id: req.params.id,
      tenantId
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Form submission not found"
      });
    }

    await FormSubmission.deleteOne({ _id: submission._id });

    res.json({
      success: true,
      message: "Form submission deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting form submission:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting form submission",
      error: error.message
    });
  }
};

/**
 * Validate form data against template
 */
export const validateFormData = async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const { templateId, data } = req.body;

    const template = await FormTemplate.findOne({
      _id: templateId,
      tenantId,
      isActive: true
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Form template not found"
      });
    }

    const errors = [];

    // Validate each section and field
    template.sections.forEach(section => {
      section.fields.forEach(field => {
        const value = data[field.id];

        // Required field validation
        if (field.required && (value === undefined || value === null || value === "")) {
          errors.push({
            fieldId: field.id,
            fieldLabel: field.label,
            message: `${field.label} is required`
          });
        }

        // Type-specific validation
        if (value !== undefined && value !== null && value !== "") {
          // String length validation
          if (field.validation?.minLength && String(value).length < field.validation.minLength) {
            errors.push({
              fieldId: field.id,
              fieldLabel: field.label,
              message: `${field.label} must be at least ${field.validation.minLength} characters`
            });
          }

          if (field.validation?.maxLength && String(value).length > field.validation.maxLength) {
            errors.push({
              fieldId: field.id,
              fieldLabel: field.label,
              message: `${field.label} must be at most ${field.validation.maxLength} characters`
            });
          }

          // Number validation
          if (field.type === "number") {
            const numValue = Number(value);
            if (isNaN(numValue)) {
              errors.push({
                fieldId: field.id,
                fieldLabel: field.label,
                message: `${field.label} must be a valid number`
              });
            } else {
              if (field.validation?.min !== undefined && numValue < field.validation.min) {
                errors.push({
                  fieldId: field.id,
                  fieldLabel: field.label,
                  message: `${field.label} must be at least ${field.validation.min}`
                });
              }
              if (field.validation?.max !== undefined && numValue > field.validation.max) {
                errors.push({
                  fieldId: field.id,
                  fieldLabel: field.label,
                  message: `${field.label} must be at most ${field.validation.max}`
                });
              }
            }
          }

          // Email validation
          if (field.type === "email") {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              errors.push({
                fieldId: field.id,
                fieldLabel: field.label,
                message: `${field.label} must be a valid email address`
              });
            }
          }

          // Pattern validation
          if (field.validation?.pattern) {
            const regex = new RegExp(field.validation.pattern);
            if (!regex.test(value)) {
              errors.push({
                fieldId: field.id,
                fieldLabel: field.label,
                message: field.validation.customMessage || `${field.label} format is invalid`
              });
            }
          }
        }
      });
    });

    res.json({
      success: errors.length === 0,
      errors,
      message: errors.length === 0 ? "Form data is valid" : "Validation errors found"
    });
  } catch (error) {
    console.error("Error validating form data:", error);
    res.status(500).json({
      success: false,
      message: "Error validating form data",
      error: error.message
    });
  }
};

/**
 * Get form analytics
 */
/**
 * Analyze form template and get AI-powered layout suggestions
 */
export const analyzeFormLayoutSuggestions = async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = await FormTemplate.findById(templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    const analysis = await analyzeFormLayout(template.toObject());

    return res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error("Error analyzing form layout:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to analyze form layout"
    });
  }
};

/**
 * Analyze form layout from template data (POST body)
 */
export const analyzeFormLayoutFromData = async (req, res) => {
  try {
    const { template, businessRequirements } = req.body;

    if (!template || !template.sections) {
      return res.status(400).json({
        success: false,
        message: "Template data is required"
      });
    }

    const analysis = await analyzeFormLayout(template, businessRequirements);

    return res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error("Error analyzing form layout:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to analyze form layout"
    });
  }
};

/**
 * Apply AI suggestions to a template
 */
export const applyLayoutSuggestions = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { analysis } = req.body;

    if (!analysis) {
      return res.status(400).json({
        success: false,
        message: "Analysis data is required"
      });
    }

    const template = await FormTemplate.findById(templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    const updatedTemplate = applySuggestionsToTemplate(template.toObject(), analysis);

    return res.status(200).json({
      success: true,
      data: updatedTemplate
    });
  } catch (error) {
    console.error("Error applying layout suggestions:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to apply layout suggestions"
    });
  }
};

/**
 * Generate a complete form template from scratch using AI
 */
export const generateTemplate = async (req, res) => {
  try {
    const { entityType, industry, useCase, businessRequirements } = req.body;
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;

    if (!entityType) {
      return res.status(400).json({ 
        success: false, 
        message: "Entity type is required" 
      });
    }

    const result = await generateCompleteTemplate({
      entityType: entityType || 'account',
      industry: industry || '',
      useCase: useCase || '',
      businessRequirements: businessRequirements || '',
      tenantId: tenantId
    });

    // Save the generated template to database
    const user = getEffectiveUser(req);
    const userId = user?.userId || user?.id || user?._id || req.user?.userId || req.user?.id || req.user?._id;
    const orgCode = req.body.orgCode || req.tenant?.orgCode || req.user?.orgCode;

    const templateData = {
      ...result.template,
      tenantId,
      orgCode,
      createdBy: userId,
      updatedBy: userId
    };

    const savedTemplate = await FormTemplate.create(templateData);

    res.json({ 
      success: true, 
      data: savedTemplate,
      message: "Template generated successfully"
    });
  } catch (error) {
    console.error("Error generating template:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to generate template" 
    });
  }
};

/**
 * Suggest alignment for selected fields
 */
export const suggestAlignment = async (req, res) => {
  try {
    const { fields, context } = req.body;

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Fields array is required"
      });
    }

    const columns = context?.sectionColumns ?? 2;
    const fieldsPerRow = Math.ceil(fields.length / columns);
    const colSpan = Math.floor(12 / columns);

    // Generate alignment suggestions based on field types
    const suggestions = fields.map((field) => {
      // Determine width based on field type and context
      let width = colSpan;
      
      // Adjust width based on field type
      if (field.type === "textarea" || field.type === "address") {
        width = 12; // Full width
      } else if (field.type === "number" || field.type === "date") {
        width = 6; // Half width
      } else if (field.type === "checkbox" || field.type === "radio") {
        width = colSpan; // Use calculated span
      }

      // Determine alignment
      let align = "left";
      if (field.type === "number" || field.type === "calculated") {
        align = "right";
      } else if (field.type === "checkbox" || field.type === "radio") {
        align = "left";
      }

      // Convert numeric width to string format if needed
      let widthValue = width;
      if (width === 12) widthValue = "full";
      else if (width === 6) widthValue = "half";
      else if (width === 4) widthValue = "third";
      else if (width === 8) widthValue = "two-thirds";
      else if (width === 3) widthValue = "quarter";
      else if (width === 9) widthValue = "three-quarters";

      return {
        width: widthValue,
        align
      };
    });

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error("Error suggesting alignment:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to suggest alignment"
    });
  }
};

export const getFormAnalytics = async (req, res) => {
  try {
    const tenantId = req.tenant?.tenantId || req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const templateId = req.params.id;

    const template = await FormTemplate.findOne({
      _id: templateId,
      tenantId
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Form template not found"
      });
    }

    // Get submission statistics
    const totalSubmissions = await FormSubmission.countDocuments({
      templateId,
      tenantId
    });

    const submissionsByStatus = await FormSubmission.aggregate([
      { $match: { templateId: template._id, tenantId } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const recentSubmissions = await FormSubmission.find({
      templateId,
      tenantId
    })
      .sort({ submittedAt: -1 })
      .limit(10)
      .select("status submittedAt submittedBy")
      .lean();

    // Get submissions over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const submissionsOverTime = await FormSubmission.aggregate([
      {
        $match: {
          templateId: template._id,
          tenantId,
          submittedAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$submittedAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        template: {
          id: template.id,
          name: template.name,
          createdAt: template.createdAt
        },
        statistics: {
          totalSubmissions,
          submissionsByStatus: submissionsByStatus.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          recentSubmissions,
          submissionsOverTime
        }
      }
    });
  } catch (error) {
    console.error("Error fetching form analytics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching form analytics",
      error: error.message
    });
  }
};

