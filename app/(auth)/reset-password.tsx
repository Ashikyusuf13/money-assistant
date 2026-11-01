import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ScreenWrapper, Input, Button, Card } from '@/src/components/ui';
import { api, getErrorMessage } from '@/src/services/api';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/src/schemas/auth.schemas';
import { KeyRound, Lock, CheckCircle2, AlertCircle } from 'lucide-react-native';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: '', newPassword: '' },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await api.post('/auth/reset-password', data);
      setIsSuccess(true);
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
            Set New Password
          </Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enter the token received in your email and choose a new password.
          </Text>
        </View>

        {isSuccess ? (
          <Card className="bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 p-4 mb-6">
            <View className="flex-row items-center gap-2 mb-2">
              <CheckCircle2 size={20} color="#059669" />
              <Text className="text-sm font-bold text-emerald-800">Password Updated</Text>
            </View>
            <Text className="text-xs text-emerald-700 leading-relaxed mb-4">
              Your password has been successfully reset. You can now sign in with your new credentials.
            </Text>
            <Button
              title="Sign In Now"
              size="sm"
              onPress={() => router.replace('/(auth)/login')}
            />
          </Card>
        ) : (
          <View className="gap-4">
            {errorMessage && (
              <Card className="bg-rose-50 border-rose-200 dark:bg-rose-950/40 p-3.5 flex-row items-center gap-2">
                <AlertCircle size={18} color="#e11d48" />
                <Text className="text-xs font-medium text-rose-700">{errorMessage}</Text>
              </Card>
            )}

            <Controller
              control={control}
              name="token"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Reset Token"
                  placeholder="Paste your reset token"
                  autoCapitalize="none"
                  leftIcon={<KeyRound size={18} color="#94a3b8" />}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.token?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="newPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="New Password"
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  secureTextEntry
                  leftIcon={<Lock size={18} color="#94a3b8" />}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.newPassword?.message}
                />
              )}
            />

            <Button
              title="Confirm New Password"
              size="lg"
              className="mt-3"
              loading={isLoading}
              onPress={handleSubmit(onSubmit)}
            />
          </View>
        )}
      </View>

      <View className="flex-row items-center justify-center gap-1.5 py-4">
        <Text className="text-xs text-slate-500">Back to</Text>
        <Pressable onPress={() => router.push('/(auth)/login')}>
          <Text className="text-xs font-bold text-primary-600">Sign In</Text>
        </Pressable>
      </View>
    </ScreenWrapper>
  );
}
