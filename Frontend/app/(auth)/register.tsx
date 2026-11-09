import { useState, useEffect } from 'react';
import { View, Text, Pressable, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ScreenWrapper, Input, Button, Card } from '@/src/components/ui';
import { useAuthStore } from '@/src/store/authStore';
import { registerSchema, type RegisterFormData } from '@/src/schemas/auth.schemas';
import { User as UserIcon, Mail, Lock, AlertCircle, Server } from 'lucide-react-native';
import { ServerConfigModal } from '@/src/components/ServerConfigModal';
import { getCurrentApiBaseUrl } from '@/src/services/api';

export default function RegisterScreen() {
  const router = useRouter();
  const { register: registerUser, isLoading, error: authError, clearError } = useAuthStore();
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
    <ScreenWrapper scrollable className="px-6 justify-between py-6">
      <View>
        <View className="mb-6 mt-4">
          <Text className="text-2xl font-black text-slate-900 dark:text-slate-100">
            Create Account
          </Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Start managing your personal finances effectively.
          </Text>
        </View>

        {displayError ? (
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
        ) : null}

        <View className="gap-4">
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Full Name"
                placeholder="e.g. Aditya Sharma"
                autoCapitalize="words"
                leftIcon={<UserIcon size={18} color="#94a3b8" />}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
              />
            )}
          />

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
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                secureTextEntry
                leftIcon={<Lock size={18} color="#94a3b8" />}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
              />
            )}
          />

          <Button
            title="Create Account"
            size="lg"
            className="mt-3"
            loading={isLoading}
            onPress={handleSubmit(onSubmit)}
          />
        </View>
      </View>

      <View className="py-4 items-center">
        <View className="flex-row items-center justify-center gap-1.5 mb-3">
          <Text className="text-xs text-slate-500">Already have an account?</Text>
          <Pressable onPress={() => router.push('/(auth)/login')}>
            <Text className="text-xs font-bold text-primary-600">Sign In</Text>
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
