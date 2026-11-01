import { Request, Response, NextFunction } from 'express';
import * as aiService from '../services/ai/ai.service';
import { sendSuccess } from '../utils/response';
import { AskAssistantInput } from '../validators/ai.validators';

export async function askAssistant(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { question } = req.body as AskAssistantInput;
    const result = await aiService.askAssistant(userId, question);

    sendSuccess(res, result, 200);
  } catch (err) {
    next(err);
  }
}
