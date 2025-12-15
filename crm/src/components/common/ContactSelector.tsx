import React from "react";
import SelectField, {
  DefaultOptionType,
  SelectFieldProps,
} from "@/components/common/form-elements/SelectField";
import { useOrgContacts } from "@/hooks/useOrgAwareQueries";
import { Contact } from "@/services/api/contactService";
import { formatName } from "@/utils/format";
import { FieldValues, useWatch } from "react-hook-form";

// Define the Contact type based on your data structure

// Define ContactSelectorProps to omit options from SelectFieldProps
export type ContactSelectorProps = Omit<
  SelectFieldProps<FieldValues>,
  "options"
> & {
  filter?: (contact: Contact) => boolean;
};

function ContactSelectorField(props: ContactSelectorProps) {
  // Fetch Contact data
  const { data: ContactsData, isPending: isContactPending, isError, error } = useOrgContacts();

  // Watch current value to ensure prefilled contact renders even if not in options
  const currentValue = useWatch({
    control: props.control,
    name: props.name,
  });
  const normalizedCurrentValue =
    typeof currentValue === 'object' && currentValue !== null
      ? (currentValue as any)._id || (currentValue as any).id || (currentValue as any).value || ''
      : currentValue;

  // Debug logging
  console.log('🔍 ContactSelector Debug:', {
    isPending: isContactPending,
    isError,
    hasData: !!ContactsData,
    dataLength: ContactsData?.length || 0,
    dataType: Array.isArray(ContactsData) ? 'array' : typeof ContactsData,
    error: error ? {
      message: (error as any)?.message,
      status: (error as any)?.response?.status,
    } : null,
    hasFilter: !!props.filter,
  });

  // Ensure the Contact options are properly typed
  const ContactOptions: DefaultOptionType[] = React.useMemo(() => {
    if (isContactPending || !ContactsData || !Array.isArray(ContactsData)) {
      return [];
    }

    let filteredContacts = ContactsData;
    
    // Apply filter if provided
    if (props.filter) {
      filteredContacts = ContactsData.filter(props.filter);
      console.log(`🔍 ContactSelector: Filtered ${ContactsData.length} contacts to ${filteredContacts.length}`);
    }

    const baseOptions = filteredContacts.map((contact: Contact) => {
      const contactId = (contact as any)._id || (contact as any).id;
      const name = formatName(contact, "FN-LN");
      
      if (!contactId) {
        console.warn('⚠️ ContactSelector: Contact missing _id or id:', contact);
      }
      
      return {
        value: contactId || '',
        label: name || 'Unnamed Contact',
      };
    });

    // If current value isn't in options, inject it (placeholder if not accessible)
    if (normalizedCurrentValue && !baseOptions.some(opt => opt.value === normalizedCurrentValue)) {
      const contactInData = ContactsData.find(
        c => (c as any)._id === normalizedCurrentValue || (c as any).id === normalizedCurrentValue
      );
      if (contactInData) {
        baseOptions.unshift({
          value: (contactInData as any)._id || (contactInData as any).id,
          label: formatName(contactInData, "FN-LN") || 'Unnamed Contact',
        });
      } else {
        baseOptions.unshift({
          value: normalizedCurrentValue,
          label: 'Contact not accessible',
        });
      }
    }

    return baseOptions;
  }, [ContactsData, isContactPending, props.filter, normalizedCurrentValue]);

  return (
    <SelectField
      label="Contact"
      placeholder="Select Contact"
      {...props}
      options={ContactOptions}
    />
  );
}

export default ContactSelectorField;
