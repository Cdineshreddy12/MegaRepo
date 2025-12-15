// React and React-related imports
import { useEffect } from "react";
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
  DatePickerField
} from "@/components/common/form-elements";

// Form and Validation
import ProductOrderFormSchema from "../zodSchema";
import { defaultProductOrder } from "../testData";
import ProductOrderItemsForm from "./ProductOrderItemsForm";

// Hooks
import useFormMode from "@/hooks/useFormMode";
import useMutationWithActivityLog, { LogDetails } from "@/hooks/useMutationWithActivityLog";
import {
  useProductOrders,
  useCreateProductOrder,
  useUpdateProductOrderOptimistic,
  useProductOrder,
} from "@/queries/ProductOrderQueries";
import { toast } from "@/hooks/useToast";

// Constants and Utilities
import { ACTION, ENTITY } from "@/constants";
import { formatCurrency } from "@/utils/format";
import { shippingMethodOptions, currencyOptions } from "../testData";

// Types
import { FormCallbacks } from "@/types/common";
import { ProductOrder } from "@/services/api/productOrderService";

// Define the ProductOrderFormValues interface to match the form structure
interface ProductOrderFormValues {
  id?: string;
  orderNumber?: string;
  srdar?: string;
  accountId?: string | { _id: string };
  contact?: string;
  status?: string;
  shippingMethod?: string;
  freightTerms?: string;
  currency?: string;
  exchangeRate?: string | number;
  expectedDeliveryDate?: string;
  items?: Array<{
    type?: string;
    status?: string;
    sku?: string;
    description?: string;
    quantity: string | number;
    unitPrice: string | number;
    gst: string | number;
  }>;
  paymentTerms?: string;
  priceTerms?: string;
  boq?: string;
  otherTerms?: string;
  freightCharges?: number;
  subtotal?: number;
  total?: number;
  gstTotal?: number;
}

export const calculateTotals = (items: Array<{
  quantity: string | number;
  unitPrice: string | number;
  gst: string | number;
}>) => {
  const totals = items.reduce((acc, item) => {
    const quantity = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;
    const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
    const gst = typeof item.gst === 'string' ? parseFloat(item.gst) : item.gst;
    
    const subtotal = quantity * unitPrice;
    const gstAmount = subtotal * (gst / 100);
    const total = subtotal + gstAmount;
    
    return {
      subtotal: acc.subtotal + subtotal,
      totalGST: acc.totalGST + gstAmount,
      total: acc.total + total
    };
  }, { subtotal: 0, totalGST: 0, total: 0 });
  
  return totals;
};

