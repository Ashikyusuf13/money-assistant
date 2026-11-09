import { useState, useRef, useEffect, type ElementRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import {
  ScreenWrapper,
  Card,
  Button,
  LoadingSpinner,
} from '@/src/components/ui';
import { useAskAssistant } from '@/src/hooks/useAssistant';
import { useDashboard } from '@/src/hooks/useDashboard';
import { useSalary } from '@/src/hooks/useSalary';
import { useBudgets } from '@/src/hooks/useBudgets';
import { useGoals } from '@/src/hooks/useGoals';
import { useFinancialInsights } from '@/src/hooks/useReports';
import { formatPaise } from '@/src/utils/currency';
import { exportFinancialReportPDF, PDFReportData } from '@/src/utils/pdfExport';
import { Budget, Goal } from '@/src/types/api';
import {
  Sparkles,
  Send,
  Bot,
  User as UserIcon,
  FileDown,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  FileText,
} from 'lucide-react-native';

// ─── Palette ──────────────────────────────────────────────
const PRIMARY = '#1565C0';
const PRIMARY_LIGHT = '#E3ECFA';
const BG = '#F0F4FF';
const BOT_BUBBLE_BG = '#F8FAFF';
const BOT_BUBBLE_BORDER = '#1565C0';
const USER_BUBBLE = '#1565C0';
const CARD_BG = '#FFFFFF';
const TEXT_MAIN = '#0D1B3E';
const TEXT_MUTED = '#6B7A99';
const PILL_BORDER = '#1565C0';
// ──────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const SUGGESTED_QUESTIONS = [
  'How much did I spend this month?',
  'Which category costs me the most?',
  'How much money remains from my salary?',
  'Am I on track to reach my savings goal?',
  'How has my spending changed compared with last month?',
  'What is my total net worth?',
];

