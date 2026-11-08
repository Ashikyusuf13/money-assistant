import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  RefreshControl,
  ScrollView,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ScreenWrapper,
  Card,
  Button,
  Input,
  CurrencyInput,
  LoadingSpinner,
  ConfirmModal,
} from '@/src/components/ui';
import {
  usePeriodReport,
  useCategoryReport,
  useFinancialInsights,
} from '@/src/hooks/useReports';
import {
  useAccounts,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
} from '@/src/hooks/useAccounts';
import { formatPaise } from '@/src/utils/currency';
import { exportFinancialReportPDF, PDFReportData } from '@/src/utils/pdfExport';
import { useDashboard } from '@/src/hooks/useDashboard';
import { useSalary } from '@/src/hooks/useSalary';
import { useBudgets } from '@/src/hooks/useBudgets';
import { useGoals } from '@/src/hooks/useGoals';
import { Account, Budget } from '@/src/types/api';
import { getCurrentMonthStr, formatMonthYear } from '@/src/utils/date';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  PieChart,
  Sparkles,
  FileDown,
  Calendar,
  Filter,
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  X,
  Building2,
  Wallet,
  Coins,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';

type PeriodType = 'monthly' | 'weekly' | 'daily';

const CATEGORIES = [
  'all',
  'food_dining',
  'shopping',
  'housing',
  'transportation',
  'utilities',
  'entertainment',
  'healthcare',
  'salary',
  'investment',
  'other',
];

