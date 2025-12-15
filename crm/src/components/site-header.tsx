import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { ModeToggle } from "./mode-toggler";
import { OrgSwitcher } from "./common/OrgSwitcher";
import { CreditBalance } from "./CreditBalance";
import { cn } from "@/lib/utils";

export function SiteHeader({ title }: { title?: string }) {
  const location = useLocation();
  const pageTitle = useMemo(() => {
    return (
      location.pathname
        .split("/")
        .filter(Boolean)
        .pop()
        ?.replace(/-/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase()) || "Dashboard"
    );
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 transition-all duration-300">
      <div className="flex h-16 w-full items-center px-4 lg:px-6 gap-4">
        {/* Left Section: Navigation & Title */}
        <div className="flex items-center gap-3">
          <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors" />
          <Separator
            orientation="vertical"
            className="hidden h-5 w-[1px] bg-border/60 sm:block"
          />
          <h1 className="text-sm font-medium tracking-tight text-foreground/90 sm:text-base">
            {title || pageTitle}
          </h1>
        </div>

        {/* Right Section: Actions & Context */}
        <div className="ml-auto flex items-center gap-3 sm:gap-4">
          <div className="hidden md:block">
            <CreditBalance />
          </div>
          
          <div className="h-5 w-[1px] bg-border/60 hidden sm:block" />
          
          <OrgSwitcher />
          
          <div className="hidden sm:block">
             <ModeToggle />
          </div>
        </div>
      </div>
      
      {/* Mobile-only Credit Balance (optional, showing below header if needed, or keep in menu) */}
      <div className="md:hidden border-t border-border/40 bg-muted/20 px-4 py-2 flex justify-center">
         <CreditBalance compact />
      </div>
    </header>
  );
}
