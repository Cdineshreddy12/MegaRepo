import { Briefcase, LucideIcon, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import Typography from "./common/Typography";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { formatCurrency } from "@/utils/format";

export const DetailCard = <
  T extends { label: string; value: string | number | ReactNode }
>({
  data,
  icon: Icon = Briefcase,
  title,
  contentClassName,
}: {
  data: T;
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
  contentClassName?: string;
}) => (
  <Card>
    {title ? (
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-red-500" />
          <Typography variant="h6">{title}</Typography>
        </CardTitle>
      </CardHeader>
    ) : null}
    <CardContent className={cn("flex items-center gap-1", contentClassName)}>
      <Typography variant="caption" className="text-sm text-muted-foreground">
        {data.label}
      </Typography>
      <Typography variant="overline">
        {data.value as React.ReactNode}
      </Typography>
    </CardContent>
  </Card>
);

export const InfoCard = ({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon?: LucideIcon;
  label: string;
  value?: string | number;
  className?: string;
}) => (
  <DetailCard
    data={{
      label,
      value: (
        <div className="flex items-center gap-2 mt-1">
          {Icon ? <Icon className="w-4 h-4 text-primary" /> : null}
          <Typography variant="overline" className={cn(!value && "text-muted-foreground")}>{value || "No data available"}</Typography>
        </div>
      ),
    }}
    contentClassName={cn(
      "p-4 rounded-lg bg-card  flex-col items-start",
      className
    )}
  />
);

export const ServiceCard = ({
  service,
}: {
  service: { serviceType: string; serviceRevenue: number };
}) => (
  <DetailCard
    title={service.serviceType}
    data={{
      label: "Revenue",
      value: formatCurrency(service.serviceRevenue),
    }}
    icon={Briefcase}
    contentClassName="justify-end"
  />
);

export const AddressCard = ({
  title,
  address,
}: {
  title: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}) => {
  const requiredAddressProps = {
    street: address?.street,
    city: address?.city,
    state: address?.state,
    postalCode: address?.postalCode,
    country: address?.country,
  };
  const isEmptyAddress = !address || Object.keys(requiredAddressProps).length === 0 || Object.values(requiredAddressProps).every((value) => !value);
  
  return (
    <Card className="p-4 bg-card rounded-lg flex flex-col">
      <CardHeader className="flex items-center gap-3">
        <MapPin className="w-4 h-4 text-red-500" />
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col space-y-2">
        {isEmptyAddress ? (
    <Typography variant="overline" className="text-center text-muted-foreground">No address available</Typography>
  ) : (
          <address className="not-italic text-sm text-muted-foreground">
            {address?.street}
            <br />
            {address?.city}, {address?.state} {address?.postalCode}
            <br />
            {address?.country}
          </address>
        )}
      </CardContent>
    </Card>
  );
}
