import express from 'express';
import * as categoryController from '../controllers/categoryController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

router.get('/', authenticate, categoryController.getCategories);
router.post('/', authenticate, authorize(ROLES.ADMINISTRATOR), categoryController.createCategory);

export default router;
