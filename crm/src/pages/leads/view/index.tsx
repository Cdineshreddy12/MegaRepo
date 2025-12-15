import {
  UserIcon,
  Building2,
  Target,
  FileText,
  MapPin,
  Users,
  AreaChart,
  Phone,
  Mail,
  Brain,
} from "lucide-react";
import { useParams } from "react-router-dom";

import Page, { PageHeader } from "@/components/Page";
import LinkButton from "@/components/LinkButton";
import { Section } from "@/components/Section";
import { AddressCard, InfoCard } from "@/components/Cards";
import UserCard from "@/components/common/UserCard";
import Loader from "@/components/common/Loader";
import DropdownDisplay from "@/components/common/DropDownDisplay";
import { Lead } from "@/services/api/leadService";
import { useLead } from "@/queries/LeadQueries";
import { ROUTE_PATH } from "@/constants";
import { type User } from "@/types/User.types";
import { Button } from "@/components/ui/button";
import { useLeadInsights } from "@/queries/useLeadInsights";
import useRedirect from "@/hooks/useRedirect";
import AiInsightsButton from "@/components/common/AiInsightsButton";

const rootPath = ROUTE_PATH.LEAD;

const LeadPreview = () => {
  const { leadId } = useParams();
  
  // Safety check: if leadId is invalid, show loading
  if (!leadId || leadId === '' || leadId === 'undefined' || leadId === 'null') {
    return <Loader />;
  }
  
  const { data, isPending } = useLead(leadId);
  const { 
    insights, 
    isLoading: isLoadingInsights, 
  } = useLeadInsights(leadId);
  const redirect = useRedirect();
  const lead = (isPending || !data ? {} : data) as Lead;

  if (isPending) return <Loader />;

  const handleAiInsightsClick = () => {
    redirect.to(`${rootPath}/${leadId}/ai-insights`);
  };

  return (
    <Page
      header={
        <PageHeader
          title="Lead Information"
          actions={[
            <AiInsightsButton
              key="aiInsights"
              to={`${rootPath}/${leadId}/ai-insights`}
              loading={isLoadingInsights}
            >
              {insights ? "View AI Insights" : "Generate AI Insights"}
            </AiInsightsButton>,
            <LinkButton to={`${rootPath}/${leadId}/edit`} key="editLead">
              Edit
            </LinkButton>,
          ]}
        />
      }
    >
      {/* Personal Information */}
      <Section title="Personal Information" icon={UserIcon}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">Name</p>
            <p className="font-medium">
              {lead?.firstName} {lead?.lastName}
            </p>
          </div>
          <div>
            <div className="mb-2">
              <div className="flex items-center text-gray-600">
                <span className="mr-2">
                  <Mail className="w-[1em] h-[1em]" />
                </span>
                {lead?.email}
              </div>
            </div>
            <div>
              <div className="flex items-center text-gray-600">
                <span className="mr-2">
                  <Phone className="w-[1em] h-[1em]" />
                </span>
                {lead?.phone}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Company Information */}
      <Section title="Company Information" icon={Building2}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-gray-600">Company</p>
            <p className="font-medium">{lead?.companyName}</p>
          </div>
          <div>
            <p className="text-gray-600">Industry</p>
            <p className="font-medium">
              <DropdownDisplay 
                category="industries" 
                value={lead?.industry} 
              />
            </p>
          </div>
          <div>
            <p className="text-gray-600">Job Title</p>
            <p className="font-medium">{lead?.jobTitle}</p>
          </div>
        </div>
      </Section>

      {/* Lead Details */}
      <Section title="Lead Details" icon={Target}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard
            label="Source"
            value={
              <DropdownDisplay 
                category="lead_sources" 
                value={lead?.source} 
                className="font-medium"
              />
            }
          />
          <InfoCard
            label="Status"
            value={
              <DropdownDisplay 
                category="lead_status" 
                value={lead?.status} 
                className="font-medium"
              />
            }
          />
          <InfoCard
            icon={AreaChart}
            label="Lead Score"
            value={`${lead?.score}/100`}
          />
        </div>
      </Section>

      {/* Notes */}
      <Section title="Notes" icon={FileText}>
        <p>{lead?.notes}</p>
      </Section>

      {/* Address */}
      <Section title="Address" icon={MapPin}>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <p className="text-gray-600">Street</p>
            <p className="font-medium">{lead?.address?.street}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-gray-600">City</p>
              <p className="font-medium">{lead?.address?.city}</p>
            </div>
            <div>
              <p className="text-gray-600">State</p>
              <p className="font-medium">{lead?.address?.state}</p>
            </div>
            <div>
              <p className="text-gray-600">ZIP Code</p>
              <p className="font-medium">{lead?.address?.zipCode}</p>
            </div>
          </div>
          <div>
            <p className="text-gray-600">Country</p>
            <p className="font-medium">
              <DropdownDisplay 
                category="countries" 
                value={lead?.address?.country} 
              />
            </p>
          </div>
        </div>
      </Section>

      {/* Zone */}
      {lead?.zone && (
        <Section title="Zone" icon={MapPin}>
          <div>
            <p className="text-gray-600">Zone</p>
            <p className="font-medium">
              <DropdownDisplay 
                category="zones" 
                value={lead?.zone} 
              />
            </p>
          </div>
        </Section>
      )}

      {/* Assignment */}
      <Section title="Assignment" icon={Users}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UserCard user={lead?.assignedTo as Partial<User>} label="Assigned To" showEmail={false} />
          <UserCard user={lead?.createdBy} label="Created By" showEmail={false} />
        </div>
      </Section>

      {/* Product */}
      {lead?.product && (
        <Section title="Product" icon={Target}>
          <div>
            <p className="text-gray-600">Product</p>
            <p className="font-medium">
              <DropdownDisplay 
                category="products" 
                value={lead?.product} 
              />
            </p>
          </div>
        </Section>
      )}

      {/* AI Insights Summary (if available) */}
      {insights && (
        <Section title="AI Insights" icon={Brain}>
          <div className="bg-indigo-50 p-4 rounded">
            <p className="text-gray-800 mb-2">{insights.answer.summary}</p>
            <div className="mt-3">
              <Button
                onClick={handleAiInsightsClick}
                variant="link"
                className="text-indigo-600 hover:text-indigo-800"
              >
                View Full AI Analysis →
              </Button>
            </div>
          </div>
        </Section>
      )}
    </Page>
  );
};

export default LeadPreview;