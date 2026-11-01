import type { ReactNode } from 'react';
import { Pressable, Text, ActivityIndicator, View } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  className?: string;
  textClassName?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  iconLeft,
  iconRight,
  className = '',
  textClassName = '',
}: ButtonProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-slate-100 dark:bg-slate-800 active:bg-slate-200';
      case 'outline':
        return 'bg-transparent border border-slate-300 dark:border-slate-700 active:bg-slate-50';
      case 'destructive':
        return 'bg-rose-600 active:bg-rose-700';
      case 'ghost':
        return 'bg-transparent active:bg-slate-100 dark:active:bg-slate-800';
      case 'primary':
      default:
        return 'bg-primary-600 active:bg-primary-700';
    }
  };

  const getTextClasses = () => {
    switch (variant) {
      case 'secondary':
        return 'text-slate-800 dark:text-slate-100 font-semibold';
      case 'outline':
        return 'text-slate-800 dark:text-slate-200 font-semibold';
      case 'destructive':
        return 'text-white font-semibold';
      case 'ghost':
        return 'text-primary-600 dark:text-primary-400 font-medium';
      case 'primary':
      default:
        return 'text-white font-semibold';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'py-2 px-3 rounded-lg';
      case 'lg':
        return 'py-4 px-6 rounded-2xl';
      case 'md':
      default:
        return 'py-3.5 px-4 rounded-xl';
    }
  };

  const getTextSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-base';
      case 'md':
      default:
        return 'text-sm';
    }
  };

  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`flex-row items-center justify-center ${getSizeClasses()} ${getVariantClasses()} ${
        isDisabled ? 'opacity-50' : 'active:opacity-90 active:scale-[0.99]'
      } ${className}`}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'destructive' ? '#ffffff' : '#0c87eb'}
          size="small"
        />
      ) : (
        <View className="flex-row items-center justify-center gap-2">
          {iconLeft && <View>{iconLeft}</View>}
          <Text className={`${getTextSizeClasses()} ${getTextClasses()} ${textClassName}`}>
            {title}
          </Text>
          {iconRight && <View>{iconRight}</View>}
        </View>
      )}
    </Pressable>
  );
}
