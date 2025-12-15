// React and React-related imports
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { useParams } from "react-router-dom";


// Common Components
import AccountSelectorField from "@/components/common/AccountSelector";
import CloseButton from "@/components/common/CloseButton";
import ContactSelectorField from "@/components/common/ContactSelector";
import SubmitButton from "@/components/common/SubmitButton";
import SysConfigDropdownField from "@/components/common/SysConfigDropdown";
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
import QuotationFormSchema from "../zodSchema";
import { defaultQuotation } from "../testData";
import QuotationItemsForm from "./QuotationItemsForm";

// Hooks
import useFormMode from "@/hooks/useFormMode";
import {
  useQuotations,
  useCreateQuotation,
  useUpdateQuotationOptimistic,
  useQuotation,
} from "@/queries/QuotationQueries";
import { toast } from "@/hooks/useToast";

// Constants and Utilities
import { ACTION, ENTITY } from "@/constants";
import { formatCurrency } from "@/utils/format";
import { statusOptions } from "../constants";

// Types
import { FormCallbacks } from "@/types/common";


// Define the QuotationFormValues interface to match the form structure
interface QuotationFormValues {
  id?: string;
  quotationNumber?: string;
  accountId?: string | { _id: string };
  contactId?: string | { _id: string };
  account?: {
    name?: string;
  };
  contact?: {
    firstName?: string;
    lastName?: string;
  };
  status?: string;
  oem?: string;
  issueDate?: string;
  validUntil?: string;
  items?: Array<{
    type?: string;
    status?: string;
    sku?: string;
    description?: string;
    quantity: string | number;
    unitPrice: string | number;
    gst: string | number;
  }>;
  terms?: {
    prices?: string;
    boq?: string;
    paymentTerms?: string;
  };
  renewalTerm?: string;
  notes?: string;
  quoteCurrency?: string;
  currencyRate?: number;
  subtotal?: number;
  total?: number;
  gstTotal?: number;
}



