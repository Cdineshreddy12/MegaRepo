import {
  PlusCircle,
  Phone,
  Mail,
  User,
  Star,
  MoreVertical,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import IconButton from "../../../components/common/IconButton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/common/form-elements/Dropdown";
import { toast } from "@/hooks/useToast";
import {
  useAccountContacts,
  useSetPrimaryContact,
} from "@/queries/ContactQueries";
import { ROUTE_PATH } from "@/constants";

const rootPath = ROUTE_PATH.CONTACT;
/**
 * Component to display and manage contacts associated with an account
 * This version does not depend on React Query
 */
const AccountContacts = ({ accountId }: { accountId: string }) => {
  const navigate = useNavigate();
  const { isPending, data, isError, error } = useAccountContacts(accountId);
  const setPrimaryContactMutation = useSetPrimaryContact();

  // Function to get auth token from localStorage or cookies
  const contacts = isPending || !data || isError ? [] : data;

  // Handle setting a contact as primary
  const handleSetPrimary = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    contactId: string
  ) => {
    event.stopPropagation(); // Prevent triggering the card click

    try {
      setPrimaryContactMutation.mutate(
        {
          contactId,
          accountId,
        },
        {
          onSuccess() {
            toast({
              title: "Primary Contact Set",
              description: "The primary contact has been updated successfully",
            });
          },
          onError() {
            toast({
              title: "Error",
              description: "Failed to set primary contact",
              variant: "destructive",
            });
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
  };

  const handleAddContact = () => {
    // Navigate to contact form with accountId prefilled
    navigate(`/${rootPath}/new?accountId=${accountId}`);
  };

  const handleContactClick = (contactId: string) => {
    navigate(`/${rootPath}/${contactId}/view`);
  };

  const handleEditContact = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    contactId: string
  ) => {
    event.stopPropagation(); // Prevent triggering the card click
    navigate(`/${rootPath}/${contactId}/edit`);
  };

  if (isPending) {
    return <div className="py-4 text-center">Loading contacts...</div>;
  }

  if (isError) {
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
              // @ts-expect-error mongodb id
              key={contact._id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              // @ts-expect-error mongodb id
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
                        // @ts-expect-error mongodb id
                        onClick={(e) => handleEditContact(e, contact._id)}
                      >
                        Edit Contact
                      </DropdownMenuItem>
                      {!contact.isPrimaryContact && (
                        <DropdownMenuItem
                          // @ts-expect-error mongodb id
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

export default AccountContacts;
