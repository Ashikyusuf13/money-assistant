import type { ReactNode, ReactElement } from 'react';
import {
  View,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  type RefreshControlProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenWrapperProps {
  children: ReactNode;
  scrollable?: boolean;
  className?: string;
  contentContainerClassName?: string;
  refreshControl?: ReactElement<RefreshControlProps>;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
}

export function ScreenWrapper({
  children,
  scrollable = false,
  className = '',
  contentContainerClassName = '',
  refreshControl,
  edges = ['top'],
}: ScreenWrapperProps) {
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-slate-50 dark:bg-slate-950">
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {scrollable ? (
          <ScrollView
            className={`flex-1 ${className}`}
            contentContainerClassName={`pb-8 ${contentContainerClassName}`}
            refreshControl={refreshControl}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View className={`flex-1 ${className}`}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
