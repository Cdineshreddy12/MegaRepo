import { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/KindeAuthContext";
import Loader from "@/components/common/Loader";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import SiteFooter from "@/components/site-footer";
import { TenantMeta } from "@/components/tenant-meta";
import { TenantConfig } from "@/lib/app-config";
import { CreditWarningBanner } from "@/components/CreditWarningBanner";

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, user } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    // Parent route handles auth redirects; avoid local navigation to /login
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background/20">
        <Loader />
      </div>
    );
  }

  return (
    <>
    <TenantMeta config={TenantConfig}/>
    
    <SidebarProvider>
      <AppSidebar
        variant="inset"
        collapsible={isMobile ? "offcanvas" : "icon"}
      />
      <SidebarInset className="overflow-hidden">
        <SiteHeader />
        <CreditWarningBanner />
        <main className="px-4 py-8  min-h-screen bg-gradient-to-b from-primary/10 to-secondary/10">
          <Outlet />
        </main>
        <SiteFooter />
      </SidebarInset>
    </SidebarProvider>
    </>

  );
};

export default MainLayout;
