import type { ReactNode, ReactElement } from 'react';
import {
  View,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenWrapperProps {
  children: ReactNode;
  scrollable?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
  contentContainerClassName?: string;
  refreshControl?: ReactElement<RefreshControlProps>;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
}

export function ScreenWrapper({
  children,
  scrollable = false,
  className = '',
  style,
  contentContainerClassName = '',
  refreshControl,
  edges = ['top'],
}: ScreenWrapperProps) {
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-slate-50 dark:bg-slate-950" style={style}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {scrollable ? (
          <ScrollView
            className={`flex-1 ${className}`}
            style={style}
            contentContainerClassName={`pb-8 ${contentContainerClassName}`}
            refreshControl={refreshControl}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View className={`flex-1 ${className}`} style={style}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
