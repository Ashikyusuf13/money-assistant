import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ScreenWrapper,
  Card,
  Badge,
  Button,
  LoadingSpinner,
  ConfirmModal,
} from '@/src/components/ui';
import { useTransaction, useDeleteTransaction } from '@/src/hooks/useTransactions';
import { formatTransactionAmount } from '@/src/utils/currency';
import { formatDateTime } from '@/src/utils/date';
import { ArrowLeft, Trash2, Calendar, Tag, FileText } from 'lucide-react-native';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: tx, isLoading, error } = useTransaction(id);
  const deleteMutation = useDeleteTransaction();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteMutation.mutateAsync(id);
      setShowDeleteModal(false);
      router.back();
    } catch {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <ScreenWrapper className="items-center justify-center">
        <LoadingSpinner message="Fetching transaction details..." />
      </ScreenWrapper>
    );
  }

  if (error || !tx) {
    return (
      <ScreenWrapper className="px-6 py-8 items-center justify-center">
        <Text className="text-base font-bold text-slate-800 mb-2">
          Transaction Not Found
        </Text>
        <Button title="Go Back" onPress={() => router.back()} size="sm" />
      </ScreenWrapper>
    );
  }

  const { text: amountText, colorClass } = formatTransactionAmount(tx.type, tx.amount);

  return (
    <ScreenWrapper scrollable className="px-5 py-4">
      {/* Top Header */}
      <View className="flex-row items-center justify-between mb-6">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 items-center justify-center active:bg-slate-50"
        >
          <ArrowLeft size={18} color="#0c87eb" />
        </Pressable>
        <Text className="text-base font-bold text-slate-800 dark:text-slate-100">
          Transaction Details
        </Text>
        <Pressable
          onPress={() => setShowDeleteModal(true)}
          className="w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-950/60 items-center justify-center active:bg-rose-100"
        >
          <Trash2 size={16} color="#e11d48" />
        </Pressable>
      </View>

      {/* Hero Card */}
      <Card className="items-center py-6 mb-5">
        <Badge label={tx.type} variant={tx.type} size="md" className="mb-2" />
        <Text className={`text-3xl font-black ${colorClass}`}>
          {amountText}
        </Text>
        <Text className="text-base font-bold text-slate-800 dark:text-slate-200 mt-2 text-center">
          {tx.description}
        </Text>
      </Card>

      {/* Meta Information List */}
      <Card className="p-0 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 mb-6">
        <View className="flex-row items-center justify-between p-4">
          <View className="flex-row items-center gap-2">
            <Tag size={16} color="#64748b" />
            <Text className="text-xs font-semibold text-slate-500">Category</Text>
          </View>
          <Badge label={tx.category} variant="default" />
        </View>

        <View className="flex-row items-center justify-between p-4">
          <View className="flex-row items-center gap-2">
            <Calendar size={16} color="#64748b" />
            <Text className="text-xs font-semibold text-slate-500">Date & Time</Text>
          </View>
          <Text className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {formatDateTime(tx.date)}
          </Text>
        </View>

        {tx.notes && (
          <View className="p-4">
            <View className="flex-row items-center gap-2 mb-1.5">
              <FileText size={16} color="#64748b" />
              <Text className="text-xs font-semibold text-slate-500">Notes</Text>
            </View>
            <Text className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {tx.notes}
            </Text>
          </View>
        )}
      </Card>

      {/* Confirmation Modal */}
      <ConfirmModal
        visible={showDeleteModal}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This will reverse its balance impact on your tracked ledger."
        confirmTitle="Delete Entry"
        isDestructive
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </ScreenWrapper>
  );
}
