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
  TextAreaField,
  ReusableForm,
  FormActions,
  DatePickerField,
} from "@/components/common/form-elements";

// Form and Validation
import InvoiceFormSchema, { type InvoiceFormValues } from "../zodSchema";
import { defaultInvoice } from "../testData";
import InvoiceItemsForm from "./InvoiceItemsForm";

// Hooks
import useFormMode from "@/hooks/useFormMode";
import useMutationWithActivityLog, {
  LogDetails,
} from "@/hooks/useMutationWithActivityLog";
import {
  useInvoices,
  useCreateInvoice,
  useUpdateInvoiceOptimistic,
  useSuspenseInvoice,
} from "@/queries/InvoiceQueries";
import { toast } from "@/hooks/useToast";
import { useSelectedOrg } from "@/store/org-store";

// Constants and Utilities
import { ACTION, ENTITY } from "@/constants";
import { formatCurrency } from "@/utils/format";

// Types
import { FormCallbacks } from "@/types/common";
import SalesOrderSelectorField from "@/components/common/SalesOrderSelect";
import SysConfigDropdownField from "@/components/common/SysConfigDropdown";
import { useSearchParams } from "react-router-dom";
import { useSuspenseSalesOrder } from "@/queries/SalesOrderQueries";

// Define the InvoiceFormValues interface to match the form structure

export const calculateTotals = (
  items: Array<{
    quantity: string | number;
    unitPrice: string | number;
    gst: string | number;
  }>,
  discounts: number = 0,
  freightCharges: number = 0
) => {
  const totals = items.reduce(
    (acc, item) => {
      const quantity =
        typeof item.quantity === "string"
          ? parseFloat(item.quantity)
          : item.quantity;
      const unitPrice =
        typeof item.unitPrice === "string"
          ? parseFloat(item.unitPrice)
          : item.unitPrice;
      const gst =
        typeof item.gst === "string" ? parseFloat(item.gst) : item.gst;

      const subtotal = quantity * unitPrice;
      const gstAmount = subtotal * (gst / 100);

      return {
        subtotal: acc.subtotal + subtotal,
        totalGST: acc.totalGST + gstAmount,
      };
    },
    { subtotal: 0, totalGST: 0 }
  );

  const totalDue =
    totals.subtotal + totals.totalGST - discounts + freightCharges;

  return {
    ...totals,
    totalDue,
  };
};

