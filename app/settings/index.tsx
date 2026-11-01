import { useState, useEffect } from 'react';
import { View, Text, Pressable, Switch, Modal, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ScreenWrapper,
  Card,
  Button,
  Input,
  CurrencyInput,
  ConfirmModal,
} from '@/src/components/ui';
import { useAuthStore } from '@/src/store/authStore';
import { useAppLockStore } from '@/src/store/appLockStore';
import { useSalary, useSetupSalary } from '@/src/hooks/useSalary';
import { formatPaise } from '@/src/utils/currency';
import {
  ArrowLeft,
  User,
  Shield,
  KeyRound,
  Fingerprint,
  LogOut,
  ChevronRight,
  Lock,
  Globe,
  Coins,
  X,
  Wallet,
  Pencil,
  CheckCircle2,
  Server,
} from 'lucide-react-native';
import { ServerConfigModal } from '@/src/components/ServerConfigModal';
import { getCurrentApiBaseUrl } from '@/src/services/api';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { data: salary, refetch: refetchSalary } = useSalary();
  const setupSalaryMutation = useSetupSalary();

  const {
    hasPinSet,
    isBiometricAvailable,
    isBiometricEnabled,
    setBiometricEnabled,
    setupPin,
    removePin,
  } = useAppLockStore();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showServerModal, setShowServerModal] = useState(false);
  const [currentServerUrl, setCurrentServerUrl] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Salary Edit Modal
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryAmountPaise, setSalaryAmountPaise] = useState(0);
  const [salarySuccess, setSalarySuccess] = useState(false);

  useEffect(() => {
    if (salary?.baseMonthlySalary) {
      setSalaryAmountPaise(salary.baseMonthlySalary);
    }
  }, [salary]);

  useEffect(() => {
    setCurrentServerUrl(getCurrentApiBaseUrl());
  }, [showServerModal]);

  const handleSaveSalary = async () => {
    if (salaryAmountPaise <= 0) return;
    try {
      await setupSalaryMutation.mutateAsync({
        baseMonthlySalary: salaryAmountPaise,
      });
      setSalarySuccess(true);
      setTimeout(() => {
        setSalarySuccess(false);
        setShowSalaryModal(false);
      }, 800);
      void refetchSalary();
    } catch {}
  };

  const handleSavePin = async () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinError('PIN must be exactly 4 numeric digits.');
      return;
    }
    await setupPin(newPin);
    setShowPinModal(false);
    setNewPin('');
    setPinError(null);
  };

  const handleToggleBiometrics = async (val: boolean) => {
    if (val && !hasPinSet) {
      setPinError('Set a 4-digit PIN first as a backup unlock method.');
      setShowPinModal(true);
      return;
    }
    await setBiometricEnabled(val);
  };

  const handleLogout = async () => {
    await logout();
    setShowLogoutModal(false);
    router.replace('/(auth)/welcome');
  };

  const currentSalary = salary?.baseMonthlySalary ?? 0;

  return (
    <ScreenWrapper scrollable className="px-5 py-4">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-5">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-white border border-slate-300 items-center justify-center active:bg-slate-100"
        >
          <ArrowLeft size={18} color="#0c87eb" />
        </Pressable>
        <Text className="text-base font-extrabold text-slate-900" style={{ color: '#0f172a' }}>
          Profile & Settings
        </Text>
        <View className="w-9" />
      </View>

      {/* User Profile Card */}
      <Card className="flex-row items-center gap-3.5 p-4 mb-4 bg-white border border-slate-200 shadow-sm">
        <View className="w-12 h-12 rounded-2xl bg-primary-100 items-center justify-center border border-primary-200">
          <User size={24} color="#026ac8" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-extrabold text-slate-900" style={{ color: '#0f172a' }}>
            {user?.name || 'Account Holder'}
          </Text>
          <Text className="text-xs font-semibold text-slate-600 mt-0.5">{user?.email}</Text>
        </View>
      </Card>

      {/* ─── Total Monthly Salary Section ──────────────── */}
      <View className="mb-5">
        <Text className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2" style={{ color: '#0f172a' }}>
          Total Monthly Salary
        </Text>

        <Card className="p-4 bg-white border border-slate-200 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-emerald-100 items-center justify-center border border-emerald-200">
                <Wallet size={20} color="#059669" />
              </View>
              <View>
                <Text className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Base Monthly Income
                </Text>
                <Text className="text-xl font-black text-slate-900 mt-0.5" style={{ color: '#0f172a' }}>
                  {currentSalary > 0 ? formatPaise(currentSalary) : 'Not Configured'}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                setSalaryAmountPaise(currentSalary);
                setShowSalaryModal(true);
              }}
              className="flex-row items-center gap-1.5 bg-primary-50 border border-primary-200 px-3 py-2 rounded-xl active:bg-primary-100"
            >
              <Pencil size={13} color="#026ac8" />
              <Text className="text-xs font-bold text-primary-700">
                {currentSalary > 0 ? 'Edit' : 'Set Salary'}
              </Text>
            </Pressable>
          </View>
          <Text className="text-[11px] font-medium text-slate-500 mt-2.5">
            Your monthly salary is used by the Dashboard and Assistant to calculate remaining salary and savings rate.
          </Text>
        </Card>
      </View>

      {/* Security Section */}
      <View className="mb-5">
        <Text className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5" style={{ color: '#0f172a' }}>
          App Security
        </Text>

        <Card className="p-0 overflow-hidden divide-y divide-slate-100 bg-white border border-slate-200 shadow-sm">
          {/* Biometrics Toggle */}
          <View className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center gap-3 flex-1 pr-2">
              <Fingerprint size={20} color="#0c87eb" />
              <View>
                <Text className="text-xs font-bold text-slate-900" style={{ color: '#0f172a' }}>
                  Biometric Unlock
                </Text>
                <Text className="text-[11px] font-medium text-slate-500">
                  {isBiometricAvailable
                    ? 'Use Face ID or Fingerprint on app launch'
                    : 'Biometrics unavailable on this device'}
                </Text>
              </View>
            </View>
            <Switch
              value={isBiometricEnabled}
              onValueChange={handleToggleBiometrics}
              disabled={!isBiometricAvailable}
              trackColor={{ false: '#e2e8f0', true: '#0c87eb' }}
            />
          </View>

          {/* 4-digit PIN setup / change */}
          <Pressable
            onPress={() => {
              setPinError(null);
              setNewPin('');
              setShowPinModal(true);
            }}
            className="flex-row items-center justify-between p-4 active:bg-slate-50"
          >
            <View className="flex-row items-center gap-3">
              <KeyRound size={20} color="#0c87eb" />
              <View>
                <Text className="text-xs font-bold text-slate-900" style={{ color: '#0f172a' }}>
                  {hasPinSet ? 'Change 4-Digit Security PIN' : 'Set 4-Digit Security PIN'}
                </Text>
                <Text className="text-[11px] font-medium text-slate-500">
                  {hasPinSet ? 'PIN protection is active' : 'Not configured'}
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color="#94a3b8" />
          </Pressable>

          {/* Change Password */}
          <Pressable
            onPress={() => router.push('/settings/change-password')}
            className="flex-row items-center justify-between p-4 active:bg-slate-50"
          >
            <View className="flex-row items-center gap-3">
              <Lock size={20} color="#0c87eb" />
              <View>
                <Text className="text-xs font-bold text-slate-900" style={{ color: '#0f172a' }}>
                  Change Account Password
                </Text>
                <Text className="text-[11px] font-medium text-slate-500">
                  Update your cloud authentication password
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color="#94a3b8" />
          </Pressable>
        </Card>
      </View>

      {/* Preferences Section */}
      <View className="mb-6">
        <Text className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5" style={{ color: '#0f172a' }}>
          Preferences
        </Text>

        <Card className="p-0 overflow-hidden divide-y divide-slate-100 bg-white border border-slate-200 shadow-sm">
          <View className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center gap-3">
              <Coins size={20} color="#64748b" />
              <Text className="text-xs font-bold text-slate-900" style={{ color: '#0f172a' }}>
                Display Currency
              </Text>
            </View>
            <Text className="text-xs font-bold text-slate-700">INR (₹)</Text>
          </View>

          <Pressable
            onPress={() => setShowServerModal(true)}
            className="flex-row items-center justify-between p-4 active:bg-slate-50"
          >
            <View className="flex-row items-center gap-3">
              <Server size={20} color="#026ac8" />
              <View>
                <Text className="text-xs font-bold text-slate-900" style={{ color: '#0f172a' }}>
                  Server Endpoint
                </Text>
                <Text className="text-[11px] font-mono text-slate-500">
                  {currentServerUrl || 'http://10.38.224.153:5000/api/v1'}
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color="#94a3b8" />
          </Pressable>
        </Card>
      </View>

      {/* Logout Action */}
      <Button
        title="Log Out of Money Assistant"
        variant="outline"
        size="lg"
        iconLeft={<LogOut size={16} color="#e11d48" />}
        onPress={() => setShowLogoutModal(true)}
        className="border-rose-300 bg-rose-50/50 mb-8"
        textClassName="text-rose-700 font-bold"
      />

      {/* ─── Edit Salary Modal ─────────────────────────── */}
      <Modal visible={showSalaryModal} transparent animationType="slide" statusBarTranslucent>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
          <View
            className="bg-white rounded-t-3xl border-t border-slate-200 px-5 pt-4"
            style={{ backgroundColor: '#ffffff', paddingBottom: Platform.OS === 'ios' ? 34 : 20 }}
          >
            <View className="items-center mb-4">
              <View className="w-10 h-1.5 rounded-full bg-slate-300" />
            </View>

            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-0.5">
                  Monthly Income
                </Text>
                <Text className="text-xl font-black text-slate-900" style={{ color: '#0f172a' }}>
                  Update Total Salary
                </Text>
              </View>
              <Pressable
                onPress={() => setShowSalaryModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
              >
                <X size={16} color="#334155" />
              </Pressable>
            </View>

            <CurrencyInput
              label="TOTAL MONTHLY SALARY"
              paiseValue={salaryAmountPaise}
              onPaiseChange={setSalaryAmountPaise}
              placeholder="e.g. 50,000"
              helperText="Enter your net monthly credited salary"
              containerClassName="mb-5"
            />

            <Button
              title={salarySuccess ? 'Saved Successfully!' : 'Save Monthly Salary'}
              size="lg"
              loading={setupSalaryMutation.isPending}
              onPress={handleSaveSalary}
              iconRight={salarySuccess ? <CheckCircle2 size={18} color="#ffffff" /> : undefined}
            />
          </View>
        </View>
      </Modal>

      {/* ─── PIN Setup Modal ────────────────────────────── */}
      <Modal visible={showPinModal} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center p-5">
          <View className="w-full max-w-sm bg-white rounded-3xl p-6 border border-slate-200 shadow-xl" style={{ backgroundColor: '#ffffff' }}>
            <View className="items-center mb-4">
              <View className="w-12 h-12 rounded-full bg-primary-100 items-center justify-center mb-3">
                <Shield size={24} color="#0c87eb" />
              </View>
              <Text className="text-lg font-black text-slate-900" style={{ color: '#0f172a' }}>
                {hasPinSet ? 'Change 4-Digit PIN' : 'Set 4-Digit PIN'}
              </Text>
              <Text className="text-xs font-medium text-slate-600 text-center mt-1">
                Enter a 4-digit code to quickly unlock Money Assistant.
              </Text>
            </View>

            <Input
              placeholder="••••"
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={newPin}
              onChangeText={setNewPin}
              className="text-center text-2xl tracking-[12px] font-black"
              error={pinError ?? undefined}
              containerClassName="mb-5"
            />

            <View className="flex-row gap-3">
              <Button
                title="Cancel"
                variant="outline"
                className="flex-1 border-slate-300"
                textClassName="text-slate-700"
                onPress={() => setShowPinModal(false)}
              />
              <Button title="Save PIN" className="flex-1" onPress={handleSavePin} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation */}
      <ConfirmModal
        visible={showLogoutModal}
        title="Confirm Log Out"
        message="Are you sure you want to log out of Money Assistant? You will need to sign in again to access your account."
        confirmTitle="Log Out"
        isDestructive
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
      {/* Server Endpoint Modal */}
      <ServerConfigModal
        visible={showServerModal}
        onClose={() => setShowServerModal(false)}
      />
    </ScreenWrapper>
  );
}
