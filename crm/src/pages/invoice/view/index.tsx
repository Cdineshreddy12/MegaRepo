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
  Building,
  Phone,
  Mail
} from "lucide-react";

// Hooks and Queries
import { useSuspenseInvoice } from "@/queries/InvoiceQueries";
import { useOrgAccounts } from "@/hooks/useOrgAwareQueries";
import { useOrgContacts } from "@/hooks/useOrgAwareQueries";

// Constants and Utilities
import { ENTITY, ROUTE_PATH } from "@/constants";
import { formatCurrency, formatDate, formatName } from "@/utils/format";
import { Invoice } from "@/services/api/invoiceService";
import Page, { PageHeader } from "@/components/Page";
import useRedirect from "@/hooks/useRedirect";

// Status configuration
const statusConfig = {
  draft: { color: "bg-gray-100 text-gray-800", icon: Clock },
  sent: { color: "bg-blue-100 text-blue-800", icon: Send },
  paid: { color: "bg-green-100 text-green-800", icon: CheckCircle },
  overdue: { color: "bg-red-100 text-red-800", icon: XCircle },
  cancelled: { color: "bg-gray-100 text-gray-800", icon: XCircle },
};

interface InvoiceItem {
  type: string;
  status: string;
  sku: string;
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  gst: number | string;
}

function InvoiceItemsView({ items }: { items: InvoiceItem[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No items in this invoice.
      </div>
    );
  }

  const calculateItemTotal = (item: InvoiceItem) => {
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

function InvoiceTotals({ invoice }: { invoice: Invoice }) {
  const subtotal = parseFloat(String(invoice.subtotal || 0));
  const taxAmount = parseFloat(String(invoice.taxAmount || 0));
  const totalAmount = parseFloat(String(invoice.totalAmount || 0));
  const amountPaid = parseFloat(String(invoice.amountPaid || 0));
  const balance = parseFloat(String(invoice.balance || 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Invoice Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Tax Amount</span>
            <span className="font-medium">{formatCurrency(taxAmount)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total Amount</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-gray-600">Amount Paid</span>
            <span className="font-medium text-green-600">{formatCurrency(amountPaid)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Balance</span>
            <span className={balance > 0 ? "text-red-600" : "text-green-600"}>
              {formatCurrency(balance)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InvoiceViewPage() {
  const redirect = useRedirect();
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const { data: invoice, isLoading: isInvoiceLoading } = useSuspenseInvoice(invoiceId ?? '');
  const { data: accounts } = useOrgAccounts();
  const { data: contacts } = useOrgContacts();

  if (isInvoiceLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Invoice not found</p>
        </div>
      </div>
    );
  }

  // Get account details - handle both object and string formats
  const accountIdValue = typeof invoice.accountId === 'object' 
    ? invoice.accountId?._id || invoice.accountId?.id 
    : invoice.accountId;
  const account = accounts?.find(acc => acc._id === accountIdValue || acc.id === accountIdValue);

  // Handle salesOrderId as both object and string
  const salesOrderIdValue = typeof invoice.salesOrderId === 'object'
    ? invoice.salesOrderId?._id || invoice.salesOrderId?.id
    : invoice.salesOrderId;

  const StatusIcon = statusConfig[invoice.status as keyof typeof statusConfig]?.icon || Clock;
  const statusColor = statusConfig[invoice.status as keyof typeof statusConfig]?.color || "bg-gray-100 text-gray-800";

  return (
    <Page
      className="px-4"
      removeBackground
      header={
        <PageHeader
          title={
            <div className="flex items-center gap-2">
              {invoice.invoiceNumber}
              <div className="flex items-center">
                <StatusIcon className="h-4 w-4" />
                <Badge className={statusColor}>
                  {invoice.status?.charAt(0).toUpperCase() +
                    invoice.status?.slice(1)}
                </Badge>
              </div>
            </div>
          }
          actions={[
            <IconButton
              key="edit"
              icon={Edit}
              onClick={() => redirect.to(`${ROUTE_PATH.INVOICE}/${invoice._id || invoice.id}/edit`)}
              variant="outline"
            >
              Edit
            </IconButton>,
            <IconButton
              key="download"
              icon={Download}
              onClick={() => {
                /* Handle download */
              }}
              variant="outline"
            >
              Download
            </IconButton>,
            <CloseButton onClose={() => {}} entity={ENTITY.INVOICE} />
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
                  <span>Invoice Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
                    <label className="text-sm font-medium text-gray-500">
                      Invoice Number
                    </label>
                    <p className="text-sm text-gray-900">
                      {invoice.invoiceNumber}
            </p>
          </div>
          <div>
                    <label className="text-sm font-medium text-gray-500">
                      Sales Order ID
                    </label>
                    <p className="text-sm text-gray-900">
                      {salesOrderIdValue || "N/A"}
                    </p>
            </div>
            <div>
                    <label className="text-sm font-medium text-gray-500">
                      OEM
                    </label>
                    <p className="text-sm text-gray-900">
                      {invoice.oem || "N/A"}
                    </p>
          </div>
          <div>
                    <label className="text-sm font-medium text-gray-500">
                      Issue Date
                    </label>
                    <p className="text-sm text-gray-900">
                      {invoice.issueDate
                        ? formatDate(invoice.issueDate, "DD-MM-YYYY")
                        : "N/A"}
            </p>
          </div>
          <div>
                    <label className="text-sm font-medium text-gray-500">
                      Due Date
                    </label>
                    <p className="text-sm text-gray-900">
                      {invoice.dueDate
                        ? formatDate(invoice.dueDate, "DD-MM-YYYY")
                        : "N/A"}
                    </p>
          </div>
        </div>
              </CardContent>
            </Card>

            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5" />
                  <span>Account Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
          <div>
                    <label className="text-sm font-medium text-gray-500">
                      Company Name
                    </label>
                    <p className="text-sm font-medium">
                      {account?.companyName || "N/A"}
                    </p>
          </div>
                  {account?.industry && (
            <div>
                      <label className="text-sm font-medium text-gray-500">
                        Industry
                      </label>
                      <p className="text-sm text-gray-600">
                        {account.industry}
                      </p>
            </div>
                  )}
                  {account?.website && (
            <div>
                      <label className="text-sm font-medium text-gray-500">
                        Website
                      </label>
                      <p className="text-sm text-gray-600">
                        {account.website}
                      </p>
            </div>
                  )}
            </div>
              </CardContent>
            </Card>

            {/* Payment Information */}
            {invoice.paymentTerms && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment Terms</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-900">
                    {invoice.paymentTerms}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {invoice.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-900">
                    {invoice.notes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            <InvoiceTotals invoice={invoice} />

            {/* Payment History */}
            {invoice.paymentHistory && invoice.paymentHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {invoice.paymentHistory.map((payment, index) => (
                      <div key={index} className="flex justify-between items-center border-b pb-2">
          <div>
                          <p className="text-sm font-medium">{formatCurrency(payment.amount)}</p>
                          <p className="text-xs text-gray-500">
                            {payment.date ? formatDate(payment.date, "DD-MM-YYYY") : "N/A"} - {payment.method || "N/A"}
            </p>
          </div>
                        {payment.reference && (
                          <p className="text-xs text-gray-500">{payment.reference}</p>
                        )}
                      </div>
                    ))}
        </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Invoice Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Invoice Items ({invoice.items?.length || 0})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InvoiceItemsView
              items={(invoice.items || []).map((item) => ({
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

export default InvoiceViewPage;
