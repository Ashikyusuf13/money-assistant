import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { ApiResponse, Account } from '../types/api';

export function useAccounts() {
  return useQuery<Account[], Error>({
    queryKey: ['accounts'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Account[] | { accounts: Account[] }>>('/accounts');
      const data = response.data.data;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray((data as any).accounts)) return (data as any).accounts;
      return [];
    },
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation<
    Account,
    Error,
    {
      name: string;
      type: 'bank' | 'cash' | 'credit_card' | 'wallet' | 'savings' | 'investment' | 'other';
      openingBalance?: number;
      currency?: string;
      notes?: string;
    }
  >({
    mutationFn: async (payload) => {
      const response = await api.post<ApiResponse<Account | { account: Account }>>('/accounts', payload);
      const data = response.data.data;
      return (data as any)?.account ?? (data as Account);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation<
    Account,
    Error,
    {
      id: string;
      name?: string;
      type?: 'bank' | 'cash' | 'credit_card' | 'wallet' | 'savings' | 'investment' | 'other';
      currentBalance?: number;
      notes?: string;
    }
  >({
    mutationFn: async ({ id, ...payload }) => {
      const response = await api.put<ApiResponse<Account | { account: Account }>>(`/accounts/${id}`, payload);
      const data = response.data.data;
      return (data as any)?.account ?? (data as Account);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await api.delete(`/accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
