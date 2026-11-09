import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  RefreshControl,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  StyleSheet,
} from 'react-native';
import {
  ScreenWrapper,
  Button,
  CurrencyInput,
  CategoryPicker,
  SkeletonList,
  EmptyState,
  ConfirmModal,
} from '@/src/components/ui';
import {
  useBudgets,
  useBudgetAlerts,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
} from '@/src/hooks/useBudgets';
import { useSalary } from '@/src/hooks/useSalary';
import { useDashboard } from '@/src/hooks/useDashboard';
import { formatPaise } from '@/src/utils/currency';
import { formatMonthYear, getCurrentMonthStr } from '@/src/utils/date';
import { Budget } from '@/src/types/api';
import {
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  PieChart,
  Calendar,
  Wallet,
  Utensils,
  ShoppingCart,
  Car,
  ShoppingBag,
  Zap,
  Heart,
  Film,
  Briefcase,
  BookOpen,
  Package,
  TrendingUp,
} from 'lucide-react-native';

// ─── Category icon helpers ─────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { color: string; bg: string }> = {
  groceries:     { color: '#EA580C', bg: '#FFEDD5' },
  food:          { color: '#D97706', bg: '#FEF3C7' },
  transport:     { color: '#0284C7', bg: '#E0F2FE' },
  shopping:      { color: '#DB2777', bg: '#FCE7F3' },
  entertainment: { color: '#9333EA', bg: '#F3E8FF' },
  health:        { color: '#DC2626', bg: '#FEE2E2' },
  utilities:     { color: '#CA8A04', bg: '#FEF9C3' },
  education:     { color: '#1565C0', bg: '#DBEAFE' },
  travel:        { color: '#0D9488', bg: '#CCFBF1' },
  investment:    { color: '#0D9488', bg: '#CCFBF1' },
  other:         { color: '#64748B', bg: '#F1F5F9' },
};

function getCategoryMeta(cat: string) {
  return CATEGORY_META[cat.toLowerCase()] ?? { color: '#64748B', bg: '#F1F5F9' };
}

function renderBudgetCategoryIcon(category: string, color: string, size = 20) {
  const cat = (category || '').toLowerCase();
  switch (cat) {
    case 'food':
      return <Utensils size={size} color={color} strokeWidth={2.2} />;
    case 'groceries':
      return <ShoppingCart size={size} color={color} strokeWidth={2.2} />;
    case 'transport':
      return <Car size={size} color={color} strokeWidth={2.2} />;
    case 'shopping':
      return <ShoppingBag size={size} color={color} strokeWidth={2.2} />;
    case 'bills':
    case 'utilities':
      return <Zap size={size} color={color} strokeWidth={2.2} />;
    case 'health':
      return <Heart size={size} color={color} strokeWidth={2.2} />;
    case 'entertainment':
      return <Film size={size} color={color} strokeWidth={2.2} />;
    case 'education':
      return <BookOpen size={size} color={color} strokeWidth={2.2} />;
    case 'travel':
      return <Car size={size} color={color} strokeWidth={2.2} />;
    case 'investment':
      return <TrendingUp size={size} color={color} strokeWidth={2.2} />;
    default:
      return <Package size={size} color={color} strokeWidth={2.2} />;
  }
}

