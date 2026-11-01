import type { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionTitle?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionTitle,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <View className={`items-center justify-center p-8 text-center ${className}`}>
      {icon && <View className="mb-3 p-4 bg-slate-100 dark:bg-slate-800 rounded-full">{icon}</View>}
      <Text className="text-base font-bold text-slate-800 dark:text-slate-200 text-center mb-1">
        {title}
      </Text>
      <Text className="text-xs text-slate-500 dark:text-slate-400 text-center mb-5 max-w-[280px] leading-relaxed">
        {description}
      </Text>
      {actionTitle && onAction && (
        <Button title={actionTitle} onPress={onAction} size="sm" variant="outline" />
      )}
    </View>
  );
}
