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
  LoadingSpinner,
  EmptyState,
  ConfirmModal,
} from '@/src/components/ui';
import {
  useBudgets,
  useBudgetAlerts,
  useCreateBudget,
  useDeleteBudget,
} from '@/src/hooks/useBudgets';
import { formatPaise } from '@/src/utils/currency';
import { formatMonthYear, getCurrentMonthStr } from '@/src/utils/date';
import { Budget } from '@/src/types/api';
import {
  Plus,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  PieChart,
  Calendar,
} from 'lucide-react-native';

// ─── Category icon helpers ─────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { emoji: string; color: string; bg: string }> = {
  groceries:     { emoji: '🛒', color: '#1565C0', bg: '#E8EEF9' },
  food:          { emoji: '🍔', color: '#E65100', bg: '#FFF3E0' },
  transport:     { emoji: '🚌', color: '#00695C', bg: '#E0F2F1' },
  shopping:      { emoji: '🛍️', color: '#6A1B9A', bg: '#F3E5F5' },
  entertainment: { emoji: '🎬', color: '#AD1457', bg: '#FCE4EC' },
  health:        { emoji: '💊', color: '#2E7D32', bg: '#E8F5E9' },
  utilities:     { emoji: '💡', color: '#F57F17', bg: '#FFFDE7' },
  education:     { emoji: '📚', color: '#1565C0', bg: '#E3F2FD' },
  travel:        { emoji: '✈️', color: '#0277BD', bg: '#E1F5FE' },
  other:         { emoji: '📦', color: '#546E7A', bg: '#ECEFF1' },
};