// ─── Circular progress indicator ──────────────────────────────────────────────
function DonutProgress({
  percentage,
  size = 72,
}: {
  percentage: number;
  size?: number;
}) {
  const clamped = Math.min(percentage, 100);
  const isOver = percentage > 100;
  const fillColor = isOver ? '#F44336' : '#1565C0';
  const trackColor = '#BBDEFB';
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (clamped / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* track ring */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: trackColor,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: fillColor,
          borderTopColor: clamped >= 25 ? fillColor : 'transparent',
          borderRightColor: clamped >= 50 ? fillColor : 'transparent',
          borderBottomColor: clamped >= 75 ? fillColor : 'transparent',
          borderLeftColor: clamped >= 100 ? fillColor : 'transparent',
          transform: [{ rotate: '-90deg' }],
        }}
      />
      <Text style={{ fontSize: 14, fontWeight: '900', color: '#1A1A2E' }}>
        {clamped}%
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BudgetsScreen() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
  const { data: budgets, isLoading, isRefetching, refetch } = useBudgets(selectedMonth);
  const { data: alerts } = useBudgetAlerts();
  const { data: salary, refetch: refetchSalary } = useSalary();
  const { data: dashboard, refetch: refetchDashboard } = useDashboard(selectedMonth);

  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const deleteMutation = useDeleteBudget();

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form values
  const [category, setCategory] = useState('groceries');
  const [amountPaise, setAmountPaise] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setSelectedMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    setSelectedMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleOpenCreate = () => {
    setEditingBudget(null);
    setCategory('groceries');
    setAmountPaise(0);
    setErrorMsg(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (b: Budget) => {
    setEditingBudget(b);
    setCategory(b.category);
    setAmountPaise(b.amount);
    setErrorMsg(null);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingBudget(null);
    setErrorMsg(null);
  };

  const handleSave = async () => {
    if (amountPaise <= 0) {
      setErrorMsg('Please specify a monthly budget limit greater than ₹0.');
      return;
    }
    setErrorMsg(null);
    try {
      if (editingBudget) {
        await updateMutation.mutateAsync({
          id: (editingBudget._id || editingBudget.id)!,
          amount: amountPaise,
        });
      } else {
        await createMutation.mutateAsync({
          category,
          amount: amountPaise,
          month: selectedMonth,
        });
      }
      handleCloseModal();
      setAmountPaise(0);
      void refetch();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save budget');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
      void refetch();
    } catch {
      // Handled by mutation
    }
  };

  // Safe normalized budget list
  const budgetList: Budget[] = Array.isArray(budgets)
    ? budgets
    : Array.isArray((budgets as any)?.budgets)
    ? (budgets as any).budgets
    : [];

  // ── Financial Calculations (Section 2 Specification) ───────────
  // 1. Total Income = All income transactions for the selected month (or starting profile salary)
  const baseSalary = salary?.baseMonthlySalary ?? 0;
  const totalIncome = baseSalary > 0
    ? baseSalary
    : (dashboard?.monthlySummary?.income ?? 0);

  // 2. Savings Target = User-defined savings goal
  const savingsTarget = dashboard?.budgets?.savingsTarget ?? 0;

  // 3. Category Budgets Total (Allocated)
  const totalCategoryBudget = budgetList.reduce((acc, b) => acc + (b.amount || 0), 0);

  // 4. Available Expense Budget = Total Income - Savings Target
  // If user has set specific category limits, totalCategoryBudget applies, otherwise available expense budget
  const availableExpenseBudget = totalCategoryBudget > 0
    ? totalCategoryBudget
    : Math.max(0, totalIncome - savingsTarget);

  // 5. Total Expenses = All valid expense transactions for the selected month
  const totalSpent = dashboard?.monthlySummary?.expense ?? budgetList.reduce((acc, b) => acc + (b.spent || 0), 0);

  // 6. Remaining Budget = Available Expense Budget - Total Expenses
  const remainingBudget = Math.max(0, availableExpenseBudget - totalSpent);

  // 7. Budget Utilization = (Total Expenses / Available Expense Budget) × 100
  const overallPct = availableExpenseBudget > 0 ? Math.round((totalSpent / availableExpenseBudget) * 100) : 0;

  // 8. Remaining Account Balance = Total Income - Total Expenses (Distinct from remaining budget!)
  const remainingAccountBalance = Math.max(0, totalIncome - totalSpent);

  return (
    <ScreenWrapper
      scrollable
      style={{ backgroundColor: '#F0F4FF', flex: 1 }}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            void refetch();
            void refetchSalary();
            void refetchDashboard();
          }}
          tintColor="#1565C0"
          colors={['#1565C0']}
        />
      }
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>Category Spending Limits</Text>
          <Text style={styles.headerTitle}>Budgets</Text>
        </View>
      </View>

      {/* ── Month Selector ─────────────────────────────────────────────────── */}
      <View style={styles.monthBar}>
        <Pressable onPress={handlePrevMonth} style={styles.monthNavBtn}>
          <ChevronLeft size={20} color="#1565C0" />
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Calendar size={14} color="#1565C0" />
          <Text style={styles.monthLabel}>{formatMonthYear(selectedMonth)}</Text>
        </View>

        <Pressable onPress={handleNextMonth} style={styles.monthNavBtn}>
          <ChevronRight size={20} color="#1565C0" />
        </Pressable>
      </View>

      {/* ── Threshold Alerts ───────────────────────────────────────────────── */}
      {alerts && alerts.length > 0 && (
        <View style={{ marginBottom: 14, gap: 8, width: '100%' }}>
          {alerts.map((alt, idx) => (
            <View
              key={idx}
              style={[
                styles.alertCard,
                alt.alertType === 'critical'
                  ? { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }
                  : { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
              ]}
            >
              <AlertTriangle
                size={18}
                color={alt.alertType === 'critical' ? '#E11D48' : '#D97706'}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.alertTitle,
                    { color: alt.alertType === 'critical' ? '#9F1239' : '#92400E' },
                  ]}
                >
                  {alt.category.toUpperCase()}: {alt.utilizationPercentage}% Limit Reached
                </Text>
                <Text style={styles.alertSub}>
                  Spent {formatPaise(alt.spentAmount)} of {formatPaise(alt.budgetAmount)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Summary Card (Financial Budget Engine) ───────────────────────────────────── */}
      <View style={styles.summaryCard}>
        {/* Top row */}
        <View style={styles.summaryTopRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Wallet size={14} color="#90CAF9" />
              <Text style={styles.summaryEyebrow}>Available Expense Budget</Text>
            </View>
            <Text style={styles.summarySpent}>
              {formatPaise(totalSpent)}
              <Text style={styles.summaryOf}> / {formatPaise(availableExpenseBudget)}</Text>
            </Text>
            <Text style={styles.salaryPoolSub}>
              {totalCategoryBudget > 0
                ? `Category Limits: ${formatPaise(totalCategoryBudget)} (Allocated)`
                : `Total Income: ${formatPaise(totalIncome)} − Savings: ${formatPaise(savingsTarget)}`}
            </Text>
          </View>

          {/* Circular donut */}
          <View style={styles.donutWrap}>
            <Text style={styles.donutPct}>{overallPct}%</Text>
            <Text style={styles.donutLabel}>Spent</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.summaryTrack}>
          <View
            style={[
              styles.summaryFill,
              {
                width: `${Math.min(overallPct, 100)}%` as any,
                backgroundColor: overallPct > 100 ? '#F44336' : overallPct >= 80 ? '#FFA726' : '#90CAF9',
              },
            ]}
          />
        </View>

        {/* Footer: Remaining Expense Budget vs Remaining Wallet Balance */}
        <View style={styles.summaryFooter}>
          <View>
            <Text style={styles.summaryFooterLabel}>Remaining Budget</Text>
            <Text style={[styles.allocatedSub, { color: '#FFFFFF' }]}>
              {formatPaise(remainingBudget)}
            </Text>
          </View>
          <View style={styles.summaryRemainingPill}>
            <Text style={styles.summaryRemainingText}>
              Wallet Balance: {formatPaise(remainingAccountBalance)}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Category Budget List ───────────────────────────────────────────── */}
      {isLoading ? (
        <View style={styles.skeletonContainer}>
          <SkeletonList count={4} />
        </View>
      ) : budgetList.length > 0 ? (
        <View style={{ gap: 12, width: '100%' }}>
          {budgetList.map((b) => {
            const isExceeded = b.utilizationPercentage > 100;
            const isWarning = b.utilizationPercentage >= b.alertThreshold;
            const meta = getCategoryMeta(b.category);
            const pct = Math.min(b.utilizationPercentage, 100);
            const fillColor = isExceeded ? '#DC2626' : '#1565C0';

            return (
              <View key={b._id || b.id} style={styles.catCard}>
                {/* Left: icon circle with Lucide category icon */}
                <View style={[styles.catIconCircle, { backgroundColor: meta.bg }]}>
                  {renderBudgetCategoryIcon(b.category, meta.color, 20)}
                </View>

                {/* Middle: details */}
                <View style={{ flex: 1 }}>
                  <View style={styles.catTopRow}>
                    <Text style={styles.catName}>
                      {b.category.charAt(0).toUpperCase() + b.category.slice(1)}
                    </Text>
                    {isWarning && (
                      <View
                        style={[
                          styles.catBadge,
                          { backgroundColor: isExceeded ? '#FEE2E2' : '#FEF9C3' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.catBadgeText,
                            { color: isExceeded ? '#B91C1C' : '#854D0E' },
                          ]}
                        >
                          {isExceeded ? 'Exceeded' : 'Warning'}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.catSpent}>
                    {formatPaise(b.spent)}
                    <Text style={styles.catOf}> / {formatPaise(b.amount)}</Text>
                  </Text>

                  {/* Progress track */}
                  <View style={styles.catTrack}>
                    <View
                      style={[
                        styles.catFill,
                        { width: `${pct}%` as any, backgroundColor: fillColor },
                      ]}
                    />
                  </View>

                  <View style={styles.catBottomRow}>
                    <Text style={[styles.catPct, { color: fillColor }]}>
                      {b.utilizationPercentage}%
                    </Text>
                    <Text style={styles.catRemLabel}>
                      {isExceeded ? 'Over by' : 'Left'}{' '}
                      <Text
                        style={{
                          fontWeight: '700',
                          color: isExceeded ? '#DC2626' : '#16A34A',
                        }}
                      >
                        {formatPaise(Math.abs(b.remaining))}
                      </Text>
                    </Text>
                  </View>
                </View>

                {/* Right: action buttons (Edit + Delete) */}
                <View style={styles.catActionsRow}>
                  <Pressable
                    onPress={() => handleOpenEdit(b)}
                    style={styles.catActionBtn}
                    hitSlop={8}
                  >
                    <Pencil size={15} color="#1565C0" />
                  </Pressable>
                  <Pressable
                    onPress={() => setDeleteId((b._id || b.id)!)}
                    style={styles.catActionBtn}
                    hitSlop={8}
                  >
                    <Trash2 size={15} color="#94A3B8" />
                  </Pressable>
                </View>
              </View>
            );
          })}

          {/* Generous bottom spacing so cards are 100% visible above floating navigation */}
          <View style={{ height: 110 }} />
        </View>
      ) : (
        <View style={[styles.catCard, { paddingVertical: 32 }]}>
          <EmptyState
            icon={<PieChart size={36} color="#1565C0" />}
            title="No Budgets Defined"
            description="Create category spending limits for this month to receive real-time threshold warnings."
            actionTitle="Create Budget"
            onAction={handleOpenCreate}
          />
        </View>
      )}

      {/* ── FAB: Add Budget ────────────────────────────────────────────────── */}
      <Pressable onPress={handleOpenCreate} style={styles.fab}>
        <Plus size={28} color="#ffffff" />
      </Pressable>

      {/* ── Centered Budget Modal (Edit / Create) ──────────────────────────── */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.centeredModalOverlay}
        >
          {/* Outside Backdrop Touch Dismiss */}
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseModal} />

          <View style={styles.centeredModalCard}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 22 }}
            >
              <View style={styles.modalTitleRow}>
                <View>
                  <Text style={styles.modalEyebrow}>
                    {editingBudget
                      ? `EDITING ${editingBudget.category.toUpperCase()} BUDGET`
                      : formatMonthYear(selectedMonth)}
                  </Text>
                  <Text style={styles.modalTitle}>
                    {editingBudget ? 'Update Budget Limit' : 'Create Category Budget'}
                  </Text>
                </View>
                <Pressable onPress={handleCloseModal} style={styles.modalCloseBtn}>
                  <X size={16} color="#546E7A" />
                </Pressable>
              </View>

              {errorMsg ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              {!editingBudget && (
                <CategoryPicker
                  selectedCategory={category}
                  onSelectCategory={setCategory}
                  containerClassName="mb-4"
                />
              )}

              <CurrencyInput
                label="Monthly Limit Amount"
                paiseValue={amountPaise}
                onPaiseChange={setAmountPaise}
                helperText="Set how much you plan to spend in this category"
                containerClassName="mb-6"
                autoFocus
              />

              <Button
                title={editingBudget ? 'Update Limit' : 'Save Budget'}
                size="lg"
                loading={createMutation.isPending || updateMutation.isPending}
                onPress={handleSave}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Delete Confirm Modal ───────────────────────────────────────────── */}
      <ConfirmModal
        visible={!!deleteId}
        title="Remove Budget"
        message="Are you sure you want to delete this category budget limit?"
        confirmTitle="Delete Budget"
        isDestructive
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </ScreenWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scrollContent: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 110,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    width: '100%',
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1565C0',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1A1A2E',
  },

  // Month bar
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 16,
    width: '100%',
    elevation: 2,
    shadowColor: '#1565C0',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  monthNavBtn: {
    padding: 4,
  },
  monthLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A1A2E',
  },

  // Alert cards
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  alertTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  alertSub: {
    fontSize: 11,
    color: '#546E7A',
    marginTop: 1,
  },

  // Summary card
  summaryCard: {
    backgroundColor: '#1565C0',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    width: '100%',
    elevation: 4,
    shadowColor: '#1565C0',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  summaryEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#90CAF9',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  summarySpent: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  salaryPoolSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#BAE6FD',
    marginTop: 3,
  },
  allocatedSub: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  summaryOf: {
    fontSize: 14,
    fontWeight: '600',
    color: '#90CAF9',
  },
  donutWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutPct: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  donutLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#90CAF9',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    marginBottom: 14,
  },
  summaryFill: {
    height: '100%',
    borderRadius: 4,
  },
  summaryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  summaryFooterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#90CAF9',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryRemainingPill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  summaryRemainingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Category cards
  catCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  catIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  catName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  catSpent: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 6,
  },
  catOf: {
    fontSize: 11,
    fontWeight: '500',
    color: '#78909C',
  },
  catTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    marginBottom: 6,
  },
  catFill: {
    height: '100%',
    borderRadius: 3,
  },
  catBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catPct: {
    fontSize: 11,
    fontWeight: '700',
  },
  catRemLabel: {
    fontSize: 11,
    color: '#546E7A',
  },
  catActionsRow: {
    flexDirection: 'column',
    gap: 10,
    alignItems: 'center',
  },
  catActionBtn: {
    padding: 6,
  },

  skeletonContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '100%',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 96,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1565C0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#1565C0',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  // Centered Modal
  centeredModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centeredModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1565C0',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1A1A2E',
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
  },
});