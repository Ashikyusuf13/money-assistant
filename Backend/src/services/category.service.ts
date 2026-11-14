import { Types } from 'mongoose';
import { CustomCategory, Transaction, Budget } from '../models';

export interface CategoryDto {
  id: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  isCustom: boolean;
}

export const STANDARD_CATEGORIES: CategoryDto[] = [
  { id: 'food', label: 'Food & Dining', icon: 'utensils', color: '#F59E0B', bg: '#FEF3C7', isCustom: false },
  { id: 'groceries', label: 'Groceries', icon: 'shopping-cart', color: '#F97316', bg: '#FFEDD5', isCustom: false },
  { id: 'transport', label: 'Transport', icon: 'car', color: '#0284C7', bg: '#E0F2FE', isCustom: false },
  { id: 'shopping', label: 'Shopping', icon: 'shopping-bag', color: '#EC4899', bg: '#FCE7F3', isCustom: false },
  { id: 'bills', label: 'Bills & Utilities', icon: 'zap', color: '#EAB308', bg: '#FEF9C3', isCustom: false },
  { id: 'health', label: 'Health & Medical', icon: 'heart', color: '#EF4444', bg: '#FEE2E2', isCustom: false },
  { id: 'entertainment', label: 'Entertainment', icon: 'film', color: '#A855F7', bg: '#F3E8FF', isCustom: false },
  { id: 'investment', label: 'Investment', icon: 'trending-up', color: '#0D9488', bg: '#CCFBF1', isCustom: false },
];

const STANDARD_NAMES = new Set([
  'food',
  'dining',
  'groceries',
  'transport',
  'shopping',
  'bills',
  'utilities',
  'health',
  'healthcare',
  'medical',
  'entertainment',
  'investment',
  'investments',
  'salary',
  'bonus',
  'transfer',
  'refund',
  'other',
  'others',
]);

const CUSTOM_PALETTE = [
  { color: '#6366F1', bg: '#EEF2FF' }, // Indigo
  { color: '#8B5CF6', bg: '#F5F3FF' }, // Purple
  { color: '#0D9488', bg: '#CCFBF1' }, // Teal
  { color: '#EC4899', bg: '#FCE7F3' }, // Pink
  { color: '#0284C7', bg: '#E0F2FE' }, // Sky
  { color: '#10B981', bg: '#D1FAE5' }, // Emerald
  { color: '#F59E0B', bg: '#FEF3C7' }, // Amber
  { color: '#D946EF', bg: '#FAE8FF' }, // Fuchsia
  { color: '#06B6D4', bg: '#CFFAFE' }, // Cyan
  { color: '#F97316', bg: '#FFEDD5' }, // Orange
];

function getPaletteForName(name: string): { color: string; bg: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CUSTOM_PALETTE.length;
  return CUSTOM_PALETTE[index]!;
}

export function formatCategoryLabel(name: string): string {
  const clean = name.trim();
  if (clean.length <= 3) {
    return clean.toUpperCase(); // e.g. "LIC", "TV", "OTT", "GYM"
  }
  return clean
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export async function getUserCategories(userId: string): Promise<{
  standard: CategoryDto[];
  custom: CategoryDto[];
  all: CategoryDto[];
}> {
  const userObjectId = new Types.ObjectId(userId);

  // 1. Fetch explicitly stored custom categories
  const savedCustom = await CustomCategory.find({ userId: userObjectId }).sort({ createdAt: 1 });

  // 2. Discover custom categories used in transactions and budgets
  const [txCategories, budgetCategories] = await Promise.all([
    Transaction.distinct('category', { userId: userObjectId, isArchived: false }),
    Budget.distinct('category', { userId: userObjectId }),
  ]);

  const uniqueCustomNames = new Set<string>();

  for (const c of savedCustom) {
    const norm = (c.name || '').trim().toLowerCase();
    if (norm && !STANDARD_NAMES.has(norm)) {
      uniqueCustomNames.add(norm);
    }
  }

  for (const cat of txCategories) {
    const norm = (cat || '').toString().trim().toLowerCase();
    if (norm && !STANDARD_NAMES.has(norm)) {
      uniqueCustomNames.add(norm);
    }
  }

  for (const cat of budgetCategories) {
    const norm = (cat || '').toString().trim().toLowerCase();
    if (norm && !STANDARD_NAMES.has(norm)) {
      uniqueCustomNames.add(norm);
    }
  }

  const custom: CategoryDto[] = Array.from(uniqueCustomNames).map((name) => {
    const palette = getPaletteForName(name);
    return {
      id: name,
      label: formatCategoryLabel(name),
      icon: 'package',
      color: palette.color,
      bg: palette.bg,
      isCustom: true,
    };
  });

  return {
    standard: STANDARD_CATEGORIES,
    custom,
    all: [...STANDARD_CATEGORIES, ...custom],
  };
}

export async function addCustomCategory(userId: string, name: string): Promise<CategoryDto> {
  const userObjectId = new Types.ObjectId(userId);
  const normalized = name.trim().toLowerCase();

  if (!normalized) {
    throw new Error('Category name cannot be empty');
  }

  const palette = getPaletteForName(normalized);

  await CustomCategory.updateOne(
    { userId: userObjectId, name: normalized },
    { $setOnInsert: { userId: userObjectId, name: normalized, color: palette.color } },
    { upsert: true },
  );

  return {
    id: normalized,
    label: formatCategoryLabel(normalized),
    icon: 'package',
    color: palette.color,
    bg: palette.bg,
    isCustom: true,
  };
}

