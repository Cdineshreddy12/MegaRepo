import { LeadSourceOptions, LeadStatusOptions } from "./types";


export const leadSourceOptions: LeadSourceOptions []  = [
    { value: "website", label: "Website" },
    { value: "referral", label: "Referral" },
    { value: "trade_show", label: "Trade Show" },
    { value: "social_media", label: "Social Media" },
    { value: "email_campaign", label: "Email Campaign" },
  ];
  
  export const leadStatusOptions: LeadStatusOptions[] = [
    { value: "new", label: "New" },
    { value: "contacted", label: "Contacted" },
    { value: "qualified", label: "Qualified" },
    { value: "unqualified", label: "Unqualified" },
  ];