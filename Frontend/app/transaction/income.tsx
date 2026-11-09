import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  Platform,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ScreenWrapper,
  CurrencyInput,
  DatePicker,
} from '@/src/components/ui';
import { useCreateTransaction } from '@/src/hooks/useTransactions';
import { useAccounts } from '@/src/hooks/useAccounts';
import { useSalary, useSetupSalary } from '@/src/hooks/useSalary';
import {
  ArrowLeft,
  AlertCircle,
  Wallet,
  Calendar,
  FileText,
  Briefcase,
  TrendingUp,
  CircleDollarSign,
  Building2,
  Gift,
  Coins,
  CheckCircle2,
} from 'lucide-react-native';
import { formatPaise } from '@/src/utils/currency';

const INCOME_CATEGORIES = [
  { id: 'salary', label: 'Salary', icon: Briefcase, color: '#10B981', bg: '#ECFDF5' },
  { id: 'freelance', label: 'Freelance', icon: TrendingUp, color: '#0284C7', bg: '#F0F9FF' },
  { id: 'business', label: 'Business', icon: Building2, color: '#6366F1', bg: '#EEF2FF' },
  { id: 'investments', label: 'Investments', icon: Coins, color: '#F59E0B', bg: '#FFFBEB' },
  { id: 'bonus', label: 'Bonus / Gift', icon: Gift, color: '#EC4899', bg: '#FDF2F8' },
  { id: 'income', label: 'Other Income', icon: CircleDollarSign, color: '#14B8A6', bg: '#F0FDFA' },
];

