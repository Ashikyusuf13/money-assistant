import { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenWrapper, DatePicker } from '@/src/components/ui';
import {
  usePeriodReport,
  useCategoryReport,
  useFinancialInsights,
} from '@/src/hooks/useReports';
import { useDashboard } from '@/src/hooks/useDashboard';
import { useSalary } from '@/src/hooks/useSalary';
import { useBudgets } from '@/src/hooks/useBudgets';
import { useAuthStore } from '@/src/store/authStore';
import { formatPaise } from '@/src/utils/currency';
import { getCurrentMonthStr, formatMonthYear, formatDate } from '@/src/utils/date';
import { exportFinancialReportPDF, PDFReportData } from '@/src/utils/pdfExport';
import {
  FileDown,
  Calendar,
  TrendingUp,
  TrendingDown,
  PieChart,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Wallet,
} from 'lucide-react-native';

export default function ReportsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [filterMode, setFilterMode] = useState<'month' | 'custom'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthStr());

  // Custom date range states
  const now = new Date();
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]!;
  const todayStr = now.toISOString().split('T')[0]!;

  const [startDate, setStartDate] = useState<string>(firstDayThisMonth);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

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

  // Queries
  const {
    data: periodData,
    isLoading: isPeriodLoading,
    refetch: refetchPeriod,
  } = usePeriodReport({ period: 'monthly', month: selectedMonth });

  const {
    data: categoryData,
    isLoading: isCatLoading,
    refetch: refetchCategories,
  } = useCategoryReport(selectedMonth);

  const {
    data: insightsData,
    refetch: refetchInsights,
  } = useFinancialInsights(selectedMonth);

  const { data: dashboard, refetch: refetchDashboard } = useDashboard(selectedMonth);
  const { data: salary, refetch: refetchSalary } = useSalary();
  const { data: budgets, refetch: refetchBudgets } = useBudgets(selectedMonth);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchPeriod(),
      refetchCategories(),
      refetchInsights(),
      refetchDashboard(),
      refetchSalary(),
      refetchBudgets(),
    ]);
    setIsRefreshing(false);
  };

  // Determine active report metrics
  const totalIncome = filterMode === 'month'
    ? (periodData?.totalIncome ?? dashboard?.monthlySummary?.income ?? 0)
    : (dashboard?.monthlySummary?.income ?? 0);

  const totalExpense = filterMode === 'month'
    ? (periodData?.totalExpense ?? dashboard?.monthlySummary?.expense ?? 0)
    : (dashboard?.monthlySummary?.expense ?? 0);

  const currentSalary = salary?.baseMonthlySalary ?? 0;
  // Starting base inflow begins with Main Wallet Salary if configured in profile
  const startingInflow = currentSalary > 0 ? currentSalary : totalIncome;
  const netCashFlow = startingInflow - totalExpense;
  const savingsRate = startingInflow > 0
    ? Math.max(0, Math.round(((startingInflow - totalExpense) / startingInflow) * 100))
    : 0;
  const remainingMonthlySalary = Math.max(0, startingInflow - totalExpense);

  // Quick Preset Presets for Custom Date Range
  const handleApplyPreset = (preset: 'today' | '7days' | 'this_month' | 'last_month' | 'this_year') => {
    const d = new Date();
    if (preset === 'today') {
      const t = d.toISOString().split('T')[0]!;
      setStartDate(t);
      setEndDate(t);
    } else if (preset === '7days') {
      const past = new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]!);
      setEndDate(d.toISOString().split('T')[0]!);
    } else if (preset === 'this_month') {
      const s = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]!;
      setStartDate(s);
      setEndDate(d.toISOString().split('T')[0]!);
    } else if (preset === 'last_month') {
      const s = new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split('T')[0]!;
      const e = new Date(d.getFullYear(), d.getMonth(), 0).toISOString().split('T')[0]!;
      setStartDate(s);
      setEndDate(e);
    } else if (preset === 'this_year') {
      const s = new Date(d.getFullYear(), 0, 1).toISOString().split('T')[0]!;
      setStartDate(s);
      setEndDate(d.toISOString().split('T')[0]!);
    }
  };

  // PDF Export
  const handleDownloadPDF = async () => {
    try {
      setIsExporting(true);

      const periodLabel = filterMode === 'month'
        ? formatMonthYear(selectedMonth)
        : `Custom: ${formatDate(startDate)} to ${formatDate(endDate)}`;

      const pdfPayload: PDFReportData = {
        userName: user?.name || 'Valued Member',
        userEmail: user?.email || '',
        month: periodLabel,
        generatedAt: new Date().toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
        trackedWealthRupees: (dashboard?.netWealth ?? 0) / 100,
        monthlyIncomeRupees: startingInflow / 100,
        monthlyExpenseRupees: totalExpense / 100,
        netCashFlowRupees: netCashFlow / 100,
        salary: currentSalary > 0 ? {
          baseSalaryRupees: currentSalary / 100,
          salaryReceivedRupees: startingInflow / 100,
          remainingSalaryRupees: remainingMonthlySalary / 100,
          retentionPercentage: savingsRate,
        } : undefined,
        categories: (categoryData?.categories ?? []).map((c: any) => ({
          category: c.category.replace(/_/g, ' '),
          spentRupees: c.amount / 100,
          percentage: c.percentage,
          transactionCount: c.transactionCount ?? 0,
        })),
        budgets: (budgets ?? []).map((b) => ({
          category: b.category,
          limitRupees: b.amount / 100,
          spentRupees: b.spent / 100,
          remainingRupees: Math.max(0, b.amount - b.spent) / 100,
          utilizationPercentage: b.utilizationPercentage,
          isExceeded: b.utilizationPercentage > 100,
        })),
        insights: (Array.isArray(insightsData) ? insightsData : (dashboard?.insights ?? [])).map((i: any) => ({
          title: i.title,
          message: i.message,
          severity: i.severity as any,
        })),
      };

      await exportFinancialReportPDF(pdfPayload);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const activePeriodTitle = filterMode === 'month'
    ? formatMonthYear(selectedMonth)
    : `${formatDate(startDate)} – ${formatDate(endDate)}`;

  return (
    <ScreenWrapper
      scrollable
      style={{ backgroundColor: '#F0F4FF', flex: 1 }}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#1565C0" />
      }
    >
      {/* ── Top Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>STATEMENTS &amp; ANALYTICS</Text>
          <Text style={styles.headerTitle}>Financial Reports</Text>
        </View>

        <Pressable
          onPress={handleDownloadPDF}
          disabled={isExporting}
          style={styles.downloadPdfBtn}
        >
          <View style={styles.downloadPdfBtnInner}>
            {isExporting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <FileDown size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.downloadPdfText}>Download PDF</Text>
              </>
            )}
          </View>
        </Pressable>
      </View>

      {/* ── Filter Mode Selector (Month vs Custom Range) ── */}
      <View style={styles.modeTabs}>
        <Pressable
          onPress={() => setFilterMode('month')}
          style={[styles.modeTab, filterMode === 'month' && styles.modeTabActive]}
        >
          <Calendar size={14} color={filterMode === 'month' ? '#1565C0' : '#64748B'} />
          <Text
            style={[
              styles.modeTabText,
              filterMode === 'month' && styles.modeTabTextActive,
            ]}
          >
            Monthly Report
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setFilterMode('custom')}
          style={[styles.modeTab, filterMode === 'custom' && styles.modeTabActive]}
        >
          <Filter size={14} color={filterMode === 'custom' ? '#1565C0' : '#64748B'} />
          <Text
            style={[
              styles.modeTabText,
              filterMode === 'custom' && styles.modeTabTextActive,
            ]}
          >
            Custom Date Range
          </Text>
        </Pressable>
      </View>

      {/* ── Month Controls (when in Month mode) ── */}
      {filterMode === 'month' ? (
        <View style={styles.monthBar}>
          <Pressable onPress={handlePrevMonth} style={styles.monthNavBtn}>
            <ChevronLeft size={20} color="#1565C0" />
          </Pressable>

          <View style={styles.monthCenter}>
            <Calendar size={15} color="#1565C0" />
            <Text style={styles.monthLabel}>{formatMonthYear(selectedMonth)}</Text>
          </View>

          <Pressable onPress={handleNextMonth} style={styles.monthNavBtn}>
            <ChevronRight size={20} color="#1565C0" />
          </Pressable>
        </View>
      ) : (
        /* ── Custom Range Pickers ── */
        <View style={styles.customDateCard}>
          <Text style={styles.customDateTitle}>Select Report Date Range</Text>

          <View style={styles.datePickersRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateFieldLabel}>FROM DATE</Text>
              <DatePicker
                value={startDate}
                onChangeDate={setStartDate}
                maxDate={endDate}
              />
            </View>

            <View style={{ width: 12 }} />

            <View style={{ flex: 1 }}>
              <Text style={styles.dateFieldLabel}>TO DATE</Text>
              <DatePicker
                value={endDate}
                onChangeDate={setEndDate}
                minDate={startDate}
                maxDate={todayStr}
              />
            </View>
          </View>

          {/* Quick presets */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetsScroll}
          >
            {[
              { id: 'today', label: 'Today' },
              { id: '7days', label: 'Last 7 Days' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'this_year', label: 'This Year' },
            ].map((p) => (
              <Pressable
                key={p.id}
                onPress={() => handleApplyPreset(p.id as any)}
                style={styles.presetChip}
              >
                <Text style={styles.presetChipText}>{p.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Executive Cash Flow Hero Card (Royal Blue Fin-tech) ── */}
      <LinearGradient
        colors={['#1565C0', '#1976D2', '#1E88E5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.heroTag}>
            <Sparkles size={13} color="#90CAF9" />
            <Text style={styles.heroTagText}>{activePeriodTitle}</Text>
          </View>
          <View style={styles.rateBadge}>
            <Text style={styles.rateBadgeText}>{savingsRate}% Retained</Text>
          </View>
        </View>

        <Text style={styles.heroLabel}>Net Cash Flow (Main Wallet Balance)</Text>
        <Text style={styles.heroNetValue}>
          {netCashFlow >= 0 ? '+' : ''}{formatPaise(netCashFlow)}
        </Text>

        <View style={styles.heroSplitRow}>
          {/* Inflow */}
          <View style={styles.splitItem}>
            <View style={styles.splitIconRow}>
              <TrendingUp size={14} color="#A5D6A7" />
              <Text style={styles.splitLabel}>
                {currentSalary > 0 ? 'Main Wallet Salary' : 'Total Inflow'}
              </Text>
            </View>
            <Text style={[styles.splitValue, { color: '#A5D6A7' }]}>
              {formatPaise(startingInflow)}
            </Text>
          </View>

          <View style={styles.splitDivider} />

          {/* Outflow */}
          <View style={styles.splitItem}>
            <View style={styles.splitIconRow}>
              <TrendingDown size={14} color="#FFCDD2" />
              <Text style={styles.splitLabel}>Total Expenses</Text>
            </View>
            <Text style={[styles.splitValue, { color: '#FFCDD2' }]}>
              {formatPaise(totalExpense)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Monthly Salary & Surplus Allocation Card ── */}
      {currentSalary > 0 && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.rowCenter}>
              <Wallet size={16} color="#1565C0" />
              <Text style={[styles.sectionTitle, { marginLeft: 6 }]}>
                Main Wallet Salary &amp; Surplus
              </Text>
            </View>
            <Text style={styles.badgeSuccess}>Configured</Text>
          </View>

          <View style={styles.salaryGrid}>
            <View style={styles.salaryCol}>
              <Text style={styles.salaryColLabel}>Base Monthly Salary</Text>
              <Text style={styles.salaryColValue}>{formatPaise(currentSalary)}</Text>
            </View>
            <View style={styles.salaryCol}>
              <Text style={styles.salaryColLabel}>Expenses Debited</Text>
              <Text style={[styles.salaryColValue, { color: '#EF4444' }]}>
                -{formatPaise(totalExpense)}
              </Text>
            </View>
          </View>

          <View style={styles.surplusBanner}>
            <View>
              <Text style={styles.surplusBannerLabel}>Remaining Unspent Balance</Text>
              <Text style={styles.surplusBannerValue}>
                {formatPaise(remainingMonthlySalary)}
              </Text>
            </View>
            <View style={styles.retainedBadge}>
              <CheckCircle2 size={14} color="#059669" />
              <Text style={styles.retainedText}>Retained in Wallet</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Category Spending Breakdown ── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.rowCenter}>
            <PieChart size={16} color="#1565C0" />
            <Text style={[styles.sectionTitle, { marginLeft: 6 }]}>
              Spending by Category
            </Text>
          </View>
          <Text style={styles.sectionSubText}>
            {(categoryData?.categories ?? []).length} categories
          </Text>
        </View>

        {isCatLoading ? (
          <ActivityIndicator size="small" color="#1565C0" style={{ padding: 20 }} />
        ) : categoryData?.categories && categoryData.categories.length > 0 ? (
          <View style={{ gap: 12 }}>
            {categoryData.categories.map((cat: any, idx: number) => {
              const colors = ['#1565C0', '#0284C7', '#059669', '#D97706', '#DC2626', '#7C3AED'];
              const barColor = colors[idx % colors.length];

              return (
                <View key={cat.category}>
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryName}>
                      {cat.category.replace(/_/g, ' ')}
                    </Text>
                    <View style={styles.rowCenter}>
                      <Text style={styles.categoryAmount}>{formatPaise(cat.amount)}</Text>
                      <Text style={styles.categoryPct}> ({cat.percentage}%)</Text>
                    </View>
                  </View>

                  <View style={styles.catProgressTrack}>
                    <View
                      style={[
                        styles.catProgressFill,
                        {
                          width: `${Math.min(cat.percentage, 100)}%`,
                          backgroundColor: barColor,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No expenses recorded for this period.</Text>
          </View>
        )}
      </View>

      {/* ── Bottom Download PDF Banner ── */}
      <View style={styles.pdfBanner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pdfBannerTitle}>Official Financial Statement</Text>
          <Text style={styles.pdfBannerSub}>
            Generates certified audit summary with salary retention, monthly cash flow, and category charts.
          </Text>
        </View>

        <Pressable
          onPress={handleDownloadPDF}
          disabled={isExporting}
          style={({ pressed }) => [
            styles.pdfBannerBtn,
            pressed && { opacity: 0.8 },
          ]}
        >
          <FileDown size={18} color="#FFFFFF" />
          <Text style={styles.pdfBannerBtnText}>Export PDF</Text>
        </Pressable>
      </View>

      <View style={{ height: 110 }} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 8,
    width: '100%',
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1565C0',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0D1B3E',
  },
  downloadPdfBtn: {
    backgroundColor: '#1565C0',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  downloadPdfBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1565C0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  downloadPdfText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    padding: 3,
    borderRadius: 14,
    marginBottom: 12,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 11,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  modeTabTextActive: {
    color: '#1565C0',
  },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#DDE5F4',
    marginBottom: 14,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  monthNavBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F5F8FF',
  },
  monthCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0D1B3E',
  },
  customDateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDE5F4',
    marginBottom: 14,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  customDateTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0D1B3E',
    marginBottom: 12,
  },
  datePickersRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dateFieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7B93C8',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  presetsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  presetChip: {
    backgroundColor: '#F5F8FF',
    borderWidth: 1,
    borderColor: '#DDE5F4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1565C0',
  },
  heroCard: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 14,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rateBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rateBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#1565C0',
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#90CAF9',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroNetValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  heroSplitRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
  },
  splitItem: {
    flex: 1,
  },
  splitIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  splitLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  splitValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  splitDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 12,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0D1B3E',
  },
  sectionSubText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  badgeSuccess: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  salaryGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  salaryCol: {
    flex: 1,
  },
  salaryColLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 3,
  },
  salaryColValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0D1B3E',
  },
  surplusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  surplusBannerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E40AF',
    textTransform: 'uppercase',
  },
  surplusBannerValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1565C0',
    marginTop: 2,
  },
  retainedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  retainedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D1B3E',
    textTransform: 'capitalize',
  },
  categoryAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0D1B3E',
  },
  categoryPct: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  catProgressTrack: {
    height: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  catProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalItem: {
    paddingVertical: 4,
  },
  goalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  goalName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D1B3E',
  },
  goalValues: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
  },
  goalTrack: {
    height: 6,
    backgroundColor: '#F3E8FF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 3,
  },
  pdfBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0D1B3E',
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  pdfBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  pdfBannerSub: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 15,
  },
  pdfBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1565C0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  pdfBannerBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
});
