import { DropdownType } from "@/types/common";

interface ConfigItem {
    id: string;
    value: string;
    label: string;
    isActive?: boolean;
  }
  
  export interface DropdownConfig {
    id: DropdownType;
    name: string;
    description: string;
    items: ConfigItem[];
  }
  
  