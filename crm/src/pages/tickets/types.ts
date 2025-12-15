import { z } from "zod";
import TicketsFormSchema from "./zodSchema";

export type TicketsFormValues = z.infer<typeof TicketsFormSchema>