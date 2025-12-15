import { z } from "zod";
import OpportunityFormSchema from "./zodSchema";

export type OpportunityFormValues = z.infer<typeof OpportunityFormSchema>;
