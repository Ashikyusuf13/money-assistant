import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  RefreshControl,
  Platform,
  ScrollView,
} from 'react-native';
import {
  ScreenWrapper,
  Card,
  Button,
  Badge,
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
      className="px-4 pt-2"
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          tintColor="#0c87eb"
          colors={['#0c87eb']}
        />
      }
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View>
          <Text className="text-xs font-semibold text-primary-600 uppercase tracking-wider">
            Category Limits
          </Text>
          <Text className="text-2xl font-black text-slate-900 dark:text-slate-100">
            Budgets
          </Text>
        </View>

        <Pressable
          onPress={() => {
            setErrorMsg(null);
            setAmountPaise(0);
            setShowAddModal(true);
          }}
          className="flex-row items-center gap-1.5 bg-primary-600 px-3.5 py-2 rounded-xl active:bg-primary-700 shadow-sm"
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-xs font-bold text-white">Add Budget</Text>
        </Pressable>
      </View>

      {/* Month Selector Bar */}
      <View className="flex-row items-center justify-between bg-white dark:bg-slate-900 px-3 py-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 mb-4 shadow-sm">
        <Pressable onPress={handlePrevMonth} className="p-1 active:opacity-60">
          <ChevronLeft size={20} color="#64748b" />
        </Pressable>

        <View className="flex-row items-center gap-1.5">
          <Calendar size={14} color="#0c87eb" />
          <Text className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {formatMonthYear(selectedMonth)}
          </Text>
        </View>

        <Pressable onPress={handleNextMonth} className="p-1 active:opacity-60">
          <ChevronRight size={20} color="#64748b" />
        </Pressable>
      </View>

      {/* Active Threshold Alerts */}
      {alerts && alerts.length > 0 && (
        <View className="mb-4 gap-2">
          {alerts.map((alt, idx) => (
            <Card
              key={idx}
              className={`p-3 flex-row items-center gap-2.5 ${
                alt.alertType === 'critical'
                  ? 'bg-rose-50 border-rose-200 dark:bg-rose-950/40'
                  : 'bg-amber-50 border-amber-200 dark:bg-amber-950/40'
              }`}
            >
              <AlertTriangle
                size={18}
                color={alt.alertType === 'critical' ? '#e11d48' : '#d97706'}
              />
              <View className="flex-1">
                <Text
                  className={`text-xs font-bold ${
                    alt.alertType === 'critical'
                      ? 'text-rose-800 dark:text-rose-300'
                      : 'text-amber-800 dark:text-amber-300'
                  }`}
                >
                  {alt.category.toUpperCase()}: {alt.utilizationPercentage}% Limit Reached
                </Text>
                <Text className="text-[11px] text-slate-600 dark:text-slate-400">
                  Spent {formatPaise(alt.spentAmount)} of {formatPaise(alt.budgetAmount)}
                </Text>
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Overall Budget Overview Card */}
      <Card className="mb-5 p-4 bg-slate-900 border-slate-800">
        <View className="flex-row justify-between items-baseline mb-1">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Monthly Budget
          </Text>
          <Text className="text-xs font-bold text-slate-300">
            {overallPct}% Spent
          </Text>
        </View>

        <Text className="text-2xl font-black text-white">
          {formatPaise(totalSpent)}
          <Text className="text-sm font-medium text-slate-400">
            {' '}/ {formatPaise(totalBudget)}
          </Text>
        </Text>

        {/* Progress bar */}
        <View className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mt-3 mb-2">
          <View
            className={`h-full rounded-full ${
              overallPct > 100
                ? 'bg-rose-500'
                : overallPct >= 80
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(overallPct, 100)}%` }}
          />
        </View>

        <Text className="text-xs text-slate-400">
          Remaining: <Text className="font-bold text-emerald-400">{formatPaise(totalRemaining)}</Text>
        </Text>
      </Card>

      {/* Category Budgets List */}
      {isLoading ? (
        <LoadingSpinner message="Calculating budgets and expenses..." />
      ) : budgetList.length > 0 ? (
        <View className="gap-3 mb-6">
          {budgetList.map((b) => {
            const isExceeded = b.utilizationPercentage > 100;
            const isWarning = b.utilizationPercentage >= b.alertThreshold;

            return (
              <Card key={b._id || b.id} className="p-4">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-2">
                    <Badge label={b.category} variant="default" size="md" />
                    {isWarning && (
                      <Badge
                        label={isExceeded ? 'Exceeded' : 'Warning'}
                        variant={isExceeded ? 'critical' : 'warning'}
                      />
                    )}
                  </View>

                  <Pressable
                    onPress={() => setDeleteId(b._id || b.id)}
                    className="p-1 active:opacity-60"
                  >
                    <Trash2 size={16} color="#94a3b8" />
                  </Pressable>
                </View>

                <View className="flex-row justify-between items-baseline mb-2">
                  <Text className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                    {formatPaise(b.spent)}
                    <Text className="text-xs font-semibold text-slate-400">
                      {' '}of {formatPaise(b.amount)}
                    </Text>
                  </Text>
                  <Text
                    className={`text-xs font-bold ${
                      isExceeded
                        ? 'text-rose-600'
                        : isWarning
                        ? 'text-amber-600'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {b.utilizationPercentage}%
                  </Text>
                </View>

                {/* Individual Progress bar */}
                <View className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <View
                    className={`h-full rounded-full ${
                      isExceeded
                        ? 'bg-rose-500'
                        : isWarning
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(b.utilizationPercentage, 100)}%` }}
                  />
                </View>

                <View className="flex-row justify-between items-center mt-2">
                  <Text className="text-[11px] text-slate-400">
                    {isExceeded ? 'Over limit by' : 'Remaining'}
                  </Text>
                  <Text
                    className={`text-xs font-bold ${
                      isExceeded ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {formatPaise(Math.abs(b.remaining))}
                  </Text>
                </View>
              </Card>
            );
          })}
        </View>
      ) : (
        <Card className="mb-6">
          <EmptyState
            icon={<PieChart size={32} color="#0c87eb" />}
            title="No Budgets Defined"
            description="Create category spending limits for this month to receive real-time threshold warnings."
            actionTitle="Create Budget"
            onAction={() => {
              setErrorMsg(null);
              setAmountPaise(0);
              setShowAddModal(true);
            }}
          />
        </Card>
      )}

      {/* Add Budget Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" statusBarTranslucent>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
          <View
            className="bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-100"
            style={{ paddingBottom: Platform.OS === 'ios' ? 34 : 20 }}
          >
            {/* Handle */}
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1 rounded-full bg-slate-300" />
            </View>
            <ScrollView
              className="px-5 pt-3"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View className="flex-row items-center justify-between mb-5">
                <View>
                  <Text className="text-[11px] font-bold text-primary-500 uppercase tracking-widest mb-0.5">
                    {formatMonthYear(selectedMonth)}
                  </Text>
                  <Text className="text-xl font-black text-slate-900 dark:text-slate-100">
                    Create Category Budget
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowAddModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
                >
                  <X size={16} color="#64748b" />
                </Pressable>
              </View>

              {errorMsg && (
                <View className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5 mb-4">
                  <Text className="text-xs font-semibold text-rose-600">{errorMsg}</Text>
                </View>
              )}

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
              />

              <Button
                title="Save Budget"
                size="lg"
                loading={createMutation.isPending}
                onPress={handleCreate}
              />
              <View className="h-4" />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
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
