import express from 'express';
import * as ticketController from '../controllers/ticketController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

router.use(authenticate);

router.post('/', ticketController.createTicket);
router.get('/', ticketController.getTickets);
router.get('/:id', ticketController.getTicketById);
router.patch('/:id/status', ticketController.updateStatus);
router.patch('/:id/assign', authorize(ROLES.TECHNICIAN, ROLES.ADMINISTRATOR), ticketController.assignTicket);
router.patch('/:id/priority', authorize(ROLES.TECHNICIAN, ROLES.ADMINISTRATOR), ticketController.updatePriority);

export default router;