// Define QuotationType interface
interface QuotationType {
  _id: string;
  quotationNumber: string;
  accountId: string | { _id: string };
  contactId?: string | { _id: string };
  status?: string;
  oem?: string;
  issueDate?: string;
  validUntil?: string;
  items?: Array<{
    type?: string;
    status?: string;
    sku?: string;
    description?: string;
    quantity: string | number;
    unitPrice: string | number;
    gst: string | number;
  }>;
  terms?: string | {
    prices?: string;
    boq?: string;
    paymentTerms?: string;
  };
  renewalTerm?: string;
  notes?: string;
  quoteCurrency?: string;
  currencyRate?: number;
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


function QuotationFormFields() {
  const { control, watch, setError, clearErrors, formState } = useFormContext();
  const { data: existingQuotations } = useQuotations();
  const items = watch("items") || [];

  const {total, subtotal, totalGST } = calculateTotals(items);
  const quotationNumber = watch("quotationNumber");
  const { dirtyFields } = formState
  
  useEffect(() => {
    if (!quotationNumber) return;

    const list = Array.isArray(existingQuotations) ? existingQuotations : [];
    if (list.length === 0) return;

    const found = list.find((quote) => quote.quotationNumber === quotationNumber);
    
    if (found && dirtyFields?.quotationNumber) {
      setError("quotationNumber", {
        type: "custom",
        message: "Quotation number already exist",
      });
    } else {
      clearErrors("quotationNumber");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationNumber, existingQuotations,dirtyFields ]);

  const selectedAccountId = watch('accountId');
  
  return (
    <>
      {/* Basic Information */}
      <FormSection title="Basic Quotation Information">
        <FormGroup>
          <InputField
            control={control}
            label="Quotation Number"
            name="quotationNumber"
            required
            placeholder="QT-2024-001"
          />
          <AccountSelectorField
            label="Account"
            name="accountId"
            control={control}
            required
          />
          <SelectField
            label="Status"
            name="status"
            placeholder="Select Quotation Status"
            control={control}
            options={statusOptions}
          />
        </FormGroup>
      </FormSection>

      <FormSection title="OEM and Contact Details">
        <FormGroup>
          <ContactSelectorField
            label="Contact Person"
            name="contactId"
            control={control}
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
          />
          <SysConfigDropdownField
            label="OEM"
            name="oem"
            category="oem_vendors"
            control={control}
            placeholder="Select OEM"
            required
          />
        </FormGroup>
      </FormSection>

      {/* Dates and Contact */}
      <FormSection title="Dates: Issue & Validity">
        <FormGroup>
          <DatePickerField
            label="Issue Date"
            name="issueDate"
            control={control}
            helperText="Pick Issue Date"
            required
          />
          <DatePickerField
            label="Valid Until"
            name="validUntil"
            control={control}
            required
          />
        </FormGroup>
      </FormSection>

      {/* Currency and Financial info*/}
      <FormSection title="Currency and Financial Information">
        <FormGroup>
          <SysConfigDropdownField
            label="Quote Currency"
            name="quoteCurrency"
            control={control}
            category="currencies"
          />
          <InputField
            label="Currency Rate"
            name="currencyRate"
            control={control}
            step="0.01"
            min="0"
          />
        </FormGroup>
      </FormSection>

      {/* Items */}
      <FormSection title="List of products/services">
        <QuotationItemsForm />
      </FormSection>
      
      {/* Totals */}
      <FormSection title=" Pricing and Totals">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="space-y-2">
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
            <div className="border-t border-gray-200 pt-2 flex justify-between">
              <span className="font-medium text-gray-900">Total</span>
              <span className="font-bold text-gray-900">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>
      </FormSection>

      {/* Additional Information */}
      <FormSection title="Terms and conditions">
        <TextAreaField
          label="Renewal Term"
          name="renewalTerm"
          control={control}
          placeholder="Enter renewal terms..."
        />
        <FormGroup title="Payment Terms" className="lg:grid-cols-1">
          <TextAreaField
            label="Prices"
            name="terms.prices"
            control={control}
            placeholder="Enter Prices terms and conditions..."
          />
          <TextAreaField
            label="BOQ"
            name="terms.boq"
            control={control}
            placeholder="Enter bog terms and conditions..."
          />
          <TextAreaField
            label="Payment"
            name="terms.paymentTerms"
            control={control}
            placeholder="Enter paymentTerms terms and conditions..."
          />
        </FormGroup>
      </FormSection>
      
      <FormSection title="Additional Notes">
        <TextAreaField
          label="Notes"
          name="notes"
          control={control}
          placeholder="Add any additional notes..."
        />
      </FormSection>
    </>
  );
}

function QuotationForm({
  onClose = () => {},
  onSuccess = () => {},
}: FormCallbacks) {
  const { quotationId } = useParams<{ quotationId: string }>();
  
  // Safety check: if quotationId is invalid and we're in edit mode, show loading
  if (quotationId && (quotationId === '' || quotationId === 'undefined' || quotationId === 'null')) {
    return <Loader />;
  }
  
  const createQuotationMutation = useCreateQuotation();
  const updateQuotationMutation = useUpdateQuotationOptimistic();

  const { formMode, isEditAction } = useFormMode();
  const { data: quotation, isLoading } = useQuotation(quotationId);

  // Convert quotation data to match QuotationFormValues structure
  const prefillQuotation: Partial<QuotationFormValues> = isLoading || formMode === ACTION.CREATE 
    ? {} 
    : quotation 
      ? (() => {
          const {
            accountId,
            contactId,
            assignedTo,
            ...rest
          } = quotation;

          const processedAccountId =
            typeof accountId === 'object' && accountId
              ? (accountId as any)._id || (accountId as any).id || (accountId as any).value
              : accountId;

          const processedContactId =
            typeof contactId === 'object' && contactId
              ? (contactId as any)._id || (contactId as any).id || (contactId as any).value
              : contactId;

          const processedAssignedTo =
            typeof assignedTo === 'object' && assignedTo
              ? (assignedTo as any)._id || (assignedTo as any).id || (assignedTo as any).value
              : assignedTo;

          return {
            ...rest,
            accountId: processedAccountId,
            contactId: processedContactId,
            assignedTo: processedAssignedTo,
            // Ensure terms is an object with the expected structure
            terms: typeof quotation.terms === 'string' 
              ? { prices: quotation.terms, boq: '', paymentTerms: '' } 
              : quotation.terms || { prices: '', boq: '', paymentTerms: '' }
          };
        })()
      : {};

    

  const mutationFn = formMode === ACTION.MODIFY ? updateQuotationMutation : createQuotationMutation;
  const titleMode = formMode === ACTION.MODIFY ? 'Update' : 'Create';

  const normalizeId = (value: any) =>
    typeof value === 'object' && value
      ? (value as any)._id || (value as any).id || (value as any).value
      : value;

  const handleMutation = async (data: QuotationFormValues) => {
    const normalizedAccountId = normalizeId(data.accountId);
    const normalizedContactId = normalizeId(data.contactId);

    if (isEditAction && quotation?._id) {
      return mutationFn.mutateAsync({
        data: {
          ...data,
          id: quotation._id,
          accountId: normalizedAccountId,
          contactId: normalizedContactId,
        },
        params: {},
      });
    }

    // Create
    const mutationData = {
      ...data,
      accountId: normalizedAccountId,
      contactId: normalizedContactId,
    };
    return mutationFn.mutateAsync({
      data: mutationData,
      params: {}, // Quotations use hierarchical filtering through accounts
    });
  };

  return (
    <div className="space-y-4">
      <ReusableForm
        zodSchema={QuotationFormSchema}
        defaultValues={defaultQuotation}
        prefillData={prefillQuotation}
        onSubmit={async (data) => {
          try {
            await handleMutation(data);
            toast({
              title: `${titleMode} Quotation`,
              description: `Quotation has been ${titleMode.toLowerCase()}ed successfully`,
            });
            onSuccess();
          } catch (err) {
            console.error("Error in form submission:", err);
            toast({
              title: `Error`,
              description: `An error occurred while ${titleMode.toLowerCase()}ing the quotation`,
              variant: "destructive",
            });
          }
        }}
        renderActions={() => (
          <FormActions>
            <CloseButton onClose={onClose} entity={ENTITY.QUOTATION} />
            <SubmitButton 
              entity={ENTITY.QUOTATION} 
              loading={createQuotationMutation.isPending || updateQuotationMutation.isPending}
            />
          </FormActions>
        )}
      >
        <QuotationFormFields />
      </ReusableForm>
    </div>
  );
}

export default QuotationForm;