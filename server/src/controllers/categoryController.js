import { Category } from '../models/Category.js';
import { AppError } from '../middleware/errorHandler.js';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().optional(),
  subcategories: z.array(z.string().trim()).default([]),
  defaultPriority: z.enum(['Critical', 'High', 'Medium', 'Low']).default('Medium')
});

export async function getCategories(req, res, next) {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req, res, next) {
  try {
    const data = categorySchema.parse(req.body);
    const existing = await Category.findOne({ name: data.name });
    if (existing) {
      throw new AppError('Category with this name already exists', 409);
    }

    const category = await Category.create(data);
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category }
    });
  } catch (error) {
    next(error);
  }
}
