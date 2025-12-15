import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Package, 
  DollarSign, 
  Warehouse, 
  Tag,
  MapPin,
  Clock,
  FileText,
  TrendingDown,
  type LucideIcon 
} from "lucide-react";
import { ReactNode } from "react";
import Loader from "@/components/common/Loader";
import { useInventoryProduct } from "@/queries/InventoryProductQueries";
import { Product } from "@/services/api/inventoryService";
import { formatCurrency } from "@/utils/format";
import ColorBadge from "@/components/ColorBadge";

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
  type?: "text" | "currency" | "percentage" | "number" | "textarea";
  className?: string;
}) {
  const formatValue = () => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-muted-foreground italic">Not specified</span>;
    }

    switch (type) {
      case "currency":
        return formatCurrency(Number(value));
      case "percentage":
        return `${value}%`;
      case "number":
        return Number(value).toLocaleString();
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

function StatusBadge({ status }: { status: "active" | "inactive" }) {
  const statusConfig = {
    active: {
      label: "Active",
      variant: "success" as const,
    },
    inactive: {
      label: "Inactive",
      variant: "secondary" as const,
    },
  };

  const config = statusConfig[status] || statusConfig.active;

  return <ColorBadge value={config.label}>{config.label}</ColorBadge>;
}

function StockAlert({ quantity, minStockLevel }: { quantity: number; minStockLevel: number }) {
  if (quantity <= minStockLevel) {
    return (
      <Alert variant="destructive">
        <TrendingDown className="h-4 w-4" />
        <AlertDescription>
          Low stock alert! Current quantity ({quantity}) is at or below minimum level ({minStockLevel}).
        </AlertDescription>
      </Alert>
    );
  }
  return null;
}

const InventoryProductView = () => {
  const { id } = useParams();
  const { data, isPending } = useInventoryProduct(id);

  if (isPending) return <Loader />;

  const product = data || ({} as Product);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold">
                {product.name || "Unknown Product"}
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  SKU: {product.sku || "N/A"}
                </span>
                {product.category && (
                  <>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      {product.category}
                    </span>
                  </>
                )}
                {product.brand && (
                  <>
                    <Separator orientation="vertical" className="h-4" />
                    <span>{product.brand}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={product.status} />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stock Alert */}
      {product.quantity !== undefined && product.minStockLevel !== undefined && (
        <StockAlert quantity={product.quantity} minStockLevel={product.minStockLevel} />
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <InfoCard title="Basic Information" icon={Package}>
          <dl className="grid gap-4">
            <DataField label="Product Name" value={product.name} />
            <DataField label="SKU" value={product.sku} />
            <DataField label="Category" value={product.category} />
            <DataField label="Brand" value={product.brand} />
            <DataField label="Status" value={product.status} />
          </dl>
        </InfoCard>

        {/* Pricing Information */}
        <InfoCard title="Pricing Information" icon={DollarSign}>
          <dl className="grid gap-4">
            <DataField
              label="Base Price"
              value={product.basePrice}
              type="currency"
            />
            <DataField
              label="Selling Price"
              value={product.sellingPrice}
              type="currency"
            />
            <DataField
              label="Tax Rate"
              value={product.taxRate}
              type="percentage"
            />
          </dl>
        </InfoCard>

        {/* Stock & Inventory */}
        <InfoCard title="Stock & Inventory" icon={Warehouse}>
          <dl className="grid gap-4">
            <DataField
              label="Current Quantity"
              value={product.quantity}
              type="number"
            />
            <DataField
              label="Stock Level"
              value={product.stockLevel}
              type="number"
            />
            <DataField
              label="Minimum Stock Level"
              value={product.minStockLevel}
              type="number"
            />
            <div className="pt-2">
              <div className="text-sm font-medium text-muted-foreground mb-1">Stock Status</div>
              <div className="flex items-center gap-2">
                {product.quantity > product.minStockLevel ? (
                  <Badge variant="default" className="bg-green-600">In Stock</Badge>
                ) : (
                  <Badge variant="destructive">Low Stock</Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {product.quantity > 0 ? `${product.quantity} units available` : 'Out of stock'}
                </span>
              </div>
            </div>
          </dl>
        </InfoCard>

        {/* Location & Warranty */}
        <InfoCard title="Location & Warranty" icon={MapPin}>
          <dl className="grid gap-4">
            <DataField label="Location" value={product.location} />
            <DataField
              label="Warranty Period"
              value={product.warrantyPeriod ? `${product.warrantyPeriod} months` : undefined}
            />
          </dl>
        </InfoCard>
      </div>

      {/* Product Details */}
      {(product.description || product.specifications) && (
        <InfoCard title="Product Details" icon={FileText}>
          <div className="space-y-6">
            {product.description && (
              <DataField
                label="Description"
                value={product.description}
                type="textarea"
              />
            )}
            {product.specifications && (
              <>
                {product.description && <Separator />}
                <DataField
                  label="Specifications"
                  value={product.specifications}
                  type="textarea"
                />
              </>
            )}
          </div>
        </InfoCard>
      )}

      {/* Record Information */}
      {(product.createdAt || product.updatedAt) && (
        <InfoCard title="Record Information" icon={Clock}>
          <dl className="grid gap-4 md:grid-cols-2">
            {product.createdAt && (
              <DataField
                label="Created"
                value={new Date(product.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              />
            )}
            {product.updatedAt && (
              <DataField
                label="Last Updated"
                value={new Date(product.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              />
            )}
          </dl>
        </InfoCard>
      )}
    </div>
  );
};

export default InventoryProductView;