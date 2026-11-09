import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input, Button, Card } from '@/src/components/ui';
import { useAuthStore } from '@/src/store/authStore';
import { loginSchema, type LoginFormData } from '@/src/schemas/auth.schemas';
import { Mail, Lock, AlertCircle, Server, Wallet } from 'lucide-react-native';
import { ServerConfigModal } from '@/src/components/ServerConfigModal';
import { getCurrentApiBaseUrl } from '@/src/services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BLUE = '#1565C0';
const LIGHT_BLUE = '#1976D2';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, isLoading, error: authError, clearError } = useAuthStore();
  const [formError, setFormError] = useState<string | null>(null);
  const [showServerModal, setShowServerModal] = useState(false);
  const [currentServerUrl, setCurrentServerUrl] = useState('');

  useEffect(() => {
    setCurrentServerUrl(getCurrentApiBaseUrl());
  }, [showServerModal]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setFormError(null);
    clearError();
    try {
      await login(data);
      router.replace('/(tabs)');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Invalid email or password');
    }
  };

  const displayError = formError || authError;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* ── Blue Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        {/* Logo circle */}
        <View style={styles.logoCircle}>
          <Wallet size={32} color="#FFFFFF" strokeWidth={1.8} />
        </View>
        <Text style={styles.appName}>FinancialAI</Text>
        <Text style={styles.headerTitle}>Welcome Back</Text>
        <Text style={styles.headerSubtitle}>Sign in to continue</Text>
      </View>

      {/* ── White card body ── */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>

            {/* Error banner */}
            {displayError ? (
              <Card className="bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 mb-5 p-3.5 flex-row items-center gap-2.5">
                <AlertCircle size={18} color="#e11d48" />
                <View style={styles.flex}>
                  <Text className="text-xs font-medium text-rose-700 dark:text-rose-400">
                    {displayError}
                  </Text>
                  {displayError.toLowerCase().includes('network') && (
                    <Text className="text-[11px] text-rose-600 mt-1">
                      Ensure phone and PC are on the same Wi-Fi. Check the Server IP below.
                    </Text>
                  )}
                </View>
              </Card>
            ) : null}

            {/* Email field */}
            <View style={styles.fieldGap}>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Email Address"
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    leftIcon={<Mail size={18} color={BLUE} />}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.email?.message}
                  />
                )}
              />
            </View>

            {/* Password field */}
            <View style={styles.fieldGap}>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Password"
                    placeholder="Enter your password"
                    secureTextEntry
                    leftIcon={<Lock size={18} color={BLUE} />}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                  />
                )}
              />
            </View>

            {/* Forgot password */}
            <Pressable
              onPress={() => router.push('/(auth)/forgot-password')}
              style={styles.forgotWrapper}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </Pressable>

            {/* Sign In button */}
            <Button
              title="Sign In"
              size="lg"
              loading={isLoading}
              onPress={handleSubmit(onSubmit)}
              className="mt-2"
            />

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Sign Up link */}
            <View style={styles.signUpRow}>
              <Text style={styles.signUpPrompt}>Don't have an account?</Text>
              <Pressable onPress={() => router.push('/(auth)/register')}>
                <Text style={styles.signUpLink}> Sign Up</Text>
              </Pressable>
            </View>

            {/* Server config pill */}
            <View style={styles.pillWrapper}>
              <TouchableOpacity
                onPress={() => setShowServerModal(true)}
                style={styles.serverPill}
              >
                <Server size={12} color={BLUE} />
                <Text style={styles.serverPillText}>
                  {currentServerUrl
                    .replace(/^https?:\/\//, '')
                    .replace(/\/api\/v1$/, '') || 'money-assistant-backend.vercel.app'}
                </Text>
                <Text style={styles.serverPillChange}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ServerConfigModal
        visible={showServerModal}
        onClose={() => setShowServerModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BLUE,
  },
  flex: {
    flex: 1,
  },

  /* Header */
  header: {
    backgroundColor: BLUE,
    alignItems: 'center',
    paddingBottom: 36,
    paddingHorizontal: 24,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  appName: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '400',
  },

  /* White card */
  scrollContent: {
    flexGrow: 1,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
    // subtle shadow on top edge
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 6,
  },

  /* Fields */
  fieldGap: {
    marginBottom: 16,
  },

  /* Forgot password */
  forgotWrapper: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: 2,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: BLUE,
  },

  /* Sign In button override */
  signInBtn: {
    backgroundColor: BLUE,
    height: 52,
    borderRadius: 14,
  },

  /* Divider */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: '#9E9E9E',
    fontWeight: '500',
  },

  /* Sign Up */
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  signUpPrompt: {
    fontSize: 13,
    color: '#757575',
  },
  signUpLink: {
    fontSize: 13,
    fontWeight: '700',
    color: BLUE,
  },

  /* Server pill */
  pillWrapper: {
    alignItems: 'center',
    marginTop: 4,
  },
  serverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F0F4FF',
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  serverPillText: {
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    color: '#546E7A',
    flexShrink: 1,
  },
  serverPillChange: {
    fontSize: 10,
    fontWeight: '700',
    color: BLUE,
    marginLeft: 2,
  },
});
