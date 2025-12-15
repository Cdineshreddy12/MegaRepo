import {
  Ticket,
  Building2,
  User,
  Briefcase,
  Clock,
  Tag,
  Shield,
  MapPin,
  Wrench,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Page, { PageHeader } from "@/components/Page";
import { ROUTE_PATH } from "@/constants";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTicket } from "@/queries/TicketQueries";
import Loader from "@/components/common/Loader";
import { InfoCard } from "@/components/Cards";
import { Section } from "@/components/Section";
import UserCard from "@/components/common/UserCard";
import Typography from "@/components/common/Typography";
import ColorBadge from "@/components/ColorBadge";

const rootPath = ROUTE_PATH.TICKET;

function TicketViewPage() {
  const { ticketId } = useParams(); // Directly get opportunity id from URL
  
  // Safety check: if ticketId is invalid, show loading
  if (!ticketId || ticketId === '' || ticketId === 'undefined' || ticketId === 'null') {
    return <Loader />;
  }
  
  const { data, isPending } = useTicket(ticketId);
  const ticketData = isPending || !data ? {} : data;

  if (isPending) return <Loader />;

  return (
    <Page
      header={
        <PageHeader
          title={
            <span className="flex items-center gap-4">
              <Ticket />
              Support Ticket <ColorBadge status={ticketData?.status} >{ticketData?.status}</ColorBadge>
            </span>
          }
          actions={[
            <Link to={`${rootPath}/${ticketData?._id}/edit`} key="editTicket">
              <Button>Edit</Button>
            </Link>,
          ]}
        />
      }
    >
      {/* Main Content */}
      <div className="p-6 space-y-8">
        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard
            icon={Building2}
            label="Account"
            value={ticketData?.accountId?.companyName}
            className="bg-blue-50"
          />
          <InfoCard
            icon={Tag}
            label="Product"
            value={ticketData?.productName}
            className="bg-purple-50"
          />
          <InfoCard
            icon={Shield}
            label="Support Level"
            value={ticketData?.supportLevel}
            className="bg-green-50"
          />
        </div>

        {/* Assignment Section */}
        <Section title="Assignment Details" icon={User}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Assigned To
                </div>
                <div className="flex items-center gap-3">
                  <UserCard user={ticketData?.assignedTo} showRole />
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Region Owner
                </div>
                <div className="flex items-center gap-3">{
                 ticketData?.regionOwner ? <UserCard user={ticketData?.regionOwner} showRole /> : <Typography>Unassigned</Typography>
                  }

                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Zone
                </div>
                <Badge variant="outline" className="text-sm">
                  <MapPin className="w-3 h-3 mr-1" />
                  {ticketData?.zone}
                </Badge>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Created By
                </div>
                <div className="flex items-center gap-3">
                <UserCard user={ticketData?.createdBy} showRole />
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Product Details */}
        <Section title="Product Information" icon={Briefcase}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Product Details
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />
                  <span className="font-medium">
                    {ticketData?.productName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  <span>OEM: {ticketData?.oem}</span>
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Support Progress
              </div>
              <Progress value={ticketData?.support?.progress} className="h-2" />
              <div className="mt-2 text-sm text-muted-foreground">
                {ticketData?.support?.progress}% Complete
              </div>
            </div>
          </div>
        </Section>

        {/* Technical Details */}
        <Section title="Technical Details" icon={Wrench}>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Description
              </div>
              <p className="text-sm">
                {ticketData?.technicalTeamDescription}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-sm">
                <AlertCircle className="w-3 h-3 mr-1" />
                Priority: {ticketData?.technicalDetails?.priority}
              </Badge>
              <Badge variant="outline" className="text-sm">
                <Clock className="w-3 h-3 mr-1" />
                Est. Effort: {ticketData?.support?.estimatedEffort}
              </Badge>
            </div>
          </div>
        </Section>
      </div>
    </Page>
  );
}

export default TicketViewPage;
