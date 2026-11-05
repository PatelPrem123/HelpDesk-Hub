import { SLAPolicy } from '../models/SLAPolicy.js';
import { AppError } from '../middleware/errorHandler.js';
import { z } from 'zod';

const updatePolicySchema = z.object({
  firstResponseMinutes: z.number().min(5).optional(),
  resolutionHours: z.number().min(1).optional(),
  escalationThresholdPercent: z.number().min(50).max(95).optional(),
  isActive: z.boolean().optional()
});

export async function getSLAPolicies(req, res, next) {
  try {
    const policies = await SLAPolicy.find().sort({ priority: 1 });
    res.status(200).json({
      success: true,
      data: { policies }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSLAPolicy(req, res, next) {
  try {
    const validatedData = updatePolicySchema.parse(req.body);
    const policy = await SLAPolicy.findByIdAndUpdate(
      req.params.id,
      validatedData,
      { new: true, runValidators: true }
    );

    if (!policy) {
      throw new AppError('SLA Policy not found', 404);
    }

    res.status(200).json({
      success: true,
      message: `SLA Policy for ${policy.priority} updated successfully`,
      data: { policy }
    });
  } catch (error) {
    next(error);
  }
}
