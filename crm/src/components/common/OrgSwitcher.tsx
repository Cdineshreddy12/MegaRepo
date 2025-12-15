import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Check, 
  ChevronsUpDown, 
  Loader2, 
  Plus, 
  Search 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrgStore } from '@/store/org-store';
import { useUserSession } from '@/contexts/UserSessionContext';
import { authService } from '@/services/api/authService';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface OrgSwitcherProps {
  className?: string;
}

export const OrgSwitcher: React.FC<OrgSwitcherProps> = ({ className = '' }) => {
  const { entities, isLoading, setCurrentEntityId } = useUserSession();
  const {
    organizations,
    selectedOrg,
    setOrganizations,
    setSelectedOrg,
    getSelectedOrg
  } = useOrgStore();

  const [open, setOpen] = useState(false);
  const [isSwitchingOrg, setIsSwitchingOrg] = useState(false);
  
  // Find current org object
  const selectedOrganization = organizations.find(org => org.orgCode === selectedOrg);

  // Initialize data
  useEffect(() => {
    if (entities && entities.length > 0) {
      setOrganizations(entities as any);
      const currentSelected = getSelectedOrg();
      if (!currentSelected && entities.length > 0) {
        const defaultOrg = entities[0].orgCode;
        setSelectedOrg(defaultOrg);
        setCurrentEntityId(defaultOrg);
      }
    }
  }, [entities, setOrganizations, setSelectedOrg, getSelectedOrg, setCurrentEntityId]);

  const handleOrgChange = async (orgCode: string) => {
    if (isSwitchingOrg || orgCode === selectedOrg) return;
    setIsSwitchingOrg(true);
    setOpen(false); // Close immediately for better UX

    try {
      const kindeToken = localStorage.getItem('token') || sessionStorage.getItem('kinde_token');
      if (kindeToken) {
        await authService.redirectAuth(undefined, kindeToken);
      }
    } catch (error) {
      console.error('Failed to refresh auth for new organization:', error);
    } finally {
      setSelectedOrg(orgCode);
      setCurrentEntityId(orgCode);
      setIsSwitchingOrg(false);
    }
  };

  // Helper to get initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  if (isLoading || isSwitchingOrg) {
    return (
      <div className={cn("flex items-center gap-2 h-9 px-3 rounded-md bg-muted/40 animate-pulse", className)}>
        <div className="h-5 w-5 rounded-full bg-muted-foreground/20" />
        <div className="h-4 w-24 bg-muted-foreground/10 rounded" />
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 w-[220px] justify-between border-border/40 bg-background/50 hover:bg-accent/50 hover:text-accent-foreground backdrop-blur-sm transition-all shadow-sm",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <Avatar className="h-5 w-5 border border-border/50">
              <AvatarImage src="" alt={selectedOrganization?.orgName} />
              <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                {selectedOrganization ? getInitials(selectedOrganization.orgName) : "OR"}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm font-medium">
              {selectedOrganization?.orgName || "Select Organization"}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0 shadow-xl border-border/60 backdrop-blur-xl bg-popover/95">
        <Command>
          <CommandInput placeholder="Search organization..." className="h-9" />
          <CommandList>
            <CommandEmpty>No organization found.</CommandEmpty>
            <CommandGroup heading="Organizations">
              {organizations
                .sort((a, b) => a.orgName.localeCompare(b.orgName))
                .map((org) => (
                  <CommandItem
                    key={org.orgCode}
                    value={org.orgName}
                    onSelect={() => handleOrgChange(org.orgCode)}
                    className="flex items-center gap-2 py-2 cursor-pointer"
                  >
                    <Avatar className="h-5 w-5 border border-border/50">
                       <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                        {getInitials(org.orgName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate flex-1">{org.orgName}</span>
                    {selectedOrg === org.orgCode && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                  </CommandItem>
                ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem onSelect={() => {}} className="text-muted-foreground text-xs cursor-not-allowed opacity-50">
                <Plus className="mr-2 h-3 w-3" />
                Create Organization
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
