import { useState, useEffect } from 'react';
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
  CategoryPicker,
} from '@/src/components/ui';
import { useCreateTransaction } from '@/src/hooks/useTransactions';
import { useAccounts } from '@/src/hooks/useAccounts';
import { TransactionType } from '@/src/types/api';
import {
  ArrowLeft,
  AlertCircle,
  Wallet,
  Building2,
  Calendar,
  FileText,
  ArrowRightLeft,
  RefreshCw,
} from 'lucide-react-native';
import { formatPaise } from '@/src/utils/currency';

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPES: Array<{ label: string; value: TransactionType; icon: string }> = [
  { label: 'Expense', value: 'expense', icon: '📤' },
  { label: 'Income',  value: 'income',  icon: '📥' },
  { label: 'Transfer', value: 'transfer', icon: '↔️' },
  { label: 'Refund',  value: 'refund',  icon: '↩️' },
];

const TYPE_COLORS: Record<TransactionType, string> = {
  expense: '#F44336',
  income:  '#4CAF50',
  transfer: '#2196F3',
  refund:  '#00BCD4',
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AddTransactionScreen() {
  const router = useRouter();
  const createMutation = useCreateTransaction();
  const { data: accounts, isLoading: isAccountsLoading } = useAccounts();

  const [type, setType] = useState<TransactionType>('expense');
  const [paiseAmount, setPaiseAmount] = useState(0);
  const [category, setCategory] = useState('groceries');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedToAccountId, setSelectedToAccountId] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]!
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Set default accounts when accounts data loads
  useEffect(() => {
    if (accounts && accounts.length > 0) {
      if (!selectedAccountId) {
        setSelectedAccountId(accounts[0]?._id || accounts[0]?.id || '');
      }
      if (!selectedToAccountId && accounts.length > 1) {
        setSelectedToAccountId(accounts[1]?._id || accounts[1]?.id || '');
      }
    }
  }, [accounts]);

  const handleSubmit = async () => {
    setErrorMsg(null);

    if (paiseAmount <= 0) {
      setErrorMsg('Please enter an amount greater than ₹0.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please enter a description.');
      return;
    }

    if (type === 'transfer') {
      if (!selectedAccountId || !selectedToAccountId) {
        setErrorMsg('Please select both source and destination accounts.');
        return;
      }
      if (selectedAccountId === selectedToAccountId) {
        setErrorMsg('Source and destination accounts must be different for transfers.');
        return;
      }
    }

    try {
      await createMutation.mutateAsync({
        type,
        amount: paiseAmount,
        category: type === 'transfer' ? 'transfer' : category,
        description: description.trim(),
        accountId: selectedAccountId || undefined,
        toAccountId: type === 'transfer' ? selectedToAccountId : undefined,
        notes: notes.trim() || undefined,
        date: new Date(transactionDate).toISOString(),
      });
      router.back();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save transaction');
    }
  };

  const activeColor = TYPE_COLORS[type];

  const submitLabel =
    type === 'transfer' ? 'Transfer Funds'
    : type === 'income' ? 'Record Income'
    : type === 'refund' ? 'Record Refund'
    : 'Save Expense';

  return (
    <ScreenWrapper scrollable style={styles.wrapper}>
      {/* ── Blue Gradient Header ── */}
      <View style={styles.gradientHeader}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
        >
          <ArrowLeft size={20} color="#ffffff" />
        </Pressable>
        <Text style={styles.headerTitle}>Add Transaction</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Type Selector ── */}
      <View style={styles.typeTabsContainer}>
        <View style={styles.typeTabs}>
          {TYPES.map((t) => {
            const isSelected = type === t.value;
            const color = TYPE_COLORS[t.value];
            return (
              <Pressable
                key={t.value}
                onPress={() => setType(t.value)}
                style={[styles.typeTab, isSelected && { borderBottomColor: color, borderBottomWidth: 2.5 }]}
              >
                <Text style={styles.typeTabEmoji}>{t.icon}</Text>
                <Text style={[styles.typeTabLabel, isSelected && { color, fontWeight: '800' }]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Error Banner ── */}
      {errorMsg ? (
        <View style={styles.errorBanner}>
          <AlertCircle size={16} color="#C62828" />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* ── Main Form Card ── */}
      <View style={styles.formCard}>
        <Text style={styles.formCardLabel}>Enter transaction details</Text>

        {/* Amount */}
        <View style={styles.amountBlock}>
          <CurrencyInput
            label="Amount"
            paiseValue={paiseAmount}
            onPaiseChange={setPaiseAmount}
          />
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Category Grid (hidden for transfer) */}
        {type !== 'transfer' && (
          <>
            <Text style={styles.fieldLabel}>Category</Text>
            <CategoryPicker
              label=""
              selectedCategory={category}
              onSelectCategory={setCategory}
            />
            <View style={styles.divider} />
          </>
        )}

        {/* Date */}
        <Text style={styles.fieldLabel}>Date</Text>
        <DatePicker
          label=""
          value={transactionDate}
          onChangeDate={setTransactionDate}
          mode="past"
        />

        <View style={styles.divider} />

        {/* Description */}
        <Text style={styles.fieldLabel}>Description</Text>
        <View style={styles.inputRow}>
          <FileText size={16} color="#7B93C8" style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            placeholder={
              type === 'transfer'
                ? 'e.g. Moved savings to bank account'
                : type === 'income'
                ? 'e.g. Freelance project payment'
                : 'e.g. Organic Produce from Market'
            }
            placeholderTextColor="#B0C1E0"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={styles.divider} />

        {/* Notes */}
        <Text style={styles.fieldLabel}>Notes <Text style={styles.optionalTag}>(Optional)</Text></Text>
        <View style={styles.inputRow}>
          <FileText size={16} color="#7B93C8" style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="Additional context or bill reference"
            placeholderTextColor="#B0C1E0"
            value={notes}
            onChangeText={setNotes}
          />
        </View>
      </View>

      {/* ── Account Selectors ── */}
      {accounts && accounts.length > 0 && (
        <View style={styles.accountCard}>
          <Text style={styles.accountSectionLabel}>
            {type === 'transfer' ? 'From Account (Source)' : 'Account'}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.accountScroll}
          >
            {accounts.map((acc) => {
              const id = acc._id || acc.id || '';
              const isSelected = selectedAccountId === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setSelectedAccountId(id)}
                  style={[styles.accountChip, isSelected && styles.accountChipActive]}
                >
                  {acc.type === 'bank' ? (
                    <Building2 size={14} color={isSelected ? '#ffffff' : '#5C7099'} />
                  ) : (
                    <Wallet size={14} color={isSelected ? '#ffffff' : '#5C7099'} />
                  )}
                  <View>
                    <Text style={[styles.accountName, isSelected && styles.accountNameActive]}>
                      {acc.name}
                    </Text>
                    <Text style={[styles.accountBalance, isSelected && styles.accountBalanceActive]}>
                      {formatPaise(acc.currentBalance ?? acc.balance ?? 0)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Destination Account (transfer only) */}
      {type === 'transfer' && accounts && accounts.length > 0 && (
        <View style={styles.accountCard}>
          <Text style={styles.accountSectionLabel}>To Account (Destination)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.accountScroll}
          >
            {accounts.map((acc) => {
              const id = acc._id || acc.id || '';
              const isSelected = selectedToAccountId === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setSelectedToAccountId(id)}
                  style={[styles.accountChip, isSelected && styles.accountChipDestActive]}
                >
                  {acc.type === 'bank' ? (
                    <Building2 size={14} color={isSelected ? '#ffffff' : '#5C7099'} />
                  ) : (
                    <Wallet size={14} color={isSelected ? '#ffffff' : '#5C7099'} />
                  )}
                  <View>
                    <Text style={[styles.accountName, isSelected && styles.accountNameActive]}>
                      {acc.name}
                    </Text>
                    <Text style={[styles.accountBalance, isSelected && styles.accountBalanceActive]}>
                      {formatPaise(acc.currentBalance ?? acc.balance ?? 0)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Submit Button ── */}
      <Pressable
        onPress={handleSubmit}
        disabled={createMutation.isPending}
        style={({ pressed }) => [
          styles.submitBtn,
          { backgroundColor: activeColor },
          pressed && styles.submitBtnPressed,
          createMutation.isPending && styles.submitBtnDisabled,
        ]}
      >
        <Text style={styles.submitBtnLabel}>
          {createMutation.isPending ? 'Saving…' : submitLabel}
        </Text>
      </Pressable>

      <View style={{ height: 32 }} />
    </ScreenWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#F0F4FF',
  },

  // Header
  gradientHeader: {
    backgroundColor: '#1565C0',
    paddingTop: Platform.OS === 'ios' ? 0 : 8,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },

  // Type tabs
  typeTabsContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2FF',
    marginBottom: 16,
  },
  typeTabs: {
    flexDirection: 'row',
  },
  typeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 3,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  typeTabEmoji: {
    fontSize: 18,
  },
  typeTabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9EB3D8',
  },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#C62828',
  },

  // Form Card
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    paddingHorizontal: 16,
    paddingVertical: 18,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  formCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7B93C8',
    letterSpacing: 0.5,
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  amountBlock: {
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEF2FF',
    marginVertical: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5C7099',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionalTag: {
    fontWeight: '400',
    color: '#9EB3D8',
    textTransform: 'none',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F8FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#DDE5F4',
    gap: 8,
  },
  inputIcon: {
    marginRight: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#0D1B3E',
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
  },

  // Account cards
  accountCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 16,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  accountSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7B93C8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  accountScroll: {
    gap: 10,
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#DDE5F4',
    backgroundColor: '#F5F8FF',
  },
  accountChipActive: {
    backgroundColor: '#1565C0',
    borderColor: '#1565C0',
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  accountChipDestActive: {
    backgroundColor: '#5C6BC0',
    borderColor: '#5C6BC0',
    shadowColor: '#5C6BC0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  accountName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D1B3E',
  },
  accountNameActive: {
    color: '#ffffff',
  },
  accountBalance: {
    fontSize: 10,
    fontWeight: '500',
    color: '#7B93C8',
  },
  accountBalanceActive: {
    color: 'rgba(255,255,255,0.75)',
  },

  // Submit
  submitBtn: {
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  submitBtnDisabled: {
    opacity: 0.55,
  },
  submitBtnLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});
