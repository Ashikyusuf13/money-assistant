import { useMutation } from '@tanstack/react-query';
import { api, getErrorMessage } from '../services/api';
import { ApiResponse } from '../types/api';

export interface AssistantResponse {
  answer: string;
  groundedFacts?: {
    incomePaise?: number;
    expensePaise?: number;
    balancePaise?: number;
    month?: string;
  };
}

export function useAskAssistant() {
  return useMutation<AssistantResponse, Error, string>({
    mutationFn: async (question: string) => {
      const response = await api.post<ApiResponse<AssistantResponse>>(
        '/assistant/ask',
        { question },
      );
      return response.data.data;
    },
  });
}
