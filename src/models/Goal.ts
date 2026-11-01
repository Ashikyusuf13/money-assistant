import mongoose, { Document, Schema, Types } from 'mongoose';
import {
  GOAL_PRIORITIES,
  GOAL_STATUSES,
  GoalPriority,
  GoalStatus,
  isNonNegativePaise,
  isValidPaiseAmount,
} from '../constants/accounting';

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface IGoal {
  userId: Types.ObjectId;
  name: string;
  targetAmount: number;  // in integer paise, must be > 0
  currentAmount: number; // accumulated in integer paise, default 0
  targetDate: Date;
  priority: GoalPriority;
  category?: string;
  status: GoalStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGoalDocument extends IGoal, Document {
  _id: Types.ObjectId;
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const goalSchema = new Schema<IGoalDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    targetAmount: {
      type: Number,
      required: true,
      validate: {
        validator: isValidPaiseAmount,
        message: 'Target amount must be a positive integer in paise',
      },
    },
    currentAmount: {
      type: Number,
      default: 0,
      validate: {
        validator: isNonNegativePaise,
        message: 'Current amount must be a non-negative integer in paise',
      },
    },
    targetDate: {
      type: Date,
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: GOAL_PRIORITIES,
      default: 'medium',
      required: true,
    },
    category: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    status: {
      type: String,
      enum: GOAL_STATUSES,
      default: 'active',
      index: true,
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

goalSchema.index({ userId: 1, status: 1 });
goalSchema.index({ userId: 1, targetDate: 1 });

// ── Model ──────────────────────────────────────────────────────────────────────
export const Goal = mongoose.model<IGoalDocument>('Goal', goalSchema);
