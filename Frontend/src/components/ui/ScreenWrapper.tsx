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
  contentContainerStyle?: StyleProp<ViewStyle>;
  contentContainerClassName?: string;
  refreshControl?: ReactElement<RefreshControlProps>;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
}

export function ScreenWrapper({
  children,
  scrollable = false,
  className = '',
  style,
  contentContainerStyle,
  contentContainerClassName = '',
  refreshControl,
  edges = ['top'],
}: ScreenWrapperProps) {
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: '#F8FAFC' }, style]}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, width: '100%' }}
      >
        {scrollable ? (
          <ScrollView
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={[
              { flexGrow: 1, width: '100%' },
              contentContainerStyle,
            ]}
            refreshControl={refreshControl}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1, width: '100%' }, contentContainerStyle]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
