// React and Router imports
import { useParams } from "react-router-dom";

// Component imports
import Page, { PageHeader } from "@/components/Page";
import LinkButton from "@/components/LinkButton";
import { Section } from "@/components/Section";
import { InfoCard } from "@/components/Cards";
import UserCard, { NameCard } from "@/components/common/UserCard";
import { UserAvatar } from "@/components/common/UserAvatar";
import Typography from "@/components/common/Typography";
import Loader from "@/components/common/Loader";
import AiInsightsButton from "@/components/common/AiInsightsButton";
import { AddressCard } from "@/components/Cards";
import { Separator } from "@/components/ui/separator";

// Icon imports
import {
  Building2,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  Globe,
  CreditCard,
  Users,
  FileText,
  Building,
  FileCheck,
  IndianRupee,
} from "lucide-react";

// Utility imports
import { formatCurrency, validateUser } from "@/utils/format";
import { useFormTemplate } from "@/hooks/useFormTemplate";
import { getFieldsFromTemplate, renderFieldValue, getFieldName } from "@/utils/dynamicFields";

// Query imports
import { useAccount } from "@/queries/AccountQueries";
import { useAccountContacts } from "@/queries/ContactQueries";

// Constant imports
import { ROUTE_PATH } from "@/constants";

// Type imports
import { Account } from "@/services/api/accountService";

const rootPath = ROUTE_PATH.ACCOUNT;

