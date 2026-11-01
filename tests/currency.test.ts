import { describe, it, expect } from 'vitest';
import {
  paiseToRupees,
  rupeesToPaise,
  formatPaise,
  formatTransactionAmount,
} from '../src/utils/currency';

describe('Currency Utilities (Integer Paise)', () => {
  it('converts integer paise to rupees correctly', () => {
    expect(paiseToRupees(100)).toBe(1);
    expect(paiseToRupees(150000)).toBe(1500);
    expect(paiseToRupees(0)).toBe(0);
    expect(paiseToRupees(-5000)).toBe(-50);
  });

  it('converts rupees to safe integer paise correctly', () => {
    expect(rupeesToPaise(1)).toBe(100);
    expect(rupeesToPaise(1500.5)).toBe(150050);
    expect(rupeesToPaise('2500')).toBe(250000);
    expect(rupeesToPaise('0.99')).toBe(99);
  });

  it('formats standard paise to INR string', () => {
    expect(formatPaise(150000)).toBe('₹1,500');
    expect(formatPaise(0)).toBe('₹0');
    expect(formatPaise(-250000)).toBe('-₹2,500');
  });

  it('formats compact paise for lakhs and crores', () => {
    // 5 Lakhs = 5,00,000 * 100 paise = 50,000,000 paise
    expect(formatPaise(50000000, { compact: true })).toBe('₹5.00 L');
    // 1 Crore = 1,00,00,000 * 100 paise = 1,000,000,000 paise
    expect(formatPaise(1000000000, { compact: true })).toBe('₹1.00 Cr');
  });

  it('formats transaction amounts with semantic colors and signs', () => {
    const income = formatTransactionAmount('income', 500000);
    expect(income.text).toBe('+₹5,000');
    expect(income.colorClass).toContain('emerald');

    const expense = formatTransactionAmount('expense', 150000);
    expect(expense.text).toBe('-₹1,500');
    expect(expense.colorClass).toContain('rose');

    const refund = formatTransactionAmount('refund', 80000);
    expect(refund.text).toBe('+₹800');
    expect(refund.colorClass).toContain('cyan');
  });
});
