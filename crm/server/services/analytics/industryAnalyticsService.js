/**
 * Industry Analytics Service
 * Provides industry-specific analytics templates and recommendations
 */

const INDUSTRY_TEMPLATES = {
  sales: {
    name: "Sales & CRM",
    commonMetrics: [
      {
        name: "Total Revenue",
        formula: "SUM(field_revenue)",
        description: "Sum of all revenue fields",
        outputType: "currency"
      },
      {
        name: "Conversion Rate",
        formula: "(COUNT(WHERE field_status = 'closed_won') / COUNT(*)) * 100",
        description: "Percentage of deals closed",
        outputType: "percentage"
      },
      {
        name: "Average Deal Size",
        formula: "AVG(field_revenue)",
        description: "Average revenue per deal",
        outputType: "currency"
      },
      {
        name: "Sales Velocity",
        formula: "SUM(field_revenue) / COUNT(*)",
        description: "Average revenue per deal",
        outputType: "currency"
      }
    ],
    recommendedFields: ['revenue', 'status', 'stage', 'closeDate', 'probability'],
    kpiBenchmarks: {
      conversionRate: { good: 25, average: 15, poor: 5 },
      salesVelocity: { good: 10000, average: 5000, poor: 2000 }
    }
  },
  healthcare: {
    name: "Healthcare",
    commonMetrics: [
      {
        name: "Patient Count",
        formula: "COUNT(DISTINCT field_patientId)",
        description: "Total unique patients",
        outputType: "number"
      },
      {
        name: "Appointment Rate",
        formula: "(COUNT(WHERE field_appointmentStatus = 'completed') / COUNT(*)) * 100",
        description: "Percentage of completed appointments",
        outputType: "percentage"
      },
      {
        name: "Average Wait Time",
        formula: "AVG(field_waitTime)",
        description: "Average minutes waited",
        outputType: "number"
      },
      {
        name: "Revenue per Patient",
        formula: "SUM(field_billingAmount) / COUNT(DISTINCT field_patientId)",
        description: "Average billing per patient",
        outputType: "currency"
      }
    ],
    recommendedFields: ['patientId', 'appointmentDate', 'billingAmount', 'diagnosis'],
    kpiBenchmarks: {
      appointmentRate: { good: 90, average: 75, poor: 60 },
      waitTime: { good: 15, average: 30, poor: 45 }
    }
  },
  manufacturing: {
    name: "Manufacturing",
    commonMetrics: [
      {
        name: "Production Efficiency",
        formula: "(SUM(field_unitsProduced) / SUM(field_unitsPlanned)) * 100",
        description: "Percentage of planned production achieved",
        outputType: "percentage"
      },
      {
        name: "Defect Rate",
        formula: "(SUM(field_defectiveUnits) / SUM(field_totalUnits)) * 100",
        description: "Percentage of defective products",
        outputType: "percentage"
      },
      {
        name: "Machine Utilization",
        formula: "(SUM(field_activeHours) / SUM(field_totalHours)) * 100",
        description: "Percentage of machine uptime",
        outputType: "percentage"
      },
      {
        name: "Cost per Unit",
        formula: "SUM(field_totalCost) / SUM(field_unitsProduced)",
        description: "Average production cost per unit",
        outputType: "currency"
      }
    ],
    recommendedFields: ['unitsProduced', 'unitsPlanned', 'defectiveUnits', 'machineId', 'cost'],
    kpiBenchmarks: {
      efficiency: { good: 95, average: 85, poor: 70 },
      defectRate: { good: 1, average: 3, poor: 5 }
    }
  },
  realEstate: {
    name: "Real Estate",
    commonMetrics: [
      {
        name: "Property Conversion Rate",
        formula: "(COUNT(WHERE field_status = 'sold') / COUNT(*)) * 100",
        description: "Percentage of properties sold",
        outputType: "percentage"
      },
      {
        name: "Average Days on Market",
        formula: "AVG(field_daysOnMarket)",
        description: "Average days to sell",
        outputType: "number"
      },
      {
        name: "Price per Square Foot",
        formula: "AVG(field_salePrice / field_squareFootage)",
        description: "Average price per sq ft",
        outputType: "currency"
      },
      {
        name: "Commission Revenue",
        formula: "SUM(field_salePrice * field_commissionRate)",
        description: "Total commission earned",
        outputType: "currency"
      }
    ],
    recommendedFields: ['salePrice', 'listDate', 'soldDate', 'squareFootage', 'status'],
    kpiBenchmarks: {
      conversionRate: { good: 60, average: 40, poor: 20 },
      daysOnMarket: { good: 30, average: 60, poor: 90 }
    }
  },
  retail: {
    name: "E-commerce/Retail",
    commonMetrics: [
      {
        name: "Total Sales",
        formula: "SUM(field_orderAmount)",
        description: "Total revenue from orders",
        outputType: "currency"
      },
      {
        name: "Average Order Value",
        formula: "AVG(field_orderAmount)",
        description: "Average amount per order",
        outputType: "currency"
      },
      {
        name: "Customer Lifetime Value",
        formula: "SUM(field_orderAmount) / COUNT(DISTINCT field_customerId)",
        description: "Average revenue per customer",
        outputType: "currency"
      },
      {
        name: "Cart Abandonment Rate",
        formula: "(COUNT(WHERE field_status = 'abandoned') / COUNT(*)) * 100",
        description: "Percentage of abandoned carts",
        outputType: "percentage"
      }
    ],
    recommendedFields: ['orderAmount', 'customerId', 'orderDate', 'status', 'productId'],
    kpiBenchmarks: {
      aov: { good: 100, average: 50, poor: 25 },
      clv: { good: 500, average: 250, poor: 100 }
    }
  }
};

