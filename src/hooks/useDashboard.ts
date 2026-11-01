import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { ApiResponse, DashboardData } from '../types/api';

export function useDashboard(month: string) {
  return useQuery<DashboardData, Error>({
    queryKey: ['dashboard', month],
    queryFn: async () => {
      const response = await api.get<ApiResponse<DashboardData>>('/dashboard', {
        params: { month },
      });
      return response.data.data;
    },
    enabled: !!month,
  });
}
