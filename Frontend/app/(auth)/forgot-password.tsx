import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ScreenWrapper, Input, Button, Card } from '@/src/components/ui';
import { api, getErrorMessage } from '@/src/services/api';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/src/schemas/auth.schemas';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react-native';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await api.post('/auth/forgot-password', data);
      setSuccessMessage('Password reset instructions have been dispatched if the account exists.');
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenWrapper scrollable className="px-6 justify-between py-6">
      <View>
        <View className="mb-6 mt-4">
          <Text className="text-2xl font-black text-slate-900 dark:text-slate-100">
            Reset Password
          </Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enter your email to receive a password reset token.
          </Text>
        </View>

        {successMessage ? (
          <Card className="bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 mb-6 p-4">
            <View className="flex-row items-center gap-2 mb-2">
              <CheckCircle2 size={20} color="#059669" />
              <Text className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                Request Sent
              </Text>
            </View>
            <Text className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed mb-4">
              {successMessage}
            </Text>
            <Button
              title="Enter Reset Token"
              size="sm"
              onPress={() => router.push('/(auth)/reset-password')}
            />
          </Card>
        ) : (
          <View className="gap-4">
            {errorMessage ? (
              <Card className="bg-rose-50 border-rose-200 dark:bg-rose-950/40 p-3.5 flex-row items-center gap-2">
                <AlertCircle size={18} color="#e11d48" />
                <Text className="text-xs font-medium text-rose-700">{errorMessage}</Text>
              </Card>
            ) : null}

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Registered Email"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon={<Mail size={18} color="#94a3b8" />}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                />
              )}
            />

            <Button
              title="Send Reset Instructions"
              size="lg"
              className="mt-3"
              loading={isLoading}
              onPress={handleSubmit(onSubmit)}
            />
          </View>
        )}
      </View>

      <View className="flex-row items-center justify-center gap-1.5 py-4">
        <Text className="text-xs text-slate-500">Remember your password?</Text>
        <Pressable onPress={() => router.push('/(auth)/login')}>
          <Text className="text-xs font-bold text-primary-600">Back to Sign In</Text>
        </Pressable>
      </View>
    </ScreenWrapper>
  );
}
