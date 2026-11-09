import mongoose, { Document, Schema, Types } from 'mongoose';
import {
  isValidPaiseAmount,
  TRANSACTION_TYPES,
  TransactionType,
} from '../constants/accounting';

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface ITransaction {
  userId: Types.ObjectId;
  type: TransactionType;
  amount: number; // in integer paise, must be > 0
  date: Date;
  category: string;
  description: string;
  accountId?: Types.ObjectId;
  toAccountId?: Types.ObjectId; // Destination account for transfers
  originalTransactionId?: Types.ObjectId; // For refunds
  tags: string[];
  notes?: string;
  idempotencyKey?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITransactionDocument extends ITransaction, Document {
  _id: Types.ObjectId;
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const transactionSchema = new Schema<ITransactionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: TRANSACTION_TYPES,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: isValidPaiseAmount,
        message: 'Amount must be a positive integer representing paise',
      },
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
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
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 255,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      index: true,
    },
    toAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: [
        function (this: ITransactionDocument) {
          return this.type === 'transfer' && this.category !== 'savings_transfer';
        },
        'Transfer transactions require a destination toAccountId',
      ],
      validate: {
        validator: function (this: ITransactionDocument, val?: Types.ObjectId) {
          if (this.type === 'transfer' && this.category !== 'savings_transfer') {
            if (!val) return false;
            if (this.accountId && this.accountId.equals(val)) return false;
          }
          return true;
        },
        message: 'Transfer transactions require a destination toAccountId distinct from accountId',
      },
    },
    originalTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    idempotencyKey: {
      type: String,
      trim: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// ── Compound Indexes ───────────────────────────────────────────────────────────

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1, date: -1 });
transactionSchema.index({ userId: 1, accountId: 1, date: -1 });
transactionSchema.index({ userId: 1, isArchived: 1, date: -1 });
transactionSchema.index({ userId: 1, isArchived: 1, type: 1, date: -1 });
transactionSchema.index({ userId: 1, isArchived: 1, category: 1, date: -1 });
transactionSchema.index({ userId: 1, isArchived: 1, type: 1, category: 1, date: -1 });
transactionSchema.index(
  { userId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string' } },
  },
);

// ── Model ──────────────────────────────────────────────────────────────────────
export const Transaction = mongoose.model<ITransactionDocument>('Transaction', transactionSchema);
