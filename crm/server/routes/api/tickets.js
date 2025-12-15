import express from 'express';
const router = express.Router();
import ticketsController from '../../controllers/ticketController.js';
import auth from '../../middleware/auth.js';
import tenant from '../../middleware/tenantMiddleware.js';
import { requirePermissions } from '../../middleware/permissions.js';
const { createTicket, getTickets, getTicket, updateTicket, deleteTicket } = ticketsController;

router.post('/', tenant.validateTenant(), requirePermissions(['crm.tickets.create'], false), createTicket);
router.get('/', tenant.validateTenant(), requirePermissions(['crm.tickets.read'], false), getTickets);
router.get('/:id', tenant.validateTenant(), requirePermissions(['crm.tickets.read'], false), getTicket);
router.put('/:id', tenant.validateTenant(), requirePermissions(['crm.tickets.update'], false), updateTicket);
router.delete('/:id', tenant.validateTenant(), requirePermissions(['crm.tickets.delete'], false), deleteTicket);

export default router;