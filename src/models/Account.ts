import mongoose, { Document, Schema, Types } from 'mongoose';
import { ACCOUNT_TYPES, AccountType, DEFAULT_CURRENCY } from '../constants/accounting';

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface IAccount {
  userId: Types.ObjectId;
  name: string;
  type: AccountType;
  currency: string;
  openingBalance: number; // in integer paise
  currentBalance: number; // in integer paise
  isArchived: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAccountDocument extends IAccount, Document {
  _id: Types.ObjectId;
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const accountSchema = new Schema<IAccountDocument>(
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
    type: {
      type: String,
      enum: ACCOUNT_TYPES,
      default: 'bank',
      required: true,
    },
    currency: {
      type: String,
      default: DEFAULT_CURRENCY,
      uppercase: true,
      trim: true,
    },
    openingBalance: {
      type: Number,
      required: true,
      default: 0,
      validate: {
        validator: (v: number) => Number.isSafeInteger(v),
        message: 'Opening balance must be a safe integer representing paise',
      },
    },
    currentBalance: {
      type: Number,
      required: true,
      default: function (this: IAccountDocument) {
        return this.openingBalance ?? 0;
      },
      validate: {
        validator: (v: number) => Number.isSafeInteger(v),
        message: 'Current balance must be a safe integer representing paise',
      },
    },
    isArchived: {
      type: Boolean,
      default: false,
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

// Compound index to ensure uniqueness of active account name per user
accountSchema.index({ userId: 1, name: 1, isArchived: 1 });
accountSchema.index({ userId: 1, isArchived: 1 });

// ── Model ──────────────────────────────────────────────────────────────────────
export const Account = mongoose.model<IAccountDocument>('Account', accountSchema);
