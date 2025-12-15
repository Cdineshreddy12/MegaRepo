"use client";

import { useState, useEffect, useMemo } from "react";
import { Controller, Control } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, X } from "lucide-react";
import { accountService } from "@/services/api/accountService";
import { contactService } from "@/services/api/contactService";
import { leadService } from "@/services/api/leadService";
import { opportunityService } from "@/services/api/opportunityService";
import { quotationService } from "@/services/api/quotationService";
import { salesOrderService } from "@/services/api/salesOrderService";
import { invoiceService } from "@/services/api/invoiceService";
import { ticketService } from "@/services/api/ticketService";
import { userManagementService } from "@/services/api/userManagementService";
import { useToast } from "@/hooks/useToast";

export type EntityType =
  | "account"
  | "contact"
  | "lead"
  | "opportunity"
  | "quotation"
  | "salesOrder"
  | "invoice"
  | "ticket"
  | "user"
  | "organization";

interface EntityLookupFieldProps {
  name: string;
  control: Control<any>;
  entityType: EntityType;
  label: string;
  required?: boolean;
  multiple?: boolean;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

interface EntityOption {
  id: string;
  name: string;
  displayName?: string;
}

// Entity service mapping
const getEntityService = (entityType: EntityType) => {
  switch (entityType) {
    case "account":
      return accountService;
    case "contact":
      return contactService;
    case "lead":
      return leadService;
    case "opportunity":
      return opportunityService;
    case "quotation":
      return quotationService;
    case "salesOrder":
      return salesOrderService;
    case "invoice":
      return invoiceService;
    case "ticket":
      return ticketService;
    case "user":
      return userManagementService;
    default:
      return null;
  }
};

// Extract display name from entity
const getEntityDisplayName = (entity: any, entityType: EntityType): string => {
  switch (entityType) {
    case "account":
      return entity.companyName || entity.name || entity.id;
    case "contact":
      return `${entity.firstName || ""} ${entity.lastName || ""}`.trim() || entity.email || entity.id;
    case "lead":
      return `${entity.firstName || ""} ${entity.lastName || ""}`.trim() || entity.companyName || entity.email || entity.id;
    case "opportunity":
      return entity.name || entity.title || entity.id;
    case "quotation":
      return entity.quotationNumber || entity.id;
    case "salesOrder":
      return entity.orderNumber || entity.id;
    case "invoice":
      return entity.invoiceNumber || entity.id;
    case "ticket":
      return entity.subject || entity.title || entity.id;
    case "user":
      return `${entity.firstName || ""} ${entity.lastName || ""}`.trim() || entity.email || entity.id;
    default:
      return entity.name || entity.title || entity.id || "Unknown";
  }
};

export function EntityLookupField({
  name,
  control,
  entityType,
  label,
  required = false,
  multiple = false,
  placeholder,
  error,
  disabled = false,
  className = "",
}: EntityLookupFieldProps) {
  const [entities, setEntities] = useState<EntityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const service = getEntityService(entityType);

  // Load entities - load immediately if there's a value, otherwise load when dropdown opens
  useEffect(() => {
    const loadEntities = async () => {
      if (!service) {
        console.warn(`No service found for entity type: ${entityType}`);
        return;
      }

      try {
        setLoading(true);
        let data: any[] = [];

        switch (entityType) {
          case "account":
            data = await accountService.getAccounts();
            break;
          case "contact":
            data = await contactService.getContacts();
            break;
          case "lead":
            data = await leadService.getLeads();
            break;
          case "opportunity":
            data = await opportunityService.getOpportunities();
            break;
          case "quotation":
            data = await quotationService.getQuotations();
            break;
          case "salesOrder":
            data = await salesOrderService.getSalesOrders();
            break;
          case "invoice":
            data = await invoiceService.getInvoices();
            break;
          case "ticket":
            data = await ticketService.getTickets();
            break;
          case "user":
            data = await userManagementService.getUsers();
            break;
          default:
            break;
        }

        const options: EntityOption[] = data.map((entity) => ({
          id: entity.id || entity._id,
          name: getEntityDisplayName(entity, entityType),
          displayName: getEntityDisplayName(entity, entityType),
        }));

        setEntities(options);
      } catch (error: any) {
        console.error(`Error loading ${entityType} entities:`, error);
        toast({
          title: "Error",
          description: `Failed to load ${entityType} options`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    // Load entities if dropdown is open OR if we need to display a selected value
    // We'll check for selected value via a ref or by checking if entities are needed
    if (isOpen || entities.length === 0) {
      loadEntities();
    }
  }, [entityType, isOpen, service, toast]);

  // Filter entities based on search query
  const filteredEntities = useMemo(() => {
    if (!searchQuery) return entities;
    const query = searchQuery.toLowerCase();
    return entities.filter(
      (entity) =>
        entity.name.toLowerCase().includes(query) ||
        entity.displayName?.toLowerCase().includes(query)
    );
  }, [entities, searchQuery]);

  if (!service) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">{label}</label>
        <div className="text-sm text-gray-500">
          Entity type "{entityType}" is not supported
        </div>
      </div>
    );
  }

  if (multiple) {
    return (
      <div className={`space-y-2 ${className}`}>
        <label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <Controller
          name={name}
          control={control}
          render={({ field }) => {
            const selectedIds = Array.isArray(field.value) ? field.value : [];
            const selectedEntities = entities.filter((e) =>
              selectedIds.includes(e.id)
            );

            return (
              <div className="space-y-2">
                <Select
                  open={isOpen}
                  onOpenChange={setIsOpen}
                  disabled={disabled || loading}
                >
                  <SelectTrigger className={error ? "border-red-500" : ""}>
                    <SelectValue placeholder={placeholder || `Select ${label.toLowerCase()}...`} />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    {loading ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      <div className="max-h-60 overflow-auto">
                        {filteredEntities.map((entity) => (
                          <SelectItem
                            key={entity.id}
                            value={entity.id}
                            onSelect={() => {
                              const newValue = selectedIds.includes(entity.id)
                                ? selectedIds.filter((id) => id !== entity.id)
                                : [...selectedIds, entity.id];
                              field.onChange(newValue);
                            }}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{entity.name}</span>
                              {selectedIds.includes(entity.id) && (
                                <span className="text-green-500">✓</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {selectedEntities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedEntities.map((entity) => (
                      <div
                        key={entity.id}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm"
                      >
                        <span>{entity.name}</span>
                        {!disabled && (
                          <button
                            type="button"
                            onClick={() => {
                              const newValue = selectedIds.filter(
                                (id) => id !== entity.id
                              );
                              field.onChange(newValue);
                            }}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}
              </div>
            );
          }}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          // Find the selected entity to display its name
          const selectedEntity = entities.find((e) => e.id === field.value);
          const displayValue = selectedEntity ? selectedEntity.name : "";

          return (
            <div className="space-y-2">
              <Select
                value={field.value || ""}
                onValueChange={field.onChange}
                disabled={disabled || loading}
                open={isOpen}
                onOpenChange={setIsOpen}
              >
                <SelectTrigger className={error ? "border-red-500" : ""}>
                  <SelectValue
                    placeholder={
                      loading
                        ? "Loading..."
                        : placeholder || `Select ${label.toLowerCase()}...`
                    }
                  />
                </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <div className="max-h-60 overflow-auto">
                    {filteredEntities.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">
                        No {entityType} found
                      </div>
                    ) : (
                      filteredEntities.map((entity) => (
                        <SelectItem key={entity.id} value={entity.id}>
                          {entity.name}
                        </SelectItem>
                      ))
                    )}
                  </div>
                )}
              </SelectContent>
            </Select>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          );
        }}
      />
    </div>
  );
}

