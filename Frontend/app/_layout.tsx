import '../global.css';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/src/services/queryClient';
import { useFonts } from 'expo-font';
import 'react-native-reanimated';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) console.warn('Font load error:', error);
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#f8fafc' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen
          name="(lock)"
          options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
        />
        <Stack.Screen
          name="transaction/add"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="transaction/[id]"
          options={{ presentation: 'card', headerShown: false }}
        />
        <Stack.Screen
          name="reports/index"
          options={{ presentation: 'card', headerShown: false }}
        />
        <Stack.Screen
          name="settings/index"
          options={{ presentation: 'card', headerShown: false }}
        />
        <Stack.Screen
          name="settings/change-password"
          options={{ presentation: 'card', headerShown: false }}
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </QueryClientProvider>
  );
}
