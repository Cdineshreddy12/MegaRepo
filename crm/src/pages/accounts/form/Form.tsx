import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import {
  PlusCircle,
  User,
  Star,
  MoreVertical,
  Mail,
  Phone,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import AddressForm from "@/components/common/AddressForm";
import AssigneeSelectorField from "@/components/common/AssigneeSelector";
import CloseButton from "@/components/common/CloseButton";
import IconButton from "@/components/common/IconButton";
import SubmitButton from "@/components/common/SubmitButton";
import Loader from "@/components/common/Loader";
import {
  FormSection,
  FormGroup,
  InputField,
  PhoneInputField,
  TextAreaField,
  CheckboxField,
  SelectField,
  ReusableForm,
  FormActions,
} from "@/components/common/form-elements";
import SysConfigDropdownField from "@/components/common/SysConfigDropdown";
import AccountSelectorField from "@/components/common/AccountSelector";

import { RupeeSymbol, ACTION, ENTITY } from "@/constants";

import useFormMode from "@/hooks/useFormMode";
import { toast } from "@/hooks/useToast";
import { useSelectedOrg } from "@/store/org-store";

import {
  useAccounts,
  useCreateAccount,
  useUpdateAccountOptimistic,
  useAccount,
} from "@/queries/AccountQueries";
import { useOrgAccounts } from "@/hooks/useOrgAwareQueries";

import { paymentTermsOptions, documentDeliveryMethods } from "../constants";
import { defaultAccountState } from "../testData";
import AccountFormSchema from "../zodSchema";

import { api, handleApiError } from "@/services/api";

// User display component that handles object or string IDs
const UserDisplay = ({ user }: { user: any }) => {
  if (!user) return null;

  // Handle both object structure and string ID
  const userId = typeof user === "object" ? user._id : user;
  const name =
    typeof user === "object"
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
      : "";

  return (
    <div className="flex items-center">
      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
        <span className="text-gray-600 uppercase">
          {name ? name.charAt(0) : "?"}
        </span>
      </div>
      <div>
        <div className="text-sm font-medium text-gray-900">
          {name || userId || "Unknown User"}
        </div>
      </div>
    </div>
  );
};

// Define Contact type for the component
interface ContactType {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  isPrimaryContact?: boolean;
}

// Account Contacts component for displaying and managing contacts
// Replace the existing AccountContacts component with this version
const AccountContacts = ({ accountId }: { accountId: string }) => {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<ContactType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch contacts when the component mounts or accountId changes
  useEffect(() => {
    if (!accountId) {
      setIsLoading(false);
      return;
    }

    const fetchContacts = async () => {
      console.log(`🔍 Frontend: Fetching contacts for account: ${accountId}`);
      setIsLoading(true);
      try {
        // Use the api instance instead of fetch
        const response = await api.get(`/accounts/${accountId}/contacts`);
        console.log(`✅ Frontend: Received ${response.data?.length || 0} contacts for account ${accountId}`);
        console.log(`📋 Frontend: Contact data:`, response.data);
        setContacts(response.data);
        setError(null);
      } catch (err) {
        console.error("❌ Frontend: Error fetching contacts:", err);
        console.error("❌ Frontend: Error details:", err.response?.data || err.message);
        setError(handleApiError(err));
      } finally {
        setIsLoading(false);
      }
    };

    fetchContacts();
  }, [accountId]);

  // Handle setting a contact as primary
  const handleSetPrimary = async (event: React.MouseEvent, contactId: string) => {
    event.stopPropagation();

    try {
      // Use the api instance instead of fetch
      await api.put(`/contacts/${contactId}/set-primary`, { accountId });

      // Update the contacts list locally
      setContacts((prevContacts) =>
        prevContacts.map((contact) => ({
          ...contact,
          isPrimaryContact: contact._id === contactId,
        }))
      );

      toast({
        title: "Primary Contact Set",
        description: "The primary contact has been updated successfully",
      });
    } catch (err) {
      console.error("Error setting primary contact:", err);
      toast({
        title: "Error",
        description: "Failed to set primary contact",
        variant: "destructive",
      });
    }
  };

  const handleAddContact = () => {
    navigate(`/contacts/new?accountId=${accountId}`);
  };

  const handleContactClick = (contactId: string) => {
    navigate(`/contacts/${contactId}/view`);
  };

  const handleEditContact = (event: React.MouseEvent, contactId: string) => {
    event.stopPropagation();
    navigate(`/contacts/${contactId}/edit`);
  };

  if (isLoading) {
    return <div className="py-4 text-center">Loading contacts...</div>;
  }

  if (error) {
    return (
      <div className="py-4 text-center text-red-500">
        Error loading contacts: {error.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-medium">Contacts</h3>
          <p className="text-sm text-gray-500">
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""}{" "}
            associated with this account
          </p>
        </div>
        <IconButton
          onClick={handleAddContact}
          icon={PlusCircle}
          variant="outline"
          size="sm"
        >
          Add Contact
        </IconButton>
      </div>

      {contacts.length === 0 ? (
        <div className="py-6 text-center text-gray-500 border border-dashed rounded-md">
          No contacts found for this account. Add your first contact.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => (
            <div
              key={contact._id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleContactClick(contact._id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <User size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">
                      {contact.firstName} {contact.lastName}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {contact.jobTitle || "No title"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {contact.isPrimaryContact && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded flex items-center">
                      <Star size={12} className="mr-1" />
                      Primary
                    </span>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                      <MoreVertical size={16} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={(e) => handleEditContact(e, contact._id)}
                      >
                        Edit Contact
                      </DropdownMenuItem>
                      {!contact.isPrimaryContact && (
                        <DropdownMenuItem
                          onClick={(e) => handleSetPrimary(e, contact._id)}
                        >
                          Set as Primary
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-center text-sm">
                  <Mail size={16} className="mr-2 text-gray-500" />
                  <span className="text-gray-700">
                    {contact.email || "No email"}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <Phone size={16} className="mr-2 text-gray-500" />
                  <span className="text-gray-700">
                    {contact.phone || "No phone"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
const AccountFormFields = ({ isEditMode = false, accountData = null }) => {
  const { control, watch, setError, clearErrors, formState } = useFormContext();
  const { data: existingAccounts } = useOrgAccounts();
  const { dirtyFields } = formState

  const isSameAsBilling = !!watch("sameAsBilling");
  const companyName = watch("companyName") || "";

  // Access createdBy and assignedTo from the accountData
  const createdBy = accountData?.createdBy;

  useEffect(() => {
    // Only check for duplicates if the field has been modified and we have a company name
    if (dirtyFields?.companyName && companyName.trim()) {
      const found = existingAccounts?.find(
        (account) => account.companyName === companyName.trim() &&
                     account._id !== accountData?._id // Exclude current account when editing
      );
      if (found) {
        setError("companyName", {
          type: "custom",
          message: `Account already exists with name "${companyName}"`,
        });
      } else {
        clearErrors("companyName");
      }
    } else if (!dirtyFields?.companyName) {
      // Clear error if field hasn't been touched
      clearErrors("companyName");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyName, existingAccounts, dirtyFields, accountData?._id]);
  return (
    <>
      {/* **Account Identification** */}
      <FormSection title="Account Information">
        <FormGroup>
          <InputField
            label="Company Name"
            name="companyName"
            control={control}
            required
            placeholder="Enter company name"
            tabIndex={0}
          />
          <PhoneInputField
            label="Phone"
            name="phone"
            control={control}
            tabIndex={0}
            defaultCountry="IN"
          />
          {/* Added email field */}
          <InputField
            label="Email"
            name="email"
            type="email"
            control={control}
            placeholder="company@example.com"
            tabIndex={0}
          />
          <InputField
            label="Website"
            name="website"
            type="url"
            placeholder="https://example.com"
            control={control}
            tabIndex={0}
          />
          <SysConfigDropdownField
            label="Account Status"
            name="status"
            control={control}
            category="account_status"
            tabIndex={0}
          />
          <SysConfigDropdownField
            name="zone"
            label="Zone"
            control={control}
            required
            tabIndex={0}
            placeholder="Select Zone"
            category="zones"
          />
        </FormGroup>
        <TextAreaField
          label="Description"
          name="description"
          control={control}
          tabIndex={0}
        />
      </FormSection>

      {/* **Address & Location** */}
      <FormSection title="Address and Location">
        <FormGroup title="Billing Address" className="md:grid-cols-1">
          <AddressForm parentPath="billingAddress" />
        </FormGroup>
        <FormGroup title="Shipping Address" className="md:grid-cols-1">
          <CheckboxField
            name="sameAsBilling"
            control={control}
            label="Same as billing address"
            tabIndex={0}
          />
          <div style={{ display: isSameAsBilling ? "none" : "block" }}>
            <AddressForm parentPath="shippingAddress" />
          </div>
        </FormGroup>
      </FormSection>

      {/* Financial & Business Information */}
      <FormSection title="Financial & Business Information">
        <FormGroup>
          <SysConfigDropdownField
            category="company_types"
            label="Ownership Type"
            name="ownershipType"
            placeholder="Select Ownership Type"
            control={control}
            tabIndex={0}
          />
          <SysConfigDropdownField
            label="Industry"
            name="industry"
            placeholder="Select Industry"
            control={control}
            category="industries"
            tabIndex={0}
          />
          <InputField
            label="Company Size"
            name="employeesCount"
            type="number"
            control={control}
            placeholder="Number of employees"
            tabIndex={0}
          />
          <InputField
            label="Annual Revenue"
            name="annualRevenue"
            type="number"
            control={control}
            prefix={RupeeSymbol}
            tabIndex={0}
          />
          <InputField
            label="GSTIN"
            name="gstNo"
            control={control}
            tabIndex={0}
          />
          <SelectField
            label="Credit Term"
            name="creditTerm"
            placeholder="Select Credit Term"
            control={control}
            options={paymentTermsOptions}
            tabIndex={0}
          />
        </FormGroup>
      </FormSection>

      {/* **Assigned and Additional Information ** */}
      <FormSection title="Additional Information">
        <FormGroup>
          {/* Always show AssigneeSelectorField to allow changing assignee */}
          <AssigneeSelectorField
            name="assignedTo"
            control={control}
            tabIndex={0}
            label="Assigned To"
          />
          <SelectField
            label="Invoicing"
            name="invoicing"
            control={control}
            placeholder="Select Invoicing Type"
            options={documentDeliveryMethods}
            tabIndex={0}
          />
        </FormGroup>

        {/* Show Record Information in edit mode */}
        {isEditMode && (
          <FormGroup title="Record Information">
            {createdBy && (
              <div className="col-span-2 md:col-span-1 mt-2">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  Created By
                </div>
                <UserDisplay user={createdBy} />
              </div>
            )}

            {accountData?.assignedTo && (
              <div className="col-span-2 md:col-span-1 mt-2">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  Current Assignee
                </div>
                <UserDisplay user={accountData.assignedTo} />
              </div>
            )}
          </FormGroup>
        )}
      </FormSection>

      {/* Account Contacts Section - Only show in view/edit mode */}
      {isEditMode && accountData?._id && (
        <FormSection title="Account Contacts">
          <AccountContacts
            accountId={accountData._id}
            companyName={accountData.companyName}
          />
        </FormSection>
      )}
    </>
  );
};

const logDetails = {
  action: ACTION.CREATE,
  entityType: ENTITY.ACCOUNT,
};

const AccountForm = ({ onClose, onSuccess }: { onClose?: () => void; onSuccess?: () => void }) => {
  const { accountId } = useParams();
  
  // Safety check: if accountId is invalid and we're in edit mode, show loading
  if (accountId && (accountId === '' || accountId === 'undefined' || accountId === 'null')) {
    return <Loader />;
  }
  
  const createAccountMutation = useCreateAccount();
  const updateAccountMutation = useUpdateAccountOptimistic();
  const { formMode, isEditAction } = useFormMode();
  const { data: account, isLoading } = useAccount(accountId);
  const selectedOrg = useSelectedOrg();

  // Ensure onClose is actually a function before using it
  const handleClose = () => {
    if (typeof onClose === "function") {
      onClose();
    }
  };

  // Handle form success and ensure proper closure
  const handleSuccess = () => {
    console.log("Form submission successful");
    if (typeof onSuccess === "function") {
      onSuccess();
    }
    // Close the form after successful creation/update
    handleClose();
  };

  // Handle assignee value transformation for the form
  const transformAccountData = (data: any) => {
    if (!data) return {};

    // Transform nested assignedTo object to just the ID for the form
    const assignedTo = data.assignedTo?._id || data.assignedTo || null;

    // Ensure all required fields are present and properly formatted
    const transformedData = {
      ...data,
      assignedTo,
        // Ensure optional fields have proper defaults
        phone: data.phone && data.phone.trim() !== "" ? data.phone.trim() : "",
        email: data.email && data.email.trim() !== "" ? data.email.trim() : "",
        website: data.website && data.website.trim() !== "" ? data.website.trim() : "",
        description: data.description || "",
        parentAccount: data.parentAccount || "",
        accountType: data.accountType || "",
        segment: data.segment || "",
        ownershipType: data.ownershipType || null,
        industry: data.industry || "",
        employeesCount: data.employeesCount || 1,
        annualRevenue: data.annualRevenue || 0,
        gstNo: data.gstNo && data.gstNo.trim() !== "" ? data.gstNo.trim().toUpperCase().replace(/\s/g, '') : "",
        creditTerm: data.creditTerm && data.creditTerm !== "" && data.creditTerm !== null ? data.creditTerm : null,
      invoicing: data.invoicing || null,
      billingAddress: data.billingAddress ? {
        street: data.billingAddress.street || '',
        city: data.billingAddress.city || '',
        state: data.billingAddress.state || '',
        zipCode: data.billingAddress.zipCode || '',
        country: data.billingAddress.country || ''
      } : {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      shippingAddress: data.shippingAddress ? {
        street: data.shippingAddress.street || '',
        city: data.shippingAddress.city || '',
        state: data.shippingAddress.state || '',
        zipCode: data.shippingAddress.zipCode || '',
        country: data.shippingAddress.country || ''
      } : {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      sameAsBilling: data.sameAsBilling || false,
      // Ensure required fields
      companyName: data.companyName || "",
      zone: data.zone || "north",
      status: data.status || "active",
    };

    // console.log('🔧 Transformed account data:', transformedData);
    return transformedData;
  };

  const prefillAccountData =
    formMode === ACTION.CREATE
      ? {}
      : account
        ? transformAccountData(account)
        : {};


  const isEditMode = formMode === ACTION.MODIFY || formMode === ACTION.VIEW;

  const mutationFn =
    formMode === ACTION.MODIFY ? updateAccountMutation : createAccountMutation;
  const titleMode = formMode === ACTION.MODIFY ? "Update" : "Create";

  const handleMutation = async (data) => {
    const payload = {
      ...data,
      ...(isEditAction ? { id: account?._id } : {}),
      assignedTo: data.assignedTo || null,
    };

    // Always include orgCode in the payload body for both create and update operations
    // Also send entityId as query parameter for additional context
    return mutationFn.mutateAsync({
      data: {
        ...payload,
        orgCode: selectedOrg
      },
      params: selectedOrg ? { entityId: selectedOrg } : {}
    });
  };

  const createAccount = async (data: any) => {
    try {
      await handleMutation(data);
      toast({
        title: `${titleMode} Account`,
        description: `Account has been ${titleMode}d successfully`,
      });
      handleSuccess();
    } catch (error) {
      console.log(error);
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          `Failed to ${titleMode} Account`;
      toast({
        title: `${titleMode} Account`,
        description: errorMessage,
        variant: "destructive",
      });
      // Re-throw error so react-hook-form can reset the loading state
      throw error;
    }
  };

  return (
    <ReusableForm
      zodSchema={AccountFormSchema}
      defaultValues={defaultAccountState}
      prefillData={prefillAccountData}
      onSubmit={createAccount}
      renderActions={(form) => {
        return (
          <FormActions>
            <CloseButton
              onClose={handleClose}
              entity={ENTITY.ACCOUNT}
              size="lg"
            />
            <SubmitButton
              entity={ENTITY.ACCOUNT}
              loading={form.formState.isSubmitting}
              size="lg"
            />
          </FormActions>
        );
      }}
    >
      <AccountFormFields isEditMode={isEditMode} accountData={account} />
    </ReusableForm>
  );
};

export default AccountForm;