function InvoiceFormFields() {
  const [searchParams] = useSearchParams();
  const salesOrderIdParam = searchParams.get("salesOrderId");
  const { data: salesOrder, isPending: isSalesOrderPending } = useSuspenseSalesOrder(
    salesOrderIdParam || ""
  );

  const { control, watch, setError, clearErrors, formState, setValue } =
    useFormContext();
  const { data: existingInvoiceOrders } = useInvoices();
  const items = watch("items") || [];
  const discounts = parseFloat(watch("discounts") || 0);
  const freightCharges = parseFloat(watch("freightCharges") || 0);

  const { subtotal, totalGST, totalDue } = calculateTotals(
    items,
    discounts,
    freightCharges
  );
  const invoiceNumber = watch("invoiceNumber");
  const { dirtyFields } = formState;

  useEffect(() => {
    if (!invoiceNumber) return;

    const list = Array.isArray(existingInvoiceOrders) ? existingInvoiceOrders : [];
    if (list.length === 0) return;

    const found = list.find(
      (order) => order.invoiceNumber === invoiceNumber
    );

    if (found && dirtyFields?.invoiceNumber) {
      setError("invoiceNumber", {
        type: "custom",
        message: "Invoice number already exists",
      });
    } else {
      clearErrors("invoiceNumber");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceNumber, existingInvoiceOrders, dirtyFields]);

  useEffect(() => {
    // If salesOrderId is provided in search params, set it in the form
    if (salesOrder && !isSalesOrderPending) {
      // Set the salesOrderId in the form
      setValue("salesOrderId", salesOrder._id || "");
      setValue("accountId", salesOrder.accountId?._id || "");
      setValue("items", salesOrder.items || []);
      // Populate OEM from sales order if available
      if (salesOrder.oem) {
        setValue("oem", salesOrder.oem);
      }
    }
  }, [salesOrder, isSalesOrderPending, setValue]);

  return (
    <>
      {/* Header Information */}
      <FormSection>
        <FormGroup>
          <InputField
            control={control}
            label="Invoice Number"
            name="invoiceNumber"
            required
            placeholder="Enter invoice number"
          />
          <SalesOrderSelectorField
            control={control}
            label="Sales Order ID"
            name="salesOrderId"
            placeholder="Enter Sales Order ID"
          />
        </FormGroup>
        <FormGroup>
          <AccountSelectorField
            label="Account"
            name="accountId"
            control={control}
            required
            placeholder="Select Account"
          />
          <SysConfigDropdownField
            label="Status"
            name="status"
            placeholder="Select Status"
            category="invoice_status"
            control={control}
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
        </FormGroup>
        <FormGroup>
          <DatePickerField
            label="Issue Date"
            name="issueDate"
            control={control}
            required
          />
          <DatePickerField
            label="Due Date"
            name="dueDate"
            control={control}
            required
          />
        </FormGroup>
      </FormSection>
      {/* Items */}
      <FormSection title="Order Products">
        <InvoiceItemsForm />
      </FormSection>

      {/* Totals Section */}
      <FormSection>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                Subtotal
              </span>
              <span className="text-sm text-gray-900">
                {formatCurrency(subtotal)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                Tax Amount
              </span>
              <span className="text-sm text-gray-900">
                {formatCurrency(totalGST)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                Total Amount
              </span>
              <span className="text-sm text-gray-900">
                {formatCurrency(totalDue)}
              </span>
            </div>
          </div>
        </div>
      </FormSection>

      {/* Notes and Payment Terms */}
      <FormSection>
        <FormGroup>
          <TextAreaField
            label="Notes"
            name="notes"
            control={control}
            placeholder="Enter any notes..."
          />
          <TextAreaField
            label="Payment Terms"
            name="paymentTerms"
            control={control}
            placeholder="Enter payment terms..."
          />
        </FormGroup>
      </FormSection>
    </>
  );
}

function InvoiceForm({
  onClose = () => {},
  onSuccess = () => {},
}: FormCallbacks) {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const createInvoiceOrderMutation = useCreateInvoice();
  const updateInvoiceOrderMutation = useUpdateInvoiceOptimistic();

  const { formMode, isEditAction } = useFormMode();

  const { data: invoiceOrder, isLoading } = useSuspenseInvoice(invoiceId ?? "");

  // Convert invoiceOrder data to match InvoiceFormValues structure
  const prefillInvoiceOrder = useMemo(() => {
    return !isLoading && invoiceOrder
      ? {
          ...invoiceOrder,
          salesOrderId: invoiceOrder.salesOrderId?._id || "",
          accountId: invoiceOrder.accountId?._id || "",
          issueDate: invoiceOrder?.issueDate
            ? new Date(invoiceOrder.issueDate)
            : undefined,
          dueDate: invoiceOrder?.dueDate
            ? new Date(invoiceOrder.dueDate)
            : undefined,
          paymentHistory: invoiceOrder?.paymentHistory?.map((record) => ({
            ...record,
            date: record.date ? new Date(record.date) : undefined,
          })),
        }
      : undefined;
  }, [isLoading, invoiceOrder]);

  const mutationFn =
    formMode === ACTION.MODIFY
      ? updateInvoiceOrderMutation
      : createInvoiceOrderMutation;
  const titleMode = formMode === ACTION.MODIFY ? "Update" : "Create";

  const logDetails = {
    action: formMode === ACTION.MODIFY ? ACTION.MODIFY : ACTION.CREATE,
    entityType: ENTITY.INVOICE,
    oldData: invoiceOrder
      ? {
          ...invoiceOrder,
          issueDate: invoiceOrder.issueDate
            ? new Date(invoiceOrder.issueDate)
            : undefined,
          dueDate: invoiceOrder.dueDate
            ? new Date(invoiceOrder.dueDate)
            : undefined,
          paymentHistory: invoiceOrder.paymentHistory?.map((record) => ({
            ...record,
            date: record.date ? new Date(record.date) : undefined,
          })),
        }
      : undefined,
  };

  const selectedOrg = useSelectedOrg();

  const normalizeId = (value: any) =>
    typeof value === "object" && value
      ? (value as any)._id || (value as any).id || (value as any).value
      : value;

  const { mutateWithActivityLog } = useMutationWithActivityLog<
    InvoiceFormValues,
    LogDetails<InvoiceFormValues>
  >({
    mainMutation: async (data: InvoiceFormValues) => {
      // Convert form data to match the API expected format
      const mutationData = {
        ...data,
        // Ensure ids are strings
        accountId: normalizeId(data.accountId),
        salesOrderId: normalizeId(data.salesOrderId),
        ...(isEditAction && invoiceOrder ? { id: invoiceOrder._id } : {}),
      };
      
      // For create operations, pass params with entityId
      if (formMode === ACTION.CREATE) {
        const params = selectedOrg ? { entityId: selectedOrg } : undefined;
        // useCreateEntity expects { data, params } format
        const result = await mutationFn.mutateAsync({ data: mutationData, params });
        return {
          ...result,
          issueDate: result.issueDate ? new Date(result.issueDate) : undefined,
          dueDate: result.dueDate ? new Date(result.dueDate) : undefined,
          paymentHistory: result.paymentHistory?.map((record) => ({
            ...record,
            date: record.date ? new Date(record.date) : undefined,
          })),
        };
      }
      
      // For update operations, useUpdateEntityOptimistic expects { data, params }
      const result = await mutationFn.mutateAsync({
        data: mutationData,
        params: selectedOrg ? { entityId: selectedOrg } : undefined,
      });

      // Ensure issueDate, dueDate, and paymentHistory.date are converted to Date
      return {
        ...result,
        issueDate: result.issueDate ? new Date(result.issueDate) : undefined,
        dueDate: result.dueDate ? new Date(result.dueDate) : undefined,
        paymentHistory: result.paymentHistory?.map((record) => ({
          ...record,
          date: record.date ? new Date(record.date) : undefined,
        })),
      };
    },
    logDetails,
    onSuccess: () => {
      toast({
        title: `${titleMode} Invoice Order`,
        description: `Invoice Order has been ${titleMode.toLowerCase()}d successfully`,
      });
      onSuccess();
    },
    onError: (error) => {
      console.error("Error creating/updating invoice order:", error);
      toast({
        title: `Error`,
        description: `An error occurred while ${titleMode.toLowerCase()}ing the invoice order`,
        variant: "destructive",
      });
    },
  });

  const createInvoice = async (data) => {
    try {
      await mutateWithActivityLog(data);
    } catch (err) {
      console.error("Error in form submission:", err);
    }
  };

  return (
    <div className="space-y-4">
      <ReusableForm
        zodSchema={InvoiceFormSchema}
        defaultValues={defaultInvoice}
        prefillData={prefillInvoiceOrder}
        onSubmit={createInvoice}
        renderActions={() => (
          <FormActions>
            <CloseButton onClose={onClose} entity={ENTITY.INVOICE} />
            <SubmitButton
              entity={ENTITY.INVOICE}
              loading={
                createInvoiceOrderMutation.isPending ||
                updateInvoiceOrderMutation.isPending
              }
            />
          </FormActions>
        )}
      >
        <InvoiceFormFields />
      </ReusableForm>
    </div>
  );
}

export default InvoiceForm;
