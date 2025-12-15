// hooks/useTenantFavicon.ts
import { updateFavicon } from "@/utils/tenant";
import { useEffect } from "react";

export const useFavicon = (favicon: string) => {
  useEffect(() => {
    if (favicon) updateFavicon(favicon);
  }, [favicon]);
};
