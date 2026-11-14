import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  RefreshControl,
  BackHandler,
  Modal,
  StyleSheet,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ScreenWrapper,
  Card,
  Badge,
  SkeletonCard,
  SkeletonList,
  EmptyState,
  ConfirmModal,
} from '@/src/components/ui';
import { useAuthStore } from '@/src/store/authStore';
import { useDashboard } from '@/src/hooks/useDashboard';
import { useSalary } from '@/src/hooks/useSalary';
import { useBudgets } from '@/src/hooks/useBudgets';
import { formatPaise, formatTransactionAmount } from '@/src/utils/currency';
import { formatDate, formatMonthYear, getCurrentMonthStr } from '@/src/utils/date';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowRight,
  User,
  Calendar,
  CalendarDays,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  PieChart,
  FileText,
  BarChart3,
  CircleDollarSign,
  Wallet,
  Minus,
  Utensils,
  ShoppingCart,
  Car,
  ShoppingBag,
  Zap,
  Heart,
  Film,
  Briefcase,
  ArrowLeftRight,
  RotateCcw,
  Package,
  X,
} from 'lucide-react-native';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function getMonthDateRange(monthStr: string): string {
  const [y, m] = monthStr.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const startDay = '01';
  const endDay = String(lastDay).padStart(2, '0');
  const monthName = MONTH_NAMES[m - 1] || 'Month';
  return `${startDay} ${monthName} ${y} – ${endDay} ${monthName} ${y}`;
}

const CATEGORY_COLORS: Record<string, string> = {
  food: '#D97706',
  dining: '#D97706',
  restaurant: '#D97706',
  groceries: '#EA580C',
  grocery: '#EA580C',
  transport: '#0284C7',
  travel: '#0284C7',
  fuel: '#0284C7',
  shopping: '#DB2777',
  bills: '#CA8A04',
  bill: '#CA8A04',
  utilities: '#CA8A04',
  health: '#DC2626',
  medical: '#DC2626',
  medicine: '#DC2626',
  entertainment: '#9333EA',
  movie: '#9333EA',
  salary: '#059669',
  income: '#059669',
  bonus: '#059669',
  transfer: '#4F46E5',
  refund: '#0891B2',
  investment: '#0D9488',
  investments: '#0D9488',
  lic: '#0D9488',
  policy: '#0D9488',
  insurance: '#0D9488',
  other: '#64748B',
  others: '#64748B',
};

