import { Request, Response, NextFunction } from 'express';
import * as categoryService from '../services/category.service';

export async function getCategories(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const result = await categoryService.getUserCategories(userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function createCustomCategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({
        success: false,
        error: { message: 'Category name is required' },
      });
      return;
    }

    const category = await categoryService.addCustomCategory(userId, name);

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (err) {
    next(err);
  }
}

