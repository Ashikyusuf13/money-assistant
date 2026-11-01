import mongoose, { Document, Schema } from 'mongoose';

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {
  _id: mongoose.Types.ObjectId;
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const userSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Never returned in queries by default
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        // Never expose password hash
        delete ret['passwordHash'];
        return ret;
      },
    },
  },
);

// Indexes are defined inline via unique:true on the email field above.
// Additional compound indexes can be added here if needed.

// ── Model ──────────────────────────────────────────────────────────────────────
export const User = mongoose.model<IUserDocument>('User', userSchema);