export default function AddIncomeScreen() {
  const router = useRouter();
  const createMutation = useCreateTransaction();
  const setupSalaryMutation = useSetupSalary();
  const { data: salary } = useSalary();
  const { data: accounts } = useAccounts();

  const [paiseAmount, setPaiseAmount] = useState(0);
  const [category, setCategory] = useState('salary');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [syncSalary, setSyncSalary] = useState(true);
  const [transactionDate, setTransactionDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]!
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isSubmitting = createMutation.isPending || setupSalaryMutation.isPending;

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setErrorMsg(null);
    if (paiseAmount <= 0) {
      setErrorMsg('Please enter an income amount greater than ₹0.');
      return;
    }

    const accountId = accounts?.[0]?._id || accounts?.[0]?.id;
    if (!accountId) {
      setErrorMsg('Wallet account not found. Please refresh and try again.');
      return;
    }

    try {
      // 1. Record the income transaction
      await createMutation.mutateAsync({
        accountId,
        type: 'income',
        amount: paiseAmount,
        category,
        description: description.trim() || `${category.charAt(0).toUpperCase() + category.slice(1)} Income`,
        notes: notes.trim() || undefined,
        date: transactionDate,
      });

      // 2. If syncSalary is true, add this new income to the user's existing profile monthly salary!
      if (syncSalary) {
        const currentSalary = salary?.baseMonthlySalary ?? 0;
        const updatedSalary = currentSalary + paiseAmount;
        await setupSalaryMutation.mutateAsync({
          baseMonthlySalary: updatedSalary,
        });
      }

      router.back();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to record income');
    }
  };

  return (
    <ScreenWrapper scrollable style={styles.wrapper}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerEyebrow}>CREDIT ENTRY</Text>
          <Text style={styles.headerTitle}>Add Income</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Error Banner ── */}
      {errorMsg ? (
        <View style={styles.errorBox}>
          <AlertCircle size={16} color="#DC2626" />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* ── Amount Input Card ── */}
      <View style={styles.card}>
        <CurrencyInput
          label="INCOME AMOUNT (₹)"
          paiseValue={paiseAmount}
          onPaiseChange={setPaiseAmount}
          autoFocus
          helperText="Enter the credited income amount"
          containerClassName="mb-1"
        />
      </View>

      {/* ── Income Category Grid ── */}
      <View style={styles.card}>
        <Text style={styles.cardSectionLabel}>SELECT INCOME SOURCE</Text>
        <View style={styles.categoryGrid}>
          {INCOME_CATEGORIES.map((cat) => {
            const isSelected = category === cat.id;
            const Icon = cat.icon;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setCategory(cat.id)}
                style={[
                  styles.categoryChip,
                  isSelected && { borderColor: cat.color, backgroundColor: cat.bg },
                ]}
              >
                <View
                  style={[
                    styles.categoryIconCircle,
                    { backgroundColor: isSelected ? cat.color : cat.bg },
                  ]}
                >
                  <Icon size={16} color={isSelected ? '#FFFFFF' : cat.color} />
                </View>
                <Text
                  style={[
                    styles.categoryLabel,
                    isSelected && { color: cat.color, fontWeight: '800' },
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Date & Details Card ── */}
      <View style={styles.card}>
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.cardSectionLabel}>DATE CREDITED</Text>
          <DatePicker
            value={transactionDate}
            onChangeDate={setTransactionDate}
            maxDate={new Date().toISOString().split('T')[0]!}
          />
        </View>

        <Text style={styles.cardSectionLabel}>DESCRIPTION</Text>
        <View style={styles.inputRow}>
          <FileText size={16} color="#0284C7" style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Monthly Salary, Freelance project"
            placeholderTextColor="#94A3B8"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <Text style={[styles.cardSectionLabel, { marginTop: 14 }]}>NOTES (OPTIONAL)</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Additional details or reference invoice"
            placeholderTextColor="#94A3B8"
            value={notes}
            onChangeText={setNotes}
          />
        </View>
      </View>

      {/* ── Profile Sync Toggle ── */}
      <View style={styles.syncCard}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <View style={styles.rowCenter}>
            <CheckCircle2 size={16} color="#10B981" />
            <Text style={styles.syncTitle}>Add to Profile Monthly Salary</Text>
          </View>
          <Text style={styles.syncDesc}>
            Adds this amount to your monthly salary ({formatPaise(salary?.baseMonthlySalary ?? 0)} + {formatPaise(paiseAmount)} = {formatPaise((salary?.baseMonthlySalary ?? 0) + paiseAmount)})
          </Text>
        </View>
        <Switch
          value={syncSalary}
          onValueChange={setSyncSalary}
          trackColor={{ false: '#CBD5E1', true: '#10B981' }}
        />
      </View>

      {/* ── Active Main Wallet Info ── */}
      {accounts && accounts.length > 0 && (
        <View style={styles.walletPill}>
          <Wallet size={16} color="#1565C0" />
          <Text style={styles.walletPillText}>
            Crediting to <Text style={{ fontWeight: '800' }}>{accounts[0].name}</Text> (Current: {formatPaise(accounts[0].currentBalance ?? 0)})
          </Text>
        </View>
      )}

      {/* ── Solid Centered Action Button (Request 7) ── */}
      <Pressable
        onPress={handleSubmit}
        disabled={isSubmitting}
        style={[
          styles.submitPressable,
          isSubmitting && styles.submitPressableDisabled,
        ]}
      >
        <View style={[
          styles.submitBtnInner,
          isSubmitting && styles.submitBtnInnerDisabled,
        ]}>
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
          ) : (
            <TrendingUp size={18} color="#FFFFFF" strokeWidth={2.8} />
          )}
          <Text style={styles.submitBtnLabel}>
            {isSubmitting ? 'Recording Income…' : 'Record Income'}
          </Text>
        </View>
      </Pressable>

      <View style={{ height: 60 }} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  header: {
    backgroundColor: '#059669',
    paddingTop: Platform.OS === 'ios' ? 0 : 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A7F3D0',
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    minWidth: '47%',
    flexGrow: 1,
  },
  categoryIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  syncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  syncTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  syncDesc: {
    fontSize: 11,
    color: '#047857',
    lineHeight: 16,
  },
  walletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  walletPillText: {
    fontSize: 12,
    color: '#1E40AF',
  },
  // Solid Button with centered text (Request 7)
  submitPressable: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  submitPressableDisabled: {
    opacity: 0.7,
  },
  submitBtnInner: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnInnerDisabled: {
    backgroundColor: '#065F46',
  },
  submitBtnLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
