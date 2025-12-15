import { createEntityHooks, Entity, EntityService } from "@/services/queries/EntityService";
import { QUERY_KEY } from "./constants";
import { Ticket, ticketService } from "@/services/api/ticketService";

// Ensure Ticket type extends the Entity interface
interface TicketType extends Entity, Ticket {}

// Create an adapter for the ticketService that implements EntityService interface
const typedTicketService: EntityService<TicketType> = {
  getAll: (selectedOrg?: string) => ticketService.getTickets(selectedOrg),
  getById: (id: string) => ticketService.getTicket(id),
  create: (data: Omit<TicketType, 'id'>) => ticketService.createTicket(data),
  update: (id: string, data: Partial<Omit<TicketType, 'id'>>) => ticketService.updateTicket(id, data),
  delete: (id: string) => ticketService.deleteTicket(id)
};

// Create ticket-specific hooks using the generic hook factory
export const {
  useEntities: useTickets,
  useEntity: useTicket,
  useCreateEntity: useCreateTicket,
  useUpdateEntity: useUpdateTicket,
  useUpdateEntityOptimistic: useUpdateTicketOptimistic,
  useDeleteEntity: useDeleteTicket,
  useDeleteEntityOptimistic: useDeleteTicketOptimistic
} = createEntityHooks<TicketType>(QUERY_KEY.TICKET, typedTicketService);