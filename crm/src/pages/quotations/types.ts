import QuotationFormSchema from "./zodSchema";

export type QuotationFormValues = z.infer<typeof QuotationFormSchema>;