export default function AssistantScreen() {
  const [activeTab, setActiveTab] = useState<'chat' | 'report'>('chat');

  // Month calculation
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Data fetching for manual calculations & PDF report
  const { data: dashboard, isLoading: isDashboardLoading } = useDashboard(currentMonth);
  const { data: salary } = useSalary();
  const { data: budgets } = useBudgets(currentMonth);
  const { data: goals } = useGoals();
  const { data: insights } = useFinancialInsights();

  const askMutation = useAskAssistant();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      sender: 'assistant',
      text: 'Hello! I am your Money Assistant. Ask me anything about your tracked spending, budgets, remaining salary, or savings progress. You can also export verified PDF reports.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ElementRef<typeof ScrollView>>(null);

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages, askMutation.isPending, activeTab]);

  // Fallback calculation engine in case of any network disconnection
  const computeLocalFallbackAnswer = (question: string): string => {
    const q = question.toLowerCase();
    const netWealth = dashboard?.totalTrackedWealthPaise ?? dashboard?.netWealth ?? 0;
    const income = dashboard?.cashFlow?.totalIncome ?? 0;
    const expense = dashboard?.cashFlow?.netOperatingExpense ?? 0;
    const netCashFlow = dashboard?.cashFlow?.netCashFlow ?? (income - expense);
    const baseSalary = salary?.baseMonthlySalary ?? 0;
    const remainingSalary = Math.max(0, baseSalary - expense);

    if (q.includes('spend') || q.includes('spent') || q.includes('expense')) {
      return `This month (${currentMonth}), your verified operating expenses total ${formatPaise(expense)}.`;
    }
    if (q.includes('earn') || q.includes('income') || q.includes('received')) {
      return `Your total tracked income for ${currentMonth} is ${formatPaise(income)}.`;
    }
    if (q.includes('remain') || q.includes('salary') || q.includes('left')) {
      if (baseSalary > 0) {
        const pct = Math.round((remainingSalary / baseSalary) * 100);
        return `From your base monthly salary of ${formatPaise(baseSalary)}, you have ${formatPaise(remainingSalary)} (${pct}%) remaining after ${formatPaise(expense)} in expenses.`;
      }
      return `Your net cash flow after expenses is ${formatPaise(netCashFlow)}.`;
    }
    if (q.includes('category') || q.includes('cost me the most') || q.includes('highest')) {
      const top = dashboard?.categoryBreakdown?.[0];
      if (top) {
        return `Your highest spending category this month is '${top.category}' with ${formatPaise(top.spentPaise)} spent (${top.percentageOfTotal}% of total expenses).`;
      }
      return 'No categorical expenses have been recorded for this month yet.';
    }
    if (q.includes('goal') || q.includes('reach my') || q.includes('savings')) {
      const activeGoals = goals?.filter((g: Goal) => !g.isArchived) ?? [];
      if (activeGoals.length > 0) {
        const g = activeGoals[0]!;
        const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
        return `For your goal '${g.name}', you have saved ${formatPaise(g.currentAmount)} of ${formatPaise(g.targetAmount)} (${pct}% complete).`;
      }
      return 'You do not have any active savings goals currently.';
    }
    if (q.includes('wealth') || q.includes('net worth') || q.includes('balance')) {
      return `Your total tracked wealth across accounts is ${formatPaise(netWealth)}.`;
    }
    return `Summary for ${currentMonth}: Tracked Wealth is ${formatPaise(netWealth)}, Total Inflow is ${formatPaise(income)}, Operating Expenses are ${formatPaise(expense)}, resulting in Net Cash Flow of ${formatPaise(netCashFlow)}.`;
  };

  const handleSend = async (questionText?: string) => {
    const textToSend = (questionText || inputText).trim();
    if (!textToSend || askMutation.isPending) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');

    try {
      const response = await askMutation.mutateAsync(textToSend);
      const assistantMessage: ChatMessage = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      // Graceful instant fallback to verified calculations
      const fallbackAnswer = computeLocalFallbackAnswer(textToSend);
      const assistantMessage: ChatMessage = {
        id: `asst_local_${Date.now()}`,
        sender: 'assistant',
        text: fallbackAnswer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }
  };

  // Trigger PDF Report Download
  const handleDownloadPDF = () => {
    const netWealth = (dashboard?.totalTrackedWealthPaise ?? dashboard?.netWealth ?? 0) / 100;
    const income = (dashboard?.cashFlow?.totalIncome ?? 0) / 100;
    const expense = (dashboard?.cashFlow?.netOperatingExpense ?? 0) / 100;
    const netFlow = (dashboard?.cashFlow?.netCashFlow ?? (income - expense * 100)) / 100;
    const baseSal = salary?.baseMonthlySalary ? salary.baseMonthlySalary / 100 : null;
    const remSal = baseSal !== null ? Math.max(0, baseSal - expense) : 0;
    const retPct = baseSal && baseSal > 0 ? Math.round((remSal / baseSal) * 100) : 0;

    const budgetList = Array.isArray(budgets)
      ? budgets
      : Array.isArray((budgets as any)?.budgets)
      ? (budgets as any).budgets
      : [];

    const activeGoalsList = goals ?? [];

    const reportData: PDFReportData = {
      userName: 'Ashik',
      userEmail: 'ashik@admin.com',
      month: currentMonth,
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
      categories: (dashboard?.categoryBreakdown ?? []).map((c: { category: string; spentPaise: number; percentageOfTotal: number }) => ({
        category: c.category,
        spentRupees: c.spentPaise / 100,
        percentage: c.percentageOfTotal,
      })),
      budgets: (budgetList as Budget[]).map((b: Budget) => ({
        category: b.category,
        limitRupees: b.amount / 100,
        spentRupees: b.spent / 100,
        remainingRupees: Math.max(0, b.amount - b.spent) / 100,
        utilizationPercentage: b.utilizationPercentage,
        isExceeded: b.spent > b.amount,
      })),
      goals: activeGoalsList.map((g) => ({
        name: g.name,
        targetRupees: g.targetAmount / 100,
        savedRupees: g.currentAmount / 100,
        remainingRupees: Math.max(0, g.targetAmount - g.currentAmount) / 100,
        progressPercentage:
          g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0,
      })),
      insights: (insights ?? []).map((i) => ({
        title: i.title,
        message: i.message,
        severity: i.severity,
      })),
    };

    exportFinancialReportPDF(reportData);
  };

  // Calculations for Automated Report View
  const netWealthPaise = dashboard?.totalTrackedWealthPaise ?? dashboard?.netWealth ?? 0;
  const incomePaise = dashboard?.cashFlow?.totalIncome ?? 0;
  const expensePaise = dashboard?.cashFlow?.netOperatingExpense ?? 0;
  const netCashFlowPaise = dashboard?.cashFlow?.netCashFlow ?? (incomePaise - expensePaise);
  const baseSalaryPaise = salary?.baseMonthlySalary ?? 0;
  const remainingSalaryPaise = Math.max(0, baseSalaryPaise - expensePaise);
  const retentionPct = baseSalaryPaise > 0 ? Math.round((remainingSalaryPaise / baseSalaryPaise) * 100) : 0;

  // Financial Health Score calculation (0 - 100)
  let healthScore = 70;
  if (netCashFlowPaise > 0) healthScore += 15;
  if (retentionPct >= 40) healthScore += 10;
  if (expensePaise > incomePaise && incomePaise > 0) healthScore -= 25;
  healthScore = Math.min(100, Math.max(20, healthScore));

  return (
    <ScreenWrapper style={styles.screenBg}>
      {/* ── Blue Header ───────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBox}>
            <Sparkles size={20} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Assistant ✨</Text>
            <Text style={styles.headerSub}>Your smart financial companion</Text>
          </View>
        </View>
        <Pressable onPress={handleDownloadPDF} style={styles.pdfBtn}>
          <FileDown size={14} color="#1565C0" />
          <Text style={styles.pdfBtnText}>PDF</Text>
        </Pressable>
      </View>

      {/* ── Greeting Card ─────────────────────────────── */}
      <View style={styles.greetCard}>
        <Text style={styles.greetText}>Hi Ashik! 👋</Text>
        <Text style={styles.greetSub}>How can I help you today?</Text>
      </View>

      {/* ── Segmented Tabs ────────────────────────────── */}
      <View style={styles.tabRow}>
        <Pressable
          onPress={() => setActiveTab('chat')}
          style={[styles.tabBtn, activeTab === 'chat' && styles.tabBtnActive]}
        >
          <MessageSquare size={13} color={activeTab === 'chat' ? '#ffffff' : PRIMARY} />
          <Text style={[styles.tabLabel, activeTab === 'chat' && styles.tabLabelActive]}>
            Ask Assistant
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('report')}
          style={[styles.tabBtn, activeTab === 'report' && styles.tabBtnActive]}
        >
          <FileText size={13} color={activeTab === 'report' ? '#ffffff' : PRIMARY} />
          <Text style={[styles.tabLabel, activeTab === 'report' && styles.tabLabelActive]}>
            Automated Report
          </Text>
        </Pressable>
      </View>

      {/* ════════════════════════════════════════════════
          TAB 1 — CHAT
         ════════════════════════════════════════════════ */}
      {activeTab === 'chat' && (
        <View style={{ flex: 1 }}>
          {/* Suggested question pills */}
          <View style={styles.pillsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillsContainer}
            >
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => handleSend(q)}
                  style={styles.pill}
                >
                  <Text style={styles.pillText}>{q}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Chat scroll area */}
          <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1, marginBottom: 10 }}
            contentContainerStyle={{ gap: 14, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <View
                  key={m.id}
                  style={[
                    styles.msgRow,
                    isUser ? styles.msgRowUser : styles.msgRowBot,
                  ]}
                >
                  {/* Avatar */}
                  <View style={[styles.avatar, isUser ? styles.avatarUser : styles.avatarBot]}>
                    {isUser ? (
                      <UserIcon size={14} color="#ffffff" />
                    ) : (
                      <Bot size={15} color="#1565C0" />
                    )}
                  </View>

                  {/* Bubble */}
                  <View
                    style={[
                      styles.bubble,
                      isUser ? styles.bubbleUser : styles.bubbleBot,
                    ]}
                  >
                    <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextBot]}>
                      {m.text}
                    </Text>
                    <Text style={[styles.bubbleTime, isUser ? styles.bubbleTimeUser : styles.bubbleTimBot]}>
                      {m.timestamp}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Typing indicator */}
            {askMutation.isPending && (
              <View style={[styles.msgRow, styles.msgRowBot]}>
                <View style={[styles.avatar, styles.avatarBot]}>
                  <Bot size={15} color="#1565C0" />
                </View>
                <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
                  <Sparkles size={13} color={PRIMARY} />
                  <Text style={styles.typingText}>Computing financial data…</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input bar */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <View style={styles.inputBar}>
              <TextInput
                style={styles.input}
                placeholder="Ask about spending, salary, budgets, goals…"
                placeholderTextColor="#9DAAB8"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleSend()}
                returnKeyType="send"
                {...(Platform.OS === 'web'
                  ? ({ style: [styles.input, { outlineStyle: 'none' } as any] } as any)
                  : {})}
              />
              <Pressable
                onPress={() => handleSend()}
                disabled={!inputText.trim() || askMutation.isPending}
                style={[
                  styles.sendBtn,
                  inputText.trim() && !askMutation.isPending
                    ? styles.sendBtnActive
                    : styles.sendBtnDisabled,
                ]}
              >
                <Send
                  size={16}
                  color={inputText.trim() && !askMutation.isPending ? '#ffffff' : '#9DAAB8'}
                />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* ════════════════════════════════════════════════
          TAB 2 — AUTOMATED REPORT
         ════════════════════════════════════════════════ */}
      {activeTab === 'report' && (
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {/* Health Score banner */}
          <View style={styles.reportBanner}>
            <View>
              <Text style={styles.reportBannerLabel}>Automated Financial Audit</Text>
              <Text style={styles.reportBannerScore}>Health Score: {healthScore}/100</Text>
              <Text style={styles.reportBannerStatus}>
                {healthScore >= 80
                  ? '✓ Excellent Financial Posture'
                  : healthScore >= 60
                  ? '✓ Balanced Cash Flow'
                  : '! Caution: Expenses High'}
              </Text>
            </View>
            <Pressable onPress={handleDownloadPDF} style={styles.savePdfBtn}>
              <FileDown size={14} color="#ffffff" />
              <Text style={styles.savePdfText}>Save PDF</Text>
            </Pressable>
          </View>

          {/* KPI row */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Tracked Wealth</Text>
              <Text style={styles.kpiValue}>{formatPaise(netWealthPaise)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Net Cash Flow</Text>
              <Text style={[styles.kpiValue, { color: netCashFlowPaise >= 0 ? '#10b981' : '#ef4444' }]}>
                {netCashFlowPaise >= 0 ? '+' : ''}
                {formatPaise(netCashFlowPaise)}
              </Text>
            </View>
          </View>

          {/* Inflow vs Outflow */}
          <View style={styles.reportCard}>
            <Text style={styles.reportCardTitle}>Monthly Inflow vs Outflow ({currentMonth})</Text>

            <View style={styles.reportRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={16} color="#10b981" />
                <Text style={styles.reportRowLabel}>Total Income</Text>
              </View>
              <Text style={[styles.reportRowValue, { color: '#10b981' }]}>{formatPaise(incomePaise)}</Text>
            </View>

            <View style={[styles.reportRow, { marginBottom: 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TrendingDown size={16} color="#ef4444" />
                <Text style={styles.reportRowLabel}>Operating Expenses</Text>
              </View>
              <Text style={[styles.reportRowValue, { color: '#ef4444' }]}>{formatPaise(expensePaise)}</Text>
            </View>

            {baseSalaryPaise > 0 && (
              <View style={styles.retentionSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={styles.retentionLabel}>Salary Retention Rate</Text>
                  <Text style={[styles.retentionLabel, { color: '#10b981', fontWeight: '700' }]}>
                    {retentionPct}% ({formatPaise(remainingSalaryPaise)} left)
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.min(retentionPct, 100)}%`, backgroundColor: '#10b981' }]} />
                </View>
              </View>
            )}
          </View>

          {/* Category breakdown */}
          {dashboard?.categoryBreakdown && dashboard.categoryBreakdown.length > 0 && (
            <View style={styles.reportCard}>
              <Text style={styles.reportCardTitle}>Top Spending Categories</Text>
              <View style={{ gap: 12 }}>
                {dashboard.categoryBreakdown.map((cat: { category: string; spentPaise: number; percentageOfTotal: number }, idx: number) => (
                  <View key={idx}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={styles.catName}>{cat.category}</Text>
                      <Text style={styles.catValue}>
                        {formatPaise(cat.spentPaise)}{' '}
                        <Text style={styles.catPct}>({cat.percentageOfTotal}%)</Text>
                      </Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${Math.min(cat.percentageOfTotal, 100)}%`, backgroundColor: PRIMARY }]} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Goals */}
          {goals && goals.length > 0 && (
            <View style={styles.reportCard}>
              <Text style={styles.reportCardTitle}>Savings Goals Audit</Text>
              <View style={{ gap: 10 }}>
                {goals.map((g) => {
                  const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
                  return (
                    <View key={g.id || g._id} style={styles.goalItem}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={styles.goalName}>{g.name}</Text>
                        <Text style={styles.goalPct}>{pct}%</Text>
                      </View>
                      <Text style={styles.goalAmount}>
                        {formatPaise(g.currentAmount)} of {formatPaise(g.targetAmount)}
                      </Text>
                      <View style={[styles.progressTrack, { marginTop: 6 }]}>
                        <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: PRIMARY }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Download button */}
          <View style={{ marginBottom: 32, marginTop: 4 }}>
            <Button
              title="Download Certified PDF Financial Statement"
              size="lg"
              className="bg-blue-800"
              iconLeft={<FileDown size={18} color={Platform.OS === 'web' ? '#ffffff' : '#E3ECFA'} />}
              onPress={handleDownloadPDF}
            />
          </View>
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  screenBg: {
    backgroundColor: BG,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PRIMARY,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
  headerSub: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pdfBtnText: { fontSize: 12, fontWeight: '700', color: PRIMARY },

  // Greeting card
  greetCard: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  greetText: { fontSize: 15, fontWeight: '800', color: TEXT_MAIN },
  greetSub: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#E3ECFA',
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 11,
  },
  tabBtnActive: { backgroundColor: PRIMARY },
  tabLabel: { fontSize: 11, fontWeight: '700', color: PRIMARY },
  tabLabelActive: { color: '#ffffff' },

  // Pills
  pillsWrapper: { marginBottom: 10 },
  pillsContainer: { gap: 8, paddingVertical: 4 },
  pill: {
    borderWidth: 1.5,
    borderColor: PILL_BORDER,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#ffffff',
  },
  pillText: { fontSize: 11, fontWeight: '600', color: PRIMARY },

  // Chat bubbles
  msgRow: { flexDirection: 'row', gap: 10, maxWidth: '87%' },
  msgRowBot: { alignSelf: 'flex-start' },
  msgRowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },

  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBot: { backgroundColor: PRIMARY_LIGHT },
  avatarUser: { backgroundColor: PRIMARY },

  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: '100%',
  },
  bubbleBot: {
    backgroundColor: BOT_BUBBLE_BG,
    borderLeftWidth: 3,
    borderLeftColor: BOT_BUBBLE_BORDER,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bubbleUser: {
    backgroundColor: USER_BUBBLE,
    borderTopRightRadius: 4,
  },
  bubbleText: { fontSize: 12, lineHeight: 18 },
  bubbleTextBot: { color: TEXT_MAIN },
  bubbleTextUser: { color: '#ffffff', fontWeight: '500' },
  bubbleTime: { fontSize: 9, marginTop: 5 },
  bubbleTimBot: { color: TEXT_MUTED },
  bubbleTimeUser: { color: 'rgba(255,255,255,0.65)', textAlign: 'right' },

  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: { fontSize: 12, color: TEXT_MUTED, fontWeight: '500' },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 18,
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 8,
    shadowColor: '#1565C0',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: TEXT_MAIN,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: { backgroundColor: PRIMARY },
  sendBtnDisabled: { backgroundColor: '#E3ECFA' },

  // Report tab
  reportBanner: {
    backgroundColor: PRIMARY,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportBannerLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1 },
  reportBannerScore: { fontSize: 20, fontWeight: '900', color: '#ffffff', marginTop: 2 },
  reportBannerStatus: { fontSize: 11, color: '#86efac', fontWeight: '700', marginTop: 2 },
  savePdfBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  savePdfText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },

  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  kpiCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#1565C0',
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  kpiLabel: { fontSize: 10, fontWeight: '700', color: TEXT_MUTED, textTransform: 'uppercase' },
  kpiValue: { fontSize: 17, fontWeight: '900', color: TEXT_MAIN, marginTop: 4 },

  reportCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#1565C0',
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  reportCardTitle: { fontSize: 11, fontWeight: '700', color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reportRowLabel: { fontSize: 12, fontWeight: '700', color: '#374151' },
  reportRowValue: { fontSize: 13, fontWeight: '900' },

  retentionSection: { borderTopWidth: 1, borderTopColor: '#EEF2FF', paddingTop: 12 },
  retentionLabel: { fontSize: 11, color: TEXT_MUTED },

  progressTrack: { width: '100%', height: 6, backgroundColor: '#EEF2FF', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  catName: { fontSize: 12, fontWeight: '700', color: TEXT_MAIN, textTransform: 'capitalize' },
  catValue: { fontSize: 12, fontWeight: '900', color: TEXT_MAIN },
  catPct: { fontSize: 10, color: TEXT_MUTED, fontWeight: '500' },

  goalItem: { backgroundColor: '#F8FAFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E3ECFA' },
  goalName: { fontSize: 12, fontWeight: '700', color: TEXT_MAIN },
  goalPct: { fontSize: 12, fontWeight: '700', color: PRIMARY },
  goalAmount: { fontSize: 11, color: TEXT_MUTED },
});
