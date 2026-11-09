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
  LoadingSpinner,
  EmptyState,
  ConfirmModal,
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
  FileText,
  BarChart3,
  CircleDollarSign,
  Bell,
  Wallet,
  Bot,
  Minus,
} from 'lucide-react-native';

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

  const netCashFlow = dashboard?.monthlySummary?.netCashFlow ?? 0;
  const utilizationPct = dashboard?.budgets?.overallUtilizationPercentage ?? 0;

  return (
    <ScreenWrapper
      scrollable
      style={{ backgroundColor: '#F0F4FF', flex: 1 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          tintColor="#1565C0"
          colors={['#1565C0']}
        />
      }
    >
      {/* ── Header ───────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greetingSub}>Good Morning! ☀️</Text>
          <Text style={styles.greetingMain}>
            Hello, {user?.name || 'User'} 👋
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/settings')}
          style={styles.bellBtn}
        >
          <Bell size={20} color="#1565C0" />
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
        <LoadingSpinner message="Loading your financial overview..." />
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
                <Text style={styles.heroLabel}>Current Balance</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>● Live</Text>
              </View>
            </View>

            {/* Big Balance */}
            <Text style={styles.heroBalance}>
              {formatPaise(dashboard?.netWealth ?? 0)}
            </Text>
            <Text style={styles.heroSubLabel}>
              Consolidated cash &amp; bank balance
            </Text>

            {/* Income / Expense / Net Flow row */}
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatCard}>
                <View style={styles.heroStatHeader}>
                  <TrendingUp size={12} color="#A5D6A7" />
                  <Text style={styles.heroStatLabel}>Income</Text>
                </View>
                <Text style={[styles.heroStatValue, { color: '#A5D6A7' }]}>
                  {formatPaise(dashboard?.monthlySummary?.income ?? 0)}
                </Text>
              </View>

              <View style={styles.heroStatDivider} />

              <View style={styles.heroStatCard}>
                <View style={styles.heroStatHeader}>
                  <TrendingDown size={12} color="#EF9A9A" />
                  <Text style={styles.heroStatLabel}>Expenses</Text>
                </View>
                <Text style={[styles.heroStatValue, { color: '#EF9A9A' }]}>
                  {formatPaise(dashboard?.monthlySummary?.expense ?? 0)}
                </Text>
              </View>

              <View style={styles.heroStatDivider} />

              <View style={styles.heroStatCard}>
                <View style={styles.heroStatHeader}>
                  {netCashFlow >= 0 ? (
                    <TrendingUp size={12} color="#90CAF9" />
                  ) : (
                    <TrendingDown size={12} color="#FFCC80" />
                  )}
                  <Text style={styles.heroStatLabel}>Net Flow</Text>
                </View>
                <Text
                  style={[
                    styles.heroStatValue,
                    { color: netCashFlow >= 0 ? '#90CAF9' : '#FFCC80' },
                  ]}
                  numberOfLines={1}
                >
                  {netCashFlow >= 0 ? '+' : ''}
                  {formatPaise(netCashFlow)}
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
                onPress={() => router.push('/transaction/add')}
                style={styles.quickActionItem}
              >
                <View style={[styles.quickActionCircle, { backgroundColor: '#E8F5E9' }]}>
                  <Plus size={22} color="#4CAF50" />
                </View>
                <Text style={styles.quickActionLabel}>Add{'\n'}Income</Text>
              </Pressable>

              {/* Add Expense */}
              <Pressable
                onPress={() => router.push('/transaction/add')}
                style={styles.quickActionItem}
              >
                <View style={[styles.quickActionCircle, { backgroundColor: '#FFEBEE' }]}>
                  <Minus size={22} color="#F44336" />
                </View>
                <Text style={styles.quickActionLabel}>Add{'\n'}Expense</Text>
              </Pressable>

              {/* Set Goal */}
              <Pressable
                onPress={() => router.push('/(tabs)/goals')}
                style={styles.quickActionItem}
              >
                <View style={[styles.quickActionCircle, { backgroundColor: '#F3E5F5' }]}>
                  <Target size={22} color="#9C27B0" />
                </View>
                <Text style={styles.quickActionLabel}>Set{'\n'}Goal</Text>
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

          {/* ── Savings Goals ─────────────────────────────── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.rowCenter}>
                <Target size={15} color="#9C27B0" />
                <Text style={[styles.sectionTitle, { marginLeft: 6 }]}>Savings Goals</Text>
              </View>
              <Pressable onPress={() => router.push('/(tabs)/goals')}>
                <Text style={[styles.seeAllText, { color: '#9C27B0' }]}>Explore →</Text>
              </Pressable>
            </View>

            <View style={styles.goalsRow}>
              <View>
                <Text style={styles.goalSaved}>
                  {formatPaise(dashboard?.goals?.totalSaved ?? 0)}
                </Text>
                <Text style={styles.goalSavedSub}>
                  Saved across {dashboard?.goals?.activeGoalsCount ?? 0} active goals
                </Text>
              </View>
              <View style={styles.goalTargetBadge}>
                <Text style={styles.goalTargetText}>
                  🎯 {formatPaise(dashboard?.goals?.totalTarget ?? 0)}
                </Text>
              </View>
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

          {/* ── Recent Transactions ───────────────────────── */}
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
              <View style={{ gap: 0 }}>
                {dashboard.recentTransactions.slice(0, 5).map((tx, idx) => {
                  const { text, colorClass } = formatTransactionAmount(tx.type, tx.amount);
                  const isIncome = tx.type === 'income';
                  const amountColor = isIncome ? '#4CAF50' : '#F44336';

                  // Generate a consistent color for the category icon
                  const iconColors = [
                    '#E3F2FD',
                    '#F3E5F5',
                    '#E8F5E9',
                    '#FFF3E0',
                    '#FCE4EC',
                  ];
                  const iconBg = iconColors[idx % iconColors.length];
                  const iconTextColors = ['#1565C0', '#9C27B0', '#4CAF50', '#FF9800', '#E91E63'];
                  const iconColor = iconTextColors[idx % iconTextColors.length];

                  return (
                    <Pressable
                      key={tx._id || tx.id}
                      onPress={() => router.push(`/transaction/${tx._id || tx.id}`)}
                      style={({ pressed }) => [
                        styles.txRow,
                        idx > 0 && styles.txRowBorder,
                        pressed && { backgroundColor: '#F5F9FF' },
                      ]}
                    >
                      {/* Category Icon Circle */}
                      <View style={[styles.txIconCircle, { backgroundColor: iconBg }]}>
                        <Text style={[styles.txIconText, { color: iconColor }]}>
                          {(tx.category || 'T').charAt(0).toUpperCase()}
                        </Text>
                      </View>

                      {/* Description + meta */}
                      <View style={styles.txMiddle}>
                        <Text style={styles.txDesc} numberOfLines={1}>
                          {tx.description}
                        </Text>
                        <View style={styles.txMeta}>
                          <View style={styles.txCategoryPill}>
                            <Text style={styles.txCategoryText}>{tx.category}</Text>
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

          {/* Bottom spacer */}
          <View style={{ height: 24 }} />
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
    borderBottomColor: '#E8EDF5',
  },
  headerLeft: {
    flex: 1,
  },
  greetingSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  greetingMain: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A2E',
    letterSpacing: -0.3,
  },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EBF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1565C0',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // ── Month Selector ───────────────────────────────────────────
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2EAF4',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  chevronBtn: {
    padding: 4,
  },
  monthCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A2E',
    marginLeft: 5,
  },
  currentBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1565C0',
  },

  // ── Hero Card ────────────────────────────────────────────────
  heroCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    shadowColor: '#1565C0',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  heroBubble1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#FFFFFF',
    opacity: 0.07,
  },
  heroBubble2: {
    position: 'absolute',
    bottom: -30,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    opacity: 0.05,
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
    fontSize: 12,
    fontWeight: '700',
    color: '#90CAF9',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginLeft: 5,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A5D6A7',
  },
  heroBalance: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginTop: 4,
    marginBottom: 2,
  },
  heroSubLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 16,
  },
  heroStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 14,
    padding: 12,
    gap: 0,
  },
  heroStatCard: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  heroStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    marginLeft: 3,
  },
  heroStatValue: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  heroStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 2,
  },

  // ── Generic Section Card ─────────────────────────────────────
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#1565C0',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1565C0',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // ── Quick Actions ────────────────────────────────────────────
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickActionItem: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  quickActionCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 15,
  },

  // ── Budget ───────────────────────────────────────────────────
  budgetAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  budgetSpent: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1A1A2E',
  },
  budgetLimit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#EEF2F7',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  budgetUtilText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },

  // ── Goals ────────────────────────────────────────────────────
  goalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalSaved: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  goalSavedSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  goalTargetBadge: {
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  goalTargetText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7B1FA2',
  },

  // ── Insights ─────────────────────────────────────────────────
  insightsSection: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  insightsSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 10,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    borderLeftWidth: 3,
  },
  insightTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  insightMessage: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
    lineHeight: 17,
  },

  // ── Transactions ─────────────────────────────────────────────
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 2,
  },
  txRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F0F4FF',
  },
  txIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txIconText: {
    fontSize: 16,
    fontWeight: '800',
  },
  txMiddle: {
    flex: 1,
    paddingRight: 8,
  },
  txDesc: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  txMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txCategoryPill: {
    backgroundColor: '#EBF2FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  txCategoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1565C0',
  },
  txDate: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
