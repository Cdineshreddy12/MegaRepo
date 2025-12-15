import {
  Building2,
  Mail,
  Phone,
  Briefcase,
  User,
  FileText,
  Building,
  Users2,
  UserCircle,
  Calendar,
} from "lucide-react";
import Page, { PageHeader } from "@/components/Page";
import LinkButton from "@/components/LinkButton";
import { Section } from "@/components/Section";
import { AddressCard, InfoCard } from "@/components/Cards";
import { useContact } from "@/queries/ContactQueries";
import { Contact } from "@/services/api/contactService";
import { useParams } from "react-router-dom";
import Loader from "@/components/common/Loader";
import { UserAvatar } from "@/components/common/UserAvatar";
import UserCard from "@/components/common/UserCard";
import { ROUTE_PATH } from "@/constants";
import AiInsightsButton from "@/components/common/AiInsightsButton";
import { Account } from "@/services/api/accountService";
import { validateUser } from "@/utils/format";

const rootPath = ROUTE_PATH.CONTACT;

export default function ContactView() {
  const { contactId } = useParams(); // Directly get opportunity id from URL
  
  // Safety check: if contactId is invalid, show loading
  if (!contactId || contactId === '' || contactId === 'undefined' || contactId === 'null') {
    return <Loader />;
  }
  
  const { data, isPending } = useContact(contactId);

  const contactData = (isPending || !data ? {} : data) as Contact;
  if (isPending) return <Loader />;

  return (
    <Page
      header={
        <PageHeader
          title="Contact Information"
          actions={[
            <AiInsightsButton
              to={`${rootPath}/${contactId}/${ROUTE_PATH.AI_INSIGHTS}`}
              key="contactAiInsights"
            />,

            <LinkButton to={`${rootPath}/${contactId}/edit`} key="editContact">
              Edit
            </LinkButton>,
          ]}
        />
      }
    >
      <div className="p-6 space-y-8">
        <div className="flex items-center gap-6">
          <UserAvatar
            user={contactData}
            size="lg"
            className="w-28 h-28 border rounded-full text-6xl font-semibold"
          />

          <div className="flex-1">
            <div className="flex gap-4 items-center">
              <h2 className="text-2xl font-bold text-foreground">
                {contactData?.firstName} {contactData?.lastName}
              </h2>
              {contactData?.isPrimaryContact && (
                <span className="px-3 py-1 bg-primary rounded-full text-sm font-medium text-primary-foreground">
                  Primary Contact
                </span>
              )}
            </div>
            <p className="text-lg text-muted-foreground">
              {contactData?.jobTitle}
            </p>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="w-4 h-4" />
                {(contactData?.accountId as unknown as Account)?.companyName}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Briefcase className="w-4 h-4" />
                {contactData?.department}
              </div>
            </div>
          </div>
        </div>

        <Section title="Contact Details" icon={User}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Primary Email
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <span>{contactData?.email}</span>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Secondary Email
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <span>
                    {contactData?.secondaryEmail ??
                      <span className="text-muted-foreground ">
                        No secondary email available
                      </span>}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Primary Phone
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  <span>
                    {contactData?.phone ?? <span className="text-muted-foreground">No phone number available</span>}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Alternate Phone
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  <span>
                    {contactData?.alternatePhone ?? <span className="text-muted-foreground">No alternate phone number available</span>}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Business Information" icon={Briefcase}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoCard
              icon={Building}
              label="Contact Type"
              value={contactData?.contactType}
            />
            <InfoCard
              icon={Users2}
              label="Lead Source"
              value={contactData?.leadSource}
            />
            <InfoCard
              icon={Calendar}
              label="Created Date"
              value={
                contactData?.createdAt
                  ? new Date(contactData?.createdAt).toLocaleDateString()
                  : ""
              }
            />
          </div>
        </Section>

        <AddressCard title="Address" address={contactData.address ?? {}}/>

        <Section title="Documents" icon={FileText}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Business Card
              </h3>
              {contactData?.businessCard?.url ? (
                <img
                  src={contactData?.businessCard.url}
                  alt="Business Card"
                  className="rounded-lg border w-full h-40 object-cover"
                />
              ) : (
                <div className="text-muted-foreground">
                  No Business Card available
                </div>
              )}
            </div>
          </div>
        </Section>

        <Section title="Assignment" icon={UserCircle}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UserCard
              user={validateUser(contactData?.assignedTo)}
              label="Contact Owner"
              showEmail={false}
            />
            <UserCard
              user={validateUser(contactData?.createdBy)}
              label="Created By"
              showEmail={false}
            />
          </div>
        </Section>
      </div>
    </Page>
  );
}
