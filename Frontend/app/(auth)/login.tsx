import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LinearGradient } from 'expo-linear-gradient';
import { Input, Button } from '@/src/components/ui';
import { useAuthStore } from '@/src/store/authStore';
import { loginSchema, type LoginFormData } from '@/src/schemas/auth.schemas';
import { Mail, Lock, AlertCircle, Wallet } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, isLoading, error: authError, clearError } = useAuthStore();
  const [formError, setFormError] = useState<string | null>(null);

  // Background floating orb animations
  const orb1Y = useRef(new Animated.Value(0)).current;
  const orb2Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const float1 = Animated.loop(
      Animated.sequence([
        Animated.timing(orb1Y, {
          toValue: -24,
          duration: 3200,
          useNativeDriver: true,
        }),
        Animated.timing(orb1Y, {
          toValue: 0,
          duration: 3200,
          useNativeDriver: true,
        }),
      ]),
    );

    const float2 = Animated.loop(
      Animated.sequence([
        Animated.timing(orb2Y, {
          toValue: 24,
          duration: 3600,
          useNativeDriver: true,
        }),
        Animated.timing(orb2Y, {
          toValue: 0,
          duration: 3600,
          useNativeDriver: true,
        }),
      ]),
    );

    float1.start();
    float2.start();

    return () => {
      float1.stop();
      float2.stop();
    };
  }, [orb1Y, orb2Y]);

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

      {/* ── Ambient Animated Background Gradient Blobs ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={['#0F2B66', '#1565C0', '#0284C7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View
          style={[
            styles.ambientOrb1,
            { transform: [{ translateY: orb1Y }] },
          ]}
        />
        <Animated.View
          style={[
            styles.ambientOrb2,
            { transform: [{ translateY: orb2Y }] },
          ]}
        />
      </View>

      {/* ── Keyboard Avoiding View + Scrollable Center Body ── */}
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 20,
              paddingBottom: insets.bottom + 24,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Center Container ── */}
          <View style={styles.centerContainer}>
            {/* Header Brand Motif */}
            <View style={styles.brandHeader}>
              <View style={styles.logoCircle}>
                <Wallet size={34} color="#FFFFFF" strokeWidth={1.8} />
              </View>
              <Text style={styles.appName}>Money Assistant</Text>
              <Text style={styles.headerTitle}>Welcome Back</Text>
              <Text style={styles.headerSubtitle}>Sign in to access your finances</Text>
            </View>

            {/* ── White Form Card ── */}
            <View style={styles.card}>
              {/* Error banner */}
              {displayError ? (
                <View style={styles.errorBanner}>
                  <AlertCircle size={18} color="#DC2626" />
                  <Text style={styles.errorText}>{displayError}</Text>
                </View>
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
                      leftIcon={<Mail size={18} color="#7B93C8" />}
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
                      leftIcon={<Lock size={18} color="#7B93C8" />}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.password?.message}
                    />
                  )}
                />
              </View>

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

              {/* Sign Up link (Centered as requested) */}
              <View style={styles.signUpRow}>
                <Text style={styles.signUpPrompt}>Don't have an account?</Text>
                <Pressable onPress={() => router.push('/(auth)/register')}>
                  <Text style={styles.signUpLink}> Create Account</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1565C0',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  centerContainer: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  ambientOrb1: {
    position: 'absolute',
    top: '10%',
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  ambientOrb2: {
    position: 'absolute',
    bottom: '15%',
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  appName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#90CAF9',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#E3F2FD',
    marginTop: 4,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  fieldGap: {
    marginBottom: 14,
  },
  signInBtn: {
    marginTop: 6,
    borderRadius: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'lowercase',
  },
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  signUpPrompt: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  signUpLink: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1565C0',
  },
});
