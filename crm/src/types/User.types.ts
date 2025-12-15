export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    role: "super_admin" | "admin" | "user";
    phone?: string;
    department?: string;
    position?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }
  