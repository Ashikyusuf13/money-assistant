import type { ReactNode } from 'react';
import { View, Pressable, type ViewStyle } from 'react-native';

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: ViewStyle;
  onPress?: () => void;
}

export function Card({ children, className = '', style, onPress }: CardProps) {
  const baseClasses =
    'bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm';

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={`${baseClasses} active:opacity-80 active:scale-[0.99] ${className}`}
        style={style}
      >
        {children}
      </Pressable>
    );
  }

  return <View className={`${baseClasses} ${className}`} style={style}>{children}</View>;
}