function AccountView() {
  const { accountId } = useParams();

  // Safety check: if accountId is invalid, show loading
  if (!accountId || accountId === '' || accountId === 'undefined' || accountId === 'null') {
    return <Loader />;
  }

  const { data, isPending } = useAccount(accountId);
  const { data: accountContacts } = useAccountContacts(accountId);
  const { template } = useFormTemplate("account");

  const accountData = (isPending || !data ? {} : data) as Account;

  if (isPending) return <Loader />;

  // Get dynamic fields from template
  const dynamicFields = getFieldsFromTemplate(template);
  
  // Helper to get field value from account data (checks both standard fields and customFields)
  const getFieldValue = (field: any): any => {
    const fieldId = field.id;
    const fieldNameFromId = getFieldName(fieldId);
    const fieldName = (field as any).name || fieldNameFromId;
    
    // First check standard fields
    let value = accountData[fieldId] ||
      accountData[fieldNameFromId] ||
      accountData[fieldName];
    
    // If not found, check customFields
    if ((value === undefined || value === null || value === '') && accountData.customFields) {
      value = accountData.customFields[fieldId] ||
        accountData.customFields[fieldNameFromId] ||
        accountData.customFields[fieldName];
    }
    
    return value || "";
  };

  return (
    <Page
      header={
        <PageHeader
          title="Account Information"
          actions={[
            <AiInsightsButton
              to={`${rootPath}/${accountId}/ai-insights`}
              key="accountAiInsights"
            />,
            <LinkButton to={`${rootPath}/${accountId}/edit`} key="editAccount">
              Edit
            </LinkButton>,
          ]}
        />
      }
    >
      <div className="p-6 space-y-8">
        <Section title="Company Information" icon={Building2}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Company Name
              </div>
              <div className="text-foreground font-medium">
                {accountData?.companyName}
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  {accountData?.email || "No email provided"}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  {accountData?.phone || "No phone number provided"}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="w-4 h-4" />
                  {accountData?.website || "No website provided"}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <InfoCard
                icon={FileCheck}
                label="Status"
                value={accountData?.status || "No status available"}
                className="bg-green-50"
              />
              <InfoCard
                icon={MapPin}
                label="Zone"
                value={accountData?.zone}
                className="bg-blue-50"
              />
            </div>
          </div>
        </Section>

        <Section title="Description" icon={FileText}>
          <p className="text-muted-foreground whitespace-pre-wrap">
            {accountData?.description || "No description available"}
          </p>
        </Section>

        <Section title="Address Information" icon={MapPin}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AddressCard
              title="Billing Address"
              address={accountData?.billingAddress || {}}
            />
            <AddressCard
              title="Shipping Address"
              address={accountData?.shippingAddress || {}}
            />
          </div>
        </Section>

        <Section title="Business Details" icon={Briefcase}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InfoCard
              icon={Building}
              label="Ownership Type"
              value={accountData?.ownershipType}
            />
            <InfoCard
              icon={Users}
              label="Company Size"
              value={`${accountData?.employeesCount} employees`}
            />
            <InfoCard
              icon={IndianRupee}
              label="Annual Revenue"
              value={
                accountData?.annualRevenue
                  ? formatCurrency(accountData?.annualRevenue)
                  : ""
              }
            />
          </div>
          <Separator className="my-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InfoCard
              icon={CreditCard}
              label="Credit Term"
              value={accountData?.creditTerm}
            />
            <InfoCard
              icon={FileText}
              label="GST Number"
              value={accountData?.gstNo}
            />
            <InfoCard
              icon={Mail}
              label="Invoicing"
              value={accountData?.invoicing}
            />
          </div>
        </Section>

        <Section title="Contacts" icon={Users}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accountContacts?.length ? accountContacts?.map((contact) => (
              <NameCard
                key={contact?.id}
                primary={contact?.email || "No email provided"}
                className="w-full"
                secondary={contact?.phone}
                avatar={
                  <UserAvatar
                    user={{
                      firstName: contact?.firstName,
                      lastName: contact?.lastName,
                    }}
                    size="lg"
                  />
                }
              />
            )) : (
              <Typography variant="overline" className="text-muted-foreground">
                No contacts available
              </Typography>
            )}
          </div>
        </Section>

        <Section title="Assignment" icon={Briefcase}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {accountData?.assignedTo ? (
              <UserCard
                user={validateUser(accountData?.assignedTo)}
                label="Assigned To"
                showEmail={false}
              />
            ) : (
              <Typography variant="overline" className="text-muted-foreground">
                No user assigned
              </Typography>
            )}

            <UserCard
              user={validateUser(accountData?.createdBy)}
              label="Created By"
              showEmail={false}
            />
          </div>
        </Section>

        {/* Dynamic Fields from Template */}
        {dynamicFields.length > 0 && dynamicFields.map(({ section, fields }) => {
          // Filter out fields that are already shown in standard sections
          const standardFieldIds = new Set([
            "field-companyName",
            "companyName",
            "field-email",
            "email",
            "field-phone",
            "phone",
            "field-website",
            "website",
            "field-status",
            "status",
            "field-zone",
            "zone",
            "field-description",
            "description",
            "field-billingAddress",
            "billingAddress",
            "field-shippingAddress",
            "shippingAddress",
            "field-ownershipType",
            "ownershipType",
            "field-employeesCount",
            "employeesCount",
            "field-annualRevenue",
            "annualRevenue",
            "field-creditTerm",
            "creditTerm",
            "field-gstNo",
            "gstNo",
            "field-invoicing",
            "invoicing",
            "field-assignedTo",
            "assignedTo",
            "field-createdBy",
            "createdBy",
            "field-updatedBy",
            "updatedBy",
          ]);

          const customFields = fields.filter(
            (field) => {
              const fieldName = getFieldName(field.id);
              return (
                !standardFieldIds.has(field.id) &&
                !standardFieldIds.has(fieldName) &&
                !field.readOnly &&
                !field.metadata?.autoPopulated &&
                !field.metadata?.hiddenInView
              );
            }
          );

          if (customFields.length === 0) return null;

          return (
            <Section key={section.id} title={section.title} icon={FileText}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {customFields.map((field) => {
                  const value = getFieldValue(field);
                  // Show all fields - renderFieldValue handles empty state
                  return (
                    <div key={field.id} className="space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </div>
                      <div className="text-foreground">
                        {renderFieldValue(field, value)}
                      </div>
                      {field.metadata?.helpText && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {field.metadata.helpText}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          );
        })}
      </div>
    </Page>
  );
}

export default AccountView;