const CUSTOM_CATEGORY_PALETTE = [
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#0D9488', // Teal
  '#EC4899', // Pink
  '#0284C7', // Sky
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#D946EF', // Fuchsia
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

function getCategoryColor(category: string): string {
  const lower = (category || '').toLowerCase().trim();
  if (CATEGORY_COLORS[lower]) {
    return CATEGORY_COLORS[lower];
  }
  let hash = 0;
  for (let i = 0; i < lower.length; i++) {
    hash = (hash << 5) - hash + lower.charCodeAt(i);
    hash |= 0;
  }
  return CUSTOM_CATEGORY_PALETTE[Math.abs(hash) % CUSTOM_CATEGORY_PALETTE.length]!;
}

function formatCategoryBadgeLabel(category: string): string {
  const clean = (category || '').trim();
  if (clean.length <= 3) {
    return clean.toUpperCase(); // e.g. "LIC", "TV", "OTT"
  }
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function renderCategoryIcon(category: string, color: string, size = 18) {
  const cat = (category || '').toLowerCase().trim();
  switch (cat) {
    case 'food':
    case 'dining':
    case 'restaurant':
    case 'eats':
    case 'snacks':
      return <Utensils size={size} color={color} strokeWidth={2.2} />;
    case 'groceries':
    case 'grocery':
    case 'supermarket':
    case 'mart':
      return <ShoppingCart size={size} color={color} strokeWidth={2.2} />;
    case 'transport':
    case 'travel':
    case 'fuel':
    case 'petrol':
    case 'diesel':
    case 'cab':
    case 'auto':
      return <Car size={size} color={color} strokeWidth={2.2} />;
    case 'shopping':
    case 'clothes':
    case 'dress':
    case 'mall':
      return <ShoppingBag size={size} color={color} strokeWidth={2.2} />;
    case 'bills':
    case 'bill':
    case 'utilities':
    case 'utility':
    case 'electricity':
    case 'eb':
    case 'recharge':
    case 'wifi':
    case 'water':
      return <Zap size={size} color={color} strokeWidth={2.2} />;
    case 'health':
    case 'medical':
    case 'medicine':
    case 'hospital':
    case 'doctor':
    case 'clinic':
    case 'pharma':
      return <Heart size={size} color={color} strokeWidth={2.2} />;
    case 'entertainment':
    case 'movie':
    case 'cinema':
    case 'theatre':
    case 'ott':
    case 'tv':
    case 'netflix':
      return <Film size={size} color={color} strokeWidth={2.2} />;
    case 'salary':
    case 'pay':
    case 'wage':
    case 'stipend':
      return <Briefcase size={size} color={color} strokeWidth={2.2} />;
    case 'bonus':
    case 'income':
    case 'incentive':
    case 'reward':
    case 'cashback':
      return <CircleDollarSign size={size} color={color} strokeWidth={2.2} />;
    case 'transfer':
      return <ArrowLeftRight size={size} color={color} strokeWidth={2.2} />;
    case 'refund':
      return <RotateCcw size={size} color={color} strokeWidth={2.2} />;
    case 'investment':
    case 'investments':
    case 'lic':
    case 'policy':
    case 'insurance':
    case 'sip':
    case 'mutual fund':
    case 'stocks':
    case 'gold':
      return <TrendingUp size={size} color={color} strokeWidth={2.2} />;
    default:
      return <Package size={size} color={color} strokeWidth={2.2} />;
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
  const [showExitModal, setShowExitModal] = useState(false);
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => Number(getCurrentMonthStr().split('-')[0]) || new Date().getFullYear());

  // Hardware back button handler — active ONLY when Home screen tab is focused
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        setShowExitModal(true);
        return true; // Prevent default app exit
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  const { data: dashboard, isLoading, isRefetching, refetch: refetchDashboard } = useDashboard(selectedMonth);
  const { data: salary, refetch: refetchSalary } = useSalary();
  const { data: budgetsData, refetch: refetchBudgets } = useBudgets(selectedMonth);

  const handleRefresh = async () => {
    await Promise.all([refetchDashboard(), refetchSalary(), refetchBudgets()]);
  };

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

  // Salary and month balance calculation
  // Total base monthly salary set in profile, or dashboard income as fallback
  const startingSalary = (salary?.baseMonthlySalary && salary.baseMonthlySalary > 0)
    ? salary.baseMonthlySalary
    : (dashboard?.monthlySummary?.income ?? 0);
  const monthExpense = dashboard?.monthlySummary?.expense ?? 0;
  // If base salary is 12000 and 20 is spent, currentBalance is 11980
  const currentMonthBalance = startingSalary - monthExpense;

  const utilizationPct = dashboard?.budgets?.overallUtilizationPercentage ?? 0;

  // ── Groceries Budget Only (User Requested: show only groceries budget) ────────
  const budgetsList = Array.isArray(budgetsData)
    ? budgetsData
    : Array.isArray((budgetsData as any)?.budgets)
    ? (budgetsData as any).budgets
    : [];

  const groceriesBudget = budgetsList.find(
    (b: any) => (b.category || '').toLowerCase() === 'groceries'
  );
  const groceriesCategorySpend = dashboard?.categoryBreakdown?.find(
    (c: any) => (c.category || '').toLowerCase() === 'groceries'
  )?.spentPaise ?? 0;

  const groceriesLimit = groceriesBudget?.amount ?? 0;
  const groceriesSpent = groceriesBudget?.spent ?? groceriesCategorySpend;
  const groceriesRemaining = Math.max(0, groceriesLimit - groceriesSpent);
  const groceriesUtil = groceriesLimit > 0
    ? Math.round((groceriesSpent / groceriesLimit) * 100)
    : 0;

  return (
    <ScreenWrapper
      scrollable
      style={{ backgroundColor: '#F0F4FF', flex: 1 }}
      contentContainerStyle={{ paddingBottom: 130 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={handleRefresh}
          tintColor="#1565C0"
          colors={['#1565C0']}
        />
      }
    >
      {/* ── Header ───────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greetingSub}>Good Day</Text>
          <Text style={styles.greetingMain}>
            Hello, {user?.name || 'User'} 👋
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/settings')}
          style={styles.profileBtn}
          accessibilityLabel="Open Profile & Settings"
        >
          <User size={20} color="#1565C0" strokeWidth={2.2} />
        </Pressable>
      </View>

      {/* ── Month Selector ───────────────────────────────── */}
      <View style={styles.monthSelector}>
        <Pressable onPress={handlePrevMonth} style={styles.chevronBtn} accessibilityLabel="Previous Month">
          <ChevronLeft size={20} color="#1565C0" />
        </Pressable>

        <Pressable
          onPress={() => {
            const [y] = selectedMonth.split('-').map(Number);
            setPickerYear(y || new Date().getFullYear());
            setShowMonthModal(true);
          }}
          style={styles.monthCenter}
          accessibilityLabel="Open Month Picker"
        >
          <Calendar size={14} color="#1565C0" />
          <Text style={styles.monthText}>{formatMonthYear(selectedMonth)}</Text>
          {isCurrentMonth ? (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>Current</Text>
            </View>
          ) : (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>Selected</Text>
            </View>
          )}
        </Pressable>

        <Pressable onPress={handleNextMonth} style={styles.chevronBtn} accessibilityLabel="Next Month">
          <ChevronRight size={20} color="#1565C0" />
        </Pressable>
      </View>

      {/* ── Active Month Date Range Subtitle ─────────────── */}
      <View style={styles.dateRangeRow}>
        <CalendarDays size={13} color="#1565C0" strokeWidth={2.4} />
        <Text style={styles.dateRangeText}>
          {getMonthDateRange(selectedMonth)}
        </Text>
      </View>

      {isLoading ? (
        <View style={{ gap: 14, marginTop: 8, marginBottom: 24, paddingHorizontal: 16 }}>
          <SkeletonCard height={170} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <SkeletonCard height={95} />
            </View>
            <View style={{ flex: 1 }}>
              <SkeletonCard height={95} />
            </View>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16 }}>
            <SkeletonList count={4} />
          </View>
        </View>
      ) : (
        <>
          {/* ── Hero Balance Card ─────────────────────────── */}
          <LinearGradient
            colors={['#1565C0', '#1976D2', '#1E88E5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            {/* Decorative circle accents */}
            <View style={styles.heroBubble1} />
            <View style={styles.heroBubble2} />

            {/* Card Header */}
            <View style={styles.heroTopRow}>
              <View style={styles.heroLabelRow}>
                <Wallet size={15} color="#90CAF9" />
                <Text style={styles.heroLabel}>This Month's Balance</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>● {formatMonthYear(selectedMonth)}</Text>
              </View>
            </View>

            {/* Big Balance */}
            <Text style={styles.heroBalance}>
              {formatPaise(currentMonthBalance)}
            </Text>
            <Text style={styles.heroSubLabel}>
              Starting: {formatPaise(startingSalary)}  •  Spent: {formatPaise(monthExpense)}
            </Text>

            {/* Income / Expense / Net Flow row */}
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatCard}>
                <View style={styles.heroStatHeader}>
                  <TrendingUp size={12} color="#A5D6A7" />
                  <Text style={styles.heroStatLabel}>Base Salary</Text>
                </View>
                <Text style={[styles.heroStatValue, { color: '#A5D6A7' }]}>
                  {formatPaise(startingSalary)}
                </Text>
              </View>

              <View style={styles.heroStatDivider} />

              <View style={styles.heroStatCard}>
                <View style={styles.heroStatHeader}>
                  <TrendingDown size={12} color="#EF9A9A" />
                  <Text style={styles.heroStatLabel}>Expenses</Text>
                </View>
                <Text style={[styles.heroStatValue, { color: '#EF9A9A' }]}>
                  {formatPaise(monthExpense)}
                </Text>
              </View>

              <View style={styles.heroStatDivider} />

              <View style={styles.heroStatCard}>
                <View style={styles.heroStatHeader}>
                  {currentMonthBalance >= 0 ? (
                    <TrendingUp size={12} color="#90CAF9" />
                  ) : (
                    <TrendingDown size={12} color="#FFCC80" />
                  )}
                  <Text style={styles.heroStatLabel}>Remaining</Text>
                </View>
                <Text
                  style={[
                    styles.heroStatValue,
                    { color: currentMonthBalance >= 0 ? '#90CAF9' : '#FFCC80' },
                  ]}
                  numberOfLines={1}
                >
                  {formatPaise(currentMonthBalance)}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* ── Quick Actions ─────────────────────────────── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <Pressable onPress={() => router.push('/(tabs)/transactions')}>
                <Text style={styles.seeAllText}>See all →</Text>
              </Pressable>
            </View>

            <View style={styles.quickActionsRow}>
              {/* Add Income */}
              <Pressable
                onPress={() => router.push('/transaction/income')}
                style={styles.quickActionItem}
              >
                <View style={[styles.quickActionCircle, { backgroundColor: '#E8F5E9' }]}>
                  <Plus size={22} color="#059669" />
                </View>
                <Text style={styles.quickActionLabel}>Add{'\n'}Income</Text>
              </Pressable>

              {/* Add Expense */}
              <Pressable
                onPress={() => router.push('/transaction/expense')}
                style={styles.quickActionItem}
              >
                <View style={[styles.quickActionCircle, { backgroundColor: '#FFEBEE' }]}>
                  <Minus size={22} color="#DC2626" />
                </View>
                <Text style={styles.quickActionLabel}>Add{'\n'}Expense</Text>
              </Pressable>

              {/* Budgets */}
              <Pressable
                onPress={() => router.push('/(tabs)/budgets')}
                style={styles.quickActionItem}
              >
                <View style={[styles.quickActionCircle, { backgroundColor: '#EDE9FE' }]}>
                  <PieChart size={22} color="#7C3AED" />
                </View>
                <Text style={styles.quickActionLabel}>Monthly{'\n'}Budgets</Text>
              </Pressable>

              {/* Reports */}
              <Pressable
                onPress={() => router.push('/(tabs)/reports')}
                style={styles.quickActionItem}
              >
                <View style={[styles.quickActionCircle, { backgroundColor: '#E0F2FE' }]}>
                  <FileText size={22} color="#0284C7" />
                </View>
                <Text style={styles.quickActionLabel}>Financial{'\n'}Reports</Text>
              </Pressable>
            </View>
          </View>

          {/* ── Groceries Budget (Requested: only show Groceries budget, not other budgets) ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.rowCenter}>
                <View style={[styles.txIconCircle, { width: 34, height: 34, backgroundColor: '#EA580C15', borderColor: '#EA580C30', marginRight: 8 }]}>
                  <ShoppingCart size={16} color="#EA580C" />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Groceries Budget</Text>
                  <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '600' }}>
                    {formatMonthYear(selectedMonth)} Spending Limit
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => router.push('/(tabs)/budgets')}
                style={styles.rowCenter}
              >
                <Text style={styles.seeAllText}>Manage Budgets</Text>
                <ArrowRight size={13} color="#1565C0" />
              </Pressable>
            </View>

            {groceriesLimit > 0 ? (
              <>
                {/* 3-Column Financial Metrics Grid */}
                <View style={styles.budgetMetricsRow}>
                  <View style={styles.budgetMetricItem}>
                    <Text style={styles.budgetMetricLabel}>BUDGET LIMIT</Text>
                    <Text style={styles.budgetMetricVal}>{formatPaise(groceriesLimit)}</Text>
                    <Text style={styles.budgetMetricSub}>Allocated</Text>
                  </View>
                  <View style={styles.budgetMetricDivider} />
                  <View style={styles.budgetMetricItem}>
                    <Text style={styles.budgetMetricLabel}>SPENT</Text>
                    <Text style={[styles.budgetMetricVal, { color: '#DC2626' }]}>
                      {formatPaise(groceriesSpent)}
                    </Text>
                    <Text style={styles.budgetMetricSub}>{groceriesUtil}% utilized</Text>
                  </View>
                  <View style={styles.budgetMetricDivider} />
                  <View style={styles.budgetMetricItem}>
                    <Text style={styles.budgetMetricLabel}>REMAINING</Text>
                    <Text style={[styles.budgetMetricVal, { color: groceriesRemaining > 0 ? '#059669' : '#DC2626' }]}>
                      {formatPaise(groceriesRemaining)}
                    </Text>
                    <Text style={styles.budgetMetricSub}>Available left</Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(groceriesUtil, 100)}%` as `${number}%`,
                        backgroundColor:
                          groceriesUtil > 100
                            ? '#DC2626'
                            : groceriesUtil >= 80
                            ? '#F59E0B'
                            : '#10B981',
                      },
                    ]}
                  />
                </View>

                <View style={styles.budgetFooter}>
                  <Text style={styles.budgetUtilText}>
                    {groceriesUtil}% of groceries budget spent
                  </Text>
                  {groceriesUtil >= 80 ? (
                    <Badge
                      label={groceriesUtil > 100 ? 'Budget Exceeded' : 'Near Limit'}
                      variant={groceriesUtil > 100 ? 'critical' : 'warning'}
                    />
                  ) : (
                    <View style={styles.onTrackBadge}>
                      <Text style={styles.onTrackBadgeText}>On Track</Text>
                    </View>
                  )}
                </View>
              </>
            ) : (
              <View style={{ paddingVertical: 8, alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 10 }}>
                  <Text style={{ fontSize: 13, color: '#475569', fontWeight: '600' }}>
                    Groceries Spent this Month:
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#DC2626' }}>
                    {formatPaise(groceriesSpent)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push('/(tabs)/budgets')}
                  style={{
                    backgroundColor: '#1565C0',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                    Set Groceries Budget
                  </Text>
                </Pressable>
              </View>
            )}
          </View>


          {/* ── Recent Transactions (Latest 4 Records, Clean Cards) ───────────────────────── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <Pressable
                onPress={() => router.push('/(tabs)/transactions')}
                style={styles.rowCenter}
              >
                <Text style={styles.seeAllText}>See all</Text>
                <ArrowRight size={13} color="#1565C0" />
              </Pressable>
            </View>

            {dashboard?.recentTransactions && dashboard.recentTransactions.length > 0 ? (
              <View style={styles.txCardsContainer}>
                {[...dashboard.recentTransactions]
                  .sort((a, b) => {
                    const timeA = new Date(a.date).getTime();
                    const timeB = new Date(b.date).getTime();
                    if (timeB !== timeA) return timeB - timeA;
                    if (a.createdAt && b.createdAt) {
                      const createdA = new Date(a.createdAt).getTime();
                      const createdB = new Date(b.createdAt).getTime();
                      if (createdB !== createdA) return createdB - createdA;
                    }
                    const idA = a._id || a.id || '';
                    const idB = b._id || b.id || '';
                    return idB.localeCompare(idA);
                  })
                  .slice(0, 4)
                  .map((tx) => {
                  const { text } = formatTransactionAmount(tx.type, tx.amount);
                  const isIncome = tx.type === 'income' || tx.type === 'refund';
                  const amountColor = isIncome ? '#059669' : '#DC2626';
                  const catColor = getCategoryColor(tx.category);

                  return (
                    <Pressable
                      key={tx._id || tx.id}
                      onPress={() => router.push(`/transaction/${tx._id || tx.id}`)}
                      style={styles.recentTxPressable}
                    >
                      <View style={styles.recentTxCard}>
                        {/* Category Icon */}
                        <View style={[styles.txIconCircle, { backgroundColor: catColor + '15', borderColor: catColor + '30' }]}>
                          {renderCategoryIcon(tx.category, catColor, 18)}
                        </View>

                        {/* Description + meta */}
                        <View style={styles.txMiddle}>
                          <Text style={styles.txDesc} numberOfLines={1}>
                            {tx.description}
                          </Text>
                          <View style={styles.txMeta}>
                            <View style={[styles.txCategoryPill, { backgroundColor: catColor + '15' }]}>
                              <Text style={[styles.txCategoryText, { color: catColor }]}>
                                {formatCategoryBadgeLabel(tx.category)}
                              </Text>
                            </View>
                            <Text style={styles.txDate}>{formatDate(tx.date)}</Text>
                          </View>
                        </View>

                        {/* Amount */}
                        <Text style={[styles.txAmount, { color: amountColor }]}>
                          {text}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <EmptyState
                title="No Transactions"
                description="You have no recorded transactions for this month."
                actionTitle="Record Entry"
                onAction={() => router.push('/transaction/add')}
              />
            )}
          </View>

          {/* Generous bottom spacer so tab bar NEVER hides recent transactions */}
          <View style={{ height: 110 }} />
        </>
      )}

      {/* ── Custom Month Picker Modal (Centered) ───────────── */}
      <Modal
        visible={showMonthModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthModal(false)}
      >
        <View style={styles.monthModalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowMonthModal(false)}
          />

          <View style={styles.monthModalCard}>
            {/* Header: Eyebrow + Title + Close */}
            <View style={styles.monthModalHeader}>
              <View>
                <Text style={styles.monthModalEyebrow}>TIMEFRAME SELECTOR</Text>
                <Text style={styles.monthModalTitle}>Choose Month</Text>
              </View>
              <Pressable
                onPress={() => setShowMonthModal(false)}
                style={styles.monthModalCloseBtn}
                accessibilityLabel="Close Month Picker"
              >
                <X size={18} color="#475569" />
              </Pressable>
            </View>

            {/* Year Switcher Bar */}
            <View style={styles.yearSwitcher}>
              <Pressable
                onPress={() => setPickerYear((y) => y - 1)}
                style={styles.yearArrowBtn}
              >
                <ChevronLeft size={18} color="#1565C0" strokeWidth={2.5} />
              </Pressable>
              <Text style={styles.yearLabel}>{pickerYear}</Text>
              <Pressable
                onPress={() => setPickerYear((y) => y + 1)}
                style={styles.yearArrowBtn}
              >
                <ChevronRight size={18} color="#1565C0" strokeWidth={2.5} />
              </Pressable>
            </View>

            {/* 12-Month Grid */}
            <View style={styles.monthGrid}>
              {MONTH_NAMES.map((name, idx) => {
                const monthStr = `${pickerYear}-${String(idx + 1).padStart(2, '0')}`;
                const isSelected = selectedMonth === monthStr;
                const isCurrent = getCurrentMonthStr() === monthStr;

                return (
                  <Pressable
                    key={name}
                    onPress={() => {
                      setSelectedMonth(monthStr);
                      setShowMonthModal(false);
                    }}
                    style={[
                      styles.monthCell,
                      isSelected && styles.monthCellSelected,
                      isCurrent && !isSelected && styles.monthCellCurrent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.monthCellText,
                        isSelected && styles.monthCellTextSelected,
                        isCurrent && !isSelected && styles.monthCellTextCurrent,
                      ]}
                    >
                      {name}
                    </Text>
                    {isCurrent && !isSelected && (
                      <View style={styles.monthCellDot} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Android Hardware Back Press Exit Modal */}
      <ConfirmModal
        visible={showExitModal}
        title="Exit Money Assistant?"
        message="Are you sure you want to close and exit the application?"
        confirmTitle="Exit App"
        cancelTitle="Stay"
        isDestructive
        onConfirm={() => {
          setShowExitModal(false);
          BackHandler.exitApp();
        }}
        onCancel={() => setShowExitModal(false)}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  // ── Header ──────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flex: 1,
  },
  greetingSub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  greetingMain: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  profileBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
  },

  // ── Month Selector ──────────────────────────────────────────
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  chevronBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  currentBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
    textTransform: 'uppercase',
  },
  filterBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1565C0',
    textTransform: 'uppercase',
  },
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignSelf: 'center',
  },
  dateRangeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1565C0',
    letterSpacing: 0.3,
  },

  // ── Hero Card ───────────────────────────────────────────────
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
    elevation: 6,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  heroBubble1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroBubble2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  heroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E0F2FE',
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroBalance: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  heroSubLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#BAE6FD',
    marginBottom: 18,
  },
  heroStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  heroStatCard: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  heroStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E0F2FE',
  },
  heroStatValue: {
    fontSize: 13,
    fontWeight: '900',
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  // ── Sections ────────────────────────────────────────────────
  sectionCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1565C0',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ── Quick Actions ───────────────────────────────────────────
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  quickActionItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    elevation: 1,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 14,
  },

  // ── Budget Overview ─────────────────────────────────────────
  budgetMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  budgetMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  budgetMetricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  budgetMetricVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  budgetMetricSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  budgetMetricDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#CBD5E1',
  },
  onTrackBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  onTrackBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
    textTransform: 'uppercase',
  },
  budgetAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 10,
  },
  budgetSpent: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  budgetLimit: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  progressTrack: {
    height: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  budgetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  budgetUtilText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },

  // ── Insights ────────────────────────────────────────────────
  insightsSection: {
    marginHorizontal: 16,
    marginBottom: 14,
  },
  insightsSectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderLeftWidth: 4,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  insightMessage: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
    lineHeight: 16,
  },

  // ── Recent Transactions Cards ───────────────────────────────
  txCardsContainer: {
    gap: 10,
    width: '100%',
  },
  recentTxPressable: {
    width: '100%',
  },
  recentTxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    width: '100%',
  },
  txIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  txMiddle: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    marginRight: 8,
    justifyContent: 'center',
    gap: 4,
  },
  txDesc: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  txMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txCategoryPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  txCategoryText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  txDate: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 0,
  },
  // ── Month Picker Modal Styles ──────────────────────────────
  monthModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  monthModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monthModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  monthModalEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1565C0',
    letterSpacing: 1,
  },
  monthModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  monthModalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  yearArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  yearLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  monthCell: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  monthCellSelected: {
    backgroundColor: '#1565C0',
    borderColor: '#1565C0',
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
  },
  monthCellCurrent: {
    borderColor: '#1565C0',
  },
  monthCellText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  monthCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  monthCellTextCurrent: {
    color: '#1565C0',
  },
  monthCellDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1565C0',
  },
});
