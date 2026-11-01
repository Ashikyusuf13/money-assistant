import { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/src/components/ui';
import { useAppLockStore } from '@/src/store/appLockStore';
import { useAuthStore } from '@/src/store/authStore';
import { ShieldCheck, Delete, Fingerprint } from 'lucide-react-native';

export default function AppLockScreen() {
  const router = useRouter();
  const { unlockWithPin, unlockWithBiometrics, isBiometricEnabled, failedAttempts } =
    useAppLockStore();
  const { logout } = useAuthStore();
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto trigger biometrics when screen opens if enabled
  useEffect(() => {
    if (isBiometricEnabled) {
      void handleBiometricAuth();
    }
  }, [isBiometricEnabled]);

  const handleBiometricAuth = async () => {
    const success = await unlockWithBiometrics();
    if (success) {
      router.replace('/(tabs)');
    }
  };

  const handleKeyPress = async (num: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + num;
    setPin(newPin);
    setErrorMsg(null);

    if (newPin.length === 4) {
      const isValid = await unlockWithPin(newPin);
      if (isValid) {
        router.replace('/(tabs)');
      } else {
        setErrorMsg('Incorrect PIN. Please try again.');
        setPin('');
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setErrorMsg(null);
    }
  };

  const handleSignOut = async () => {
    await logout();
    router.replace('/(auth)/welcome');
  };

  return (
    <ScreenWrapper className="px-6 justify-between py-10 items-center">
      {/* Top Header */}
      <View className="items-center mt-6">
        <View className="w-16 h-16 rounded-3xl bg-primary-50 dark:bg-primary-950/60 items-center justify-center mb-3 border border-primary-100 dark:border-primary-900">
          <ShieldCheck size={32} color="#0c87eb" />
        </View>
        <Text className="text-xl font-black text-slate-900 dark:text-slate-100">
          App Locked
        </Text>
        <Text className="text-xs text-slate-500 mt-1 text-center">
          Enter your 4-digit security PIN to access your financial data.
        </Text>

        {/* PIN Dots Indicator */}
        <View className="flex-row items-center gap-4 mt-8 mb-2">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <View
                key={idx}
                className={`w-4 h-4 rounded-full transition-all ${
                  isFilled
                    ? 'bg-primary-600 scale-110'
                    : 'bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700'
                }`}
              />
            );
          })}
        </View>

        {errorMsg && (
          <Text className="text-xs font-semibold text-rose-500 mt-2">
            {errorMsg}
          </Text>
        )}
      </View>

      {/* Number Pad */}
      <View className="w-full max-w-[320px] mb-4">
        <View className="flex-row justify-between mb-4">
          {['1', '2', '3'].map((n) => (
            <KeyButton key={n} label={n} onPress={() => handleKeyPress(n)} />
          ))}
        </View>
        <View className="flex-row justify-between mb-4">
          {['4', '5', '6'].map((n) => (
            <KeyButton key={n} label={n} onPress={() => handleKeyPress(n)} />
          ))}
        </View>
        <View className="flex-row justify-between mb-4">
          {['7', '8', '9'].map((n) => (
            <KeyButton key={n} label={n} onPress={() => handleKeyPress(n)} />
          ))}
        </View>
        <View className="flex-row justify-between items-center">
          {isBiometricEnabled ? (
            <Pressable
              onPress={handleBiometricAuth}
              className="w-20 h-20 rounded-full items-center justify-center active:bg-slate-100 dark:active:bg-slate-800"
            >
              <Fingerprint size={28} color="#0c87eb" />
            </Pressable>
          ) : (
            <View className="w-20 h-20" />
          )}

          <KeyButton label="0" onPress={() => handleKeyPress('0')} />

          <Pressable
            onPress={handleDelete}
            className="w-20 h-20 rounded-full items-center justify-center active:bg-slate-100 dark:active:bg-slate-800"
          >
            <Delete size={24} color="#64748b" />
          </Pressable>
        </View>
      </View>

      {/* Sign Out Fallback */}
      <Pressable onPress={handleSignOut} className="py-2">
        <Text className="text-xs font-semibold text-slate-400 active:text-slate-600">
          Forgot PIN? Sign Out
        </Text>
      </Pressable>
    </ScreenWrapper>
  );
}

function KeyButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="w-20 h-20 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 items-center justify-center shadow-sm active:bg-slate-100 dark:active:bg-slate-800 active:scale-95"
    >
      <Text className="text-2xl font-bold text-slate-800 dark:text-slate-100">
        {label}
      </Text>
    </Pressable>
  );
}
