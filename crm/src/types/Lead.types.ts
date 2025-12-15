import {BaseUser, Zone, LeadStatus, Address} from '@/types/common.ts';

export interface Lead {
    _id: string;
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    companyName: string;
    jobTitle?: string;
    industry?: string;
    source?: string;
    status: LeadStatus;
    score?: number;
    notes?: string;
    product: string;
    address: Address;
    zone: Zone;
    assignedTo?: BaseUser;
    createdBy: BaseUser;
    updatedBy: BaseUser;
    createdAt: string;
    updatedAt: string;
  }
  
  export type LeadFormValues = Omit<Lead, '_id' | 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>;
  export type LeadUpdatePayload = Partial<LeadFormValues>