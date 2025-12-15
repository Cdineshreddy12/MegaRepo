import { InfoCard, ServiceCard } from "@/components/Cards";
import AiInsightsButton from "@/components/common/AiInsightsButton";
import Loader from "@/components/common/Loader";
import Typography from "@/components/common/Typography";
import DropdownDisplay from "@/components/common/DropDownDisplay";
import UserCard from "@/components/common/UserCard";
import Page, { PageHeader } from "@/components/Page";
import { Section } from "@/components/Section";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ROUTE_PATH } from "@/constants";
import { OpportunityType, useOpportunity } from "@/queries/OpportunityQueries";
import { Account } from "@/services/api/accountService";
import { Contact } from "@/services/api/contactService";
import { formatCurrency, formatName, validateUser } from "@/utils/format";
import { useFormTemplate } from "@/hooks/useFormTemplate";
import { getFieldsFromTemplate, renderFieldValue, getFieldName } from "@/utils/dynamicFields";
import {
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  IndianRupee,
  FileText,
  Flag,
  Mail,
  Percent,
  Phone,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

const rootPath = ROUTE_PATH.OPPORTUNITY;

function OpportunityView() {
  const { opportunityId } = useParams(); // Directly get opportunity id from URL
  
  // Safety check: if opportunityId is invalid, show loading
  if (!opportunityId || opportunityId === '' || opportunityId === 'undefined' || opportunityId === 'null') {
    return <Loader />;
  }
  
  const { data, isPending } = useOpportunity(opportunityId);
  
  // Check if we need template BEFORE rendering anything
  // If formTemplateId exists, we MUST wait for template to load before rendering
  const hasFormTemplateId = !isPending && data?.formTemplateId;
  
  // Load template ONLY if formTemplateId is present
  // Pass null (not undefined) when no template is needed to prevent hook from loading default template
  const { template, loading: templateLoading } = useFormTemplate(
    "opportunity",
    hasFormTemplateId ? data?.formTemplateId : null
  );

  // Show loader while:
  // 1. Opportunity data is loading, OR
  // 2. Template is required (hasFormTemplateId) but still loading
  if (isPending || (hasFormTemplateId && templateLoading)) {
    return <Loader />;
  }

  const opportunityData = (data || {}) as OpportunityType;
  console.log("Opportunity Data", opportunityData);

  // Get dynamic fields from template if available
  const dynamicFields = getFieldsFromTemplate(template);
  
  // Helper to get field value from opportunity data
  // Only checks template fields, not all customFields
  const getFieldValue = (field: any): any => {
    const fieldId = field.id;
    const fieldNameFromId = getFieldName(fieldId);
    const fieldName = (field as any).name || fieldNameFromId;
    const fieldIdLower = fieldId.toLowerCase();
    
    // Map common field IDs to opportunity standard fields
    const fieldMapping: Record<string, string> = {
      'field-opportunityName': 'name',
      'field-name': 'name',
      'field-accountName': 'accountId',
      'field-accountId': 'accountId',
      'field-primaryContactId': 'primaryContactId',
      'field-contactId': 'primaryContactId',
      'field-opportunityStage': 'stage',
      'field-stage': 'stage',
      'field-opportunityStatus': 'status',
      'field-status': 'status',
      'field-revenue': 'revenue',
      'field-annualRevenue': 'revenue',
      'field-description': 'description',
      'field-assignedTo': 'assignedTo',
      'field-expectedCloseDate': 'expectedCloseDate',
      'field-closeDate': 'expectedCloseDate',
    };
    
    // Check mapped standard field first
    const mappedField = fieldMapping[fieldId] || fieldMapping[fieldNameFromId];
    if (mappedField && opportunityData[mappedField] !== undefined) {
      const mappedValue = opportunityData[mappedField];
      // For accountName field, if mapped to accountId, return the account object
      if (mappedField === 'accountId' && typeof mappedValue === 'object' && mappedValue !== null) {
        return mappedValue;
      }
      return mappedValue;
    }
    
    // Check standard fields directly
    let value = opportunityData[fieldId] ||
      opportunityData[fieldNameFromId] ||
      opportunityData[fieldName];
    
    // Only check customFields if the field exists in the template
    // This ensures we only show template-configured fields, not all customFields
    if ((value === undefined || value === null || value === '') && opportunityData.customFields) {
      // Only get from customFields if this field is actually in the template
      const fieldInTemplate = template?.sections?.some(section => 
        section.fields?.some(f => f.id === fieldId || f.id === fieldNameFromId)
      );
      
      if (fieldInTemplate) {
        value = opportunityData.customFields[fieldId] ||
          opportunityData.customFields[fieldNameFromId] ||
          opportunityData.customFields[fieldName];
        
        // If accountName is an ID string, try to resolve it from accountId
        if (fieldIdLower.includes('accountname') && typeof value === 'string' && value.length === 24 && /^[a-f\d]{24}$/i.test(value)) {
          // Check if accountId matches this ID and return the populated account object
          const accountId = opportunityData.accountId;
          if (accountId && typeof accountId === 'object' && accountId._id) {
            if (accountId._id.toString() === value || accountId.id === value) {
              return accountId; // Return populated account object
            }
          }
          // If not matched, return the ID (will show as "Not resolved" in renderFieldValue)
          return value;
        }
      }
    }
    
    return value || "";
  };

  // Decide upfront: use template view ONLY if formTemplateId exists AND template loaded successfully
  // This prevents flickering between normal and template views
  const useTemplateView = hasFormTemplateId && template && dynamicFields.length > 0;
  return (
    <Page
      header={
        <PageHeader
          title="Opportunity Details"
          actions={[
            <AiInsightsButton
              to={`${rootPath}/${opportunityId}/${ROUTE_PATH.AI_INSIGHTS}`}
              key="opportunityAiInsights"
              />,
            <Link
              to={`${rootPath}/${opportunityData?._id}/edit`}
              key="editOpportunity"
            >
              <Button>Edit</Button>
            </Link>,
          ]}
        />
      }
    >
      <div className="p-6 space-y-8">
        {/* Template-based view */}
        {useTemplateView ? (
          <>
            {dynamicFields.map(({ section, fields }) => {
              // Get section metadata from template
              const sectionData = template?.sections?.find(s => s.id === section.id);
              const columns = sectionData?.metadata?.columns || 1;
              
              return (
                <Section key={section.id} title={section.title} icon={FileText}>
                  {section.description && (
                    <Typography variant="overline" className="text-muted-foreground mb-4">
                      {section.description}
                    </Typography>
                  )}
                  <div className={`grid grid-cols-1 gap-6 ${
                    columns === 2 ? 'md:grid-cols-2' :
                    columns === 3 ? 'md:grid-cols-3' :
                    columns === 4 ? 'md:grid-cols-4' :
                    'md:grid-cols-2'
                  }`}>
                    {fields.map((field) => {
                      const value = getFieldValue(field);
                      return (
                        <div key={field.id} className="space-y-1">
                          <div className="text-sm font-medium text-muted-foreground">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </div>
                          <div className="text-foreground">
                            {renderFieldValue(field, value)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              );
            })}
          </>
        ) : (
          <>
        <Section title="Basic Information" icon={Target}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard
              icon={Trophy}
              label="Opportunity Name"
              value={opportunityData.name}
              preserveCase={true}
            />
            <InfoCard
              icon={Building2}
              label="OEM"
              value={opportunityData.oem}
              dropdownCategory="oem_types" // Assuming you have this dropdown category
              preserveCase={true}
            />
          </div>
        </Section>

        <Section title="Account & Contact" icon={Building2}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Account
              </div>
              <div className="space-y-1">
                <div className="font-medium">
                  {(opportunityData?.accountId as Account)?.companyName}
                </div>
                <div className="text-sm text-muted-foreground">
                  {/* Display industry label instead of code */}
                  <DropdownDisplay 
                    category="industries" 
                    value={(opportunityData.accountId as Account)?.industry} 
                    className="normal-case"
                  />
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Primary Contact
              </div>
              <div className="space-y-2">
                <div className="font-medium">
                 { formatName(opportunityData?.primaryContactId as Contact)}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  {
                    (opportunityData?.primaryContactId as Contact)?.email ? (
                      <a
                        href={`mailto:${
                          (opportunityData?.primaryContactId as Contact)?.email
                        }`}
                        className="text-primary underline"
                      >
                        {
                          (opportunityData?.primaryContactId as Contact)?.email
                        }
                      </a>
                    ) : (
                      <span className="text-muted-foreground">
                        No email available
                      </span>
                    )
                  }
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  {
                    (opportunityData?.primaryContactId as Contact)?.phone ? (
                      <a
                        href={`tel:${
                          (opportunityData?.primaryContactId as Contact)?.phone
                        }`}
                        className="text-primary underline"
                      >
                        {(opportunityData?.primaryContactId as Contact)?.phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">
                        No phone number available
                      </span>
                    )
                  }
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Description" icon={FileText}>
          {
            opportunityData.description ? (
              <Typography variant="overline" className="text-muted-foreground normal-case">
                {opportunityData.description}
              </Typography>
            ) : (
              <Typography variant="overline" className="text-muted-foreground">
                No description available
              </Typography>
            )}
          
        </Section>

        <Section title="Status Information" icon={Flag}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InfoCard
              icon={Target}
              label="Stage"
              value={opportunityData.stage}
              className="bg-blue-50"
              dropdownCategory="opportunity_stages" // Add dropdown category
              preserveCase={true}
            />
            <InfoCard
              icon={Clock}
              label="Status"
              value={opportunityData.status}
              className="bg-green-50"
              dropdownCategory="opportunity_status" // Add dropdown category
              preserveCase={true}
            />
            <InfoCard
              icon={Briefcase}
              label="Type"
              value={opportunityData.type}
              className="bg-purple-50"
              dropdownCategory="opportunity_types" // Add dropdown category
              preserveCase={true}
            />
          </div>
        </Section>

        <Section title="Financial Details" icon={IndianRupee}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <InfoCard
              icon={IndianRupee}
              label="Revenue"
              value={formatCurrency(opportunityData.revenue)}
              preserveCase={true}
            />
            <InfoCard
              icon={Percent}
              label="Profitability"
              value={`${opportunityData.profitability}%`}
              preserveCase={true}
            />
            <InfoCard
              icon={BarChart3}
              label="Expected Profit"
              value={opportunityData?.expectedProfit ? formatCurrency(opportunityData.expectedProfit) : ''}
              preserveCase={true}
            />
            <InfoCard
              icon={IndianRupee}
              label="Expense"
              value={opportunityData?.expense ? formatCurrency(opportunityData.expense) : ''}
              preserveCase={true}
            />
          </div>
        </Section>

        <Section title="Services" icon={Briefcase}>
          <div className="space-y-3">
            {opportunityData?.services?.length === 0 && (
              <Typography variant="overline" className="text-muted-foreground">
                No Services available
              </Typography>
            )}
            {opportunityData?.services?.map((service, index) => (
              <ServiceCard key={index} service={service} />
            ))}
          </div>
        </Section>

        <Section title="Timeline" icon={Calendar}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard
              icon={Calendar}
              label="Expected Close Date"
              value={new Date(
                opportunityData.expectedCloseDate
              ).toLocaleDateString()}
              preserveCase={true}
            />
            <InfoCard
              icon={Calendar}
              label="Actual Close Date"
              value={
                opportunityData.actualCloseDate
                  ? new Date(
                      opportunityData.actualCloseDate
                    ).toLocaleDateString()
                  : "Not closed yet"
              }
              preserveCase={true}
            />
          </div>
        </Section>

        <Section title="Additional Information" icon={FileText}>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Next Steps
              </div>
              <p className="text-foreground normal-case">{opportunityData.nextStep}</p>
            </div>
            <Separator />
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Competition
              </div>
              <p className="text-foreground normal-case">{opportunityData.competition}</p>
            </div>
            <Separator />
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Decision Criteria
              </div>
              <p className="text-foreground normal-case">
                {opportunityData.decisionCriteria}
              </p>
            </div>
          </div>
        </Section>

        <Section title="Assignment" icon={Users}>
          <div className="flex flex-col gap-3">
            {opportunityData?.assignedTo ? (
              <UserCard
                user={validateUser(opportunityData.assignedTo)}
                label="Assigned To"
                showEmail={false}
              />
            ) : (
              <Typography variant="overline" className="text-muted-foreground">
                No user assigned
              </Typography>
            )}
          </div>
        </Section>
          </>
        )}
      </div>
    </Page>
  );
}

export default OpportunityView;