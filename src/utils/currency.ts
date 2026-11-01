/**
 * Currency utilities for converting and formatting safe integer paise to INR
 * 1 INR = 100 paise
 */

export function paiseToRupees(paise: number): number {
  if (!Number.isFinite(paise)) return 0;
  return paise / 100;
}

export function rupeesToPaise(rupees: number | string): number {
  const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

export function formatPaise(
  paise: number,
  options: {
    showDecimals?: boolean;
    showSign?: boolean;
    compact?: boolean;
  } = {},
): string {
  const { showDecimals = false, showSign = false, compact = false } = options;
  if (!Number.isFinite(paise)) return '₹0';

  const rupees = paiseToRupees(paise);
  const isNegative = rupees < 0;
  const absRupees = Math.abs(rupees);

  if (compact && absRupees >= 10000000) {
    // Crores
    const formatted = (absRupees / 10000000).toFixed(2);
    const sign = isNegative ? '-₹' : showSign && rupees > 0 ? '+₹' : '₹';
    return `${sign}${formatted} Cr`;
  }

  if (compact && absRupees >= 100000) {
    // Lakhs
    const formatted = (absRupees / 100000).toFixed(2);
    const sign = isNegative ? '-₹' : showSign && rupees > 0 ? '+₹' : '₹';
    return `${sign}${formatted} L`;
  }

  const formattedNumber = absRupees.toLocaleString('en-IN', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });

  const sign = isNegative ? '-₹' : showSign && rupees > 0 ? '+₹' : '₹';
  return `${sign}${formattedNumber}`;
}

export function formatTransactionAmount(
  type: 'income' | 'expense' | 'transfer' | 'refund',
  paise: number,
): { text: string; colorClass: string } {
  switch (type) {
    case 'income':
      return {
        text: `+${formatPaise(paise)}`,
        colorClass: 'text-emerald-600 dark:text-emerald-400',
      };
    case 'expense':
      return {
        text: `-${formatPaise(paise)}`,
        colorClass: 'text-rose-600 dark:text-rose-400',
      };
    case 'refund':
      return {
        text: `+${formatPaise(paise)}`,
        colorClass: 'text-cyan-600 dark:text-cyan-400',
      };
    case 'transfer':
    default:
      return {
        text: formatPaise(paise),
        colorClass: 'text-indigo-600 dark:text-indigo-400',
      };
  }
}
