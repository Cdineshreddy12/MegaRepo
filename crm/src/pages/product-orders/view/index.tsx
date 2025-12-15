import { useParams } from "react-router-dom";
import { CalendarDays, Package, Truck, FileText, Info } from "lucide-react";
import Page, { PageHeader } from "@/components/Page";
import Loader from "@/components/common/Loader";
import { Section } from "@/components/Section";
import { InfoCard } from "@/components/Cards";
import { useProductOrder } from "@/queries/ProductOrderQueries";
import { ROUTE_PATH } from "@/constants";
import LinkButton from "@/components/LinkButton";
import { formatCurrency } from "@/utils/format";

const rootPath = ROUTE_PATH.PRODUCT_ORDER;

const ProductOrderViewPage = () => {
  const { productOrderId } = useParams();

  if (!productOrderId || productOrderId === "undefined" || productOrderId === "null") {
    return <Loader />;
  }

  const { data, isPending } = useProductOrder(productOrderId);
  const order: any = data || {};

  if (isPending) return <Loader />;

  const accountName =
    order.accountId?.companyName ||
    order.accountId?.name ||
    order.accountName ||
    order.accountId ||
    "N/A";
  const contactName =
    order.primaryContactId?.name ||
    [order.primaryContactId?.firstName, order.primaryContactId?.lastName]
      .filter(Boolean)
      .join(" ") ||
    order.primaryContactName ||
    "N/A";
  const opportunityName = order.opportunityId?.name || order.opportunityName || "N/A";
  const quotationRef =
    order.quotationId?.quotationNumber ||
    order.quotationNumber ||
    order.quotationId ||
    "N/A";

  return (
    <Page
      header={
        <PageHeader
          title="Product Order"
          actions={[
            <LinkButton key="back" variant="outline" to={rootPath}>
              Back
            </LinkButton>,
            <LinkButton key="edit" to={`${rootPath}/${productOrderId}/edit`}>
              Edit
            </LinkButton>,
          ]}
        />
      }
    >
      <Section title="Order Details" icon={Package}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard label="Order Number" value={order.orderNumber || "N/A"} />
          <InfoCard label="Status" value={order.status || "N/A"} />
          <InfoCard label="OEM" value={order.oem || order.vendor || "N/A"} />
          <InfoCard label="Account" value={accountName} />
          <InfoCard label="Primary Contact" value={contactName} />
          <InfoCard label="Opportunity" value={opportunityName} />
          <InfoCard label="Quotation" value={quotationRef} />
        </div>
      </Section>

      <Section title="Dates & Shipping" icon={CalendarDays}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard
            label="Order Date"
            value={order.orderDate ? new Date(order.orderDate).toDateString() : "N/A"}
          />
          <InfoCard
            label="Delivery Date"
            value={order.deliveryDate ? new Date(order.deliveryDate).toDateString() : "N/A"}
          />
          <InfoCard
            label="Expected Delivery Date"
            value={
              order.expectedDeliveryDate
                ? new Date(order.expectedDeliveryDate).toDateString()
                : "N/A"
            }
          />
          <InfoCard
            label="Shipping Method"
            value={order.shippingMethod || order.shipping || "N/A"}
          />
          <InfoCard label="Freight Terms" value={order.freightTerms || order.freight || "N/A"} />
        </div>
      </Section>

      <Section title="Financials" icon={Info}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard label="Currency" value={order.quoteCurrency || order.currency || "N/A"} />
          <InfoCard label="Currency Rate" value={order.currencyRate ?? "N/A"} />
          <InfoCard
            label="Subtotal"
            value={order.subtotal !== undefined ? formatCurrency(order.subtotal) : "N/A"}
          />
          <InfoCard
            label="GST Total"
            value={order.gstTotal !== undefined ? formatCurrency(order.gstTotal) : "N/A"}
          />
          <InfoCard
            label="Freight Charges"
            value={
              order.freightCharges !== undefined ? formatCurrency(order.freightCharges) : "N/A"
            }
          />
          <InfoCard
            label="Total"
            value={order.total !== undefined ? formatCurrency(order.total) : "N/A"}
          />
        </div>
      </Section>

      <Section title="Items" icon={Truck}>
        <div className="space-y-2">
          {(order.items || []).length === 0 ? (
            <p className="text-gray-600">No items</p>
          ) : (
            <div className="overflow-x-auto border rounded-md">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">SKU</th>
                    <th className="px-3 py-2 text-left">Description</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Unit Price</th>
                    <th className="px-3 py-2 text-right">GST</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items || []).map((item: any, idx: number) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2">{item.type || "product"}</td>
                      <td className="px-3 py-2">{item.status || "N/A"}</td>
                      <td className="px-3 py-2">{item.sku || item.productId || "N/A"}</td>
                      <td className="px-3 py-2">{item.description || "N/A"}</td>
                      <td className="px-3 py-2 text-right">{item.quantity ?? "-"}</td>
                      <td className="px-3 py-2 text-right">
                        {item.unitPrice !== undefined ? formatCurrency(item.unitPrice) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right">{item.gst ?? item.taxRate ?? "-"}</td>
                      <td className="px-3 py-2 text-right">
                        {item.total !== undefined ? formatCurrency(item.total) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Section>

      <Section title="Notes & Terms" icon={FileText}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoCard label="Notes" value={order.notes || "N/A"} />
          <InfoCard
            label="Payment Terms"
            value={order.paymentTerms || order.terms?.paymentTerms || "N/A"}
          />
          <InfoCard label="Price Terms" value={order.priceTerms || order.terms?.prices || "N/A"} />
          <InfoCard label="BOQ" value={order.boq || order.terms?.boq || "N/A"} />
        </div>
      </Section>
    </Page>
  );
};

export default ProductOrderViewPage;
