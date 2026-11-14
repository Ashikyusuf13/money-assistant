import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICustomCategory {
  userId: Types.ObjectId;
  name: string; // Stored in lowercase, e.g. "lic", "tv"
  color?: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomCategoryDocument extends ICustomCategory, Document {
  _id: Types.ObjectId;
}

const customCategorySchema = new Schema<ICustomCategoryDocument>(
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
      lowercase: true,
      minlength: 1,
      maxlength: 100,
    },
    color: {
      type: String,
      trim: true,
    },
    icon: {
      type: String,
      trim: true,
      default: 'package',
    },
  },
  {
    timestamps: true,
  },
);

// Ensure uniqueness per user and category name
customCategorySchema.index({ userId: 1, name: 1 }, { unique: true });

export const CustomCategory = mongoose.model<ICustomCategoryDocument>(
  'CustomCategory',
  customCategorySchema,
);

