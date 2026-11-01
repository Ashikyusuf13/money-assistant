import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ScreenWrapper,
  Card,
  Badge,
  LoadingSpinner,
  EmptyState,
} from '@/src/components/ui';
import { useAuthStore } from '@/src/store/authStore';
import { useDashboard } from '@/src/hooks/useDashboard';
import { formatPaise, formatTransactionAmount } from '@/src/utils/currency';
import { formatDate, formatMonthYear, getCurrentMonthStr } from '@/src/utils/date';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowRight,
  User,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  PieChart,
  Target,
  BarChart3,
  CircleDollarSign,
} from 'lucide-react-native';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());

  const { data: dashboard, isLoading, isRefetching, refetch } = useDashboard(selectedMonth);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(prevStr);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const nextStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(nextStr);
  };

  const isCurrentMonth = selectedMonth === getCurrentMonthStr();

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
      {/* Top Header */}
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Welcome Back
          </Text>
          <Text className="text-2xl font-black text-slate-900" style={{ color: '#0f172a' }}>
            {user?.name || 'My Finances'}
          </Text>
        </View>

        <Pressable
          onPress={() => router.push('/settings')}
          className="w-10 h-10 rounded-full bg-white border border-slate-300 items-center justify-center active:bg-slate-100 shadow-sm"
        >
          <User size={18} color="#026ac8" />
        </Pressable>
      </View>

      {/* Month Selector Bar */}
      <View className="flex-row items-center justify-between bg-white px-3.5 py-2.5 rounded-2xl border border-slate-200 mb-4 shadow-sm">
        <Pressable onPress={handlePrevMonth} className="p-1 active:opacity-60">
          <ChevronLeft size={20} color="#475569" />
        </Pressable>

        <View className="flex-row items-center gap-1.5">
          <Calendar size={14} color="#026ac8" />
          <Text className="text-xs font-bold text-slate-900" style={{ color: '#0f172a' }}>
            {formatMonthYear(selectedMonth)}
          </Text>
          {isCurrentMonth && (
            <Badge label="Current" variant="default" className="ml-1" />
          )}
        </View>

        <Pressable onPress={handleNextMonth} className="p-1 active:opacity-60">
          <ChevronRight size={20} color="#475569" />
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingSpinner message="Calculating real-time financial ledger..." />
      ) : (
        <>
          {/* ─── Modern Luxury Financial Hero Card ─────────── */}
          <Card
            className="p-5 mb-4 shadow-xl border-0 overflow-hidden"
            style={{
              backgroundColor: '#021838',
              borderRadius: 24,
            }}
          >
            {/* Background ambient accents */}
            <View
              style={{
                position: 'absolute',
                top: -30,
                right: -30,
                width: 140,
                height: 140,
                borderRadius: 70,
                backgroundColor: '#38bdf8',
                opacity: 0.12,
              }}
            />

            <View className="flex-row items-center justify-between mb-1.5">
              <View className="flex-row items-center gap-2">
                <View className="w-6 h-6 rounded-full bg-amber-400/20 items-center justify-center">
                  <CircleDollarSign size={14} color="#fbbf24" />
                </View>
                <Text className="text-xs font-black text-sky-300 uppercase tracking-widest">
                  Total Tracked Balance
                </Text>
              </View>
              <View className="bg-sky-500/20 px-2 py-0.5 rounded-full border border-sky-400/30">
                <Text className="text-[10px] font-bold text-sky-200">Verified</Text>
              </View>
            </View>

            <Text className="text-3xl font-black text-white mt-1 tracking-tight">
              {formatPaise(dashboard?.netWealth ?? 0)}
            </Text>
            <Text className="text-[11px] font-medium text-slate-300 mt-1">
              Consolidated cash & bank ledger balance
            </Text>

            {/* Income, Expense, and Net Flow Split Badges */}
            <View className="flex-row gap-2 mt-4 pt-4 border-t border-slate-700/60">
              <View className="flex-1 bg-slate-900/70 p-2.5 rounded-xl border border-slate-700/50">
                <View className="flex-row items-center gap-1">
                  <TrendingUp size={12} color="#34d399" />
                  <Text className="text-[10px] font-bold text-slate-300 uppercase">Income</Text>
                </View>
                <Text className="text-sm font-black text-emerald-400 mt-1">
                  {formatPaise(dashboard?.monthlySummary?.income ?? 0)}
                </Text>
              </View>

              <View className="flex-1 bg-slate-900/70 p-2.5 rounded-xl border border-slate-700/50">
                <View className="flex-row items-center gap-1">
                  <TrendingDown size={12} color="#f87171" />
                  <Text className="text-[10px] font-bold text-slate-300 uppercase">Expenses</Text>
                </View>
                <Text className="text-sm font-black text-rose-400 mt-1">
                  {formatPaise(dashboard?.monthlySummary?.expense ?? 0)}
                </Text>
              </View>

              <View className="flex-1 bg-slate-900/70 p-2.5 rounded-xl border border-slate-700/50">
                <Text className="text-[10px] font-bold text-slate-300 uppercase">Net Flow</Text>
                <Text
                  className={`text-sm font-black mt-1 ${
                    (dashboard?.monthlySummary?.netCashFlow ?? 0) >= 0
                      ? 'text-sky-300'
                      : 'text-amber-400'
                  }`}
                  numberOfLines={1}
                >
                  {(dashboard?.monthlySummary?.netCashFlow ?? 0) >= 0 ? '+' : ''}
                  {formatPaise(dashboard?.monthlySummary?.netCashFlow ?? 0)}
                </Text>
              </View>
            </View>
          </Card>

          {/* Quick Actions Row */}
          <View className="flex-row gap-2.5 mb-5">
            <Pressable
              onPress={() => router.push('/transaction/add')}
              className="flex-1 bg-white border border-slate-200 p-3 rounded-2xl items-center flex-row justify-center gap-2 shadow-sm active:bg-slate-50"
            >
              <View className="w-7 h-7 rounded-full bg-primary-100 items-center justify-center">
                <Plus size={16} color="#026ac8" />
              </View>
              <Text className="text-xs font-bold text-slate-900" style={{ color: '#0f172a' }}>
                Add Entry
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/reports')}
              className="flex-1 bg-white border border-slate-200 p-3 rounded-2xl items-center flex-row justify-center gap-2 shadow-sm active:bg-slate-50"
            >
              <View className="w-7 h-7 rounded-full bg-purple-100 items-center justify-center">
                <BarChart3 size={16} color="#7c3aed" />
              </View>
              <Text className="text-xs font-bold text-slate-900" style={{ color: '#0f172a' }}>
                Reports
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(tabs)/budgets')}
              className="flex-1 bg-white border border-slate-200 p-3 rounded-2xl items-center flex-row justify-center gap-2 shadow-sm active:bg-slate-50"
            >
              <View className="w-7 h-7 rounded-full bg-emerald-100 items-center justify-center">
                <PieChart size={16} color="#059669" />
              </View>
              <Text className="text-xs font-bold text-slate-900" style={{ color: '#0f172a' }}>
                Budgets
              </Text>
            </Pressable>
          </View>

          {/* Budget Overview Card */}
          <Card className="mb-4 bg-white border border-slate-200 shadow-sm">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Monthly Budgets
              </Text>
              <Pressable onPress={() => router.push('/(tabs)/budgets')}>
                <Text className="text-xs font-bold text-primary-700">View Details</Text>
              </Pressable>
            </View>

            <View className="flex-row justify-between items-baseline mb-2">
              <Text className="text-lg font-black text-slate-900" style={{ color: '#0f172a' }}>
                {formatPaise(dashboard?.budgets?.totalSpent ?? 0)}
              </Text>
              <Text className="text-xs font-semibold text-slate-600">
                of {formatPaise(dashboard?.budgets?.totalBudget ?? 0)} Limit
              </Text>
            </View>

            {/* Progress Bar */}
            <View className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <View
                className={`h-full rounded-full ${
                  (dashboard?.budgets?.overallUtilizationPercentage ?? 0) > 100
                    ? 'bg-rose-500'
                    : (dashboard?.budgets?.overallUtilizationPercentage ?? 0) >= 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{
                  width: `${Math.min(
                    dashboard?.budgets?.overallUtilizationPercentage ?? 0,
                    100,
                  )}%`,
                }}
              />
            </View>

            <View className="flex-row justify-between items-center mt-2">
              <Text className="text-[11px] font-semibold text-slate-600">
                Utilization: {dashboard?.budgets?.overallUtilizationPercentage ?? 0}%
              </Text>
              {(dashboard?.budgets?.overallUtilizationPercentage ?? 0) >= 80 && (
                <Badge
                  label={
                    (dashboard?.budgets?.overallUtilizationPercentage ?? 0) > 100
                      ? 'Exceeded'
                      : 'Warning'
                  }
                  variant={
                    (dashboard?.budgets?.overallUtilizationPercentage ?? 0) > 100
                      ? 'critical'
                      : 'warning'
                  }
                />
              )}
            </View>
          </Card>

          {/* Savings Goals Summary Card */}
          <Card className="mb-4 bg-white border border-slate-200 shadow-sm">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-1.5">
                <Target size={16} color="#7c3aed" />
                <Text className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Savings Goals
                </Text>
              </View>
              <Pressable onPress={() => router.push('/(tabs)/goals')}>
                <Text className="text-xs font-bold text-purple-700">Explore</Text>
              </Pressable>
            </View>

            <View className="flex-row justify-between items-baseline">
              <View>
                <Text className="text-lg font-black text-slate-900" style={{ color: '#0f172a' }}>
                  {formatPaise(dashboard?.goals?.totalSaved ?? 0)}
                </Text>
                <Text className="text-xs font-semibold text-slate-600">
                  Total saved across {dashboard?.goals?.activeGoalsCount ?? 0} active goals
                </Text>
              </View>
              <Text className="text-xs font-bold text-purple-700">
                Target: {formatPaise(dashboard?.goals?.totalTarget ?? 0)}
              </Text>
            </View>
          </Card>

          {/* Financial Insights Section */}
          {dashboard?.insights && dashboard.insights.length > 0 && (
            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5">
                Smart Insights
              </Text>
              <View className="gap-2">
                {dashboard.insights.map((insight, idx) => (
                  <Card
                    key={idx}
                    className={`p-3.5 flex-row gap-3 ${
                      insight.severity === 'warning'
                        ? 'bg-amber-50 border-amber-200'
                        : insight.severity === 'positive'
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-primary-50 border-primary-200'
                    }`}
                  >
                    <View className="pt-0.5">
                      <Sparkles
                        size={18}
                        color={
                          insight.severity === 'warning'
                            ? '#d97706'
                            : insight.severity === 'positive'
                            ? '#059669'
                            : '#026ac8'
                        }
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-bold text-slate-900" style={{ color: '#0f172a' }}>
                        {insight.title}
                      </Text>
                      <Text className="text-xs font-medium text-slate-700 mt-0.5 leading-relaxed">
                        {insight.message}
                      </Text>
                    </View>
                  </Card>
                ))}
              </View>
            </View>
          )}

          {/* Recent Activity Section */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-2.5">
              <Text className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Recent Activity
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/transactions')}
                className="flex-row items-center gap-1"
              >
                <Text className="text-xs font-bold text-primary-700">View All</Text>
                <ArrowRight size={14} color="#026ac8" />
              </Pressable>
            </View>

            {dashboard?.recentTransactions && dashboard.recentTransactions.length > 0 ? (
              <Card className="p-0 overflow-hidden divide-y divide-slate-100 bg-white border border-slate-200 shadow-sm">
                {dashboard.recentTransactions.slice(0, 5).map((tx) => {
                  const { text, colorClass } = formatTransactionAmount(tx.type, tx.amount);
                  return (
                    <Pressable
                      key={tx._id || tx.id}
                      onPress={() => router.push(`/transaction/${tx._id || tx.id}`)}
                      className="flex-row items-center justify-between p-3.5 active:bg-slate-50"
                    >
                      <View className="flex-1 pr-3">
                        <Text
                          className="text-sm font-bold text-slate-900"
                          style={{ color: '#0f172a' }}
                          numberOfLines={1}
                        >
                          {tx.description}
                        </Text>
                        <View className="flex-row items-center gap-2 mt-1">
                          <Badge label={tx.category} variant="default" />
                          <Text className="text-[11px] font-semibold text-slate-500">
                            {formatDate(tx.date)}
                          </Text>
                        </View>
                      </View>
                      <Text className={`text-sm font-black ${colorClass}`}>
                        {text}
                      </Text>
                    </Pressable>
                  );
                })}
              </Card>
            ) : (
              <Card className="bg-white border border-slate-200 shadow-sm">
                <EmptyState
                  title="No Transactions"
                  description="You have no recorded transactions for this month."
                  actionTitle="Record Entry"
                  onAction={() => router.push('/transaction/add')}
                />
              </Card>
            )}
          </View>
        </>
      )}
    </ScreenWrapper>
  );
}
