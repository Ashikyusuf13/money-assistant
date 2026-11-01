/**
 * Financial domain constants and ledger rules.
 * All monetary amounts in the system MUST be represented in integer paise (INR).
 * 1 Rupee = 100 Paise.
 * Floating-point arithmetic for currency calculations is strictly prohibited.
 */

// ── Currency & Denomination ───────────────────────────────────────────────────

export const DEFAULT_CURRENCY = 'INR';
export const PAISE_PER_RUPEE = 100;

/**
 * Validates that an amount is a valid, positive integer representing paise.
 */
export function isValidPaiseAmount(amount: unknown): amount is number {
  return typeof amount === 'number' && Number.isSafeInteger(amount) && amount > 0;
}

/**
 * Validates that an amount is a non-negative integer representing paise (0 or greater).
 */
export function isNonNegativePaise(amount: unknown): amount is number {
  return typeof amount === 'number' && Number.isSafeInteger(amount) && amount >= 0;
}

/**
 * Converts rupees to integer paise.
 * Rounds to nearest integer to avoid any float imprecision.
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * PAISE_PER_RUPEE);
}

/**
 * Formats paise as rupee string for display (e.g. 10050 -> "100.50").
 */
export function paiseToRupeesString(paise: number): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / PAISE_PER_RUPEE);
  const remainingPaise = absPaise % PAISE_PER_RUPEE;
  const formatted = `${rupees}.${remainingPaise.toString().padStart(2, '0')}`;
  return isNegative ? `-${formatted}` : formatted;
}

// ── Transaction Types & Accounting Treatment ─────────────────────────────────

export const TRANSACTION_TYPES = ['income', 'expense', 'transfer', 'refund'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const ACCOUNT_TYPES = [
  'bank',
  'cash',
  'credit_card',
  'savings',
  'investment',
  'other',
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const GOAL_PRIORITIES = ['low', 'medium', 'high'] as const;
export type GoalPriority = (typeof GOAL_PRIORITIES)[number];

export const GOAL_STATUSES = ['active', 'completed', 'archived'] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const GOAL_CONTRIBUTION_TYPES = ['contribution', 'withdrawal'] as const;
export type GoalContributionType = (typeof GOAL_CONTRIBUTION_TYPES)[number];

// ── Predefined Standard Categories ───────────────────────────────────────────

export const STANDARD_INCOME_CATEGORIES = [
  'salary',
  'bonus',
  'freelance',
  'investment_return',
  'interest',
  'gift',
  'refund',
  'other_income',
] as const;

export const STANDARD_EXPENSE_CATEGORIES = [
  'food_dining',
  'groceries',
  'housing_rent',
  'utilities',
  'transportation',
  'fuel',
  'shopping',
  'entertainment',
  'health_medical',
  'education',
  'personal_care',
  'travel',
  'debt_emi',
  'insurance',
  'subscriptions',
  'donations',
  'other_expense',
] as const;

export type StandardIncomeCategory = (typeof STANDARD_INCOME_CATEGORIES)[number];
export type StandardExpenseCategory = (typeof STANDARD_EXPENSE_CATEGORIES)[number];
