import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { ApiResponse, Transaction, TransactionType } from '../types/api';

export interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: TransactionType;
  category?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedTransactionsResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateTransactionPayload {
  type: TransactionType;
  amount: number; // in integer paise
  category: string;
  description: string;
  date?: string;
  accountId?: string;
  toAccountId?: string;
  notes?: string;
  idempotencyKey?: string;
}

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery<PaginatedTransactionsResponse, Error>({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const response = await api.get<ApiResponse<PaginatedTransactionsResponse>>(
        '/transactions',
        { params: filters },
      );
      return response.data.data;
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

export function useTransaction(id: string) {
  return useQuery<Transaction, Error>({
    queryKey: ['transaction', id],
    queryFn: async () => {
      const response = await api.get<any>(`/transactions/${id}`);
      const payload = response.data?.data;
      return payload?.transaction ?? payload;
    },
    enabled: !!id,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation<Transaction, Error, CreateTransactionPayload>({
    mutationFn: async (payload) => {
      // Auto-generate idempotencyKey if not provided
      const idempotencyKey =
        payload.idempotencyKey ||
        `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const response = await api.post<ApiResponse<Transaction>>('/transactions', {
        ...payload,
        idempotencyKey,
      });
      return response.data.data;
    },
    onSuccess: () => {
      // Synchronize related queries across the entire financial app
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['salary'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      void queryClient.refetchQueries({ queryKey: ['dashboard'] });
      void queryClient.refetchQueries({ queryKey: ['transactions'] });
      void queryClient.refetchQueries({ queryKey: ['budgets'] });
      void queryClient.refetchQueries({ queryKey: ['salary'] });
      void queryClient.refetchQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete(`/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['salary'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      void queryClient.refetchQueries({ queryKey: ['dashboard'] });
      void queryClient.refetchQueries({ queryKey: ['transactions'] });
      void queryClient.refetchQueries({ queryKey: ['budgets'] });
      void queryClient.refetchQueries({ queryKey: ['salary'] });
      void queryClient.refetchQueries({ queryKey: ['categories'] });
    },
  });
}
