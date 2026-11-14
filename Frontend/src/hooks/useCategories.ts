import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { ApiResponse, CategoriesResponse, CategoryItem } from '../types/api';

export const DEFAULT_STANDARD_CATEGORIES: CategoryItem[] = [
  { id: 'food', label: 'Food & Dining', icon: 'utensils', color: '#F59E0B', bg: '#FEF3C7', isCustom: false },
  { id: 'groceries', label: 'Groceries', icon: 'shopping-cart', color: '#F97316', bg: '#FFEDD5', isCustom: false },
  { id: 'transport', label: 'Transport', icon: 'car', color: '#0284C7', bg: '#E0F2FE', isCustom: false },
  { id: 'shopping', label: 'Shopping', icon: 'shopping-bag', color: '#EC4899', bg: '#FCE7F3', isCustom: false },
  { id: 'bills', label: 'Bills & Utilities', icon: 'zap', color: '#EAB308', bg: '#FEF9C3', isCustom: false },
  { id: 'health', label: 'Health & Medical', icon: 'heart', color: '#EF4444', bg: '#FEE2E2', isCustom: false },
  { id: 'entertainment', label: 'Entertainment', icon: 'film', color: '#A855F7', bg: '#F3E8FF', isCustom: false },
  { id: 'investment', label: 'Investment', icon: 'trending-up', color: '#0D9488', bg: '#CCFBF1', isCustom: false },
];

export function useCategories() {
  const query = useQuery<CategoriesResponse, Error>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<CategoriesResponse>>('/categories');
      return response.data.data;
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const standard = query.data?.standard ?? DEFAULT_STANDARD_CATEGORIES;
  const custom = query.data?.custom ?? [];
  const all = query.data?.all ?? [...DEFAULT_STANDARD_CATEGORIES, ...custom];

  return {
    ...query,
    standard,
    custom,
    all,
  };
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation<CategoryItem, Error, { name: string }>({
    mutationFn: async ({ name }) => {
      const response = await api.post<ApiResponse<CategoryItem>>('/categories', { name });
      return response.data.data;
    },
    onSuccess: (newCat) => {
      queryClient.setQueryData<CategoriesResponse>(['categories'], (old) => {
        if (!old) {
          return {
            standard: DEFAULT_STANDARD_CATEGORIES,
            custom: [newCat],
            all: [...DEFAULT_STANDARD_CATEGORIES, newCat],
          };
        }
        const exists = old.custom.some((c) => c.id.toLowerCase() === newCat.id.toLowerCase());
        if (exists) return old;
        const updatedCustom = [...old.custom, newCat];
        return {
          ...old,
          custom: updatedCustom,
          all: [...old.standard, ...updatedCustom],
        };
      });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

