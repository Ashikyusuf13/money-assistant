import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ScreenWrapper,
  Card,
  Badge,
  LoadingSpinner,
  EmptyState,
} from '@/src/components/ui';
import { useTransactions } from '@/src/hooks/useTransactions';
import { TransactionType } from '@/src/types/api';
import { formatTransactionAmount } from '@/src/utils/currency';
import { formatDate } from '@/src/utils/date';
import { Plus, ArrowLeftRight, Filter } from 'lucide-react-native';

const TYPE_FILTERS: Array<{ label: string; value: TransactionType | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Expenses', value: 'expense' },
  { label: 'Income', value: 'income' },
  { label: 'Transfers', value: 'transfer' },
  { label: 'Refunds', value: 'refund' },
];

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

  const transactions = data?.transactions ?? [];

  return (
    <ScreenWrapper
      scrollable
      className="px-4 pt-2"
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          tintColor="#0c87eb"
          colors={['#0c87eb']}
        />
      }
    >
      {/* Top Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View>
          <Text className="text-xs font-semibold text-primary-600 uppercase tracking-wider">
            Ledger History
          </Text>
          <Text className="text-2xl font-black text-slate-900 dark:text-slate-100">
            Transactions
          </Text>
        </View>

        <Pressable
          onPress={() => router.push('/transaction/add')}
          className="flex-row items-center gap-1.5 bg-primary-600 px-3.5 py-2 rounded-xl active:bg-primary-700 shadow-sm"
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-xs font-bold text-white">Add</Text>
        </Pressable>
      </View>

      {/* Type Filter Pills */}
      <View className="mb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 py-1"
        >
          {TYPE_FILTERS.map((f) => {
            const isSelected = selectedType === f.value;
            return (
              <Pressable
                key={f.value}
                onPress={() => setSelectedType(f.value)}
                className={`px-3.5 py-1.5 rounded-xl border active:opacity-80 ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-slate-100 border-slate-900 dark:border-slate-100'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isSelected
                      ? 'text-white dark:text-slate-900'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Transactions List */}
      {isLoading ? (
        <LoadingSpinner message="Loading transactions..." />
      ) : transactions.length > 0 ? (
        <Card className="p-0 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 mb-6">
          {transactions.map((tx) => {
            const { text, colorClass } = formatTransactionAmount(tx.type, tx.amount);
            return (
              <Pressable
                key={tx._id || tx.id}
                onPress={() => router.push(`/transaction/${tx._id || tx.id}`)}
                className="flex-row items-center justify-between p-4 active:bg-slate-50 dark:active:bg-slate-800/60"
              >
                <View className="flex-1 pr-3">
                  <Text
                    className="text-sm font-bold text-slate-900 dark:text-slate-100"
                    numberOfLines={1}
                  >
                    {tx.description}
                  </Text>
                  <View className="flex-row items-center gap-2 mt-1">
                    <Badge label={tx.category} variant="default" />
                    <Text className="text-[11px] text-slate-400">
                      {formatDate(tx.date)}
                    </Text>
                  </View>
                </View>
                <Text className={`text-sm font-black ${colorClass}`}>{text}</Text>
              </Pressable>
            );
          })}
        </Card>
      ) : (
        <Card className="mb-6">
          <EmptyState
            icon={<ArrowLeftRight size={32} color="#0c87eb" />}
            title="No Matching Transactions"
            description="No transaction records match your selected filters."
            actionTitle="Record Entry"
            onAction={() => router.push('/transaction/add')}
          />
        </Card>
      )}
    </ScreenWrapper>
  );
}
