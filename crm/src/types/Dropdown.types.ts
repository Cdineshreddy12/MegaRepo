import { DropdownType } from '@/types/common';

export interface DropdownOption {
  id: string;
  category: DropdownType;
  value: string;
  label: string;
  isActive?: boolean;
  sortOrder?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type DropdownFormValues = Omit<DropdownOption, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>;
export type DropdownUpdatePayload = Partial<DropdownFormValues>;