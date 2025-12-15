export interface ActivityLog {
    _id: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    details: Record<string, unknown>;
    createdAt: string;
    user: {
        firstName: string;
        lastName: string;
        email: string;
    };  
}
  
export type ActivityLogFormValues = Omit<ActivityLog, '_id' | 'userId' | 'createdAt' | 'user'>;
