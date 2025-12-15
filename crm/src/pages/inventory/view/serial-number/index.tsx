import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Package, 
  DollarSign, 
  Tag, 
  Calendar,
  User,
  FileText,
  Clock,
  type LucideIcon 
} from "lucide-react";
import { ReactNode } from "react";
import { useInventorySerialNumber } from "@/queries/InventorySerialNumberQueries";
import { useParams } from "react-router-dom";
import Loader from "@/components/common/Loader";
import { formatCurrency } from "@/utils/format";
import ColorBadge from "@/components/ColorBadge";
import { Product } from "@/services/api/inventoryService";
import { Account } from "@/services/api/accountService";

function InfoCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function DataField({
  label,
  value,
  type = "text",
  className = "",
}: {
  label: string;
  value: string | number | null | undefined;
  type?: "text" | "currency" | "percentage" | "number" | "textarea" | "date";
  className?: string;
}) {
  const formatValue = () => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-muted-foreground italic">Not specified</span>;
    }

    switch (type) {
      case "currency":
        return `${formatCurrency(Number(value))}`;
      case "percentage":
        return `${value}%`;
      case "number":
        return Number(value).toLocaleString();
      case "date":
        return new Date(value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      case "textarea":
        return (
          <div className="whitespace-pre-wrap text-sm bg-muted p-3 rounded-md border">
            {value}
          </div>
        );
      default:
        return value;
    }
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{formatValue()}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: "sold" | "available" | "damaged" }) {
  const statusConfig = {
    sold: {
      label: "Sold",
      variant: "default" as const,
    },
    available: {
      label: "Available",
      variant: "success" as const,
    },
    damaged: {
      label: "Damaged",
      variant: "destructive" as const,
    },
  };

  const config = statusConfig[status] || statusConfig.available;

  return <ColorBadge value={config.label}>{config.label}</ColorBadge>;
}

function SerialNumberViewPage() {
  const { id } = useParams();
  const { data, isPending } = useInventorySerialNumber(id);

  if (isPending) return <Loader />;

  const serialNumberData = isPending || !data ? undefined : data;


if (serialNumberData)  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold">
                {serialNumberData.serialNumber || "Unknown Serial Number"}
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  Product ID: {(typeof serialNumberData.productId === "string" ? serialNumberData.productId : (serialNumberData.productId as Product)?._id) || "N/A"}
                </span>
                {(serialNumberData.productId as unknown as Product)?.name && (
                  <>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      {(serialNumberData.productId as unknown as Product).name}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={serialNumberData.status} />
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Product Information */}
        {(serialNumberData.productId as unknown as Product) && (
          <InfoCard title="Product Information" icon={Package}>
            <dl className="grid gap-4">
              <DataField
                label="Product Name"
                value={(serialNumberData.productId as unknown as Product).name}
              />
              <DataField
                label="SKU"
                value={(serialNumberData.productId as unknown as Product).sku}
              />
              <DataField
                label="Category"
                value={(serialNumberData.productId as unknown as Product).category}
              />
              <DataField
                label="Brand"
                value={(serialNumberData.productId as unknown as Product).brand}
              />
              {(serialNumberData.productId as unknown as Product).location && (
                <DataField
                  label="Location"
                  value={(serialNumberData.productId as unknown as Product).location}
                />
              )}
            </dl>
          </InfoCard>
        )}

        {/* Warranty Information */}
        <InfoCard title="Warranty Information" icon={Calendar}>
          <dl className="grid gap-4">
            <DataField
              label="Warranty Start"
              value={serialNumberData.warrantyStart}
              type="date"
            />
            <DataField
              label="Warranty End"
              value={serialNumberData.warrantyEnd}
              type="date"
            />
            {(serialNumberData.productId as unknown as Product)?.warrantyPeriod && (
              <DataField
                label="Warranty Period"
                value={`${(serialNumberData.productId as unknown as Product).warrantyPeriod} months`}
              />
            )}
          </dl>
        </InfoCard>

        {/* Pricing Information */}
        <InfoCard title="Pricing Information" icon={DollarSign}>
          <dl className="grid gap-4">
            <DataField
              label="Sale Price"
              value={serialNumberData.price}
              type="currency"
            />
            {(serialNumberData.productId as unknown as Product)?.basePrice && (
              <DataField
                label="Base Price"
                value={(serialNumberData.productId as unknown as Product).basePrice}
                type="currency"
              />
            )}
            {(serialNumberData.productId as unknown as Product)?.sellingPrice && (
              <DataField
                label="Standard Price"
                value={(serialNumberData.productId as unknown as Product).sellingPrice}
                type="currency"
              />
            )}
            {(serialNumberData.productId as unknown as Product)?.taxRate && (
              <DataField
                label="Tax Rate"
                value={(serialNumberData.productId as unknown as Product).taxRate}
                type="percentage"
              />
            )}
          </dl>
        </InfoCard>

        {/* Customer Information */}
        {(serialNumberData.customer as unknown as Account) && (
          <InfoCard title="Customer Information" icon={User}>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {(serialNumberData.customer as unknown as Account).companyName 
                      ? (serialNumberData.customer as unknown as Account).companyName.split(' ').map(n => n[0]).join('').toUpperCase()
                      : 'CU'
                    }
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {(serialNumberData.customer as unknown as Account).companyName || 'Unknown Customer'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ID: {(serialNumberData.customer as unknown as Account)._id || serialNumberData.customer}
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <dl className="grid gap-4">
                {(serialNumberData.customer as unknown as Account).email && (
                  <DataField
                    label="Email"
                    value={(serialNumberData.customer as unknown as Account).email}
                  />
                )}
                {(serialNumberData.customer as unknown as Account).phone && (
                  <DataField
                    label="Phone"
                    value={(serialNumberData.customer as unknown as Account).phone}
                  />
                )}
              </dl>
            </div>
          </InfoCard>
        )}
      </div>

      {/* Product Details */}
      {serialNumberData.productId && ((serialNumberData.productId as unknown as Product).description || (serialNumberData.productId as unknown as Product).specifications) && (
        <InfoCard title="Product Details" icon={FileText}>
          <div className="space-y-6">
            {(serialNumberData.productId as unknown as Product).description && (
              <DataField
                label="Description"
                value={(serialNumberData.productId as unknown as Product).description}
                type="textarea"
              />
            )}
            {(serialNumberData.productId as unknown as Product).specifications && (
              <DataField
                label="Specifications"
                value={(serialNumberData.productId as unknown as Product).specifications}
                type="textarea"
              />
            )}
          </div>
        </InfoCard>
      )}

      {/* Record Information */}
      <InfoCard title="Record Information" icon={Clock}>
        <dl className="grid gap-4 md:grid-cols-2">
          <DataField
            label="Created"
            value={serialNumberData.createdAt}
            type="date"
          />
          <DataField
            label="Last Updated"
            value={serialNumberData.updatedAt}
            type="date"
          />
        </dl>
      </InfoCard>
    </div>
  );
else return <>Unable to fetch data</>
}

export default SerialNumberViewPage;