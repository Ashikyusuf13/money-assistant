import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { ApiResponse, Goal, GoalContribution, GoalPriority } from '../types/api';

export function useGoals() {
  return useQuery<Goal[], Error>({
    queryKey: ['goals'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Goal[] | { goals: Goal[] }>>('/goals');
      const data = response.data.data;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray((data as any).goals)) return (data as any).goals;
      return [];
    },
  });
}

export function useGoal(id: string) {
  return useQuery<Goal, Error>({
    queryKey: ['goal', id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Goal | { goal: Goal }>>(`/goals/${id}`);
      const data = response.data.data;
      return (data as any)?.goal ?? (data as Goal);
    },
    enabled: !!id,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation<
    Goal,
    Error,
    {
      name: string;
      targetAmount: number; // in paise
      targetDate: string;
      priority?: GoalPriority;
      notes?: string;
    }
  >({
    mutationFn: async (payload) => {
      const response = await api.post<ApiResponse<Goal | { goal: Goal }>>('/goals', payload);
      const data = response.data.data;
      return (data as any)?.goal ?? (data as Goal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useContributeToGoal() {
  const queryClient = useQueryClient();

  return useMutation<
    GoalContribution,
    Error,
    {
      goalId: string;
      amount: number; // in paise
      type?: 'contribution' | 'withdrawal';
      fromAccountId?: string;
    }
  >({
    mutationFn: async ({ goalId, ...payload }) => {
      const response = await api.post<ApiResponse<GoalContribution | { contribution: GoalContribution }>>(
        `/goals/${goalId}/contributions`,
        payload,
      );
      const data = response.data.data;
      return (data as any)?.contribution ?? (data as GoalContribution);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete(`/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
