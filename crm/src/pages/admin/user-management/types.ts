import { User } from "@/services/api/authService";

export type UserWithMetaData = User & {
    createdAt: string,
    updatedAt?: string,
    createdBy?: User
    updatedBy?: User
}