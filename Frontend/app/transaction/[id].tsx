import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ScreenWrapper,
  SkeletonCard,
  ConfirmModal,
} from '@/src/components/ui';
import { useTransaction, useDeleteTransaction } from '@/src/hooks/useTransactions';
import { formatPaise } from '@/src/utils/currency';
import { formatDateTime } from '@/src/utils/date';
import {
  ArrowLeft,
  Trash2,
  Calendar,
  Tag,
  FileText,
  Wallet,
  Clock,
  Hash,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: rawTx, isLoading, error } = useTransaction(id || '');
  const deleteMutation = useDeleteTransaction();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Normalize tx whether it comes as payload.transaction or directly
  const tx: any = (rawTx as any)?.transaction ?? rawTx;

  const handleDelete = async () => {
    const targetId = tx?._id || tx?.id || id;
    if (!targetId) return;
    try {
      await deleteMutation.mutateAsync(targetId);
      setShowDeleteModal(false);
      router.back();
    } catch {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <ScreenWrapper style={styles.wrapper}>
        <View style={{ paddingTop: 20 }}>
          <SkeletonCard height={380} />
        </View>
      </ScreenWrapper>
    );
  }

  if (error || !tx || !tx.type) {
    return (
      <ScreenWrapper style={styles.centerWrapper}>
        <View style={styles.notFoundCard}>
          <Text style={styles.notFoundTitle}>Transaction Not Found</Text>
          <Text style={styles.notFoundSub}>
            The requested transaction could not be located or may have been deleted.
          </Text>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Return to Transactions</Text>
          </Pressable>
        </View>
      </ScreenWrapper>
    );
  }

  const isIncome = tx.type === 'income';
  const isTransfer = tx.type === 'transfer';
  const amountPrefix = isIncome ? '+' : isTransfer ? '' : '-';
  const amountColor = isIncome ? '#10B981' : isTransfer ? '#2563EB' : '#EF4444';
  const amountBg = isIncome ? '#ECFDF5' : isTransfer ? '#EFF6FF' : '#FEF2F2';

  const txId = String(tx._id || tx.id || id || '');
  const shortId = txId.length > 8 ? txId.slice(-8).toUpperCase() : txId;

  return (
    <ScreenWrapper scrollable style={styles.wrapper}>
      {/* ── Top Header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft size={20} color="#1565C0" />
        </Pressable>
        <Text style={styles.headerTitle}>Transaction Details</Text>
        <Pressable
          onPress={() => setShowDeleteModal(true)}
          style={[styles.iconBtn, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
        >
          <Trash2 size={18} color="#DC2626" />
        </Pressable>
      </View>

      {/* ── Hero Amount Card ── */}
      <View style={styles.heroCard}>
        <View style={[styles.typeBadge, { backgroundColor: amountBg }]}>
          {isIncome ? (
            <TrendingUp size={14} color="#10B981" />
          ) : (
            <TrendingDown size={14} color={isTransfer ? '#2563EB' : '#EF4444'} />
          )}
          <Text style={[styles.typeBadgeText, { color: amountColor }]}>
            {tx.type ? tx.type.toUpperCase() : 'TRANSACTION'}
          </Text>
        </View>

        <Text style={[styles.heroAmount, { color: amountColor }]}>
          {amountPrefix}{formatPaise(tx.amount || 0)}
        </Text>

        <Text style={styles.heroDescription}>
          {tx.description || 'No description provided'}
        </Text>

        <View style={styles.statusPill}>
          <CheckCircle2 size={12} color="#10B981" />
          <Text style={styles.statusPillText}>Settled in Wallet</Text>
        </View>
      </View>

      {/* ── Detailed Breakdown Card ── */}
      <View style={styles.detailsCard}>
        <Text style={styles.detailsSectionTitle}>Transaction Information</Text>

        {/* Category */}
        <View style={styles.detailRow}>
          <View style={styles.detailLabelRow}>
            <Tag size={16} color="#7B93C8" />
            <Text style={styles.detailLabel}>Category</Text>
          </View>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>
              {tx.category ? tx.category.replace(/_/g, ' ') : 'General'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Transaction Date */}
        <View style={styles.detailRow}>
          <View style={styles.detailLabelRow}>
            <Calendar size={16} color="#7B93C8" />
            <Text style={styles.detailLabel}>Transaction Date</Text>
          </View>
          <Text style={styles.detailValue}>
            {tx.date ? formatDateTime(tx.date) : 'N/A'}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Created / Logged At */}
        <View style={styles.detailRow}>
          <View style={styles.detailLabelRow}>
            <Clock size={16} color="#7B93C8" />
            <Text style={styles.detailLabel}>Created At</Text>
          </View>
          <Text style={styles.detailValue}>
            {tx.createdAt ? formatDateTime(tx.createdAt) : tx.date ? formatDateTime(tx.date) : 'N/A'}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Wallet / Account */}
        <View style={styles.detailRow}>
          <View style={styles.detailLabelRow}>
            <Wallet size={16} color="#7B93C8" />
            <Text style={styles.detailLabel}>Wallet</Text>
          </View>
          <Text style={styles.detailValueBold}>Main Wallet</Text>
        </View>

        <View style={styles.divider} />

        {/* Transaction Reference ID */}
        <View style={styles.detailRow}>
          <View style={styles.detailLabelRow}>
            <Hash size={16} color="#7B93C8" />
            <Text style={styles.detailLabel}>Transaction ID</Text>
          </View>
          <Text style={styles.detailValueMono}>#{shortId}</Text>
        </View>

        {/* Notes (if any) */}
        {tx.notes ? (
          <>
            <View style={styles.divider} />
            <View style={styles.notesBlock}>
              <View style={styles.detailLabelRow}>
                <FileText size={16} color="#7B93C8" />
                <Text style={styles.detailLabel}>Notes</Text>
              </View>
              <Text style={styles.notesText}>{tx.notes}</Text>
            </View>
          </>
        ) : null}
      </View>

      {/* ── Delete Action Button ── */}
      <Pressable
        onPress={() => setShowDeleteModal(true)}
        style={styles.deleteButton}
      >
        <Trash2 size={16} color="#DC2626" />
        <Text style={styles.deleteButtonText}>Delete This Transaction</Text>
      </Pressable>

      <View style={{ height: 40 }} />

      {/* Confirmation Modal */}
      <ConfirmModal
        visible={showDeleteModal}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This will automatically reverse its balance impact on your Main Wallet."
        confirmTitle="Delete Entry"
        isDestructive
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  centerWrapper: {
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0D1B3E',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE5F4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 6,
  },
  heroDescription: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D1B3E',
    textAlign: 'center',
    marginBottom: 14,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  detailsSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1565C0',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D1B3E',
  },
  detailValueBold: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1565C0',
  },
  detailValueMono: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: '#64748B',
  },
  categoryPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
    textTransform: 'capitalize',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  notesBlock: {
    paddingTop: 10,
  },
  notesText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
    lineHeight: 18,
    marginTop: 6,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 14,
    borderRadius: 16,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  notFoundCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0D1B3E',
    marginBottom: 8,
  },
  notFoundSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
  },
  backButton: {
    backgroundColor: '#1565C0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
