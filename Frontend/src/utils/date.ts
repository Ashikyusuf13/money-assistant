import { format, isToday, isYesterday, parseISO } from 'date-fns';

export function formatDate(dateStringOrDate: string | Date): string {
  try {
    const d = typeof dateStringOrDate === 'string' ? parseISO(dateStringOrDate) : dateStringOrDate;
    if (isNaN(d.getTime())) return String(dateStringOrDate);

    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';

    return format(d, 'dd MMM yyyy');
  } catch {
    return String(dateStringOrDate);
  }
}

export function formatDateTime(dateStringOrDate: string | Date): string {
  try {
    const d = typeof dateStringOrDate === 'string' ? parseISO(dateStringOrDate) : dateStringOrDate;
    if (isNaN(d.getTime())) return String(dateStringOrDate);
    return format(d, 'dd MMM yyyy, hh:mm a');
  } catch {
    return String(dateStringOrDate);
  }
}

export function formatMonthYear(monthStr: string): string {
  // expects "yyyy-MM" e.g. "2026-10"
  try {
    const [year, month] = monthStr.split('-').map(Number);
    if (!year || !month) return monthStr;
    const d = new Date(year, month - 1, 1);
    return format(d, 'MMMM yyyy');
  } catch {
    return monthStr;
  }
}

export function getCurrentMonthStr(): string {
  return format(new Date(), 'yyyy-MM');
}
