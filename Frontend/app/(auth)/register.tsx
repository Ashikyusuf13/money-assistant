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
import { registerSchema, type RegisterFormData } from '@/src/schemas/auth.schemas';
import { User as UserIcon, Mail, Lock, AlertCircle, Wallet } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register: registerUser, isLoading, error: authError, clearError } = useAuthStore();
  const [formError, setFormError] = useState<string | null>(null);

  // Ambient floating background animations
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
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setFormError(null);
    clearError();
    try {
      await registerUser(data);
      router.replace('/(tabs)');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
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
              paddingTop: insets.top + 16,
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
              <Text style={styles.headerTitle}>Create Account</Text>
              <Text style={styles.headerSubtitle}>Start managing your wealth seamlessly</Text>
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

              {/* Name field */}
              <View style={styles.fieldGap}>
                <Controller
                  control={control}
                  name="name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Full Name"
                      placeholder="e.g. Aditya Sharma"
                      autoCapitalize="words"
                      leftIcon={<UserIcon size={18} color="#7B93C8" />}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.name?.message}
                    />
                  )}
                />
              </View>

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
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
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

              {/* Sign Up button */}
              <Button
                title="Create Account"
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

              {/* Sign In link */}
              <View style={styles.signInRow}>
                <Text style={styles.signInPrompt}>Already have an account?</Text>
                <Pressable onPress={() => router.push('/(auth)/login')}>
                  <Text style={styles.signInLink}> Sign In</Text>
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
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 22,
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
    elevation: 6,
  },
  appName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#BAE6FD',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E0F2FE',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 26,
    shadowColor: '#0A1E4A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 14,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '500',
  },
  fieldGap: {
    marginBottom: 16,
  },
  signUpBtn: {
    backgroundColor: '#1565C0',
    borderRadius: 14,
    marginTop: 8,
    paddingVertical: 14,
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
    color: '#94A3B8',
    fontWeight: '500',
  },
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInPrompt: {
    fontSize: 13,
    color: '#64748B',
  },
  signInLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1565C0',
  },
  ambientOrb1: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#38BDF8',
    opacity: 0.22,
  },
  ambientOrb2: {
    position: 'absolute',
    bottom: -80,
    left: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#0284C7',
    opacity: 0.3,
  },
});
