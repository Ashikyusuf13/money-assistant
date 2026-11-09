import { View, ActivityIndicator, Text } from 'react-native';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export function LoadingSpinner({ message, className = '' }: LoadingSpinnerProps) {
  return (
    <View className={`items-center justify-center p-8 ${className}`}>
      <ActivityIndicator size="large" color="#0c87eb" />
      {message ? (
        <Text className="mt-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
          {message}
        </Text>
      ) : null}
    </View>
  );
}
