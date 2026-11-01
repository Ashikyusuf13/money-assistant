import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface ISession {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;       // SHA-256 hash of the raw refresh token
  tokenFamily: string;     // Family ID for rotation/reuse detection
  expiresAt: Date;
  isRevoked: boolean;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISessionDocument extends ISession, Document {
  _id: mongoose.Types.ObjectId;
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const sessionSchema = new Schema<ISessionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      select: false, // Never returned in queries by default
    },
    tokenFamily: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
    userAgent: {
      type: String,
      maxlength: 500,
    },
    ipAddress: {
      type: String,
      maxlength: 45, // IPv6 max length
    },
  },
  {
    timestamps: true,
  },
);

// ── Indexes ────────────────────────────────────────────────────────────────────
// Used for refresh token lookup (by hash)
sessionSchema.index({ tokenHash: 1 });
// Used to revoke all sessions for a user
sessionSchema.index({ userId: 1, isRevoked: 1 });
// Used to revoke all tokens in a family (reuse detection)
sessionSchema.index({ tokenFamily: 1 });
// TTL index to auto-delete expired sessions
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ── Statics ────────────────────────────────────────────────────────────────────

/**
 * Hash a raw refresh token for storage.
 * Never store the raw token in the database.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

// ── Model ──────────────────────────────────────────────────────────────────────
export const Session = mongoose.model<ISessionDocument>('Session', sessionSchema);
