import { useEffect } from "react";

/**
 * Dynamically updates the document title.
 *
 * @param title - The new page title to set.
 */
export const usePageTitle = (title: string) => {
  useEffect(() => {
    if (title) {
      document.title = title;
    }
  }, [title]);
};
