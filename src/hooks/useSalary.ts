import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  ApiResponse,
  SalaryProfile,
  SalaryGrowthComparison,
  Transaction,
} from '../types/api';

export function useSalary() {
  return useQuery<SalaryProfile, Error>({
    queryKey: ['salary'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<SalaryProfile | { salary: SalaryProfile }>>('/salary');
      const data = response.data.data;
      if (data && 'salary' in data && data.salary) {
        return data.salary;
      }
      return data as SalaryProfile;
    },
  });
}

export function useSalaryComparison() {
  return useQuery<SalaryGrowthComparison, Error>({
    queryKey: ['salary', 'comparison'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<SalaryGrowthComparison | { comparison: SalaryGrowthComparison }>>(
        '/salary/comparison',
      );
      const data = response.data.data;
      if (data && 'comparison' in data && data.comparison) {
        return data.comparison;
      }
      return data as SalaryGrowthComparison;
    },
  });
}

export function useSetupSalary() {
  const queryClient = useQueryClient();

  return useMutation<
    SalaryProfile,
    Error,
    { baseMonthlySalary: number; effectiveDate?: string }
  >({
    mutationFn: async (payload) => {
      const response = await api.post<ApiResponse<SalaryProfile | { salary: SalaryProfile }>>('/salary', payload);
      const data = response.data.data;
      if (data && 'salary' in data && data.salary) {
        return data.salary;
      }
      return data as SalaryProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useAddSalaryRevision() {
  const queryClient = useQueryClient();

  return useMutation<
    SalaryProfile,
    Error,
    { revisedSalary: number; effectiveDate: string; notes?: string }
  >({
    mutationFn: async (payload) => {
      const response = await api.post<ApiResponse<SalaryProfile | { salary: SalaryProfile }>>(
        '/salary/revisions',
        payload,
      );
      const data = response.data.data;
      if (data && 'salary' in data && data.salary) {
        return data.salary;
      }
      return data as SalaryProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useRecordSalaryCredit() {
  const queryClient = useQueryClient();

  return useMutation<
    Transaction,
    Error,
    { amount?: number; description?: string; accountId?: string }
  >({
    mutationFn: async (payload) => {
      const response = await api.post<ApiResponse<Transaction | { transaction: Transaction }>>(
        '/salary/credits',
        payload,
      );
      const data = response.data.data;
      if (data && 'transaction' in data && data.transaction) {
        return data.transaction;
      }
      return data as Transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