export default function ReportsScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<PeriodType>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Month navigation
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

  // Queries with active filters
  const {
    data: periodData,
    isLoading: isPeriodLoading,
    refetch: refetchPeriod,
  } = usePeriodReport({
    period,
    month: selectedMonth,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
  });

  const {
    data: categoryData,
    isLoading: isCategoryLoading,
    refetch: refetchCategories,
  } = useCategoryReport({
    month: selectedMonth,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
  });

  const {
    data: insights,
    isLoading: isInsightsLoading,
    refetch: refetchInsights,
  } = useFinancialInsights(selectedMonth);

  const { data: accounts, refetch: refetchAccounts } = useAccounts();
  const createAccountMutation = useCreateAccount();
  const updateAccountMutation = useUpdateAccount();
  const deleteAccountMutation = useDeleteAccount();

  const { data: dashboard } = useDashboard(selectedMonth);
  const { data: salary } = useSalary();
  const { data: budgets } = useBudgets(selectedMonth);
  const { data: goals } = useGoals();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Account Modal States (Create / Edit / Delete)
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);

  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<Account['type']>('bank');
  const [accBalancePaise, setAccBalancePaise] = useState(0);

  const handleOpenEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setAccType(acc.type);
    setAccBalancePaise(acc.currentBalance ?? acc.balance ?? 0);
  };

  const handleSaveAccount = async () => {
    const name = accName.trim();
    if (!name) return;

    if (editingAccount) {
      await updateAccountMutation.mutateAsync({
        id: (editingAccount._id || editingAccount.id)!,
        name,
        type: accType,
        currentBalance: accBalancePaise,
      });
      setEditingAccount(null);
    } else {
      await createAccountMutation.mutateAsync({
        name,
        type: accType,
        openingBalance: accBalancePaise,
      });
      setShowAddAccountModal(false);
    }

    setAccName('');
    setAccBalancePaise(0);
    void refetchAccounts();
  };

  const handleDeleteAccount = async () => {
    if (!deletingAccountId) return;
    try {
      await deleteAccountMutation.mutateAsync(deletingAccountId);
      setDeletingAccountId(null);
      void refetchAccounts();
    } catch {}
  };

  const handleDownloadPDF = () => {
    const netWealth = (dashboard?.totalTrackedWealthPaise ?? dashboard?.netWealth ?? 0) / 100;
    const income = (periodData?.totalIncome ?? dashboard?.cashFlow?.totalIncome ?? 0) / 100;
    const expense = (periodData?.totalExpense ?? dashboard?.cashFlow?.netOperatingExpense ?? 0) / 100;
    const netFlow = (periodData?.netCashFlow ?? (income - expense) * 100) / 100;
    const baseSal = salary?.baseMonthlySalary ? salary.baseMonthlySalary / 100 : null;
    const remSal = baseSal !== null ? Math.max(0, baseSal - expense) : 0;
    const retPct = baseSal && baseSal > 0 ? Math.round((remSal / baseSal) * 100) : 0;

    const budgetList = Array.isArray(budgets)
      ? budgets
      : Array.isArray((budgets as any)?.budgets)
      ? (budgets as any).budgets
      : [];

    const activeGoalsList = Array.isArray(goals)
      ? goals
      : Array.isArray((goals as any)?.goals)
      ? (goals as any).goals
      : [];

    const reportData: PDFReportData = {
      userName: 'Verified User',
      userEmail: 'user@finance.app',
      month: `${selectedMonth} (${period.toUpperCase()})`,
      generatedAt: new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      trackedWealthRupees: netWealth,
      monthlyIncomeRupees: income,
      monthlyExpenseRupees: expense,
      netCashFlowRupees: netFlow,
      salary: {
        baseSalaryRupees: baseSal,
        salaryReceivedRupees: (dashboard?.salaryStatus?.salaryReceivedThisMonth ?? 0) / 100,
        remainingSalaryRupees: remSal,
        retentionPercentage: retPct,
      },
      categories: (categoryData?.categories ?? []).map((c) => ({
        category: c.category,
        spentRupees: c.amount / 100,
        percentage: c.percentage,
        transactionCount: c.transactionCount,
      })),
      budgets: (budgetList as Budget[]).map((b: Budget) => ({
        category: b.category,
        limitRupees: b.amount / 100,
        spentRupees: b.spent / 100,
        remainingRupees: Math.max(0, b.amount - b.spent) / 100,
        utilizationPercentage: b.utilizationPercentage,
        isExceeded: b.spent > b.amount,
      })),
      goals: activeGoalsList.map((g: any) => ({
        name: g.name,
        targetRupees: (g.targetAmount || 0) / 100,
        savedRupees: (g.currentAmount || 0) / 100,
        remainingRupees: Math.max(0, (g.targetAmount || 0) - (g.currentAmount || 0)) / 100,
        progressPercentage:
          (g.targetAmount || 0) > 0 ? Math.round(((g.currentAmount || 0) / g.targetAmount) * 100) : 0,
      })),
      insights: (insights ?? []).map((i) => ({
        title: i.title,
        message: i.message,
        severity: i.severity,
      })),
    };

    exportFinancialReportPDF(reportData);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchPeriod(), refetchCategories(), refetchInsights(), refetchAccounts()]);
    setIsRefreshing(false);
  };

  const isLoading = isPeriodLoading || isCategoryLoading || isInsightsLoading;
  const safeAccounts: Account[] = Array.isArray(accounts) ? accounts : [];

  return (
    <ScreenWrapper
      scrollable
      className="px-5 py-4"
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => void handleRefresh()}
          tintColor="#0c87eb"
          colors={['#0c87eb']}
        />
      }
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-white border border-slate-300 items-center justify-center active:bg-slate-100 shadow-sm"
        >
          <ArrowLeft size={18} color="#0c87eb" />
        </Pressable>
        <Text className="text-base font-extrabold text-slate-900" style={{ color: '#0f172a' }}>
          Financial Reports
        </Text>
        <Pressable
          onPress={handleDownloadPDF}
          className="flex-row items-center gap-1.5 bg-slate-900 px-3.5 py-2 rounded-xl active:opacity-80 shadow-sm"
        >
          <FileDown size={14} color="#ffffff" />
          <Text className="text-xs font-bold text-white">
            Export PDF
          </Text>
        </Pressable>
      </View>

      {/* ─── Filter Controls Bar ────────────────────────── */}
      <Card className="p-3.5 mb-4 bg-white border border-slate-200 shadow-sm">
        {/* Month Selector */}
        <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <Pressable onPress={handlePrevMonth} className="p-1 active:opacity-60">
            <ChevronLeft size={18} color="#475569" />
          </Pressable>
          <View className="flex-row items-center gap-1.5">
            <Calendar size={14} color="#0c87eb" />
            <Text className="text-xs font-black text-slate-900" style={{ color: '#0f172a' }}>
              {formatMonthYear(selectedMonth)}
            </Text>
          </View>
          <Pressable onPress={handleNextMonth} className="p-1 active:opacity-60">
            <ChevronRight size={18} color="#475569" />
          </Pressable>
        </View>

        {/* Period Selector Tabs */}
        <View className="flex-row bg-slate-100 p-1 rounded-xl mb-3 border border-slate-200">
          {(['monthly', 'weekly', 'daily'] as PeriodType[]).map((p) => {
            const isSelected = period === p;
            return (
              <Pressable
                key={p}
                onPress={() => setPeriod(p)}
                className={`flex-1 py-1.5 rounded-lg items-center capitalize ${
                  isSelected ? 'bg-white shadow-sm' : ''
                }`}
              >
                <Text
                  className={`text-xs font-bold capitalize ${
                    isSelected ? 'text-primary-700' : 'text-slate-600'
                  }`}
                >
                  {p}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Category Filter Horizontal Scroll */}
        <View>
          <View className="flex-row items-center gap-1.5 mb-2">
            <Filter size={12} color="#64748b" />
            <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Filter by Category
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-1.5">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg border ${
                    isSelected
                      ? 'bg-primary-600 border-primary-600'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold capitalize ${
                      isSelected ? 'text-white' : 'text-slate-700'
                    }`}
                  >
                    {cat.replace('_', ' ')}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Card>

      {/* ─── Tracked Accounts & Assets Management ────────── */}
      <View className="mb-5">
        <View className="flex-row items-center justify-between mb-2.5">
          <View className="flex-row items-center gap-1.5">
            <CreditCard size={15} color="#0c87eb" />
            <Text className="text-xs font-bold text-slate-800 uppercase tracking-wider" style={{ color: '#0f172a' }}>
              Tracked Accounts ({safeAccounts.length})
            </Text>
          </View>
          <Pressable
            onPress={() => {
              setEditingAccount(null);
              setAccName('');
              setAccBalancePaise(0);
              setShowAddAccountModal(true);
            }}
            className="flex-row items-center gap-1 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-200 active:bg-primary-100"
          >
            <Plus size={13} color="#026ac8" />
            <Text className="text-[11px] font-bold text-primary-700">Add Account</Text>
          </Pressable>
        </View>

        <Card className="p-0 overflow-hidden divide-y divide-slate-100 bg-white border border-slate-200 shadow-sm">
          {safeAccounts.length > 0 ? (
            safeAccounts.map((acc) => {
              const bal = acc.currentBalance ?? acc.balance ?? 0;
              return (
                <View key={acc._id || acc.id} className="flex-row items-center justify-between p-3.5">
                  <View className="flex-row items-center gap-3 flex-1 pr-2">
                    <View className="w-9 h-9 rounded-xl bg-slate-100 items-center justify-center border border-slate-200">
                      {acc.type === 'bank' ? (
                        <Building2 size={16} color="#0c87eb" />
                      ) : acc.type === 'cash' ? (
                        <Coins size={16} color="#10b981" />
                      ) : (
                        <Wallet size={16} color="#8b5cf6" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-slate-900" style={{ color: '#0f172a' }} numberOfLines={1}>
                        {acc.name}
                      </Text>
                      <Text className="text-[10px] font-bold text-slate-500 uppercase">
                        {acc.type} account
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-3">
                    <Text className="text-sm font-black text-slate-900" style={{ color: '#0f172a' }}>
                      {formatPaise(bal)}
                    </Text>
                    <Pressable
                      onPress={() => handleOpenEditAccount(acc)}
                      className="p-1.5 rounded-lg bg-slate-100 active:bg-slate-200"
                    >
                      <Pencil size={13} color="#475569" />
                    </Pressable>
                    <Pressable
                      onPress={() => setDeletingAccountId(acc._id || acc.id || null)}
                      className="p-1.5 rounded-lg bg-rose-50 active:bg-rose-100"
                    >
                      <Trash2 size={13} color="#e11d48" />
                    </Pressable>
                  </View>
                </View>
              );
            })
          ) : (
            <View className="py-4 items-center">
              <Text className="text-xs font-semibold text-slate-500">No accounts configured yet.</Text>
            </View>
          )}
        </Card>
      </View>

      {isLoading ? (
        <LoadingSpinner message="Aggregating filtered reports..." />
      ) : (
        <>
          {/* Period Cash Flow Card */}
          <Card
            className="p-5 mb-5 shadow-lg border-0"
            style={{ backgroundColor: '#021838', borderRadius: 20 }}
          >
            <Text className="text-xs font-bold text-sky-300 uppercase tracking-wider mb-1">
              {period} Net Cash Flow
            </Text>
            <Text
              className={`text-3xl font-black ${
                (periodData?.netCashFlow ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {(periodData?.netCashFlow ?? 0) >= 0 ? '+' : ''}
              {formatPaise(periodData?.netCashFlow ?? 0)}
            </Text>

            <View className="flex-row gap-4 mt-4 pt-4 border-t border-slate-700/60">
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <TrendingUp size={14} color="#34d399" />
                  <Text className="text-xs text-slate-300 font-medium">Total Inflow</Text>
                </View>
                <Text className="text-base font-bold text-white">
                  {formatPaise(periodData?.totalIncome ?? 0)}
                </Text>
              </View>

              <View className="w-[1px] bg-slate-700/60" />

              <View className="flex-1">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <TrendingDown size={14} color="#f87171" />
                  <Text className="text-xs text-slate-300 font-medium">Total Outflow</Text>
                </View>
                <Text className="text-base font-bold text-white">
                  {formatPaise(periodData?.totalExpense ?? 0)}
                </Text>
              </View>
            </View>
          </Card>

          {/* Category Spending Breakdown */}
          <View className="mb-6">
            <View className="flex-row items-center gap-2 mb-3">
              <PieChart size={16} color="#475569" />
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Category Spending Breakdown
              </Text>
            </View>

            {categoryData?.categories && categoryData.categories.length > 0 ? (
              <Card className="p-4 gap-4 bg-white border border-slate-200 shadow-sm">
                {categoryData.categories.map((cat, idx) => (
                  <View key={idx}>
                    <View className="flex-row justify-between items-center mb-1.5">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-xs font-bold text-slate-900 capitalize" style={{ color: '#0f172a' }}>
                          {cat.category.replace('_', ' ')}
                        </Text>
                        <Text className="text-[11px] font-semibold text-slate-500">
                          ({cat.transactionCount} transactions)
                        </Text>
                      </View>

                      <View className="items-end">
                        <Text className="text-xs font-black text-slate-900" style={{ color: '#0f172a' }}>
                          {formatPaise(cat.amount)}
                        </Text>
                        {cat.monthOverMonthChangePercentage !== undefined && (
                          <Text
                            className={`text-[10px] font-bold ${
                              cat.monthOverMonthChangePercentage > 0
                                ? 'text-rose-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {cat.monthOverMonthChangePercentage > 0 ? '+' : ''}
                            {cat.monthOverMonthChangePercentage}% MoM
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Proportional Bar */}
                    <View className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <View
                        className="h-full bg-primary-600 rounded-full"
                        style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                      />
                    </View>
                  </View>
                ))}
              </Card>
            ) : (
              <Card className="bg-white border border-slate-200 shadow-sm">
                <Text className="text-xs text-slate-600 text-center py-4 font-medium">
                  No categorical expense records available for this filter.
                </Text>
              </Card>
            )}
          </View>

          {/* Rule-Based Financial Insights */}
          {insights && insights.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center gap-2 mb-3">
                <Sparkles size={16} color="#475569" />
                <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Algorithmic Financial Insights
                </Text>
              </View>

              <View className="gap-2.5">
                {insights.map((item, idx) => (
                  <Card
                    key={idx}
                    className={`p-3.5 flex-row gap-3 ${
                      item.severity === 'warning'
                        ? 'bg-amber-50 border-amber-200'
                        : item.severity === 'positive'
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-primary-50 border-primary-200'
                    }`}
                  >
                    <View className="pt-0.5">
                      <Sparkles
                        size={18}
                        color={
                          item.severity === 'warning'
                            ? '#d97706'
                            : item.severity === 'positive'
                            ? '#059669'
                            : '#026ac8'
                        }
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-bold text-slate-900" style={{ color: '#0f172a' }}>
                        {item.title}
                      </Text>
                      <Text className="text-xs text-slate-700 mt-0.5 leading-relaxed font-medium">
                        {item.message}
                      </Text>
                    </View>
                  </Card>
                ))}
              </View>
            </View>
          )}
        </>
      )}

      {/* ─── Add / Edit Account Modal ───────────────────── */}
      <Modal
        visible={showAddAccountModal || !!editingAccount}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAddAccountModal(false);
          setEditingAccount(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
        >
          <Pressable
            className="flex-1"
            onPress={() => {
              setShowAddAccountModal(false);
              setEditingAccount(null);
            }}
          />
          <View
            className="bg-white rounded-t-3xl border-t border-slate-200 px-5 pt-4"
            style={{ backgroundColor: '#ffffff', paddingBottom: Platform.OS === 'ios' ? 34 : 24 }}
          >
            <View className="items-center mb-4">
              <View className="w-10 h-1.5 rounded-full bg-slate-300" />
            </View>

            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-xs font-bold text-primary-700 uppercase tracking-wider mb-0.5">
                  Accounts & Assets
                </Text>
                <Text className="text-xl font-black text-slate-900" style={{ color: '#0f172a' }}>
                  {editingAccount ? 'Edit Account' : 'Add New Account'}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setShowAddAccountModal(false);
                  setEditingAccount(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
              >
                <X size={16} color="#334155" />
              </Pressable>
            </View>

            <Input
              label="ACCOUNT NAME"
              placeholder="e.g. HDFC Bank, SBI, Cash Wallet"
              value={accName}
              onChangeText={setAccName}
              containerClassName="mb-4"
              autoFocus
            />

            {/* Account Type Selector */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                ACCOUNT TYPE
              </Text>
              <View className="flex-row gap-2">
                {(['bank', 'cash', 'wallet', 'savings'] as Account['type'][]).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setAccType(t)}
                    className={`flex-1 py-2.5 rounded-xl border items-center capitalize ${
                      accType === t
                        ? 'bg-primary-600 border-primary-600'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Text className={`text-xs font-bold capitalize ${accType === t ? 'text-white' : 'text-slate-800'}`}>
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <CurrencyInput
              label={editingAccount ? 'CURRENT BALANCE' : 'OPENING BALANCE'}
              paiseValue={accBalancePaise}
              onPaiseChange={setAccBalancePaise}
              containerClassName="mb-5"
            />

            <Button
              title={editingAccount ? 'Update Account' : 'Save Account'}
              size="lg"
              loading={createAccountMutation.isPending || updateAccountMutation.isPending}
              onPress={handleSaveAccount}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Account Confirmation */}
      <ConfirmModal
        visible={!!deletingAccountId}
        title="Delete Account"
        message="Are you sure you want to remove this account? It will be archived and will no longer appear in your active accounts."
        confirmTitle="Delete Account"
        isDestructive
        isLoading={deleteAccountMutation.isPending}
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeletingAccountId(null)}
      />
    </ScreenWrapper>
  );
}
