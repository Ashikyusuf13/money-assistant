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
  LoadingSpinner,
  EmptyState,
} from '@/src/components/ui';
import { useTransactions } from '@/src/hooks/useTransactions';
import { TransactionType } from '@/src/types/api';
import { formatTransactionAmount } from '@/src/utils/currency';
import { formatDate } from '@/src/utils/date';
import { Plus, ArrowLeftRight } from 'lucide-react-native';

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
  food: '#FF9800',
  groceries: '#FF9800',
  transport: '#2196F3',
  shopping: '#E91E63',
  bills: '#FFC107',
  health: '#F44336',
  entertainment: '#9C27B0',
  salary: '#4CAF50',
  income: '#4CAF50',
  transfer: '#607D8B',
  refund: '#00BCD4',
  others: '#607D8B',
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
  transfer: '↔️',
  refund: '↩️',
  others: '📦',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category.toLowerCase()] ?? '#607D8B';
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
          <Text style={styles.headerEyebrow}>Ledger History</Text>
          <Text style={styles.headerTitle}>Transactions</Text>
        </View>
        <Pressable
          onPress={() => router.push('/transaction/add')}
          style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
        >
          <Plus size={16} color="#ffffff" />
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
        <LoadingSpinner message="Loading transactions..." />
      ) : grouped.length > 0 ? (
        <View style={styles.listContainer}>
          {grouped.map(({ dateLabel, items }) => (
            <View key={dateLabel} style={styles.section}>
              {/* Section date header */}
              <Text style={styles.sectionHeader}>{dateLabel}</Text>

              {/* Section card */}
              <View style={styles.card}>
                {items.map((tx, idx) => {
                  const { text, colorClass } = formatTransactionAmount(tx.type, tx.amount);
                  const isPositive = tx.type === 'income' || tx.type === 'refund';
                  const amountColor = isPositive ? '#4CAF50' : '#F44336';
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
                      {/* Category icon bubble */}
                      <View style={[styles.iconBubble, { backgroundColor: catColor + '22' }]}>
                        <Text style={styles.iconEmoji}>{catIcon}</Text>
                      </View>

                      {/* Text block */}
                      <View style={styles.txInfo}>
                        <Text style={styles.txDesc} numberOfLines={1}>
                          {tx.description}
                        </Text>
                        <View style={styles.txMeta}>
                          <View style={[styles.categoryBadge, { backgroundColor: catColor + '1A' }]}>
                            <Text style={[styles.categoryBadgeText, { color: catColor }]}>
                              {tx.category}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Amount */}
                      <Text style={[styles.txAmount, { color: amountColor }]}>{text}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          <View style={{ height: 24 }} />
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <EmptyState
            icon={<ArrowLeftRight size={32} color="#1565C0" />}
            title="No Matching Transactions"
            description="No transaction records match your selected filters."
            actionTitle="Record Entry"
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
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 16,
    paddingTop: 8,
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
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0D1B3E',
    letterSpacing: -0.5,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1565C0',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addBtnPressed: {
    backgroundColor: '#0D47A1',
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
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#DDE5F4',
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
    color: '#5C7099',
  },
  pillLabelActive: {
    color: '#ffffff',
  },
  // List
  listContainer: {
    gap: 4,
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7B93C8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
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
    borderBottomColor: '#EEF2FF',
  },
  txRowPressed: {
    backgroundColor: '#F5F8FF',
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#0D1B3E',
  },
  txMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  // Empty state
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
});
