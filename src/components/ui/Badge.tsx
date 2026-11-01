import { View, Text } from 'react-native';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'income' | 'expense' | 'transfer' | 'refund' | 'warning' | 'critical';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ label, variant = 'default', size = 'sm', className = '' }: BadgeProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'income':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800';
      case 'expense':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800';
      case 'transfer':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800';
      case 'refund':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-400 dark:border-cyan-800';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800';
      case 'default':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'md':
        return 'px-2.5 py-1 text-xs';
      case 'sm':
      default:
        return 'px-2 py-0.5 text-[10px]';
    }
  };

  return (
    <View
      className={`rounded-full border self-start items-center justify-center ${getVariantStyles()} ${className}`}
    >
      <Text className={`font-semibold capitalize ${getSizeStyles()}`}>
        {label}
      </Text>
    </View>
  );
}
