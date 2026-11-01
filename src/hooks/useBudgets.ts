import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { ApiResponse, Budget, BudgetAlert } from '../types/api';

export function useBudgets(month?: string) {
  return useQuery<Budget[], Error>({
    queryKey: ['budgets', month],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Budget[] | { budgets: Budget[] }>>('/budgets', {
        params: { month },
      });
      const data = response.data.data;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray((data as any).budgets)) return (data as any).budgets;
      return [];
    },
  });
}

export function useBudgetAlerts() {
  return useQuery<BudgetAlert[], Error>({
    queryKey: ['budgets', 'alerts'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<BudgetAlert[] | { alerts: BudgetAlert[] }>>('/budgets/alerts');
      const data = response.data.data;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray((data as any).alerts)) return (data as any).alerts;
      return [];
    },
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();

  return useMutation<
    Budget,
    Error,
    { category: string; amount: number; month: string; alertThreshold?: number }
  >({
    mutationFn: async (payload) => {
      const response = await api.post<ApiResponse<Budget | { budget: Budget }>>('/budgets', payload);
      const data = response.data.data;
      return (data as any)?.budget ?? (data as Budget);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete(`/budgets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
