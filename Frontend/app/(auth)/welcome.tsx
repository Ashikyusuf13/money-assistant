import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenWrapper, Button, Card } from '@/src/components/ui';
import { ShieldCheck, TrendingUp, Sparkles } from 'lucide-react-native';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <ScreenWrapper scrollable className="px-6 justify-between py-6">
      <View className="items-center mt-8">
        <View className="w-16 h-16 rounded-3xl bg-primary-600 items-center justify-center shadow-lg shadow-primary-500/30 mb-4">
          <TrendingUp size={32} color="#ffffff" />
        </View>
        <Text className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-1">
          Smart Personal Finance
        </Text>
        <Text className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 text-center">
          Money Assistant
        </Text>
        <Text className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2 max-w-[280px]">
          Real-time tracking of salary, budgets, goals, and AI-grounded insights.
        </Text>
      </View>

      <View className="my-8 gap-3">
        <Card className="flex-row items-center gap-3.5 p-3.5">
          <View className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/50">
            <TrendingUp size={20} color="#0c87eb" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Salary & Increments
            </Text>
            <Text className="text-xs text-slate-500">
              Track revisions and credited earnings distinctly.
            </Text>
          </View>
        </Card>

        <Card className="flex-row items-center gap-3.5 p-3.5">
          <View className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50">
            <ShieldCheck size={20} color="#10b981" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Biometric Security
            </Text>
            <Text className="text-xs text-slate-500">
              Face ID, Fingerprint, and device-local PIN protection.
            </Text>
          </View>
        </Card>

        <Card className="flex-row items-center gap-3.5 p-3.5">
          <View className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50">
            <Sparkles size={20} color="#8b5cf6" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Grounded AI Advisor
            </Text>
            <Text className="text-xs text-slate-500">
              Personalized insights derived strictly from verified facts.
            </Text>
          </View>
        </Card>
      </View>

      <View className="gap-3 mt-4 mb-2">
        <Button
          title="Create Account"
          size="lg"
          onPress={() => router.push('/(auth)/register')}
        />
        <Button
          title="Sign In"
          size="lg"
          variant="outline"
          onPress={() => router.push('/(auth)/login')}
        />
      </View>
    </ScreenWrapper>
  );
}
