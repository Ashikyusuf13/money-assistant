import { useState, useEffect } from 'react';
import { View, Text, Pressable, Switch, Modal, Platform, KeyboardAvoidingView, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ScreenWrapper,
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
  User as UserIcon,
  Bell,
  Shield,
  KeyRound,
  Fingerprint,
  LogOut,
  ChevronRight,
  Lock,
  Coins,
  X,
  Wallet,
  Pencil,
  CheckCircle2,
  Settings,
  HelpCircle,
  Info,
  Crown,
} from 'lucide-react-native';

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
  } = useAppLockStore();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
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
  
  // User initials
  const initials = user?.name
    ? user.name
        .split(' ')
        .filter(Boolean)
        .map((p) => p[0]?.toUpperCase())
        .slice(0, 2)
        .join('')
    : 'AY';

  return (
    <ScreenWrapper scrollable style={{ backgroundColor: '#F4F7FC', flex: 1 }}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#1565C0" />
        </Pressable>
        <Text style={styles.headerTitle}>Profile &amp; Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ─── Profile Hero Card (Screen 11 Reference) ───── */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>

        <Text style={styles.userName}>{user?.name || 'Ashik Yusuf A'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'ashik@example.com'}</Text>

        <View style={styles.premiumBadge}>
          <Crown size={12} color="#D97706" />
          <Text style={styles.premiumText}>Premium Plan</Text>
        </View>
      </View>

      {/* ─── Monthly Salary Highlight Card ───────────────── */}
      <View style={styles.salaryCard}>
        <View style={styles.salaryHeader}>
          <View style={styles.salaryIconCircle}>
            <Wallet size={20} color="#1565C0" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.salaryLabel}>Total Monthly Salary</Text>
            <Text style={styles.salaryValue}>
              {currentSalary > 0 ? formatPaise(currentSalary) : 'Not Configured'}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              setSalaryAmountPaise(currentSalary);
              setShowSalaryModal(true);
            }}
            style={styles.salaryEditBtn}
          >
            <Pencil size={14} color="#1565C0" />
            <Text style={styles.salaryEditText}>
              {currentSalary > 0 ? 'Edit' : 'Set Salary'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ─── Main Menu Section ───────────────────────────── */}
      <View style={styles.menuContainer}>
        {/* My Profile */}
        <Pressable
          onPress={() => {
            setSalaryAmountPaise(currentSalary);
            setShowSalaryModal(true);
          }}
          style={styles.menuItem}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#EBF3FF' }]}>
              <UserIcon size={18} color="#1565C0" />
            </View>
            <Text style={styles.menuTitle}>My Profile</Text>
          </View>
          <ChevronRight size={18} color="#94A3B8" />
        </Pressable>

        <View style={styles.menuDivider} />

        {/* Notifications */}
        <Pressable
          onPress={() => alert('Notifications are currently enabled.')}
          style={styles.menuItem}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#FDF2F8' }]}>
              <Bell size={18} color="#DB2777" />
            </View>
            <Text style={styles.menuTitle}>Notifications</Text>
          </View>
          <ChevronRight size={18} color="#94A3B8" />
        </Pressable>

        <View style={styles.menuDivider} />

        {/* Security & Privacy */}
        <Pressable
          onPress={() => {
            setPinError(null);
            setNewPin('');
            setShowPinModal(true);
          }}
          style={styles.menuItem}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#ECFDF5' }]}>
              <Shield size={18} color="#059669" />
            </View>
            <View>
              <Text style={styles.menuTitle}>Security &amp; Privacy</Text>
              <Text style={styles.menuSub}>{hasPinSet ? '4-Digit PIN Active' : 'Configure PIN'}</Text>
            </View>
          </View>
          <ChevronRight size={18} color="#94A3B8" />
        </Pressable>

        <View style={styles.menuDivider} />

        {/* Biometrics Toggle Item */}
        <View style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#EEF2FF' }]}>
              <Fingerprint size={18} color="#4F46E5" />
            </View>
            <View>
              <Text style={styles.menuTitle}>Biometric Unlock</Text>
              <Text style={styles.menuSub}>Face ID / Fingerprint</Text>
            </View>
          </View>
          <Switch
            value={isBiometricEnabled}
            onValueChange={handleToggleBiometrics}
            disabled={!isBiometricAvailable}
            trackColor={{ false: '#E2E8F0', true: '#1565C0' }}
          />
        </View>

        <View style={styles.menuDivider} />

        {/* App Preferences */}
        <View style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#F3E8FF' }]}>
              <Settings size={18} color="#9333EA" />
            </View>
            <View>
              <Text style={styles.menuTitle}>App Preferences</Text>
              <Text style={styles.menuSub} numberOfLines={1}>
                Currency (INR ₹), notifications & cache
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#94A3B8" />
        </View>

        <View style={styles.menuDivider} />

        {/* Help & Support */}
        <Pressable
          onPress={() => router.push('/(tabs)/assistant')}
          style={styles.menuItem}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <HelpCircle size={18} color="#D97706" />
            </View>
            <Text style={styles.menuTitle}>Help &amp; Support</Text>
          </View>
          <ChevronRight size={18} color="#94A3B8" />
        </Pressable>

        <View style={styles.menuDivider} />

        {/* About App */}
        <Pressable
          onPress={() => alert('Money Assistant v1.0.0\nYour Smart Finance Companion')}
          style={styles.menuItem}
        >
          <View style={styles.menuLeft}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#F1F5F9' }]}>
              <Info size={18} color="#475569" />
            </View>
            <Text style={styles.menuTitle}>About App</Text>
          </View>
          <ChevronRight size={18} color="#94A3B8" />
        </Pressable>
      </View>

      {/* ─── Log Out Button (Screen 11 Reference) ────────── */}
      <Pressable
        onPress={() => setShowLogoutModal(true)}
        style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
      >
        <LogOut size={18} color="#EF4444" />
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>

      <View style={{ height: 40 }} />

      {/* ─── Edit Salary Modal (Centered) ──────────────── */}
      <Modal
        visible={showSalaryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSalaryModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          {/* Backdrop Tap to Close */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowSalaryModal(false)}
          />

          <View style={styles.modalCenterCard}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 22 }}
            >
              <View style={styles.modalHeaderRow}>
                <View>
                  <Text style={styles.modalSubheading}>MONTHLY INCOME</Text>
                  <Text style={styles.modalHeading}>Update Total Salary</Text>
                </View>
                <Pressable
                  onPress={() => setShowSalaryModal(false)}
                  style={styles.closeBtn}
                >
                  <X size={18} color="#334155" />
                </Pressable>
              </View>

              <CurrencyInput
                label="TOTAL MONTHLY SALARY"
                paiseValue={salaryAmountPaise}
                onPaiseChange={setSalaryAmountPaise}
                placeholder="e.g. 50,000"
                helperText="Enter your net monthly credited salary"
                containerClassName="mb-5"
                autoFocus
              />

              <Button
                title={salarySuccess ? 'Saved Successfully!' : 'Save Monthly Salary'}
                size="lg"
                loading={setupSalaryMutation.isPending}
                onPress={handleSaveSalary}
                iconRight={salarySuccess ? <CheckCircle2 size={18} color="#ffffff" /> : undefined}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── PIN Setup Modal (Centered) ─────────────────── */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPinModal(false)}
      >
        <View style={styles.pinModalOverlay}>
          {/* Backdrop Tap to Close */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowPinModal(false)}
          />

          <View style={styles.pinModalCard}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={styles.pinIconCircle}>
                <Shield size={24} color="#1565C0" />
              </View>
              <Text style={styles.pinModalTitle}>
                {hasPinSet ? 'Change 4-Digit PIN' : 'Set 4-Digit PIN'}
              </Text>
              <Text style={styles.pinModalDesc}>
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

            <View style={{ flexDirection: 'row', gap: 12 }}>
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
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#1565C0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarInitials: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 12,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  premiumText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  salaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  salaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  salaryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EBF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  salaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  salaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  salaryEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EBF3FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  salaryEditText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1565C0',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    paddingRight: 10,
  },
  menuIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  menuSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 68,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutBtnPressed: {
    backgroundColor: '#FCA5A5',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCenterCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalSubheading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 1,
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  pinModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  pinIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EBF3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pinModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  pinModalDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
});
