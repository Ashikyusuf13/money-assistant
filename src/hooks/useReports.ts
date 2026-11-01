import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  ApiResponse,
  PeriodReportData,
  CategoryReportData,
  FinancialInsight,
} from '../types/api';

export interface ReportFilterParams {
  period?: 'daily' | 'weekly' | 'monthly' | 'custom';
  month?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}

export function usePeriodReport(params: 'daily' | 'weekly' | 'monthly' | ReportFilterParams = 'monthly') {
  const queryParams: ReportFilterParams =
    typeof params === 'string' ? { period: params } : params;

  return useQuery<PeriodReportData, Error>({
    queryKey: ['reports', 'period', queryParams],
    queryFn: async () => {
      const response = await api.get<ApiResponse<PeriodReportData>>('/reports/period', {
        params: queryParams,
      });
      return response.data.data;
    },
  });
}

export function useCategoryReport(params?: string | ReportFilterParams) {
  const queryParams = typeof params === 'string' ? { month: params } : params || {};

  return useQuery<CategoryReportData, Error>({
    queryKey: ['reports', 'categories', queryParams],
    queryFn: async () => {
      const response = await api.get<ApiResponse<CategoryReportData>>(
        '/reports/categories',
        { params: queryParams },
      );
      return response.data.data;
    },
  });
}

export function useFinancialInsights(month?: string) {
  return useQuery<FinancialInsight[], Error>({
    queryKey: ['reports', 'insights', month],
    queryFn: async () => {
      const response = await api.get<
        ApiResponse<FinancialInsight[] | { insights: FinancialInsight[] }>
      >('/reports/insights', {
        params: { month },
      });
      const data = response.data.data;
      if (Array.isArray(data)) {
        return data;
      }
      return (data as { insights?: FinancialInsight[] })?.insights ?? [];
    },
  });
}
