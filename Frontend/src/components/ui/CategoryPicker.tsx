import { useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useCategories } from '../../hooks/useCategories';

export const BASE_CATEGORIES = [
  { id: 'groceries', label: 'Groceries', color: '#10b981' },
  { id: 'dining', label: 'Dining', color: '#f59e0b' },
  { id: 'rent', label: 'Rent', color: '#ef4444' },
  { id: 'utilities', label: 'Utilities', color: '#6366f1' },
  { id: 'shopping', label: 'Shopping', color: '#ec4899' },
  { id: 'transport', label: 'Transport', color: '#06b6d4' },
  { id: 'entertainment', label: 'Entertainment', color: '#8b5cf6' },
  { id: 'healthcare', label: 'Healthcare', color: '#14b8a6' },
  { id: 'salary', label: 'Salary', color: '#10b981' },
  { id: 'bonus', label: 'Bonus', color: '#3b82f6' },
  { id: 'investment', label: 'Investment', color: '#8b5cf6' },
  { id: 'other', label: 'Other', color: '#64748b' },
];

export const CATEGORIES = BASE_CATEGORIES;

interface CategoryPickerProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  label?: string;
  containerClassName?: string;
}

export function CategoryPicker({
  selectedCategory,
  onSelectCategory,
  label = 'Category',
  containerClassName = '',
}: CategoryPickerProps) {
  const { custom = [] } = useCategories();

  const combinedCategories = useMemo(() => {
    const customItems = custom.map((c) => ({
      id: c.id,
      label: c.label,
      color: c.color,
      isCustom: true,
    }));

    const standardWithoutOther = BASE_CATEGORIES.filter((c) => c.id !== 'other');
    const otherItem = BASE_CATEGORIES.find((c) => c.id === 'other') || {
      id: 'other',
      label: 'Other',
      color: '#64748b',
    };

    return [...standardWithoutOther, ...customItems, otherItem];
  }, [custom]);

  return (
    <View className={`w-full ${containerClassName}`}>
      {label ? (
        <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
          {label}
        </Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 4 }}
      >
        {combinedCategories.map((cat) => {
          const isSelected = selectedCategory.toLowerCase() === cat.id.toLowerCase();
          return (
            <Pressable
              key={cat.id}
              onPress={() => onSelectCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl border flex-row items-center gap-1.5 active:opacity-80 ${
                isSelected
                  ? 'bg-primary-600 border-primary-600'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <View
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: isSelected ? '#ffffff' : cat.color }}
              />
              <Text
                className={`text-xs font-bold ${
                  isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
