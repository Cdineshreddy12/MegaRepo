import { TicketsFormValues } from "./types";

export const ticketsFormDefaultValues: TicketsFormValues = {
    type: "pre_sales",
    productName: "",
    oem: "",
    assignedTo: "",
    salesDescription: "",
    effortEstimatedManDays: 0,
    technicalTeamDescription: "",
    typeOfSupport: "standard",
    supportLevel: "l1",
    zone: "east",
    regionOwner: null,
    status: "new",
    accountId: "" // Default value for accountId
  };
  