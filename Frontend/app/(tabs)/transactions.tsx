import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ScreenWrapper,
  SkeletonList,
  EmptyState,
} from '@/src/components/ui';
import { useTransactions } from '@/src/hooks/useTransactions';
import { TransactionType } from '@/src/types/api';
import { formatTransactionAmount } from '@/src/utils/currency';
import { formatDate } from '@/src/utils/date';
import { Plus, ArrowLeftRight, ChevronRight, TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Transaction {
  _id?: string;
  id?: string;
  description: string;
  category: string;
  date: string;
  type: TransactionType;
  amount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_FILTERS: Array<{ label: string; value: TransactionType | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Expenses', value: 'expense' },
  { label: 'Income', value: 'income' },
  { label: 'Transfers', value: 'transfer' },
  { label: 'Refunds', value: 'refund' },
];

const CATEGORY_COLORS: Record<string, string> = {
  food: '#F59E0B',
  groceries: '#F97316',
  transport: '#0284C7',
  shopping: '#EC4899',
  bills: '#EAB308',
  health: '#EF4444',
  entertainment: '#A855F7',
  salary: '#10B981',
  income: '#10B981',
  transfer: '#6366F1',
  refund: '#06B6D4',
  others: '#64748B',
};

const CATEGORY_ICONS: Record<string, string> = {
  food: '🍔',
  groceries: '🛒',
  transport: '🚗',
  shopping: '🛍️',
  bills: '⚡',
  health: '❤️',
  entertainment: '🎬',
  salary: '💰',
  income: '💵',
  transfer: '🔄',
  refund: '↩️',
  others: '📦',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category.toLowerCase()] ?? '#64748B';
}

function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category.toLowerCase()] ?? '📦';
}

/** Group transactions by their date string (YYYY-MM-DD) */
function groupByDate(txList: Transaction[]): Array<{ dateLabel: string; items: Transaction[] }> {
  const map = new Map<string, Transaction[]>();
  for (const tx of txList) {
    const key = formatDate(tx.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }
  return Array.from(map.entries()).map(([dateLabel, items]) => ({ dateLabel, items }));
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TransactionsScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<TransactionType | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filters = {
    type: selectedType === 'all' ? undefined : selectedType,
    category: selectedCategory || undefined,
    limit: 50,
  };

  const { data, isLoading, isRefetching, refetch } = useTransactions(filters);
  const transactions: Transaction[] = data?.transactions ?? [];
  const grouped = groupByDate(transactions);

  return (
    <ScreenWrapper
      scrollable
      style={styles.wrapper}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          tintColor="#1565C0"
          colors={['#1565C0']}
        />
      }
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>Financial Ledger</Text>
          <Text style={styles.headerTitle}>Transactions</Text>
        </View>
        <Pressable
          onPress={() => router.push('/transaction/add')}
          style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
        >
          <Plus size={16} color="#ffffff" strokeWidth={2.5} />
          <Text style={styles.addBtnLabel}>Add</Text>
        </Pressable>
      </View>

      {/* ── Type Filter Pills ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
        style={styles.pillScroll}
      >
        {TYPE_FILTERS.map((f) => {
          const isSelected = selectedType === f.value;
          return (
            <Pressable
              key={f.value}
              onPress={() => setSelectedType(f.value)}
              style={[styles.pill, isSelected && styles.pillActive]}
            >
              <Text style={[styles.pillLabel, isSelected && styles.pillLabelActive]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Transactions List ── */}
      {isLoading ? (
        <View style={styles.skeletonContainer}>
          <SkeletonList count={6} />
        </View>
      ) : grouped.length > 0 ? (
        <View style={styles.listContainer}>
          {grouped.map(({ dateLabel, items }) => (
            <View key={dateLabel} style={styles.section}>
              {/* Section date header */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeader}>{dateLabel}</Text>
                <Text style={styles.sectionCount}>{items.length} records</Text>
              </View>

              {/* Section card */}
              <View style={styles.card}>
                {items.map((tx, idx) => {
                  const { text } = formatTransactionAmount(tx.type, tx.amount);
                  const isPositive = tx.type === 'income' || tx.type === 'refund';
                  const amountColor = isPositive ? '#16A34A' : '#DC2626';
                  const catColor = getCategoryColor(tx.category);
                  const catIcon = getCategoryIcon(tx.category);

                  return (
                    <Pressable
                      key={tx._id ?? tx.id}
                      onPress={() => router.push(`/transaction/${tx._id ?? tx.id}`)}
                      style={({ pressed }) => [
                        styles.txRow,
                        idx < items.length - 1 && styles.txRowBorder,
                        pressed && styles.txRowPressed,
                      ]}
                    >
                      {/* Premium Category Icon */}
                      <View style={[styles.iconBubble, { backgroundColor: catColor + '18', borderColor: catColor + '30' }]}>
                        <Text style={styles.iconEmoji}>{catIcon}</Text>
                        <View style={[styles.typeBadgeIndicator, { backgroundColor: isPositive ? '#16A34A' : '#EF4444' }]}>
                          {isPositive ? (
                            <ArrowDownLeft size={8} color="#FFFFFF" strokeWidth={3} />
                          ) : (
                            <ArrowUpRight size={8} color="#FFFFFF" strokeWidth={3} />
                          )}
                        </View>
                      </View>

                      {/* Text details */}
                      <View style={styles.txInfo}>
                        <Text style={styles.txDesc} numberOfLines={1}>
                          {tx.description}
                        </Text>
                        <View style={styles.txMeta}>
                          <View style={[styles.categoryBadge, { backgroundColor: catColor + '14' }]}>
                            <Text style={[styles.categoryBadgeText, { color: catColor }]}>
                              {tx.category}
                            </Text>
                          </View>
                          <View style={styles.walletBadge}>
                            <Text style={styles.walletBadgeText}>Main Wallet</Text>
                          </View>
                        </View>
                      </View>

                      {/* Amount & Direction */}
                      <View style={styles.txRight}>
                        <Text style={[styles.txAmount, { color: amountColor }]}>{text}</Text>
                        <ChevronRight size={14} color="#94A3B8" />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          <View style={{ height: 28 }} />
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <EmptyState
            icon={<ArrowLeftRight size={36} color="#1565C0" />}
            title="No Matching Transactions"
            description="No transaction records match your selected filter criteria."
            actionTitle="Record New Transaction"
            onAction={() => router.push('/transaction/add')}
          />
        </View>
      )}
    </ScreenWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  skeletonContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 4,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1565C0',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1565C0',
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 14,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 5,
  },
  addBtnPressed: {
    backgroundColor: '#0D47A1',
    transform: [{ scale: 0.98 }],
  },
  addBtnLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  // Filter pills
  pillScroll: {
    marginBottom: 16,
  },
  pillRow: {
    gap: 8,
    paddingVertical: 2,
  },
  pill: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  pillActive: {
    backgroundColor: '#1565C0',
    borderColor: '#1565C0',
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  pillLabelActive: {
    color: '#ffffff',
  },
  // List
  listContainer: {
    gap: 6,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  txRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  txRowPressed: {
    backgroundColor: '#F8FAFC',
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  typeBadgeIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  iconEmoji: {
    fontSize: 20,
  },
  txInfo: {
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
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  walletBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  walletBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  txRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  // Empty state
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 24,
    marginBottom: 24,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
});
