import { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  RefreshControl,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  StyleSheet,
} from 'react-native';
import {
  ScreenWrapper,
  Card,
  Button,
  Input,
  CurrencyInput,
  DatePicker,
  SkeletonCard,
  EmptyState,
  ConfirmModal,
} from '@/src/components/ui';
import {
  useGoals,
  useCreateGoal,
  useContributeToGoal,
  useDeleteGoal,
} from '@/src/hooks/useGoals';
import { useSalary } from '@/src/hooks/useSalary';
import { useDashboard } from '@/src/hooks/useDashboard';
import { Goal, GoalPriority } from '@/src/types/api';
import { formatPaise } from '@/src/utils/currency';
import { formatDate, getCurrentMonthStr } from '@/src/utils/date';
import {
  Plus,
  Trash2,
  Target,
  Calendar,
  X,
  Coins,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Zap,
  Flame,
  Star,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  Sparkles,
  ArrowRight,
} from 'lucide-react-native';

const PRIORITIES: { value: GoalPriority; label: string; icon: typeof Zap; color: string; bg: string }[] = [
  { value: 'low', label: 'Relaxed', icon: Star, color: '#475569', bg: '#f1f5f9' },
  { value: 'medium', label: 'Steady', icon: Zap, color: '#1565C0', bg: '#eff6ff' },
  { value: 'high', label: 'Urgent', icon: Flame, color: '#dc2626', bg: '#fff1f2' },
];

function getPriorityConfig(priority: GoalPriority) {
  return PRIORITIES.find((p) => p.value === priority) ?? PRIORITIES[1]!;
}

function getDaysLeft(targetDate: string): number {
  const now = new Date();
  const target = new Date(targetDate);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function GoalProgressRing({ percentage, size = 56 }: { percentage: number; size?: number }) {
  const clamped = Math.min(percentage, 100);
  const isComplete = clamped >= 100;
  const color = isComplete ? '#059669' : clamped >= 70 ? '#1565C0' : '#0284c7';

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: `${color}30`,
      }}
    >
      <View
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: size / 2,
          borderWidth: 3,
          borderColor: color,
          opacity: 0.2,
        }}
      />
      {isComplete ? (
        <CheckCircle2 size={22} color={color} />
      ) : (
        <Text style={{ fontSize: 12, fontWeight: '900', color: '#0f172a' }}>{clamped}%</Text>
      )}
    </View>
  );
}

