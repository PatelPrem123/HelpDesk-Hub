import express from 'express';
import * as analyticsController from '../controllers/analyticsController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

router.use(authenticate);

// Overview and workload accessible by Technicians & Admins
router.get('/overview', authorize(ROLES.TECHNICIAN, ROLES.ADMINISTRATOR), analyticsController.getOverviewMetrics);
router.get('/workload', authorize(ROLES.TECHNICIAN, ROLES.ADMINISTRATOR), analyticsController.getTechnicianWorkload);

// Export and Audit logs restricted to Administrators
router.get('/export/csv', authorize(ROLES.ADMINISTRATOR), analyticsController.exportCsv);
router.get('/export/xlsx', authorize(ROLES.ADMINISTRATOR), analyticsController.exportExcel);
router.get('/audit-logs', authorize(ROLES.ADMINISTRATOR), analyticsController.getAuditLogs);

export default router;
