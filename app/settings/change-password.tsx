import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ScreenWrapper,
  Card,
  Button,
  Input,
} from '@/src/components/ui';
import { api, getErrorMessage } from '@/src/services/api';
import { ArrowLeft, Lock, CheckCircle2, AlertCircle } from 'lucide-react-native';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!currentPassword) {
      setErrorMessage('Current password is required.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setIsSuccess(true);
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenWrapper scrollable className="px-5 py-4">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-5">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 items-center justify-center active:bg-slate-50"
        >
          <ArrowLeft size={18} color="#0c87eb" />
        </Pressable>
        <Text className="text-base font-bold text-slate-800 dark:text-slate-100">
          Change Password
        </Text>
        <View className="w-9" />
      </View>

      {isSuccess ? (
        <Card className="bg-emerald-50 border-emerald-200 p-5 items-center">
          <CheckCircle2 size={32} color="#059669" />
          <Text className="text-base font-bold text-emerald-900 mt-2">
            Password Changed
          </Text>
          <Text className="text-xs text-emerald-700 text-center mt-1 mb-4 leading-relaxed">
            Your account authentication password has been updated securely.
          </Text>
          <Button title="Back to Settings" size="sm" onPress={() => router.back()} />
        </Card>
      ) : (
        <View className="gap-4">
          {errorMessage && (
            <Card className="bg-rose-50 border-rose-200 p-3.5 flex-row items-center gap-2">
              <AlertCircle size={18} color="#e11d48" />
              <Text className="text-xs font-medium text-rose-700 flex-1">
                {errorMessage}
              </Text>
            </Card>
          )}

          <Input
            label="Current Password"
            placeholder="Enter your existing password"
            secureTextEntry
            leftIcon={<Lock size={18} color="#94a3b8" />}
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />

          <Input
            label="New Password"
            placeholder="Min 8 characters"
            secureTextEntry
            leftIcon={<Lock size={18} color="#94a3b8" />}
            value={newPassword}
            onChangeText={setNewPassword}
          />

          <Input
            label="Confirm New Password"
            placeholder="Repeat new password"
            secureTextEntry
            leftIcon={<Lock size={18} color="#94a3b8" />}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <Button
            title="Update Password"
            size="lg"
            className="mt-3"
            loading={isLoading}
            onPress={handleSubmit}
          />
        </View>
      )}
    </ScreenWrapper>
  );
}
