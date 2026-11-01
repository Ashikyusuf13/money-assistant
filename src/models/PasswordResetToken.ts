import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface IPasswordResetToken {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
}

export interface IPasswordResetTokenDocument extends IPasswordResetToken, Document {
  _id: mongoose.Types.ObjectId;
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const passwordResetTokenSchema = new Schema<IPasswordResetTokenDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

passwordResetTokenSchema.index({ tokenHash: 1 });
passwordResetTokenSchema.index({ userId: 1 });
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export function hashResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export const PasswordResetToken = mongoose.model<IPasswordResetTokenDocument>(
  'PasswordResetToken',
  passwordResetTokenSchema,
);
