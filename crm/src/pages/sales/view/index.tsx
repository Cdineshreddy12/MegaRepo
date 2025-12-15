// React and React-related imports
import { useParams } from "react-router-dom";

// Common Components
import CloseButton from "@/components/common/CloseButton";
import IconButton from "@/components/common/IconButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Icons
import { 
  Edit, 
  FileText, 
  Download, 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Package,
  Truck,
  Building,
  Phone,
  Mail
} from "lucide-react";

// Hooks and Queries
import { useSuspenseSalesOrder } from "@/queries/SalesOrderQueries";
import { useOrgAccounts } from "@/hooks/useOrgAwareQueries";
import { useOrgContacts } from "@/hooks/useOrgAwareQueries";

// Constants and Utilities
import { ENTITY, ROUTE_PATH } from "@/constants";
import { formatCurrency, formatDate, formatName } from "@/utils/format";
import { SalesOrder } from "@/services/api/salesOrderService";
import Page, { PageHeader } from "@/components/Page";
import useRedirect from "@/hooks/useRedirect";


// Status configuration
const statusConfig = {
  draft: { color: "bg-gray-100 text-gray-800", icon: Clock },
  pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
  approved: { color: "bg-blue-100 text-blue-800", icon: CheckCircle },
  completed: { color: "bg-green-100 text-green-800", icon: CheckCircle },
  cancelled: { color: "bg-red-100 text-red-800", icon: XCircle },
};


interface SalesOrderItem {
  type: string;
  status: string;
  sku: string; // Ensure sku is always a string
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  gst: number | string;
}

