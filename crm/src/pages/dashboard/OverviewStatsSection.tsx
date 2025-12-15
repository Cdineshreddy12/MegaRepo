import { formatCurrency, formatName } from "@/utils/format";
import OverviewCard from "@/components/common/OverviewCard";
import { User } from "@/services/api/userService";
import { processContacts } from "./processContacts";
import { overviewCardStatisticConfig } from "./config";
import { Contact } from "@/services/api/contactService";
import OverlappedAvatars from "@/components/common/OverlapAvatarList";
import { Opportunity } from "@/services/api/opportunityService";
import { processOpportunities } from "./processOpportunities";

const genders = ["boy", "girl"];

export function ContactStaticsCard({ contacts }: { contacts: Contact[] }) {
  const { totalContacts, recentFiveContacts } = processContacts(contacts);

  const userList: Partial<User>[] = recentFiveContacts.map((contact) => {
    const randomGender = genders[Math.floor(Math.random() * genders.length)];
    return {
      id: contact._id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      contactMobile: contact.phone,
      avatarUrl: `https://avatar.iran.liara.run/public/${randomGender}?username=${formatName(contact)}`,
    };
  });


  const { icon: Icon, ...rest } = overviewCardStatisticConfig.contact;
  return (
    <OverviewCard
      icon={<Icon className="w-6 h-6 text-primary" />}
      {...rest}
      value={totalContacts}
      actionItem={
        <OverlappedAvatars
          avatarList={userList as User[] }
          className="justify-end"
          avatarProps={{
            size: "lg",
            className: "rounded-full border-2 border-white",
          }}
        />
      }
    />
  );
}

export const OpportunityStaticsCard = ({
  totalOpportunities,
}: {
  totalOpportunities: number;
}) => {
  const { icon: Icon, ...rest } = overviewCardStatisticConfig.opportunities;
  return (
    <OverviewCard
      icon={<Icon className="w-6 h-6 text-primary" />}
      {...rest}
      value={totalOpportunities}
    />
  );
};

export const ClosedRevenueCard = ({
  totalClosedWonRevenue,
}: {
  totalClosedWonRevenue: number;
}) => {
  const { icon: Icon, ...rest } = overviewCardStatisticConfig.closedRevenue;
  return (
    <OverviewCard
      icon={<Icon className="w-6 h-6 text-primary" />}
      {...rest}
      value={formatCurrency(totalClosedWonRevenue)}
    />
  );
};

export const ExpectedProfitCard = ({
  totalExpectedProfit,
}: {
  totalExpectedProfit: number;
}) => {
  const { icon: Icon, ...rest } = overviewCardStatisticConfig.expectedProfit;
  return (
    <OverviewCard
      icon={<Icon className="w-6 h-6 text-primary" />}
      {...rest}
      value={formatCurrency(totalExpectedProfit)}
    />
  );
};

function OverviewStatsSection({
  contacts,
  opportunities,
}: {
  contacts?: Contact[];
  opportunities?: Opportunity[];
}) {
  const { totalClosedWonRevenue, totalExpectedProfit, totalOpportunities } =
    processOpportunities(opportunities as Opportunity[]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <ContactStaticsCard contacts={contacts as Contact[]} />
      <OpportunityStaticsCard totalOpportunities={totalOpportunities} />
      <ClosedRevenueCard totalClosedWonRevenue={totalClosedWonRevenue} />
      <ExpectedProfitCard totalExpectedProfit={totalExpectedProfit} />
    </div>
  );
}

export default OverviewStatsSection;
