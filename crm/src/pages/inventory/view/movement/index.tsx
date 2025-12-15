import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Package,
  ArrowUpDown,
  MapPin,
  FileText,
  Calendar,
  Hash,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { useInventoryMovement } from "@/queries/InventoryMovementQueries";
import { useParams } from "react-router-dom";
import Loader from "@/components/common/Loader";
import { formatDate, validateUser } from "@/utils/format";
import UserCard from "@/components/common/UserCard";
import ColorBadge from "@/components/ColorBadge";
import { useDropdownOptionsByCategory } from "@/queries/DropdownQueries";
import { Product } from "@/services/api/inventoryService";

const DATE_FORMAT = "DD-MMM-YYYY HH:mm:ss";

function InfoCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
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
  type?: "text" | "number" | "date" | "textarea";
  className?: string;
}) {
  const formatValue = () => {
    if (value === null || value === undefined || value === "") {
      return (
        <span className="text-muted-foreground italic">Not specified</span>
      );
    }

    switch (type) {
      case "number":
        return Number(value).toLocaleString();
      case "date":
        return formatDate(value, DATE_FORMAT);
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

function MovementTypeBadge({
  type,
}: {
  type: "inbound" | "outbound" | "transfer" | "adjustment";
}) {
  const typeConfig = {
    inbound: {
      label: "Inbound",
      variant: "default" as const,
      icon: TrendingUp,
    },
    outbound: {
      label: "Outbound",
      variant: "destructive" as const,
      icon: TrendingDown,
    },
    transfer: {
      label: "Transfer",
      variant: "default" as const,
      icon: ArrowUpDown,
    },
    adjustment: {
      label: "Adjustment",
      variant: "secondary" as const,
      icon: Settings,
    },
  };

  const config = typeConfig[type];
  const IconComponent = config.icon;

  return (
    <ColorBadge
      value={config.label}
      className="flex items-center gap-1 max-w-fit"
    >
      <IconComponent className="h-3 w-3" />
      {config.label}
    </ColorBadge>
  );
}

function MovementFlow({
  fromLocation,
  toLocation,
  quantity,
  type,
}: {
  fromLocation: string;
  toLocation: string;
  quantity: number;
  type: "inbound" | "outbound" | "transfer" | "adjustment";
}) {
  const getFlowColors = () => {
    switch (type) {
      case "inbound":
        return "from-blue-50 to-green-50";
      case "outbound":
        return "from-green-50 to-red-50";
      case "transfer":
        return "from-blue-50 to-blue-50";
      case "adjustment":
        return "from-yellow-50 to-orange-50";
      default:
        return "from-gray-50 to-gray-50";
    }
  };

  return (
    <div className="mt-6">
      <div className="text-sm font-medium text-muted-foreground mb-3">
        Movement Flow
      </div>
      <div
        className={`flex items-center justify-center p-4 bg-gradient-to-r ${getFlowColors()} rounded-lg border`}
      >
        <div className="flex items-center gap-6 w-full max-w-md">
          <div className="text-center flex-1">
            <div className="font-medium text-foreground">{fromLocation}</div>
            <div className="text-xs text-muted-foreground">From</div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <ArrowUpDown className="h-6 w-6 text-primary" />
            <div className="text-center">
              <div className="font-bold text-primary text-lg">
                {quantity.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Units</div>
            </div>
          </div>

          <div className="text-center flex-1">
            <div className="font-medium text-foreground">{toLocation}</div>
            <div className="text-xs text-muted-foreground">To</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LocationCard({
  label,
  location,
  type,
}: {
  label: string;
  location: string;
  type: "from" | "to";
}) {
  const bgColor =
    type === "from"
      ? "bg-red-50 border-red-200"
      : "bg-green-50 border-green-200";
  const textColor = type === "from" ? "text-red-800" : "text-green-800";

  return (
    <div className="space-y-2">
      <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1">
        <MapPin className="h-4 w-4" />
        {label}
      </dt>
      <dd className={`p-3 ${bgColor} rounded-lg border`}>
        <div className={`font-medium ${textColor}`}>{location}</div>
      </dd>
    </div>
  );
}

function InventoryMovementViewPage() {
  const { id } = useParams();
  const { data: movementData, isPending, isError } = useInventoryMovement(id);
  const {
    data: warehouseNamesData,
    isPending: whnPending,
    isError: whnError,
  } = useDropdownOptionsByCategory("warehouse_names");
  const warehouseNames =
    whnPending || whnError || !warehouseNamesData ? [] : warehouseNamesData;
  const toLocation = warehouseNames.find(
    (whn) => whn.value === movementData?.toLocation
  );
  const fromLocation = warehouseNames.find(
    (whn) => whn.value === movementData?.fromLocation
  );

  if (isPending) return <Loader />;
  if (isError) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertDescription>
          Failed to load movement data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  if (!movementData) {
    return (
      <Alert className="m-6">
        <AlertDescription>Movement not found.</AlertDescription>
      </Alert>
    );
  }

  const formattedUser = validateUser(movementData.createdBy);
  const user =
    formattedUser && typeof formattedUser === "object" ? (
      <UserCard user={formattedUser} />
    ) : null;
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold">
                Movement Details
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Hash className="h-4 w-4" />
                  ID: {movementData._id}
                </span>
                <Separator orientation="vertical" className="h-4" />
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(movementData.createdAt!, DATE_FORMAT)}
                </span>
                <Separator orientation="vertical" className="h-4" />
                {user}
              </div>
            </div>
            <div className="flex gap-2">
              <MovementTypeBadge type={movementData.type} />
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Product Information */}
        <InfoCard title="Product Information" icon={Package}>
          <dl className="space-y-4">
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">
                Product Name
              </dt>
              <dd className="text-sm font-medium">
                {(movementData.productId as unknown as Product)?.name ||
                  "Unknown Product"}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">SKU</dt>
              <dd className="text-sm font-mono bg-muted px-2 py-1 rounded border">
                {(movementData.productId as unknown as Product)?.sku || "N/A"}
              </dd>
            </div>
            <DataField
              label="Brand"
              value={(movementData.productId as unknown as Product)?.brand}
            />
            <DataField
              label="Category"
              value={(movementData.productId as unknown as Product)?.category}
            />
          </dl>
        </InfoCard>

        {/* Movement Summary */}
        <InfoCard title="Movement Summary" icon={ArrowUpDown}>
          <dl className="space-y-4">
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">
                Movement Type
              </dt>
              <dd>
                <MovementTypeBadge type={movementData.type} />
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">
                Quantity
              </dt>
              <dd className="text-2xl font-bold text-primary">
                {movementData.quantity?.toLocaleString() || 0}
              </dd>
            </div>
            <DataField label="Reference" value={movementData.reference} />
          </dl>
        </InfoCard>
      </div>

      {/* Location Details */}
      <InfoCard title="Location Details" icon={MapPin}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <LocationCard
              label="From Location"
              location={fromLocation?.label || movementData.fromLocation}
              type="from"
            />
            <LocationCard
              label="To Location"
              location={toLocation?.label || movementData.toLocation}
              type="to"
            />
          </div>

          <MovementFlow
            fromLocation={fromLocation?.label || movementData.fromLocation}
            toLocation={toLocation?.label || movementData.toLocation}
            quantity={movementData.quantity}
            type={movementData.type}
          />
        </div>
      </InfoCard>

      {/* Additional Details */}
      <InfoCard title="Additional Details" icon={FileText}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DataField
              label="Created Date"
              value={movementData.createdAt}
              type="date"
            />
            <DataField
              label="Last Updated"
              value={movementData?.updatedAt}
              type="date"
            />
          </div>

          {movementData.notes && (
            <>
              <Separator />
              <DataField
                label="Notes"
                value={movementData.notes}
                type="textarea"
              />
            </>
          )}
        </div>
      </InfoCard>

      {/* Record Information */}
      <InfoCard title="Record Information" icon={Clock}>
        <dl className="grid gap-4 md:grid-cols-2">
          {user}
          <DataField label="Movement ID" value={movementData._id} />
        </dl>
      </InfoCard>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Duplicate Movement
            </Button>
            <Button variant="outline">Edit Movement</Button>
            <Button className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default InventoryMovementViewPage;
