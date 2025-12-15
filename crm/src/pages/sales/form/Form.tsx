// React and React-related imports
import { useEffect, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { useParams } from "react-router-dom";

// Common Components
import AccountSelectorField from "@/components/common/AccountSelector";
import CloseButton from "@/components/common/CloseButton";
import SubmitButton from "@/components/common/SubmitButton";
import {
  FormSection,
  FormGroup,
  InputField,
  SelectField,
  TextAreaField,
  ReusableForm,
  FormActions,
  DatePickerField,
} from "@/components/common/form-elements";

// Form and Validation
import SalesOrderFormSchema, { SalesOrderFormValues } from "../zodSchema";
import { defaultSalesOrder } from "../testData";
import SalesOrderItemsForm from "./SalesOrderItemsForm";

// Hooks
import useFormMode from "@/hooks/useFormMode";
import {
  useSalesOrders,
  useCreateSalesOrder,
  useUpdateSalesOrderOptimistic,
  useSalesOrder,
  useSuspenseSalesOrder,
} from "@/queries/SalesOrderQueries";

// Constants and Utilities
import { ACTION, ENTITY } from "@/constants";
import { formatCurrency } from "@/utils/format";
import { shippingMethodOptions } from "../testData";

// Types
import { FormCallbacks } from "@/types/common";
import ContactSelectorField from "@/components/common/ContactSelector";
import SysConfigDropdownField from "@/components/common/SysConfigDropdown";

import { toast } from "@/hooks/useToast";
import { AxiosError } from "axios";
import OpportunitySelectorField from "@/components/common/OpportunitySelector";
import QuotationSelectorField from "@/components/common/QuotationSelector";

// Updated calculate totals to match schema structure (gst as percentage)
export const calculateTotals = (
  items: Array<{
    quantity: string | number;
    unitPrice: string | number;
    gst: string | number; // GST percentage
  }>
) => {
  const totals = items.reduce(
    (acc, item) => {
      const quantity =
        typeof item.quantity === "string"
          ? parseFloat(item.quantity) || 0
          : item.quantity || 0;
      const unitPrice =
        typeof item.unitPrice === "string"
          ? parseFloat(item.unitPrice) || 0
          : item.unitPrice || 0;
      const gstPercentage =
        typeof item.gst === "string"
          ? parseFloat(item.gst) || 0
          : item.gst || 0;

      const subtotal = quantity * unitPrice;
      const gstAmount = subtotal * (gstPercentage / 100); // Calculate GST as percentage
      const total = subtotal + gstAmount;

      return {
        subtotal: acc.subtotal + subtotal,
        gstTotal: acc.gstTotal + gstAmount, // Total GST amount
        total: acc.total + total,
      };
    },
    { subtotal: 0, gstTotal: 0, total: 0 }
  );

  return totals;
};

function SalesOrderFormFields() {
  const { control, watch, setError, clearErrors, formState } = useFormContext();
  const { data: existingSalesOrders } = useSalesOrders();

  console.log(formState.errors);
  const items = watch("items") || [];
  const freightCharges = parseFloat(watch("freightCharges") || 0);

  const { total, subtotal, gstTotal } = calculateTotals(items);
  const totalDue = total + freightCharges;

  const orderNumber = watch("orderNumber");
  const selectedAccountId = watch("accountId");
  const { dirtyFields } = formState;

  useEffect(() => {
    if (!orderNumber) return;

    const list = Array.isArray(existingSalesOrders) ? existingSalesOrders : [];
    if (list.length === 0) return;

    const found = list.find((order) => order.orderNumber === orderNumber);

    if (found && dirtyFields?.orderNumber) {
      setError("orderNumber", {
        type: "custom",
        message: "Sales order number already exists",
      });
    } else {
      clearErrors("orderNumber");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber, existingSalesOrders, dirtyFields]);

  return (
    <>
      {/* Basic Information */}
      <FormSection title="Sales Order Details">
        <FormGroup>
          <InputField
            control={control}
            label="Sales Order Number"
            name="orderNumber"
            required
            placeholder="SO-2024-001"
          />
          <SysConfigDropdownField
            label="Status"
            name="status"
            placeholder="Select Status"
            category="sales_order_status"
            control={control}
          />
        </FormGroup>
        <FormGroup>
          <AccountSelectorField name="accountId" control={control} required />
          <ContactSelectorField
            name="primaryContactId"
            control={control}
            required
            filter={(contact) => {
              // If no account is selected, show all contacts
              if (!selectedAccountId) {
                return true;
              }
              
              // Extract accountId from contact (handle both object and string formats)
              const contactAccountId = typeof contact?.accountId === 'object' 
                ? contact?.accountId?._id || contact?.accountId?.id
                : contact?.accountId;
              
              // Compare account IDs (handle both ObjectId and string formats)
              const matches = contactAccountId === selectedAccountId || 
                             contactAccountId?.toString() === selectedAccountId?.toString();
              
              return matches;
            }}
            helperText={
              !selectedAccountId
                ? "Select an account to filter contacts"
                : "Select primary contact for this order"
            }
          />
        </FormGroup>
        <FormGroup>
          <SysConfigDropdownField
            control={control}
            label="OEM"
            name="oem"
            required
            placeholder="Enter OEM"
            category="oem_vendors"
          />
          <OpportunitySelectorField
            control={control}
            label="Opportunity"
            name="opportunityId"
            placeholder="Select Opportunity"
          />
        </FormGroup>
        <FormGroup>
          <QuotationSelectorField
            control={control}
            label="Quotation Reference"
            name="quotationId"
            placeholder="Link to quotation"
          />
        </FormGroup>
      </FormSection>

      {/* Contact and CRM Information */}
      <FormSection title="Contact & CRM Details">
        <FormGroup>
          <InputField
            control={control}
            label="Contact"
            name="contact"
            placeholder="Contact information"
          />
          <InputField
            control={control}
            label="CRM Reference"
            name="crm"
            placeholder="CRM reference"
          />
        </FormGroup>
      </FormSection>

      {/* Dates and Shipping */}
      <FormSection title="Dates & Shipping">
        <FormGroup>
          <DatePickerField
            label="Order Date"
            name="orderDate"
            control={control}
            required
          />
          <DatePickerField
            label="Delivery Date"
            name="deliveryDate"
            control={control}
          />
        </FormGroup>
        <FormGroup>
          <DatePickerField
            label="Expected Delivery Date"
            name="expectedDeliveryDate"
            control={control}
          />
          <SelectField
            label="Shipping Method"
            name="shippingMethod"
            control={control}
            placeholder="Select shipping method"
            options={shippingMethodOptions}
          />
        </FormGroup>
        <FormGroup>
          <InputField
            control={control}
            label="Freight Terms"
            name="freightTerms"
            placeholder="Enter freight terms"
          />
        </FormGroup>
      </FormSection>

      {/* Currency and Financial Information */}
      <FormSection title="Currency & Financial">
        <FormGroup>
          <SysConfigDropdownField
            label="Quote Currency"
            name="quoteCurrency"
            control={control}
            placeholder="Select currency"
            category="currencies"
          />
          <InputField
            control={control}
            label="Currency Rate"
            name="currencyRate"
            type="number"
            step="0.01"
            placeholder="1.00"
          />
        </FormGroup>
        <FormGroup>
          <InputField
            control={control}
            label="Freight Charges"
            name="freightCharges"
            type="number"
            step="0.01"
            placeholder="0.00"
            prefix="₹"
          />
        </FormGroup>
      </FormSection>

      {/* Items */}
      <FormSection
        title="Order Products"
        description={
          formState.errors.items?.message
            ? (formState.errors.items.message as string)
            : "Add products to the order"
        }
        required
        isError={!!formState.errors.items}
      >
        <SalesOrderItemsForm />
      </FormSection>

      {/* Totals */}
      <FormSection>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">Subtotal</span>
                <span className="text-gray-900">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">GST Total</span>
                <span className="text-gray-900">
                  {formatCurrency(gstTotal)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">
                  Freight Charges
                </span>
                <span className="text-gray-900">
                  {formatCurrency(freightCharges)}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between">
                <span className="font-medium text-gray-900">Total Due</span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(totalDue)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </FormSection>

      {/* Terms */}
      <FormSection title="Terms & Conditions">
        <FormGroup>
          <TextAreaField
            label="Payment Terms"
            name="terms.paymentTerms"
            control={control}
            placeholder="Enter payment terms..."
          />
          <TextAreaField
            label="Price Terms"
            name="terms.prices"
            control={control}
            placeholder="Enter price terms..."
          />
        </FormGroup>
        <FormGroup>
          <TextAreaField
            label="BOQ"
            name="terms.boq"
            control={control}
            placeholder="Enter BOQ details..."
          />
        </FormGroup>
      </FormSection>

      {/* Additional Information */}
      <FormSection title="Additional Information">
        <FormGroup>
          <InputField
            control={control}
            label="Renewal Term"
            name="renewalTerm"
            placeholder="Enter renewal term"
          />
          <TextAreaField
            label="Notes"
            name="notes"
            control={control}
            placeholder="Additional notes..."
          />
        </FormGroup>
      </FormSection>
    </>
  );
}

function SalesOrderForm({
  onClose = () => {},
  onSuccess = () => {},
}: FormCallbacks) {
  const { salesOrderId } = useParams<{ salesOrderId: string }>();
  const { formMode, isEditAction } = useFormMode();

  const createSalesOrderMutation = useCreateSalesOrder();
  const updateSalesOrderMutation = useUpdateSalesOrderOptimistic();

  const { data: salesOrder, isLoading } = useSuspenseSalesOrder(
    salesOrderId ?? ""
  );

  // Transform salesOrder data to ensure proper format
  const normalizeId = (value: any) =>
    typeof value === "object" && value
      ? (value as any)._id || (value as any).id || (value as any).value
      : value;

  const prefillSalesOrder =
    !isLoading && salesOrder && isEditAction
      ? {
          ...salesOrder,
          accountId: normalizeId(salesOrder.accountId) || "",
          primaryContactId: normalizeId(salesOrder.primaryContactId) || "",
          opportunityId: normalizeId(salesOrder.opportunityId) || "",
          quotationId: normalizeId(salesOrder.quotationId) || "",
          // Ensure date fields are properly formatted
          orderDate: salesOrder.orderDate
            ? new Date(salesOrder.orderDate).toISOString().split("T")[0]
            : "",
          deliveryDate: salesOrder.deliveryDate
            ? new Date(salesOrder.deliveryDate).toISOString().split("T")[0]
            : "",
          expectedDeliveryDate: salesOrder.expectedDeliveryDate
            ? new Date(salesOrder.expectedDeliveryDate)
                .toISOString()
                .split("T")[0]
            : "",
        }
      : undefined;

  const titleMode = formMode === ACTION.MODIFY ? "Update" : "Create";

  const handleMutation = async (formValues: SalesOrderFormValues) => {
    const normalizedAccountId = normalizeId(formValues.accountId);
    const normalizedPrimaryContactId = normalizeId(formValues.primaryContactId);
    const normalizedOpportunityId = normalizeId(formValues.opportunityId);
    const normalizedQuotationId = normalizeId(formValues.quotationId);

    if (isEditAction) {
      // For updates, pass data directly (update mutation expects the entity object)
      return updateSalesOrderMutation.mutateAsync({
        data: {
          ...formValues,
          id: salesOrder?._id,
          accountId: normalizedAccountId,
          primaryContactId: normalizedPrimaryContactId,
          opportunityId: normalizedOpportunityId,
          quotationId: normalizedQuotationId,
        },
        params: {},
      });
    }

    // For creates, wrap data in { data, params } object (create mutation expects this format)
    const formattedData = {
      ...formValues,
      accountId: normalizedAccountId,
      primaryContactId: normalizedPrimaryContactId,
      opportunityId: normalizedOpportunityId,
      quotationId: normalizedQuotationId,
    };

    return createSalesOrderMutation.mutateAsync({
      data: formattedData,
      params: undefined // Sales orders don't use entityId params currently
    });
  };

  const createSalesOrder = async (formValues: SalesOrderFormValues) => {
    try {
      await handleMutation(formValues);
      toast({
        title: `${titleMode} Sales Order`,
        description: `Sales Order has been ${titleMode}d successfully`,
      });
      onSuccess();
    } catch (error) {
      console.error("Error in mutation:", error);
      const errorMessage =
        (error as AxiosError)?.response?.data?.message ||
        (error as Error)?.message ||
        `Failed to ${titleMode} Sales Order`;

      toast({
        title: `${titleMode} Sales Order`,
        description: errorMessage,
      });
      throw error;
    }
  };

  return (
    <div className="space-y-4">
      <ReusableForm<SalesOrderFormValues>
        zodSchema={SalesOrderFormSchema}
        defaultValues={defaultSalesOrder}
        prefillData={prefillSalesOrder}
        onSubmit={createSalesOrder}
        renderActions={() => (
          <FormActions>
            <CloseButton onClose={onClose} entity={ENTITY.SALES_ORDER} />
            <SubmitButton
              entity={ENTITY.SALES_ORDER}
              loading={
                createSalesOrderMutation.isPending ||
                updateSalesOrderMutation.isPending
              }
            />
          </FormActions>
        )}
      >
        <SalesOrderFormFields />
      </ReusableForm>
    </div>
  );
}

export default SalesOrderForm;