function SalesOrderItemsView({ items }: { items: SalesOrderItem[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No items in this sales order.
      </div>
    );
  }

  const calculateItemTotal = (item: SalesOrderItem) => {
    const quantity = parseFloat(String(item.quantity || 0));
    const unitPrice = parseFloat(String(item.unitPrice || 0));
    const gstPercentage = parseFloat(String(item.gst || 0));
    
    const lineSubtotal = quantity * unitPrice;
    const gstAmount = lineSubtotal * (gstPercentage / 100);
    const total = lineSubtotal + gstAmount;
    
    return { lineSubtotal, gstAmount, total };
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full table-auto border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              SKU
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Quantity
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Unit Price
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              GST %
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              GST Amount
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item, index) => {
            const { gstAmount, total } = calculateItemTotal(item);
            return (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge variant="outline" className="capitalize">
                    {item.type || "N/A"}
                  </Badge>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge variant="secondary" className="capitalize">
                    {item.status || "N/A"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {item.sku || "-"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {item.description || "-"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  {item.quantity || 0}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  {formatCurrency(parseFloat(String(item.unitPrice)) || 0)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  {item.gst || 0}%
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  {formatCurrency(gstAmount)}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                  {formatCurrency(total)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


function SalesOrderTotals({ salesOrder }: { salesOrder: SalesOrder }) {
  const items = salesOrder.items || [];
  const freightCharges = parseFloat(String(salesOrder.freightCharges || 0));
  
    const totals = items?.reduce(
    (acc, item) => {
      const quantity = parseFloat(String(item.quantity || 0));
      const unitPrice = parseFloat(String(item.unitPrice || 0));
      const gstPercentage = parseFloat(String(item.gst || 0));
      
      const subtotal = quantity * unitPrice;
      const gstAmount = subtotal * (gstPercentage / 100);
      const total = subtotal + gstAmount;
      
      return {
        subtotal: acc.subtotal + subtotal,
        gstTotal: acc.gstTotal + gstAmount,
        total: acc.total + total,
      };
    },
    { subtotal: 0, gstTotal: 0, total: 0 }
  );
  
  const grandTotal = totals.total + freightCharges;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Order Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">GST Total</span>
            <span className="font-medium">{formatCurrency(totals.gstTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Freight Charges</span>
            <span className="font-medium">{formatCurrency(freightCharges)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total Amount</span>
            <span>{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SalesOrderViewPage() {
  const redirect = useRedirect();
  const { salesOrderId } = useParams<{ salesOrderId: string }>();
  const { data: salesOrder, isLoading: isSalesOrderLoading } = useSuspenseSalesOrder(salesOrderId ?? '');
  const { data: accounts } = useOrgAccounts();
  const { data: contacts } = useOrgContacts();

  if (isSalesOrderLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading sales order...</p>
        </div>
      </div>
    );
  }

  if (!salesOrder) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Sales order not found</p>
        </div>
      </div>
    );
  }

  // Get account and contact details
  // Handle accountId as both object and string
  const accountIdValue = typeof salesOrder.accountId === 'object' && salesOrder.accountId !== null
    ? salesOrder.accountId?._id || salesOrder.accountId?.id || salesOrder.accountId
    : salesOrder.accountId;
  
  // If accountId is already a populated object, use it directly; otherwise find it from accounts list
  const account = typeof salesOrder.accountId === 'object' && salesOrder.accountId !== null && 'companyName' in salesOrder.accountId
    ? salesOrder.accountId as { _id?: string; id?: string; companyName?: string; industry?: string; website?: string }
    : accounts?.find(acc => {
        const accId = acc._id || acc.id;
        return accId === accountIdValue || accId?.toString() === accountIdValue?.toString();
      });
  
  // Handle primaryContactId as both object and string
  const contactIdValue = typeof salesOrder.primaryContactId === 'object' && salesOrder.primaryContactId !== null
    ? salesOrder.primaryContactId?._id || salesOrder.primaryContactId?.id || salesOrder.primaryContactId
    : salesOrder.primaryContactId;
  
  // If primaryContactId is already a populated object, use it directly; otherwise find it from contacts list
  const contact = typeof salesOrder.primaryContactId === 'object' && salesOrder.primaryContactId !== null && ('firstName' in salesOrder.primaryContactId || 'name' in salesOrder.primaryContactId)
    ? salesOrder.primaryContactId as { _id?: string; id?: string; firstName?: string; lastName?: string; name?: string; phone?: string; email?: string }
    : contacts?.find(cont => {
        const contId = cont._id || cont.id;
        return contId === contactIdValue || contId?.toString() === contactIdValue?.toString();
      });

  const StatusIcon = statusConfig[salesOrder.status as keyof typeof statusConfig]?.icon || Clock;
  const statusColor = statusConfig[salesOrder.status as keyof typeof statusConfig]?.color || "bg-gray-100 text-gray-800";



  return (
    <Page
     className="px-4"
      removeBackground
      header={
        <PageHeader
          title={
            <div className="flex items-center gap-2">
              {salesOrder.orderNumber}
              <div className="flex items-center">
                <StatusIcon className="h-4 w-4" />
                <Badge className={statusColor}>
                  {salesOrder.status?.charAt(0).toUpperCase() +
                    salesOrder.status?.slice(1)}
                </Badge>
              </div>
            </div>
          }
          actions={[
             <IconButton
              icon={Edit}
              onClick={() => redirect.to(`${ROUTE_PATH.SALES_ORDER}/${salesOrder._id}/edit`)}
              variant="outline"
            >
              Edit
            </IconButton>,
            <IconButton
              icon={FileText}
              onClick={() => redirect.to(`${ROUTE_PATH.INVOICE}/new?salesOrderId=${salesOrder._id}`)}
              variant="outline"
            >
              Invoice
            </IconButton>,
            <IconButton
              icon={Download}
              onClick={() => {
                /* Handle download */
              }}
              variant="outline"
            >
              Download
            </IconButton>,
            <CloseButton onClose={() => {}} entity={ENTITY.SALES_ORDER} />
          ]}
        />
      }
    >
      <div className="space-y-6">
       

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Order Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Order Number
                    </label>
                    <p className="text-sm text-gray-900">
                      {salesOrder.orderNumber}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      OEM
                    </label>
                    <p className="text-sm text-gray-900">
                      {salesOrder.oem || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Order Date
                    </label>
                    <p className="text-sm text-gray-900">
                      {salesOrder.orderDate
                        ? formatDate(salesOrder.orderDate, "DD-MM-YYYY")
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Expected Delivery
                    </label>
                    <p className="text-sm text-gray-900">
                      {salesOrder.expectedDeliveryDate
                        ? formatDate(
                            salesOrder.expectedDeliveryDate,
                            "DD-MM-YYYY"
                          )
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Quotation Reference
                    </label>
                    <p className="text-sm text-gray-900">
                      {typeof salesOrder.quotationId === 'object' 
                        ? salesOrder.quotationId?.quotationNumber || salesOrder.quotationId?._id || salesOrder.quotationId?.id || "N/A"
                        : salesOrder.quotationId || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Opportunity
                    </label>
                    <p className="text-sm text-gray-900">
                      {typeof salesOrder.opportunityId === 'object'
                        ? salesOrder.opportunityId?.name || salesOrder.opportunityId?._id || salesOrder.opportunityId?.id || "N/A"
                        : salesOrder.opportunityId || "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account & Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5" />
                  <span>Account & Contact</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Account Details
                    </h4>
                    <div className="space-y-2">
                      <div>
                      <label className="text-sm font-medium text-gray-500">
                        Company Name
                      </label>
                      <p className="text-sm font-medium">
                        {account?.companyName || "N/A"}
                      </p>
                      </div>
                      <div>
                      <label className="text-sm font-medium text-gray-500">
                        Industry
                      </label>
                      <p className="text-sm text-gray-600">
                        {account?.industry || "N/A"}
                      </p>
                      </div>
                      <div>
                      <label className="text-sm font-medium text-gray-500">
                        Website
                      </label>
                      <p className="text-sm text-gray-600">
                        {account?.website || "N/A"}
                      </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Primary Contact
                    </h4>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {contact 
                          ? (contact.name || formatName(contact as { firstName?: string; lastName?: string }) || (contact.firstName && contact.lastName ? `${contact.firstName} ${contact.lastName}` : contact.firstName || contact.lastName) || "N/A")
                          : "N/A"}
                      </p>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span>{contact?.phone || contact?.contactMobile || "N/A"}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span>{contact?.email || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {(salesOrder.contact || salesOrder.crm) && (
                  <>
                    <Separator className="my-4" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {salesOrder.contact && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Contact Info
                          </label>
                          <p className="text-sm text-gray-900">
                            {salesOrder.contact}
                          </p>
                        </div>
                      )}
                      {salesOrder.crm && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            CRM Reference
                          </label>
                          <p className="text-sm text-gray-900">
                            {salesOrder.crm}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Shipping & Financial */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Truck className="h-5 w-5" />
                  <span>Shipping & Financial</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Shipping Method
                    </label>
                    <p className="text-sm text-gray-900">
                      {salesOrder.shippingMethod || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Freight Terms
                    </label>
                    <p className="text-sm text-gray-900">
                      {salesOrder.freightTerms || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Currency
                    </label>
                    <p className="text-sm text-gray-900">
                      {salesOrder.quoteCurrency || "INR"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Exchange Rate
                    </label>
                    <p className="text-sm text-gray-900">
                      {salesOrder.currencyRate || 1.0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Terms & Conditions */}
            {salesOrder.terms && (
              <Card>
                <CardHeader>
                  <CardTitle>Terms & Conditions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {salesOrder.terms.paymentTerms && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Payment Terms
                        </label>
                        <p className="text-sm text-gray-900 mt-1">
                          {salesOrder.terms.paymentTerms}
                        </p>
                      </div>
                    )}
                    {salesOrder.terms.prices && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Price Terms
                        </label>
                        <p className="text-sm text-gray-900 mt-1">
                          {salesOrder.terms.prices}
                        </p>
                      </div>
                    )}
                    {salesOrder.terms.boq && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          BOQ
                        </label>
                        <p className="text-sm text-gray-900 mt-1">
                          {salesOrder.terms.boq}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Additional Information */}
            {(salesOrder.renewalTerm || salesOrder.notes) && (
              <Card>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {salesOrder.renewalTerm && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Renewal Term
                        </label>
                        <p className="text-sm text-gray-900 mt-1">
                          {salesOrder.renewalTerm}
                        </p>
                      </div>
                    )}
                    {salesOrder.notes && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Notes
                        </label>
                        <p className="text-sm text-gray-900 mt-1">
                          {salesOrder.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            <SalesOrderTotals salesOrder={salesOrder} />

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <button className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    <FileText className="h-4 w-4" />
                    <span>Generate Invoice</span>
                  </button>
                  <button className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    <Send className="h-4 w-4" />
                    <span>Send Email</span>
                  </button>
                  <button className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    <Download className="h-4 w-4" />
                    <span>Export PDF</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Order Items ({salesOrder.items?.length || 0})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SalesOrderItemsView
              items={(salesOrder.items || []).map((item) => ({
                ...item,
                sku: item.sku || "",
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}

export default SalesOrderViewPage;