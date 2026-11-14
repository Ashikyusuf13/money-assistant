import { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  Platform,
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
import { useCategories } from '@/src/hooks/useCategories';
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
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';
import { formatPaise } from '@/src/utils/currency';

const BASE_EXPENSE_CATEGORIES = [
  { id: 'food', label: 'Food & Dining', icon: Utensils, color: '#F59E0B', bg: '#FEF3C7' },
  { id: 'groceries', label: 'Groceries', icon: ShoppingCart, color: '#F97316', bg: '#FFEDD5' },
  { id: 'transport', label: 'Transport', icon: Car, color: '#0284C7', bg: '#E0F2FE' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, color: '#EC4899', bg: '#FCE7F3' },
  { id: 'bills', label: 'Bills & Utilities', icon: Zap, color: '#EAB308', bg: '#FEF9C3' },
  { id: 'health', label: 'Health & Medical', icon: Heart, color: '#EF4444', bg: '#FEE2E2' },
  { id: 'entertainment', label: 'Entertainment', icon: Film, color: '#A855F7', bg: '#F3E8FF' },
  { id: 'investment', label: 'Investment', icon: TrendingUp, color: '#0D9488', bg: '#CCFBF1' },
];

const OTHER_CATEGORY_ITEM = {
  id: 'other',
  label: 'Other Expenses',
  icon: Package,
  color: '#64748B',
  bg: '#F1F5F9',
};

function getCategoryIconComponent(catName: string) {
  const lower = (catName || '').toLowerCase().trim();
  if (lower.includes('lic') || lower.includes('policy') || lower.includes('insurance') || lower.includes('sip') || lower.includes('invest') || lower.includes('mutual')) return TrendingUp;
  if (lower.includes('food') || lower.includes('dining') || lower.includes('restaurant') || lower.includes('snack') || lower.includes('eats')) return Utensils;
  if (lower.includes('grocery') || lower.includes('groceries') || lower.includes('mart') || lower.includes('veg')) return ShoppingCart;
  if (lower.includes('bill') || lower.includes('eb') || lower.includes('electric') || lower.includes('recharge') || lower.includes('wifi') || lower.includes('current')) return Zap;
  if (lower.includes('shop') || lower.includes('dress') || lower.includes('cloth')) return ShoppingBag;
  if (lower.includes('car') || lower.includes('bike') || lower.includes('fuel') || lower.includes('travel') || lower.includes('petrol') || lower.includes('diesel')) return Car;
  if (lower.includes('med') || lower.includes('health') || lower.includes('doctor') || lower.includes('hospital') || lower.includes('clinic')) return Heart;
  if (lower.includes('movie') || lower.includes('tv') || lower.includes('film') || lower.includes('ott') || lower.includes('cinema')) return Film;
  return Package;
}

export default function AddExpenseScreen() {
  const router = useRouter();
  const createMutation = useCreateTransaction();
  const { data: accounts } = useAccounts();
  const { custom: customCategoriesList = [] } = useCategories();

  const [paiseAmount, setPaiseAmount] = useState(0);
  const [category, setCategory] = useState('groceries');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [transactionDate, setTransactionDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]!
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Combine standard + user's saved custom categories + Other
  const expenseCategories = useMemo(() => {
    const customItems = customCategoriesList.map((c) => ({
      id: c.id,
      label: c.label,
      icon: getCategoryIconComponent(c.id || c.label),
      color: c.color,
      bg: c.bg || '#F1F5F9',
      isCustom: true,
    }));
    return [...BASE_EXPENSE_CATEGORIES, ...customItems, OTHER_CATEGORY_ITEM];
  }, [customCategoriesList]);

  const isOtherSelected = category === 'other' || category === 'others';

  const handleSubmit = async () => {
    if (createMutation.isPending) return;
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

    const trimmedCustom = customCategory.trim().toLowerCase();
    const finalCategory =
      isOtherSelected && trimmedCustom
        ? trimmedCustom
        : isOtherSelected
        ? 'other'
        : category.toLowerCase().trim();

    try {
      await createMutation.mutateAsync({
        accountId,
        type: 'expense',
        amount: paiseAmount,
        category: finalCategory,
        description:
          description.trim() ||
          `${finalCategory.charAt(0).toUpperCase() + finalCategory.slice(1)} Expense`,
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
          {expenseCategories.map((cat) => {
            const isSelected = category.toLowerCase() === cat.id.toLowerCase();
            const Icon = cat.icon;
            return (
              <Pressable
                key={cat.id}
                onPress={() => {
                  setCategory(cat.id);
                  if (cat.id !== 'other' && cat.id !== 'others') {
                    setCustomCategory('');
                  }
                }}
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

        {/* ── Custom Category Input Field (When 'Other' is selected) ── */}
        {isOtherSelected && (
          <View style={styles.customCategorySection}>
            <View style={styles.customCategoryHeader}>
              <Package size={14} color="#64748B" />
              <Text style={styles.customCategoryLabel}>Custom Category Name</Text>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. LIC, TV, Gym, Education, OTT"
                placeholderTextColor="#94A3B8"
                value={customCategory}
                onChangeText={setCustomCategory}
                autoFocus
              />
            </View>
          </View>
        )}
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
        style={[
          styles.submitPressable,
          createMutation.isPending && styles.submitPressableDisabled,
        ]}
      >
        <View style={[
          styles.submitBtnInner,
          createMutation.isPending && styles.submitBtnInnerDisabled,
        ]}>
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
          ) : (
            <TrendingDown size={18} color="#FFFFFF" strokeWidth={2.8} />
          )}
          <Text style={styles.submitBtnLabel}>
            {createMutation.isPending ? 'Saving Expense…' : 'Save Expense'}
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
  customCategorySection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  customCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  customCategoryLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnInnerDisabled: {
    backgroundColor: '#991B1B',
  },
  submitBtnLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
