import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { ACTION } from "@/constants";

export function useFormMode() {
  const location = useLocation();

  // Determine if it's an edit action
  const formMode = useMemo(() => {
    const pathname = location.pathname;
    if (pathname.includes("/edit")) return ACTION.MODIFY;
    if (pathname.includes("/new")) return ACTION.CREATE;
    if (pathname.includes("/view")) return ACTION.VIEW;
    if (pathname.includes("/preview")) return ACTION.PREVIEW
    return "";
  }, [location.pathname]);

  // Determine form mode
  const isEditAction = formMode === ACTION.MODIFY;

  return { formMode, isEditAction };
}

export default useFormMode;
