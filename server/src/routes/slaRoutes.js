import express from 'express';
import * as slaController from '../controllers/slaController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

router.use(authenticate);

router.get('/', slaController.getSLAPolicies);
router.put('/:id', authorize(ROLES.ADMINISTRATOR), slaController.updateSLAPolicy);

export default router;