function ProductOrderFormFields() {
  const { control, watch, setError, clearErrors, formState } = useFormContext();
  const { data: existingProductOrders } = useProductOrders();
  const items = watch("items") || [];
  const freightCharges = parseFloat(watch("freightCharges") || 0);

  const { total, subtotal, totalGST } = calculateTotals(items);
  const totalAmount = total + freightCharges;
  const orderNumber = watch("orderNumber");
  const { dirtyFields } = formState;
  
  useEffect(() => {
    if (!existingProductOrders || !orderNumber) return;
    
    const found = existingProductOrders.find(
      (order) => order.orderNumber === orderNumber
    );
    
    if (found && dirtyFields?.orderNumber) {
      setError("orderNumber", {
        type: "custom",
        message: "Product order number already exists",
      });
    } else {
      clearErrors("orderNumber");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber, existingProductOrders, dirtyFields]);

  return (
    <>
      {/* Row 1: Order Number and Srdar */}
      <FormSection>
        <FormGroup>
          <InputField
            control={control}
            label="Order Number"
            name="orderNumber"
            required
            placeholder="Enter order number"
          />
          <InputField
            control={control}
            label="Srdar"
            name="srdar"
            placeholder="Enter Srdar"
          />
        </FormGroup>
      </FormSection>

      {/* Row 2: Account (full width) */}
      <FormSection>
        <FormGroup>
          <AccountSelectorField
            label="Account"
            name="accountId"
            control={control}
            required
          />
        </FormGroup>
      </FormSection>

      {/* Row 3: Contact and Expected Delivery Date */}
      <FormSection>
        <FormGroup>
          <SelectField
            label="Contact"
            name="contact"
            placeholder="Select Contact"
            control={control}
            options={[]} // You'll need to provide contact options
          />
          <DatePickerField
            label="Expected Delivery Date"
            name="expectedDeliveryDate"
            control={control}
            required
          />
        </FormGroup>
      </FormSection>

      {/* Row 4: Shipping Method and Freight Terms */}
      <FormSection>
        <FormGroup>
          <SelectField
            label="Shipping Method"
            name="shippingMethod"
            control={control}
            placeholder="Select shipping method"
            options={shippingMethodOptions}
            defaultValue="Courier"
          />
          <InputField
            control={control}
            label="Freight Terms"
            name="freightTerms"
            placeholder="Enter freight terms"
          />
        </FormGroup>
      </FormSection>

      {/* Row 5: Currency and Exchange Rate */}
      <FormSection>
        <FormGroup>
          <SelectField
            label="Currency"
            name="currency"
            control={control}
            placeholder="Select currency"
            options={currencyOptions}
          />
          <InputField
            control={control}
            label="Exchange Rate"
            name="exchangeRate"
            type="number"
            step="0.01"
            placeholder="Enter exchange rate"
          />
        </FormGroup>
      </FormSection>

      {/* Order Products */}
      <FormSection title="Order Products">
        <ProductOrderItemsForm />
      </FormSection>
      
      {/* Totals */}
      <FormSection>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-end">
            <div className="w-1/3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">Subtotal</span>
                <span className="text-gray-900">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">GST</span>
                <span className="text-gray-900">
                  {formatCurrency(totalGST)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">Freight Charges</span>
                <span className="text-gray-900">
                  {formatCurrency(freightCharges)}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between">
                <span className="font-bold text-gray-900">Total Amount</span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </FormSection>

      {/* Terms Section */}
      <FormSection>
        <FormGroup>
          <TextAreaField
            label="Payment Terms"
            name="paymentTerms"
            control={control}
            placeholder="Enter payment terms..."
          />
          <TextAreaField
            label="Price Terms"
            name="priceTerms"
            control={control}
            placeholder="Enter price terms..."
          />
        </FormGroup>
        <FormGroup>
          <TextAreaField
            label="BOQ"
            name="boq"
            control={control}
            placeholder="Enter BOQ details..."
          />
          <TextAreaField
            label="Other Terms"
            name="otherTerms"
            control={control}
            placeholder="Enter other terms..."
          />
        </FormGroup>
      </FormSection>
    </>
  );
}

function ProductOrderForm({
  onClose = () => {},
  onSuccess = () => {},
}: FormCallbacks) {
  const { productOrderId } = useParams<{ productOrderId: string }>();
  
  // Safety check: if productOrderId is invalid and we're in edit mode, show loading
  if (productOrderId && (productOrderId === '' || productOrderId === 'undefined' || productOrderId === 'null')) {
    return <Loader />;
  }
  
  const createProductOrderMutation = useCreateProductOrder();
  const updateProductOrderMutation = useUpdateProductOrderOptimistic();

  const { formMode, isEditAction } = useFormMode();
  const { data: productOrder, isLoading } = useProductOrder(productOrderId);

  // Convert productOrder data to match ProductOrderFormValues structure
  const prefillProductOrder: Partial<ProductOrderFormValues> = isLoading || formMode === ACTION.CREATE 
    ? {} 
    : productOrder 
      ? {
          ...productOrder,
          // Flatten terms fields to top level
          paymentTerms: productOrder.paymentTerms || '',
          priceTerms: productOrder.priceTerms || '',
          boq: productOrder.boq || '',
          otherTerms: productOrder.otherTerms || ''
        } 
      : {};

  const mutationFn = formMode === ACTION.MODIFY ? updateProductOrderMutation : createProductOrderMutation;
  const titleMode = formMode === ACTION.MODIFY ? 'Update' : 'Create';

  const logDetails: LogDetails<ProductOrder> = {
    action: formMode === ACTION.MODIFY ? ACTION.MODIFY : ACTION.CREATE,
    entityType: ENTITY.PRODUCT_ORDER,
    oldData: productOrder
  };

  const { mutateWithActivityLog } = useMutationWithActivityLog<ProductOrderFormValues, LogDetails<ProductOrderFormValues>>({
    mainMutation: async (data: ProductOrderFormValues) => {
      // Convert form data to match the API expected format
      const mutationData = {
        ...data,
        // Ensure accountId is a string
        accountId: typeof data.accountId === 'object' ? data.accountId._id : data.accountId,
        ...(isEditAction && productOrder ? {id: productOrder._id} : {}),
      };
      return await mutationFn.mutateAsync(mutationData);
    },
    logDetails,
    onSuccess: () => {
      toast({
        title: `${titleMode} Product Order`,
        description: `Product Order has been ${titleMode.toLowerCase()}d successfully`,
      });
      onSuccess();
    },
    onError: (error) => {
      console.error("Error creating/updating product order:", error);
      toast({
        title: `Error`,
        description: `An error occurred while ${titleMode.toLowerCase()}ing the product order`,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4">
      <ReusableForm
        zodSchema={ProductOrderFormSchema}
        defaultValues={{ ...defaultProductOrder, ...prefillProductOrder }}
        onSubmit={async (data) => {
          try {
            await mutateWithActivityLog(data);
          } catch (err) {
            console.error("Error in form submission:", err);
          }
        }}
        renderActions={() => (
          <FormActions>
            <CloseButton onClose={onClose} entity={ENTITY.PRODUCT_ORDER} />
            <SubmitButton 
              entity={ENTITY.PRODUCT_ORDER} 
              loading={createProductOrderMutation.isPending || updateProductOrderMutation.isPending}
            />
          </FormActions>
        )}
      >
        <ProductOrderFormFields />
      </ReusableForm>
    </div>
  );
}

export default ProductOrderForm;