function getCategoryMeta(cat: string) {
  return CATEGORY_META[cat.toLowerCase()] ?? { emoji: '📦', color: '#546E7A', bg: '#ECEFF1' };
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
      {/* fill approximation using a rotated overlay — simple approach */}
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

  const createMutation = useCreateBudget();
  const deleteMutation = useDeleteBudget();

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
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

  const handleCreate = async () => {
    if (amountPaise <= 0) {
      setErrorMsg('Please specify a monthly budget limit greater than ₹0.');
      return;
    }
    setErrorMsg(null);
    try {
      await createMutation.mutateAsync({
        category,
        amount: amountPaise,
        month: selectedMonth,
      });
      setShowAddModal(false);
      setAmountPaise(0);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create budget');
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

  // Summaries
  const totalBudget = budgetList.reduce((acc, b) => acc + (b.amount || 0), 0);
  const totalSpent = budgetList.reduce((acc, b) => acc + (b.spent || 0), 0);
  const totalRemaining = Math.max(0, totalBudget - totalSpent);
  const overallPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  return (
    <ScreenWrapper
      scrollable
      style={styles.wrapper}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          tintColor="#1565C0"
          colors={['#1565C0']}
        />
      }
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>Category Limits</Text>
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
        <View style={{ marginBottom: 14, gap: 8 }}>
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

      {/* ── Summary Card (Blue Gradient) ───────────────────────────────────── */}
      <View style={styles.summaryCard}>
        {/* Top row */}
        <View style={styles.summaryTopRow}>
          <View>
            <Text style={styles.summaryEyebrow}>Monthly Budget</Text>
            <Text style={styles.summarySpent}>
              {formatPaise(totalSpent)}
              <Text style={styles.summaryOf}>  / {formatPaise(totalBudget)}</Text>
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

        {/* Category Budgets label + remaining */}
        <View style={styles.summaryFooter}>
          <Text style={styles.summaryFooterLabel}>Category Budgets</Text>
          <View style={styles.summaryRemainingPill}>
            <Text style={styles.summaryRemainingText}>
              Remaining: {formatPaise(totalRemaining)}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Category Budget List ───────────────────────────────────────────── */}
      {isLoading ? (
        <LoadingSpinner message="Calculating budgets and expenses..." />
      ) : budgetList.length > 0 ? (
        <View style={{ gap: 12, marginBottom: 90 }}>
          {budgetList.map((b) => {
            const isExceeded = b.utilizationPercentage > 100;
            const isWarning = b.utilizationPercentage >= b.alertThreshold;
            const meta = getCategoryMeta(b.category);
            const pct = Math.min(b.utilizationPercentage, 100);
            const fillColor = isExceeded ? '#F44336' : '#1565C0';

            return (
              <View key={b._id || b.id} style={styles.catCard}>
                {/* Left: icon circle */}
                <View style={[styles.catIconCircle, { backgroundColor: meta.bg }]}>
                  <Text style={{ fontSize: 20 }}>{meta.emoji}</Text>
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
                          color: isExceeded ? '#F44336' : '#2E7D32',
                        }}
                      >
                        {formatPaise(Math.abs(b.remaining))}
                      </Text>
                    </Text>
                  </View>
                </View>

                {/* Right: delete */}
                <Pressable
                  onPress={() => setDeleteId(b._id || b.id)}
                  style={styles.catDeleteBtn}
                  hitSlop={8}
                >
                  <Trash2 size={16} color="#90A4AE" />
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={[styles.catCard, { paddingVertical: 32 }]}>
          <EmptyState
            icon={<PieChart size={36} color="#1565C0" />}
            title="No Budgets Defined"
            description="Create category spending limits for this month to receive real-time threshold warnings."
            actionTitle="Create Budget"
            onAction={() => {
              setErrorMsg(null);
              setAmountPaise(0);
              setShowAddModal(true);
            }}
          />
        </View>
      )}

      {/* ── FAB: Add Budget ────────────────────────────────────────────────── */}
      <Pressable
        onPress={() => {
          setErrorMsg(null);
          setAmountPaise(0);
          setShowAddModal(true);
        }}
        style={styles.fab}
      >
        <Plus size={28} color="#ffffff" />
      </Pressable>

      {/* ── Add Budget Modal ───────────────────────────────────────────────── */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setShowAddModal(false)} />
          <View
            style={[
              styles.modalSheet,
              { paddingBottom: Platform.OS === 'ios' ? 34 : 24 },
            ]}
          >
            {/* Handle */}
            <View style={styles.modalHandle}>
              <View style={styles.modalHandleBar} />
            </View>

            <ScrollView
              style={{ paddingHorizontal: 20, paddingTop: 12 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalTitleRow}>
                <View>
                  <Text style={styles.modalEyebrow}>{formatMonthYear(selectedMonth)}</Text>
                  <Text style={styles.modalTitle}>Create Category Budget</Text>
                </View>
                <Pressable
                  onPress={() => setShowAddModal(false)}
                  style={styles.modalCloseBtn}
                >
                  <X size={16} color="#546E7A" />
                </Pressable>
              </View>

              {errorMsg ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              <CategoryPicker
                selectedCategory={category}
                onSelectCategory={setCategory}
                containerClassName="mb-4"
              />

              <CurrencyInput
                label="Monthly Limit Amount"
                paiseValue={amountPaise}
                onPaiseChange={setAmountPaise}
                helperText="Set how much you plan to spend in this category"
                containerClassName="mb-6"
                autoFocus
              />

              <Button
                title="Save Budget"
                size="lg"
                loading={createMutation.isPending}
                onPress={handleCreate}
              />
              <View style={{ height: 16 }} />
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
  wrapper: {
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
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
    marginBottom: 16,
  },
  summaryEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#90CAF9',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summarySpent: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
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
    fontSize: 12,
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
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 5,
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
    fontSize: 12,
    fontWeight: '800',
  },
  catRemLabel: {
    fontSize: 11,
    color: '#78909C',
    fontWeight: '500',
  },
  catDeleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1565C0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#1565C0',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  // Modal sheet
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: '#E8EEF9',
  },
  modalHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  modalHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CFD8DC',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1565C0',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1A1A2E',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#BE123C',
  },
});
