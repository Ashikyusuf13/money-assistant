import mongoose, { Document, Schema, Types } from 'mongoose';
import { DEFAULT_CURRENCY, isValidPaiseAmount } from '../constants/accounting';

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface ISalaryRevision {
  _id?: Types.ObjectId;
  previousSalary: number; // in integer paise
  revisedSalary: number;  // in integer paise
  effectiveDate: Date;
  notes?: string;
  createdAt: Date;
}

export interface ISalary {
  userId: Types.ObjectId;
  baseMonthlySalary: number; // in integer paise
  currency: string;
  effectiveDate: Date;
  revisions: ISalaryRevision[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISalaryDocument extends ISalary, Document {
  _id: Types.ObjectId;
}

// ── Sub-Schema ─────────────────────────────────────────────────────────────────

const salaryRevisionSchema = new Schema<ISalaryRevision>(
  {
    previousSalary: {
      type: Number,
      required: true,
      validate: {
        validator: isValidPaiseAmount,
        message: 'Previous salary must be a positive integer in paise',
      },
    },
    revisedSalary: {
      type: Number,
      required: true,
      validate: {
        validator: isValidPaiseAmount,
        message: 'Revised salary must be a positive integer in paise',
      },
    },
    effectiveDate: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

// ── Main Schema ────────────────────────────────────────────────────────────────

const salarySchema = new Schema<ISalaryDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One salary record per user
      index: true,
    },
    baseMonthlySalary: {
      type: Number,
      required: true,
      validate: {
        validator: isValidPaiseAmount,
        message: 'Base monthly salary must be a positive integer in paise',
      },
    },
    currency: {
      type: String,
      default: DEFAULT_CURRENCY,
      uppercase: true,
      trim: true,
    },
    effectiveDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    revisions: [salaryRevisionSchema],
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

// ── Model ──────────────────────────────────────────────────────────────────────
export const Salary = mongoose.model<ISalaryDocument>('Salary', salarySchema);