class IndustryAnalyticsService {
  /**
   * Detect industry from form fields and organization data
   * @param {Object} formTemplate - Form template
   * @param {Object} organizationData - Organization data (optional)
   * @returns {String} Detected industry
   */
  detectIndustry(formTemplate, organizationData = null) {
    const fieldNames = this.extractFieldNames(formTemplate);
    const industryScores = {};

    // Check organization industry field
    if (organizationData?.industry) {
      const orgIndustry = organizationData.industry.toLowerCase();
      if (INDUSTRY_TEMPLATES[orgIndustry]) {
        return orgIndustry;
      }
    }

    // Score industries based on field keywords
    Object.keys(INDUSTRY_TEMPLATES).forEach(industry => {
      const template = INDUSTRY_TEMPLATES[industry];
      let score = 0;

      template.recommendedFields.forEach(recommendedField => {
        fieldNames.forEach(fieldName => {
          const lowerFieldName = fieldName.toLowerCase();
          if (lowerFieldName.includes(recommendedField) || 
              recommendedField.includes(lowerFieldName)) {
            score += 2;
          }
        });
      });

      // Check entity type
      if (formTemplate.entityType) {
        const entityType = formTemplate.entityType.toLowerCase();
        if (industry === 'sales' && ['opportunity', 'quotation', 'deal'].includes(entityType)) {
          score += 5;
        }
        if (industry === 'healthcare' && ['patient', 'appointment'].includes(entityType)) {
          score += 5;
        }
      }

      industryScores[industry] = score;
    });

    // Return industry with highest score
    const sortedIndustries = Object.entries(industryScores)
      .sort((a, b) => b[1] - a[1]);

    return sortedIndustries[0] && sortedIndustries[0][1] > 0 
      ? sortedIndustries[0][0] 
      : 'sales'; // Default to sales
  }

  /**
   * Extract field names from form template
   */
  extractFieldNames(formTemplate) {
    const names = [];
    
    if (formTemplate.sections) {
      formTemplate.sections.forEach(section => {
        if (section.fields) {
          section.fields.forEach(field => {
            names.push(field.id.toLowerCase());
            names.push(field.label.toLowerCase());
          });
        }
      });
    }
    
    return names;
  }

  /**
   * Get recommended metrics for industry
   * @param {String} industry - Industry type
   * @returns {Array} Recommended metrics
   */
  getRecommendedMetrics(industry) {
    const template = INDUSTRY_TEMPLATES[industry];
    return template ? template.commonMetrics : [];
  }

  /**
   * Get industry template
   * @param {String} industry - Industry type
   * @returns {Object} Industry template
   */
  getIndustryTemplate(industry) {
    return INDUSTRY_TEMPLATES[industry] || null;
  }

  /**
   * Auto-generate dashboard widgets for industry
   * @param {String} industry - Industry type
   * @param {Object} formTemplate - Form template
   * @returns {Array} Dashboard widget configurations
   */
  generateDashboardWidgets(industry, formTemplate) {
    const metrics = this.getRecommendedMetrics(industry);
    const availableFields = this.extractFields(formTemplate);
    
    return metrics.map((metric, index) => {
      // Try to map formula fields to actual form fields
      const mappedFormula = this.mapFormulaToFields(metric.formula, availableFields);
      
      return {
        id: `widget_${industry}_${index}`,
        type: this.suggestWidgetType(metric),
        title: metric.name,
        description: metric.description,
        position: {
          x: (index % 3) * 3,
          y: Math.floor(index / 3) * 2,
          w: 3,
          h: 2
        },
        config: {
          dataSource: "formSubmissions",
          formTemplateId: formTemplate._id || formTemplate.id,
          formula: mappedFormula,
          chartType: this.suggestWidgetType(metric),
          outputType: metric.outputType || "number"
        },
        order: index
      };
    });
  }

  /**
   * Extract fields from form template
   */
  extractFields(formTemplate) {
    const fields = [];
    
    if (formTemplate.sections) {
      formTemplate.sections.forEach(section => {
        if (section.fields) {
          section.fields.forEach(field => {
            fields.push({
              id: field.id,
              type: field.type,
              label: field.label
            });
          });
        }
      });
    }
    
    return fields;
  }

  /**
   * Map formula to available fields (simple matching)
   */
  mapFormulaToFields(formula, availableFields) {
    // Simple field name matching
    // In production, this would use AI service
    let mappedFormula = formula;
    
    availableFields.forEach(field => {
      const fieldName = field.label.toLowerCase().replace(/\s+/g, '');
      const fieldId = field.id;
      
      // Try to match common field names
      if (formula.includes('revenue') && fieldName.includes('revenue')) {
        mappedFormula = mappedFormula.replace(/field_revenue/g, fieldId);
      }
      if (formula.includes('amount') && fieldName.includes('amount')) {
        mappedFormula = mappedFormula.replace(/field_amount/g, fieldId);
      }
      if (formula.includes('status') && fieldName.includes('status')) {
        mappedFormula = mappedFormula.replace(/field_status/g, fieldId);
      }
    });
    
    return mappedFormula;
  }

  /**
   * Suggest widget type based on metric
   */
  suggestWidgetType(metric) {
    if (metric.formula.includes('GROUP BY')) {
      return 'bar';
    }
    if (metric.outputType === 'percentage') {
      return 'pie';
    }
    return 'number';
  }

  /**
   * Suggest position for widget
   */
  suggestPosition(metric) {
    // Default grid positions
    return {
      x: 0,
      y: 0,
      w: 3,
      h: 2
    };
  }
}

export default new IndustryAnalyticsService();

