import mongoose from "mongoose";

const OpportunityServiceSchema = new mongoose.Schema({
  serviceType: {
    type: String,
  },
  serviceRevenue: {
    type: Number,
    get: (v) => parseFloat(v.toFixed(2)),
  },
});

const OpportunityStageHistory = new mongoose.Schema(
  {
    fromStage: String,
    toStage: String,
    updatedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);
const opportunitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: function() {
        // Allow creation without name, but require it for updates if not a form submission
        return !this.isFormSubmission && this.isModified && this.isModified('name');
      },
      default: function() {
        if (!this.name) {
          return `Opportunity ${new Date().toISOString().split('T')[0]}`;
        }
        return this.name;
      }
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: false, // Made fully optional for flexibility
    },
    tenantId: {
      type: String,
      required: false, // Required for form submissions, optional for regular opportunities
      index: true
    },
    primaryContactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      required: false,
    },
    oem: {
      type: String,
    },
    stage: {
      type: String,
      required: false, // Made optional for flexibility
      default: 'prospecting'
    },
    status: {
      type: String,
      enum: ["commit", "upside", "prospect"],
      required: false, // Made optional for flexibility
      default: 'prospect'
    },
    type: {
      type: String,
      enum: ["new", "renewal"],
      default: "new",
    },
    revenue: {
      type: mongoose.Schema.Types.Decimal128,
      required: false, // Made optional for flexibility
      default: 0,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    profitability: {
      type: mongoose.Schema.Types.Decimal128,
      min: 0,
      max: 100,
      required: false, // Made optional for flexibility
      default: 0,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    expectedProfit: {
      type: mongoose.Schema.Types.Decimal128,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    expense: {
      type: mongoose.Schema.Types.Decimal128,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    services: [OpportunityServiceSchema],
    expectedCloseDate: {
      type: Date,
      required: false, // Made optional for flexibility
      default: function() {
        // Set default close date to 90 days from now if not provided
        return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      }
    },
    actualCloseDate: Date,
    description: String,
    nextStep: String,
    competition: String,
    decisionCriteria: String,

    // Form submission support
    isFormSubmission: { type: Boolean, default: false },
    formSubmissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FormSubmission",
      required: false,
    },
    formTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FormTemplate",
      required: false,
    },
    formData: { type: mongoose.Schema.Types.Mixed }, // Store complete form data

    // Store custom fields from form templates that don't match standard Opportunity fields
    customFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    updatedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      default: null,
    },
    stageHistory: [OpportunityStageHistory],
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Static method to create opportunity from form submission
opportunitySchema.statics.createFromFormSubmission = async function(formSubmission, userId) {
  const formData = formSubmission.data || {};

  // Define which fields are standard opportunity fields (should be mapped to top-level)
  const standardFields = new Set([
    'name', 'opportunityName', 'title', 'subject',
    'accountId', 'account', 'companyId', 'company',
    'primaryContactId', 'contactId', 'contact',
    'oem', 'manufacturer', 'vendor',
    'stage', 'opportunityStage', 'status', 'commitment', 'probability',
    'type', 'opportunityType', 'category',
    'revenue', 'amount', 'value', 'dealValue',
    'profitability', 'profitMargin', 'margin',
    'expectedProfit', 'profit', 'projectedProfit',
    'expense', 'cost', 'expenses',
    'expectedCloseDate', 'closeDate', 'dueDate', 'targetDate',
    'actualCloseDate', 'closedDate',
    'description', 'notes', 'comments', 'details',
    'nextStep', 'nextAction', 'followUp',
    'competition', 'competitors',
    'decisionCriteria', 'criteria',
    'assignedTo', 'assigned_to', 'assignee',
    'services'
  ]);

  // Map form data to opportunity fields with flexible mapping
  const opportunityData = {
    isFormSubmission: true,
    formSubmissionId: formSubmission._id,
    formTemplateId: formSubmission.templateId,
    formData: formData, // Store complete form data
    tenantId: formSubmission.tenantId,
    createdBy: userId,
    updatedBy: userId,
    customFields: {} // Initialize custom fields object
  };

  // Flexible field mapping - try to map common field names
  const fieldMappings = {
    name: ['name', 'opportunityName', 'title', 'subject'],
    accountId: ['accountId', 'account', 'companyId', 'company'],
    primaryContactId: ['primaryContactId', 'contactId', 'contact'],
    oem: ['oem', 'manufacturer', 'vendor'],
    stage: ['stage', 'opportunityStage'],
    status: ['status', 'commitment', 'probability'],
    type: ['type', 'opportunityType', 'category'],
    revenue: ['revenue', 'amount', 'value', 'dealValue'],
    profitability: ['profitability', 'profitMargin', 'margin'],
    expectedProfit: ['expectedProfit', 'profit', 'projectedProfit'],
    expense: ['expense', 'cost', 'expenses'],
    expectedCloseDate: ['expectedCloseDate', 'closeDate', 'dueDate', 'targetDate'],
    actualCloseDate: ['actualCloseDate', 'closedDate'],
    description: ['description', 'notes', 'comments', 'details'],
    nextStep: ['nextStep', 'nextAction', 'followUp'],
    competition: ['competition', 'competitors'],
    decisionCriteria: ['decisionCriteria', 'criteria'],
    assignedTo: ['assignedTo', 'assigned_to', 'assignee']
  };

  // Map form fields to opportunity fields and separate custom fields
  for (const [formFieldKey, formFieldValue] of Object.entries(formData)) {
    let mapped = false;

    // Try to map to standard fields first
    for (const [opportunityField, possibleFormFields] of Object.entries(fieldMappings)) {
      if (possibleFormFields.includes(formFieldKey)) {
        opportunityData[opportunityField] = formFieldValue;
        mapped = true;
        break;
      }
    }

    // If not mapped to standard field, add to custom fields
    if (!mapped && !standardFields.has(formFieldKey)) {
      opportunityData.customFields[formFieldKey] = formFieldValue;
    }
  }

  // Handle special field types
  if (opportunityData.accountId && typeof opportunityData.accountId === 'string') {
    // If accountId is a string, try to convert it to ObjectId
    if (mongoose.Types.ObjectId.isValid(opportunityData.accountId)) {
      opportunityData.accountId = new mongoose.Types.ObjectId(opportunityData.accountId);
    }
  }

  if (opportunityData.primaryContactId && typeof opportunityData.primaryContactId === 'string') {
    if (mongoose.Types.ObjectId.isValid(opportunityData.primaryContactId)) {
      opportunityData.primaryContactId = new mongoose.Types.ObjectId(opportunityData.primaryContactId);
    }
  }

  // Handle date fields
  if (opportunityData.expectedCloseDate) {
    if (typeof opportunityData.expectedCloseDate === 'string') {
      opportunityData.expectedCloseDate = new Date(opportunityData.expectedCloseDate);
    }
  }

  if (opportunityData.actualCloseDate) {
    if (typeof opportunityData.actualCloseDate === 'string') {
      opportunityData.actualCloseDate = new Date(opportunityData.actualCloseDate);
    }
  }

  // Handle numeric fields
  if (opportunityData.revenue && typeof opportunityData.revenue === 'string') {
    opportunityData.revenue = parseFloat(opportunityData.revenue) || 0;
  }

  if (opportunityData.profitability && typeof opportunityData.profitability === 'string') {
    opportunityData.profitability = parseFloat(opportunityData.profitability) || 0;
  }

  // Handle services array if present in form data
  if (formData.services && Array.isArray(formData.services)) {
    opportunityData.services = formData.services.map(service => ({
      serviceType: service.serviceType || service.type || service.name,
      serviceRevenue: service.serviceRevenue || service.revenue || service.amount || 0
    }));
  }

  // Handle assignedTo field
  if (formData.assignedTo && typeof formData.assignedTo === 'string') {
    if (mongoose.Types.ObjectId.isValid(formData.assignedTo)) {
      opportunityData.assignedTo = new mongoose.Types.ObjectId(formData.assignedTo);
    } else {
      opportunityData.assignedTo = formData.assignedTo;
    }
  }

  // Set default values for required fields if not provided
  if (!opportunityData.name) {
    opportunityData.name = `Opportunity from Form Submission ${formSubmission._id}`;
  }

  if (!opportunityData.stage) {
    opportunityData.stage = 'prospecting';
  }

  if (!opportunityData.status) {
    opportunityData.status = 'prospect';
  }

  if (!opportunityData.revenue) {
    opportunityData.revenue = 0;
  }

  if (!opportunityData.profitability) {
    opportunityData.profitability = 0;
  }

  if (!opportunityData.expectedCloseDate) {
    // Set default close date to 30 days from now
    opportunityData.expectedCloseDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  // For form submissions, we can be more flexible with accountId
  // If no accountId is provided, we can still create the opportunity
  // The accountId can be set later through updates
  if (!opportunityData.accountId) {
    console.log('⚠️ No accountId provided for opportunity from form submission - this is allowed for form flexibility');
  }

  // Create the opportunity
  const opportunity = new this(opportunityData);
  await opportunity.save();

  return opportunity;
};

export default mongoose.model("Opportunity", opportunitySchema);
