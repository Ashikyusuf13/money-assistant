import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  RefreshControl,
  BackHandler,
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
} from 'lucide-react-native';

const CATEGORY_COLORS: Record<string, string> = {
  food: '#D97706',
  groceries: '#EA580C',
  transport: '#0284C7',
  shopping: '#DB2777',
  bills: '#CA8A04',
  health: '#DC2626',
  entertainment: '#9333EA',
  salary: '#059669',
  income: '#059669',
  transfer: '#4F46E5',
  refund: '#0891B2',
  others: '#64748B',
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[(category || '').toLowerCase()] ?? '#64748B';
}

function renderCategoryIcon(category: string, color: string, size = 18) {
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
    case 'salary':
      return <Briefcase size={size} color={color} strokeWidth={2.2} />;
    case 'income':
      return <CircleDollarSign size={size} color={color} strokeWidth={2.2} />;
    case 'transfer':
      return <ArrowLeftRight size={size} color={color} strokeWidth={2.2} />;
    case 'refund':
      return <RotateCcw size={size} color={color} strokeWidth={2.2} />;
    default:
      return <Package size={size} color={color} strokeWidth={2.2} />;
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
  const [showExitModal, setShowExitModal] = useState(false);

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

  const handleRefresh = async () => {
    await Promise.all([refetchDashboard(), refetchSalary()]);
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

  return (
    <ScreenWrapper
      scrollable
      style={{ backgroundColor: '#F0F4FF', flex: 1 }}
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
        <Pressable onPress={handlePrevMonth} style={styles.chevronBtn}>
          <ChevronLeft size={20} color="#1565C0" />
        </Pressable>

        <View style={styles.monthCenter}>
          <Calendar size={14} color="#1565C0" />
          <Text style={styles.monthText}>{formatMonthYear(selectedMonth)}</Text>
          {isCurrentMonth && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>Current</Text>
            </View>
          )}
        </View>

        <Pressable onPress={handleNextMonth} style={styles.chevronBtn}>
          <ChevronRight size={20} color="#1565C0" />
        </Pressable>
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

          {/* ── Budget Overview ───────────────────────────── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.rowCenter}>
                <PieChart size={15} color="#1565C0" />
                <Text style={[styles.sectionTitle, { marginLeft: 6 }]}>Monthly Budgets</Text>
              </View>
              <Pressable onPress={() => router.push('/(tabs)/budgets')}>
                <Text style={styles.seeAllText}>View Details →</Text>
              </Pressable>
            </View>

            <View style={styles.budgetAmountRow}>
              <Text style={styles.budgetSpent}>
                {formatPaise(dashboard?.budgets?.totalSpent ?? 0)}
              </Text>
              <Text style={styles.budgetLimit}>
                of {formatPaise(dashboard?.budgets?.totalBudget ?? 0)} limit
              </Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(utilizationPct, 100)}%` as `${number}%`,
                    backgroundColor:
                      utilizationPct > 100
                        ? '#F44336'
                        : utilizationPct >= 80
                        ? '#FF9800'
                        : '#4CAF50',
                  },
                ]}
              />
            </View>

            <View style={styles.budgetFooter}>
              <Text style={styles.budgetUtilText}>
                Utilization: {utilizationPct}%
              </Text>
              {utilizationPct >= 80 && (
                <Badge
                  label={utilizationPct > 100 ? 'Exceeded' : 'Warning'}
                  variant={utilizationPct > 100 ? 'critical' : 'warning'}
                />
              )}
            </View>
          </View>

          {/* ── Smart Insights ────────────────────────────── */}
          {dashboard?.insights && dashboard.insights.length > 0 && (
            <View style={styles.insightsSection}>
              <Text style={styles.insightsSectionTitle}>✨ Smart Insights</Text>
              <View style={{ gap: 8 }}>
                {dashboard.insights.map((insight, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.insightCard,
                      {
                        backgroundColor:
                          insight.severity === 'warning'
                            ? '#FFFDE7'
                            : insight.severity === 'positive'
                            ? '#E8F5E9'
                            : '#E3F2FD',
                        borderLeftColor:
                          insight.severity === 'warning'
                            ? '#FFC107'
                            : insight.severity === 'positive'
                            ? '#4CAF50'
                            : '#1565C0',
                      },
                    ]}
                  >
                    <Sparkles
                      size={16}
                      color={
                        insight.severity === 'warning'
                          ? '#F57F17'
                          : insight.severity === 'positive'
                          ? '#2E7D32'
                          : '#1565C0'
                      }
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.insightTitle}>{insight.title}</Text>
                      <Text style={styles.insightMessage}>{insight.message}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

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
                {dashboard.recentTransactions.slice(0, 4).map((tx) => {
                  const { text } = formatTransactionAmount(tx.type, tx.amount);
                  const isIncome = tx.type === 'income' || tx.type === 'refund';
                  const amountColor = isIncome ? '#059669' : '#DC2626';
                  const catColor = getCategoryColor(tx.category);

                  return (
                    <Pressable
                      key={tx._id || tx.id}
                      onPress={() => router.push(`/transaction/${tx._id || tx.id}`)}
                      style={({ pressed }) => [
                        styles.recentTxCard,
                        pressed && { backgroundColor: '#F8FAFC' },
                      ]}
                    >
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
                            <Text style={[styles.txCategoryText, { color: catColor }]}>{tx.category}</Text>
                          </View>
                          <Text style={styles.txDate}>{formatDate(tx.date)}</Text>
                        </View>
                      </View>

                      {/* Amount */}
                      <Text style={[styles.txAmount, { color: amountColor }]}>
                        {text}
                      </Text>
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
  },
  recentTxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  txIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  txMiddle: {
    flex: 1,
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
    fontSize: 14,
    fontWeight: '800',
  },
});
