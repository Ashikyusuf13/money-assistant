import mongoose, { Document, Schema, Types } from 'mongoose';
import { isValidPaiseAmount } from '../constants/accounting';

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface IBudget {
  userId: Types.ObjectId;
  category: string;
  amount: number; // monthly limit in paise, must be > 0
  month: string;  // Format: 'YYYY-MM' (e.g. '2026-10')
  alertThreshold: number; // percentage (1-100), default 80
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBudgetDocument extends IBudget, Document {
  _id: Types.ObjectId;
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const budgetSchema = new Schema<IBudgetDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 1,
      maxlength: 100,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: isValidPaiseAmount,
        message: 'Budget limit amount must be a positive integer in paise',
      },
    },
    month: {
      type: String,
      required: true,
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format'],
      index: true,
    },
    alertThreshold: {
      type: Number,
      default: 80,
      min: 1,
      max: 100,
      validate: {
        validator: (v: number) => Number.isInteger(v),
        message: 'Alert threshold must be an integer percentage between 1 and 100',
      },
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  },
);

// Compound unique index: A user cannot create multiple budgets for the same category in the same month
budgetSchema.index({ userId: 1, category: 1, month: 1 }, { unique: true });
budgetSchema.index({ userId: 1, month: 1 });

// ── Model ──────────────────────────────────────────────────────────────────────
export const Budget = mongoose.model<IBudgetDocument>('Budget', budgetSchema);
