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
import {
  Plus,
  ArrowLeftRight,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  Utensils,
  ShoppingCart,
  Car,
  ShoppingBag,
  Zap,
  Heart,
  Film,
  Briefcase,
  CircleDollarSign,
  RotateCcw,
  Package,
} from 'lucide-react-native';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Transaction {
  _id?: string;
  id?: string;
  description: string;
  category: string;
  date: string;
  type: TransactionType;
  amount: number;
  createdAt?: string;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category.toLowerCase()] ?? '#64748B';
}

function renderCategoryIcon(category: string, color: string, size = 20) {
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

/** Group transactions by their date string (YYYY-MM-DD), with latest first */
function groupByDate(txList: Transaction[]): Array<{ dateLabel: string; items: Transaction[] }> {
  const sorted = [...txList].sort((a, b) => {
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
  });

  const map = new Map<string, Transaction[]>();
  for (const tx of sorted) {
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
      style={{ backgroundColor: '#F8FAFC', flex: 1 }}
      contentContainerStyle={styles.scrollContent}
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
          style={styles.addBtn}
        >
          <View style={styles.addBtnInner}>
            <Plus size={16} color="#ffffff" strokeWidth={2.8} />
            <Text style={styles.addBtnLabel}>Add</Text>
          </View>
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

                  return (
                    <Pressable
                      key={tx._id ?? tx.id}
                      onPress={() => router.push(`/transaction/${tx._id ?? tx.id}`)}
                      style={styles.txPressable}
                    >
                      <View style={[
                        styles.txRow,
                        idx < items.length - 1 && styles.txRowBorder,
                      ]}>
                        {/* Category Icon */}
                        <View style={[styles.iconBubble, { backgroundColor: catColor + '15', borderColor: catColor + '35' }]}>
                          {renderCategoryIcon(tx.category, catColor, 20)}
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
                            <View style={[styles.categoryBadge, { backgroundColor: catColor + '15' }]}>
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
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          {/* Bottom spacing to ensure transactions are never hidden behind navigation */}
          <View style={{ height: 110 }} />
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
  scrollContent: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 110,
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
    width: '100%',
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
    backgroundColor: '#1565C0',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 5,
  },
  addBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1565C0',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 14,
  },
  addBtnLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  // Filter pills
  pillScroll: {
    marginBottom: 16,
    width: '100%',
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
    width: '100%',
    gap: 6,
  },
  section: {
    width: '100%',
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
    borderColor: '#E2E8F0',
    width: '100%',
  },
  txPressable: {
    width: '100%',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: '100%',
  },
  txRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
    flexShrink: 0,
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
  txInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    marginRight: 8,
    justifyContent: 'center',
  },
  txDesc: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
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
    gap: 4,
    flexShrink: 0,
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
    borderColor: '#E2E8F0',
    width: '100%',
  },
});
