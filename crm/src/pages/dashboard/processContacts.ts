import { Contact } from "@/services/api/contactService";

/**
 * Processes a list of contacts by calculating the total number of contacts
 * and retrieving the most recent five contacts based on their creation date.
 *
 * @param contacts - An array of `Contact` objects to be processed.
 * @returns An object containing:
 * - `totalContacts`: The total number of contacts.
 * - `recentFiveContacts`: An array of the five most recently created contacts.
 */
export const processContacts = (contacts: Contact[]) => {
  const totalContacts = contacts.length;

  //   sort contacts by createdAt in descending order
  const sortedContacts = contacts.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });

  const getRecentContacts = (count: number) => {
    return sortedContacts.slice(0, count);
  };

  return {
    totalContacts,
    recentFiveContacts: getRecentContacts(5),
  };
};
