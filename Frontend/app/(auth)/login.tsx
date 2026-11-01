import { useState, useEffect } from 'react';
import { View, Text, Pressable, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ScreenWrapper, Input, Button, Card } from '@/src/components/ui';
import { useAuthStore } from '@/src/store/authStore';
import { loginSchema, type LoginFormData } from '@/src/schemas/auth.schemas';
import { Mail, Lock, AlertCircle, Server } from 'lucide-react-native';
import { ServerConfigModal } from '@/src/components/ServerConfigModal';
import { getCurrentApiBaseUrl } from '@/src/services/api';

export default function LoginScreen() {
  const router = useRouter();
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
    <ScreenWrapper scrollable className="px-6 justify-between py-6">
      <View>
        <View className="mb-6 mt-4">
          <Text className="text-2xl font-black text-slate-900 dark:text-slate-100">
            Welcome Back
          </Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Sign in to access your financial records.
          </Text>
        </View>

        {displayError && (
          <Card className="bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 mb-4 p-3.5 flex-row items-center gap-2.5">
            <AlertCircle size={18} color="#e11d48" />
            <View className="flex-1">
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
        )}

        <View className="gap-4">
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
                leftIcon={<Mail size={18} color="#94a3b8" />}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="Enter your password"
                secureTextEntry
                leftIcon={<Lock size={18} color="#94a3b8" />}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
              />
            )}
          />

          <Pressable
            onPress={() => router.push('/(auth)/forgot-password')}
            className="self-end pt-1"
          >
            <Text className="text-xs font-semibold text-primary-600">
              Forgot Password?
            </Text>
          </Pressable>

          <Button
            title="Sign In"
            size="lg"
            className="mt-3"
            loading={isLoading}
            onPress={handleSubmit(onSubmit)}
          />
        </View>
      </View>

      <View className="py-4 items-center">
        <View className="flex-row items-center justify-center gap-1.5 mb-3">
          <Text className="text-xs text-slate-500">Don't have an account?</Text>
          <Pressable onPress={() => router.push('/(auth)/register')}>
            <Text className="text-xs font-bold text-primary-600">Sign Up</Text>
          </Pressable>
        </View>

        {/* Server IP Pill */}
        <TouchableOpacity
          onPress={() => setShowServerModal(true)}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
        >
          <Server size={12} color="#026ac8" />
          <Text className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
            {currentServerUrl.replace(/^https?:\/\//, '').replace(/\/api\/v1$/, '') || 'money-assistant-backend.vercel.app'}
          </Text>
          <Text className="text-[10px] text-primary-600 font-bold ml-1">
            Change
          </Text>
        </TouchableOpacity>
      </View>

      <ServerConfigModal
        visible={showServerModal}
        onClose={() => setShowServerModal(false)}
      />
    </ScreenWrapper>
  );
}
