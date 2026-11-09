import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ScreenWrapper,
  CurrencyInput,
  DatePicker,
} from '@/src/components/ui';
import { useCreateTransaction } from '@/src/hooks/useTransactions';
import { useAccounts } from '@/src/hooks/useAccounts';
import {
  ArrowLeft,
  AlertCircle,
  Wallet,
  Calendar,
  FileText,
  Utensils,
  ShoppingCart,
  Car,
  ShoppingBag,
  Zap,
  Heart,
  Film,
  Package,
} from 'lucide-react-native';
import { formatPaise } from '@/src/utils/currency';

const EXPENSE_CATEGORIES = [
  { id: 'food', label: 'Food & Dining', icon: Utensils, color: '#F59E0B', bg: '#FEF3C7' },
  { id: 'groceries', label: 'Groceries', icon: ShoppingCart, color: '#F97316', bg: '#FFEDD5' },
  { id: 'transport', label: 'Transport', icon: Car, color: '#0284C7', bg: '#E0F2FE' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, color: '#EC4899', bg: '#FCE7F3' },
  { id: 'bills', label: 'Bills & Utilities', icon: Zap, color: '#EAB308', bg: '#FEF9C3' },
  { id: 'health', label: 'Health & Medical', icon: Heart, color: '#EF4444', bg: '#FEE2E2' },
  { id: 'entertainment', label: 'Entertainment', icon: Film, color: '#A855F7', bg: '#F3E8FF' },
  { id: 'others', label: 'Other Expenses', icon: Package, color: '#64748B', bg: '#F1F5F9' },
];

export default function AddExpenseScreen() {
  const router = useRouter();
  const createMutation = useCreateTransaction();
  const { data: accounts } = useAccounts();

  const [paiseAmount, setPaiseAmount] = useState(0);
  const [category, setCategory] = useState('groceries');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [transactionDate, setTransactionDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]!
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (paiseAmount <= 0) {
      setErrorMsg('Please enter an expense amount greater than ₹0.');
      return;
    }

    const accountId = accounts?.[0]?._id || accounts?.[0]?.id;
    if (!accountId) {
      setErrorMsg('Main wallet account not found. Please try again.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        accountId,
        type: 'expense',
        amount: paiseAmount,
        category,
        description: description.trim() || `${category.charAt(0).toUpperCase() + category.slice(1)} Expense`,
        notes: notes.trim() || undefined,
        date: transactionDate,
      });

      router.back();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to record expense');
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
          <Text style={styles.headerEyebrow}>DEBIT ENTRY</Text>
          <Text style={styles.headerTitle}>Add Expense</Text>
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
          label="EXPENSE AMOUNT (₹)"
          paiseValue={paiseAmount}
          onPaiseChange={setPaiseAmount}
          autoFocus
          helperText="Enter the amount to deduct from your monthly balance"
          containerClassName="mb-1"
        />
      </View>

      {/* ── Expense Category Grid ── */}
      <View style={styles.card}>
        <Text style={styles.cardSectionLabel}>SELECT CATEGORY</Text>
        <View style={styles.categoryGrid}>
          {EXPENSE_CATEGORIES.map((cat) => {
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
          <Text style={styles.cardSectionLabel}>EXPENSE DATE</Text>
          <DatePicker
            value={transactionDate}
            onChangeDate={setTransactionDate}
            maxDate={new Date().toISOString().split('T')[0]!}
          />
        </View>

        <Text style={styles.cardSectionLabel}>DESCRIPTION</Text>
        <View style={styles.inputRow}>
          <FileText size={16} color="#EF4444" style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Weekly Supermarket, Petrol, Dinner"
            placeholderTextColor="#94A3B8"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <Text style={[styles.cardSectionLabel, { marginTop: 14 }]}>NOTES (OPTIONAL)</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Receipt reference or additional notes"
            placeholderTextColor="#94A3B8"
            value={notes}
            onChangeText={setNotes}
          />
        </View>
      </View>

      {/* ── Active Main Wallet Info ── */}
      {accounts && accounts.length > 0 && (
        <View style={styles.walletPill}>
          <Wallet size={16} color="#1565C0" />
          <Text style={styles.walletPillText}>
            Debiting from <Text style={{ fontWeight: '800' }}>{accounts[0].name}</Text> (Current: {formatPaise(accounts[0].currentBalance ?? 0)})
          </Text>
        </View>
      )}

      {/* ── Solid Centered Action Button (Request 7) ── */}
      <Pressable
        onPress={handleSubmit}
        disabled={createMutation.isPending}
        style={({ pressed }) => [
          styles.submitBtn,
          pressed && styles.submitBtnPressed,
          createMutation.isPending && styles.submitBtnDisabled,
        ]}
      >
        <Text style={styles.submitBtnLabel}>
          {createMutation.isPending ? 'Saving Expense…' : 'Save Expense'}
        </Text>
      </Pressable>

      <View style={{ height: 36 }} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  header: {
    backgroundColor: '#DC2626',
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
    color: '#FECACA',
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
  submitBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnPressed: {
    backgroundColor: '#B91C1C',
    transform: [{ scale: 0.985 }],
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
