import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ScreenWrapper,
  Button,
  Input,
  CurrencyInput,
  DatePicker,
  CategoryPicker,
  Card,
  Badge,
} from '@/src/components/ui';
import { useCreateTransaction } from '@/src/hooks/useTransactions';
import { useAccounts } from '@/src/hooks/useAccounts';
import { TransactionType } from '@/src/types/api';
import { X, AlertCircle, ArrowRightLeft, Wallet, Building2 } from 'lucide-react-native';
import { formatPaise } from '@/src/utils/currency';

const TYPES: Array<{ label: string; value: TransactionType }> = [
  { label: 'Expense', value: 'expense' },
  { label: 'Income', value: 'income' },
  { label: 'Transfer', value: 'transfer' },
  { label: 'Refund', value: 'refund' },
];

export default function AddTransactionScreen() {
  const router = useRouter();
  const createMutation = useCreateTransaction();
  const { data: accounts, isLoading: isAccountsLoading } = useAccounts();

  const [type, setType] = useState<TransactionType>('expense');
  const [paiseAmount, setPaiseAmount] = useState(0);
  const [category, setCategory] = useState('groceries');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedToAccountId, setSelectedToAccountId] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState<string>(() => new Date().toISOString().split('T')[0]!);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Set default accounts when accounts data loads
  useEffect(() => {
    if (accounts && accounts.length > 0) {
      if (!selectedAccountId) {
        setSelectedAccountId(accounts[0]?._id || accounts[0]?.id || '');
      }
      if (!selectedToAccountId && accounts.length > 1) {
        setSelectedToAccountId(accounts[1]?._id || accounts[1]?.id || '');
      }
    }
  }, [accounts]);

  const handleSubmit = async () => {
    setErrorMsg(null);

    if (paiseAmount <= 0) {
      setErrorMsg('Please enter an amount greater than ₹0.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please enter a description.');
      return;
    }

    if (type === 'transfer') {
      if (!selectedAccountId || !selectedToAccountId) {
        setErrorMsg('Please select both source and destination accounts.');
        return;
      }
      if (selectedAccountId === selectedToAccountId) {
        setErrorMsg('Source and destination accounts must be different for transfers.');
        return;
      }
    }

    try {
      await createMutation.mutateAsync({
        type,
        amount: paiseAmount,
        category: type === 'transfer' ? 'transfer' : category,
        description: description.trim(),
        accountId: selectedAccountId || undefined,
        toAccountId: type === 'transfer' ? selectedToAccountId : undefined,
        notes: notes.trim() || undefined,
        date: new Date(transactionDate).toISOString(),
      });
      router.back();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save transaction');
    }
  };

  return (
    <ScreenWrapper scrollable className="px-5 py-4">
      {/* Header with Close */}
      <View className="flex-row items-center justify-between mb-5">
        <Text className="text-xl font-black text-slate-900 dark:text-slate-100">
          Record Transaction
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center active:bg-slate-200"
        >
          <X size={18} color="#64748b" />
        </Pressable>
      </View>

      {errorMsg && (
        <Card className="bg-rose-50 border-rose-200 mb-4 p-3 flex-row items-center gap-2">
          <AlertCircle size={18} color="#e11d48" />
          <Text className="text-xs font-semibold text-rose-700 flex-1">{errorMsg}</Text>
        </Card>
      )}

      {/* Type Selector Tabs */}
      <View className="flex-row bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-5">
        {TYPES.map((t) => {
          const isSelected = type === t.value;
          return (
            <Pressable
              key={t.value}
              onPress={() => setType(t.value)}
              className={`flex-1 py-2.5 rounded-xl items-center ${
                isSelected ? 'bg-white dark:bg-slate-900 shadow-sm' : ''
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  isSelected ? 'text-primary-600' : 'text-slate-500'
                }`}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="gap-5">
        {/* Currency Input in Paise */}
        <CurrencyInput
          label="Amount"
          paiseValue={paiseAmount}
          onPaiseChange={setPaiseAmount}
        />

        {/* Transaction Date Picker */}
        <DatePicker
          label="Transaction Date"
          value={transactionDate}
          onChangeDate={setTransactionDate}
          mode="past"
        />

        {/* Account Selector */}
        {accounts && accounts.length > 0 && (
          <View>
            <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
              {type === 'transfer' ? 'From Account (Source)' : 'Account'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
              {accounts.map((acc) => {
                const id = acc._id || acc.id || '';
                const isSelected = selectedAccountId === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setSelectedAccountId(id)}
                    className={`px-3.5 py-2.5 rounded-xl border flex-row items-center gap-2 ${
                      isSelected
                        ? 'bg-primary-600 border-primary-600'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {acc.type === 'bank' ? (
                      <Building2 size={14} color={isSelected ? '#ffffff' : '#64748b'} />
                    ) : (
                      <Wallet size={14} color={isSelected ? '#ffffff' : '#64748b'} />
                    )}
                    <View>
                      <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                        {acc.name}
                      </Text>
                      <Text className={`text-[10px] ${isSelected ? 'text-primary-100' : 'text-slate-400'}`}>
                        {formatPaise(acc.currentBalance ?? acc.balance ?? 0)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Destination Account for Transfers */}
        {type === 'transfer' && accounts && accounts.length > 0 && (
          <View>
            <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
              To Account (Destination)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
              {accounts.map((acc) => {
                const id = acc._id || acc.id || '';
                const isSelected = selectedToAccountId === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setSelectedToAccountId(id)}
                    className={`px-3.5 py-2.5 rounded-xl border flex-row items-center gap-2 ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {acc.type === 'bank' ? (
                      <Building2 size={14} color={isSelected ? '#ffffff' : '#64748b'} />
                    ) : (
                      <Wallet size={14} color={isSelected ? '#ffffff' : '#64748b'} />
                    )}
                    <View>
                      <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                        {acc.name}
                      </Text>
                      <Text className={`text-[10px] ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                        {formatPaise(acc.currentBalance ?? acc.balance ?? 0)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Category Picker (hidden for transfers) */}
        {type !== 'transfer' && (
          <CategoryPicker
            selectedCategory={category}
            onSelectCategory={setCategory}
          />
        )}

        {/* Description Input */}
        <Input
          label="Description"
          placeholder={
            type === 'transfer'
              ? 'e.g. Moved savings to bank account'
              : type === 'income'
              ? 'e.g. Freelance project payment'
              : 'e.g. Organic Produce from Market'
          }
          value={description}
          onChangeText={setDescription}
        />

        {/* Optional Notes */}
        <Input
          label="Notes (Optional)"
          placeholder="Additional context or bill reference"
          value={notes}
          onChangeText={setNotes}
        />

        <Button
          title={
            type === 'transfer'
              ? 'Transfer Funds'
              : type === 'income'
              ? 'Record Income'
              : 'Save Expense'
          }
          size="lg"
          className="mt-3"
          loading={createMutation.isPending}
          onPress={handleSubmit}
        />
      </View>
    </ScreenWrapper>
  );
}
