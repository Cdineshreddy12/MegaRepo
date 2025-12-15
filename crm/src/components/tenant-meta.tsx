// components/TenantMeta.tsx
import { TenantAppConfig } from "@/lib/app-config";
import { Helmet } from "react-helmet-async";

export const TenantMeta = ({ config}: {config: TenantAppConfig}) => {

  const {
    name = "CRM App",
    description = "CRM App Description",
    branding
  } = config || {};

  const themeColor = branding?.primaryColor || "#ffffff";


  return (
    <Helmet>
      <title>{name}</title>
      <meta name="description" content={description} />
      <meta name="theme-color" content={themeColor} />
      <meta property="og:title" content={name} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={config?.branding?.ogImage || "/default-og.png"} />
    </Helmet>
  );
};
