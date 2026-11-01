import { Request, Response, NextFunction } from 'express';
import { Account } from '../models';
import { sendSuccess } from '../utils/response';
import { Types } from 'mongoose';
import { ConflictError } from '../errors';

export async function listAccounts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const accounts = await Account.find({
      userId: new Types.ObjectId(userId),
      isArchived: false,
    }).sort({ createdAt: 1 });

    const formatted = accounts.map((acc) => ({
      id: acc._id.toString(),
      _id: acc._id.toString(),
      userId: acc.userId.toString(),
      name: acc.name,
      type: acc.type,
      currency: acc.currency,
      openingBalance: acc.openingBalance,
      currentBalance: acc.currentBalance,
      balance: acc.currentBalance,
      createdAt: acc.createdAt,
      updatedAt: acc.updatedAt,
    }));

    sendSuccess(res, formatted, 200);
  } catch (err) {
    next(err);
  }
}

export async function createAccount(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { name, type = 'bank', openingBalance = 0, currency = 'INR', notes } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ success: false, error: { message: 'Account name is required' } });
      return;
    }

    const cleanName = name.trim();
    const existing = await Account.findOne({
      userId: new Types.ObjectId(userId),
      name: cleanName,
      isArchived: false,
    });

    if (existing) {
      throw new ConflictError('An active account with this name already exists.');
    }

    const account = await Account.create({
      userId: new Types.ObjectId(userId),
      name: cleanName,
      type,
      currency: currency.toUpperCase(),
      openingBalance: Math.round(Number(openingBalance) || 0),
      currentBalance: Math.round(Number(openingBalance) || 0),
      notes: notes?.trim(),
    });

    sendSuccess(
      res,
      {
        id: account._id.toString(),
        _id: account._id.toString(),
        userId: account.userId.toString(),
        name: account.name,
        type: account.type,
        currency: account.currency,
        openingBalance: account.openingBalance,
        currentBalance: account.currentBalance,
        balance: account.currentBalance,
      },
      201,
    );
  } catch (err) {
    next(err);
  }
}

export async function updateAccount(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { name, type, currentBalance, notes } = req.body;

    const account = await Account.findOne({
      _id: new Types.ObjectId(id as string),
      userId: new Types.ObjectId(userId),
    });

    if (!account) {
      res.status(404).json({ success: false, error: { message: 'Account not found' } });
      return;
    }

    if (name && typeof name === 'string' && name.trim()) {
      account.name = name.trim();
    }
    if (type) {
      account.type = type;
    }
    if (currentBalance !== undefined) {
      account.currentBalance = Math.round(Number(currentBalance));
    }
    if (notes !== undefined) {
      account.notes = notes?.trim();
    }

    await account.save();

    sendSuccess(
      res,
      {
        id: account._id.toString(),
        _id: account._id.toString(),
        userId: account.userId.toString(),
        name: account.name,
        type: account.type,
        currency: account.currency,
        openingBalance: account.openingBalance,
        currentBalance: account.currentBalance,
        balance: account.currentBalance,
      },
      200,
    );
  } catch (err) {
    next(err);
  }
}

export async function deleteAccount(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const account = await Account.findOne({
      _id: new Types.ObjectId(id as string),
      userId: new Types.ObjectId(userId),
    });

    if (!account) {
      res.status(404).json({ success: false, error: { message: 'Account not found' } });
      return;
    }

    account.isArchived = true;
    await account.save();

    sendSuccess(res, { message: 'Account deleted successfully' }, 200);
  } catch (err) {
    next(err);
  }
}