export default function GoalsScreen() {
  const { data: goals, isLoading, isRefetching, refetch } = useGoals();
  const { data: salary, refetch: refetchSalary } = useSalary();
  const { data: dashboard, refetch: refetchDashboard } = useDashboard(getCurrentMonthStr());

  const createMutation = useCreateGoal();
  const contributeMutation = useContributeToGoal();
  const deleteMutation = useDeleteGoal();

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedGoalForContribution, setSelectedGoalForContribution] = useState<Goal | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Create Goal form
  const [goalName, setGoalName] = useState('');
  const [targetAmountPaise, setTargetAmountPaise] = useState(0);
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0]!;
  });
  const [priority, setPriority] = useState<GoalPriority>('medium');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Contribution form
  const [contribType, setContribType] = useState<'contribution' | 'withdrawal'>('contribution');
  const [contribAmountPaise, setContribAmountPaise] = useState(0);
  const [contribError, setContribError] = useState<string | null>(null);

  // Monthly salary & balance calculation
  const currentSalary = salary?.baseMonthlySalary ?? 0;
  const monthExpenses = dashboard?.monthlySummary?.expense ?? 0;
  const walletBalance = dashboard?.netWealth ?? 0;

  // Remaining monthly surplus = Salary - Expenses
  // If salary is not set, fallback to wallet balance
  const monthlySurplusPaise = currentSalary > 0
    ? Math.max(0, currentSalary - monthExpenses)
    : walletBalance;

  const resetCreateForm = () => {
    setGoalName('');
    setTargetAmountPaise(0);
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    setTargetDate(d.toISOString().split('T')[0]!);
    setPriority('medium');
    setErrorMsg(null);
  };

  const handleCreateGoal = async () => {
    const name = goalName.trim();
    if (!name) { setErrorMsg('Goal name is required.'); return; }
    if (targetAmountPaise <= 0) { setErrorMsg('Target amount must be greater than ₹0.'); return; }
    if (!targetDate.match(/^\d{4}-\d{2}-\d{2}$/)) { setErrorMsg('Date must be in YYYY-MM-DD format.'); return; }
    if (new Date(targetDate) <= new Date()) { setErrorMsg('Target date must be in the future.'); return; }
    setErrorMsg(null);
    try {
      await createMutation.mutateAsync({ name, targetAmount: targetAmountPaise, targetDate, priority });
      setShowAddModal(false);
      resetCreateForm();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create goal');
    }
  };

  const handleOpenContributeModal = (goal: Goal, prefillPaise: number = 0) => {
    setContribError(null);
    setContribType('contribution');
    setContribAmountPaise(prefillPaise);
    setSelectedGoalForContribution(goal);
  };

  const handleContribute = async () => {
    if (!selectedGoalForContribution) return;
    if (contribAmountPaise <= 0) { setContribError('Enter an amount greater than ₹0.'); return; }
    setContribError(null);
    try {
      await contributeMutation.mutateAsync({
        goalId: selectedGoalForContribution._id || selectedGoalForContribution.id,
        amount: contribAmountPaise,
        type: contribType,
      });
      setSelectedGoalForContribution(null);
      setContribAmountPaise(0);
      void Promise.all([refetch(), refetchDashboard(), refetchSalary()]);
    } catch (err) {
      setContribError(err instanceof Error ? err.message : 'Failed to record');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
      void refetch();
    } catch {}
  };

  // Safe array extraction
  const safeGoals: Goal[] = Array.isArray(goals)
    ? goals
    : Array.isArray((goals as any)?.goals)
    ? (goals as any).goals
    : [];

  const totalTarget = safeGoals.reduce((a, g) => a + (g.targetAmount || 0), 0);
  const totalSaved = safeGoals.reduce((a, g) => a + (g.currentAmount || 0), 0);
  const totalProgress = totalTarget > 0 ? Math.min(Math.round((totalSaved / totalTarget) * 100), 100) : 0;
  const activeCount = safeGoals.filter((g) => !g.isArchived && (g.progressPercentage ?? 0) < 100).length;
  const completedCount = safeGoals.filter((g) => (g.progressPercentage ?? 0) >= 100).length;

  return (
    <ScreenWrapper
      scrollable
      style={styles.wrapper}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            void Promise.all([refetch(), refetchDashboard(), refetchSalary()]);
          }}
          tintColor="#1565C0"
        />
      }
    >
      {/* ── Top Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>SAVINGS MILESTONES</Text>
          <Text style={styles.headerTitle}>Savings Goals</Text>
        </View>

        <Pressable
          onPress={() => { resetCreateForm(); setShowAddModal(true); }}
          style={styles.newGoalBtn}
        >
          <Plus size={16} color="#ffffff" />
          <Text style={styles.newGoalBtnText}>New Goal</Text>
        </Pressable>
      </View>

      {/* ── Monthly Salary & Savings Surplus Tracker (User's Concept) ── */}
      <View style={styles.surplusCard}>
        <View style={styles.surplusHeader}>
          <View style={styles.rowCenter}>
            <Wallet size={16} color="#1565C0" />
            <Text style={styles.surplusHeaderTitle}>
              Monthly Salary &amp; Available Savings
            </Text>
          </View>
          <View style={styles.surplusLiveBadge}>
            <Text style={styles.surplusLiveText}>● Available</Text>
          </View>
        </View>

        <Text style={styles.surplusAmount}>
          {formatPaise(monthlySurplusPaise)}
        </Text>
        <Text style={styles.surplusSub}>
          {currentSalary > 0
            ? `Remaining from ₹${(currentSalary / 100).toLocaleString('en-IN')} salary after expenses`
            : `Available wallet balance for goal contributions`}
        </Text>

        <View style={styles.surplusRow}>
          <View style={styles.surplusCol}>
            <Text style={styles.surplusColLabel}>Monthly Salary</Text>
            <Text style={styles.surplusColVal}>
              {currentSalary > 0 ? formatPaise(currentSalary) : 'Not Configured'}
            </Text>
          </View>

          <View style={styles.surplusDivider} />

          <View style={styles.surplusCol}>
            <Text style={styles.surplusColLabel}>Spent This Month</Text>
            <Text style={[styles.surplusColVal, { color: '#EF4444' }]}>
              -{formatPaise(monthExpenses)}
            </Text>
          </View>

          <View style={styles.surplusDivider} />

          <View style={styles.surplusCol}>
            <Text style={styles.surplusColLabel}>Wallet Cash</Text>
            <Text style={[styles.surplusColVal, { color: '#1565C0' }]}>
              {formatPaise(walletBalance)}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Consolidated Progress Card (Royal Blue Theme) ── */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={styles.progressEyebrow}>TOTAL SAVINGS PROGRESS</Text>
            <Text style={styles.progressTotal}>
              {formatPaise(totalSaved)}
            </Text>
            <Text style={styles.progressTarget}>
              of {formatPaise(totalTarget)} target
            </Text>
          </View>

          <View style={styles.progressCircle}>
            {totalProgress >= 100 ? (
              <CheckCircle2 size={24} color="#10B981" />
            ) : (
              <Text style={styles.progressPctText}>{totalProgress}%</Text>
            )}
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${totalProgress}%` },
            ]}
          />
        </View>

        <View style={styles.statBadgesRow}>
          <View style={styles.statBadge}>
            <Text style={styles.statBadgeLabel}>Active</Text>
            <Text style={styles.statBadgeVal}>{activeCount}</Text>
          </View>
          <View style={styles.statBadge}>
            <Text style={styles.statBadgeLabel}>Achieved</Text>
            <Text style={[styles.statBadgeVal, { color: '#10B981' }]}>{completedCount}</Text>
          </View>
          <View style={styles.statBadge}>
            <Text style={styles.statBadgeLabel}>Remaining</Text>
            <Text style={styles.statBadgeVal} numberOfLines={1}>
              {formatPaise(Math.max(0, totalTarget - totalSaved))}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Goals List ── */}
      {isLoading ? (
        <View style={{ gap: 14, marginBottom: 24 }}>
          <SkeletonCard height={150} />
          <SkeletonCard height={150} />
        </View>
      ) : safeGoals.length > 0 ? (
        <View style={{ gap: 14, marginBottom: 24 }}>
          {safeGoals.map((g) => {
            const pct = Math.min(g.progressPercentage ?? 0, 100);
            const isCompleted = pct >= 100;
            const daysLeft = getDaysLeft(g.targetDate as string);
            const pc = getPriorityConfig(g.priority as GoalPriority);
            const PriorityIcon = pc.icon;
            const isUrgent = daysLeft < 30 && !isCompleted;
            const pace = g.monthlyPaceRequired ?? 0;

            return (
              <View
                key={g._id || g.id}
                style={[
                  styles.goalCard,
                  isCompleted && { borderColor: '#10B981', borderWidth: 1.5 },
                ]}
              >
                {/* Top strip */}
                <View
                  style={{
                    height: 4,
                    backgroundColor: isCompleted ? '#10B981' : isUrgent ? '#EF4444' : '#1565C0',
                  }}
                />

                <View style={styles.goalCardBody}>
                  {/* Title & Priority Row */}
                  <View style={styles.goalTitleRow}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.goalName}>{g.name}</Text>
                      <View style={styles.goalTagRow}>
                        <View style={[styles.priorityPill, { backgroundColor: pc.bg }]}>
                          <PriorityIcon size={11} color={pc.color} />
                          <Text style={[styles.priorityPillText, { color: pc.color }]}>
                            {pc.label}
                          </Text>
                        </View>

                        {isCompleted && (
                          <View style={styles.completedPill}>
                            <CheckCircle2 size={11} color="#059669" />
                            <Text style={styles.completedPillText}>Achieved!</Text>
                          </View>
                        )}

                        {isUrgent && !isCompleted && (
                          <View style={styles.urgentPill}>
                            <Flame size={11} color="#DC2626" />
                            <Text style={styles.urgentPillText}>Due soon</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.rowCenter}>
                      <GoalProgressRing percentage={pct} />
                      <Pressable
                        onPress={() => setDeleteId(g._id || g.id)}
                        style={styles.deleteGoalBtn}
                      >
                        <Trash2 size={15} color="#64748B" />
                      </Pressable>
                    </View>
                  </View>

                  {/* Amounts */}
                  <View style={styles.amountBox}>
                    <View>
                      <Text style={styles.currentAmountText}>
                        {formatPaise(g.currentAmount)}
                      </Text>
                      <Text style={styles.targetAmountSub}>
                        Target: <Text style={{ fontWeight: '800', color: '#0D1B3E' }}>{formatPaise(g.targetAmount)}</Text>
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.remainingLabel}>Remaining</Text>
                      <Text style={styles.remainingVal}>
                        {formatPaise(Math.max(0, g.targetAmount - g.currentAmount))}
                      </Text>
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.goalBarTrack}>
                    <View
                      style={[
                        styles.goalBarFill,
                        {
                          width: `${pct}%`,
                          backgroundColor: isCompleted ? '#10B981' : '#1565C0',
                        },
                      ]}
                    />
                  </View>

                  {/* Meta: Target date & pace */}
                  <View style={styles.metaRow}>
                    <View style={styles.rowCenter}>
                      <Calendar size={13} color="#64748B" />
                      <Text style={styles.metaDateText}>
                        {formatDate(g.targetDate as string)}
                      </Text>
                    </View>

                    {pace > 0 && !isCompleted && (
                      <View style={styles.rowCenter}>
                        <TrendingUp size={12} color="#1565C0" />
                        <Text style={styles.metaPaceText}>
                          {formatPaise(pace)}/mo needed
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Quick Allocation Action Chips (User's concept: +₹500, +₹1,000, +Surplus) */}
                  {!isCompleted && (
                    <View style={styles.quickChipsBlock}>
                      <Text style={styles.quickChipsTitle}>
                        Send Savings from Monthly Balance:
                      </Text>
                      <View style={styles.quickChipsRow}>
                        <Pressable
                          onPress={() => handleOpenContributeModal(g, 50000)} // ₹500
                          style={styles.chipBtn}
                        >
                          <Text style={styles.chipBtnText}>+ ₹500</Text>
                        </Pressable>

                        <Pressable
                          onPress={() => handleOpenContributeModal(g, 100000)} // ₹1,000
                          style={styles.chipBtn}
                        >
                          <Text style={styles.chipBtnText}>+ ₹1,000</Text>
                        </Pressable>

                        <Pressable
                          onPress={() => handleOpenContributeModal(g, 200000)} // ₹2,000
                          style={styles.chipBtn}
                        >
                          <Text style={styles.chipBtnText}>+ ₹2,000</Text>
                        </Pressable>

                        {monthlySurplusPaise > 0 && (
                          <Pressable
                            onPress={() => handleOpenContributeModal(g, monthlySurplusPaise)}
                            style={[styles.chipBtn, styles.chipBtnPrimary]}
                          >
                            <Text style={styles.chipBtnPrimaryText}>All Surplus</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Deposit / Withdraw Action Button */}
                  <Pressable
                    onPress={() => handleOpenContributeModal(g, 0)}
                    style={styles.contributeButton}
                  >
                    <Coins size={14} color="#1565C0" />
                    <Text style={styles.contributeButtonText}>
                      {isCompleted ? 'Add More Funds' : 'Deposit Custom Amount / Withdraw'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <Card className="mb-6 bg-white border border-slate-200">
          <EmptyState
            icon={<Target size={36} color="#1565C0" />}
            title="No Savings Goals Yet"
            description="Create goals for emergency savings, vacations, gadgets, or investments. Allocate from your monthly salary surplus anytime."
          />
        </Card>
      )}

      {/* ── Create Goal Modal (Centered) ── */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalCenterOverlay}
        >
          {/* Backdrop Tap to Dismiss */}
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowAddModal(false)} />

          <View style={styles.modalCenterCard}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 22 }}
            >
              <View style={styles.modalHeaderRow}>
                <View>
                  <Text style={styles.modalEyebrow}>NEW TARGET</Text>
                  <Text style={styles.modalTitle}>Create Savings Goal</Text>
                </View>
                <Pressable
                  onPress={() => setShowAddModal(false)}
                  style={styles.modalCloseBtn}
                >
                  <X size={16} color="#64748B" />
                </Pressable>
              </View>

              {errorMsg ? (
                <View style={styles.modalErrorBox}>
                  <Text style={styles.modalErrorText}>{errorMsg}</Text>
                </View>
              ) : null}

              {/* Goal Name */}
              <Input
                label="GOAL NAME"
                placeholder="e.g. Vacation Trip, Emergency Fund, Laptop"
                value={goalName}
                onChangeText={setGoalName}
                containerClassName="mb-4"
              />

              {/* Target Amount */}
              <CurrencyInput
                label="TARGET AMOUNT"
                paiseValue={targetAmountPaise}
                onPaiseChange={setTargetAmountPaise}
                containerClassName="mb-4"
              />

              {/* Target Date */}
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.fieldLabel}>TARGET COMPLETION DATE</Text>
                <DatePicker
                  value={targetDate}
                  onChangeDate={setTargetDate}
                  mode="future"
                />
              </View>

              {/* Priority Picker */}
              <View style={{ marginBottom: 20 }}>
                <Text style={styles.fieldLabel}>PRIORITY LEVEL</Text>
                <View style={styles.priorityRow}>
                  {PRIORITIES.map((p) => {
                    const isSelected = priority === p.value;
                    const Icon = p.icon;
                    return (
                      <Pressable
                        key={p.value}
                        onPress={() => setPriority(p.value)}
                        style={[
                          styles.prioritySelectBtn,
                          isSelected && { borderColor: p.color, backgroundColor: p.bg },
                        ]}
                      >
                        <Icon size={14} color={isSelected ? p.color : '#64748B'} />
                        <Text
                          style={[
                            styles.prioritySelectText,
                            isSelected && { color: p.color, fontWeight: '800' },
                          ]}
                        >
                          {p.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Button
                title="Save Goal"
                size="lg"
                loading={createMutation.isPending}
                onPress={handleCreateGoal}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Send Savings / Contribution Modal (Centered) ── */}
      <Modal
        visible={!!selectedGoalForContribution}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedGoalForContribution(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalCenterOverlay}
        >
          {/* Backdrop Tap to Dismiss */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectedGoalForContribution(null)}
          />

          <View style={styles.modalCenterCard}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 22 }}
            >
              <View style={styles.modalHeaderRow}>
                <View>
                  <Text style={styles.modalEyebrow}>TRANSFER SAVINGS</Text>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {selectedGoalForContribution?.name}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setSelectedGoalForContribution(null)}
                  style={styles.modalCloseBtn}
                >
                  <X size={16} color="#64748B" />
                </Pressable>
              </View>

              {/* Goal Snapshot */}
              {selectedGoalForContribution && (
                <View style={styles.contribGoalSnapshot}>
                  <View style={styles.snapshotRow}>
                    <Text style={styles.snapshotLabel}>Saved so far</Text>
                    <Text style={styles.snapshotTarget}>
                      Target: {formatPaise(selectedGoalForContribution.targetAmount)}
                    </Text>
                  </View>

                  <Text style={styles.snapshotCurrent}>
                    {formatPaise(selectedGoalForContribution.currentAmount)}
                  </Text>

                  <View style={styles.snapshotTrack}>
                    <View
                      style={[
                        styles.snapshotFill,
                        {
                          width: `${Math.min(
                            selectedGoalForContribution.progressPercentage ?? 0,
                            100,
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              )}

              {/* Available Monthly Surplus Indicator */}
              <View style={styles.availableSurplusCard}>
                <View style={styles.rowCenter}>
                  <Wallet size={16} color="#1565C0" />
                  <Text style={styles.availableSurplusTitle}>
                    Available Monthly Savings Balance
                  </Text>
                </View>
                <Text style={styles.availableSurplusValue}>
                  {formatPaise(monthlySurplusPaise)}
                </Text>
              </View>

              {contribError ? (
                <Text style={styles.contribErrorText}>{contribError}</Text>
              ) : null}

              {/* Action Type Toggle: Deposit or Withdraw */}
              <View style={styles.actionToggle}>
                <Pressable
                  onPress={() => setContribType('contribution')}
                  style={[
                    styles.toggleTab,
                    contribType === 'contribution' && styles.toggleTabActive,
                  ]}
                >
                  <ArrowUpCircle
                    size={15}
                    color={contribType === 'contribution' ? '#1565C0' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.toggleTabText,
                      contribType === 'contribution' && { color: '#1565C0' },
                    ]}
                  >
                    Deposit from Balance
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setContribType('withdrawal')}
                  style={[
                    styles.toggleTab,
                    contribType === 'withdrawal' && styles.toggleTabActive,
                  ]}
                >
                  <ArrowDownCircle
                    size={15}
                    color={contribType === 'withdrawal' ? '#DC2626' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.toggleTabText,
                      contribType === 'withdrawal' && { color: '#DC2626' },
                    ]}
                  >
                    Withdraw
                  </Text>
                </Pressable>
              </View>

              {/* Quick Amount Pills for Deposit */}
              {contribType === 'contribution' && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={styles.quickPillsLabel}>Choose Quick Amount:</Text>
                  <View style={styles.quickPillsRow}>
                    {[
                      { label: '₹500', paise: 50000 },
                      { label: '₹1,000', paise: 100000 },
                      { label: '₹2,000', paise: 200000 },
                    ].map((p) => {
                      const isSelected = contribAmountPaise === p.paise;
                      return (
                        <Pressable
                          key={p.label}
                          onPress={() => setContribAmountPaise(p.paise)}
                          style={[
                            styles.quickPill,
                            isSelected && styles.quickPillActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.quickPillText,
                              isSelected && styles.quickPillTextActive,
                            ]}
                          >
                            {p.label}
                          </Text>
                        </Pressable>
                      );
                    })}

                    {monthlySurplusPaise > 0 && (
                      <Pressable
                        onPress={() => setContribAmountPaise(monthlySurplusPaise)}
                        style={[
                          styles.quickPill,
                          contribAmountPaise === monthlySurplusPaise && styles.quickPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.quickPillText,
                            contribAmountPaise === monthlySurplusPaise && styles.quickPillTextActive,
                          ]}
                        >
                          All Surplus
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              )}

              {/* Amount Input */}
              <CurrencyInput
                label={contribType === 'contribution' ? 'TRANSFER AMOUNT' : 'WITHDRAWAL AMOUNT'}
                paiseValue={contribAmountPaise}
                onPaiseChange={setContribAmountPaise}
                containerClassName="mb-5"
              />

              <Button
                title={
                  contribType === 'contribution'
                    ? `Transfer ${contribAmountPaise > 0 ? formatPaise(contribAmountPaise) : ''} to Goal`
                    : `Withdraw ${contribAmountPaise > 0 ? formatPaise(contribAmountPaise) : ''}`
                }
                size="lg"
                loading={contributeMutation.isPending}
                onPress={handleContribute}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Delete Confirmation ── */}
      <ConfirmModal
        visible={!!deleteId}
        title="Delete Savings Goal"
        message="This will delete the goal from your active goals list. Past transaction records in your Main Wallet will be safely preserved."
        confirmTitle="Delete Goal"
        isDestructive
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      <View style={{ height: 100 }} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 6,
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
  newGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1565C0',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  newGoalBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  surplusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
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
  surplusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  surplusHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1565C0',
    marginLeft: 6,
  },
  surplusLiveBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  surplusLiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  surplusAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0D1B3E',
  },
  surplusSub: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 12,
  },
  surplusRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
  },
  surplusCol: {
    flex: 1,
    alignItems: 'center',
  },
  surplusColLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  surplusColVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0D1B3E',
  },
  surplusDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  progressCard: {
    backgroundColor: '#1565C0',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#90CAF9',
    letterSpacing: 1,
  },
  progressTotal: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  progressTarget: {
    fontSize: 12,
    color: '#E3F2FD',
  },
  progressCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPctText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  progressBarTrack: {
    height: 7,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#60A5FA',
    borderRadius: 4,
  },
  statBadgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBadge: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  statBadgeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#90CAF9',
    textTransform: 'uppercase',
  },
  statBadgeVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 1,
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  goalCardBody: {
    padding: 16,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0D1B3E',
    marginBottom: 4,
  },
  goalTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  completedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  completedPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  urgentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  urgentPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  deleteGoalBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginLeft: 6,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  currentAmountText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0D1B3E',
  },
  targetAmountSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  remainingLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  remainingVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1565C0',
    marginTop: 2,
  },
  goalBarTrack: {
    height: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  goalBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 4,
  },
  metaPaceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1565C0',
    marginLeft: 4,
  },
  quickChipsBlock: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D0E3FF',
  },
  quickChipsTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1565C0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chipBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#B9D5FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  chipBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1565C0',
  },
  chipBtnPrimary: {
    backgroundColor: '#1565C0',
    borderColor: '#1565C0',
  },
  chipBtnPrimaryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  contributeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  contributeButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1565C0',
  },
  modalCenterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCenterCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1565C0',
    letterSpacing: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0D1B3E',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  modalErrorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7B93C8',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  prioritySelectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  prioritySelectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  contribGoalSnapshot: {
    backgroundColor: '#F0F7FF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D0E3FF',
  },
  snapshotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  snapshotLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1565C0',
  },
  snapshotTarget: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  snapshotCurrent: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0D1B3E',
    marginBottom: 8,
  },
  snapshotTrack: {
    height: 6,
    backgroundColor: '#D0E3FF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  snapshotFill: {
    height: '100%',
    backgroundColor: '#1565C0',
    borderRadius: 3,
  },
  availableSurplusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  availableSurplusTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1565C0',
    marginLeft: 6,
  },
  availableSurplusValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0D1B3E',
  },
  contribErrorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 10,
  },
  actionToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 3,
    marginBottom: 14,
    gap: 4,
  },
  toggleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 11,
  },
  toggleTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  quickPillsLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7B93C8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  quickPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  quickPillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1565C0',
  },
  quickPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  quickPillTextActive: {
    color: '#1565C0',
    fontWeight: '800',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
