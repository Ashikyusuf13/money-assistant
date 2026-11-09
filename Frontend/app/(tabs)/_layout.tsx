import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, View, StyleSheet } from 'react-native';
import {
  LayoutDashboard,
  BarChart2,
  PieChart,
  Target,
  Bot,
} from 'lucide-react-native';

const ACTIVE_COLOR = '#1565C0';
const INACTIVE_COLOR = '#9E9E9E';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  // Safe clearance above Android gesture pill / 3-button navigation bar
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 10);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          height: 64 + bottomInset,
          paddingBottom: bottomInset + 4,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          position: 'absolute',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrapper : undefined}>
              <LayoutDashboard
                color={color}
                size={22}
                strokeWidth={focused ? 2.2 : 1.8}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrapper : undefined}>
              <BarChart2
                color={color}
                size={22}
                strokeWidth={focused ? 2.2 : 1.8}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          title: 'Budgets',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrapper : undefined}>
              <PieChart
                color={color}
                size={22}
                strokeWidth={focused ? 2.2 : 1.8}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Goals',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrapper : undefined}>
              <Target
                color={color}
                size={22}
                strokeWidth={focused ? 2.2 : 1.8}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'Assistant',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrapper : undefined}>
              <Bot
                color={color}
                size={22}
                strokeWidth={focused ? 2.2 : 1.8}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIconWrapper: {
    backgroundColor: '#E3F0FF',
    borderRadius: 10,
    padding: 4,
  },
});
