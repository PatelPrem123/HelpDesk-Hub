import express from 'express';
import * as commentController from '../controllers/commentController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { uploadAttachment } from '../middleware/uploadMiddleware.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);

router.post('/', commentController.createComment);
router.get('/', commentController.getComments);
router.get('/timeline', commentController.getTicketTimeline);
router.post('/attachments', uploadAttachment.single('file'), commentController.uploadAttachment);

export default router;
