import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  RefreshControl,
  ScrollView,
  Platform,
} from 'react-native';
import {
  ScreenWrapper,
  Card,
  Button,
  Input,
  CurrencyInput,
  DatePicker,
  LoadingSpinner,
  EmptyState,
  ConfirmModal,
} from '@/src/components/ui';
import {
  useGoals,
  useCreateGoal,
  useContributeToGoal,
  useDeleteGoal,
} from '@/src/hooks/useGoals';
import { Goal, GoalPriority } from '@/src/types/api';
import { formatPaise } from '@/src/utils/currency';
import { formatDate } from '@/src/utils/date';
import {
  Plus,
  Trash2,
  Target,
  Calendar,
  X,
  Coins,
  CheckCircle2,
  TrendingUp,
  Zap,
  Flame,
  Star,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react-native';

const PRIORITIES: { value: GoalPriority; label: string; icon: typeof Zap; color: string; bg: string }[] = [
  { value: 'low', label: 'Relaxed', icon: Star, color: '#475569', bg: '#f1f5f9' },
  { value: 'medium', label: 'Steady', icon: Zap, color: '#7c3aed', bg: '#f5f3ff' },
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
  const color = isComplete ? '#059669' : clamped >= 70 ? '#7c3aed' : '#0284c7';

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
    } catch (err) {
      setContribError(err instanceof Error ? err.message : 'Failed to record');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteMutation.mutateAsync(deleteId); setDeleteId(null); } catch {}
  };

  // Safe array extraction to guarantee reduce and filter never crash
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
      className="px-4 pt-2"
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          tintColor="#7c3aed"
          colors={['#7c3aed']}
        />
      }
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-5">
        <View>
          <Text className="text-xs font-bold text-purple-700 uppercase tracking-widest">
            Savings Milestones
          </Text>
          <Text className="text-2xl font-black text-slate-900" style={{ color: '#0f172a' }}>
            Goals
          </Text>
        </View>
        <Pressable
          onPress={() => { resetCreateForm(); setShowAddModal(true); }}
          className="flex-row items-center gap-1.5 bg-purple-700 px-4 py-2.5 rounded-2xl active:bg-purple-800 shadow-md"
          style={{ shadowColor: '#6b21a8', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}
        >
          <Plus size={15} color="#ffffff" />
          <Text className="text-xs font-bold text-white">New Goal</Text>
        </Pressable>
      </View>

      {/* Consolidated Summary Card */}
      <Card className="mb-5 p-0 overflow-hidden border-0" style={{ backgroundColor: '#2e1065' }}>
        <View className="px-5 pt-5 pb-4">
          <View className="flex-row justify-between items-start mb-4">
            <View>
              <Text className="text-xs font-bold text-purple-300 uppercase tracking-widest mb-1">
                Total Savings Progress
              </Text>
              <Text className="text-3xl font-black text-white">
                {formatPaise(totalSaved)}
              </Text>
              <Text className="text-sm font-semibold text-purple-200 mt-0.5">
                of {formatPaise(totalTarget)} target
              </Text>
            </View>
            <View
              className="w-16 h-16 rounded-full border-4 border-purple-400/40 items-center justify-center"
              style={{ backgroundColor: '#3b0764' }}
            >
              {totalProgress >= 100 ? (
                <CheckCircle2 size={26} color="#4ade80" />
              ) : (
                <Text className="text-lg font-black text-white">{totalProgress}%</Text>
              )}
            </View>
          </View>

          {/* Overall progress bar */}
          <View className="w-full h-2.5 rounded-full overflow-hidden mb-3" style={{ backgroundColor: '#4c1d95' }}>
            <View
              className="h-full rounded-full"
              style={{ width: `${totalProgress}%`, backgroundColor: '#a78bfa' }}
            />
          </View>

          <View className="flex-row gap-2">
            <View className="flex-1 bg-purple-950/80 rounded-xl px-3 py-2 border border-purple-800/40">
              <Text className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">Active</Text>
              <Text className="text-base font-black text-white">{activeCount}</Text>
            </View>
            <View className="flex-1 bg-purple-950/80 rounded-xl px-3 py-2 border border-purple-800/40">
              <Text className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">Achieved</Text>
              <Text className="text-base font-black text-emerald-400">{completedCount}</Text>
            </View>
            <View className="flex-1 bg-purple-950/80 rounded-xl px-3 py-2 border border-purple-800/40">
              <Text className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">Remaining</Text>
              <Text className="text-sm font-black text-white" numberOfLines={1}>
                {formatPaise(Math.max(0, totalTarget - totalSaved))}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Goals List */}
      {isLoading ? (
        <LoadingSpinner message="Calculating your savings milestones..." />
      ) : safeGoals.length > 0 ? (
        <View className="gap-4 mb-6">
          {safeGoals.map((g) => {
            const pct = Math.min(g.progressPercentage ?? 0, 100);
            const isCompleted = pct >= 100;
            const daysLeft = getDaysLeft(g.targetDate as string);
            const pc = getPriorityConfig(g.priority as GoalPriority);
            const PriorityIcon = pc.icon;
            const isUrgent = daysLeft < 30 && !isCompleted;
            const pace = g.monthlyPaceRequired ?? 0;

            return (
              <Card
                key={g._id || g.id}
                className="p-0 overflow-hidden bg-white border border-slate-200 shadow-sm"
                style={
                  isCompleted
                    ? { borderColor: '#10b981', borderWidth: 1.5 }
                    : isUrgent
                    ? { borderColor: '#ef4444', borderWidth: 1.5 }
                    : undefined
                }
              >
                {/* Card Top Strip — coloured by status */}
                <View
                  style={{
                    height: 4,
                    backgroundColor: isCompleted
                      ? '#10b981'
                      : isUrgent
                      ? '#ef4444'
                      : pc.color,
                  }}
                />

                <View className="px-4 pt-3.5 pb-4">
                  {/* Header row */}
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1 pr-3">
                      <Text
                        className="text-lg font-extrabold text-slate-900 mb-1"
                        style={{ color: '#0f172a' }}
                      >
                        {g.name}
                      </Text>
                      <View className="flex-row items-center gap-2 flex-wrap">
                        {/* Priority badge */}
                        <View
                          className="flex-row items-center gap-1 px-2.5 py-0.5 rounded-full"
                          style={{ backgroundColor: pc.bg }}
                        >
                          <PriorityIcon size={11} color={pc.color} />
                          <Text className="text-[11px] font-bold" style={{ color: pc.color }}>
                            {pc.label}
                          </Text>
                        </View>

                        {isCompleted && (
                          <View className="flex-row items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={11} color="#059669" />
                            <Text className="text-[11px] font-bold text-emerald-800">Achieved!</Text>
                          </View>
                        )}

                        {isUrgent && !isCompleted && (
                          <View className="flex-row items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-full">
                            <Flame size={11} color="#dc2626" />
                            <Text className="text-[11px] font-bold text-rose-700">Due soon</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View className="flex-row items-center gap-2">
                      <GoalProgressRing percentage={pct} />
                      <Pressable
                        onPress={() => setDeleteId(g._id || g.id)}
                        className="p-1.5 active:opacity-60 rounded-lg bg-slate-100"
                      >
                        <Trash2 size={15} color="#64748b" />
                      </Pressable>
                    </View>
                  </View>

                  {/* Amount row */}
                  <View className="flex-row justify-between items-baseline mb-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <View>
                      <Text className="text-xl font-black" style={{ color: '#0f172a' }}>
                        {formatPaise(g.currentAmount)}
                      </Text>
                      <Text className="text-xs font-semibold text-slate-600 mt-0.5">
                        Target:{' '}
                        <Text className="font-bold text-slate-900" style={{ color: '#0f172a' }}>
                          {formatPaise(g.targetAmount)}
                        </Text>
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-xs font-semibold text-slate-500">Remaining</Text>
                      <Text className="text-sm font-black text-slate-900" style={{ color: '#0f172a' }}>
                        {formatPaise(Math.max(0, g.targetAmount - g.currentAmount))}
                      </Text>
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden mb-3">
                    <View
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: isCompleted ? '#059669' : pc.color }}
                    />
                  </View>

                  {/* Meta row: date + pace */}
                  <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center gap-1.5">
                      <Calendar size={13} color="#475569" />
                      <Text className="text-xs font-semibold text-slate-700">
                        {formatDate(g.targetDate as string)}
                      </Text>
                      {!isCompleted && (
                        <View
                          className="px-2 py-0.5 rounded-md"
                          style={{ backgroundColor: isUrgent ? '#fee2e2' : '#dcfce7' }}
                        >
                          <Text
                            className="text-[11px] font-bold"
                            style={{ color: isUrgent ? '#b91c1c' : '#15803d' }}
                          >
                            {daysLeft > 0 ? `${daysLeft}d left` : 'Overdue'}
                          </Text>
                        </View>
                      )}
                    </View>

                    {pace > 0 && !isCompleted && (
                      <View className="flex-row items-center gap-1">
                        <TrendingUp size={12} color="#6d28d9" />
                        <Text className="text-xs font-bold text-purple-700">
                          {formatPaise(pace)}/mo needed
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Contribute button */}
                  <Pressable
                    onPress={() => {
                      setContribError(null);
                      setContribAmountPaise(0);
                      setContribType('contribution');
                      setSelectedGoalForContribution(g);
                    }}
                    className="flex-row items-center justify-center gap-2 py-2.5 rounded-xl border active:opacity-80"
                    style={{ borderColor: pc.color + '40', backgroundColor: pc.bg }}
                  >
                    <Coins size={14} color={pc.color} />
                    <Text className="text-xs font-bold" style={{ color: pc.color }}>
                      {isCompleted ? 'Add More Funds' : 'Deposit / Withdraw'}
                    </Text>
                  </Pressable>
                </View>
              </Card>
            );
          })}
        </View>
      ) : (
        <Card className="mb-6 bg-white border border-slate-200">
          <EmptyState
            icon={<Target size={36} color="#7c3aed" />}
            title="No Savings Goals Yet"
            description="Set goals for emergencies, travel, gadgets, or big milestones. Track your progress month by month."
            actionTitle="Create First Goal"
            onAction={() => { resetCreateForm(); setShowAddModal(true); }}
          />
        </Card>
      )}

      {/* ─── Create Goal Modal ─────────────────────────── */}
      <Modal visible={showAddModal} transparent animationType="slide" statusBarTranslucent>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
          <View
            className="bg-white rounded-t-3xl border-t border-slate-200"
            style={{ backgroundColor: '#ffffff', paddingBottom: Platform.OS === 'ios' ? 34 : 20 }}
          >
            {/* Handle bar */}
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1.5 rounded-full bg-slate-300" />
            </View>

            <ScrollView
              className="px-5 pt-3"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Title */}
              <View className="flex-row items-center justify-between mb-5">
                <View>
                  <Text className="text-xs font-bold text-purple-700 uppercase tracking-widest mb-0.5">
                    New Milestone
                  </Text>
                  <Text className="text-xl font-black text-slate-900" style={{ color: '#0f172a' }}>
                    Create Savings Goal
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowAddModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
                >
                  <X size={16} color="#334155" />
                </Pressable>
              </View>

              {errorMsg && (
                <View className="bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 mb-4 flex-row gap-2">
                  <Text className="text-xs font-bold text-rose-700">{errorMsg}</Text>
                </View>
              )}

              {/* Goal Name */}
              <Input
                label="GOAL NAME"
                placeholder="e.g. Emergency Fund, Bike, Car, House"
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
                helperText="Enter the total amount you wish to save"
              />

              {/* Target Date Picker */}
              <DatePicker
                label="TARGET DATE (YYYY-MM-DD)"
                value={targetDate}
                onChangeDate={setTargetDate}
                mode="future"
                helperText={(() => {
                  const d = getDaysLeft(targetDate);
                  return d > 0 ? `${d} days from today` : d === 0 ? 'That is today' : 'Date is in the past';
                })()}
                containerClassName="mb-4"
              />

              {/* Priority / Effort Level */}
              <View className="mb-5">
                <Text
                  className="text-xs font-bold text-slate-800 mb-2.5 uppercase tracking-wider"
                  style={{ color: '#0f172a' }}
                >
                  Priority Level
                </Text>
                <View className="flex-row gap-2.5">
                  {PRIORITIES.map((p) => {
                    const isSelected = priority === p.value;
                    const PIcon = p.icon;
                    return (
                      <Pressable
                        key={p.value}
                        onPress={() => setPriority(p.value)}
                        className="flex-1 py-3 rounded-2xl items-center gap-1.5 border"
                        style={{
                          backgroundColor: isSelected ? p.color : '#f8fafc',
                          borderColor: isSelected ? p.color : '#cbd5e1',
                        }}
                      >
                        <PIcon size={18} color={isSelected ? '#ffffff' : p.color} />
                        <Text
                          className="text-xs font-bold"
                          style={{ color: isSelected ? '#ffffff' : '#0f172a' }}
                        >
                          {p.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Button
                title="Create Savings Goal"
                size="lg"
                loading={createMutation.isPending}
                onPress={handleCreateGoal}
              />
              <View className="h-4" />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── Contribution / Withdrawal Modal ──────────── */}
      <Modal visible={!!selectedGoalForContribution} transparent animationType="slide" statusBarTranslucent>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
          <View
            className="bg-white rounded-t-3xl border-t border-slate-200 px-5 pt-4"
            style={{ backgroundColor: '#ffffff', paddingBottom: Platform.OS === 'ios' ? 34 : 20 }}
          >
            {/* Handle */}
            <View className="items-center mb-4">
              <View className="w-10 h-1.5 rounded-full bg-slate-300" />
            </View>

            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-[11px] font-bold text-purple-700 uppercase tracking-widest mb-0.5">
                  Savings Goal
                </Text>
                <Text
                  className="text-lg font-black text-slate-900"
                  style={{ color: '#0f172a' }}
                  numberOfLines={1}
                >
                  {selectedGoalForContribution?.name}
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedGoalForContribution(null)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
              >
                <X size={16} color="#334155" />
              </Pressable>
            </View>

            {/* Goal snapshot */}
            {selectedGoalForContribution && (
              <View className="bg-purple-50 rounded-2xl px-4 py-3 mb-4 border border-purple-100">
                <View className="flex-row justify-between items-baseline mb-1">
                  <Text className="text-xs font-bold text-purple-900">Saved so far</Text>
                  <Text className="text-xs font-bold text-slate-600">Target</Text>
                </View>
                <View className="flex-row justify-between items-baseline">
                  <Text className="text-base font-black text-purple-800">
                    {formatPaise(selectedGoalForContribution.currentAmount)}
                  </Text>
                  <Text className="text-sm font-bold text-slate-800" style={{ color: '#0f172a' }}>
                    {formatPaise(selectedGoalForContribution.targetAmount)}
                  </Text>
                </View>
                <View className="w-full h-2 bg-purple-200 rounded-full mt-2.5 overflow-hidden">
                  <View
                    className="h-full bg-purple-700 rounded-full"
                    style={{ width: `${Math.min(selectedGoalForContribution.progressPercentage ?? 0, 100)}%` }}
                  />
                </View>
              </View>
            )}

            {contribError && (
              <Text className="text-xs font-bold text-rose-700 mb-3">{contribError}</Text>
            )}

            {/* Type toggle */}
            <View className="flex-row bg-slate-100 p-1 rounded-2xl mb-4 gap-1 border border-slate-200">
              <Pressable
                onPress={() => setContribType('contribution')}
                className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 ${
                  contribType === 'contribution' ? 'bg-white shadow-sm' : ''
                }`}
              >
                <ArrowUpCircle
                  size={15}
                  color={contribType === 'contribution' ? '#7c3aed' : '#64748b'}
                />
                <Text
                  className={`text-xs font-bold ${
                    contribType === 'contribution' ? 'text-purple-700' : 'text-slate-600'
                  }`}
                >
                  Deposit
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setContribType('withdrawal')}
                className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 ${
                  contribType === 'withdrawal' ? 'bg-white shadow-sm' : ''
                }`}
              >
                <ArrowDownCircle
                  size={15}
                  color={contribType === 'withdrawal' ? '#dc2626' : '#64748b'}
                />
                <Text
                  className={`text-xs font-bold ${
                    contribType === 'withdrawal' ? 'text-rose-700' : 'text-slate-600'
                  }`}
                >
                  Withdraw
                </Text>
              </Pressable>
            </View>

            <CurrencyInput
              label={contribType === 'contribution' ? 'DEPOSIT AMOUNT' : 'WITHDRAWAL AMOUNT'}
              paiseValue={contribAmountPaise}
              onPaiseChange={setContribAmountPaise}
              containerClassName="mb-5"
            />

            <Button
              title={contribType === 'contribution' ? 'Confirm Deposit' : 'Confirm Withdrawal'}
              size="lg"
              loading={contributeMutation.isPending}
              onPress={handleContribute}
            />
          </View>
        </View>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        visible={!!deleteId}
        title="Delete Savings Goal"
        message="This will permanently delete the goal. Contribution history won't be deleted from the ledger."
        confirmTitle="Delete Goal"
        isDestructive
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </ScreenWrapper>
  );
}
