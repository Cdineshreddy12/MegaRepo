import { z } from "zod";
import AccountFormSchema from "./zodSchema";

export type AccountFormValues = z.infer<typeof AccountFormSchema>;

// Extended interface with additional properties for API responses
export type AccountMetadata = {
    id?: string;
    _id?: string;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string | {
      _id?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      name?: string;
    };
    updatedBy?: string | {
      _id?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      name?: string;
    };
  }

  export type AccountWithMetadata = AccountFormValues & AccountMetadata