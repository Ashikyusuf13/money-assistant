import mongoose, { Document, Schema, Types } from 'mongoose';
import {
  GOAL_CONTRIBUTION_TYPES,
  GoalContributionType,
  isValidPaiseAmount,
} from '../constants/accounting';

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface IGoalContribution {
  userId: Types.ObjectId;
  goalId: Types.ObjectId;
  type: GoalContributionType;
  amount: number; // in integer paise, must be > 0
  date: Date;
  fromAccountId?: Types.ObjectId;
  transactionId?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGoalContributionDocument extends IGoalContribution, Document {
  _id: Types.ObjectId;
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const goalContributionSchema = new Schema<IGoalContributionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    goalId: {
      type: Schema.Types.ObjectId,
      ref: 'Goal',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: GOAL_CONTRIBUTION_TYPES,
      default: 'contribution',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: isValidPaiseAmount,
        message: 'Contribution amount must be a positive integer in paise',
      },
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    fromAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
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

goalContributionSchema.index({ goalId: 1, date: -1 });
goalContributionSchema.index({ userId: 1, goalId: 1 });
goalContributionSchema.index({ userId: 1, date: -1 });

// ── Model ──────────────────────────────────────────────────────────────────────
export const GoalContribution = mongoose.model<IGoalContributionDocument>(
  'GoalContribution',
  goalContributionSchema,
);
