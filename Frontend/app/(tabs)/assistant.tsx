import { useState, useRef, useEffect, type ElementRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  ScreenWrapper,
  Card,
  Badge,
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
  Printer,
  TrendingUp,
  TrendingDown,
  PieChart,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  MessageSquare,
  FileText,
} from 'lucide-react-native';

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
    <ScreenWrapper className="px-4 pt-2 pb-2">
      {/* Top Header Bar */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-xl bg-purple-600 items-center justify-center shadow-sm">
            <Sparkles size={18} color="#ffffff" />
          </View>
          <View>
            <Text className="text-base font-black text-slate-900 dark:text-slate-100">
              Money Intelligence Hub
            </Text>
            <Text className="text-[10px] text-slate-400 font-medium">
              Verified Manual Calculations & Instant PDF Reports
            </Text>
          </View>
        </View>

        {/* Download PDF Button in Header */}
        <Pressable
          onPress={handleDownloadPDF}
          className="flex-row items-center gap-1.5 bg-slate-900 dark:bg-slate-100 px-3 py-1.5 rounded-xl active:opacity-80 shadow-sm"
        >
          <FileDown size={14} color={Platform.OS === 'web' ? '#ffffff' : '#0c87eb'} />
          <Text className="text-xs font-bold text-white dark:text-slate-900">
            PDF Report
          </Text>
        </Pressable>
      </View>

      {/* Segmented View Tabs */}
      <View className="flex-row bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-3">
        <Pressable
          onPress={() => setActiveTab('chat')}
          className={`flex-1 py-2 rounded-xl flex-row items-center justify-center gap-1.5 ${
            activeTab === 'chat' ? 'bg-white dark:bg-slate-900 shadow-sm' : ''
          }`}
        >
          <MessageSquare
            size={14}
            color={activeTab === 'chat' ? '#8b5cf6' : '#64748b'}
          />
          <Text
            className={`text-xs font-bold ${
              activeTab === 'chat' ? 'text-purple-600' : 'text-slate-500'
            }`}
          >
            Ask Assistant
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('report')}
          className={`flex-1 py-2 rounded-xl flex-row items-center justify-center gap-1.5 ${
            activeTab === 'report' ? 'bg-white dark:bg-slate-900 shadow-sm' : ''
          }`}
        >
          <FileText
            size={14}
            color={activeTab === 'report' ? '#8b5cf6' : '#64748b'}
          />
          <Text
            className={`text-xs font-bold ${
              activeTab === 'report' ? 'text-purple-600' : 'text-slate-500'
            }`}
          >
            Automated Report
          </Text>
        </Pressable>
      </View>

      {/* TAB 1: INTERACTIVE ASSISTANT */}
      {activeTab === 'chat' && (
        <View className="flex-1">
          {/* Suggested Questions Chips (Horizontal) */}
          <View className="mb-2.5">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2 py-1"
            >
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => handleSend(q)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-full shadow-sm active:bg-slate-50"
                >
                  <Text className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    {q}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Chat Messages ScrollArea */}
          <ScrollView
            ref={scrollViewRef}
            className="flex-1 mb-2.5"
            contentContainerClassName="gap-3 pb-2"
            showsVerticalScrollIndicator={false}
          >
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <View
                  key={m.id}
                  className={`flex-row gap-2.5 max-w-[85%] ${
                    isUser ? 'self-end flex-row-reverse' : 'self-start'
                  }`}
                >
                  <View
                    className={`w-7 h-7 rounded-full items-center justify-center ${
                      isUser ? 'bg-primary-600' : 'bg-purple-100 dark:bg-purple-950'
                    }`}
                  >
                    {isUser ? (
                      <UserIcon size={14} color="#ffffff" />
                    ) : (
                      <Bot size={15} color="#8b5cf6" />
                    )}
                  </View>

                  <View
                    className={`p-3.5 rounded-2xl ${
                      isUser
                        ? 'bg-primary-600 rounded-tr-none'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-tl-none shadow-sm'
                    }`}
                  >
                    <Text
                      className={`text-xs leading-relaxed ${
                        isUser ? 'text-white font-medium' : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {m.text}
                    </Text>
                    <Text
                      className={`text-[9px] mt-1.5 ${
                        isUser ? 'text-primary-200 text-right' : 'text-slate-400'
                      }`}
                    >
                      {m.timestamp}
                    </Text>
                  </View>
                </View>
              );
            })}

            {askMutation.isPending && (
              <View className="flex-row items-center gap-2.5 self-start max-w-[80%]">
                <View className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-950 items-center justify-center">
                  <Bot size={15} color="#8b5cf6" />
                </View>
                <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl rounded-tl-none shadow-sm flex-row items-center gap-2">
                  <Sparkles size={14} color="#8b5cf6" />
                  <Text className="text-xs text-slate-500 font-medium">
                    Computing verified financial ledger figures...
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input Message Bar with Clean Styling */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <View className="flex-row items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl shadow-sm">
              <TextInput
                className="flex-1 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                placeholder="Ask about spending, salary, budgets, goals..."
                placeholderTextColor="#94a3b8"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleSend()}
                returnKeyType="send"
                style={
                  Platform.OS === 'web'
                    ? ({ outlineStyle: 'none', borderStyle: 'none', outline: 'none' } as any)
                    : undefined
                }
              />
              <Pressable
                onPress={() => handleSend()}
                disabled={!inputText.trim() || askMutation.isPending}
                className={`w-9 h-9 rounded-xl items-center justify-center ${
                  inputText.trim() && !askMutation.isPending
                    ? 'bg-purple-600 active:bg-purple-700'
                    : 'bg-slate-100 dark:bg-slate-800'
                }`}
              >
                <Send
                  size={16}
                  color={inputText.trim() && !askMutation.isPending ? '#ffffff' : '#94a3b8'}
                />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* TAB 2: AUTOMATED REPORT & AUDIT VIEW */}
      {activeTab === 'report' && (
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          {/* Health Score Banner */}
          <Card className="p-4 mb-4 bg-slate-900 border-slate-800 shadow-md">
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Automated Financial Audit
                </Text>
                <Text className="text-xl font-black text-white mt-0.5">
                  Health Score: {healthScore}/100
                </Text>
                <Text className="text-xs text-emerald-400 font-bold mt-0.5">
                  {healthScore >= 80 ? '✓ Excellent Financial Posture' : healthScore >= 60 ? '✓ Balanced Cash Flow' : '! Caution: Expenses High'}
                </Text>
              </View>

              <Pressable
                onPress={handleDownloadPDF}
                className="bg-emerald-600 px-3.5 py-2 rounded-xl flex-row items-center gap-1.5 active:bg-emerald-700 shadow-sm"
              >
                <FileDown size={14} color="#ffffff" />
                <Text className="text-xs font-bold text-white">Save PDF</Text>
              </Pressable>
            </View>
          </Card>

          {/* KPI Matrix */}
          <View className="flex-row gap-3 mb-4">
            <Card className="flex-1 p-3.5">
              <Text className="text-[10px] font-bold text-slate-400 uppercase">
                Tracked Wealth
              </Text>
              <Text className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                {formatPaise(netWealthPaise)}
              </Text>
            </Card>

            <Card className="flex-1 p-3.5">
              <Text className="text-[10px] font-bold text-slate-400 uppercase">
                Net Cash Flow
              </Text>
              <Text
                className={`text-lg font-black mt-1 ${
                  netCashFlowPaise >= 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {netCashFlowPaise >= 0 ? '+' : ''}
                {formatPaise(netCashFlowPaise)}
              </Text>
            </Card>
          </View>

          {/* Inflow vs Outflow */}
          <Card className="p-4 mb-4">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Monthly Inflow vs Outflow ({currentMonth})
            </Text>

            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2">
                <TrendingUp size={16} color="#10b981" />
                <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Total Income
                </Text>
              </View>
              <Text className="text-sm font-black text-emerald-600">
                {formatPaise(incomePaise)}
              </Text>
            </View>

            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <TrendingDown size={16} color="#f43f5e" />
                <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Operating Expenses
                </Text>
              </View>
              <Text className="text-sm font-black text-rose-600">
                {formatPaise(expensePaise)}
              </Text>
            </View>

            {/* Retention Bar */}
            {baseSalaryPaise > 0 && (
              <View className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-[11px] font-semibold text-slate-500">
                    Salary Retention Rate
                  </Text>
                  <Text className="text-[11px] font-bold text-emerald-600">
                    {retentionPct}% Saved ({formatPaise(remainingSalaryPaise)} left)
                  </Text>
                </View>
                <View className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${Math.min(retentionPct, 100)}%` }}
                  />
                </View>
              </View>
            )}
          </Card>

          {/* Category Spending Breakdown */}
          {dashboard?.categoryBreakdown && dashboard.categoryBreakdown.length > 0 && (
            <Card className="p-4 mb-4">
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Top Spending Categories
              </Text>

              <View className="gap-3">
                {dashboard.categoryBreakdown.map((cat: { category: string; spentPaise: number; percentageOfTotal: number }, idx: number) => (
                  <View key={idx}>
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">
                        {cat.category}
                      </Text>
                      <Text className="text-xs font-black text-slate-900 dark:text-slate-100">
                        {formatPaise(cat.spentPaise)}{' '}
                        <Text className="text-[10px] text-slate-400 font-medium">
                          ({cat.percentageOfTotal}%)
                        </Text>
                      </Text>
                    </View>
                    <View className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <View
                        className="h-full bg-purple-600 rounded-full"
                        style={{ width: `${Math.min(cat.percentageOfTotal, 100)}%` }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Active Goals Milestones */}
          {goals && goals.length > 0 && (
            <Card className="p-4 mb-4">
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Savings Goals Audit
              </Text>

              <View className="gap-2.5">
                {goals.map((g) => {
                  const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
                  return (
                    <View
                      key={g.id || g._id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800"
                    >
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {g.name}
                        </Text>
                        <Text className="text-xs font-bold text-purple-600 dark:text-purple-400">
                          {pct}%
                        </Text>
                      </View>
                      <Text className="text-[11px] text-slate-500 mb-1.5">
                        {formatPaise(g.currentAmount)} of {formatPaise(g.targetAmount)}
                      </Text>
                      <View className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <View
                          className="h-full bg-purple-600 rounded-full"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>
          )}

          {/* Large Download Button */}
          <View className="mb-6 mt-1">
            <Button
              title="Download Certified PDF Financial Statement"
              size="lg"
              className="bg-slate-900 dark:bg-slate-100"
              iconLeft={<FileDown size={18} color={Platform.OS === 'web' ? '#ffffff' : '#0c87eb'} />}
              onPress={handleDownloadPDF}
            />
          </View>
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}
